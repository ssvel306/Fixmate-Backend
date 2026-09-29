import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import {findAccountByIdAndRole} from "../services/authService.js";

export const protect=asyncHandler(async(req,res,next)=>{
  const header=req.headers.authorization;
  if(!header?.startsWith("Bearer ")){res.status(401);throw new Error("Not authorized, no token provided");}
  try{
    const decoded=jwt.verify(header.slice(7),process.env.JWT_SECRET);
    if(!["customer","provider","admin"].includes(decoded.role)){throw new Error("Invalid role");}
    const user=await findAccountByIdAndRole(decoded.id,decoded.role);
    if(!user||!user.isActive){res.status(401);throw new Error("Not authorized, user no longer exists or is inactive");}
    req.user={...user.toObject(),id:user._id.toString(),role:decoded.role};
    next();
  }catch(error){
    if(error.statusCode) throw error;
    res.status(401); throw new Error("Not authorized, invalid or expired token");
  }
});
