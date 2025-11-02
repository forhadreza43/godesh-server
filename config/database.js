import "dotenv/config";
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

let godeshdb = null;

async function connectDB() {
  try {
    await client.connect();
    godeshdb = client.db("godeshdb");
    return godeshdb;
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
}

function getDB() {
  if (!godeshdb) {
    throw new Error("Database not connected. Call connectDB() first.");
  }
  return godeshdb;
}

export { connectDB, getDB, client };
