const express = require('express')


const cors = require('cors')
const app = express()
// app.use(cors({ origin: 'https://streio-time.web.app' }))
app.use(cors())

require('dotenv').config()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const jwt = require('jsonwebtoken');
const { query } = require('express');
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
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
        // //await client.connect();

        const userCollection = client.db('sterio').collection('user');
        const productCollection = client.db('sterio').collection('product');
        const selectcollection = client.db('sterio').collection('select');
        const enrolledcollection = client.db('sterio').collection('enroll');



        app.put('/user', async (req, res) => {
            // //await client.connect();
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
            //await client.connect();
            // console.log(req.query.email)
            if (req.query.email === undefined) {
                req.role = ''
                req.verified = false
                next()
            }
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
            //await client.connect();
            if (req.query.email === undefined) {
                req.role = ''
                req.verified = false
                next()
            }

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
        app.get('/allclasses', async (req, res) => {
            //await client.connect();
            const classes = await productCollection.find().toArray();
            res.send(classes);

        })
        app.get('/allclassesserial', async (req, res) => {
            //await client.connect();
            const filter = { status: 'Accepted' }
            let classes = [];
            console.log(req.query.query)
            if (req.query.query) {
                classes = await productCollection.find(filter).sort({ seats: -1 }).limit(6).toArray();
            }
            else {
                classes = await productCollection.find(filter).sort({ seats: -1 }).toArray();
            }
            res.send(classes);

        })
        app.get('/myselected', verifyJWT, async (req, res) => {
            //await client.connect();
            const email = req.query.email;
            console.log("in myslected")
            if (email !== req.decoded.email) {
                res.status(403).send({ message: 'forbidden access' })
            }
            const query = {
                studentemail: email
            }
            const products = await selectcollection.find(query).toArray();
            console.log(products);
            res.send(products);
        })
        app.get('/myenrolled', verifyJWT, async (req, res) => {
            //await client.connect();
            const email = req.query.email;
            console.log("in myslected")
            if (email !== req.decoded.email) {
                res.status(403).send({ message: 'forbidden access' })
            }
            const query = {
                studentemail: email
            }
            const products = await enrolledcollection.find(query).toArray();
            console.log(products);
            res.send(products);
        })
        app.get('/jwt', async (req, res) => {
            //await client.connect();
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
        app.get('/user', async (req, res) => {
            //await client.connect();

            const email = req.query.email;
            // const query = {
            //     role: req.query.role
            // }
            const products = await userCollection.find().toArray();
            res.send(products);
        })
        app.put('/makeadmin', verifyAdmin, async (req, res) => {
            //await client.connect();

            if (req.role === 'admin') {
                // console.log(req.body);
                const filter = { email: req.body.email }
                const updateDoc = {
                    $set: {
                        role: 'admin'
                    }
                }
                const result = await userCollection.updateMany(filter, updateDoc);

                // console.log("here")
                if (result.acknowledged) {
                    res.send({ msg: true })
                }
                else {
                    res.send({ msg: false })
                }

            }
            else {
                // console.log('this is not admin');
                res.send({ msg: false })
            }

        })
        app.get('/getinstructors', async (req, res) => {
            //await client.connect();
            const filter = { role: 'Seller' }
            const teachers = await userCollection.find(filter).limit(6).toArray();
            res.send(teachers);
        })

        app.put('/payment', async (req, res) => {
            //await client.connect();
            const user = req.body;
            // console.log(user.product.seats);
            const filter = { studentemail: user.studentemail, productId: user.productId };
            console.log(filter);
            const options = { upsert: true };
            const filter2 = { _id: new ObjectId(user.productId) }
            const updateDoc = {
                $set: {
                    ...req.body,
                }
            };
            // const seats = (user.seats - 1).toString()
            const updateDoc2 = {
                $set: {
                    seats: user.seats.toString()
                }
            };
            const result = await enrolledcollection.updateOne(filter, updateDoc, options);
            const result3 = await productCollection.updateOne(filter2, updateDoc2);
            res.send({ result, result3 })
        })

        app.post("/create-payment-intent", async (req, res) => {
            await client.connect()

            const booking = req.body;
            const price = parseInt(booking.price);
            //Here multiplying by 1 instead of 100 because if the number is big ,it is a problem to handle for stripe 
            const amount = price * 1;
            console.log(price)
            console.log(amount)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                "payment_method_types": [
                    "card"
                ],

            });
            // console.log(paymentIntent.client_secret)
            res.send({
                clientSecret: paymentIntent.client_secret,

            })
        })
        app.get('/bookings/:id', async (req, res) => {
            await client.connect()
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };
            const booking = await productCollection.findOne(query);
            console.log(booking);

            res.send(booking);
        })
        app.put('/makeaccept', verifyAdmin, async (req, res) => {
            //await client.connect();
            console.log(req.body);
            if (req.role === 'admin') {
                // console.log(req.body);
                const filter = { _id: new ObjectId(req.body.product._id) }
                const updateDoc = {
                    $set: {
                        status: 'Accepted'
                    }
                }
                const result = await productCollection.updateMany(filter, updateDoc);
                // console.log(result)
                if (result.acknowledged) {
                    res.send({ msg: true })
                }
                else {
                    res.send({ msg: false })
                }

            }
            else {
                // console.log('this is not admin');
                res.send({ msg: false })
            }

        })
        app.put('/selectCourse', async (req, res) => {
            //await client.connect();
            console.log(req.body);
            const filter = { SRLnumber: req.body.SRLnumber, email: req.body.email }; console.log("here")
            // console.log(req.body);
            // const filter = { _id: new ObjectId(req.body.SRLnumber) }
            const updateDoc = {
                $set: {
                    ...req.body
                }
            }
            const options = { upsert: true };
            const result2 = await selectcollection.updateOne(filter, updateDoc, options)
            // const result = await productCollection.updateOne(filter, updateDoc);
            // console.log(result)
            if (result2.acknowledged) {
                res.send({ msg: true })
            }
            else {
                res.send({ msg: false })
            }




        })
        app.put('/enrolledCourse', async (req, res) => {
            //await client.connect();
            console.log(req.body);
            const filter = { SRLnumber: req.body.SRLnumber, email: req.body.email }; console.log("here")
            // console.log(req.body);
            // const filter = { _id: new ObjectId(req.body.SRLnumber) }
            const updateDoc = {
                $set: {
                    ...req.body,
                }
            }
            const options = { upsert: true };
            const result2 = await selectcollection.updateOne(filter, updateDoc, options)
            // const result = await productCollection.updateOne(filter, updateDoc);
            // console.log(result)
            if (result2.acknowledged) {
                res.send({ msg: true })
            }
            else {
                res.send({ msg: false })
            }




        })
        app.put('/enrolledCourseDelete', async (req, res) => {
            //await client.connect();
            console.log('on delete')
            console.log(req.body)
            const filter = { _id: new ObjectId(req.body._id), studentemail: req.body.studentemail };
            const filter2 = { _id: new ObjectId(req.body.productId) }
            // console.log(req.body);
            // const filter = { _id: new ObjectId(req.body.SRLnumber) }
            // const seats = (req.body.seats + 1).toString()

            const document = await productCollection.findOne(filter2); // Retrieve the document from MongoDB
            const currentSeats = parseInt(document.seats); // Convert the seats value to a number
            const updatedSeats = currentSeats + 1;

            const updateDoc2 = {
                $set: {
                    seats: updatedSeats.toString() // Convert the seats value back to a string
                }
            };
            const result = await enrolledcollection.deleteOne(filter)
            const result2 = await productCollection.updateOne(filter2, updateDoc2)
            if (result2.acknowledged) {
                res.send({ msg: true })
            }
            else {
                res.send({ msg: false })
            }




        })
        app.put('/makedeny', verifyAdmin, async (req, res) => {
            //await client.connect();

            if (req.role === 'admin') {
                // console.log(req.body);
                const filter = { _id: new ObjectId(req.body.product._id) }
                const updateDoc = {
                    $set: {
                        status: 'Denied',
                        feedback: req.body.feedback

                    }
                }
                const result = await productCollection.updateMany(filter, updateDoc);
                // console.log(result)
                if (result.acknowledged) {
                    res.send({ msg: true })
                }
                else {
                    res.send({ msg: false })
                }

            }
            else {
                // console.log('this is not admin');
                res.send({ msg: false })
            }

        })
        app.put('/makeinstructor', verifyAdmin, async (req, res) => {
            //await client.connect();

            if (req.role === 'admin') {
                // console.log(req.body);
                const filter = { email: req.body.email }
                const updateDoc = {
                    $set: {
                        role: 'Seller'
                    }
                }
                const result = await userCollection.updateMany(filter, updateDoc);

                // console.log(result)
                if (result.acknowledged) {
                    res.send({ msg: true })
                }
                else {
                    res.send({ msg: false })
                }

            }
            else {
                // console.log('this is not admin');
                res.send({ msg: false })
            }

        })
        app.get('/user/seller', verifySeller, async (req, res) => {
            // console.log(req?.role, req.verified)
            //await client.connect();
            res.send({ isSeller: req?.role === 'Seller', verified: req.verified });

        })
        app.post('/productadd', async (req, res) => {
            //await client.connect();
            const data = req.body;
            data.date = new Date(Date.now()).toISOString();
            const resut = await productCollection.insertOne(data);
            res.send(resut);
        })
        app.get('/product', verifyJWT, async (req, res) => {
            //await client.connect();

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
            //await client.connect();
            res.send({ isAdmin: req?.role === 'admin' });

        })


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Simple Curd!')
})

app.listen(port, () => {
    console.log(`Simple Crud on ${port}`)
})