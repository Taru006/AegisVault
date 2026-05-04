import { Router } from "express";
import {
  getProfile,
  updateProfile,
  getUsers,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);

router.route("/profile").get(getProfile).put(updateProfile);
router.get("/", getUsers);

export default router;
