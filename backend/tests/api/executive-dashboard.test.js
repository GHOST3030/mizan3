import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { mockPrisma, authHeaders, testAdminUser, testManagerUser, testAccountantUser, testCashierUser } from '../setup.js';
import { resetMocks } from '../helpers.js';

const { hasPermission, getUserPermissions } = await import('../../src/services/permission.service.js');

const UUID = {
  branchA: '00000000-0000-4000-a000-000000000010',
  branchB: '00000000-0000-4000-a000-000000000099',
  product1: '00000000-0000-4000-a000-000000000101',
  product2: '00000000-0000-4000-a000-000000000102',
  customer1: '00000000-0000-4000-a000-000000000201',
  supplier1: '00000000-0000-4000-a000-000000000301',
  register1: '00000000-0000-4000-a000-000000000401',
  safe1: '00000000-0000-4000-a000-000000000501',
};

const SUPER = { userId: '00000000-0000-4000-a000-000000000000', role: 'super_admin', branchId: UUID.branchA };
const otherBranchManager = { userId: '00000000-0000-4000-a000-000000000777', role: 'manager', branchId: UUID.branchB };

const zeroAgg = { _count: { id: 0 }, _sum: { total: 0, discount_amount: 0, paid_amount: 0 } };

function setupFullDashboardMocks() {
  // Today
  mockPrisma.sale.aggregate.mockResolvedValue(zeroAgg);
  mockPrisma.saleItem.findMany.mockResolvedValue([]);
  mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 }, _count: { id: 0 } });
  mockPrisma.sale.groupBy.mockResolvedValue([]);
  // Month
  mockPrisma.purchase.aggregate.mockResolvedValue({ _sum: { total: 0 }, _count: { id: 0 } });
  // Inventory
  mockPrisma.inventoryBalance.findMany.mockResolvedValue([]);
  mockPrisma.product.count.mockResolvedValue(0);
  mockPrisma.product.findMany.mockResolvedValue([]);
  // Finance
  mockPrisma.cashRegister.findMany.mockResolvedValue([]);
  mockPrisma.safeBox.findMany.mockResolvedValue([]);
  mockPrisma.paymentSchedule.findMany.mockResolvedValue([]);
  mockPrisma.sale.findMany.mockResolvedValue([]);
  mockPrisma.purchase.findMany.mockResolvedValue([]);
  mockPrisma.expense.count.mockResolvedValue(0);
  // Top products
  mockPrisma.saleItem.groupBy.mockResolvedValue([]);
  // Customers
  mockPrisma.sale.groupBy.mockResolvedValue([]);
  // Suppliers
  mockPrisma.purchase.groupBy.mockResolvedValue([]);
  // Finance aggregates
  mockPrisma.paymentSchedule.aggregate.mockResolvedValue({ _sum: { amount: 0, paid_amount: 0 } });
  mockPrisma.paymentSchedule.count.mockResolvedValue(0);
  mockPrisma.inventoryBalance.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
}

beforeEach(() => {
  resetMocks();
  hasPermission.mockReset();
  hasPermission.mockResolvedValue(true);
  getUserPermissions.mockResolvedValue([
    'field:view_daily_profit',
    'field:view_monthly_profit',
    'field:view_inventory_value',
    'field:view_safe_balance',
    'field:view_financial_summary',
  ]);
});

