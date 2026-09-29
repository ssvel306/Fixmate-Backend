import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import publicProviderRoutes from "./routes/publicProviderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

// app.js builds and configures the Express application itself.
// server.js (in the project root) is responsible for starting it and
// connecting to the database. Keeping these separate makes it easy to
// import `app` into a test file later without actually starting a server.
const app = express();

// --- Global middleware ---
app.use(helmet()); // sets a handful of security-related HTTP headers (e.g. disables X-Powered-By)

// CORS_ORIGIN in .env lets you restrict which frontend origins can call this
// API (comma-separated, e.g. "https://myapp.com,https://staging.myapp.com").
// Left unset, it defaults to "*" (allow any origin) — fine for local
// development and for a Flutter mobile client (which isn't subject to CORS
// anyway), but you'd lock this down before shipping a real product.
const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*";
app.use(cors({ origin: corsOrigin }));

app.use(express.json()); // parses incoming JSON request bodies into req.body
app.use(express.urlencoded({ extended: true })); // parses form-urlencoded bodies

// --- Health check route ---
// Simple route to confirm the server is alive. Useful for Postman testing
// and later for uptime checks.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FixMate API is running",
    data: {
      timestamp: new Date().toISOString(),
    },
  });
});

// --- Feature routes ---
app.use("/api/auth", authRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/providers", publicProviderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
// Admin routes are already mounted above at /api/admin (Phase 8 adds more there).

// --- 404 handler ---
// Runs when no route above matched the request.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: [],
  });
});


// --- Centralized error handler ---
// Must be the LAST piece of middleware added — Express recognizes it as
// an error handler because it takes 4 arguments (err, req, res, next).
// Any controller that calls next(error), or that asyncHandler catches,
// ends up here. Will be extended in Phase 9.
app.use(errorHandler);

export default app;
