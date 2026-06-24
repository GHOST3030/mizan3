import { prisma } from '../../lib/prisma.js';
import { log } from '../audit/audit.service.js';
import { getNextNumber } from '../core/number-sequence.service.js';
import { getCachedSetting } from '../../lib/cache.js';
import { AppError } from '../../utils/AppError.js';

const audit = async (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

const DEFAULT_DISCOUNT_LIMITS = {
  admin: 100,
  manager: 20,
  cashier: 5,
  accountant: 0,
  inventory_manager: 0,
};

const getRoleDiscountLimit = async (role, branch_id) => {
  const val = await getCachedSetting(`discount.limit.${role}.percent`, branch_id);
  if (val !== null) return parseInt(val);
  return DEFAULT_DISCOUNT_LIMITS[role] ?? 0;
};

const generateInvoiceNumber = (branch_id) => getNextNumber(branch_id, 'sale');

const getStockPolicy = async (branch_id) => {
  const val = await getCachedSetting('inventory.allow_negative_stock', branch_id);
  if (val !== null) return val;
  return 'block';
};

const checkStockAvailability = async (branch_id, items) => {
  const policy = await getStockPolicy(branch_id);
  if (policy === 'allow') return;

  const productIds = items.map((i) => i.product_id);
  const balances = await prisma.inventoryBalance.findMany({
    where: { branch_id, product_id: { in: productIds } },
  });
  const balanceMap = Object.fromEntries(balances.map((b) => [b.product_id, b]));

  const lowStockItems = items.filter((item) => {
    const currentQty = balanceMap[item.product_id]?.quantity || 0;
    return currentQty < item.quantity;
  });

  if (lowStockItems.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: lowStockItems.map((i) => i.product_id) } },
      select: { id: true, name_ar: true, name: true },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    for (const item of lowStockItems) {
      const product = productMap[item.product_id];
      const currentQty = balanceMap[item.product_id]?.quantity || 0;
      const msg = `الرصيد غير كافٍ للمنتج: ${product?.name_ar || product?.name || item.product_id} (الرصيد: ${currentQty}, المطلوب: ${item.quantity})`;
      throw new AppError(msg, 400);
    }
  }
};

export const getSales = async ({ q, status, customer_id, branch_id, user_id, from, to, page = '1', limit = '20' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    deleted_at: null,
    ...(branch_id && { branch_id }),
    ...(status && { status }),
    ...(customer_id && { customer_id }),
    ...(user_id && { user_id }),
    ...(from || to) && {
      created_at: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
    ...(q && {
      OR: [
        { invoice_number: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ],
    }),
  };

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true } },
        shift: { select: { id: true, opened_at: true } },
        currency: { select: { id: true, code: true, symbol: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, name_ar: true, barcode: true } },
          },
        },
        payments: {
          include: { currency: { select: { id: true, code: true, symbol: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    data: sales,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};

export const getSaleById = async (id) => {
  const sale = await prisma.sale.findFirst({
    where: { id, deleted_at: null },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      user: { select: { id: true, name: true } },
      shift: { select: { id: true, opened_at: true, closed_at: true } },
      currency: { select: { id: true, code: true, symbol: true, exchange_rate: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, name_ar: true, barcode: true, sku: true } },
        },
      },
      payments: {
        include: { currency: { select: { id: true, code: true, symbol: true } } },
      },
    },
  });
  if (!sale) throw new AppError('الفاتورة غير موجودة', 404);
  return sale;
};

