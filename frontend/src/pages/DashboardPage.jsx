import { lazy } from 'react';
import { useAuthStore } from '../store/authStore';

const ExecutiveDashboard = lazy(() => import('./dashboards/ExecutiveDashboard'));
const CashierDashboard = lazy(() => import('./dashboards/CashierDashboard'));
const InventoryDashboard = lazy(() => import('./dashboards/InventoryDashboard'));
const AuditorDashboard = lazy(() => import('./dashboards/AuditorDashboard'));

const dashboards = {
  super_admin: ExecutiveDashboard,
  admin: ExecutiveDashboard,
  manager: ExecutiveDashboard,
  accountant: ExecutiveDashboard,
  cashier: CashierDashboard,
  inventory_manager: InventoryDashboard,
  auditor: AuditorDashboard,
};

export default function DashboardPage() {
  const role = useAuthStore((s) => s.user?.role);
  const Dashboard = dashboards[role] || ExecutiveDashboard;
  return <Dashboard />;
}
