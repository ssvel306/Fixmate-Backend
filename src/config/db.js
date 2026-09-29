import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import Provider from "../models/Provider.js";
import Admin from "../models/Admin.js";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";

// connectDB() opens the connection to MongoDB using the URI from .env.
// We call this once when the server starts (see server.js).
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    await Promise.all([
      Customer.init(),
      Provider.init(),
      Admin.init(),
      Service.init(),
      Booking.init(),
      Review.init(),
    ]);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    // If the database is unreachable, the API is useless — exit immediately
    // instead of running in a broken state.
    process.exit(1);
  }
};

export default connectDB;

