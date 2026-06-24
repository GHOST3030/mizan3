import { z } from 'zod';
import * as reportsService from './reports.service.js';
import { reportQuerySchema } from './reports.validation.js';
import { sanitizeResponse } from '../../services/fieldSecurity.service.js';
import { getUserPermissions } from '../../services/permission.service.js';

export const getSalesSummary = async (req, res, next) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const result = await reportsService.getSalesSummary(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getDailySales = async (req, res, next) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const result = await reportsService.getDailySales(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getInventorySummary = async (req, res, next) => {
  try {
    const result = await reportsService.getInventorySummary(req.query.branch_id);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getFinanceSummary = async (req, res, next) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const result = await reportsService.getFinanceSummary(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getDashboard = async (req, res, next) => {
  try {
    const result = await reportsService.getDashboard(req.query.branch_id);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

// ─── Advanced Reports ─────────────────────────────────

export const getSalesByProduct = async (req, res, next) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const result = await reportsService.getSalesByProduct(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getSalesByCashier = async (req, res, next) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const result = await reportsService.getSalesByCashier(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getPurchaseSummary = async (req, res, next) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const result = await reportsService.getPurchaseSummary(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getProfitLoss = async (req, res, next) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const result = await reportsService.getProfitLoss(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getTopCustomers = async (req, res, next) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const result = await reportsService.getTopCustomers(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getInventoryValuation = async (req, res, next) => {
  try {
    const result = await reportsService.getInventoryValuation(req.query.branch_id);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getProductMovementReport = async (req, res, next) => {
  try {
    const query = reportQuerySchema.extend({ product_id: z.string().uuid() }).parse(req.query);
    const result = await reportsService.getProductMovementReport(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

// ─── New Reports ──────────────────────────────────────

export const getSlowMovingProducts = async (req, res, next) => {
  try {
    const query = reportQuerySchema.extend({ months: z.string().optional() }).parse(req.query);
    const result = await reportsService.getSlowMovingProducts(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getCustomerReport = async (req, res, next) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const result = await reportsService.getCustomerReport(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getSupplierReport = async (req, res, next) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const result = await reportsService.getSupplierReport(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getSafeReport = async (req, res, next) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const result = await reportsService.getSafeReport(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getExpenseReport = async (req, res, next) => {
  try {
    const query = reportQuerySchema.extend({ group_by: z.string().optional() }).parse(req.query);
    const result = await reportsService.getExpenseReport(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'reports', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const exportReport = async (req, res, next) => {
  try {
    const userPerms = await getUserPermissions(req.user.userId);
    const hasProfitPerm = userPerms.includes('field:view_daily_profit') || userPerms.includes('field:view_monthly_profit');
    const hasCostPerm = userPerms.includes('field:view_purchase_costs');
    const hasInventoryValuePerm = userPerms.includes('field:view_inventory_value');
    const hasSafeBalancePerm = userPerms.includes('field:view_safe_balance');
    const hasFinancialSummaryPerm = userPerms.includes('field:view_financial_summary');
    const buffer = await reportsService.exportReport(req.query, {
      hasProfitPerm, hasCostPerm, hasInventoryValuePerm, hasSafeBalancePerm, hasFinancialSummaryPerm,
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="report_${req.query.type}_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (err) { next(err); }
};
