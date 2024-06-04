import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const identify = async (req: Request, res: Response) => {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
        return res.status(400).json({ error: 'Either email or phoneNumber must be provided.' });
    }

    // Find contacts by email or phone number
    const contacts = await prisma.contact.findMany({
        where: {
            OR: [
                { email: email },
                { phoneNumber: phoneNumber }
            ]
        }
    });

    if(contacts.length === 0) {
        // If no existing contacts, then create new primary contact
        const newContact = await prisma.contact.create({
            data: {
                email: email,
                phoneNumber: phoneNumber,
                linkPrecedence: 'primary'
            }
        });
        return res.json({
            contact: {
                primaryContactId: newContact.id,
                emails: [newContact.email],
                phoneNumbers: [newContact.phoneNumber],
                secondaryContactIds: []
            }
        });
        
    }
    else {
        let primaryContact = contacts.find(contact => contact.linkPrecedence === 'primary');
        if(!primaryContact) {
            primaryContact = contacts[0];
            await prisma.contact.update({
                where: {
                    id: primaryContact.id
                },
                data: {
                    linkPrecedence: 'primary'
                }
            });
        }
        const secondaryContacts = contacts.filter(contact => contact.id !== primaryContact.id);
        const emails = new Set<string>();
        const phoneNumbers = new Set<string>();
        const secondaryContactIds = secondaryContacts.map(contact => contact.id);

        contacts.forEach(contact => {
            if(contact.email) {
                emails.add(contact.email)
            }
            if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
        });

        // Update secondary contacts to link to primary contact
    await Promise.all(
        secondaryContacts.map(contact => {
          return prisma.contact.update({
            where: { id: contact.id },
            data: {
              linkedId: primaryContact!.id,
              linkPrecedence: 'secondary'
            }
          });
        })
      );

        return res.json({
            contact: {
                primaryContactId: primaryContact.id,
                emails: Array.from(emails),
                phoneNumbers: Array.from(phoneNumbers),
                secondaryContactIds: secondaryContactIds
            }
        })
    }

}