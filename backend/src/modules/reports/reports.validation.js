import { z } from 'zod';

export const reportQuerySchema = z.object({
  branch_id: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
});

export const paginate = (page = '1', limit = '50') => ({
  skip: (parseInt(page) - 1) * parseInt(limit),
  take: parseInt(limit),
});

export const paginationMeta = (total, page = '1', limit = '50') => ({
  total,
  page: parseInt(page),
  limit: parseInt(limit),
  pages: Math.ceil(total / parseInt(limit)),
});
