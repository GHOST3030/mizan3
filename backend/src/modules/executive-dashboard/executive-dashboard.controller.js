import * as executiveDashboardService from './executive-dashboard.service.js';
import { sanitizeResponse } from '../../services/fieldSecurity.service.js';

const sanitizeDashboard = async (userId, data) => {
  return sanitizeResponse(userId, 'executive_dashboard', data);
};

export const getFullDashboard = async (req, res, next) => {
  try {
    const branch_id = req.query.branch_id || undefined;
    const data = await executiveDashboardService.getFullDashboard(branch_id);
    const sanitized = await sanitizeDashboard(req.user.userId, data);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
};

export const getTodayCards = async (req, res, next) => {
  try {
    const branch_id = req.query.branch_id || undefined;
    const data = await executiveDashboardService.getTodayCards(branch_id);
    const sanitized = await sanitizeDashboard(req.user.userId, data);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
};

export const getMonthCards = async (req, res, next) => {
  try {
    const branch_id = req.query.branch_id || undefined;
    const data = await executiveDashboardService.getMonthCards(branch_id);
    const sanitized = await sanitizeDashboard(req.user.userId, data);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
};

export const getInventoryCards = async (req, res, next) => {
  try {
    const branch_id = req.query.branch_id || undefined;
    const data = await executiveDashboardService.getInventoryCards(branch_id);
    const sanitized = await sanitizeDashboard(req.user.userId, data);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
};

export const getFinanceCards = async (req, res, next) => {
  try {
    const branch_id = req.query.branch_id || undefined;
    const data = await executiveDashboardService.getFinanceCards(branch_id);
    const sanitized = await sanitizeDashboard(req.user.userId, data);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
};

export const getTopProducts = async (req, res, next) => {
  try {
    const branch_id = req.query.branch_id || undefined;
    const limit = parseInt(req.query.limit) || 10;
    const data = await executiveDashboardService.getTopProducts(branch_id, limit);
    const sanitized = await sanitizeDashboard(req.user.userId, data);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
};

export const getTopCustomers = async (req, res, next) => {
  try {
    const branch_id = req.query.branch_id || undefined;
    const limit = parseInt(req.query.limit) || 10;
    const data = await executiveDashboardService.getTopCustomers(branch_id, limit);
    const sanitized = await sanitizeDashboard(req.user.userId, data);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
};

export const getTopSuppliers = async (req, res, next) => {
  try {
    const branch_id = req.query.branch_id || undefined;
    const limit = parseInt(req.query.limit) || 10;
    const data = await executiveDashboardService.getTopSuppliers(branch_id, limit);
    const sanitized = await sanitizeDashboard(req.user.userId, data);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
};

export const getDailySalesTrend = async (req, res, next) => {
  try {
    const branch_id = req.query.branch_id || undefined;
    const days = parseInt(req.query.days) || 30;
    const data = await executiveDashboardService.getDailySalesTrend(branch_id, days);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getMonthlyRevenueTrend = async (req, res, next) => {
  try {
    const branch_id = req.query.branch_id || undefined;
    const months = parseInt(req.query.months) || 12;
    const data = await executiveDashboardService.getMonthlyRevenueTrend(branch_id, months);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getAlerts = async (req, res, next) => {
  try {
    const branch_id = req.query.branch_id || undefined;
    const data = await executiveDashboardService.getAlerts(branch_id);
    const sanitized = await sanitizeDashboard(req.user.userId, data);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
};
