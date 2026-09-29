import Provider from "../models/Provider.js";

export const updateProviderAvailability = async (id, patch) => {
  const provider = await Provider.findById(id);
  if (!provider) throw Object.assign(new Error("Provider not found"), { statusCode: 404 });
  for (const key of ["isAvailable","workingDays","startTime","endTime"]) {
    if (patch[key] !== undefined) provider.availability[key] = patch[key];
  }
  if (provider.availability.startTime >= provider.availability.endTime)
    throw Object.assign(new Error("startTime must be earlier than endTime"), { statusCode: 400 });
  await provider.save();
  return provider.availability;
};

export const updateProviderProfile = async (id, patch) => {
  const provider = await Provider.findById(id);
  if (!provider) throw Object.assign(new Error("Provider not found"), { statusCode: 404 });
  for (const key of ["name","phone","profileImage"]) if (patch[key] !== undefined) provider[key] = patch[key];
  await provider.save();
  return provider;
};
