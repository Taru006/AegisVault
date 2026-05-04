import jwt from "jsonwebtoken";

/**
 * Generate a signed JWT for a user.
 */
export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * Generate token and send it as an HTTP-only cookie + JSON response.
 */
export const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:
      (parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 7) *
      24 *
      60 *
      60 *
      1000,
  };

  // Remove password from output
  const userObj = user.toObject();
  delete userObj.password;

  res.status(statusCode).cookie("token", token, cookieOptions).json({
    success: true,
    token,
    user: userObj,
  });
};
