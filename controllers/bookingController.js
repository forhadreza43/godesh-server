import { ObjectId } from "mongodb";
import Booking from "../models/Booking.js";

const createBooking = async (req, res) => {
  try {
    const booking = req.body;
    booking.status = "pending";
    booking.bookingAt = new Date().toISOString();

    const result = await Booking.insertOne(booking);
    res.status(201).json({
      message: "Booking successful",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Error storing booking:", error);
    res.status(500).json({ message: "Failed to store booking" });
  }
};

const getBookings = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const bookings = await Booking.find(
      { touristEmail: email },
      { sort: { bookingAt: -1 } }
    );

    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Id is required" });
    }

    const booking = await Booking.findOne({ _id: new ObjectId(id) });
    res.status(200).json(booking);
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res
        .status(400)
        .json({ message: "Status is required in request body" });
    }

    const updateFields = {
      status: status.toLowerCase(),
    };

    if (status.toLowerCase() === "rejected") {
      updateFields.rejectedAt = new Date();
    }
    if (status.toLowerCase() === "accepted") {
      updateFields.acceptedAt = new Date();
    }

    const result = await Booking.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    res.send({ updated: result.modifiedCount > 0 });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ message: "Failed to update booking status" });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const result = await Booking.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "Booking not found or already deleted" });
    }

    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getGuideBookings = async (req, res) => {
  try {
    const { guideId } = req.params;
    const { status, page = 1, limit = 5 } = req.query;

    const query = { guideId };

    if (status) {
      query.status = status.toLowerCase();
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      Booking.find(query, {
        skip,
        limit: parseInt(limit),
        sort: { bookingAt: -1 },
      }),
      Booking.countDocuments(query),
    ]);

    res.status(200).json({
      data,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching guide bookings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
  getGuideBookings,
};

