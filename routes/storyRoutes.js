import express from "express";
const router = express.Router();
import {
  createStory,
  getStories,
  getAllStories,
  getStoryById,
  deleteStory,
  updateStory,
  approveStory,
  addImageToStory,
  removeImageFromStory,
} from "../controllers/storyController.js";

router.post("/", createStory);
router.get("/all-stories", getAllStories);
router.get("/:id", getStoryById);
router.get("/", getStories);
router.delete("/:id", deleteStory);
router.patch("/:id", updateStory);
router.patch("/:id/approve", approveStory);
router.patch("/add-image/:id", addImageToStory);
router.patch("/remove-image/:id", removeImageFromStory);

export default router;

