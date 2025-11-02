import User from "../models/User.js";
import Package from "../models/Package.js";
import Story from "../models/Story.js";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";

const getAdminStats = async (req, res) => {
  try {
    const [totalPaymentResult, totalBookingPriceResult] = await Promise.all([
      Payment.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      Booking.aggregate([
        { $group: { _id: null, total: { $sum: "$price" } } },
      ]),
    ]);

    const totalGuides = await User.countDocuments({ role: "guide" });
    const totalTourist = await User.countDocuments({ role: "tourist" });
    const totalPackages = await Package.estimatedDocumentCount();
    const totalStories = await Story.estimatedDocumentCount();

    res.send({
      totalPayment: totalPaymentResult[0]?.total || 0,
      totalBookingPrice: totalBookingPriceResult[0]?.total || 0,
      totalGuides,
      totalTourist,
      totalPackages,
      totalStories,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { getAdminStats };

