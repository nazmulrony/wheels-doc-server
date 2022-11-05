const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;
require('dotenv').config();

//middle wares
app.use(cors());
app.use(express.json());

//server root directory
app.get('/', (req, res) => {
    res.send('Welcome to Wheels Doc express server');
})

//MongoDB Connections


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cwjhhvi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });

        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        const serviceCollection = client.db('wheelsDoc').collection('services');
        const orderCollection = client.db('wheelsDoc').collection('orders');


        // token for user
        app.post('/jwt', (req, res) => {
            const user = req.body;
            // console.log(user);
            const secret = process.env.ACCESS_TOKEN_SECRET
            const token = jwt.sign(user, secret, { expiresIn: '1hr' });
            res.send({ token })


        })

        //get all the services from DB
        app.get('/services', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        })
        //get a specific service from the DB
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const service = await serviceCollection.findOne(query);
            res.send(service);
        })

        //api for creating orders data
        app.post('/orders', verifyJWT, async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
            console.log(result);
        })
        //get the orders from the server
        app.get('/orders', verifyJWT, async (req, res) => {
            console.log(req.decoded);
            const decoded = req.decoded;
            if (decoded.email !== req.query.email) {
                res.status(401).send({ message: 'Unauthorized access' });
            }
            let query = {};
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = orderCollection.find(query)
            const orders = await cursor.toArray();
            res.send(orders);
        })
        //update an order
        app.patch('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const status = req.body;
            const updatedDoc = {
                $set: {
                    status: status.status
                }
            }
            const result = await orderCollection.updateOne(query, updatedDoc)
            res.send(result);
        })

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })



    }
    finally {

    }

}
run().catch(err => console.log(err))



app.listen(port, () => {
    console.log(`Wheels Doc server running on port: ${port}`);
})