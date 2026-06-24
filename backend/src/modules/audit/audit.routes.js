import { Router } from 'express';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';
import * as auditController from './audit.controller.js';

const router = Router();

router.use(authenticate, branchScope);

router.get('/', authorize('admin', 'manager'), requirePermission('audit:view_logs'), auditController.getAuditLogs);

export default router;
