/**
 * authorize middleware — accepts an array of allowed roles and blocks
 * any user whose role is not in the list.
 *
 * Usage:  router.get("/admin", authenticate, authorize(["Admin"]), handler);
 *
 * @param {string[]} allowedRoles - e.g. ["Admin", "Manager"]
 * @returns {Function} Express middleware
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }

    next();
  };
};

export default authorize;
