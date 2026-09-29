import express from "express";
import {protect} from "../middleware/authMiddleware.js";
import {authorize} from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import {updateAvailabilityValidator,updateProviderProfileValidator} from "../validators/providerValidators.js";
import {updateAvailability,getMyAvailability,updateProfile} from "../controllers/providerController.js";
import {getMyServices} from "../controllers/serviceController.js";

const router=express.Router();
router.use(protect,authorize("provider"));
router.get("/dashboard",(req,res)=>res.json({success:true,message:"Provider dashboard",data:{user:req.user}}));
router.get("/availability",getMyAvailability);
router.get("/services",getMyServices);
router.patch("/availability",updateAvailabilityValidator,validate,updateAvailability);
router.patch("/profile",updateProviderProfileValidator,validate,updateProfile);
export default router;
