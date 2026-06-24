import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';

const DEFAULTS = {
  sale: { prefix: 'INV', pad_length: 6 },
  sale_return: { prefix: 'RINV', pad_length: 6 },
  purchase: { prefix: 'PO', pad_length: 6 },
  purchase_return: { prefix: 'RPO', pad_length: 6 },
  expense: { prefix: 'EXP', pad_length: 6 },
};

export const getNextNumber = async (branch_id, type) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      let seq = await tx.numberSequence.findUnique({
        where: { branch_id_type: { branch_id, type } },
      });

      if (!seq) {
        const defaults = DEFAULTS[type] || { prefix: 'DOC', pad_length: 6 };
        seq = await tx.numberSequence.create({
          data: {
            branch_id,
            type,
            prefix: defaults.prefix,
            next_number: 1,
            pad_length: defaults.pad_length,
          },
        });
      }

      const number = seq.next_number;

      await tx.numberSequence.update({
        where: { id: seq.id },
        data: { next_number: { increment: 1 } },
      });

      return `${seq.prefix}-${String(number).padStart(seq.pad_length, '0')}`;
    }, { timeout: 30000, maxWait: 25000 });
    return result;
  } catch (err) {
    if (err.code === 'P2024' || err.message?.includes('timeout') || err.message?.includes('Timed out')) {
      throw new AppError('تعذر إنشاء رقم تسلسلي، يرجى المحاولة مرة أخرى', 503);
    }
    throw err;
  }
};

export const reseedSequence = async (branch_id, type) => {
  const modelMap = {
    sale: 'sale',
    sale_return: 'sale',
    purchase: 'purchase',
    purchase_return: 'purchase',
    expense: 'expense',
  };

  const model = modelMap[type];
  if (!model) throw new Error(`Unknown sequence type: ${type}`);

  const statusFilter = type.includes('return') ? 'returned' : undefined;
  const statusCondition = type.includes('return') ? { status: 'returned' } : {};
  const cancelledCondition = type === 'sale' || type === 'purchase' ? {} : {};

  const delegate = prisma[model];
  const last = await delegate.findFirst({
    where: {
      branch_id,
      deleted_at: null,
      ...statusCondition,
      ...cancelledCondition,
    },
    orderBy: { created_at: 'desc' },
    select: { invoice_number: true },
  });

  const defaults = DEFAULTS[type] || { prefix: 'DOC', pad_length: 6 };
  let nextNumber = 1;
  if (last) {
    const numStr = last.invoice_number.replace(`${defaults.prefix}-`, '');
    nextNumber = parseInt(numStr, 10) + 1;
  }

  await prisma.numberSequence.upsert({
    where: { branch_id_type: { branch_id, type } },
    update: { next_number: nextNumber, prefix: defaults.prefix, pad_length: defaults.pad_length },
    create: {
      branch_id,
      type,
      prefix: defaults.prefix,
      next_number: nextNumber,
      pad_length: defaults.pad_length,
    },
  });

  return nextNumber;
};
