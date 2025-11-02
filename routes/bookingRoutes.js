import express from "express";
const router = express.Router();
import {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
  getGuideBookings,
} from "../controllers/bookingController.js";

router.post("/", createBooking);
router.get("/guide/:guideId", getGuideBookings);
router.get("/:id", getBookingById);
router.get("/", getBookings);
router.patch("/:id/status", updateBookingStatus);
router.delete("/:id", deleteBooking);

export default router;

