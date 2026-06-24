import { describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma } from '../setup.js';
import { resetMocks } from '../helpers.js';

const UUID = {
  branch: '00000000-0000-4000-a000-000000000001',
  product1: '00000000-0000-4000-a000-000000000010',
  product2: '00000000-0000-4000-a000-000000000011',
  customer1: '00000000-0000-4000-a000-000000000020',
  supplier1: '00000000-0000-4000-a000-000000000030',
  safe1: '00000000-0000-4000-a000-000000000040',
  user1: '00000000-0000-4000-a000-000000000050',
};

beforeEach(() => {
  resetMocks();
});

describe('Reports Service - Slow Moving Products', () => {
  it('should calculate turnover rate correctly', async () => {
    const { getSlowMovingProducts } = await import('../../src/modules/reports/reports.service.js');
    const mockProducts = [
      {
        id: UUID.product1, name_ar: 'منتج أ', is_active: true,
        inventory_balances: [{ quantity: 100, warehouse: { name_ar: 'مخزن' } }],
        sale_items: [{ quantity: 5, total: 2500 }],
      },
    ];
    mockPrisma.product.findMany.mockResolvedValue(mockProducts);

    const result = await getSlowMovingProducts({ months: 3 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].current_stock).toBe(100);
    expect(result.data[0].sold_quantity).toBe(5);
    expect(result.data[0].turnover_rate).toBe(0.05);
    expect(result.meta.total).toBe(1);
  });

  it('should sort asc by turnover rate (slowest first)', async () => {
    const { getSlowMovingProducts } = await import('../../src/modules/reports/reports.service.js');
    mockPrisma.product.findMany.mockResolvedValue([
      { id: UUID.product1, name_ar: 'سريع', is_active: true, inventory_balances: [{ quantity: 10 }], sale_items: [{ quantity: 50, total: 50000 }] },
      { id: UUID.product2, name_ar: 'بطيء', is_active: true, inventory_balances: [{ quantity: 100 }], sale_items: [{ quantity: 2, total: 1000 }] },
    ]);

    const result = await getSlowMovingProducts({ months: 3 });

    expect(result.data[0].turnover_rate).toBeLessThan(result.data[1].turnover_rate);
    expect(result.data[0].name_ar).toBe('بطيء');
  });

  it('should filter out products with zero stock', async () => {
    const { getSlowMovingProducts } = await import('../../src/modules/reports/reports.service.js');
    mockPrisma.product.findMany.mockResolvedValue([
      { id: UUID.product1, name_ar: 'متوفر', is_active: true, inventory_balances: [{ quantity: 50 }], sale_items: [] },
      { id: UUID.product2, name_ar: 'منتهي', is_active: true, inventory_balances: [{ quantity: 0 }], sale_items: [{ quantity: 10, total: 5000 }] },
    ]);

    const result = await getSlowMovingProducts({ months: 3 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name_ar).toBe('متوفر');
  });
});

describe('Reports Service - Customer Report', () => {
  it('should aggregate customer sales data', async () => {
    const { getCustomerReport } = await import('../../src/modules/reports/reports.service.js');
    mockPrisma.customer.findMany.mockResolvedValue([{
      id: UUID.customer1, name: 'عميل', phone: '777', balance: 5000, credit_limit: 50000, opening_balance: 0,
      sales: [
        { total: 10000, paid_amount: 5000, discount_amount: 500 },
        { total: 20000, paid_amount: 20000, discount_amount: 0 },
      ],
    }]);

    mockPrisma.customer.count.mockResolvedValue(1);
    const result = await getCustomerReport({});

    expect(result.data).toHaveLength(1);
    expect(result.data[0].total_sales).toBe(30000);
    expect(result.data[0].total_paid).toBe(25000);
    expect(result.data[0].invoice_count).toBe(2);
    expect(result.data[0].balance).toBe(5000);
    expect(result.meta.total).toBe(1);
  });
});

describe('Reports Service - Supplier Report', () => {
  it('should aggregate supplier purchase data', async () => {
    const { getSupplierReport } = await import('../../src/modules/reports/reports.service.js');
    mockPrisma.supplier.findMany.mockResolvedValue([{
      id: UUID.supplier1, name: 'مورد', phone: '777', balance: 15000, opening_balance: 0,
      purchases: [{ total: 50000, paid_amount: 35000 }],
    }]);

    mockPrisma.supplier.count.mockResolvedValue(1);
    const result = await getSupplierReport({});

    expect(result.data).toHaveLength(1);
    expect(result.data[0].total_purchases).toBe(50000);
    expect(result.data[0].total_paid).toBe(35000);
    expect(result.data[0].balance).toBe(15000);
    expect(result.meta.total).toBe(1);
  });
});

describe('Reports Service - Safe Report', () => {
  it('should calculate cash in/out totals', async () => {
    const { getSafeReport } = await import('../../src/modules/reports/reports.service.js');
    mockPrisma.safeBox.findMany.mockResolvedValue([{
      id: UUID.safe1, name: 'الخزنة', name_ar: 'الخزنة', balance: 500000,
      currency: { code: 'YER', symbol: '﷼' },
      movements: [
        { type: 'cash_in', amount: 100000 },
        { type: 'cash_in', amount: 50000 },
        { type: 'cash_out', amount: 30000 },
      ],
    }]);

    const result = await getSafeReport({});

    expect(result).toHaveLength(1);
    expect(result[0].total_cash_in).toBe(150000);
    expect(result[0].total_cash_out).toBe(30000);
    expect(result[0].balance).toBe(500000);
  });
});

describe('Reports Service - Expense Report', () => {
  it('should group by category by default', async () => {
    const { getExpenseReport } = await import('../../src/modules/reports/reports.service.js');
    const testExpenses1 = [
      { amount: 50000, category: 'إيجار', payment_source: 'safe', expense_category: { name_ar: 'إيجار' }, user: { name: 'أحمد' }, currency: { code: 'YER' } },
      { amount: 15000, category: 'كهرباء', payment_source: 'direct', expense_category: { name_ar: 'كهرباء' }, user: { name: 'أحمد' }, currency: { code: 'YER' } },
      { amount: 50000, category: 'إيجار', payment_source: 'safe', expense_category: { name_ar: 'إيجار' }, user: { name: 'أحمد' }, currency: { code: 'YER' } },
    ];
    mockPrisma.expense.findMany
      .mockResolvedValueOnce(testExpenses1)
      .mockResolvedValueOnce(testExpenses1);
    mockPrisma.expense.count.mockResolvedValue(3);

    const result = await getExpenseReport({ group_by: 'category' });

    expect(result.total_expenses).toBe(115000);
    expect(result.total_count).toBe(3);
    expect(result.groups).toHaveLength(2);
    const rentGroup = result.groups.find(g => g.label === 'إيجار');
    expect(rentGroup.total).toBe(100000);
    expect(rentGroup.count).toBe(2);
  });

  it('should break down by payment source', async () => {
    const { getExpenseReport } = await import('../../src/modules/reports/reports.service.js');
    const testExpenses = [
      { amount: 50000, category: 'إيجار', payment_source: 'safe', expense_category: { name_ar: 'إيجار' }, user: { name: 'أحمد' }, currency: { code: 'YER' } },
      { amount: 15000, category: 'قرطاسية', payment_source: 'direct', expense_category: { name_ar: 'قرطاسية' }, user: { name: 'أحمد' }, currency: { code: 'YER' } },
      { amount: 20000, category: 'نقل', payment_source: 'cash_register', expense_category: { name_ar: 'نقل' }, user: { name: 'أحمد' }, currency: { code: 'YER' } },
    ];
    mockPrisma.expense.findMany
      .mockResolvedValueOnce(testExpenses)
      .mockResolvedValueOnce(testExpenses);
    mockPrisma.expense.count.mockResolvedValue(3);

    const result = await getExpenseReport({});

    expect(result.by_payment_source.safe).toBe(50000);
    expect(result.by_payment_source.direct).toBe(15000);
    expect(result.by_payment_source.cash_register).toBe(20000);
  });
});
