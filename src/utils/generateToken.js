import jwt from "jsonwebtoken";

// generateToken() creates a signed JWT containing the user's id and role.
// WHAT: a JWT is a signed string the client stores and sends back on every
//       request (in the Authorization header) to prove who they are.
// WHY: it lets the server verify identity without storing session data.
// WHERE: called right after a successful register/login.
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export default generateToken;
