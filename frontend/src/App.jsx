import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const POSPage = lazy(() => import('./pages/pos/POSPage'));
const ProductsPage = lazy(() => import('./pages/products/ProductsPage'));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage'));
const SuppliersPage = lazy(() => import('./pages/suppliers/SuppliersPage'));
const PurchasesPage = lazy(() => import('./pages/purchases/PurchasesPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SalesPage = lazy(() => import('./pages/sales/SalesPage'));
const ReturnSalePage = lazy(() => import('./pages/sales/ReturnSalePage'));
const CustomerStatementPage = lazy(() => import('./pages/customers/CustomerStatementPage'));
const SupplierStatementPage = lazy(() => import('./pages/suppliers/SupplierStatementPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const CashRegistersPage = lazy(() => import('./pages/CashRegistersPage'));
const ShiftsPage = lazy(() => import('./pages/ShiftsPage'));
const WarehousesPage = lazy(() => import('./pages/WarehousesPage'));
const StockTransferPage = lazy(() => import('./pages/StockTransferPage'));
const StockCountPage = lazy(() => import('./pages/StockCountPage'));
const CurrenciesPage = lazy(() => import('./pages/CurrenciesPage'));
const CurrencyExchangePage = lazy(() => import('./pages/CurrencyExchangePage'));
const LowStockPage = lazy(() => import('./pages/LowStockPage'));
const WastagePage = lazy(() => import('./pages/WastagePage'));
const CustomerGroupsPage = lazy(() => import('./pages/customers/CustomerGroupsPage'));
const SupplierCategoriesPage = lazy(() => import('./pages/suppliers/SupplierCategoriesPage'));
const CompaniesPage = lazy(() => import('./pages/core/CompaniesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SafeBoxPage = lazy(() => import('./pages/SafeBoxPage'));
const PendingPaymentsPage = lazy(() => import('./pages/PendingPaymentsPage'));
const PrintTemplatesPage = lazy(() => import('./pages/PrintTemplatesPage'));
const RolesPage = lazy(() => import('./pages/admin/RolesPage'));
const ExecutiveDashboardPage = lazy(() => import('./pages/ExecutiveDashboardPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 300000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ALLOW_ALL = ['super_admin', 'admin', 'manager', 'cashier', 'accountant', 'inventory_manager', 'auditor'];
const ALLOW_ADMIN_MGR = ['super_admin', 'admin', 'manager'];
const ALLOW_ADMIN_ONLY = ['super_admin', 'admin'];
const ALLOW_ADMIN_MGR_CASH = ['super_admin', 'admin', 'manager', 'cashier'];
const ALLOW_ADMIN_MGR_ACCT = ['super_admin', 'admin', 'manager', 'accountant'];
const ALLOW_ADMIN_MGR_INV = ['super_admin', 'admin', 'manager', 'inventory_manager'];

const routePermissions = {
  '/': ALLOW_ALL,
  '/pos': ALLOW_ALL,
  '/products': [...ALLOW_ADMIN_MGR_INV],
  '/customers': [...ALLOW_ADMIN_MGR_CASH],
  '/suppliers': [...ALLOW_ADMIN_MGR],
  '/sales': [...ALLOW_ADMIN_MGR_CASH, 'accountant'],
  '/sales/return': [...ALLOW_ADMIN_MGR],
  '/purchases': [...ALLOW_ADMIN_MGR],
  '/inventory': [...ALLOW_ADMIN_MGR_INV],
  '/warehouses': [...ALLOW_ADMIN_MGR_INV],
  '/inventory/transfer': [...ALLOW_ADMIN_MGR_INV],
  '/inventory/stock-count': [...ALLOW_ADMIN_MGR_INV],
  '/inventory/wastage': [...ALLOW_ADMIN_MGR_INV],
  '/inventory/low-stock': [...ALLOW_ADMIN_MGR_INV, 'accountant'],
  '/expenses': [...ALLOW_ADMIN_MGR_CASH, 'accountant'],
  '/cash-registers': [...ALLOW_ADMIN_MGR_ACCT],
  '/safe': [...ALLOW_ADMIN_MGR_ACCT],
  '/currency-exchange': [...ALLOW_ADMIN_MGR_ACCT],
  '/shifts': [...ALLOW_ADMIN_MGR_CASH],
  '/customer-groups': [...ALLOW_ADMIN_MGR],
  '/supplier-categories': [...ALLOW_ADMIN_MGR],
  '/currencies': [...ALLOW_ADMIN_MGR],
  '/users': [...ALLOW_ADMIN_ONLY],
  '/company': [...ALLOW_ADMIN_MGR],
  '/settings': [...ALLOW_ADMIN_ONLY],
  '/print-templates': [...ALLOW_ADMIN_MGR],
  '/reports': [...ALLOW_ADMIN_MGR_ACCT],
  '/pending-payments': [...ALLOW_ADMIN_MGR],
  '/customers/statement': [...ALLOW_ADMIN_MGR_CASH],
  '/suppliers/statement': [...ALLOW_ADMIN_MGR],
  '/admin/roles': [...ALLOW_ADMIN_ONLY],
  '/executive-dashboard': ['super_admin', 'admin', 'manager', 'accountant', 'inventory_manager'],
};

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" />;
}

function ProtectedRoute({ children, path }) {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  if (!token) return <Navigate to="/login" />;
  const allowed = routePermissions[path];
  if (allowed && !allowed.includes(role)) return <Navigate to="/" />;
  return children;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route path="/" element={<ProtectedRoute path="/"><DashboardPage /></ProtectedRoute>} />
              <Route path="/pos" element={<ProtectedRoute path="/pos"><POSPage /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute path="/products"><ProductsPage /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute path="/customers"><CustomersPage /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute path="/suppliers"><SuppliersPage /></ProtectedRoute>} />
              <Route path="/purchases" element={<ProtectedRoute path="/purchases"><PurchasesPage /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute path="/sales"><SalesPage /></ProtectedRoute>} />
              <Route path="/sales/return" element={<ProtectedRoute path="/sales/return"><ReturnSalePage /></ProtectedRoute>} />
              <Route path="/customers/statement" element={<ProtectedRoute path="/customers/statement"><CustomerStatementPage /></ProtectedRoute>} />
              <Route path="/suppliers/statement" element={<ProtectedRoute path="/suppliers/statement"><SupplierStatementPage /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute path="/inventory"><InventoryPage /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute path="/users"><UsersPage /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute path="/expenses"><ExpensesPage /></ProtectedRoute>} />
              <Route path="/cash-registers" element={<ProtectedRoute path="/cash-registers"><CashRegistersPage /></ProtectedRoute>} />
              <Route path="/shifts" element={<ProtectedRoute path="/shifts"><ShiftsPage /></ProtectedRoute>} />
              <Route path="/warehouses" element={<ProtectedRoute path="/warehouses"><WarehousesPage /></ProtectedRoute>} />
              <Route path="/inventory/transfer" element={<ProtectedRoute path="/inventory/transfer"><StockTransferPage /></ProtectedRoute>} />
              <Route path="/inventory/stock-count" element={<ProtectedRoute path="/inventory/stock-count"><StockCountPage /></ProtectedRoute>} />
              <Route path="/inventory/low-stock" element={<ProtectedRoute path="/inventory/low-stock"><LowStockPage /></ProtectedRoute>} />
              <Route path="/inventory/wastage" element={<ProtectedRoute path="/inventory/wastage"><WastagePage /></ProtectedRoute>} />
              <Route path="/currencies" element={<ProtectedRoute path="/currencies"><CurrenciesPage /></ProtectedRoute>} />
              <Route path="/currency-exchange" element={<ProtectedRoute path="/currency-exchange"><CurrencyExchangePage /></ProtectedRoute>} />
              <Route path="/customer-groups" element={<ProtectedRoute path="/customer-groups"><CustomerGroupsPage /></ProtectedRoute>} />
              <Route path="/supplier-categories" element={<ProtectedRoute path="/supplier-categories"><SupplierCategoriesPage /></ProtectedRoute>} />
              <Route path="/company" element={<ProtectedRoute path="/company"><CompaniesPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute path="/settings"><SettingsPage /></ProtectedRoute>} />
              <Route path="/safe" element={<ProtectedRoute path="/safe"><SafeBoxPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute path="/reports"><ReportsPage /></ProtectedRoute>} />
              <Route path="/pending-payments" element={<ProtectedRoute path="/pending-payments"><PendingPaymentsPage /></ProtectedRoute>} />
              <Route path="/print-templates" element={<ProtectedRoute path="/print-templates"><PrintTemplatesPage /></ProtectedRoute>} />
              <Route path="/admin/roles" element={<ProtectedRoute path="/admin/roles"><RolesPage /></ProtectedRoute>} />
              <Route path="/executive-dashboard" element={<ProtectedRoute path="/executive-dashboard"><ExecutiveDashboardPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
