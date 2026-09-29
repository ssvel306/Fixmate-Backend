import { param } from "express-validator";
import isValidObjectId from "../utils/isValidObjectId.js";

// objectIdParam(name) validates that req.params[name] looks like a real
// MongoDB ObjectId. Reused across every route that takes an :id-style param,
// so the same check and error message aren't duplicated in five files.
const objectIdParam = (name = "id") =>
  param(name).custom((value) => {
    if (!isValidObjectId(value)) {
      throw new Error(`${name} must be a valid MongoDB ObjectId`);
    }
    return true;
  });

export default objectIdParam;
