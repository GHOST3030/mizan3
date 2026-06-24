import { z } from 'zod';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidField = (msg) => z.string().regex(UUID_REGEX, msg || 'معرف غير صالح');

export const uuidOptional = (msg) => z.string().regex(UUID_REGEX, msg || 'معرف غير صالح').optional().nullable();

export const flexId = () => z.string().min(1, 'المعرف مطلوب');

export const flexIdOptional = () => z.string().min(1).optional().nullable();
