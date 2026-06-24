import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { mockPrisma, authHeaders, UUID as setupUUID, testAdminUser, testManagerUser, testAccountantUser, testCashierUser } from '../setup.js';
import { resetMocks } from '../helpers.js';

const { hasPermission } = await import('../../src/services/permission.service.js');

const UUID = {
  branchA: '00000000-0000-4000-a000-000000000010',
  branchB: '00000000-0000-4000-a000-000000000099',
  safe1: '00000000-0000-4000-a000-000000000030',
};

const SUPER = { userId: setupUUID.superAdmin, role: 'super_admin', branchId: UUID.branchA };

const otherBranchManager = { userId: '00000000-0000-4000-a000-000000000777', role: 'manager', branchId: UUID.branchB };

const zeroAgg = { _count: { id: 0 }, _sum: { total: 0, discount_amount: 0, paid_amount: 0, tax_amount: 0 } };

function setupDashboardMocks() {
  mockPrisma.sale.aggregate.mockResolvedValue(zeroAgg);
  mockPrisma.saleItem.groupBy.mockResolvedValue([]);
  mockPrisma.sale.findMany.mockResolvedValue([]);
  mockPrisma.product.findMany.mockResolvedValue([]);
  mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 }, _count: { id: 0 } });
  mockPrisma.expense.count.mockResolvedValue(0);
  mockPrisma.shift.count.mockResolvedValue(0);
  mockPrisma.customer.count.mockResolvedValue(0);
  mockPrisma.supplier.count.mockResolvedValue(0);
  mockPrisma.safeBox.findMany.mockResolvedValue([]);
  mockPrisma.sale.count.mockResolvedValue(0);
  mockPrisma.salePayment.groupBy.mockResolvedValue([]);
}

beforeEach(() => {
  resetMocks();
  hasPermission.mockReset();
  hasPermission.mockResolvedValue(true);
});

describe('G1: Financial Visibility — Dashboard Access Control', () => {

  describe('Unauthorized Access', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/reports/dashboard');
      expect(res.status).toBe(401);
    });

    it('should return 401 with malformed token', async () => {
      const res = await request(app)
        .get('/api/reports/dashboard')
        .set({ Authorization: 'Bearer invalid-token' });
      expect(res.status).toBe(401);
    });
  });

  describe('Permission Denial (403)', () => {
    it('should return 403 when user lacks reporting:view_reports', async () => {
      hasPermission.mockImplementation(async (_uid, perm) => perm !== 'reporting:view_reports');

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(403);
    });

    it('should return 403 for cashier without reporting:view_reports', async () => {
      hasPermission.mockImplementation(async (_uid, perm) => perm !== 'reporting:view_reports');

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders(testCashierUser));

      expect(res.status).toBe(403);
    });
  });

  describe('Permission Granted (200)', () => {
    it('should return 200 for admin with permission', async () => {
      setupDashboardMocks();

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
    });

    it('should return 200 for manager with permission', async () => {
      setupDashboardMocks();

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(200);
    });

    it('should return 200 for accountant with permission', async () => {
      setupDashboardMocks();

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders(testAccountantUser));

      expect(res.status).toBe(200);
    });

    it('should return 200 for super_admin bypassing permission check', async () => {
      hasPermission.mockResolvedValue(false);
      setupDashboardMocks();

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders(SUPER));

      expect(res.status).toBe(200);
    });
  });

  describe('Dashboard Response Structure', () => {
    it('should return all expected dashboard fields', async () => {
      setupDashboardMocks();

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('today');
      expect(res.body).toHaveProperty('week');
      expect(res.body).toHaveProperty('month');
      expect(res.body).toHaveProperty('today_expenses');
      expect(res.body).toHaveProperty('pending_expenses');
      expect(res.body).toHaveProperty('active_shifts');
      expect(res.body).toHaveProperty('total_customers');
      expect(res.body).toHaveProperty('total_suppliers');
      expect(res.body).toHaveProperty('safe_balances');
      expect(res.body).toHaveProperty('recent_sales');
      expect(res.body).toHaveProperty('low_stock_products');
      expect(res.body).toHaveProperty('summary');
    });

    it('should return numeric values in today totals', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({ _count: { id: 5 }, _sum: { total: 150000, discount_amount: 3000, paid_amount: 147000, tax_amount: 0 } });
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

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.today.sales_count).toBe(5);
      expect(res.body.today.total).toBe(150000);
      expect(res.body.today.discount).toBe(3000);
      expect(res.body.today.paid).toBe(147000);
      expect(res.body.today_expenses.total).toBe(25000);
      expect(res.body.pending_expenses).toBe(2);
      expect(res.body.active_shifts).toBe(1);
      expect(res.body.total_customers).toBe(50);
      expect(res.body.total_suppliers).toBe(20);
      expect(res.body.safe_balances).toHaveLength(1);
    });
  });
});

