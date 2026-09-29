import rateLimit from "express-rate-limit";

// authLimiter caps how many register/login attempts a single IP can make.
// What: 20 requests per 15 minutes per IP on auth routes specifically
//       (not the whole API — browsing services shouldn't be rate-limited this tightly).
// Why: login/register are the most common brute-force/credential-stuffing targets.
// Where: applied to POST /api/auth/register and POST /api/auth/login only.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "development" ? 200 : 20,
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts from this IP, please try again after 15 minutes",
    errors: [],
  },
});


export default authLimiter;
