import Provider from "../models/Provider.js";
import asyncHandler from "../utils/asyncHandler.js";
import { updateProviderAvailability, updateProviderProfile } from "../services/providerService.js";
import isValidObjectId from "../utils/isValidObjectId.js";

export const updateAvailability=asyncHandler(async(req,res)=>{
  const availability=await updateProviderAvailability(req.user.id,req.body);
  res.json({success:true,message:"Availability updated successfully",data:{availability}});
});
export const getMyAvailability=asyncHandler(async(req,res)=>{
  const provider=await Provider.findById(req.user.id).select("availability");
  if(!provider){res.status(404);throw new Error("Provider not found");}
  res.json({success:true,message:"Availability fetched successfully",data:{availability:provider.availability}});
});
export const updateProfile=asyncHandler(async(req,res)=>{
  const provider=await updateProviderProfile(req.user.id,req.body);
  res.json({success:true,message:"Profile updated successfully",data:{provider}});
});
export const getProviderProfile=asyncHandler(async(req,res)=>{
  if(!isValidObjectId(req.params.id)){res.status(400);throw new Error("Invalid provider id");}
  const provider=await Provider.findOne({_id:req.params.id,isActive:true}).select("name email phone profileImage availability averageRating totalReviews createdAt");
  if(!provider){res.status(404);throw new Error("Provider not found");}
  res.json({success:true,message:"Provider profile fetched",data:{provider}});
});
