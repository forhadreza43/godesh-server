import { ObjectId } from "mongodb";
import Package from "../models/Package.js";

const createPackage = async (req, res) => {
  try {
    const packageData = req.body;
    packageData.createdAt = new Date().toISOString();
    const result = await Package.insertOne(packageData);
    res.status(201).json({
      message: "Package added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Error adding package:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getRandomPackages = async (req, res) => {
  try {
    const result = await Package.aggregate([{ $sample: { size: 4 } }]);
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch random packages" });
  }
};

const getPackages = async (req, res) => {
  try {
    const {
      search = "",
      sort = "default",
      category = "",
      page = 1,
      limit = 10,
    } = req.query;
    const query = {};

    if (search) {
      query.tripTitle = { $regex: search, $options: "i" };
    }

    if (category) {
      query.tourType = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let sortOptions = {};

    if (sort === "priceLow") {
      sortOptions = { price: 1 };
    } else if (sort === "priceHigh") {
      sortOptions = { price: -1 };
    } else if (sort === "recent") {
      sortOptions = { createdAt: -1 };
    }

    const cursor = Package.collection().find(query);
    
    if (Object.keys(sortOptions).length > 0) {
      cursor.sort(sortOptions);
    }

    const total = await cursor.clone().count();
    const packages = await cursor
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    const totalPages = Math.ceil(total / limit);

    res.json({ data: packages, totalPages });
  } catch (err) {
    console.error("Error fetching packages:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Package.distinct("tourType");
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    const packageData = await Package.findOne({ _id: new ObjectId(id) });
    if (!packageData) {
      return res.status(404).json({ message: "Package not found" });
    }
    res.json(packageData);
  } catch (error) {
    console.error("Error fetching package:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  createPackage,
  getRandomPackages,
  getPackages,
  getCategories,
  getPackageById,
};

