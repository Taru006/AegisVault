import { Router } from 'express';
import { getAuditLog } from '../controllers/audit.controller.js';

const router = Router();

router.get('/:fileId', getAuditLog);

export default router;
