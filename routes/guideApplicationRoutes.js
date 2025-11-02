import express from "express";
const router = express.Router();
import {
  createApplication,
  getApplication,
} from "../controllers/guideApplicationController.js";

router.post("/", createApplication);
router.get("/", getApplication);

export default router;

