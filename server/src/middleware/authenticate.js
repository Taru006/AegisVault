import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

/**
 * authenticate middleware — validates the JWT access token from the
 * Authorization header or cookie, then attaches the user to `req.user`.
 */
const authenticate = async (req, res, next) => {
  let token;

  // 1. Check Authorization: Bearer <token>
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // 2. Fallback to cookie
  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized — no token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Token expired — please refresh"
        : "Not authorized — token invalid";

    return res.status(401).json({ success: false, message });
  }
};

export default authenticate;
