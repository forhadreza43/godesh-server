import express from "express";
const router = express.Router();
import {
  createPackage,
  getRandomPackages,
  getPackages,
  getCategories,
  getPackageById,
} from "../controllers/packageController.js";

router.post("/", createPackage);
router.get("/random-packages", getRandomPackages);
router.get("/categories", getCategories);
router.get("/:id", getPackageById);
router.get("/", getPackages); // This must be last to avoid matching /random-packages and /categories

export default router;

