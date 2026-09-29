import {body} from "express-validator";
import {VALID_DAYS,isValidTime} from "../utils/availabilityValidators.js";
export const updateAvailabilityValidator=[
 body("isAvailable").optional().isBoolean(),
 body("workingDays").optional().isArray().custom(days=>{if(days.some(d=>!VALID_DAYS.includes(d)))throw new Error(`workingDays must only contain: ${VALID_DAYS.join(", ")}`);return true;}),
 body("startTime").optional().custom(v=>{if(!isValidTime(v))throw new Error("startTime must be in HH:mm 24-hour format");return true;}),
 body("endTime").optional().custom(v=>{if(!isValidTime(v))throw new Error("endTime must be in HH:mm 24-hour format");return true;})
];
export const updateProviderProfileValidator=[
 body("name").optional().trim().isLength({min:2}),
 body("phone").optional().trim(),
 body("profileImage").optional().isString()
];
