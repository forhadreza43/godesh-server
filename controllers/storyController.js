import { ObjectId } from "mongodb";
import Story from "../models/Story.js";

const createStory = async (req, res) => {
  try {
    const story = req.body;
    story.status = "pending";
    story.createdAt = new Date().toISOString();
    const result = await Story.insertOne(story);
    res.json({ message: "Story saved", id: result.insertedId });
  } catch (error) {
    console.error("Error creating story:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getStories = async (req, res) => {
  try {
    const { email, status, random } = req.query;
    const query = {};

    if (email) {
      query.createdBy = email;
    }

    if (status) {
      query.status = status;
    }

    if (random) {
      const randomStories = await Story.aggregate([
        { $match: query },
        { $sample: { size: parseInt(random) } },
      ]);
      return res.status(200).json(randomStories);
    }

    const stories = await Story.find(query);

    if (!stories || stories.length === 0) {
      return res.status(404).json({ message: "No stories found" });
    }

    res.status(200).json(stories);
  } catch (error) {
    console.error("Error fetching stories:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getAllStories = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Story.countDocuments(query);
    const stories = await Story.find(query, {
      skip,
      limit: parseInt(limit),
      sort: { createdAt: -1 },
    });
    res.status(200).json({
      data: stories,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching stories:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getStoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (id) {
      const story = await Story.findOne({ _id: new ObjectId(id) });
      res.status(200).json(story);
    }
  } catch (error) {
    console.error("Error fetching story:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Story.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    console.error("Error deleting story:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateStory = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const result = await Story.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title: updatedData.title,
          content: updatedData.content,
        },
      }
    );
    res.send(result);
  } catch (error) {
    console.error("Error updating story:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const approveStory = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const result = await Story.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );
    res.send(result);
  } catch (error) {
    console.error("Error approving story:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addImageToStory = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    const result = await Story.updateOne(
      { _id: new ObjectId(id) },
      { $push: { images: imageUrl } }
    );
    res.send(result);
  } catch (error) {
    console.error("Error adding image:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const removeImageFromStory = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    const result = await Story.updateOne(
      { _id: new ObjectId(id) },
      { $pull: { images: imageUrl } }
    );
    res.send(result);
  } catch (error) {
    console.error("Error removing image:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  createStory,
  getStories,
  getAllStories,
  getStoryById,
  deleteStory,
  updateStory,
  approveStory,
  addImageToStory,
  removeImageFromStory,
};

