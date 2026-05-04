import { Router } from "express";
import {
  register,
  login,
  verifyMfa,
  logout,
  getMe,
} from "../controllers/auth.controller.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-mfa", verifyMfa);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);

export default router;
