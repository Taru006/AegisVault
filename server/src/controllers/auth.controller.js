import speakeasy from "speakeasy";
import User from "../models/User.model.js";
import { sendTokenResponse } from "../utils/token.js";

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (bcrypt hashing happens in the User model pre-save hook)
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Please provide name, email, and password");
    }

    if (password.length < 8) {
      res.status(400);
      throw new Error("Password must be at least 8 characters");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400);
      throw new Error("A user with that email already exists");
    }

    // Generate TOTP secret for MFA (not enabled yet — user must verify first)
    const secret = speakeasy.generateSecret({
      name: `AegisVault (${email})`,
      issuer: "AegisVault",
    });

    const user = await User.create({
      name,
      email,
      passwordHash: password, // pre-save hook will bcrypt-hash this
      role: role || "Viewer",
      mfaSecret: secret.base32,
      mfaEnabled: false,
    });

    // Return the TOTP provisioning URI so the client can render a QR code
    const userObj = user.toObject();
    delete userObj.passwordHash;

    res.status(201).json({
      success: true,
      user: userObj,
      mfa: {
        secret: secret.base32,
        otpAuthUrl: secret.otpauth_url,
      },
      message: "User registered. Scan the QR code with your authenticator app, then call POST /api/auth/verify-mfa to enable MFA.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return tokens (or request MFA if enabled)
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Please provide email and password");
    }

    const user = await User.findOne({ email }).select(
      "+passwordHash +mfaSecret"
    );
    if (!user || !(await user.comparePassword(password))) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    // If MFA is enabled, require a TOTP code before issuing tokens
    if (user.mfaEnabled) {
      return res.status(200).json({
        success: true,
        mfaRequired: true,
        message: "MFA is enabled. Please provide a TOTP code via POST /api/auth/verify-mfa.",
      });
    }

    // MFA not enabled — issue tokens directly
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/verify-mfa
 * @desc    Verify TOTP code and issue tokens (or enable MFA for the first time)
 * @access  Public (requires email + totp)
 */
export const verifyMfa = async (req, res, next) => {
  try {
    const { email, totp } = req.body;

    if (!email || !totp) {
      res.status(400);
      throw new Error("Please provide email and TOTP code");
    }

    const user = await User.findOne({ email }).select("+mfaSecret");
    if (!user) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    if (!user.mfaSecret) {
      res.status(400);
      throw new Error("MFA has not been set up for this account");
    }

    // Verify the TOTP token
    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: "base32",
      token: totp,
      window: 1, // allow 1 step tolerance (±30 s)
    });

    if (!isValid) {
      res.status(401);
      throw new Error("Invalid or expired TOTP code");
    }

    // If MFA wasn't enabled yet, enable it now (first-time verification)
    if (!user.mfaEnabled) {
      user.mfaEnabled = true;
      await user.save();
    }

    // Issue tokens
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Clear token cookies
 * @access  Private
 */
export const logout = (_req, res) => {
  const cookieOpts = { httpOnly: true, expires: new Date(0) };
  res
    .cookie("accessToken", "none", cookieOpts)
    .cookie("refreshToken", "none", cookieOpts)
    .json({ success: true, message: "Logged out" });
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
export const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};
