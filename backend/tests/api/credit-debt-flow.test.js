import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, UUID, testAdminUser } from '../setup.js';
import { resetMocks } from '../helpers.js';
import * as salesService from '../../src/modules/sales/sales.service.js';

const CUSTOMER_ID = '00000000-0000-4000-a000-000000000100';

describe('Credit/Debt System — Full Flow', () => {
  beforeEach(() => {
    resetMocks();

    // ── Number sequence (called via getNextNumber in $transaction) ──
    mockPrisma.numberSequence.findUnique.mockResolvedValue(null);
    mockPrisma.numberSequence.create.mockResolvedValue({
      id: 'seq-1', branch_id: UUID.branch, type: 'sale',
      prefix: 'INV', next_number: 1, pad_length: 6,
    });
    mockPrisma.numberSequence.update.mockResolvedValue({
      id: 'seq-1', prefix: 'INV', next_number: 2, pad_length: 6,
    });

    // Default: customer exists with no balance
    mockPrisma.customer.findFirst.mockResolvedValue({
      id: CUSTOMER_ID,
      name: 'عميل 1',
      balance: 0,
      credit_limit: 50000,
      opening_balance: 0,
      branch_id: UUID.branch,
    });

    // Default: product exists and has stock
    mockPrisma.product.findFirst.mockResolvedValue({
      id: 'product-1', name: 'منتج 1', track_serial: false,
    });
    mockPrisma.inventoryBalance.findFirst.mockResolvedValue({
      id: 'inv-1', quantity: 100, product_id: 'product-1', warehouse_id: UUID.warehouse,
    });
    mockPrisma.inventoryBalance.findMany.mockResolvedValue([{
      product_id: 'product-1', quantity: 100,
    }]);
    mockPrisma.saleItem.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.salePayment.create.mockImplementation(({ data }) => Promise.resolve({ id: 'pay-1', ...data }));
    mockPrisma.stockMovement.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.inventoryBalance.update.mockResolvedValue({});
    mockPrisma.inventoryBalance.updateMany.mockResolvedValue({ count: 1 });
  });

  // ─── 1. Pure Credit Sale ────────────────────────────
  it('should create PaymentSchedule and increment customer balance on full credit sale', async () => {
    let createdPaymentSchedule = null;
    let updatedCustomer = null;

    mockPrisma.sale.create.mockResolvedValue({
      id: 'sale-1', invoice_number: 'INV-0001', total: 1000, paid_amount: 0, status: 'draft', customer_id: CUSTOMER_ID,
    });

    mockPrisma.paymentSchedule.create.mockImplementation(({ data }) => {
      createdPaymentSchedule = data;
      return Promise.resolve({ id: 'ps-1', ...data, status: 'pending' });
    });

    mockPrisma.customer.update.mockImplementation(({ data }) => {
      updatedCustomer = data;
      return Promise.resolve({ id: CUSTOMER_ID, ...data });
    });

    await salesService.createSale({
      branch_id: UUID.branch,
      customer_id: CUSTOMER_ID,
      user_id: testAdminUser.userId,
      items: [{ product_id: 'product-1', quantity: 1, unit_price: 1000, total: 1000, warehouse_id: UUID.warehouse }],
      payments: [],
    });

    expect(createdPaymentSchedule).not.toBeNull();
    expect(createdPaymentSchedule.amount).toBe(1000);
    expect(createdPaymentSchedule.sale_id).toBe('sale-1');
    // paymentSchedule.create is called; status is set by Prisma schema default ('pending')
    expect(mockPrisma.paymentSchedule.create).toHaveBeenCalledTimes(1);

    expect(updatedCustomer).not.toBeNull();
    expect(updatedCustomer.balance.increment).toBe(1000);
  });

  // ─── 2. Full Payment (No Credit) ────────────────────
  it('should NOT create PaymentSchedule or update balance on full cash sale', async () => {
    mockPrisma.sale.create.mockResolvedValue({
      id: 'sale-2', invoice_number: 'INV-0002', total: 500, paid_amount: 500, status: 'completed',
    });

    await salesService.createSale({
      branch_id: UUID.branch,
      customer_id: CUSTOMER_ID,
      user_id: testAdminUser.userId,
      items: [{ product_id: 'product-1', quantity: 1, unit_price: 500, total: 500, warehouse_id: UUID.warehouse }],
      payments: [{ method: 'cash', amount: 500, currency_id: 'cur-1', exchange_rate: 1 }],
    });

    expect(mockPrisma.paymentSchedule.create).not.toHaveBeenCalled();
    expect(mockPrisma.customer.update).not.toHaveBeenCalled();
  });

  // ─── 3. Partial Payment + Credit ────────────────────
  it('should create PaymentSchedule for remaining amount on partial payment', async () => {
    let createdPaymentSchedule = null;
    let updatedCustomer = null;

    mockPrisma.sale.create.mockResolvedValue({
      id: 'sale-3', invoice_number: 'INV-0003', total: 1000, paid_amount: 300, status: 'completed', customer_id: CUSTOMER_ID,
    });

    mockPrisma.paymentSchedule.create.mockImplementation(({ data }) => {
      createdPaymentSchedule = data;
      return Promise.resolve({ id: 'ps-2', ...data, status: 'pending' });
    });

    mockPrisma.customer.update.mockImplementation(({ data }) => {
      updatedCustomer = data;
      return Promise.resolve({});
    });

    await salesService.createSale({
      branch_id: UUID.branch,
      customer_id: CUSTOMER_ID,
      user_id: testAdminUser.userId,
      items: [{ product_id: 'product-1', quantity: 1, unit_price: 1000, total: 1000, warehouse_id: UUID.warehouse }],
      payments: [{ method: 'cash', amount: 300, currency_id: 'cur-1', exchange_rate: 1 }],
    });

    expect(createdPaymentSchedule).not.toBeNull();
    expect(createdPaymentSchedule.amount).toBe(700);
    expect(updatedCustomer.balance.increment).toBe(700);
  });

  // ─── 4. Credit Limit Validation ─────────────────────
  it('should reject sale exceeding credit limit', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({
      id: CUSTOMER_ID, name: 'عميل 1',
      balance: 45000,
      credit_limit: 50000,
    });
    mockPrisma.sale.create.mockResolvedValue({
      id: 'sale-4', total: 10000, paid_amount: 0,
    });

    await expect(salesService.createSale({
      branch_id: UUID.branch,
      customer_id: CUSTOMER_ID,
      user_id: testAdminUser.userId,
      items: [{ product_id: 'product-1', quantity: 1, unit_price: 10000, total: 10000, warehouse_id: UUID.warehouse }],
      payments: [],
    })).rejects.toThrow(/ائتمان|credit/i);
  });

  // ─── 5. Sale Without Customer (No Credit) ───────────
  it('should not create schedule or update balance when no customer', async () => {
    mockPrisma.sale.create.mockResolvedValue({
      id: 'sale-5', invoice_number: 'INV-0005', total: 500, paid_amount: 0, status: 'draft',
    });

    await salesService.createSale({
      branch_id: UUID.branch,
      user_id: testAdminUser.userId,
      items: [{ product_id: 'product-1', quantity: 1, unit_price: 500, total: 500, warehouse_id: UUID.warehouse }],
      payments: [],
    });

    expect(mockPrisma.paymentSchedule.create).not.toHaveBeenCalled();
    expect(mockPrisma.customer.update).not.toHaveBeenCalled();
  });

  // ─── 6. PaySchedule: Full Payment ───────────────────
  it('should decrement customer balance and mark schedule as paid on full collection', async () => {
    mockPrisma.paymentSchedule.findFirst.mockResolvedValue({
      id: 'ps-1', sale_id: 'sale-1', amount: 1000, paid_amount: 0, status: 'pending',
      sale: { id: 'sale-1', customer_id: CUSTOMER_ID, total: 1000, paid_amount: 0, branch_id: UUID.branch, currency_id: 'cur-1' },
      due_date: null,
    });

    let updatedSchedule = null;
    let updatedCustomerBalance = null;

    mockPrisma.paymentSchedule.update.mockImplementation(({ data }) => {
      updatedSchedule = data;
      return Promise.resolve({ id: 'ps-1', ...data });
    });

    mockPrisma.sale.update.mockResolvedValue({});
    mockPrisma.salePayment.create.mockResolvedValue({ id: 'pay-collect-1' });

    mockPrisma.customer.update.mockImplementation(({ data }) => {
      updatedCustomerBalance = data;
      return Promise.resolve({});
    });

    await salesService.paySchedule('ps-1', {
      amount: 1000, method: 'cash', currency_id: 'cur-1', exchange_rate: 1,
      user_id: testAdminUser.userId, branch_id: UUID.branch,
    });

    expect(updatedSchedule).not.toBeNull();
    expect(updatedSchedule.paid_amount).toBe(1000);
    expect(updatedSchedule.status).toBe('paid');
    expect(updatedCustomerBalance).not.toBeNull();
    expect(updatedCustomerBalance.balance.decrement).toBe(1000);
  });

  // ─── 7. PaySchedule: Partial Payment ────────────────
  it('should mark schedule as partial on partial collection', async () => {
    mockPrisma.paymentSchedule.findFirst.mockResolvedValue({
      id: 'ps-2', sale_id: 'sale-2', amount: 1000, paid_amount: 0, status: 'pending',
      sale: { id: 'sale-2', customer_id: CUSTOMER_ID, total: 1000, paid_amount: 0, branch_id: UUID.branch, currency_id: 'cur-1' },
      due_date: null,
    });

    let updatedSchedule = null;
    mockPrisma.paymentSchedule.update.mockImplementation(({ data }) => {
      updatedSchedule = data;
      return Promise.resolve({});
    });
    mockPrisma.salePayment.create.mockResolvedValue({});
    mockPrisma.sale.update.mockResolvedValue({});
    mockPrisma.customer.update.mockResolvedValue({});

    await salesService.paySchedule('ps-2', {
      amount: 400, method: 'card', currency_id: 'cur-1', exchange_rate: 1,
      user_id: testAdminUser.userId, branch_id: UUID.branch,
    });

    expect(updatedSchedule.paid_amount).toBe(400);
    expect(updatedSchedule.status).toBe('partial');
  });

  // ─── 8. Balance Zero After Full Payment ─────────────
  it('should bring balance to zero when paying remaining debt', async () => {
    mockPrisma.paymentSchedule.findFirst.mockResolvedValue({
      id: 'ps-3', sale_id: 'sale-3', amount: 1000, paid_amount: 0, status: 'pending',
      sale: { id: 'sale-3', customer_id: CUSTOMER_ID, total: 1000, paid_amount: 0, branch_id: UUID.branch, currency_id: 'cur-1' },
      due_date: null,
    });

    let customerUpdateData = null;
    mockPrisma.customer.update.mockImplementation(({ data }) => {
      customerUpdateData = data;
      return Promise.resolve({});
    });
    mockPrisma.paymentSchedule.update.mockResolvedValue({ paid_amount: 1000, status: 'paid' });
    mockPrisma.salePayment.create.mockResolvedValue({});
    mockPrisma.sale.update.mockResolvedValue({});

    await salesService.paySchedule('ps-3', {
      amount: 1000, method: 'cash', currency_id: 'cur-1', exchange_rate: 1,
      user_id: testAdminUser.userId, branch_id: UUID.branch,
    });

    expect(customerUpdateData.balance.decrement).toBe(1000);
  });
});