describe('G1: Executive Dashboard — Permission Tests', () => {

  describe('Unauthorized Access (401)', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/executive-dashboard');
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/executive-dashboard')
        .set({ Authorization: 'Bearer invalid-token-here' });
      expect(res.status).toBe(401);
    });

    it('should return 401 for all sub-endpoints without auth', async () => {
      const endpoints = ['/today', '/month', '/inventory', '/finance', '/top-products', '/top-customers', '/top-suppliers', '/alerts'];
      for (const ep of endpoints) {
        const res = await request(app).get(`/api/executive-dashboard${ep}`);
        expect(res.status).toBe(401);
      }
    });
  });

  describe('Permission Denial (403)', () => {
    it('should return 403 when user lacks view_executive_dashboard', async () => {
      hasPermission.mockImplementation(async (_uid, perm) => perm !== 'dashboard:view_executive_dashboard');

      const res = await request(app)
        .get('/api/executive-dashboard')
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(403);
    });

    it('should return 403 for cashier (no dashboard permission)', async () => {
      hasPermission.mockImplementation(async (_uid, perm) => perm !== 'dashboard:view_executive_dashboard');

      const res = await request(app)
        .get('/api/executive-dashboard')
        .set(authHeaders(testCashierUser));

      expect(res.status).toBe(403);
    });

    it('should return 403 for /inventory without view_inventory_value', async () => {
      hasPermission.mockImplementation(async (_uid, perm) => perm !== 'dashboard:view_inventory_value');

      const res = await request(app)
        .get('/api/executive-dashboard/inventory')
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(403);
    });

    it('should return 403 for /finance without view_financial_summary', async () => {
      hasPermission.mockImplementation(async (_uid, perm) => perm !== 'dashboard:view_financial_summary');

      const res = await request(app)
        .get('/api/executive-dashboard/finance')
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(403);
    });
  });

  describe('Permission Granted (200)', () => {
    it('should return 200 for admin with all permissions', async () => {
      setupFullDashboardMocks();

      const res = await request(app)
        .get('/api/executive-dashboard')
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
    });

    it('should return 200 for manager with permissions', async () => {
      setupFullDashboardMocks();

      const res = await request(app)
        .get('/api/executive-dashboard')
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(200);
    });

    it('should return 200 for accountant with permissions', async () => {
      setupFullDashboardMocks();

      const res = await request(app)
        .get('/api/executive-dashboard')
        .set(authHeaders(testAccountantUser));

      expect(res.status).toBe(200);
    });

    it('should return 200 for super_admin bypassing all permission checks', async () => {
      hasPermission.mockResolvedValue(false);
      setupFullDashboardMocks();

      const res = await request(app)
        .get('/api/executive-dashboard')
        .set(authHeaders(SUPER));

      expect(res.status).toBe(200);
    });
  });

  describe('Dashboard Response Structure', () => {
    it('should contain all 6 top-level sections', async () => {
      setupFullDashboardMocks();

      const res = await request(app)
        .get('/api/executive-dashboard')
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('today');
      expect(res.body).toHaveProperty('month');
      expect(res.body).toHaveProperty('inventory');
      expect(res.body).toHaveProperty('finance');
      expect(res.body).toHaveProperty('top_products');
      expect(res.body).toHaveProperty('top_customers');
      expect(res.body).toHaveProperty('top_suppliers');
      expect(res.body).toHaveProperty('alerts');
    });

    it('should return numeric values in today section', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({ _count: { id: 5 }, _sum: { total: 150000, discount_amount: 3000, paid_amount: 147000 } });
      mockPrisma.saleItem.findMany.mockResolvedValue([
        { product_id: UUID.product1, quantity: 10 },
        { product_id: UUID.product2, quantity: 5 },
      ]);
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 25000 }, _count: { id: 3 } });
      mockPrisma.sale.groupBy.mockResolvedValue([
        { customer_id: UUID.customer1, _count: { customer_id: 3 } },
      ]);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: UUID.product1, cost_price: 5000 },
        { id: UUID.product2, cost_price: 3000 },
      ]);
      mockPrisma.purchase.aggregate.mockResolvedValue({ _sum: { total: 0 }, _count: { id: 0 } });
      mockPrisma.inventoryBalance.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.cashRegister.findMany.mockResolvedValue([]);
      mockPrisma.safeBox.findMany.mockResolvedValue([]);
      mockPrisma.paymentSchedule.findMany.mockResolvedValue([]);
      mockPrisma.saleItem.groupBy.mockResolvedValue([]);
      mockPrisma.sale.groupBy.mockResolvedValue([]);
      mockPrisma.purchase.groupBy.mockResolvedValue([]);
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.purchase.findMany.mockResolvedValue([]);
      mockPrisma.expense.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/executive-dashboard')
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.today.total_sales).toBe(150000);
      expect(res.body.today.invoice_count).toBe(5);
      expect(res.body.today.active_customers).toBeGreaterThanOrEqual(0);
      expect(res.body.today.net_profit).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('G1: Executive Dashboard — Branch Scoping', () => {

  describe('Manager sees only own branch data', () => {
    it('should allow manager accessing own branch (branch_id auto-injected)', async () => {
      setupFullDashboardMocks();

      const res = await request(app)
        .get('/api/executive-dashboard')
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(200);
    });

    it('should allow manager with matching branch_id query param', async () => {
      setupFullDashboardMocks();

      const res = await request(app)
        .get('/api/executive-dashboard')
        .query({ branch_id: UUID.branchA })
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(200);
    });

    it('should deny manager accessing other branch via branch_id', async () => {
      const res = await request(app)
        .get('/api/executive-dashboard')
        .query({ branch_id: UUID.branchB })
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(403);
    });

    it('should deny other-branch manager accessing branchA data', async () => {
      const res = await request(app)
        .get('/api/executive-dashboard')
        .query({ branch_id: UUID.branchA })
        .set(authHeaders(otherBranchManager));

      expect(res.status).toBe(403);
    });

    it('should deny manager accessing other branch sub-endpoint', async () => {
      const res = await request(app)
        .get('/api/executive-dashboard/today')
        .query({ branch_id: UUID.branchB })
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(403);
    });
  });

  describe('Accountant branch isolation', () => {
    it('should allow accountant on own branch', async () => {
      setupFullDashboardMocks();

      const res = await request(app)
        .get('/api/executive-dashboard')
        .set(authHeaders(testAccountantUser));

      expect(res.status).toBe(200);
    });

    it('should deny accountant accessing other branch', async () => {
      const res = await request(app)
        .get('/api/executive-dashboard')
        .query({ branch_id: UUID.branchB })
        .set(authHeaders(testAccountantUser));

      expect(res.status).toBe(403);
    });
  });

  describe('Admin bypasses branch scoping', () => {
    it('should allow admin to access own branch', async () => {
      setupFullDashboardMocks();

      const res = await request(app)
        .get('/api/executive-dashboard')
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
    });

    it('should allow admin to access any other branch', async () => {
      setupFullDashboardMocks();

      const res = await request(app)
        .get('/api/executive-dashboard')
        .query({ branch_id: UUID.branchB })
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
    });
  });

  describe('Super_admin bypasses branch scoping', () => {
    it('should allow super_admin to access any branch', async () => {
      setupFullDashboardMocks();

      const res = await request(app)
        .get('/api/executive-dashboard')
        .query({ branch_id: UUID.branchB })
        .set(authHeaders(SUPER));

      expect(res.status).toBe(200);
    });

    it('should allow super_admin without branch_id', async () => {
      setupFullDashboardMocks();

      const res = await request(app)
        .get('/api/executive-dashboard')
        .set(authHeaders(SUPER));

      expect(res.status).toBe(200);
    });
  });
});

