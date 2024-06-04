import express from 'express';
import bodyParser from 'body-parser';
import router from './routes'


const app = express();

app.use(bodyParser.json());

app.use('/api', router) 

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


