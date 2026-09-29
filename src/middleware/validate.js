import { validationResult } from "express-validator";

// validate() runs after a chain of express-validator rules (e.g. body("email").isEmail())
// and turns any failures into our standard error response shape.
//
// What: middleware that checks for validation errors collected by the rules before it.
// Why: keeps every route's error format consistent — { success:false, message, errors:[] } —
//      instead of each controller reinventing its own 400 response.
// Where: placed after a validator array on any route, e.g.
//        router.post("/", registerValidator, validate, register);
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  next();
};

export default validate;
