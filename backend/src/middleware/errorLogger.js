import { prisma, isPrismaAvailable } from '../lib/prisma.js';

export const errorLogger = async (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  if (status >= 500) {
    console.error(`[${status}] ${req.method} ${req.path}: ${err.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack?.split('\n').slice(0, 6).join('\n'));
    }

    if (isPrismaAvailable()) {
      try {
        await prisma.activityLog.create({
          data: {
            branch_id: req.user?.branchId || null,
            user_id: req.user?.userId || null,
            action: 'error',
            entity: 'system',
            metadata: {
              method: req.method,
              path: req.path,
              message: err.message,
              stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
              status,
            },
            ip_address: req.ip,
          },
        });
      } catch (logErr) {
        console.error('Failed to log error to database:', logErr.message);
      }
    }
  }
  next(err);
};
