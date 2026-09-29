import asyncHandler from "../utils/asyncHandler.js";
import isValidObjectId from "../utils/isValidObjectId.js";
import {
  createService as create,
  listServices,
  getService,
  updateOwnedService,
  deactivateOwnedService,
  listProviderServices,
} from "../services/serviceService.js";

export const createService=asyncHandler(async(req,res)=>{
  const service=await create(req.user.id,req.body);
  res.status(201).json({success:true,message:"Service created successfully",data:{service}});
});
export const getServices=asyncHandler(async(req,res)=>{
  const data=await listServices(req.query);
  res.json({success:true,message:"Services fetched successfully",data});
});
export const getServiceById=asyncHandler(async(req,res)=>{
  if(!isValidObjectId(req.params.id)){res.status(400);throw new Error("Invalid service id");}
  const service=await getService(req.params.id);
  if(!service){res.status(404);throw new Error("Service not found");}
  res.json({success:true,message:"Service fetched successfully",data:{service}});
});
export const updateService=asyncHandler(async(req,res)=>{
  if(!isValidObjectId(req.params.id)){res.status(400);throw new Error("Invalid service id");}
  const service=await updateOwnedService(req.params.id,req.user.id,req.body);
  res.json({success:true,message:"Service updated successfully",data:{service}});
});
export const deleteService=asyncHandler(async(req,res)=>{
  if(!isValidObjectId(req.params.id)){res.status(400);throw new Error("Invalid service id");}
  const service=await deactivateOwnedService(req.params.id,req.user.id,req.user.role);
  res.json({success:true,message:"Service deactivated successfully",data:{service}});
});


export const getMyServices=asyncHandler(async(req,res)=>{
 const data=await listProviderServices(req.user.id,req.query);
 res.json({success:true,message:"Provider services fetched successfully",data});
});
