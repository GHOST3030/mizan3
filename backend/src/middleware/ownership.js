import { prisma } from '../lib/prisma.js';

export const ownership = (model, options = {}) => {
  const { paramName = 'id', userField = 'user_id' } = options;

  return async (req, res, next) => {
    if (req.user?.role === 'super_admin' || req.user?.role === 'admin' || req.user?.role === 'manager') return next();

    const entityId = req.params[paramName];
    if (!entityId) return next();

    try {
      const entity = await prisma[model].findFirst({
        where: { id: entityId, deleted_at: null },
        select: { [userField]: true },
      });
      if (entity && entity[userField] !== req.user.userId) {
        return res.status(403).json({ message: 'ليس لديك صلاحية للوصول إلى هذه البيانات' });
      }
    } catch (err) {
      return next();
    }

    next();
  };
};
