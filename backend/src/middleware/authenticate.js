import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { hasPermission } from '../services/permission.service.js';

const ROLE_CACHE_TTL = 30000;
const roleCache = new Map();

const getCachedRole = async (userId) => {
  const cached = roleCache.get(userId);
  if (cached && Date.now() - cached.ts < ROLE_CACHE_TTL) {
    return cached.role;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const role = user?.role || 'cashier';
    roleCache.set(userId, { role, ts: Date.now() });
    return role;
  } catch {
    return null;
  }
};

export const clearRoleCache = (userId) => {
  if (userId) roleCache.delete(userId);
  else roleCache.clear();
};

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'غير مصرح — يلزم تسجيل الدخول' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const liveRole = await getCachedRole(decoded.userId);
    if (!liveRole) {
      return res.status(401).json({ message: 'المستخدم غير موجود' });
    }
    req.user = { ...decoded, role: liveRole };
    next();
  } catch {
    res.status(401).json({ message: 'الجلسة منتهية أو غير صالحة' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (req.user?.role === 'super_admin') return next();
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'ليس لديك صلاحية للقيام بهذا الإجراء' });
  }
  next();
};

export const requirePermission = (permission) => async (req, res, next) => {
  if (req.user?.role === 'super_admin') return next();
  try {
    const hasPerm = await hasPermission(req.user?.userId, permission);
    if (!hasPerm) {
      return res.status(403).json({ message: 'ليس لديك صلاحية للقيام بهذا الإجراء' });
    }
    next();
  } catch {
    res.status(500).json({ message: 'حدث خطأ في التحقق من الصلاحية' });
  }
};
