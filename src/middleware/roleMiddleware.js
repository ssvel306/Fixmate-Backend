// authorize() restricts a route to specific roles.
// What: middleware factory — authorize("admin") returns a middleware function.
// Why: some routes must be limited to customer/provider/admin only.
// Where: used after `protect` (which sets req.user), e.g.
//        router.get("/admin/users", protect, authorize("admin"), getUsers);
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authorized, no user found on request");
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Role '${req.user.role}' is not allowed to access this resource`);
    }

    next();
  };
};
