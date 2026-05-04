import jwt from "jsonwebtoken";

/**
 * Generate a short-lived access token (15 minutes).
 * @param {string} userId
 * @returns {string}
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
};

/**
 * Generate a long-lived refresh token (7 days).
 * @param {string} userId
 * @returns {string}
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

/**
 * Generate both tokens and send as HTTP-only cookies + JSON response.
 * @param {object} user  Mongoose user document
 * @param {number} statusCode  HTTP status code
 * @param {object} res  Express response
 */
export const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  const commonCookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  // Remove sensitive fields from output
  const userObj = user.toObject();
  delete userObj.passwordHash;
  delete userObj.mfaSecret;

  res
    .status(statusCode)
    .cookie("accessToken", accessToken, {
      ...commonCookieOpts,
      maxAge: 15 * 60 * 1000, // 15 minutes
    })
    .cookie("refreshToken", refreshToken, {
      ...commonCookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    .json({
      success: true,
      accessToken,
      refreshToken,
      user: userObj,
    });
};
