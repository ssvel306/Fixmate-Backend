import express from "express";
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import {
  createServiceValidator,
  updateServiceValidator,
  serviceIdValidator,
  getServicesValidator,
} from "../validators/serviceValidators.js";

const router = express.Router();

// Public — anyone (including logged-out users) can browse services
router.get("/", getServicesValidator, validate, getServices);
router.get("/:id", serviceIdValidator, validate, getServiceById);

// Provider-only — protect() confirms login, authorize("provider") confirms role.
// Ownership (can a provider only touch their OWN service) is checked inside the controller.
router.post("/", protect, authorize("provider"), createServiceValidator, validate, createService);
router.put("/:id", protect, authorize("provider"), updateServiceValidator, validate, updateService);
router.delete("/:id", protect, authorize("provider", "admin"), serviceIdValidator, validate, deleteService);


export default router;
