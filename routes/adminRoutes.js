import express from "express";
const router = express.Router();
import { getAdminStats } from "../controllers/adminController.js";
import { verifyToken, verifyRoles } from "../middleware/auth.js";

router.get(
  "/stats",
  verifyToken,
  verifyRoles("admin"),
  getAdminStats
);

export default router;

