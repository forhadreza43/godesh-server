import dotenv from "dotenv";
dotenv.config();
import express, { json } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { MongoClient, ServerApiVersion } from "mongodb";
import jwt from "jsonwebtoken";
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

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    const godeshdb = client.db("godeshdb");
    const usersCollection = godeshdb.collection("users");
    const packagesCollection = godeshdb.collection("packages");

    // Generate jwt token
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      // console.log(email);
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    // Logout
    app.get("/logout", async (_req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
      } catch (err) {
        res.status(500).send(err);
      }
    });

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

    // GET User Information /users?email=someone@example.com
    app.get("/users", async (req, res) => {
      try {
        const { email } = req.query;
        console.log(email);
        if (email) {
          const user = await usersCollection.findOne({ email });
          if (!user) {
            return res.status(404).json({ message: "User not found" });
          }
          res.status(200).json(user);
        } else {
          const users = await usersCollection.find().toArray();
          res.status(200).json(users);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // Update User Information /users?email=user@example.com
    app.patch("/users", async (req, res) => {
      try {
        const { email } = req.query;
        const { name, photo } = req.body;

        if (!email) {
          return res
            .status(400)
            .json({ message: "Email is required in query" });
        }

        if (!name && !photo) {
          return res.status(400).json({ message: "Nothing to update" });
        }

        const updateFields = {};
        if (name) updateFields.name = name;
        if (photo) updateFields.photo = photo;

        const result = await usersCollection.updateOne(
          { email },
          { $set: updateFields }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({
          message: "User updated successfully",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Request User role Update /users/request-role?email=user@example.com
    app.patch("/users/request-role", async (req, res) => {
      const { email } = req.query;
      const { requestedRole } = req.body;
      if (!email || !requestedRole) {
        return res
          .status(400)
          .json({ message: "Email and requestedRole required" });
      }
      const result = await usersCollection.updateOne(
        { email },
        {
          $set: {
            requestedRole,
            requestStatus: "pending",
          },
        }
      );
      res.json({
        message: "Request submitted",
        modifiedCount: result.modifiedCount,
      });
    });

    // Update user role via Admin /users/approve-role?email=user@example.com
    app.patch("/users/approve-role", async (req, res) => {
      const { email } = req.query;
      const { approve } = req.body;
      const user = await usersCollection.findOne({ email });
      if (!user || !user.requestedRole || user.requestStatus !== "pending") {
        return res.status(404).json({ message: "No pending request found" });
      }
      const updateFields = approve
        ? {
            role: user.requestedRole,
            requestStatus: "approved",
            requestedRole: null,
          }
        : {
            requestStatus: "rejected",
            requestedRole: null,
          };

      const result = await usersCollection.updateOne(
        { email },
        { $set: updateFields }
      );
      res.json({
        message: approve ? "Role approved" : "Role rejected",
        modifiedCount: result.modifiedCount,
      });
    });

    //get users role
    app.get("/users/role/:email", async (req, res) => {
      const { email } = req.params;
      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }
      try {
        const user = await usersCollection.findOne({ email });
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }
        res.send({
          role: user.role,
        });
      } catch (error) {
        console.error("Error getting user role:", error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Store package data
    app.post("/packages", async (req, res) => {
      try {
        const packageData = req.body;
        packageData.createdAt = new Date().toISOString();
        const result = await packagesCollection.insertOne(packageData);
        res.status(201).json({
          message: "Package added successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error adding package:", error);
        res.status(500).json({ message: "Internal server error" });
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
