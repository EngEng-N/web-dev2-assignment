require("dotenv").config();

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_name = process.env.MONGODB_DATABASE;
const mongodb_options = process.env.MONGODB_OPTIONS;

const { MongoClient } = require("mongodb");
const atlasURI = `mongodb://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_name}?${mongodb_options}`;

// Create the client instance
const client = new MongoClient(atlasURI);

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

module.exports = { client, connectDB };
