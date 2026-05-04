import { Router } from "express";
import {
  getProfile,
  updateProfile,
  getUsers,
} from "../controllers/user.controller.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.route("/profile").get(getProfile).put(updateProfile);
router.get("/", getUsers);

export default router;
