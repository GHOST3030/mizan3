import { z } from 'zod';
import * as coreService from './core.service.js';
import { uuidParam, branchIdQuery } from './core.validation.js';

// ─── Companies ───────────────────────────────────────

export const getCompanies = async (req, res, next) => {
  try {
    const data = await coreService.getCompanies();
    res.json(data);
  } catch (err) { next(err); }
};

export const getCompanyById = async (req, res, next) => {
  try {
    const { id } = uuidParam.parse(req.params);
    const data = await coreService.getCompanyById(id);
    if (!data) return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
    res.json(data);
  } catch (err) { next(err); }
};

export const createCompany = async (req, res, next) => {
  try {
    const data = await coreService.createCompany({ ...req.body, user_id: req.user.userId });
    res.status(201).json(data);
  } catch (err) { next(err); }
};

export const updateCompany = async (req, res, next) => {
  try {
    const { id } = uuidParam.parse(req.params);
    const data = await coreService.updateCompany(id, { ...req.body, user_id: req.user.userId });
    res.json(data);
  } catch (err) { next(err); }
};

export const deleteCompany = async (req, res, next) => {
  try {
    const { id } = uuidParam.parse(req.params);
    await coreService.deleteCompany(id, req.user.userId);
    res.json({ message: 'تم الحذف' });
  } catch (err) { next(err); }
};

// ─── Branches ────────────────────────────────────────

export const getBranches = async (req, res, next) => {
  try {
    const data = await coreService.getBranches();
    res.json(data);
  } catch (err) { next(err); }
};

export const getBranchById = async (req, res, next) => {
  try {
    const { id } = uuidParam.parse(req.params);
    const data = await coreService.getBranchById(id);
    if (!data) return res.status(404).json({ success: false, message: 'الفرع غير موجود' });
    res.json(data);
  } catch (err) { next(err); }
};

export const createBranch = async (req, res, next) => {
  try {
    const data = await coreService.createBranch({ ...req.body, user_id: req.user.userId });
    res.status(201).json(data);
  } catch (err) { next(err); }
};

export const updateBranch = async (req, res, next) => {
  try {
    const { id } = uuidParam.parse(req.params);
    const data = await coreService.updateBranch(id, { ...req.body, user_id: req.user.userId });
    res.json(data);
  } catch (err) { next(err); }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const { id } = uuidParam.parse(req.params);
    await coreService.deleteBranch(id, req.user.userId);
    res.json({ message: 'تم الحذف' });
  } catch (err) { next(err); }
};

// ─── Settings ────────────────────────────────────────

export const getSettings = async (req, res, next) => {
  try {
    const query = branchIdQuery.parse(req.query);
    const data = await coreService.getSettings(query.branch_id);
    res.json(data);
  } catch (err) { next(err); }
};

export const getSettingById = async (req, res, next) => {
  try {
    const { id } = uuidParam.parse(req.params);
    const data = await coreService.getSettingById(id);
    if (!data) return res.status(404).json({ success: false, message: 'الإعداد غير موجود' });
    res.json(data);
  } catch (err) { next(err); }
};

export const createSetting = async (req, res, next) => {
  try {
    const data = await coreService.createSetting({ ...req.body, user_id: req.user.userId });
    res.status(201).json(data);
  } catch (err) { next(err); }
};

export const updateSetting = async (req, res, next) => {
  try {
    const { id } = uuidParam.parse(req.params);
    const data = await coreService.updateSetting(id, { ...req.body, user_id: req.user.userId });
    res.json(data);
  } catch (err) { next(err); }
};

export const deleteSetting = async (req, res, next) => {
  try {
    const { id } = uuidParam.parse(req.params);
    await coreService.deleteSetting(id, req.user.userId);
    res.json({ message: 'تم الحذف' });
  } catch (err) { next(err); }
};