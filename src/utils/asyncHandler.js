// asyncHandler wraps an async controller function so that any error it
// throws (or rejects with) is automatically passed to next(error) instead
// of crashing the server or requiring a try/catch in every single controller.
//
// WHAT: a higher-order function — takes a controller function, returns a
//       new function that Express can use as a route handler.
// WHY: without this, every async controller needs its own try/catch block
//      to forward errors to Express's error handling. That's a lot of
//      duplicate code. This wrapper does it once, in one place.
// WHERE: wrap every async controller function with it, e.g.
//        export const login = asyncHandler(async (req, res) => { ... });
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
