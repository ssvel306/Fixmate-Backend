import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";

export const createReview = async ({customerId, bookingId, rating, comment}) => {
  const booking=await Booking.findById(bookingId);
  if(!booking) throw Object.assign(new Error("Booking not found"),{statusCode:404});
  if(booking.customer.toString()!==customerId) throw Object.assign(new Error("You can only review your own booking"),{statusCode:403});
  if(booking.status!=="COMPLETED") throw Object.assign(new Error("Only completed bookings can be reviewed"),{statusCode:400});
  if(await Review.exists({booking:bookingId})) throw Object.assign(new Error("This booking has already been reviewed"),{statusCode:409});
  const review=await Review.create({customer:customerId,provider:booking.provider,booking:bookingId,rating,comment:comment||""});
  const stats=await Review.aggregate([{ $match:{provider:booking.provider} },{ $group:{_id:null,averageRating:{$avg:"$rating"},totalReviews:{$sum:1}}}]);
  const stat=stats[0]||{averageRating:0,totalReviews:0};
  await Provider.findByIdAndUpdate(booking.provider,{averageRating:Math.round(stat.averageRating*10)/10,totalReviews:stat.totalReviews});
  return review;
};

export const listProviderReviews = async (providerId) => {
  const provider=await Provider.findOne({_id:providerId,isActive:true});
  if(!provider) throw Object.assign(new Error("Provider not found"),{statusCode:404});
  return Review.find({provider:providerId}).populate("customer","name profileImage").sort({createdAt:-1});
};

export const deleteReview = async (id) => {
  const review=await Review.findById(id);
  if(!review) throw Object.assign(new Error("Review not found"),{statusCode:404});
  const providerId=review.provider;
  await review.deleteOne();
  const stats=await Review.aggregate([{ $match:{provider:providerId} },{ $group:{_id:null,averageRating:{$avg:"$rating"},totalReviews:{$sum:1}}}]);
  const stat=stats[0]||{averageRating:0,totalReviews:0};
  await Provider.findByIdAndUpdate(providerId,{averageRating:Math.round(stat.averageRating*10)/10,totalReviews:stat.totalReviews});
};
