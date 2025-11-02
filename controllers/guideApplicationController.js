import GuideApplication from "../models/GuideApplication.js";

const createApplication = async (req, res) => {
  try {
    const application = req.body;

    const existingApplication = await GuideApplication.findOne({
      email: application.email,
    });

    if (existingApplication) {
      return res.status(400).json({
        message: "You have already applied as a tour guide.",
      });
    }
    
    application.status = "pending";
    application.appliedAt = new Date().toISOString();
    const result = await GuideApplication.insertOne(application);
    res.json({
      message: "Application received",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Application error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getApplication = async (req, res) => {
  try {
    const { email } = req.query;
    if (email) {
      const application = await GuideApplication.findOne({ email });
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.status(200).json(application);
    }
  } catch (error) {
    console.error("Error fetching application:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export {
  createApplication,
  getApplication,
};

