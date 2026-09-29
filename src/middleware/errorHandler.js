const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || "Server error";
  let errors = [];

  if (err.code === 11000) {
    statusCode = 409;
    message = `${Object.keys(err.keyValue || {})[0] || "Field"} already in use`;
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
    errors = Object.keys(err.errors).map((key) => ({ field: key, message: err.errors[key].message }));
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Malformed JSON in request body";
  }

  if (Array.isArray(err.errors) && errors.length === 0) {
    errors = err.errors;
  }

  res.status(statusCode).json({ success: false, message, errors });
};

export default errorHandler;

