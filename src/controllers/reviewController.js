import asyncHandler from "../utils/asyncHandler.js";
import isValidObjectId from "../utils/isValidObjectId.js";
import {createReview as create,listProviderReviews,deleteReview as remove} from "../services/reviewService.js";

export const createReview=asyncHandler(async(req,res)=>{
  const review=await create({customerId:req.user.id,...req.body});
  res.status(201).json({success:true,message:"Review submitted successfully",data:{review}});
});
export const getProviderReviews=asyncHandler(async(req,res)=>{
  const providerId = req.params.providerId || req.params.id;
  if(!isValidObjectId(providerId)){res.status(400);throw new Error("Invalid provider id");}
  const reviews=await listProviderReviews(providerId);
  res.json({success:true,message:"Provider reviews fetched successfully",data:{reviews}});
});
export const deleteReview=asyncHandler(async(req,res)=>{
  if(!isValidObjectId(req.params.id)){res.status(400);throw new Error("Invalid review id");}
  const ReviewModel=(await import("../models/Review.js")).default;
  const review=await ReviewModel.findById(req.params.id);
  if(!review){res.status(404);throw new Error("Review not found");}
  if(req.user.role !== "admin" && review.customer.toString()!==req.user.id){res.status(403);throw new Error("You can only delete your own review");}
  await remove(req.params.id);
  res.json({success:true,message:"Review deleted successfully",data:{}});
});

export const deleteReviewAsAdmin=asyncHandler(async(req,res)=>{
  if(!isValidObjectId(req.params.id)){res.status(400);throw new Error("Invalid review id");}
  await remove(req.params.id);
  res.json({success:true,message:"Review removed successfully",data:{}});
});
