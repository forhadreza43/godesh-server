import dotenv from "dotenv";
dotenv.config();
import express, { json } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SK);
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
    strict: false,
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

export const verifyAdmin = (req, res, next) => {
  const user = req.user;
  console.log(user);
  if (user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
  next();
};

export const verifyGuide = (req, res, next) => {
  const user = req.user;
  if (user?.role !== "guide") {
    return res.status(403).json({ message: "Forbidden: Guides only" });
  }
  next();
};

export const verifyTourist = (req, res, next) => {
  const user = req.user;
  if (user?.role !== "tourist") {
    return res.status(403).json({ message: "Forbidden: Tourists only" });
  }
  next();
};

async function run() {
  try {
    const godeshdb = client.db("godeshdb");
    const usersCollection = godeshdb.collection("users");
    const packagesCollection = godeshdb.collection("packages");
    const paymentsCollection = godeshdb.collection("payments");
    const storiesCollection = godeshdb.collection("stories");
    const bookingsCollection = godeshdb.collection("bookings");
    const guideApplicationsCollection =
      godeshdb.collection("guideApplications");

    // Generate jwt token
    app.post("/jwt", async (req, res) => {
      const { email } = req.body;

      const user = await usersCollection.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const token = jwt.sign(
        { email: user.email, role: user.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

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

    // POST /create-booking-payment-intent
    app.post("/create-booking-payment-intent", async (req, res) => {
      const { bookingId } = req.body;

      const booking = await bookingsCollection.findOne({
        _id: new ObjectId(bookingId),
      });
      if (!booking)
        return res.status(404).json({ message: "Booking not found" });

      // 🛡️ Prevent duplicate payment
      if (["in review", "accepted"].includes(booking.status.toLowerCase())) {
        return res
          .status(400)
          .json({ message: "Booking already paid or in progress" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: booking.price * 100,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: { bookingId: bookingId },
      });

      res.send({ clientSecret: paymentIntent.client_secret });
    });

    //Store users information
    app.put("/users", async (req, res) => {
      const user = req.body;
      // console.log(user);

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
        // console.log(email);
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

    //Manage users api
    app.get("/users/admin", verifyToken, verifyAdmin, async (req, res) => {
      const {
        search = "",
        searchField = "name",
        role = "",
        requestStatus = "",
        page = 1,
        limit = 10,
      } = req.query;

      const query = {
        [searchField]: { $regex: search, $options: "i" },
      };

      if (role) {
        query.role = role;
      }
      if (requestStatus) query.requestStatus = requestStatus;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [users, total] = await Promise.all([
        usersCollection.find(query).skip(skip).limit(parseInt(limit)).toArray(),
        usersCollection.countDocuments(query),
      ]);

      res.json({ users, total });
    });

    // GET /users/role/guide
    app.get("/users/role/guide", async (req, res) => {
      try {
        const { limit } = req.query;

        if (limit) {
          const guides = await usersCollection
            .aggregate([
              { $match: { role: "guide" } },
              { $sample: { size: parseInt(limit) } },
            ])
            .toArray();
          return res.json(guides);
        }

        // Return all guides if no amount specified
        const guides = await usersCollection.find({ role: "guide" }).toArray();
        res.json(guides);
      } catch (error) {
        console.error("Error fetching guides:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // GET /users/:id
    app.get("/users/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }
        const user = await usersCollection.findOne({ _id: new ObjectId(id) });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Get stats
    app.get("/admin/stats", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const [totalPaymentResult, totalBookingPriceResult] = await Promise.all(
          [
            paymentsCollection
              .aggregate([
                { $group: { _id: null, total: { $sum: "$amount" } } },
              ])
              .toArray(),

            bookingsCollection
              .aggregate([{ $group: { _id: null, total: { $sum: "$price" } } }])
              .toArray(),
          ]
        );

        const totalGuides = await usersCollection.countDocuments({
          role: "guide",
        });
        const totalTourist = await usersCollection.countDocuments({
          role: "tourist",
        });
        const totalPackages = await packagesCollection.estimatedDocumentCount();
        const totalStories = await storiesCollection.estimatedDocumentCount();

        res.send({
          totalPayment: totalPaymentResult[0]?.total || 0,
          totalBookingPrice: totalBookingPriceResult[0]?.total || 0,
          totalGuides,
          totalTourist,
          totalPackages,
          totalStories,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    //Accept request
    app.patch(
      "/users/approve/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;

        try {
          // Update user role and clear request
          const userUpdate = await usersCollection.updateOne(
            { _id: new ObjectId(id) },
            {
              $set: { role: "guide" },
              $unset: { requestStatus: "", requestedRole: "" },
            }
          );

          // Update application status (based on user email)
          const user = await usersCollection.findOne({ _id: new ObjectId(id) });

          const appUpdate = await guideApplicationsCollection.updateOne(
            { email: user.email, status: "pending" },
            { $set: { status: "approved" } }
          );

          res.send({
            message: "User approved and application updated",
            userUpdate,
            appUpdate,
          });
        } catch (error) {
          res.status(500).send({ error: "Approval failed", details: error });
        }
      }
    );

    //Reject Application
    app.patch(
      "/users/reject/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;

        try {
          // Remove request-related fields from user
          const userUpdate = await usersCollection.updateOne(
            { _id: new ObjectId(id) },
            {
              $unset: { requestStatus: "", requestedRole: "" },
            }
          );

          // Update application to rejected (or delete it)
          const user = await usersCollection.findOne({ _id: new ObjectId(id) });

          const appUpdate = await guideApplicationsCollection.updateOne(
            { email: user.email, status: "pending" },
            { $set: { status: "rejected" } }
          );

          res.send({ message: "Application rejected", userUpdate, appUpdate });
        } catch (error) {
          res.status(500).send({ error: "Rejection failed", details: error });
        }
      }
    );

    // Update User Information /users?email=user@example.com
    app.patch("/users", verifyToken, async (req, res) => {
      try {
        const { email } = req.query;
        const { name, image } = req.body;

        if (!email) {
          return res
            .status(400)
            .json({ message: "Email is required in query" });
        }

        if (!name && !image) {
          return res.status(400).json({ message: "Nothing to update" });
        }

        const updateFields = {};
        if (name) updateFields.name = name;
        if (image) updateFields.image = image;

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
    app.patch(
      "/users/request-role",
      verifyToken,
      verifyTourist,
      async (req, res) => {
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
      }
    );

    // Update user role via Admin /users/approve-role?email=user@example.com
    app.patch(
      "/users/approve-role",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
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
      }
    );

    app.post("/guide-applications", async (req, res) => {
      const application = req.body;
      // console.log(application);

      try {
        const existingApplication = await guideApplicationsCollection.findOne({
          email: application.email,
        });

        if (existingApplication) {
          return res.status(400).json({
            message: "You have already applied as a tour guide.",
          });
        }
        application.status = "pending";
        application.appliedAt = new Date().toISOString();
        const result = await guideApplicationsCollection.insertOne(application);
        res.json({
          message: "Application received",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Application error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    //get Application
    app.get("/guide-applications", async (req, res) => {
      try {
        const { email } = req.query;
        if (email) {
          const application = await guideApplicationsCollection.findOne({
            email,
          });
          if (!application) {
            return res.status(404).json({ message: "Application not found" });
          }
          res.status(200).json(application);
        }
      } catch (error) {
        console.error("Error fetching application:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
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
    app.post("/packages", verifyToken, verifyAdmin, async (req, res) => {
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

    //get 3 random packages
    app.get("/random-packages", async (req, res) => {
      try {
        const result = await packagesCollection
          .aggregate([{ $sample: { size: 3 } }])
          .toArray();
        res.send(result);
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch random packages" });
      }
    });

    // GET /packages
    app.get("/packages", async (req, res) => {
      try {
        const {
          search = "",
          sort = "default",
          category = "",
          page = 1,
          limit = 10,
        } = req.query;
        const query = {};

        if (search) {
          query.tripTitle = { $regex: search, $options: "i" };
        }

        if (category) {
          query.tourType = category;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        let cursor = packagesCollection.find(query);

        // Sorting
        if (sort === "priceLow") {
          cursor = cursor.sort({ price: 1 });
        } else if (sort === "priceHigh") {
          cursor = cursor.sort({ price: -1 });
        } else if (sort === "recent") {
          cursor = cursor.sort({ createdAt: -1 });
        }

        const total = await cursor.clone().count();
        const packages = await cursor
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();
        const totalPages = Math.ceil(total / limit);

        res.json({ data: packages, totalPages });
      } catch (err) {
        console.error("Error fetching packages:", err);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // GET /packages/categories
    app.get("/packages/categories", async (req, res) => {
      try {
        const categories = await packagesCollection.distinct("tourType");
        console.log("Categories:", categories);
        res.json(categories);
      } catch (err) {
        console.error("Error fetching categories:", err.message);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // GET /packages/:id
    app.get("/packages/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const packageData = await packagesCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!packageData) {
          return res.status(404).json({ message: "Package not found" });
        }
        res.json(packageData);
      } catch (error) {
        console.error("Error fetching package:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    //Store Stories
    app.post("/stories", async (req, res) => {
      const story = req.body;
      story.status = "pending";
      story.createdAt = new Date().toISOString();
      const result = await storiesCollection.insertOne(story);
      res.json({ message: "Story saved", id: result.insertedId });
    });

    // GET /stories
    app.get("/stories", async (req, res) => {
      try {
        const { email, status, random } = req.query;
        const query = {};

        if (email) {
          query.createdBy = email;
        }

        if (status) {
          query.status = status;
        }

        // If 'random' is specified, return N random stories
        if (random) {
          const randomStories = await storiesCollection
            .aggregate([
              { $match: query },
              { $sample: { size: parseInt(random) } },
            ])
            .toArray();

          return res.status(200).json(randomStories);
        }

        // Default: return all matching stories
        const stories = await storiesCollection.find(query).toArray();

        if (!stories || stories.length === 0) {
          return res.status(404).json({ message: "No stories found" });
        }

        res.status(200).json(stories);
      } catch (error) {
        console.error("Error fetching stories:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // GET /stories
    app.get("/all-stories", async (req, res) => {
      try {
        const { status, page = 1, limit = 10 } = req.query;
        const query = {};
        if (status) query.status = status;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await storiesCollection.countDocuments(query);
        const stories = await storiesCollection
          .find(query)
          .skip(skip)
          .limit(parseInt(limit))
          .sort({ createdAt: -1 })
          .toArray();
        res.status(200).json({
          data: stories,
          totalPages: Math.ceil(total / limit),
        });
      } catch (error) {
        console.error("Error fetching stories:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    //get Stories by id
    app.get("/stories/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (id) {
          const story = await storiesCollection.findOne({
            _id: new ObjectId(id),
          });
          res.status(200).json(story);
        }
      } catch (error) {
        console.error("Error fetching story:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    //delete stories
    app.delete("/stories/:id", async (req, res) => {
      const { id } = req.params;
      // console.log(id);
      const result = await storiesCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    //Update Stories by user
    app.patch("/stories/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;

      const result = await storiesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            title: updatedData.title,
            content: updatedData.content,
          },
        }
      );
      res.send(result);
    });

    //Approved or rejected by admin
    app.patch("/stories/:id/approve", async (req, res) => {
      const { status } = req.body; // "approved" or "rejected"
      const { id } = req.params;
      const result = await storiesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );
      res.send(result);
    });

    //Add New image
    app.patch("/stories/add-image/:id", async (req, res) => {
      const { id } = req.params;
      const { imageUrl } = req.body;

      const result = await storiesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $push: { images: imageUrl } }
      );
      res.send(result);
    });

    //remove Specific image
    app.patch("/stories/remove-image/:id", async (req, res) => {
      const { id } = req.params;
      const { imageUrl } = req.body;

      const result = await storiesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $pull: { images: imageUrl } }
      );
      res.send(result);
    });

    // POST /bookings
    app.post("/bookings", async (req, res) => {
      try {
        const booking = req.body;
        booking.status = "pending";
        booking.bookingAt = new Date().toISOString();

        const result = await bookingsCollection.insertOne(booking);
        res.status(201).json({
          message: "Booking successful",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error storing booking:", error);
        res.status(500).json({ message: "Failed to store booking" });
      }
    });

    // GET /bookings?email=""
    app.get("/bookings", async (req, res) => {
      try {
        const { email } = req.query;

        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        const bookings = await bookingsCollection
          .find({ touristEmail: email })
          .sort({ bookingAt: -1 }) // optional: latest first
          .toArray();

        res.status(200).json(bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // GET /bookings
    app.get("/bookings/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!id) {
          return res.status(400).json({ message: "Id is required" });
        }

        const booking = await bookingsCollection.findOne({
          _id: new ObjectId(id),
        });

        res.status(200).json(booking);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // PATCH /bookings/:id/status
    app.patch("/bookings/:id/status", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res
          .status(400)
          .json({ message: "Status is required in request body" });
      }

      try {
        const result = await bookingsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: status.toLowerCase(),
              ...(status.toLowerCase() === "rejected" && {
                rejectedAt: new Date(),
              }),
              ...(status.toLowerCase() === "accepted" && {
                acceptedAt: new Date(),
              }),
            },
          }
        );

        res.send({ updated: result.modifiedCount > 0 });
      } catch (error) {
        console.error("Error updating booking status:", error);
        res.status(500).json({ message: "Failed to update booking status" });
      }
    });

    // DELETE /bookings/:id
    app.delete("/bookings/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid booking ID" });
        }

        const result = await bookingsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .json({ message: "Booking not found or already deleted" });
        }

        res.status(200).json({ message: "Booking deleted successfully" });
      } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // GET /bookings/guide/:guideId
    app.get("/bookings/guide/:guideId", async (req, res) => {
      try {
        const { guideId } = req.params;
        const { status, page = 1, limit = 5 } = req.query;

        const query = { guideId };

        if (status) {
          query.status = status.toLowerCase();
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [data, total] = await Promise.all([
          bookingsCollection
            .find(query)
            .sort({ bookingAt: -1 }) // Optional: sort by booking time
            .skip(skip)
            .limit(parseInt(limit))
            .toArray(),

          bookingsCollection.countDocuments(query),
        ]);

        res.status(200).json({
          data,
          total,
          totalPages: Math.ceil(total / limit),
        });
      } catch (error) {
        console.error("Error fetching guide bookings:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.post("/payments", async (req, res) => {
      try {
        const payment = req.body;
        payment.paidAt = new Date().toISOString();

        const result = await paymentsCollection.insertOne(payment);
        res.status(201).json({
          message: "Payment successful",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error storing payment:", error);
        res.status(500).json({ message: "Failed to store payment" });
      }
    });

    app.get("/", (req, res) => {
      res.send("GoDesh server running");
    });
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  }
}
run().catch(console.dir);
