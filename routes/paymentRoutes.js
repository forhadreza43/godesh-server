import express from "express";
const router = express.Router();
import {
  createPaymentIntent,
  createPayment,
} from "../controllers/paymentController.js";

router.post("/create-booking-payment-intent", createPaymentIntent);
router.post("/", createPayment);

export default router;

