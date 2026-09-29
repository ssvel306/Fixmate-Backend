import express from "express";
import {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
} from "../controllers/bookingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import {
  createBookingValidator,
  bookingIdValidator,
  updateBookingStatusValidator,cancelBookingValidator,
} from "../validators/bookingValidators.js";

const router = express.Router();

// Every booking route requires login. Role-specific rules (who can create,
// who can update status, who can cancel) are enforced per-route below and,
// for ownership, inside the controller.
router.post("/", protect, authorize("customer"), createBookingValidator, validate, createBooking);
router.get("/", protect, getBookings); // customer/provider/admin — filtered by role inside the controller
router.get("/:id", protect, bookingIdValidator, validate, getBookingById);
router.patch(
  "/:id/status",
  protect,
  authorize("provider"),
  updateBookingStatusValidator,
  validate,
  updateBookingStatus
);

router.patch("/:id/cancel", protect, authorize("customer"), cancelBookingValidator, validate, cancelBooking);

export default router;
