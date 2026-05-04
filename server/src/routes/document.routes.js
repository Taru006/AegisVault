import { Router } from "express";
import {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
} from "../controllers/document.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);

router.route("/").get(getDocuments).post(uploadDocument);
router.route("/:id").get(getDocument).delete(deleteDocument);

export default router;
