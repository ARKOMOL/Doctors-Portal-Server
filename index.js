const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const cors = require('cors');
require('dotenv').config();
const app = express()
const port = process.env.PORT ||5000;

/* middleware */
app.use(cors());
app.use(express.json());

/*===================MAIN PART===================*/


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i7hwg.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// console.log(uri);

/* =================== */

async function run(){
    try{
        await client.connect();
        const servicesCollection = client.db ('doctors_portal').collection('services');

        // get data 

        app.get('/service', async(req,res)=>{
            const query ={};
            const cursor = servicesCollection.find(query);
            const services = await cursor.toArray();
            res.send(services)
        })

    }
    finally{

    }

}
run().catch(console.dir)



/*===================MAIN PART===================*/



app.get('/', (req, res) => {
  res.send('Hello From Doctor !')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})