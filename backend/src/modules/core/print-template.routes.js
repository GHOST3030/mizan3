import { Router } from 'express';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';
import * as tplCtrl from './print-template.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate, branchScope);

router.get('/', requirePermission('template:manage'), tplCtrl.getPrintTemplates);
router.get('/default', requirePermission('template:manage'), tplCtrl.getDefaultTemplate);
router.get('/:id', requirePermission('template:manage'), tplCtrl.getPrintTemplateById);
router.post('/', authorize('admin', 'manager'), requirePermission('template:manage'), tplCtrl.createPrintTemplate);
router.put('/:id', authorize('admin', 'manager'), requirePermission('template:manage'), tplCtrl.updatePrintTemplate);
router.delete('/:id', authorize('admin', 'manager'), requirePermission('template:manage'), tplCtrl.deletePrintTemplate);

export default router;
