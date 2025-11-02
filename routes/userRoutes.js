import express from "express";
const router = express.Router();
import {
  createOrUpdateUser,
  getUsers,
  getUsersAdmin,
  getGuides,
  getUserById,
  approveUser,
  rejectUser,
  updateUser,
  requestRole,
  approveRole,
  getUserRole,
} from "../controllers/userController.js";

router.put("/", createOrUpdateUser);
router.get("/", getUsers);
router.get("/admin", getUsersAdmin);
router.get("/role/guide", getGuides);
router.get("/:id", getUserById);
router.patch("/approve/:id", approveUser);
router.patch("/reject/:id", rejectUser);
router.patch("/", updateUser);
router.patch("/request-role", requestRole);
router.patch("/approve-role", approveRole);
router.get("/role/:email", getUserRole);

export default router;

