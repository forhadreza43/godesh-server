import { ObjectId } from "mongodb";
import User from "../models/User.js";
import GuideApplication from "../models/GuideApplication.js";

const createOrUpdateUser = async (req, res) => {
  try {
    const user = req.body;

    if (!user?.email) {
      return res.status(400).send({ message: "Email is required" });
    }

    const filter = { email: user.email };
    const existingUser = await User.findOne(filter);

    if (existingUser) {
      if (user.isRegistering) {
        return res.status(409).send({
          success: false,
          message: "Email already registered, please login",
        });
      }
      await User.updateOne(filter, {
        $set: { lastLoginAt: new Date().toISOString() },
      });

      return res.send({
        success: true,
        message: "Login time updated",
      });
    }

    const updateDoc = {
      name: user.name,
      email: user.email,
      image: user.image,
      role: "tourist",
      authMethod: user.authMethod,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    const result = await User.insertOne(updateDoc);
    res.send({
      success: true,
      message: result.insertedId ? "User created" : "User login time updated",
    });
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).send({ message: "Server error" });
  }
};

const getUsers = async (req, res) => {
  try {
    const { email } = req.query;
    if (email) {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(user);
    } else {
      const users = await User.find();
      res.status(200).json(users);
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getUsersAdmin = async (req, res) => {
  try {
    const {
      search = "",
      searchField = "name",
      role = "",
      requestStatus = "",
      page = 1,
      limit = 10,
    } = req.query;

    const query = {
      [searchField]: { $regex: search, $options: "i" },
    };

    if (role) query.role = role;
    if (requestStatus) query.requestStatus = requestStatus;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query, { skip, limit: parseInt(limit) }),
      User.countDocuments(query),
    ]);

    res.json({ users, total });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getGuides = async (req, res) => {
  try {
    const { limit } = req.query;

    if (limit) {
      const guides = await User.aggregate([
        { $match: { role: "guide" } },
        { $sample: { size: parseInt(limit) } },
      ]);
      return res.json(guides);
    }

    const guides = await User.find({ role: "guide" });
    res.json(guides);
  } catch (error) {
    console.error("Error fetching guides:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const user = await User.findOne({ _id: new ObjectId(id) });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const approveUser = async (req, res) => {
  try {
    const id = req.params.id;

    const userUpdate = await User.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { role: "guide" },
        $unset: { requestStatus: "", requestedRole: "" },
      }
    );

    const user = await User.findOne({ _id: new ObjectId(id) });

    const appUpdate = await GuideApplication.updateOne(
      { email: user.email, status: "pending" },
      { $set: { status: "approved" } }
    );

    res.send({
      message: "User approved and application updated",
      userUpdate,
      appUpdate,
    });
  } catch (error) {
    res.status(500).send({ error: "Approval failed", details: error });
  }
};

const rejectUser = async (req, res) => {
  try {
    const id = req.params.id;

    const userUpdate = await User.updateOne(
      { _id: new ObjectId(id) },
      {
        $unset: { requestStatus: "", requestedRole: "" },
      }
    );

    const user = await User.findOne({ _id: new ObjectId(id) });

    const appUpdate = await GuideApplication.updateOne(
      { email: user.email, status: "pending" },
      { $set: { status: "rejected" } }
    );

    res.send({ message: "Application rejected", userUpdate, appUpdate });
  } catch (error) {
    res.status(500).send({ error: "Rejection failed", details: error });
  }
};

const updateUser = async (req, res) => {
  try {
    const { email } = req.query;
    const { name, image } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required in query" });
    }

    if (!name && !image) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (image) updateFields.image = image;

    const result = await User.updateOne({ email }, { $set: updateFields });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const requestRole = async (req, res) => {
  try {
    const { email } = req.query;
    const { requestedRole } = req.body;
    if (!email || !requestedRole) {
      return res
        .status(400)
        .json({ message: "Email and requestedRole required" });
    }
    const result = await User.updateOne(
      { email },
      {
        $set: {
          requestedRole,
          requestStatus: "pending",
        },
      }
    );
    res.json({
      message: "Request submitted",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error requesting role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const approveRole = async (req, res) => {
  try {
    const { email } = req.query;
    const { approve } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.requestedRole || user.requestStatus !== "pending") {
      return res.status(404).json({ message: "No pending request found" });
    }
    const updateFields = approve
      ? {
          role: user.requestedRole,
          requestStatus: "approved",
          requestedRole: null,
        }
      : {
          requestStatus: "rejected",
          requestedRole: null,
        };

    const result = await User.updateOne({ email }, { $set: updateFields });
    res.json({
      message: approve ? "Role approved" : "Role rejected",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error approving role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUserRole = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).send({ message: "Email is required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    res.send({ role: user.role });
  } catch (error) {
    console.error("Error getting user role:", error);
    res.status(500).send({ message: "Server error" });
  }
};

export {
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
};

