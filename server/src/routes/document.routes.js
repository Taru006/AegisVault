import { Router } from "express";
import {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
} from "../controllers/document.controller.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.route("/").get(getDocuments).post(uploadDocument);
router.route("/:id").get(getDocument).delete(deleteDocument);

export default router;
