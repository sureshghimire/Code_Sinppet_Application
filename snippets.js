const jwt = require("jsonwebtoken");
const router = require("express").Router();

// require in the MongoDb ObjectId method
const ObjectId = require("mongodb").ObjectId;

// authorization middleware for specific endpoints
// this does not need to be updated or changed in any way for the Lab Assignment
const verifyAccessToken = (req, res, next) => {
  const { authorization } = req.headers;

  // Authorization Header looks like:
  // Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InNub29weSIsImlhdCI6MTYxOTE0MTgzOX0.hL31LS0RObDJLJ_U19paAgmVc1tpWsfmMtnCLQbLXJs
  if (authorization && authorization.startsWith("Bearer")) {
    const token = authorization.split(" ").pop();

    // use jwt to verify the token passed was signed with the ACCESS_TOKEN_SECRET from the .env
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, user) => {
      if (error) {
        // end req-res life cycle early by responding with 403
        res.status(403).json({ error: "Access Forbidden" });
      } else {
        // user is the object { username } that was signed on line 43 in users.js
        req.user = user;
        next();
      }
    });
  } else {
    // end req-res life cycle early by responding with 403
    res.status(403).json({ error: "Access Forbidden" });
  }
};

// router level middleware
router.use((req, res, next) => {
  const { headers, method, url } = req;

  // add a timeCreated key when a new snippet is created
  if (req.method === "POST" && req.body) {
    const body = req.body;
    body.created = Date.now();
  }

  if (req.method === "PUT" && req.body) {
    const body = req.body;
    body.lastUpdated = Date.now();
  }

  next();
});

// GET /snippets
router.get("/", async (req, res) => {
  try {
    // access the database object
    const db = req.app.locals.db;
    // select the Snippets collections
    const collection = db.collection("Snippets");
    // query to get all documents the below is similar to SQL: SELECT * FROM Snippets
    const all = await collection.find({}).toArray();

    res.json(all);
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// POST /snippets
router.post("/", verifyAccessToken, async (req, res) => {
  try {
    const body = req.body;

    // below is roughly equal to saying Object.assign(body, { author: req.user.username})
    const data = { ...body, ...{ author: req.user.username } };

    // access the database object
    const db = req.app.locals.db;
    // select the Snippets collections
    const collection = db.collection("Snippets");

    // await while the document is inserted into the Snippets collection
    await collection.insertOne(data);

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// PUT /snippets/:id use the verifyAccessToken middleware
router.put("/:id", verifyAccessToken, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    // access the database object
    const db = req.app.locals.db;
    // select the Snippets collections
    const collection = db.collection("Snippets");
    // query to find exact match _id AND author
    // use the ObjectId method to convert the string id into a MongoDB ObjectId
    const snippet = await collection
      .find({ _id: ObjectId(id), author: req.user.username })
      .next();

    if (snippet) {
      // below is the same as: Object.assign(snippet, body, { author: req.user.username})
      const data = { ...snippet, ...body, ...{ author: req.user.username } };
      // await while the document is updated by _id
      // use the ObjectId method to convert the string id into a MongoDB ObjectId
      await collection.updateOne({ _id: ObjectId(id) }, { $set: data });

      res.json(data);
    } else {
      // 403 status code indicates Forbidden - server understood the request but refused to authorize it
      res
        .status(403)
        .json({ error: `Not authorized to edit snippet by ${snippet.author}` });
    }
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

//DELETE /snippets/:id
router.delete("/:id", verifyAccessToken, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    // access the database object
    const db = req.app.locals.db;
    // select the Snippets collections
    const collection = db.collection("Snippets");
    // query to find exact match _id AND author
    // use the ObjectId method to convert the string id into a MongoDB ObjectId
    const snippet = await collection
      .find({ _id: ObjectId(id), author: req.user.username })
      .next();

    if (snippet) {
      await collection.removeOne({ _id: ObjectId(id) }, { justOne: true });
      res.status(201).json({ message: `Snippet Deleted Sucessfully` });
    } else {
      res.status(404).json({ error: `Snippet with id: ${id} does not exists` });
    }
  } catch {
    res.status(409).json({ error: error.toString() });
  }
});

// GET /snippets/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // access the database object
    const db = req.app.locals.db;
    // select the Snippets collections
    const collection = db.collection("Snippets");

    // query to find exact match _id
    // use the ObjectId method to convert the string id into a MongoDB ObjectId
    const snippet = await collection.find({ _id: ObjectId(id) }).next();

    res.json(snippet);
  } catch (error) {
    res.status(404).json({ error: error.toString() });
  }
});

module.exports = router;
