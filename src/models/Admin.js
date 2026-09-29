import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, default: "admin" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

adminSchema.pre("save", async function() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});
adminSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};
adminSchema.set("toJSON", { transform: (_, ret) => { delete ret.password; delete ret.__v; return ret; } });
export default mongoose.model("Admin", adminSchema);

