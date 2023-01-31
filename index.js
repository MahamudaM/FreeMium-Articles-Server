const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT;
// const mongoose = require('mongoose');
// middlewares
app.use(cors());
app.use(express.json());

// Mongo DB Connections

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//Verify JWT function
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).send("Not authorization");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded) {
    if (error) {
      return res.status(403).send({ message: "Forbidden" });
    }
    req.decoded = decoded;
    next();
  });
}

app.get("/", (req, res) => {
  res.send(`FreeMium Articles running on port ${port}`);
});

async function run() {
  try {
    const usersCollection = client.db("freeMiumArticle").collection("users");
    const articleCollection = client.db("freeMiumArticle").collection("homePosts");
    const categoryButtonCollection = client.db("freeMiumArticle").collection("categoryItem");

    // Verfy Admin function
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const admin = await usersCollection.findOne(query);
      if (admin?.role !== "admin") {
        return res.status(403).send(`You dose't have access to edit this`);
      }
      next();
    };

    app.put("/user/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          verify: true,
        },
      };
      const updateUser = await usersCollection.updateOne(
        filter,
        updateDoc,
        option
      );
      res.send(updateUser);
    });
    // get user data
    app.get("/user", async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).limit(6).toArray();
      res.send(result);
    })
    // Get Data category name
    app.get('/category/:name', async (req, res) => {
      const categoryName = req.params.name;
      const query = { category: categoryName };
      // console.log(typeof(categoryName));
      const result = await articleCollection.find(query).toArray();
      res.send([{ "categoryName": categoryName }, result]);
    })
    // Update users
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const option = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const updateUser = await usersCollection.updateOne(
        filter,
        updateDoc,
        option
      );

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ updateUser, token });
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "1d",
        });
        return res.send({ freeMiumToken: token });
      }
      res.status(401).send({ message: "Unauthorized" });
    });

    // Get admin user permission 
    app.get("/users/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const adminUser = await usersCollection.findOne(query);
      res.send({ isAdmin: adminUser?.role === "admin" });
    });

    app.get('/allArticles', async (req, res) => {
      const query = {};
      const article = await articleCollection.find(query).toArray();
      res.send(article);
    })

    //data with article id
    app.get('/view-story/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await articleCollection.findOne(query);
      res.send(result);
    })

    // category button api
    app.get('/categoryButton', async (req, res) => {
      const query = {};
      const categoryButton = await categoryButtonCollection.find(query).toArray();
      res.send(categoryButton);
    })

  } finally {

  }
}
// 
run().catch((err) => console.error(err));

// Connection
app.listen(port, () => {
  console.log("API running in port: " + port);
});
