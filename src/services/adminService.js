import Customer from "../models/Customer.js";
import Provider from "../models/Provider.js";
import Admin from "../models/Admin.js";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";
import getPagination,{buildPaginationMeta} from "../utils/pagination.js";

const modelForRole=(role)=>({customer:Customer,provider:Provider,admin:Admin}[role]);

export const listUsers = async (role, query) => {
  const Model = modelForRole(role);
  const { page, limit, skip } = getPagination({ query });
  const filter = {};
  const [users, total] = await Promise.all([
    Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Model.countDocuments(filter),
  ]);
  return { users, pagination: buildPaginationMeta(total, page, limit) };
};

export const listAllUsers = async (query = {}) => {
  const role = query?.role;
  if (role === "customer" || role === "provider") return listUsers(role, query);

  const { page, limit, skip } = getPagination({ query });
  const [customers, providers, cCount, pCount] = await Promise.all([
    Customer.find({}).sort({ createdAt: -1 }),
    Provider.find({}).sort({ createdAt: -1 }),
    Customer.countDocuments({}),
    Provider.countDocuments({}),
  ]);
  const all = [
    ...customers.map((c) => ({ ...c.toObject(), role: "customer" })),
    ...providers.map((p) => ({ ...p.toObject(), role: "provider" })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = cCount + pCount;
  const users = all.slice(skip, skip + limit);
  return { users, pagination: buildPaginationMeta(total, page, limit) };
};

export const listAllServices=async(query)=>{
 const {page,limit,skip}=getPagination({query});
 const [services,total]=await Promise.all([Service.find({}).populate("provider","name email phone").sort({createdAt:-1}).skip(skip).limit(limit),Service.countDocuments({})]);
 return {services,pagination:buildPaginationMeta(total,page,limit)};
};
export const listAllBookings=async(query)=>{
 const {page,limit,skip}=getPagination({query}); const filter={}; if(query.status)filter.status=query.status;
 const [bookings,total]=await Promise.all([Booking.find(filter).populate("service","title category price").populate("customer","name email").populate("provider","name email").sort({createdAt:-1}).skip(skip).limit(limit),Booking.countDocuments(filter)]);
 return {bookings,pagination:buildPaginationMeta(total,page,limit)};
};
export const setUserStatus=async(id,isActive)=>{
 let user=null, role=null;
 for (const [r,Model] of Object.entries({customer:Customer,provider:Provider})) {
   user=await Model.findById(id);
   if(user){ role=r; break; }
 }
 if(!user)throw Object.assign(new Error("User not found"),{statusCode:404});
 user.isActive=isActive; await user.save(); return user;
};
export const setServiceStatus=async(id,isActive)=>{
 const service=await Service.findById(id);
 if(!service)throw Object.assign(new Error("Service not found"),{statusCode:404});
 service.isActive=isActive; await service.save(); return service;
};