export const createSale = async (data) => {
  const { items, payments, user_role, schedule_due_date, schedule_notes, created_by, ...saleData } = data;

  const totalDiscount = items.reduce((sum, i) => sum + (i.discount || 0), 0) + (saleData.discount_amount || 0);
  const itemSubtotal = items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);
  if (itemSubtotal > 0) {
    const discountPercent = (totalDiscount / itemSubtotal) * 100;
    const maxPercent = await getRoleDiscountLimit(user_role, saleData.branch_id);
    if (discountPercent > maxPercent) {
      throw new AppError(`حد الخصم المسموح لدورك هو ${maxPercent}%، الخصم الحالي ${Math.round(discountPercent)}%`, 403);
    }
  }

  const invoice_number = await generateInvoiceNumber(saleData.branch_id);

  const total = items.reduce((sum, item) => sum + item.total, 0);
  const paid_amount = payments ? payments.reduce((sum, p) => sum + p.amount, 0) : 0;
  const remaining = total - paid_amount;

  if (paid_amount >= total) {
    await checkStockAvailability(saleData.branch_id, items);
  }

  // Validate credit limit
  if (remaining > 0 && saleData.customer_id) {
    const customer = await prisma.customer.findFirst({
      where: { id: saleData.customer_id, deleted_at: null },
    });
    if (!customer) throw new AppError('العميل غير موجود', 404);
    const currentBalance = customer.balance || 0;
    const newBalance = currentBalance + remaining;
    if (customer.credit_limit > 0 && newBalance > customer.credit_limit) {
      throw new AppError(`تجاوز حد الائتمان المسموح (${customer.credit_limit.toLocaleString()} ﷼). الرصيد الحالي: ${currentBalance.toLocaleString()} ﷼، المتبقي: ${remaining.toLocaleString()} ﷼`, 400);
    }
  }

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        ...saleData,
        invoice_number,
        status: paid_amount > 0 ? 'completed' : 'draft',
        total,
        paid_amount,
        items: { create: items },
        payments: payments ? { create: payments } : undefined,
      },
      include: {
        customer: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        currency: { select: { id: true, code: true, symbol: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, name_ar: true, barcode: true } },
          },
        },
        payments: true,
      },
    });

    if (remaining > 0 && created.customer_id) {
      await tx.paymentSchedule.create({
        data: {
          sale_id: created.id,
          amount: remaining,
          due_date: schedule_due_date ? new Date(schedule_due_date) : null,
          notes: schedule_notes || null,
        },
      });
    }

    if (remaining > 0 && created.customer_id) {
      await tx.customer.update({
        where: { id: created.customer_id },
        data: { balance: { increment: remaining } },
      });
    }

    if (created.status === 'completed') {
      await tx.stockMovement.createMany({
        data: items.map((item) => ({
          branch_id: created.branch_id,
          product_id: item.product_id,
          type: 'sale',
          quantity: -item.quantity,
          reference_id: created.id,
          reference_type: 'sale',
        })),
      });
      await Promise.all(items.map((item) =>
        tx.inventoryBalance.updateMany({
          where: { branch_id: created.branch_id, product_id: item.product_id },
          data: { quantity: { increment: -item.quantity } },
        })
      ));
    }

    return created;
  }, { timeout: 30000 });

  audit('create_sale', 'sale', sale.id, {
    branch_id: sale.branch_id,
    user_id: created_by,
    metadata: { invoice_number: sale.invoice_number, total: sale.total, paid: paid_amount, remaining, status: sale.status },
  });

  return sale;
};

// ─── Held Sales ──────────────────────────────────────

export const holdSale = async (data) => {
  const { items, user_role, created_by, ...saleData } = data;

  const invoice_number = await generateInvoiceNumber(saleData.branch_id);

  const total = items.reduce((sum, item) => sum + item.total, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  const sale = await prisma.sale.create({
    data: {
      ...saleData,
      invoice_number,
      status: 'draft',
      subtotal: subtotal,
      total,
      paid_amount: 0,
      held_at: new Date(),
      items: { create: items },
    },
    include: {
      customer: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      currency: { select: { id: true, code: true, symbol: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, name_ar: true, barcode: true } },
        },
      },
    },
  });

  audit('hold_sale', 'sale', sale.id, {
    branch_id: sale.branch_id,
    user_id: saleData.user_id,
    metadata: { invoice_number: sale.invoice_number, total: sale.total, items_count: items.length },
  });

  return sale;
};

export const getHeldSales = async (branch_id) => {
  return prisma.sale.findMany({
    where: { branch_id, held_at: { not: null }, deleted_at: null },
    include: {
      customer: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      currency: { select: { id: true, code: true, symbol: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, name_ar: true, barcode: true } },
        },
      },
    },
    orderBy: { held_at: 'desc' },
  });
};

export const resumeSale = async (id, userId) => {
  const sale = await prisma.sale.findFirst({
    where: { id, held_at: { not: null }, deleted_at: null },
    include: {
      customer: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      currency: { select: { id: true, code: true, symbol: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, name_ar: true, barcode: true, selling_price: true } },
        },
      },
    },
  });
  if (!sale) throw new AppError('الفاتورة المعلقة غير موجودة', 404);

  const updated = await prisma.sale.update({
    where: { id },
    data: { held_at: null, deleted_at: new Date() },
    include: {
      customer: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      currency: { select: { id: true, code: true, symbol: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, name_ar: true, barcode: true, selling_price: true } },
        },
      },
    },
  });

  audit('resume_sale', 'sale', id, {
    branch_id: sale.branch_id,
    user_id: userId,
    metadata: { invoice_number: sale.invoice_number },
  });

  return updated;
};

