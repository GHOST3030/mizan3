import { Router } from 'express';
import * as reportsController from './reports.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';

const router = Router();

router.use(authenticate, branchScope);

router.get('/sales/summary', requirePermission('reporting:view_reports'), reportsController.getSalesSummary);
router.get('/sales/daily', requirePermission('reporting:view_reports'), reportsController.getDailySales);
router.get('/sales/by-product', requirePermission('reporting:view_reports'), reportsController.getSalesByProduct);
router.get('/sales/by-cashier', requirePermission('reporting:view_reports'), reportsController.getSalesByCashier);
router.get('/inventory/summary', requirePermission('reporting:view_reports'), reportsController.getInventorySummary);
router.get('/finance/summary', requirePermission('reporting:view_reports'), reportsController.getFinanceSummary);
router.get('/purchases/summary', requirePermission('reporting:view_reports'), reportsController.getPurchaseSummary);
router.get('/profit-loss', requirePermission('reporting:view_reports'), reportsController.getProfitLoss);
router.get('/customers/top', requirePermission('reporting:view_reports'), reportsController.getTopCustomers);
router.get('/inventory/valuation', requirePermission('reporting:view_reports'), reportsController.getInventoryValuation);
router.get('/inventory/movement', requirePermission('reporting:view_reports'), reportsController.getProductMovementReport);
router.get('/export', authorize('admin', 'manager', 'accountant'), requirePermission('reporting:export_reports'), reportsController.exportReport);
router.get('/dashboard', requirePermission('reporting:view_reports'), reportsController.getDashboard);

// New reports
router.get('/products/slow-moving', requirePermission('reporting:view_reports'), reportsController.getSlowMovingProducts);
router.get('/customers/detailed', requirePermission('reporting:view_reports'), reportsController.getCustomerReport);
router.get('/suppliers/detailed', requirePermission('reporting:view_reports'), reportsController.getSupplierReport);
router.get('/safe/detailed', requirePermission('reporting:view_reports'), reportsController.getSafeReport);
router.get('/expenses/detailed', requirePermission('reporting:view_reports'), reportsController.getExpenseReport);

export default router;
