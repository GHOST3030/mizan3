import { Router } from 'express';
import * as financeController from './finance.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';
import { ownership } from '../../middleware/ownership.js';

const router = Router();

router.use(authenticate, branchScope);

// Shifts
router.get('/shifts', requirePermission('shift:open'), financeController.getShifts);
router.get('/shifts/:id', ownership('shift'), requirePermission('shift:open'), financeController.getShiftById);
router.post('/shifts/open', authorize('admin', 'manager', 'cashier'), requirePermission('shift:open'), financeController.openShift);
router.put('/shifts/:id/close', authorize('admin', 'manager', 'cashier'), requirePermission('shift:close'), ownership('shift'), financeController.closeShift);
router.post('/shifts/:id/approve', authorize('admin', 'manager'), requirePermission('shift:approve'), financeController.approveShift);

// Cash Registers
router.get('/cash-registers', requirePermission('cash_register:manage'), financeController.getCashRegisters);
router.post('/cash-registers', authorize('admin', 'manager'), requirePermission('cash_register:manage'), financeController.createCashRegister);
router.put('/cash-registers/:id', authorize('admin', 'manager'), requirePermission('cash_register:manage'), financeController.updateCashRegister);
router.delete('/cash-registers/:id', authorize('admin'), requirePermission('cash_register:manage'), financeController.deleteCashRegister);

// Expense Categories
router.get('/expense-categories', requirePermission('expense:view'), financeController.getExpenseCategories);
router.post('/expense-categories', authorize('admin', 'manager'), requirePermission('expense:category:manage'), financeController.createExpenseCategory);
router.put('/expense-categories/:id', authorize('admin', 'manager'), requirePermission('expense:category:manage'), financeController.updateExpenseCategory);
router.delete('/expense-categories/:id', authorize('admin'), requirePermission('expense:category:manage'), financeController.deleteExpenseCategory);

// Expenses
router.get('/expenses', requirePermission('expense:view'), financeController.getExpenses);
router.get('/expenses/:id', ownership('expense'), requirePermission('expense:view'), financeController.getExpenseById);
router.post('/expenses', authorize('admin', 'manager', 'accountant'), requirePermission('expense:create'), financeController.createExpense);
router.put('/expenses/:id', authorize('admin', 'manager', 'accountant'), requirePermission('expense:edit'), ownership('expense'), financeController.updateExpense);
router.put('/expenses/:id/approve', authorize('admin', 'manager'), requirePermission('expense:approve'), financeController.approveExpense);
router.put('/expenses/:id/reject', authorize('admin', 'manager'), requirePermission('expense:approve'), financeController.rejectExpense);
router.delete('/expenses/:id', authorize('admin'), requirePermission('expense:delete'), financeController.deleteExpense);

// Currency Exchange
router.get('/currency-exchange', requirePermission('currency:exchange'), financeController.getCurrencyExchanges);
router.post('/currency-exchange', authorize('admin', 'manager'), requirePermission('currency:exchange'), financeController.currencyExchange);

export default router;