describe('G1: Executive Dashboard — Performance', () => {
  it('should respond within 500ms under mocked conditions', async () => {
    setupFullDashboardMocks();

    const start = performance.now();
    const res = await request(app)
      .get('/api/executive-dashboard')
      .set(authHeaders(testAdminUser));
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });

  it('should respond within 500ms for manager role', async () => {
    setupFullDashboardMocks();

    const start = performance.now();
    const res = await request(app)
      .get('/api/executive-dashboard')
      .set(authHeaders(testManagerUser));
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });

  it('should respond quickly for cached repeated requests', async () => {
    setupFullDashboardMocks();

    const start = performance.now();
    await request(app).get('/api/executive-dashboard').set(authHeaders(testAdminUser));
    const res = await request(app).get('/api/executive-dashboard').set(authHeaders(testAdminUser));
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(800);
  });

  it('should handle large product sets in inventory valuation', async () => {
    const balances = Array.from({ length: 200 }, (_, i) => ({
      id: `bal-${i}`,
      branch_id: UUID.branchA,
      product: { id: `prod-${i}`, cost_price: 1000 + i, selling_price: 1500 + i, min_stock: 10 },
      quantity: i + 1,
    }));
    mockPrisma.inventoryBalance.findMany.mockResolvedValue(balances);
    mockPrisma.product.count.mockResolvedValue(200);
    mockPrisma.product.findMany.mockResolvedValue(balances.map((b) => ({
      id: b.product.id,
      name: `Product ${b.product.id}`,
      name_ar: `منتج ${b.product.id}`,
      is_active: true,
      min_stock: b.product.min_stock,
      inventory_balances: [{ quantity: b.quantity }],
    })));
    mockPrisma.sale.aggregate.mockResolvedValue(zeroAgg);
    mockPrisma.saleItem.findMany.mockResolvedValue([]);
    mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 }, _count: { id: 0 } });
    mockPrisma.sale.groupBy.mockResolvedValue([]);
    mockPrisma.purchase.aggregate.mockResolvedValue({ _sum: { total: 0 }, _count: { id: 0 } });
    mockPrisma.cashRegister.findMany.mockResolvedValue([]);
    mockPrisma.safeBox.findMany.mockResolvedValue([]);
    mockPrisma.paymentSchedule.findMany.mockResolvedValue([]);
    mockPrisma.sale.findMany.mockResolvedValue([]);
    mockPrisma.purchase.findMany.mockResolvedValue([]);
    mockPrisma.expense.count.mockResolvedValue(0);
    mockPrisma.saleItem.groupBy.mockResolvedValue([]);
    mockPrisma.purchase.groupBy.mockResolvedValue([]);
    mockPrisma.paymentSchedule.count.mockResolvedValue(0);
    mockPrisma.paymentSchedule.aggregate.mockResolvedValue({ _sum: { amount: 0, paid_amount: 0 } });

    const start = performance.now();
    const res = await request(app)
      .get('/api/executive-dashboard')
      .set(authHeaders(testAdminUser));
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(res.body.inventory.total_products).toBe(200);
    expect(duration).toBeLessThan(500);
  });
});