describe('G1: Branch Scoping — Dashboard Data Isolation', () => {

  describe('Manager sees only own branch data', () => {
    it('should allow manager accessing own branch (no branch_id — auto-inject)', async () => {
      setupDashboardMocks();

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(200);
    });

    it('should allow manager accessing own branch with matching branch_id', async () => {
      setupDashboardMocks();

      const res = await request(app)
        .get('/api/reports/dashboard')
        .query({ branch_id: UUID.branchA })
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(200);
    });

    it('should deny manager accessing other branch via branch_id', async () => {
      const res = await request(app)
        .get('/api/reports/dashboard')
        .query({ branch_id: UUID.branchB })
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(403);
    });

    it('should deny manager from other branch accessing branchA dashboard', async () => {
      const res = await request(app)
        .get('/api/reports/dashboard')
        .query({ branch_id: UUID.branchA })
        .set(authHeaders(otherBranchManager));

      expect(res.status).toBe(403);
    });
  });

  describe('Accountant sees only own branch data', () => {
    it('should allow accountant accessing own branch', async () => {
      setupDashboardMocks();

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders(testAccountantUser));

      expect(res.status).toBe(200);
    });

    it('should deny accountant accessing other branch', async () => {
      const res = await request(app)
        .get('/api/reports/dashboard')
        .query({ branch_id: UUID.branchB })
        .set(authHeaders(testAccountantUser));

      expect(res.status).toBe(403);
    });
  });

  describe('Admin bypasses branch scoping', () => {
    it('should allow admin to access own branch', async () => {
      setupDashboardMocks();

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
    });

    it('should allow admin to access any other branch', async () => {
      setupDashboardMocks();

      const res = await request(app)
        .get('/api/reports/dashboard')
        .query({ branch_id: UUID.branchB })
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
    });
  });

  describe('super_admin bypasses branch scoping', () => {
    it('should allow super_admin to access any branch', async () => {
      setupDashboardMocks();

      const res = await request(app)
        .get('/api/reports/dashboard')
        .query({ branch_id: UUID.branchB })
        .set(authHeaders(SUPER));

      expect(res.status).toBe(200);
    });

    it('should allow super_admin to access dashboard without branch_id', async () => {
      setupDashboardMocks();

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set(authHeaders(SUPER));

      expect(res.status).toBe(200);
    });
  });
});

describe('G1: Performance — Dashboard Load Efficiency', () => {
  it('should respond within 500ms under mocked conditions', async () => {
    setupDashboardMocks();

    const start = performance.now();
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set(authHeaders(testAdminUser));
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });

  it('should respond within 500ms for manager role', async () => {
    setupDashboardMocks();

    const start = performance.now();
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set(authHeaders(testManagerUser));
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });

  it('should respond quickly for repeated requests (caching)', async () => {
    setupDashboardMocks();

    const start = performance.now();
    await request(app).get('/api/reports/dashboard').set(authHeaders(testAdminUser));
    const res = await request(app).get('/api/reports/dashboard').set(authHeaders(testAdminUser));
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(800);
  });

  it('should handle low-stock filtering without performance degradation', async () => {
    setupDashboardMocks();
    const products = Array.from({ length: 100 }, (_, i) => ({
      id: `prod-${i}`,
      name: `Product ${i}`,
      name_ar: `منتج ${i}`,
      is_active: true,
      min_stock: 5,
      inventory_balances: [{ quantity: 2 }],
    }));
    mockPrisma.product.findMany.mockResolvedValue(products);

    const start = performance.now();
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set(authHeaders(testAdminUser));
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(res.body.low_stock_products).toHaveLength(100);
    expect(duration).toBeLessThan(500);
  });
});

describe('G1: Security Validation — Combined Permission + Branch Scope', () => {
  it('should deny unauthenticated access even with valid branch_id', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .query({ branch_id: UUID.branchA });

    expect(res.status).toBe(401);
  });

  it('should deny user without permission even with valid branch', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'reporting:view_reports');

    const res = await request(app)
      .get('/api/reports/dashboard')
      .query({ branch_id: UUID.branchA })
      .set(authHeaders(testManagerUser));

    expect(res.status).toBe(403);
  });

  it('should deny branch mismatch even with correct permission', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .query({ branch_id: UUID.branchB })
      .set(authHeaders(testManagerUser));

    expect(res.status).toBe(403);
  });

  it('should allow user with both permission and matching branch', async () => {
    setupDashboardMocks();

    const res = await request(app)
      .get('/api/reports/dashboard')
      .query({ branch_id: UUID.branchA })
      .set(authHeaders(testManagerUser));

    expect(res.status).toBe(200);
  });
});
