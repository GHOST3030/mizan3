import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';

export const getPrintTemplates = async ({ branch_id, type }) => {
  const where = { deleted_at: null, ...(branch_id && { branch_id }), ...(type && { type }) };
  return prisma.printTemplate.findMany({ where, orderBy: { name: 'asc' } });
};

export const getPrintTemplateById = async (id) => {
  const tpl = await prisma.printTemplate.findFirst({ where: { id, deleted_at: null } });
  if (!tpl) throw new AppError('القالب غير موجود', 404);
  return tpl;
};

export const createPrintTemplate = async (data) => {
  if (data.is_default) await resetDefaults(data.branch_id, data.type);
  return prisma.printTemplate.create({ data });
};

export const updatePrintTemplate = async (id, data) => {
  const tpl = await prisma.printTemplate.findFirst({ where: { id, deleted_at: null } });
  if (!tpl) throw new AppError('القالب غير موجود', 404);
  if (data.is_default) await resetDefaults(data.branch_id || tpl.branch_id, data.type || tpl.type);
  return prisma.printTemplate.update({ where: { id }, data });
};

export const deletePrintTemplate = async (id) => {
  const tpl = await prisma.printTemplate.findFirst({ where: { id, deleted_at: null } });
  if (!tpl) throw new AppError('القالب غير موجود', 404);
  await prisma.printTemplate.update({ where: { id }, data: { deleted_at: new Date() } });
};

export const getDefaultTemplate = async (type, branch_id) => {
  let tpl = await prisma.printTemplate.findFirst({
    where: { deleted_at: null, branch_id, type, is_default: true },
  });
  if (!tpl) {
    tpl = await prisma.printTemplate.findFirst({
      where: { deleted_at: null, branch_id: null, type, is_default: true },
    });
  }
  return tpl;
};

async function resetDefaults(branch_id, type) {
  const where = { deleted_at: null, type, is_default: true };
  if (branch_id) where.branch_id = branch_id;
  await prisma.printTemplate.updateMany({ where, data: { is_default: false } });
}