describe('G1: Executive Dashboard — Security Validation', () => {
  it('should deny unauthenticated access even with valid branch_id', async () => {
    const res = await request(app)
      .get('/api/executive-dashboard')
      .query({ branch_id: UUID.branchA });

    expect(res.status).toBe(401);
  });

  it('should deny user without permission even with valid branch', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'dashboard:view_executive_dashboard');

    const res = await request(app)
      .get('/api/executive-dashboard')
      .query({ branch_id: UUID.branchA })
      .set(authHeaders(testManagerUser));

    expect(res.status).toBe(403);
  });

  it('should deny branch mismatch even with correct permission', async () => {
    const res = await request(app)
      .get('/api/executive-dashboard')
      .query({ branch_id: UUID.branchB })
      .set(authHeaders(testManagerUser));

    expect(res.status).toBe(403);
  });

  it('should allow user with both permission and matching branch', async () => {
    setupFullDashboardMocks();

    const res = await request(app)
      .get('/api/executive-dashboard')
      .query({ branch_id: UUID.branchA })
      .set(authHeaders(testManagerUser));

    expect(res.status).toBe(200);
  });

  it('should deny cashier even when authenticated', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'dashboard:view_executive_dashboard');

    const res = await request(app)
      .get('/api/executive-dashboard')
      .set(authHeaders(testCashierUser));

    expect(res.status).toBe(403);
  });

  it('should deny unauthorised access to inventory endpoint', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'dashboard:view_inventory_value');

    const res = await request(app)
      .get('/api/executive-dashboard/inventory')
      .set(authHeaders(testManagerUser));

    expect(res.status).toBe(403);
  });

  it('should deny unauthorised access to finance endpoint', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'dashboard:view_financial_summary');

    const res = await request(app)
      .get('/api/executive-dashboard/finance')
      .set(authHeaders(testAccountantUser));

    expect(res.status).toBe(403);
  });

  it('should reject POST requests', async () => {
    const res = await request(app)
      .post('/api/executive-dashboard')
      .set(authHeaders(testAdminUser))
      .send({});

    expect(res.status).toBe(404);
  });
});
