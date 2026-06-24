import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { clearCache } from '../../services/permission.service.js';
import { log } from '../audit/audit.service.js';
import { AppError } from '../../utils/AppError.js';

const audit = (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

const findRoleId = async (role) => {
  if (!role) return undefined;
  const roleRec = await prisma.role.findUnique({ where: { name: role } });
  return roleRec?.id;
};

export const login = async ({ username, password }) => {
  const user = await prisma.user.findFirst({
    where: { username, deleted_at: null },
    include: { branch: true },
  });

  if (!user || !user.is_active) {
    throw new AppError('اسم المستخدم أو كلمة المرور غير صحيحة', 401);
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new AppError('اسم المستخدم أو كلمة المرور غير صحيحة', 401);
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, branchId: user.branch_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      branch: { id: user.branch.id, name: user.branch.name },
    },
  };
};

export const getUsers = async ({ branchId }) => {
  return prisma.user.findMany({
    where: { branch_id: branchId, deleted_at: null },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      is_active: true,
      created_at: true,
    },
    orderBy: { created_at: 'asc' },
  });
};

export const createUser = async (data) => {
  const existing = await prisma.user.findFirst({
    where: { username: data.username },
  });
  if (existing) throw new AppError('اسم المستخدم مستخدم بالفعل', 409);

  const password_hash = await bcrypt.hash(data.password, 10);
  const role_id = await findRoleId(data.role);

  const result = await prisma.user.create({
    data: {
      branch_id: data.branch_id,
      name: data.name,
      username: data.username,
      password_hash,
      role: data.role,
      role_id,
    },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      is_active: true,
    },
  });

  audit('create_user', 'user', result.id, {
    branch_id: data.branch_id,
    user_id: data.created_by,
    metadata: { username: result.username, role: result.role },
  });

  return result;
};

export const updateUser = async (id, data, role) => {
  const user = await prisma.user.findFirst({
    where: { id, deleted_at: null },
  });
  if (!user) throw new AppError('المستخدم غير موجود', 404);

  const updateData = { ...data };
  if (data.password) {
    updateData.password_hash = await bcrypt.hash(data.password, 10);
    delete updateData.password;
  }
  if (role) {
    const validRoles = ['super_admin', 'admin', 'manager', 'cashier', 'accountant', 'inventory_manager', 'auditor'];
    if (validRoles.includes(role)) {
      updateData.role = role;
      updateData.role_id = await findRoleId(role);
    }
  }

  const result = await prisma.user.update({
    where: { id, deleted_at: null },
    data: updateData,
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      is_active: true,
    },
  });

  audit('update_user', 'user', id, {
    branch_id: user.branch_id,
    user_id: data.updated_by,
    metadata: { username: result.username, role: result.role, is_active: result.is_active },
  });

  clearCache(id);

  return result;
};

export const deleteUser = async (id, userId) => {
  const user = await prisma.user.findFirst({
    where: { id, deleted_at: null },
  });
  if (!user) throw new AppError('المستخدم غير موجود', 404);

  await prisma.user.update({
    where: { id, deleted_at: null },
    data: { deleted_at: new Date() },
  });

  clearCache(id);

  audit('delete_user', 'user', id, {
    branch_id: user.branch_id,
    user_id: userId,
    metadata: { username: user.username, role: user.role },
  });
};