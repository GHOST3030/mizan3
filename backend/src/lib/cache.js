import NodeCache from 'node-cache';
import { prisma } from './prisma.js';

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

export const get = (key) => cache.get(key);
export const set = (key, value, ttl) => cache.set(key, value, ttl);
export const del = (key) => cache.del(key);
export const flush = () => cache.flushAll();

export const getCachedSetting = async (key, branch_id) => {
  const cacheKey = `setting:${branch_id || 'global'}:${key}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const setting = await prisma.setting.findFirst({
    where: { branch_id, key, deleted_at: null },
  });
  if (setting) {
    cache.set(cacheKey, setting.value, 300);
    return setting.value;
  }

  if (branch_id) return getCachedSetting(key, null);
  return null;
};

