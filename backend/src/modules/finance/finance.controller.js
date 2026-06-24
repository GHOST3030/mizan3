import { z } from 'zod';
import * as financeService from './finance.service.js';
import {
  openShiftSchema, closeShiftSchema, searchShiftSchema,
  createCashRegisterSchema, updateCashRegisterSchema,
  createExpenseCategorySchema, createExpenseSchema, searchExpenseSchema, updateExpenseCategorySchema,
  updateExpenseSchema,
  currencyExchangeSchema,
} from './finance.validation.js';
import { sanitizeResponse } from '../../services/fieldSecurity.service.js';

// ─── Shifts ──────────────────────────────────────────

export const getShifts = async (req, res, next) => {
  try {
    const query = searchShiftSchema.parse(req.query);
    if (req.user.role === 'cashier') {
      query.user_id = req.user.userId;
    }
    const result = await financeService.getShifts(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'finance', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getShiftById = async (req, res, next) => {
  try {
    const shift = await financeService.getShiftById(req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'الوردية غير موجودة' });
    const sanitized = await sanitizeResponse(req.user.userId, 'finance', shift);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const openShift = async (req, res, next) => {
  try {
    const data = openShiftSchema.parse(req.body);
    const shift = await financeService.openShift(data);
    res.status(201).json(shift);
  } catch (err) { next(err); }
};

export const closeShift = async (req, res, next) => {
  try {
    const data = closeShiftSchema.parse({ ...req.body, user_id: req.user.userId });
    const shift = await financeService.closeShift(req.params.id, data);
    res.json(shift);
  } catch (err) { next(err); }
};

export const approveShift = async (req, res, next) => {
  try {
    const shift = await financeService.approveShift(req.params.id, req.user.userId);
    res.json({ message: 'تم اعتماد الوردية', shift });
  } catch (err) { next(err); }
};

// ─── Cash Registers ──────────────────────────────────

export const getCashRegisters = async (req, res, next) => {
  try {
    const registers = await financeService.getCashRegisters(req.query.branch_id);
    const sanitized = await sanitizeResponse(req.user.userId, 'finance', registers);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const createCashRegister = async (req, res, next) => {
  try {
    const data = createCashRegisterSchema.parse({ ...req.body, created_by: req.user.userId });
    const register = await financeService.createCashRegister(data);
    res.status(201).json(register);
  } catch (err) { next(err); }
};

export const updateCashRegister = async (req, res, next) => {
  try {
    const data = updateCashRegisterSchema.parse({ ...req.body, updated_by: req.user.userId });
    const register = await financeService.updateCashRegister(req.params.id, data);
    res.json(register);
  } catch (err) { next(err); }
};

export const deleteCashRegister = async (req, res, next) => {
  try {
    await financeService.deleteCashRegister(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف الصندوق' });
  } catch (err) { next(err); }
};

// ─── Expenses ────────────────────────────────────────

export const getExpenses = async (req, res, next) => {
  try {
    const query = searchExpenseSchema.parse(req.query);
    if (!['admin', 'manager'].includes(req.user.role)) {
      query.user_id = req.user.userId;
    }
    const result = await financeService.getExpenses(query);
    res.json(result);
  } catch (err) { next(err); }
};

export const createExpense = async (req, res, next) => {
  try {
    const data = createExpenseSchema.parse(req.body);
    const expense = await financeService.createExpense(data);
    res.status(201).json(expense);
  } catch (err) { next(err); }
};

export const updateExpense = async (req, res, next) => {
  try {
    const data = updateExpenseSchema.parse(req.body);
    const expense = await financeService.updateExpense(req.params.id, req.user.userId, req.user.role, data);
    res.json({ message: 'تم تعديل المصروف', expense });
  } catch (err) { next(err); }
};

export const deleteExpense = async (req, res, next) => {
  try {
    await financeService.deleteExpense(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف المصروف' });
  } catch (err) { next(err); }
};

// ─── Expense Categories ─────────────────────────────

export const getExpenseCategories = async (req, res, next) => {
  try {
    const result = await financeService.getExpenseCategories(req.query.branch_id);
    res.json(result);
  } catch (err) { next(err); }
};

export const createExpenseCategory = async (req, res, next) => {
  try {
    const data = createExpenseCategorySchema.parse({ ...req.body });
    const result = await financeService.createExpenseCategory(data, req.user.userId);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

export const updateExpenseCategory = async (req, res, next) => {
  try {
    const data = updateExpenseCategorySchema.parse({ ...req.body });
    const result = await financeService.updateExpenseCategory(req.params.id, data, req.user.userId);
    res.json(result);
  } catch (err) { next(err); }
};

export const deleteExpenseCategory = async (req, res, next) => {
  try {
    await financeService.deleteExpenseCategory(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف التصنيف' });
  } catch (err) { next(err); }
};

// ─── Expense Approve/Reject ──────────────────────────

export const approveExpense = async (req, res, next) => {
  try {
    const expense = await financeService.approveExpense(req.params.id, req.user.userId);
    res.json({ message: 'تم اعتماد المصروف', expense });
  } catch (err) { next(err); }
};

export const rejectExpense = async (req, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
    const expense = await financeService.rejectExpense(req.params.id, req.user.userId, reason);
    res.json({ message: 'تم رفض المصروف', expense });
  } catch (err) { next(err); }
};

// ─── Expense Detail ─────────────────────────────────

export const getExpenseById = async (req, res, next) => {
  try {
    const expense = await financeService.getExpenseById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'المصروف غير موجود' });
    res.json(expense);
  } catch (err) { next(err); }
};

// ─── Currency Exchange ────────────────────────────────

export const getCurrencyExchanges = async (req, res, next) => {
  try {
    const branch_id = req.query.branch_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await financeService.getCurrencyExchanges(branch_id, page, limit);
    res.json(result);
  } catch (err) { next(err); }
};

export const currencyExchange = async (req, res, next) => {
  try {
    const data = currencyExchangeSchema.parse({ ...req.body, created_by: req.user.userId });
    const result = await financeService.currencyExchange(data);
    res.json({ message: 'تم تحويل العملة', result });
  } catch (err) { next(err); }
};
