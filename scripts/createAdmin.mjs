// One-off script to create an admin account.
// Why a script, not an API endpoint? Register (Phase 2) deliberately blocks
// role=admin — anyone hitting a public endpoint should never be able to
// grant themselves admin. This script talks to the database directly instead.
//
// Usage:
//   node scripts/createAdmin.mjs "Admin Name" admin@example.com somePassword123
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Admin from "../src/models/Admin.js";
import Customer from "../src/models/Customer.js";
import Provider from "../src/models/Provider.js";

const [, , name, email, password] = process.argv;

if (!name || !email || !password) {
  console.error("Usage: node scripts/createAdmin.mjs \"Admin Name\" admin@example.com somePassword123");
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existingAdmin = await Admin.findOne({ email });
  const existingCustomer = await Customer.findOne({ email });
  const existingProvider = await Provider.findOne({ email });
  const existing = existingAdmin || existingCustomer || existingProvider;

  if (existing) {
    console.error(`An account with email ${email} already exists (role: ${existing.role || "unknown"}).`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Password hashing happens automatically via the pre("save") hook on the Admin model.
  const admin = await Admin.create({ name, email, password, role: "admin" });

  console.log(`Admin account created: ${admin.email} (id: ${admin._id})`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed to create admin:", err.message);
  process.exit(1);
});

