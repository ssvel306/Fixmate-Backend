import express from "express";
import {register,registerCustomer,registerProvider,registerAdmin,login,getMe} from "../controllers/authController.js";
import {protect} from "../middleware/authMiddleware.js";
import {registerValidator,loginValidator,adminRegisterValidator} from "../validators/authValidators.js";
import validate from "../middleware/validate.js";
import authLimiter from "../middleware/rateLimiter.js";

const router=express.Router();
router.post("/register",authLimiter,registerValidator,validate,register);
router.post("/customer/register",authLimiter,registerValidator,validate,registerCustomer);
router.post("/provider/register",authLimiter,registerValidator,validate,registerProvider);
router.post("/admin/register",authLimiter,adminRegisterValidator,validate,registerAdmin);
router.post("/login",authLimiter,loginValidator,validate,login);

router.get("/me",protect,getMe);
export default router;
