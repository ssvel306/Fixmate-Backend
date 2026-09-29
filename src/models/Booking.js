import mongoose from "mongoose";

export const BOOKING_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
];

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    bookingDate: {
      type: Date,
      required: [true, "Booking date is required"],
    },
    bookingTime: {
      type: String, // "HH:mm" — kept as a simple string, same approach as provider availability
      required: [true, "Booking time is required"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      // Always copied from the service at booking time (see bookingController.js) —
      // never taken directly from the client — so a customer can't book at a price they made up.
    },
    cancellationReason: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "PENDING",
    },
  },
  { timestamps: true }
);

bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ provider: 1, createdAt: -1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ provider: 1, bookingDate: 1, bookingTime: 1, status: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;