export const updateSaleStatus = async (id, status, userId) => {
  const sale = await prisma.sale.findFirst({ where: { id, deleted_at: null } });
  if (!sale) throw new AppError('الفاتورة غير موجودة', 404);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.sale.update({
      where: { id },
      data: { status },
      include: {
        items: true,
        payments: true,
        customer: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        currency: { select: { id: true, code: true, symbol: true } },
      },
    });

    if (status === 'completed' && sale.status !== 'completed') {
      const policy = await getStockPolicy(result.branch_id);
      if (policy === 'block') {
        for (const item of result.items) {
          const balance = await prisma.inventoryBalance.findFirst({
            where: { branch_id: result.branch_id, product_id: item.product_id },
          });
          const currentQty = balance?.quantity || 0;
          if (currentQty < item.quantity) {
            const product = await prisma.product.findUnique({
              where: { id: item.product_id },
              select: { name_ar: true, name: true },
            });
            throw new AppError(`الرصيد غير كافٍ للمنتج: ${product?.name_ar || product?.name || item.product_id}`, 400);
          }
        }
      }
      await tx.stockMovement.createMany({
        data: result.items.map((item) => ({
          branch_id: result.branch_id,
          product_id: item.product_id,
          type: 'sale',
          quantity: -item.quantity,
          reference_id: result.id,
          reference_type: 'sale',
        })),
      });
      await Promise.all(result.items.map((item) =>
        tx.inventoryBalance.updateMany({
          where: { branch_id: result.branch_id, product_id: item.product_id },
          data: { quantity: { increment: -item.quantity } },
        })
      ));
    }

    return result;
  }, { timeout: 30000 });

  audit('update_sale_status', 'sale', id, {
    branch_id: sale.branch_id,
    user_id: userId,
    metadata: { from: sale.status, to: status, invoice_number: sale.invoice_number },
  });

  return updated;
};

export const deleteSale = async (id, userId) => {
  const sale = await prisma.sale.findFirst({ where: { id, deleted_at: null } });
  if (!sale) throw new AppError('الفاتورة غير موجودة', 404);

  const result = await prisma.sale.update({
    where: { id },
    data: { deleted_at: new Date() },
  });

  audit('delete_sale', 'sale', id, {
    branch_id: sale.branch_id,
    user_id: userId,
    metadata: { invoice_number: sale.invoice_number, total: sale.total },
  });

  return result;
};

// ─── Sales Cancel ────────────────────────────────────

export const cancelSale = async (id, { reason, note, user_id }) => {
  const sale = await prisma.sale.findFirst({
    where: { id, deleted_at: null },
    include: { items: true },
  });
  if (!sale) throw new AppError('الفاتورة غير موجودة', 404);
  if (sale.status === 'cancelled') throw new AppError('الفاتورة ملغاة بالفعل', 400);
  if (sale.status === 'returned') throw new AppError('لا يمكن إلغاء فاتورة مرتجعة', 400);

  const user = await prisma.user.findUnique({ where: { id: user_id }, select: { role: true } });
  const needsReview = user && user.role !== 'admin' && user.role !== 'manager';

  const result = await prisma.$transaction(async (tx) => {
    if (sale.status === 'completed') {
      await tx.stockMovement.createMany({
        data: sale.items.map((item) => ({
          branch_id: sale.branch_id,
          product_id: item.product_id,
          type: 'adjustment',
          quantity: item.quantity,
          reference_id: sale.id,
          reference_type: 'sale_cancel',
          notes: `إلغاء فاتورة: ${reason}`,
        })),
      });
      await Promise.all(sale.items.map((item) =>
        tx.inventoryBalance.updateMany({
          where: { branch_id: sale.branch_id, product_id: item.product_id },
          data: { quantity: { increment: item.quantity } },
        })
      ));
    }

    return tx.sale.update({
      where: { id },
      data: {
        status: 'cancelled',
        notes: reason ? `${reason}${sale.notes ? ` | ${sale.notes}` : ''}` : sale.notes,
        cancellation_reason: reason,
        cancellation_note: note,
        cancelled_by: user_id,
        cancelled_at: new Date(),
        cancellation_status: needsReview ? 'pending_review' : 'approved',
        cancellation_reviewed_by: needsReview ? null : user_id,
        cancellation_reviewed_at: needsReview ? null : new Date(),
      },
      include: {
        customer: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, name_ar: true } } } },
        payments: true,
      },
    });
  }, { timeout: 30000 });

  audit('cancel_sale', 'sale', id, {
    branch_id: sale.branch_id,
    user_id,
    metadata: { invoice_number: sale.invoice_number, reason, previous_status: sale.status, total: sale.total },
  });

  return result;
};

export const reviewCancelSale = async (id, { action, note, reviewer_id }) => {
  const sale = await prisma.sale.findFirst({ where: { id, deleted_at: null } });
  if (!sale) throw new AppError('الفاتورة غير موجودة', 404);
  if (sale.status !== 'cancelled') throw new AppError('الفاتورة لم تُلغَ بعد', 400);
  if (sale.cancellation_status !== 'pending_review') throw new AppError('الإلغاء معتمد مسبقاً', 400);

  const status = action === 'approve' ? 'approved' : 'rejected';
  const result = await prisma.sale.update({
    where: { id },
    data: {
      cancellation_status: status,
      cancellation_reviewed_by: reviewer_id,
      cancellation_reviewed_at: new Date(),
      cancellation_note: note ? `${sale.cancellation_note || ''} | مراجعة: ${note}` : sale.cancellation_note,
    },
  });

  audit('review_cancel_sale', 'sale', id, {
    branch_id: sale.branch_id,
    user_id: reviewer_id,
    metadata: { invoice_number: sale.invoice_number, action, status },
  });

  return result;
};

