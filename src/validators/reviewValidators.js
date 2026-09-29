import { body } from "express-validator";
import objectIdParam from "./common.js";
import isValidObjectId from "../utils/isValidObjectId.js";

export const createReviewValidator = [
  body("bookingId").custom((value) => {
    if (!value || !isValidObjectId(value)) {
      throw new Error("bookingId must be a valid MongoDB ObjectId");
    }
    return true;
  }),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("rating must be an integer between 1 and 5"),
  body("comment").optional().trim().isLength({ max: 1000 }).withMessage("comment must be under 1000 characters"),
];

export const reviewIdValidator = [objectIdParam("id")];
