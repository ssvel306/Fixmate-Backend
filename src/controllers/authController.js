import asyncHandler from "../utils/asyncHandler.js";
import generateToken from "../utils/generateToken.js";
import { registerAccount, findAccountByEmail, findAccountByIdAndRole } from "../services/authService.js";

export const register = asyncHandler(async (req,res) => {
  const role = req.body.role || "customer";
  const user = await registerAccount({ role, ...req.body });
  const token = generateToken(user._id, role);
  res.status(201).json({success:true,message:`${role} registered successfully`,data:{token,user}});
});

export const registerCustomer = asyncHandler(async(req,res)=>{
  const user=await registerAccount({role:"customer",...req.body});
  res.status(201).json({success:true,message:"Customer registered successfully",data:{token:generateToken(user._id,"customer"),user}});
});
export const registerProvider = asyncHandler(async(req,res)=>{
  const user=await registerAccount({role:"provider",...req.body});
  res.status(201).json({success:true,message:"Provider registered successfully",data:{token:generateToken(user._id,"provider"),user}});
});
export const registerAdmin = asyncHandler(async(req,res)=>{
  if (!process.env.ADMIN_REGISTRATION_KEY || req.headers["x-admin-registration-key"] !== process.env.ADMIN_REGISTRATION_KEY) {
    res.status(403); throw new Error("Admin registration is restricted");
  }
  const user=await registerAccount({role:"admin",...req.body});
  res.status(201).json({success:true,message:"Admin registered successfully",data:{token:generateToken(user._id,"admin"),user}});
});

export const login = asyncHandler(async(req,res)=>{
  const found=await findAccountByEmail(req.body.email);
  if(!found || !(await found.user.comparePassword(req.body.password))){res.status(401);throw new Error("Invalid email or password");}
  if(!found.user.isActive){res.status(403);throw new Error("This account has been deactivated");}
  res.json({success:true,message:"Login successful",data:{token:generateToken(found.user._id,found.role),user:found.user}});
});

export const getMe=asyncHandler(async(req,res)=>{
  const user=await findAccountByIdAndRole(req.user.id,req.user.role);
  if(!user){res.status(404);throw new Error("User not found");}
  res.json({success:true,message:"User profile fetched",data:{user}});
});
