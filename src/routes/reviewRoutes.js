import express from "express";
import { createReview, deleteReview } from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import { createReviewValidator, reviewIdValidator } from "../validators/reviewValidators.js";

const router = express.Router();

router.post("/", protect, authorize("customer"), createReviewValidator, validate, createReview);
router.delete("/:id", protect, authorize("customer", "admin"), reviewIdValidator, validate, deleteReview);

export default router;

