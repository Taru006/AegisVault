import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

// ─────────────────────────────────────────────────────────────
// DEPRECATED — kept for backward compatibility.
// Prefer importing authenticate.js and authorize.js instead.
// ─────────────────────────────────────────────────────────────

export { default as authenticate } from "./authenticate.js";
export { default as authorize } from "./authorize.js";

/**
 * @deprecated Use authenticate.js instead
 */
export const protect = async (req, res, next) => {
  const { default: authenticate } = await import("./authenticate.js");
  return authenticate(req, res, next);
};
