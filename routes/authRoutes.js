import express from "express";
const router = express.Router();
import { generateToken } from "../controllers/authController.js";

router.post("/jwt", generateToken);

export default router;

