import { body } from "express-validator";
import objectIdParam from "./common.js";
import isValidObjectId from "../utils/isValidObjectId.js";
import { BOOKING_STATUSES } from "../models/Booking.js";

export const createBookingValidator = [
  body().custom((value) => {
    const sId = value?.serviceId || value?.service;
    if (!sId || !isValidObjectId(sId)) {
      throw new Error("serviceId must be a valid MongoDB ObjectId");
    }
    return true;
  }),
  body("bookingDate").matches(/^\d{4}-\d{2}-\d{2}/).withMessage("bookingDate must be in YYYY-MM-DD format"),
  body("bookingTime")
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("bookingTime must be in HH:mm 24-hour format"),

  body("address").trim().notEmpty().withMessage("Address is required"),
  body("notes").optional().trim(),
];

export const bookingIdValidator = [objectIdParam("id")];
export const cancelBookingValidator = [objectIdParam("id"), body("reason").optional().trim().isLength({max:500})];

export const updateBookingStatusValidator = [
  objectIdParam("id"),
  body("status")
    .isIn(BOOKING_STATUSES)
    .withMessage(`status must be one of: ${BOOKING_STATUSES.join(", ")}`),
];
