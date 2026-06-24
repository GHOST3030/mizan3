import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { mockPrisma, authHeaders } from '../setup.js';
import { resetMocks } from '../helpers.js';

const UUID = {
  product1: '00000000-0000-4000-a000-000000000001',
  product2: '00000000-0000-4000-a000-000000000002',
  customer1: '00000000-0000-4000-a000-000000000010',
  supplier1: '00000000-0000-4000-a000-000000000020',
  safe1: '00000000-0000-4000-a000-000000000030',
  user1: '00000000-0000-4000-a000-000000000040',
  sale1: '00000000-0000-4000-a000-000000000050',
  sale2: '00000000-0000-4000-a000-000000000051',
  expense1: '00000000-0000-4000-a000-000000000060',
  expense2: '00000000-0000-4000-a000-000000000061',
  cat1: '00000000-0000-4000-a000-000000000070',
  cat2: '00000000-0000-4000-a000-000000000071',
};

beforeEach(() => {
  resetMocks();
});

describe('Reports - Slow Moving Products', () => {
  const mockProducts = [
    {
      id: UUID.product1, name: 'Product A', name_ar: 'منتج أ', barcode: '12345', is_active: true,
      inventory_balances: [{ quantity: 100, warehouse: { name_ar: 'مخزن رئيسي' } }],
      sale_items: [{ quantity: 2, total: 1000 }, { quantity: 3, total: 1500 }],
    },
    {
      id: UUID.product2, name: 'Product B', name_ar: 'منتج ب', barcode: '67890', is_active: true,
      inventory_balances: [{ quantity: 10, warehouse: { name_ar: 'مخزن رئيسي' } }],
      sale_items: [{ quantity: 50, total: 25000 }],
    },
  ];

  describe('GET /api/reports/products/slow-moving', () => {
    it('should return slow-moving products sorted by turnover rate', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      const res = await request(app)
        .get('/api/reports/products/slow-moving?months=3')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].turnover_rate).toBeLessThanOrEqual(res.body.data[1].turnover_rate);
      expect(res.body.data[0].current_stock).toBe(100);
      expect(res.body.data[0].sold_quantity).toBe(5);
      expect(res.body.meta.total).toBe(2);
    });

    it('should filter out products with zero stock', async () => {
      const withZeroStock = [...mockProducts, { id: 'prod-003', name: 'Product C', name_ar: 'منتج ج', inventory_balances: [], sale_items: [] }];
      mockPrisma.product.findMany.mockResolvedValue(withZeroStock);

      const res = await request(app)
        .get('/api/reports/products/slow-moving')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/reports/products/slow-moving');
      expect(res.status).toBe(401);
    });
  });
});

describe('Reports - Customer Detailed', () => {
  const mockCustomers = [{
    id: UUID.customer1, name: 'عميل 1', phone: '777777777', balance: 10000, credit_limit: 50000, opening_balance: 0,
    sales: [
      { id: UUID.sale1, total: 15000, paid_amount: 10000, discount_amount: 500, created_at: new Date(), invoice_number: 'INV-001' },
      { id: UUID.sale2, total: 8000, paid_amount: 8000, discount_amount: 0, created_at: new Date(), invoice_number: 'INV-002' },
    ],
  }];

  describe('GET /api/reports/customers/detailed', () => {
    it('should return customer report with sales totals', async () => {
      mockPrisma.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrisma.customer.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/reports/customers/detailed')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data[0].total_sales).toBe(23000);
      expect(res.body.data[0].total_paid).toBe(18000);
      expect(res.body.data[0].invoice_count).toBe(2);
      expect(res.body.meta.total).toBe(1);
    });

    it('should handle empty customer list', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.customer.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/reports/customers/detailed')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
    });
  });
});

describe('Reports - Supplier Detailed', () => {
  const mockSuppliers = [{
    id: UUID.supplier1, name: 'مورد 1', phone: '777777777', balance: 20000, opening_balance: 0,
    purchases: [{ id: 'purch-001', total: 50000, paid_amount: 30000, discount_amount: 0, created_at: new Date(), invoice_number: 'PINV-001' }],
  }];

  describe('GET /api/reports/suppliers/detailed', () => {
    it('should return supplier report with purchase totals', async () => {
      mockPrisma.supplier.findMany.mockResolvedValue(mockSuppliers);
      mockPrisma.supplier.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/reports/suppliers/detailed')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data[0].total_purchases).toBe(50000);
      expect(res.body.data[0].total_paid).toBe(30000);
      expect(res.body.meta.total).toBe(1);
    });
  });
});

describe('Reports - Safe Detailed', () => {
  const mockSafes = [{
    id: UUID.safe1, name: 'الخزنة الرئيسية', name_ar: 'الخزنة الرئيسية', balance: 500000,
    currency: { code: 'YER', symbol: '﷼' },
    movements: [
      { id: 'mov-001', type: 'cash_in', amount: 100000, created_at: new Date() },
      { id: 'mov-002', type: 'cash_out', amount: 50000, created_at: new Date() },
    ],
  }];

  describe('GET /api/reports/safe/detailed', () => {
    it('should return safe report with movements', async () => {
      mockPrisma.safeBox.findMany.mockResolvedValue(mockSafes);

      const res = await request(app)
        .get('/api/reports/safe/detailed')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body[0].total_cash_in).toBe(100000);
      expect(res.body[0].total_cash_out).toBe(50000);
    });
  });
});

