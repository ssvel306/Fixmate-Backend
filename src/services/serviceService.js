import Service from "../models/Service.js";
import Provider from "../models/Provider.js";
import getPagination, { buildPaginationMeta } from "../utils/pagination.js";

export const createService = async (providerId, data) => {
  const payload = { ...data, provider: providerId };
  payload.name = payload.name || payload.title;
  delete payload.title;
  if (!payload.duration) payload.duration = 60;
  return Service.create(payload);
};

export const listServices = async (query) => {
  const { search, category, minPrice, maxPrice, isAvailable, sortBy, sortOrder, order } = query;
  const { page, limit, skip } = getPagination({ query });
  const filter = { isActive: true };
  if (isAvailable !== undefined) {
    filter.isAvailable = isAvailable === "true" || isAvailable === true;
  }
  if (category) filter.category = new RegExp(`^${String(category).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
  }
  if (search) {
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: new RegExp(safe, "i") }, { description: new RegExp(safe, "i") }];
  }
  let sort = { createdAt: -1 };
  if (sortBy) {
    const direction = sortOrder === "asc" || order === "asc" ? 1 : -1;
    sort = { [sortBy]: direction };
  }
  const [services, total] = await Promise.all([
    Service.find(filter).populate("provider", "name email phone profileImage availability averageRating totalReviews")
      .sort(sort).skip(skip).limit(limit),
    Service.countDocuments(filter),
  ]);
  return { services, pagination: buildPaginationMeta(total, page, limit) };
};

export const getService = async (id) => Service.findOne({ _id: id, isActive: true })
  .populate("provider", "name email phone profileImage availability averageRating totalReviews");

export const updateOwnedService = async (id, providerId, patch) => {
  const service = await Service.findById(id);
  if (!service) throw Object.assign(new Error("Service not found"), { statusCode: 404 });
  if (service.provider.toString() !== providerId) throw Object.assign(new Error("You can only update your own services"), { statusCode: 403 });
  for (const key of ["name", "description", "category", "price", "duration", "images", "isAvailable", "isActive"])
    if (patch[key] !== undefined) service[key] = patch[key];
  if (patch.title !== undefined && patch.name === undefined) service.name = patch.title;
  return service.save();
};

export const deactivateOwnedService = async (id, providerId, role = "provider") => {
  const service = await Service.findById(id);
  if (!service) throw Object.assign(new Error("Service not found"), { statusCode: 404 });
  if (role !== "admin" && service.provider.toString() !== providerId) {
    throw Object.assign(new Error("You can only deactivate your own services"), { statusCode: 403 });
  }
  service.isActive = false;
  await service.save();
  return service;
};


export const listProviderServices = async (providerId, query) => {
  const {page,limit,skip}=getPagination({query});
  const filter={provider:providerId};
  const [services,total]=await Promise.all([
    Service.find(filter).sort({createdAt:-1}).skip(skip).limit(limit),
    Service.countDocuments(filter)
  ]);
  return {services,pagination:buildPaginationMeta(total,page,limit)};
};
