import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { mockPrisma, authHeaders, testAdminUser, testManagerUser, testCashierUser, testAccountantUser } from '../setup.js';
import { resetMocks } from '../helpers.js';

const UUID = {
  branch: '00000000-0000-4000-a000-000000000010',
  mySale: '00000000-0000-4000-a000-000000000100',
  otherSale: '00000000-0000-4000-a000-000000000200',
  myShift: '00000000-0000-4000-a000-000000000300',
  otherShift: '00000000-0000-4000-a000-000000000400',
  myExpense: '00000000-0000-4000-a000-000000000500',
  otherExpense: '00000000-0000-4000-a000-000000000600',
};

const otherBranchCashier = { userId: '00000000-0000-4000-a000-000000000999', role: 'cashier', branchId: '00000000-0000-4000-a000-000000000099' };
const authOther = { Authorization: `Bearer ${jwt.sign(otherBranchCashier, process.env.JWT_SECRET, { expiresIn: '1h' })}` };

const otherCashier = { userId: '00000000-0000-4000-a000-000000000888', role: 'cashier', branchId: UUID.branch };
const otherAccountant = { userId: '00000000-0000-4000-a000-000000000887', role: 'accountant', branchId: UUID.branch };

const acctUserId = testAccountantUser.userId;
const cashierUserId = testCashierUser.userId;

beforeEach(() => {
  resetMocks();
});

// ═════════════════════════════════════════════════════
// 1. Sales Ownership
// ═════════════════════════════════════════════════════
describe('B2: Sales Ownership', () => {
  describe('GET /api/sales/:id — detail view', () => {
    it('should allow cashier to view their own sale', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue({
        id: UUID.mySale, user_id: cashierUserId,
        items: [], payments: [],
        customer: null, user: { id: cashierUserId, name: 'Cashier' },
        shift: null, currency: { id: 'x', code: 'YER' },
      });

      const res = await request(app)
        .get(`/api/sales/${UUID.mySale}`)
        .set(authHeaders(testCashierUser));

      expect(res.status).toBe(200);
    });

    it('should return 403 when cashier views another cashier\'s sale', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue({
        id: UUID.otherSale, user_id: otherCashier.userId,
      });

      const res = await request(app)
        .get(`/api/sales/${UUID.otherSale}`)
        .set(authHeaders(testCashierUser));

      expect(res.status).toBe(403);
    });

    it('should allow manager to view any sale', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue({
        id: UUID.otherSale, user_id: otherCashier.userId,
        items: [], payments: [],
        customer: null, user: { id: otherCashier.userId, name: 'Other' },
        shift: null, currency: { id: 'x', code: 'YER' },
      });

      const res = await request(app)
        .get(`/api/sales/${UUID.otherSale}`)
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(200);
    });

    it('should allow admin to view any sale', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue({
        id: UUID.otherSale, user_id: otherCashier.userId,
        items: [], payments: [],
        customer: null, user: { id: otherCashier.userId, name: 'Other' },
        shift: null, currency: { id: 'x', code: 'YER' },
      });

      const res = await request(app)
        .get(`/api/sales/${UUID.otherSale}`)
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/sales/:id/cancel — cancel sale', () => {
    it('should allow cashier to cancel their own sale (ownership passes)', async () => {
      mockPrisma.sale.findFirst
        .mockResolvedValueOnce({ id: UUID.mySale, user_id: cashierUserId })
        .mockResolvedValueOnce({ id: UUID.mySale, user_id: cashierUserId, status: 'completed', branch_id: UUID.branch, items: [], notes: null });

      const mockTx = {
        stockMovement: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        inventoryBalance: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        sale: { update: vi.fn().mockResolvedValue({ status: 'cancelled' }) },
      };
      mockPrisma.$transaction.mockImplementation((fn) => fn(mockTx));
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'cashier' });

      const res = await request(app)
        .post(`/api/sales/${UUID.mySale}/cancel`)
        .set(authHeaders(testCashierUser))
        .send({ reason: 'wrong item' });

      expect(res.status).toBe(200);
    });

    it('should return 403 when cashier cancels another cashier\'s sale', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue({
        id: UUID.otherSale, user_id: otherCashier.userId,
      });

      const res = await request(app)
        .post(`/api/sales/${UUID.otherSale}/cancel`)
        .set(authHeaders(testCashierUser))
        .send({ reason: 'wrong item' });

      expect(res.status).toBe(403);
    });
  });

  describe('List filtering — cashier sees only own sales', () => {
    it('should inject user_id for cashier when listing sales', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.sale.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/sales')
        .set(authHeaders(testCashierUser));

      expect(res.status).toBe(200);
      const whereClause = mockPrisma.sale.findMany.mock.calls[0][0].where;
      expect(whereClause.user_id).toBe(cashierUserId);
    });

    it('should NOT inject user_id for manager when listing sales', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.sale.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/sales')
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(200);
      const whereClause = mockPrisma.sale.findMany.mock.calls[0][0].where;
      expect(whereClause.user_id).toBeUndefined();
    });
  });
});

