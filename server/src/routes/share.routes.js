import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createShareLink,
  accessShareLink,
  revokeShareLink,
} from "../controllers/share.controller.js";

const router = express.Router();

router.post("/", protect, createShareLink);
router.get("/:token", accessShareLink); // Public access
router.delete("/:token", protect, revokeShareLink);

export default router;
