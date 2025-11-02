import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/database.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import packageRoutes from "./routes/packageRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import guideApplicationRoutes from "./routes/guideApplicationRoutes.js";

// Import controllers for root-level routes
import { getRandomPackages } from "./controllers/packageController.js";

const port = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, origin);
    },
    credentials: true,
  })
);

// Routes
app.use("/", authRoutes);
app.use("/users", userRoutes);
app.use("/packages", packageRoutes);
app.get("/random-packages", getRandomPackages); // Backward compatibility - root level
app.use("/stories", storyRoutes);
app.use("/bookings", bookingRoutes);
app.use("/", paymentRoutes);
app.use("/admin", adminRoutes);
app.use("/guide-applications", guideApplicationRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("GoDesh server running");
});

// Start server
async function startServer() {
  try {
    await connectDB();
    console.log("Database connected successfully");
    
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
