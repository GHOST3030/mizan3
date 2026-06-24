import * as customersService from './customers.service.js';
import {
  createCustomerGroupSchema, updateCustomerGroupSchema,
  createCustomerSchema, updateCustomerSchema, searchCustomerSchema,
  setOpeningBalanceSchema,
} from './customers.validation.js';
import { sanitizeResponse } from '../../services/fieldSecurity.service.js';

// ─── Customer Groups ─────────────────────────────────

export const getCustomerGroups = async (req, res, next) => {
  try {
    const groups = await customersService.getCustomerGroups();
    res.json(groups);
  } catch (err) { next(err); }
};

export const createCustomerGroup = async (req, res, next) => {
  try {
    const data = createCustomerGroupSchema.parse(req.body);
    const group = await customersService.createCustomerGroup({ ...data, user_id: req.user.userId });
    res.status(201).json(group);
  } catch (err) { next(err); }
};

export const updateCustomerGroup = async (req, res, next) => {
  try {
    const data = updateCustomerGroupSchema.parse(req.body);
    const group = await customersService.updateCustomerGroup(req.params.id, { ...data, user_id: req.user.userId });
    res.json(group);
  } catch (err) { next(err); }
};

export const deleteCustomerGroup = async (req, res, next) => {
  try {
    await customersService.deleteCustomerGroup(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف المجموعة' });
  } catch (err) { next(err); }
};

// ─── Customers ───────────────────────────────────────

export const getCustomers = async (req, res, next) => {
  try {
    const query = searchCustomerSchema.parse(req.query);
    const result = await customersService.getCustomers(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'customers', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await customersService.getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    const sanitized = await sanitizeResponse(req.user.userId, 'customers', customer);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const createCustomer = async (req, res, next) => {
  try {
    const data = createCustomerSchema.parse(req.body);
    const customer = await customersService.createCustomer({ ...data, user_id: req.user.userId });
    res.status(201).json(customer);
  } catch (err) { next(err); }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const data = updateCustomerSchema.parse(req.body);
    const customer = await customersService.updateCustomer(req.params.id, { ...data, user_id: req.user.userId });
    res.json(customer);
  } catch (err) { next(err); }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    await customersService.deleteCustomer(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف العميل' });
  } catch (err) { next(err); }
};

// ─── Opening Balance ───────────────────────────────────

export const setCustomerOpeningBalance = async (req, res, next) => {
  try {
    const data = setOpeningBalanceSchema.parse(req.body);
    const customer = await customersService.setCustomerOpeningBalance(req.params.id, { ...data, user_id: req.user.userId });
    res.json(customer);
  } catch (err) { next(err); }
};

// ─── Customer Statement ───────────────────────────────

export const getCustomerStatement = async (req, res, next) => {
  try {
    const result = await customersService.getCustomerStatement(req.params.id, req.query);
    const sanitized = await sanitizeResponse(req.user.userId, 'customers', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};
