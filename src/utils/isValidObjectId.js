import mongoose from "mongoose";

// isValidObjectId() checks a string looks like a real MongoDB ObjectId.
// What: a guard we run before querying by :id.
// Why: passing a bad id straight to Mongoose throws a raw CastError —
//      checking first lets us return a clean 400 instead.
// Where: used in controllers wherever a route takes an :id param.
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export default isValidObjectId;
