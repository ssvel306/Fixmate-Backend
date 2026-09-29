import express from "express";
import { getProviderProfile } from "../controllers/providerController.js";
import { getProviderReviews } from "../controllers/reviewController.js";
import validate from "../middleware/validate.js";
import objectIdParam from "../validators/common.js";

// Separate from providerRoutes.js on purpose: providerRoutes.js is the
// "I am logged in as a provider, manage my own stuff" router (mounted at
// /api/provider — singular). This file is the PUBLIC "anyone can look up
// a provider's profile" router (mounted at /api/providers — plural).
const router = express.Router();

router.get("/:id", [objectIdParam("id")], validate, getProviderProfile);
router.get("/:providerId/reviews", [objectIdParam("providerId")], validate, getProviderReviews);

export default router;
