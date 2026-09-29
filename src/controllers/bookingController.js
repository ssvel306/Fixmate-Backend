import asyncHandler from "../utils/asyncHandler.js";
import isValidObjectId from "../utils/isValidObjectId.js";
import {createBooking as create,listBookings,getBookingForUser,advanceBooking,cancelBooking as cancel} from "../services/bookingService.js";

export const createBooking=asyncHandler(async(req,res)=>{
  const booking=await create({customerId:req.user.id,...req.body});
  res.status(201).json({success:true,message:"Booking created successfully",data:{booking}});
});
export const getBookings=asyncHandler(async(req,res)=>{
  const data=await listBookings(req.user,req.query);
  res.json({success:true,message:"Bookings fetched successfully",data});
});
export const getBookingById=asyncHandler(async(req,res)=>{
  if(!isValidObjectId(req.params.id)){res.status(400);throw new Error("Invalid booking id");}
  const booking=await getBookingForUser(req.params.id,req.user);
  res.json({success:true,message:"Booking fetched successfully",data:{booking}});
});
export const updateBookingStatus=asyncHandler(async(req,res)=>{
  const booking=await advanceBooking(req.params.id,req.user.id,req.body.status);
  res.json({success:true,message:`Booking status updated to ${booking.status}`,data:{booking}});
});
export const cancelBooking=asyncHandler(async(req,res)=>{
  if(!isValidObjectId(req.params.id)){res.status(400);throw new Error("Invalid booking id");}
  const booking=await cancel(req.params.id,req.user.id,req.body.reason||"");
  res.json({success:true,message:"Booking cancelled successfully",data:{booking}});
});
