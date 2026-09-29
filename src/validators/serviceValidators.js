import { body, query } from "express-validator";
import objectIdParam from "./common.js";

export const createServiceValidator = [
  body().custom(value => { if (!value.name && !value.title) throw new Error("name is required"); return true; }),
  body("name").optional().trim().notEmpty().withMessage("Service name cannot be empty"),
  body("title").optional().trim().notEmpty().withMessage("Title cannot be empty"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("duration").isInt({ min: 1 }).withMessage("Duration must be a positive number of minutes"),
  body("images").optional().isArray().withMessage("images must be an array of URLs"),
  body("isAvailable").optional().isBoolean(),
];

export const updateServiceValidator = [
  objectIdParam("id"),
  body("name").optional().trim().notEmpty().withMessage("Service name cannot be empty"),
  body("title").optional().trim().notEmpty().withMessage("Title cannot be empty"),
  body("description").optional().trim().notEmpty().withMessage("Description cannot be empty"),
  body("category").optional().trim().notEmpty().withMessage("Category cannot be empty"),
  body("price").optional().isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("duration").optional().isInt({ min: 1 }).withMessage("Duration must be a positive number of minutes"),
  body("images").optional().isArray().withMessage("images must be an array of URLs"),
  body("isAvailable").optional().isBoolean(),
  body("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
];

export const serviceIdValidator = [objectIdParam("id")];

export const getServicesValidator = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("limit must be between 1 and 50"),
  query("minPrice").optional().isFloat({ min: 0 }).withMessage("minPrice must be a positive number"),
  query("maxPrice").optional().isFloat({ min: 0 }).withMessage("maxPrice must be a positive number"),
];
