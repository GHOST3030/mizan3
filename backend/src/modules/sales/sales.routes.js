import { Router } from 'express';
import * as salesController from './sales.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';
import { ownership } from '../../middleware/ownership.js';
import { validate } from '../../middleware/validate.js';
import { holdSaleSchema } from './sales.validation.js';

const router = Router();

router.use(authenticate, branchScope);

router.get('/', requirePermission('sales:create'), salesController.getSales);
router.get('/payment-schedules/list', requirePermission('sales:edit'), salesController.getPaymentSchedules);
router.post('/payment-schedules/:id/pay', authorize('admin', 'manager', 'cashier'), requirePermission('sales:edit'), salesController.paySchedule);
router.post('/', authorize('admin', 'manager', 'cashier'), requirePermission('sales:create'), salesController.createSale);
router.get('/:id', ownership('sale'), requirePermission('sales:create'), salesController.getSaleById);
router.put('/:id/status', authorize('admin', 'manager'), requirePermission('sales:edit'), salesController.updateSaleStatus);
router.delete('/:id', authorize('admin'), requirePermission('sales:delete'), salesController.deleteSale);
router.post('/:id/return', authorize('admin', 'manager'), requirePermission('returns:create'), salesController.returnSale);
router.post('/:id/cancel', authorize('admin', 'manager', 'cashier'), requirePermission('sales:cancel'), ownership('sale'), salesController.cancelSale);
router.post('/:id/review-cancel', authorize('admin', 'manager'), requirePermission('sale:cancel:review'), salesController.reviewCancelSale);
router.post('/hold', authorize('admin', 'manager', 'cashier'), requirePermission('sales:hold'), validate(holdSaleSchema), salesController.holdSale);
router.get('/held/list', requirePermission('sales:hold'), salesController.getHeldSales);
router.post('/:id/resume', authorize('admin', 'manager', 'cashier'), requirePermission('sales:resume'), ownership('sale'), salesController.resumeSale);

export default router;
