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
