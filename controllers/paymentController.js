import Stripe from "stripe";
import { ObjectId } from "mongodb";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";

const stripe = new Stripe(process.env.STRIPE_SK);

const createPaymentIntent = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findOne({
      _id: new ObjectId(bookingId),
    });
    
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

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
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createPayment = async (req, res) => {
  try {
    const payment = req.body;
    payment.paidAt = new Date().toISOString();

    const result = await Payment.insertOne(payment);
    res.status(201).json({
      message: "Payment successful",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Error storing payment:", error);
    res.status(500).json({ message: "Failed to store payment" });
  }
};

export {
  createPaymentIntent,
  createPayment,
};

