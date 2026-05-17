import User from "../models/User.model.js";

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
export const getProfile = async (req, res) => {
  res.json({ success: true, user: req.user });
};

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true, runValidators: true }
    );

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users
 * @desc    Get all users (for document sharing)
 * @access  Private
 */
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select(
      "name email publicKey"
    );
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};
/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
export const updateUserRole = async (req, res, next) => {
  try {
    if (req.user.role !== "Admin") {
      res.status(403);
      throw new Error("Access denied: Admin only");
    }

    const { role } = req.body;
    if (!["Admin", "Manager", "Viewer"].includes(role)) {
      res.status(400);
      throw new Error("Invalid role");
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-passwordHash -mfaSecret");

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
export const deleteUser = async (req, res, next) => {
  try {
    if (req.user.role !== "Admin") {
      res.status(403);
      throw new Error("Access denied: Admin only");
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // Don't allow deleting self
    if (user._id.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error("Cannot delete your own account");
    }

    await user.deleteOne();
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    next(error);
  }
};
