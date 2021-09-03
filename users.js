const bcrypt = require("bcrypt");
const { ObjectId } = require("bson");
const jwt = require("jsonwebtoken");
const router = require("express").Router();

// POST /users/register
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // access the database object
    const db = req.app.locals.db;
    // select the Users collections
    const collection = db.collection("Users");
    // query to get user by username and use collation to make it a case in-sensitive search
    const user = await collection
      .find({ username }, { collation: { locale: "en", strength: 2 } })
      .next();

    if (user) {
      // 409 status code indicates Conflict - a request conflicted with current state of the target resource
      res.status(409).json({ error: `Username ${username} is already taken` });
    } else {
      // generate salt
      const salt = await bcrypt.genSalt();
      // hash the password using the generated salt
      const hashed = await bcrypt.hash(password, salt);

      await collection.insertOne({ username, password: hashed });

      // respond with a 201 and JSON with username and success
      res.status(201).json({ username, success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// POST /users/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // access the database object
    const db = req.app.locals.db;
    // select the Users collections
    const collection = db.collection("Users");
    // query to get the user by exact match username
    const user = await collection.find({ username }).next();

    if (user) {
      // compare the plain text password to the bcrypt hashed version in the db
      const authenticated = await bcrypt.compare(password, user.password);

      if (authenticated) {
        // authorize the user with the username object and the ACCESS_TOKEN_SECRET from the .env file
        // this generates a JWT (json web token)
        const token = jwt.sign({ username }, process.env.ACCESS_TOKEN_SECRET);

        // respond with a 200 and JSON that includes the username and token
        res.json({ username, token });
      } else {
        res.status(401).json({ error: `Failed to authenticate ${username}` });
      }
    } else {
      res
        .status(404)
        .json({ error: `Username ${username} may not be registered` });
    }
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

//Application Middleware
// authorization middleware for specific endpoints
// this does not need to be updated or changed in any way for the Lab Assignment

//POST /users/update
router.post("/update", async (req, res) => {
  try {
    const { username, original_password, new_password } = req.body;

    // access the database object
    const db = req.app.locals.db;
    // select the Users collections
    const collection = db.collection("Users");
    // query to get user by username and use collation to make it a case in-sensitive search

    const user = await collection
      .find({ username }, { collation: { locale: "en", strength: 2 } })
      .next();
    if (user) {
      // compare the plain text password to the bcrypt hashed version in the db
      const authenticated = await bcrypt.compare(
        original_password,
        user.password
      );

      if (authenticated) {
        //before update
        //console.log(user);

        //generate salt
        const salt = await bcrypt.genSalt();
        // hash the new password using the generated salt
        const hashed = await bcrypt.hash(new_password, salt);

        //update the password
        user.password = hashed;

        //user will be updated on Application Level and entire data will be updated
        await collection.updateOne({ _id: ObjectId(user._id) }, { $set: user });

        //only password will be updated
        //await collectionn.updateOne({_id:ObjectId(user._id)},{$set:{password:new_password}});

        res.status(201).json({ message: `Password updated sucessfully` });
      } else {
        res.status(401).json({ error: `Failed to authenticate ${username}` });
      }
    } else {
      res
        .status(404)
        .json({ error: `Username ${username} may not be registered` });
    }
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

//username update

module.exports = router;
