import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { log } from '../audit/audit.service.js';

const audit = (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

// ─── Companies ───────────────────────────────────────

export const getCompanies = () =>
  prisma.company.findMany({ where: { deleted_at: null } });

export const getCompanyById = (id) =>
  prisma.company.findFirst({ where: { id, deleted_at: null } });

export const createCompany = async (data) => {
  const { user_id, ...dbData } = data;
  const result = await prisma.company.create({ data: dbData });
  audit('create_company', 'company', result.id, {
    user_id,
    metadata: { name: result.name, name_ar: result.name_ar },
  });
  return result;
};

export const updateCompany = async (id, data) => {
  const { user_id, ...dbData } = data;
  const prev = await prisma.company.findFirst({ where: { id, deleted_at: null } });
  if (!prev) throw new AppError('الشركة غير موجودة', 404);
  const result = await prisma.company.update({ where: { id, deleted_at: null }, data: dbData });
  audit('update_company', 'company', id, {
    user_id,
    metadata: { name: result.name, changes: Object.keys(dbData) },
  });
  return result;
};

export const deleteCompany = async (id, user_id) => {
  const prev = await prisma.company.findFirst({ where: { id, deleted_at: null } });
  if (!prev) throw new AppError('الشركة غير موجودة', 404);
  const result = await prisma.company.update({
    where: { id, deleted_at: null },
    data: { deleted_at: new Date() },
  });
  audit('delete_company', 'company', id, {
    user_id,
    metadata: { name: prev.name },
  });
  return result;
};

// ─── Branches ────────────────────────────────────────

export const getBranches = () =>
  prisma.branch.findMany({ where: { deleted_at: null } });

export const getBranchById = (id) =>
  prisma.branch.findFirst({ where: { id, deleted_at: null } });

export const createBranch = async (data) => {
  const { user_id, ...dbData } = data;
  const result = await prisma.branch.create({ data: dbData });
  audit('create_branch', 'branch', result.id, {
    user_id,
    metadata: { name: result.name, name_ar: result.name_ar },
  });
  return result;
};

export const updateBranch = async (id, data) => {
  const { user_id, ...dbData } = data;
  const prev = await prisma.branch.findFirst({ where: { id, deleted_at: null } });
  if (!prev) throw new AppError('الفرع غير موجود', 404);
  const result = await prisma.branch.update({ where: { id, deleted_at: null }, data: dbData });
  audit('update_branch', 'branch', id, {
    user_id,
    metadata: { name: result.name, changes: Object.keys(dbData) },
  });
  return result;
};

export const deleteBranch = async (id, user_id) => {
  const prev = await prisma.branch.findFirst({ where: { id, deleted_at: null } });
  if (!prev) throw new AppError('الفرع غير موجود', 404);
  const result = await prisma.branch.update({
    where: { id, deleted_at: null },
    data: { deleted_at: new Date() },
  });
  audit('delete_branch', 'branch', id, {
    user_id,
    metadata: { name: prev.name },
  });
  return result;
};

// ─── Settings ────────────────────────────────────────

export const getSettings = (branch_id) =>
  prisma.setting.findMany({
    where: { deleted_at: null, ...(branch_id ? { branch_id } : {}) },
  });

export const getSettingById = (id) =>
  prisma.setting.findFirst({ where: { id, deleted_at: null } });

export const createSetting = async (data) => {
  const { user_id, ...dbData } = data;
  const result = await prisma.setting.create({ data: dbData });
  audit('create_setting', 'setting', result.id, {
    branch_id: result.branch_id,
    user_id,
    metadata: { key: result.key },
  });
  return result;
};

export const updateSetting = async (id, data) => {
  const { user_id, ...dbData } = data;
  const prev = await prisma.setting.findFirst({ where: { id, deleted_at: null } });
  if (!prev) throw new AppError('الإعداد غير موجود', 404);
  const result = await prisma.setting.update({ where: { id, deleted_at: null }, data: dbData });
  audit('update_setting', 'setting', id, {
    branch_id: prev.branch_id,
    user_id,
    metadata: { key: prev.key, changes: Object.keys(dbData) },
  });
  return result;
};

export const deleteSetting = async (id, user_id) => {
  const prev = await prisma.setting.findFirst({ where: { id, deleted_at: null } });
  if (!prev) throw new AppError('الإعداد غير موجود', 404);
  const result = await prisma.setting.update({
    where: { id, deleted_at: null },
    data: { deleted_at: new Date() },
  });
  audit('delete_setting', 'setting', id, {
    branch_id: prev.branch_id,
    user_id,
    metadata: { key: prev.key },
  });
  return result;
};