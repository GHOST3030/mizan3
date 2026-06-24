import { mockPrisma, testAdminUser, testManagerUser, testAccountantUser, testCashierUser } from './setup.js';
import { flush as cacheFlush } from '../src/lib/cache.js';

export const resetMocks = () => {
  const models = [
    'user', 'branch', 'company', 'currency', 'setting', 'numberSequence',
    'shift', 'category', 'unit', 'brand', 'product', 'warehouse',
    'inventoryBalance', 'stockMovement', 'stockCount', 'stockCountItem',
    'stockTransfer', 'stockTransferItem', 'paymentSchedule', 'customerGroup',
    'customer', 'sale', 'saleItem', 'salePayment', 'supplierCategory',
    'supplier', 'purchase', 'purchaseItem', 'safeBox', 'safeMovement',
    'cashRegister', 'expenseCategory', 'expense', 'activityLog',
  ];
  for (const model of models) {
    const delegate = mockPrisma[model];
    if (delegate) {
      for (const key of Object.keys(delegate)) {
        if (typeof delegate[key] === 'function') {
          delegate[key].mockReset();
        }
      }
    }
  }
  mockPrisma.$transaction.mockReset();
  mockPrisma.$transaction.mockImplementation((fn) => fn(mockPrisma));
  cacheFlush();
};