describe('Reports - Expense Detailed', () => {
  const mockExpenses = [
    {
      id: UUID.expense1, amount: 50000, category: 'إيجار', payment_source: 'safe', expense_date: new Date(),
      expense_category: { id: UUID.cat1, name: 'Rent', name_ar: 'إيجار' },
      user: { id: UUID.user1, name: 'أحمد' }, currency: { code: 'YER', symbol: '﷼' },
    },
    {
      id: UUID.expense2, amount: 15000, category: 'كهرباء', payment_source: 'direct', expense_date: new Date(),
      expense_category: { id: UUID.cat2, name: 'Electricity', name_ar: 'كهرباء' },
      user: { id: UUID.user1, name: 'أحمد' }, currency: { code: 'YER', symbol: '﷼' },
    },
  ];

  describe('GET /api/reports/expenses/detailed', () => {
    it('should return expense report grouped by category', async () => {
      mockPrisma.expense.findMany
        .mockResolvedValueOnce(mockExpenses)
        .mockResolvedValueOnce(mockExpenses);
      mockPrisma.expense.count.mockResolvedValue(2);

      const res = await request(app)
        .get('/api/reports/expenses/detailed')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.total_expenses).toBe(65000);
      expect(res.body.total_count).toBe(2);
      expect(res.body.groups).toHaveLength(2);
      expect(res.body.groups[0].label).toBe('إيجار');
    });

    it('should group expenses by user', async () => {
      mockPrisma.expense.findMany
        .mockResolvedValueOnce(mockExpenses)
        .mockResolvedValueOnce(mockExpenses);
      mockPrisma.expense.count.mockResolvedValue(2);

      const res = await request(app)
        .get('/api/reports/expenses/detailed?group_by=user')
        .set(authHeaders());

      expect(res.status).toBe(200);
    });

    it('should break down by payment source', async () => {
      mockPrisma.expense.findMany
        .mockResolvedValueOnce(mockExpenses)
        .mockResolvedValueOnce(mockExpenses);
      mockPrisma.expense.count.mockResolvedValue(2);

      const res = await request(app)
        .get('/api/reports/expenses/detailed')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.by_payment_source.safe).toBe(50000);
      expect(res.body.by_payment_source.direct).toBe(15000);
    });
  });
});

describe('Reports - Dashboard', () => {
  const zeroAgg = { _count: { id: 0 }, _sum: { total: 0, discount_amount: 0, paid_amount: 0, tax_amount: 0 } };

  const saleAggCalls = [
    { _count: { id: 15 }, _sum: { total: 150000, discount_amount: 5000, paid_amount: 140000, tax_amount: 0 } },
    { _count: { id: 80 }, _sum: { total: 800000, discount_amount: 20000, paid_amount: 0, tax_amount: 0 } },
    { _count: { id: 300 }, _sum: { total: 3200000, discount_amount: 80000, paid_amount: 0, tax_amount: 0 } },
  ];

  function setupDashboardMocks() {
    mockPrisma.saleItem.groupBy.mockResolvedValue([]);
    mockPrisma.sale.findMany.mockResolvedValue([]);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 25000 }, _count: { id: 3 } });
    mockPrisma.expense.count.mockResolvedValue(2);
    mockPrisma.shift.count.mockResolvedValue(1);
    mockPrisma.customer.count.mockResolvedValue(50);
    mockPrisma.supplier.count.mockResolvedValue(20);
    mockPrisma.safeBox.findMany.mockResolvedValue([
      { id: UUID.safe1, name: 'الخزنة', name_ar: 'الخزنة', balance: 500000, currency: { code: 'YER', symbol: '﷼' } },
    ]);
    mockPrisma.sale.count.mockResolvedValue(0);
    mockPrisma.salePayment.groupBy.mockResolvedValue([]);
  }

  describe('GET /api/reports/dashboard', () => {
    it('should return all dashboard stats', async () => {
      setupDashboardMocks();
      mockPrisma.sale.aggregate
        .mockResolvedValueOnce(saleAggCalls[0])
        .mockResolvedValue(zeroAgg);

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.today.sales_count).toBe(15);
      expect(res.body.today.total).toBe(150000);
    });

    it('should include expense and safe stats', async () => {
      setupDashboardMocks();
      mockPrisma.sale.aggregate.mockResolvedValue(zeroAgg);

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.today_expenses.total).toBe(25000);
      expect(res.body.pending_expenses).toBe(2);
      expect(res.body.active_shifts).toBe(1);
      expect(res.body.total_customers).toBe(50);
      expect(res.body.total_suppliers).toBe(20);
      expect(res.body.safe_balances).toHaveLength(1);
    });
  });
});
