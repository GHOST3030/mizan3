import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { clearCache } from '../../services/permission.service.js';
import { log } from '../audit/audit.service.js';

const audit = (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

export const getRoles = async () => {
  return prisma.role.findMany({
    include: {
      role_permissions: {
        include: { permission: true },
      },
      _count: { select: { users: true } },
    },
    orderBy: { name: 'asc' },
  });
};

export const getRoleById = async (id) => {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      role_permissions: {
        include: { permission: true },
      },
      _count: { select: { users: true } },
    },
  });
  if (!role) throw new AppError('الدور غير موجود', 404);
  return role;
};

export const createRole = async (data) => {
  const existing = await prisma.role.findUnique({ where: { name: data.name } });
  if (existing) throw new AppError('اسم الدور موجود مسبقاً', 409);

  const result = await prisma.role.create({
    data: {
      name: data.name,
      label: data.label,
      description: data.description,
      is_system: false,
    },
  });

  audit('create_role', 'role', result.id, {
    user_id: data.created_by,
    metadata: { name: result.name, label: result.label },
  });

  return result;
};

export const updateRole = async (id, data) => {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new AppError('الدور غير موجود', 404);

  if (role.is_system && data.name !== role.name) {
    throw new AppError('لا يمكن تغيير اسم دور النظام', 400);
  }

  const result = await prisma.role.update({
    where: { id },
    data: {
      label: data.label,
      description: data.description,
    },
  });

  audit('update_role', 'role', id, {
    user_id: data.updated_by,
    metadata: { name: result.name, label: result.label },
  });

  return result;
};

export const deleteRole = async (id, userId) => {
  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!role) throw new AppError('الدور غير موجود', 404);
  if (role.is_system) throw new AppError('لا يمكن حذف دور النظام', 400);
  if (role._count.users > 0) throw new AppError('لا يمكن حذف دور مستخدم', 400);

  await prisma.rolePermission.deleteMany({ where: { role_id: id } });
  await prisma.role.delete({ where: { id } });

  audit('delete_role', 'role', id, {
    user_id: userId,
    metadata: { name: role.name, label: role.label },
  });
};

export const getPermissions = async () => {
  return prisma.permission.findMany({
    orderBy: [{ group: 'asc' }, { key: 'asc' }],
  });
};

export const getRolePermissions = async (roleId) => {
  const rolePerms = await prisma.rolePermission.findMany({
    where: { role_id: roleId },
    include: { permission: true },
  });
  return rolePerms.map(rp => rp.permission);
};

export const setRolePermissions = async (roleId, permissionKeys, userId) => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new AppError('الدور غير موجود', 404);

  const permissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
  });
  const foundKeys = permissions.map(p => p.key);
  const missing = permissionKeys.filter(k => !foundKeys.includes(k));
  if (missing.length > 0) {
    throw new AppError(`الصلاحيات غير موجودة: ${missing.join(', ')}`, 400);
  }

  await prisma.rolePermission.deleteMany({ where: { role_id: roleId } });

  if (permissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissions.map(p => ({ role_id: roleId, permission_id: p.id })),
    });
  }

  const users = await prisma.user.findMany({
    where: { role_id: roleId },
    select: { id: true },
  });
  for (const u of users) clearCache(u.id);

  audit('set_role_permissions', 'role', roleId, {
    user_id: userId,
    metadata: { name: role.name, permission_keys: permissionKeys },
  });

  return getRolePermissions(roleId);
};

export const getUserPermissions = async (userId) => {
  const userPerms = await prisma.userPermission.findMany({
    where: { user_id: userId },
    include: { permission: true },
  });
  return userPerms.map(up => ({
    id: up.id,
    permission_id: up.permission_id,
    permission_key: up.permission.key,
    permission_label: up.permission.label,
    granted: up.granted,
  }));
};

export const setUserPermission = async (userId, permissionId, granted, actingUserId) => {
  const existing = await prisma.userPermission.findUnique({
    where: { user_id_permission_id: { user_id: userId, permission_id: permissionId } },
  });
  const permission = await prisma.permission.findUnique({ where: { id: permissionId } });

  let result;
  if (existing) {
    result = await prisma.userPermission.update({
      where: { id: existing.id },
      data: { granted },
    });
  } else {
    result = await prisma.userPermission.create({
      data: { user_id: userId, permission_id: permissionId, granted },
    });
  }

  clearCache(userId);

  audit('set_user_permission', 'user_permission', result.id, {
    user_id: actingUserId,
    metadata: { target_user_id: userId, permission_key: permission?.key, granted },
  });

  return result;
};

export const deleteUserPermission = async (userId, permissionId, actingUserId) => {
  const existing = await prisma.userPermission.findUnique({
    where: { user_id_permission_id: { user_id: userId, permission_id: permissionId } },
  });
  if (!existing) throw new AppError('الصلاحية غير موجودة للمستخدم', 404);
  const permission = await prisma.permission.findUnique({ where: { id: permissionId } });

  await prisma.userPermission.delete({ where: { id: existing.id } });
  clearCache(userId);

  audit('delete_user_permission', 'user_permission', existing.id, {
    user_id: actingUserId,
    metadata: { target_user_id: userId, permission_key: permission?.key },
  });
};
