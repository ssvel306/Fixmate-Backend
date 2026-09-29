import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  phone: { type: String, trim: true, default: "" },
  profileImage: { type: String, trim: true, default: "" },
  role: { type: String, default: "customer" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

customerSchema.pre("save", async function() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});
customerSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};
customerSchema.set("toJSON", { transform: (_, ret) => { delete ret.password; delete ret.__v; return ret; } });
export default mongoose.model("Customer", customerSchema);

