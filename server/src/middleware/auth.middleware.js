import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

/**
 * Protect routes — verify JWT from cookie or Authorization header.
 */
export const protect = async (req, res, next) => {
  let token;

  // Check Authorization header
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Fallback to cookie
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized — no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "User no longer exists" });
    }

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized — token invalid" });
  }
};

/**
 * Restrict access to specific roles.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized`,
      });
    }
    next();
  };
};
