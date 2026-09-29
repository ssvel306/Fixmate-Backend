import asyncHandler from "../utils/asyncHandler.js";
import isValidObjectId from "../utils/isValidObjectId.js";
import {listUsers,listAllUsers,listAllServices,listAllBookings,setUserStatus,setServiceStatus} from "../services/adminService.js";
import {deleteReviewAsAdmin} from "./reviewController.js";

export const getUsers=asyncHandler(async(req,res)=>res.json({success:true,message:"Users fetched successfully",data:await listAllUsers(req.query)}));

export const getProviders=asyncHandler(async(req,res)=>res.json({success:true,message:"Providers fetched successfully",data:await listUsers("provider",req.query)}));
export const getAllServices=asyncHandler(async(req,res)=>res.json({success:true,message:"Services fetched successfully",data:await listAllServices(req.query)}));
export const getAllBookings=asyncHandler(async(req,res)=>res.json({success:true,message:"Bookings fetched successfully",data:await listAllBookings(req.query)}));
export const updateUserStatus=asyncHandler(async(req,res)=>{
 if(!isValidObjectId(req.params.id)){res.status(400);throw new Error("Invalid user id");}
 const user=await setUserStatus(req.params.id,req.body.isActive);
 res.json({success:true,message:`User ${req.body.isActive?"activated":"deactivated"} successfully`,data:{user}});
});
export const updateServiceStatus=asyncHandler(async(req,res)=>{
 if(!isValidObjectId(req.params.id)){res.status(400);throw new Error("Invalid service id");}
 const service=await setServiceStatus(req.params.id,req.body.isActive);
 res.json({success:true,message:"Service status updated successfully",data:{service}});
});

export { deleteReviewAsAdmin };
