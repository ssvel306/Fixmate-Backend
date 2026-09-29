import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import Provider from "../models/Provider.js";
import getPagination, { buildPaginationMeta } from "../utils/pagination.js";
import { isValidStatusTransition, canCancel } from "../utils/bookingStatus.js";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const toMinutes = (t) => Number(t.slice(0,2))*60 + Number(t.slice(3));
const dateOnly = (d) => new Date(`${d}T00:00:00.000Z`);

export const createBooking = async ({ customerId, serviceId, service: serviceParam, bookingDate, bookingTime, address, notes }) => {
  const sId = serviceId || serviceParam;
  const service = await Service.findOne({ _id: sId, isActive: true, isAvailable: true });
  if (!service) throw Object.assign(new Error("Service is not available"), { statusCode: 404 });
  const provider = await Provider.findOne({ _id: service.provider, isActive: true });
  if (!provider) throw Object.assign(new Error("Provider is not available"), { statusCode: 404 });

  const dateStr = String(bookingDate).slice(0, 10);
  const date = dateOnly(dateStr);
  if (Number.isNaN(date.getTime())) throw Object.assign(new Error("Invalid booking date"), { statusCode: 400 });
  if (date < dateOnly(new Date().toISOString().slice(0, 10)))
    throw Object.assign(new Error("Booking date cannot be in the past"), { statusCode: 400 });

  const day = DAYS[date.getUTCDay()];
  const av = provider.availability;
  if (!av.isAvailable || !av.workingDays.includes(day))
    throw Object.assign(new Error("Provider is not available on the selected day"), { statusCode: 400 });

  const start = toMinutes(bookingTime);
  const providerStart = toMinutes(av.startTime), providerEnd = toMinutes(av.endTime);
  const duration = service.duration || 60;
  const end = start + duration;
  if (start < providerStart || end > providerEnd)
    throw Object.assign(new Error("Selected time is outside the provider availability window"), { statusCode: 400 });

  const activeStatuses = ["PENDING", "ACCEPTED", "IN_PROGRESS"];
  const sameDay = { $gte: date, $lt: new Date(date.getTime() + 86400000) };
  const existing = await Booking.find({ provider: provider._id, bookingDate: sameDay, status: { $in: activeStatuses } }).populate("service", "duration");
  const conflict = existing.some(b => {
    const bStart = toMinutes(b.bookingTime);
    const bEnd = bStart + (b.service?.duration || 60);
    return start < bEnd && end > bStart;
  });
  if (conflict) throw Object.assign(new Error("Selected time slot is already booked"), { statusCode: 409 });

  const booking = await Booking.create({
    customer: customerId, provider: provider._id, service: service._id,
    bookingDate: date, bookingTime, address, notes: notes || "", price: service.price
  });
  return booking.populate([
    { path: "service", select: "name title description category price duration images" },
    { path: "provider", select: "name email phone profileImage availability averageRating totalReviews" },
  ]);
};


export const listBookings = async (user, query) => {
  const filter = {};
  if (user.role === "customer") filter.customer = user.id;
  if (user.role === "provider") filter.provider = user.id;
  if (query.status) filter.status = query.status;
  const {page,limit,skip}=getPagination({query});
  const [bookings,total]=await Promise.all([
    Booking.find(filter).populate("service","title category price duration")
      .populate("customer","name email phone").populate("provider","name email phone profileImage")
      .sort({createdAt:-1}).skip(skip).limit(limit),
    Booking.countDocuments(filter)
  ]);
  return {bookings,pagination:buildPaginationMeta(total,page,limit)};
};

export const getBookingForUser = async (id,user) => {
  const booking = await Booking.findById(id)
    .populate("service","title category price duration")
    .populate("customer","name email phone")
    .populate("provider","name email phone profileImage");
  if (!booking) throw Object.assign(new Error("Booking not found"),{statusCode:404});
  const allowed = user.role==="admin" ||
    (user.role==="customer" && booking.customer._id.toString()===user.id) ||
    (user.role==="provider" && booking.provider._id.toString()===user.id);
  if (!allowed) throw Object.assign(new Error("You do not have permission to view this booking"),{statusCode:403});
  return booking;
};

export const advanceBooking = async (id, providerId, nextStatus) => {
  const booking=await Booking.findById(id);
  if(!booking) throw Object.assign(new Error("Booking not found"),{statusCode:404});
  if(booking.provider.toString()!==providerId) throw Object.assign(new Error("You can only update bookings assigned to you"),{statusCode:403});
  if(!isValidStatusTransition(booking.status,nextStatus)) throw Object.assign(new Error(`Cannot change status from ${booking.status} to ${nextStatus}`),{statusCode:400});
  booking.status=nextStatus; await booking.save(); return booking;
};

export const cancelBooking = async (id, customerId, reason="") => {
  const booking=await Booking.findById(id);
  if(!booking) throw Object.assign(new Error("Booking not found"),{statusCode:404});
  if(booking.customer.toString()!==customerId) throw Object.assign(new Error("You can only cancel your own bookings"),{statusCode:403});
  if(!canCancel(booking.status)) throw Object.assign(new Error(`Booking with status ${booking.status} can no longer be cancelled`),{statusCode:400});
  booking.status="CANCELLED"; booking.cancellationReason=reason; await booking.save(); return booking;
};
