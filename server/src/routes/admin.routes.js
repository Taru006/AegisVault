import { Router } from "express";
import { getAnalytics } from "../controllers/admin.controller.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.get("/analytics", getAnalytics);

export default router;
