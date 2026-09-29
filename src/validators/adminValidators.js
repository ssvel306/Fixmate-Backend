import { body } from "express-validator";
import objectIdParam from "./common.js";

export const updateUserStatusValidator = [
  objectIdParam("id"),
  body("isActive").isBoolean().withMessage("isActive must be true or false"),
];

export const reviewIdParamValidator = [objectIdParam("id")];
