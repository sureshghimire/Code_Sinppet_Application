// load all environment variables onto the process.env object
require('dotenv').config();

const cors = require('cors');
const express = require('express');

const MongoClient = require('mongodb').MongoClient;

const snippets = require('./snippets');
const users = require('./users');

// call the express function which provides features and functionality for our server
const app = express();
const port = 8888;

// apply middleware to application level
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    const { headers, method, url } = req;

    console.log(`METHOD: ${method} ${url} from user-agent ${headers['user-agent']}`, '\n');

    res.header('Cache-control', 'no-store');
    next();
});

// create a get route for our default route localhost:8888
app.get('/', (req, res) => {
    res.send('Welcome to Snippets');
});

// add the users router to express application
// use the prefix /users
// ex endpoint: localhost:8888/users/register
app.use('/users', users);

// add the snippets router to express application
// use the prefix /snippets
// ex endpoint: localhost:8888/snippets/:id
app.use('/snippets', snippets);

// compose the mongo db url string
const url = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}/${process.env.DB_NAME}`;
const client = new MongoClient(url);

// connect to the database
client.connect((err) => {
    // if the connection cannot be made then throw because snippets-application is dependant on MongoDB
    if (err) {
        throw new Error('Failed to connect to MongoDB');
    }

    console.log('Connected Successfully');

    // put the MongoDB object on the app.locals object so it can be accessed through the application
    app.locals.db = client.db();

    // start the server
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`);
    });
});
