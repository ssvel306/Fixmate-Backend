import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      // Not an enum on purpose — the master prompt says not to hard-code
      // categories into the database logic. Providers can enter categories
      // like "Plumbing", "Electrical", "AC Repair", "Cleaning", etc. freely.
      // We still index it (below) so filtering by category stays fast.
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    duration: {
      type: Number, // duration in minutes — simple and unambiguous for an MVP
      default: 60,
      min: [1, "Duration must be at least 1 minute"],
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider", // lets us .populate("provider") to get provider details
      required: true,
    },
    images: {
      type: [String], // array of image URLs; upload/storage is out of scope for now
      default: [],
    },
    isAvailable: { type: Boolean, default: true },
    isActive: {
      type: Boolean,
      default: true, // providers can deactivate a service instead of deleting it
    },
  },
  { timestamps: true }
);

// Indexes to make search/filter/pagination (Phase 4 requirement) fast.
serviceSchema.index({ name: "text", description: "text" });
serviceSchema.index({ category: 1 });
serviceSchema.index({ provider: 1 });
serviceSchema.index({ isActive: 1, isAvailable: 1 });

serviceSchema.virtual("title").get(function(){ return this.name; });
serviceSchema.set("toJSON",{virtuals:true});
const Service = mongoose.model("Service", serviceSchema);


export default Service;
