const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { serialize } = require('bson');
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

//verify JWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}

/* =================== */

async function run(){
    try{
        await client.connect();
        const servicesCollection = client.db ('doctors_portal').collection('services');
        const bookingCollection = client.db ('doctors_portal').collection('bookings');
        const usersCollection = client.db ('doctors_portal').collection('users');

        // get data 

        app.get('/service', async(req,res)=>{
            const query ={};
            const cursor = servicesCollection.find(query);
            const services = await cursor.toArray();
            res.send(services)
        });

        /* all users */

        app.get('/user',verifyJWT,async(req,res)=>{
          const users = await usersCollection.find().toArray();
          res.send(users) 
        });

        // require admin 

        app.get('/admin/:email', async(req,res)=>{
          const email = req.params.email;
          const user = await usersCollection.findOne({email:email});
          const isAdmin  = user.role === 'admin';
          res.send({admin:isAdmin})
        })

        app.put('/user/admin/:email', verifyJWT, async (req,res)=>{
          const email = req.params.email;
          const requester = req.decoded.email;
          const requesterAccount = await usersCollection.findOne({email:requester});
          if (requesterAccount.role === 'admin') {
            const filter = {email: email};
            const updateDoc = {
              $set: {role: 'admin'},
            };
            const result = await usersCollection.updateOne(filter,updateDoc);
            res.send(result);
          }
          else{
             res.status(403).send({message: 'Forbidden'})
          }

        })



        /* all users */

          /*=======User============*/
          app.put('/user/:email', async (req,res)=>{
            const email =req.params.email;
            const user = req.body;
            const filter = {email: email};
            const options = {upsert: true};
            const updateDoc = {
                 $set: user
              
            };
            const result = await usersCollection.updateOne(filter, updateDoc,options);
            const token = jwt.sign({email: email},process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1h' })
            res.send({result,token})


          })

          /*===================*/
        /*==========available services==============*/

        app.get('/available', async(req,res)=>{
          const date = req.query.date ;

          //step 1: Get all services
          const services = await servicesCollection.find().toArray();

          //step 2: get the booking of that day
          const query = {date:date};
          const bookings = await bookingCollection.find(query).toArray();

          // step 3: 
          services.forEach(service =>{
            const serviceBookings = bookings.filter(b => b.treatment === service.name);
            const booked = serviceBookings.map(s => s.slot);
            const available = service.slots.filter(s =>!booked.includes(s));
            service.slots = available;
          })


          // res.send(services)
          res.send(services)
        })


         /**
     * API Naming Convention
     * app.get('/booking') // get all bookings in this collection. or get more than one or by filter
     * app.get('/booking/:id') // get a specific booking 
     * app.post('/booking') // add a new booking
     * app.patch('/booking/:id) //
     * app.put('/booking/:id') // upsert ==> update (if exists) or insert (if doesn't exist)
     * app.delete('/booking/:id) //
    */

/* ============================ */



  app.get('/booking',verifyJWT, async(req,res)=>{
              const patient =req.query.patient;
            const decodedEmail = req.decoded.email;
            if (patient===decodedEmail) {
              const query = {patient: patient};
              const bookings = await bookingCollection.find(query).toArray();
              return res.send(bookings);
            }
             else{
                return res.status(403).send({message: 'Forbidden access '})
              }

            })

/* ============================ */


/*          add new item */

        app.post('/booking', async(req,res)=>{
          const booking =req.body;
          const query = {treatment:booking.treatment, date: booking.date,patient:booking.patient};
          const exist = await bookingCollection.findOne(query);
          if (exist) {
            return res.send({success:false,booking: exist})
          }
          const result = await bookingCollection.insertOne(booking);
             return res.send({ success: true, result });
            
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