// ─── Sales Return ────────────────────────────────────

export const returnSale = async (saleId, { returned_items, notes, user_id }) => {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, deleted_at: null },
    include: { items: true },
  });
  if (!sale) throw new AppError('الفاتورة غير موجودة', 404);
  if (sale.status === 'returned') throw new AppError('الفاتورة مرتجعة بالفعل', 400);

  const result = await prisma.$transaction(async (tx) => {
    const itemsToReturn = returned_items
      ? sale.items.filter((i) => returned_items.includes(i.id))
      : sale.items;

    await tx.stockMovement.createMany({
      data: itemsToReturn.map((item) => ({
        branch_id: sale.branch_id,
        product_id: item.product_id,
        type: 'return_sale',
        quantity: item.quantity,
        reference_id: sale.id,
        reference_type: 'sale_return',
        notes,
      })),
    });
    await Promise.all(itemsToReturn.map((item) =>
      tx.inventoryBalance.updateMany({
        where: { branch_id: sale.branch_id, product_id: item.product_id },
        data: { quantity: { increment: item.quantity } },
      })
    ));

    return tx.sale.update({
      where: { id: saleId },
      data: { status: 'returned', notes: notes || sale.notes },
      include: {
        customer: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, name_ar: true } } } },
        payments: true,
      },
    });
  }, { timeout: 30000 });

  audit('return_sale', 'sale', saleId, {
    branch_id: sale.branch_id,
    user_id,
    metadata: { invoice_number: sale.invoice_number, items_count: result.items.length, notes },
  });

  return result;
};

// ─── Payment Schedules ───────────────────────────────

export const getPaymentSchedules = async ({ sale_id, customer_id, status, branch_id, page = '1', limit = '50' }) => {
  const where = { deleted_at: null, ...(status && { status }) };

  if (sale_id) where.sale_id = sale_id;
  if (customer_id) where.sale = { customer_id, deleted_at: null, ...(branch_id && { branch_id }) };
  if (branch_id && !customer_id) where.sale = { branch_id, deleted_at: null };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  const [schedules, total] = await Promise.all([
    prisma.paymentSchedule.findMany({
      where,
      include: {
        sale: {
          select: {
            id: true, invoice_number: true, total: true, branch_id: true,
            customer: { select: { id: true, name: true, phone: true } },
            currency: { select: { id: true, code: true, symbol: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.paymentSchedule.count({ where }),
  ]);

  return { data: schedules, meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) } };
};

export const paySchedule = async (scheduleId, data) => {
  const schedule = await prisma.paymentSchedule.findFirst({
    where: { id: scheduleId, deleted_at: null },
    include: { sale: { select: { id: true, customer_id: true, branch_id: true } } },
  });
  if (!schedule) throw new AppError('الجدول غير موجود', 404);
  if (schedule.status === 'paid') throw new AppError('تم دفع هذا الجدول بالفعل', 400);
  if (schedule.status === 'cancelled') throw new AppError('هذا الجدول ملغي', 400);

  const paymentAmount = data.amount;
  const newPaid = schedule.paid_amount + paymentAmount;
  const newStatus = newPaid >= schedule.amount ? 'paid' : 'partial';

  const result = await prisma.$transaction(async (tx) => {
    await tx.salePayment.create({
      data: {
        sale_id: schedule.sale_id,
        method: data.method || 'cash',
        amount: paymentAmount,
        currency_id: data.currency_id,
        exchange_rate: data.exchange_rate || 1,
      },
    });

    await tx.sale.update({
      where: { id: schedule.sale_id },
      data: { paid_amount: { increment: paymentAmount } },
    });

    const updated = await tx.paymentSchedule.update({
      where: { id: scheduleId },
      data: {
        paid_amount: newPaid,
        status: newStatus,
      },
    });

    if (schedule.sale.customer_id) {
      await tx.customer.update({
        where: { id: schedule.sale.customer_id },
        data: { balance: { decrement: paymentAmount } },
      });
    }

    return updated;
  }, { timeout: 15000 });

  audit('pay_schedule', 'payment_schedule', scheduleId, {
    branch_id: schedule.sale.branch_id,
    user_id: data.user_id,
    metadata: { sale_id: schedule.sale_id, amount: paymentAmount, status: newStatus },
  });

  return result;
};