// ═════════════════════════════════════════════════════
// 2. Shift Ownership
// ═════════════════════════════════════════════════════
describe('B2: Shift Ownership', () => {
  describe('GET /api/finance/shifts/:id', () => {
    it('should allow cashier to view their own shift', async () => {
      mockPrisma.shift.findFirst.mockResolvedValue({
        id: UUID.myShift, user_id: cashierUserId, sales: [],
      });

      const res = await request(app)
        .get(`/api/finance/shifts/${UUID.myShift}`)
        .set(authHeaders(testCashierUser));

      expect(res.status).toBe(200);
    });

    it('should return 403 when cashier views another shift', async () => {
      mockPrisma.shift.findFirst.mockResolvedValue({
        id: UUID.otherShift, user_id: otherCashier.userId,
      });

      const res = await request(app)
        .get(`/api/finance/shifts/${UUID.otherShift}`)
        .set(authHeaders(testCashierUser));

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/finance/shifts/:id/close', () => {
    it('should allow cashier to close their own shift (ownership passes)', async () => {
      mockPrisma.shift.findFirst
        .mockResolvedValueOnce({ id: UUID.myShift, user_id: cashierUserId })
        .mockResolvedValueOnce({
          id: UUID.myShift, user_id: cashierUserId, branch_id: UUID.branch,
          status: 'open', opening_balance: 0, closed_at: null,
          sales: [{ payments: [{ method: 'cash', amount: 5000 }] }],
        });
      mockPrisma.shift.update.mockResolvedValue({ id: UUID.myShift, status: 'closed' });

      const res = await request(app)
        .put(`/api/finance/shifts/${UUID.myShift}/close`)
        .set(authHeaders(testCashierUser))
        .send({ closing_balance: 5000 });

      expect(res.status).toBe(200);
    });

    it('should return 403 when cashier closes another shift', async () => {
      mockPrisma.shift.findFirst.mockResolvedValue({
        id: UUID.otherShift, user_id: otherCashier.userId,
      });

      const res = await request(app)
        .put(`/api/finance/shifts/${UUID.otherShift}/close`)
        .set(authHeaders(testCashierUser))
        .send({ closing_balance: 5000 });

      expect(res.status).toBe(403);
    });
  });
});

// ═════════════════════════════════════════════════════
// 3. Expense Ownership
// ═════════════════════════════════════════════════════
describe('B2: Expense Ownership', () => {
  describe('GET /api/finance/expenses/:id', () => {
    it('should allow user to view their own expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue({
        id: UUID.myExpense, user_id: acctUserId,
        user: {}, currency: {}, expense_category: null,
      });

      const res = await request(app)
        .get(`/api/finance/expenses/${UUID.myExpense}`)
        .set(authHeaders(testAccountantUser));

      expect(res.status).toBe(200);
    });

    it('should return 403 when user views another user\'s expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue({
        id: UUID.otherExpense, user_id: otherAccountant.userId,
      });

      const res = await request(app)
        .get(`/api/finance/expenses/${UUID.otherExpense}`)
        .set(authHeaders(testAccountantUser));

      expect(res.status).toBe(403);
    });

    it('should allow manager to view any expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue({
        id: UUID.otherExpense, user_id: otherAccountant.userId,
        user: {}, currency: {}, expense_category: null,
      });

      const res = await request(app)
        .get(`/api/finance/expenses/${UUID.otherExpense}`)
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/finance/expenses/:id — update', () => {
    it('should allow accountant to update their own expense', async () => {
      mockPrisma.expense.findFirst
        .mockResolvedValueOnce({ id: UUID.myExpense, user_id: acctUserId })
        .mockResolvedValueOnce({ id: UUID.myExpense, user_id: acctUserId, branch_id: UUID.branch, status: 'pending' });
      mockPrisma.expense.update.mockResolvedValue({ id: UUID.myExpense, amount: 2000 });

      const res = await request(app)
        .put(`/api/finance/expenses/${UUID.myExpense}`)
        .set(authHeaders(testAccountantUser))
        .send({ amount: 2000 });

      expect(res.status).toBe(200);
    });

    it('should return 403 when accountant updates another user\'s expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue({
        id: UUID.otherExpense, user_id: otherAccountant.userId,
      });

      const res = await request(app)
        .put(`/api/finance/expenses/${UUID.otherExpense}`)
        .set(authHeaders(testAccountantUser))
        .send({ amount: 2000 });

      expect(res.status).toBe(403);
    });
  });

  describe('List filtering — non-admin sees only own expenses', () => {
    it('should inject user_id for cashier when listing expenses', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.expense.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/finance/expenses')
        .set(authHeaders(testCashierUser));

      expect(res.status).toBe(200);
      const whereClause = mockPrisma.expense.findMany.mock.calls[0][0].where;
      expect(whereClause.user_id).toBe(cashierUserId);
    });

    it('should inject user_id for accountant when listing expenses', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.expense.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/finance/expenses')
        .set(authHeaders(testAccountantUser));

      expect(res.status).toBe(200);
      const whereClause = mockPrisma.expense.findMany.mock.calls[0][0].where;
      expect(whereClause.user_id).toBe(acctUserId);
    });

    it('should NOT inject user_id for manager when listing expenses', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.expense.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/finance/expenses')
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(200);
      const whereClause = mockPrisma.expense.findMany.mock.calls[0][0].where;
      expect(whereClause.user_id).toBeUndefined();
    });
  });
});

// ═════════════════════════════════════════════════════
// 4. Combined: branch isolation + ownership
// ═════════════════════════════════════════════════════
describe('Combined: branchScope + ownership', () => {
  it('should return 403 when cashier from another branch accesses sale (branchScope)', async () => {
    const res = await request(app)
      .get('/api/sales')
      .query({ branch_id: UUID.branch })
      .set(authOther);

    expect(res.status).toBe(403);
  });

  it('should return 401 without auth', async () => {
    const res = await request(app).get('/api/sales');
    expect(res.status).toBe(401);
  });
});
