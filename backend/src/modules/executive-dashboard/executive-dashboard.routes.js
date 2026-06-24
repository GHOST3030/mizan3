import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';
import * as controller from './executive-dashboard.controller.js';

const router = Router();

router.use(authenticate, branchScope);

router.get('/', requirePermission('dashboard:view_executive_dashboard'), controller.getFullDashboard);
router.get('/today', requirePermission('dashboard:view_executive_dashboard'), controller.getTodayCards);
router.get('/month', requirePermission('dashboard:view_executive_dashboard'), controller.getMonthCards);
router.get('/inventory', requirePermission('dashboard:view_inventory_value'), controller.getInventoryCards);
router.get('/finance', requirePermission('dashboard:view_financial_summary'), controller.getFinanceCards);
router.get('/top-products', requirePermission('dashboard:view_executive_dashboard'), controller.getTopProducts);
router.get('/top-customers', requirePermission('dashboard:view_executive_dashboard'), controller.getTopCustomers);
router.get('/top-suppliers', requirePermission('dashboard:view_executive_dashboard'), controller.getTopSuppliers);
router.get('/daily-sales-trend', requirePermission('dashboard:view_executive_dashboard'), controller.getDailySalesTrend);
router.get('/monthly-revenue-trend', requirePermission('dashboard:view_executive_dashboard'), controller.getMonthlyRevenueTrend);
router.get('/alerts', requirePermission('dashboard:view_executive_dashboard'), controller.getAlerts);

export default router;
