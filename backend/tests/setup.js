import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test_secret_2026';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DIRECT_URL = 'postgresql://test:test@localhost:5432/test';

export const UUID = {
  admin: '00000000-0000-4000-a000-000000000001',
  manager: '00000000-0000-4000-a000-000000000002',
  accountant: '00000000-0000-4000-a000-000000000003',
  cashier: '00000000-0000-4000-a000-000000000004',
  branch: '00000000-0000-4000-a000-000000000010',
};

export const testAdminUser = { userId: UUID.admin, role: 'admin', branchId: UUID.branch };
export const testManagerUser = { userId: UUID.manager, role: 'manager', branchId: UUID.branch };
export const testAccountantUser = { userId: UUID.accountant, role: 'accountant', branchId: UUID.branch };
export const testCashierUser = { userId: UUID.cashier, role: 'cashier', branchId: UUID.branch };

export const generateToken = (user = testAdminUser) => {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
};

export const authHeaders = (user) => ({
  Authorization: `Bearer ${generateToken(user)}`,
});

const createMockPrisma = () => {
  const mockTx = {
    safeBox: { update: vi.fn() },
    safeMovement: { create: vi.fn() },
    $transaction: vi.fn(),
  };

  const modelMock = (options) => {
    const delegate = {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      upsert: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    };
    return delegate;
  };

  const mock = {
    $transaction: vi.fn((fn) => fn(mockTx)),
    $disconnect: vi.fn(),
    user: modelMock(),
    branch: modelMock(),
    company: modelMock(),
    currency: modelMock(),
    setting: modelMock(),
    numberSequence: modelMock(),
    shift: modelMock(),
    category: modelMock(),
    unit: modelMock(),
    brand: modelMock(),
    product: modelMock(),
    warehouse: modelMock(),
    inventoryBalance: modelMock(),
    stockMovement: modelMock(),
    stockCount: modelMock(),
    stockCountItem: modelMock(),
    stockTransfer: modelMock(),
    stockTransferItem: modelMock(),
    paymentSchedule: modelMock(),
    customerGroup: modelMock(),
    customer: modelMock(),
    sale: modelMock(),
    saleItem: modelMock(),
    salePayment: modelMock(),
    supplierCategory: modelMock(),
    supplier: modelMock(),
    purchase: modelMock(),
    purchaseItem: modelMock(),
    safeBox: modelMock(),
    safeMovement: modelMock(),
    cashRegister: modelMock(),
    expenseCategory: modelMock(),
    expense: modelMock(),
    activityLog: modelMock(),
    role: modelMock(),
    permission: modelMock(),
    rolePermission: modelMock(),
    userPermission: modelMock(),
    branchAssignment: modelMock(),
  };

  return mock;
};

export const mockPrisma = createMockPrisma();

vi.mock('../src/lib/prisma.js', () => ({
  prisma: mockPrisma,
  isPrismaAvailable: vi.fn(() => false),
}));

const mockAuditStorage = {
  getStore: vi.fn(() => ({ ip_address: '127.0.0.1', user_agent: 'test' })),
  run: vi.fn((_ctx, fn) => fn()),
};

vi.mock('../src/services/permission.service.js', () => ({
  getUserPermissions: vi.fn(() => Promise.resolve([])),
  hasPermission: vi.fn(() => Promise.resolve(true)),
  clearCache: vi.fn(),
}));

vi.mock('../src/modules/audit/audit.service.js', () => ({
  log: vi.fn(() => Promise.resolve()),
  getLogs: vi.fn(() => Promise.resolve([])),
  auditStorage: mockAuditStorage,
}));
