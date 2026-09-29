import Customer from "../models/Customer.js";
import Provider from "../models/Provider.js";
import Admin from "../models/Admin.js";

const models = { customer: Customer, provider: Provider, admin: Admin };

export const emailExists = async (email) => {
  const results = await Promise.all(Object.values(models).map((Model) => Model.exists({ email })));
  return results.some(Boolean);
};

export const registerAccount = async ({ role, name, email, password, phone }) => {
  const Model = models[role];
  if (!Model) throw Object.assign(new Error("Invalid registration role"), { statusCode: 400 });
  if (await emailExists(email)) throw Object.assign(new Error("Email already in use"), { statusCode: 409 });
  const data = { name, email, password };
  if (phone !== undefined && role !== "admin") data.phone = phone;
  return Model.create(data);
};

export const findAccountByEmail = async (email) => {
  for (const [role, Model] of Object.entries(models)) {
    const user = await Model.findOne({ email }).select("+password");
    if (user) return { user, role };
  }
  return null;
};

export const findAccountByIdAndRole = async (id, role) => {
  const Model = models[role];
  return Model ? Model.findById(id) : null;
};
