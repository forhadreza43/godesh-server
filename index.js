import dotenv from "dotenv";
dotenv.config();
import express, { json } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { MongoClient, ServerApiVersion } from "mongodb";
const port = process.env.PORT || 3000;

const app = express();

app.use(json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const godeshdb = client.db("godeshdb");
    const usersCollection = godeshdb.collection("users");

    //Store users information
    app.put("/users", async (req, res) => {
      const user = req.body;
      console.log(user);

      if (!user?.email) {
        return res.status(400).send({ message: "Email is required" });
      }

      const filter = { email: user.email };
      const existingUser = await usersCollection.findOne(filter);

      if (existingUser) {
        // If user is trying to register but email already exists
        if (user.isRegistering) {
          return res.status(409).send({
            success: false,
            message: "Email already registered, please login",
          });
        }
        // This is a login → update lastLoginAt
        await usersCollection.updateOne(filter, {
          $set: { lastLoginAt: new Date().toISOString() },
        });

        return res.send({
          success: true,
          message: "Login time updated",
        });
      }

      //new Users
      const updateDoc = {
        name: user.name,
        email: user.email,
        image: user.image,
        role: "tourist",
        authMethod: user.authMethod,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      try {
        const result = await usersCollection.insertOne(updateDoc);

        res.send({
          success: true,
          message: result.upsertedId
            ? "User created"
            : "User login time updated",
        });
      } catch (error) {
        console.error("Error saving user:", error);
        res.status(500).send({ message: "Server error" });
      }
    });

    app.get("/", (req, res) => {
      res.send("GoDesh server running");
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  }
}
run().catch(console.dir);
