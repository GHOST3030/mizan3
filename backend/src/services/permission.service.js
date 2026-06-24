import { prisma } from '../lib/prisma.js';

const CACHE_TTL = 60000;
const cache = new Map();

const getCacheKey = (userId) => `perms_${userId}`;

export const getUserPermissions = async (userId) => {
  const key = getCacheKey(userId);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.permissions;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role_id: true },
  });

  if (!user) return [];

  let permissions = [];

  if (user.role_id) {
    const rolePerms = await prisma.rolePermission.findMany({
      where: { role_id: user.role_id },
      include: { permission: true },
    });
    permissions = rolePerms.map(rp => rp.permission.key);
  }

  const userPerms = await prisma.userPermission.findMany({
    where: { user_id: userId },
    include: { permission: true },
  });

  for (const up of userPerms) {
    if (up.granted) {
      if (!permissions.includes(up.permission.key)) permissions.push(up.permission.key);
    } else {
      permissions = permissions.filter(p => p !== up.permission.key);
    }
  }

  cache.set(key, { permissions, ts: Date.now() });
  return permissions;
};

export const hasPermission = async (userId, permissionKey) => {
  const perms = await getUserPermissions(userId);
  return perms.includes(permissionKey);
};

export const clearCache = (userId) => {
  if (userId) cache.delete(getCacheKey(userId));
  else cache.clear();
};
