import { AsyncLocalStorage } from 'async_hooks';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';

export const auditStorage = new AsyncLocalStorage();

const MAX_RETRIES = 3;
const RETRY_DELAY = 100;
const MAX_BUFFER_SIZE = 500;

let logBuffer = [];
let flushing = false;

const flushBuffer = async () => {
  if (flushing) return;
  flushing = true;
  const items = logBuffer.splice(0, MAX_BUFFER_SIZE);
  if (items.length === 0) { flushing = false; return; }
  try {
    await prisma.activityLog.createMany({ data: items });
  } catch {
    logBuffer.unshift(...items);
  }
  flushing = false;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const log = async ({ branch_id, user_id, action, entity, entity_id, metadata, ip_address }) => {
  const context = auditStorage.getStore();

  const data = {
    branch_id,
    user_id,
    action,
    entity,
    entity_id,
    metadata: metadata || {},
    ip_address: ip_address || context?.ip_address || 'unknown',
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await prisma.activityLog.create({ data });
      if (logBuffer.length > 0) flushBuffer();
      return result;
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY);
      } else {
        if (logBuffer.length < MAX_BUFFER_SIZE) {
          logBuffer.push(data);
          if (logBuffer.length >= MAX_BUFFER_SIZE / 2) flushBuffer();
        }
      }
    }
  }
};

export const getLogs = async ({ entity, action, entity_id, user_id, from, to, page = '1', limit = '50' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    ...(entity && { entity }),
    ...(action && { action }),
    ...(entity_id && { entity_id }),
    ...(user_id && { user_id }),
    ...(from || to) && {
      created_at: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
        branch: { select: { id: true, name_ar: true } },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    data: logs,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};
