const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { query } = require('express');
app.use(cors())
app.use(express.json())


const username = process.env.MONGO_USR;
const password = process.env.MONGO_PASS;

const uri = `mongodb+srv://mahmudulhasanw3b:${password}@cluster0.37udjhi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

function verifyJWT(req, res, next) {
    // console.log(`token inside verifyjwt `, req.headers.authorization);    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).send('unauthorized access')
    }
    console.log(authHeader)
    const token = authHeader.split(' ')[1];
    if (token === null) {
        console.log('in token')
        res.status(401).send('unauthorized access')

    }
    console.log(token)
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        console.log(decoded)
        next()
    });

}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)

        const userCollection = client.db('sterio').collection('user');
        const productCollection = client.db('sterio').collection('product');

        app.put('/user', async (req, res) => {
            await client.connect();
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    img: user.img,
                    verifiedSeller: false
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            // console.log(result);
            res.send(result)


        })
        const verifySeller = async (req, res, next) => {
            await client.connect();
            // console.log(req.query.email)
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'Seller') {

                req.role = ''
                req.verified = false
            } else {
                req.verified = false
                req.role = 'Seller'
                // console.log(user.verifiedSeller)
                if (user.verifiedSeller) {
                    req.verified = true
                }
            }
            next();
        }
        const verifyAdmin = async (req, res, next) => {
            // console.log(req.query.email)
            await client.connect();

            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {

                req.role = ''
            } else {
                req.role = 'admin'
            }
            next();
        }

        app.get('/jwt', async (req, res) => {
            await client.connect();
            const email = req.query.email;
            const query = { email: email }
            const user = await userCollection.findOne(query)
            // console.log(user)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN);
                return res.send({ accessToken: token })
            }

            res.status(403).send({ accessToken: '' })
        })
        app.get('/user/seller', verifySeller, async (req, res) => {
            // console.log(req?.role, req.verified)
            await client.connect();
            res.send({ isSeller: req?.role === 'Seller', verified: req.verified });

        })
        app.post('/productadd', async (req, res) => {
            await client.connect();
            const data = req.body;
            data.date = new Date(Date.now()).toISOString();
            const resut = await productCollection.insertOne(data);
            res.send(resut);
        })
        app.get('/product', verifyJWT, async (req, res) => {
            await client.connect();

            const email = req.query.email;

            if (email !== req.decoded.email) {
                res.status(403).send({ message: 'forbidden access' })
            }
            const query = {
                email: email
            }
            const products = await productCollection.find(query).toArray();
            res.send(products);
        })
        app.get('/user/admin', verifyAdmin, async (req, res) => {
            // console.log(req?.role)
            await client.connect();
            res.send({ isAdmin: req?.role === 'admin' });

        })


    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Simple Curd!')
})

app.listen(port, () => {
    console.log(`Simple Crud on ${port}`)
})