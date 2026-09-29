import dotenv from "dotenv";
dotenv.config(); // must run before we read any process.env values below

import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import validateEnv from "./src/config/validateEnv.js";

// Fail fast on missing/placeholder config, before touching the database.
validateEnv();

const PORT = process.env.PORT || 5000;

// Catch bugs that slip past asyncHandler (e.g. an error thrown outside any
// request, or a rejected promise nobody awaited) instead of letting the
// process die silently or in an inconsistent state.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

// Connect to MongoDB first, then start listening for HTTP requests.
// This avoids accepting requests before the database is ready.
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`FixMate API running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
});
