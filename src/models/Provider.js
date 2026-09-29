import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const providerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  phone: { type: String, trim: true, default: "" },
  profileImage: { type: String, trim: true, default: "" },
  role: { type: String, default: "provider" },
  isActive: { type: Boolean, default: true },
  availability: {
    isAvailable: { type: Boolean, default: true },
    workingDays: {
      type: [String],
      enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      default: ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    },
    startTime: { type: String, default: "09:00" },
    endTime: { type: String, default: "18:00" },
  },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

providerSchema.pre("save", async function() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});
providerSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};
providerSchema.set("toJSON", { transform: (_, ret) => { delete ret.password; delete ret.__v; return ret; } });
export default mongoose.model("Provider", providerSchema);

