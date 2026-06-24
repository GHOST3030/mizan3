import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import client from '../api/client';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  FileText, ShoppingBag, Warehouse, Building2, ArrowLeftRight,
  ClipboardList, Trash2, AlertTriangle, Wallet, Banknote,
  ShieldCheck, ArrowRightLeft, Clock, Tags, FolderOpen, CircleDollarSign,
  UserCog, Building, Settings, BarChart3, LogOut, ChevronLeft, Moon, Sun, Printer,
  Plus,
} from 'lucide-react';
import { ToastContainer } from './ui';
const roleLabels = {
  super_admin: 'المشرف العام',
  admin: 'مدير النظام',
  manager: 'مدير الفرع',
  cashier: 'الكاشير',
  accountant: 'المحاسب',
  inventory_manager: 'مسؤول المخزون',
  auditor: 'مدقق',
};

const ALL = ['super_admin', 'admin', 'manager', 'cashier', 'accountant', 'inventory_manager', 'auditor'];
const ADM_MGR = ['super_admin', 'admin', 'manager'];
const ADM_MGR_INV = ['super_admin', 'admin', 'manager', 'inventory_manager'];
const ADM_MGR_CASH = ['super_admin', 'admin', 'manager', 'cashier'];

const navItems = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, roles: ALL },
  { to: '/executive-dashboard', label: 'لوحة القيادة', icon: BarChart3, roles: ['super_admin', 'admin', 'manager', 'accountant', 'inventory_manager'] },
  { to: '/pos', label: 'نقطة البيع', icon: ShoppingCart, roles: ALL },
  { to: '/products', label: 'المنتجات', icon: Package, roles: ADM_MGR_INV },
  { to: '/customers', label: 'العملاء', icon: Users, roles: ADM_MGR_CASH },
  { to: '/suppliers', label: 'الموردين', icon: Truck, roles: ADM_MGR },
  { to: '/sales', label: 'فواتير البيع', icon: FileText, roles: [...ADM_MGR_CASH, 'accountant'] },
  { to: '/purchases', label: 'المشتريات', icon: ShoppingBag, roles: ADM_MGR },
];

const inventoryItems = [
  { to: '/inventory', label: 'المخزون', icon: Warehouse, roles: ADM_MGR_INV },
  { to: '/warehouses', label: 'المستودعات', icon: Building2, roles: ADM_MGR_INV },
  { to: '/inventory/transfer', label: 'تحويل مخزون', icon: ArrowLeftRight, roles: ADM_MGR_INV },
  { to: '/inventory/stock-count', label: 'جرد المخزون', icon: ClipboardList, roles: ADM_MGR_INV },
  { to: '/inventory/wastage', label: 'تالف ومفقود', icon: Trash2, roles: ADM_MGR_INV },
  { to: '/inventory/low-stock', label: 'مخزون منخفض', icon: AlertTriangle, roles: [...ADM_MGR_INV, 'accountant'] },
];

const ADM_MGR_ACCT = ['super_admin', 'admin', 'manager', 'accountant'];

const financeItems = [
  { to: '/expenses', label: 'المصروفات', icon: Wallet, roles: [...ADM_MGR_CASH, 'accountant'] },
  { to: '/cash-registers', label: 'الصناديق', icon: Banknote, roles: ADM_MGR_ACCT },
  { to: '/safe', label: 'الخزنة', icon: ShieldCheck, roles: ADM_MGR_ACCT },
  { to: '/currency-exchange', label: 'تحويل عملات', icon: ArrowRightLeft, roles: ADM_MGR_ACCT },
  { to: '/shifts', label: 'الورديات', icon: Clock, roles: ADM_MGR_CASH },
];

const managementItems = [
  { to: '/customer-groups', label: 'مجموعات العملاء', icon: Tags, roles: ADM_MGR },
  { to: '/supplier-categories', label: 'تصنيفات الموردين', icon: FolderOpen, roles: ADM_MGR },
  { to: '/currencies', label: 'العملات', icon: CircleDollarSign, roles: ADM_MGR },
  { to: '/users', label: 'المستخدمين', icon: UserCog, roles: ['super_admin', 'admin'] },
  { to: '/company', label: 'الشركة والفروع', icon: Building, roles: ADM_MGR },
  { to: '/settings', label: 'الإعدادات', icon: Settings, roles: ['super_admin', 'admin'] },
  { to: '/print-templates', label: 'قوالب الطباعة', icon: Printer, roles: ADM_MGR },
  { to: '/reports', label: 'التقارير', icon: BarChart3, roles: [...ADM_MGR, 'accountant'] },
  { to: '/admin/roles', label: 'الأدوار والصلاحيات', icon: ShieldCheck, roles: ['super_admin', 'admin'] },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { dark, toggle: toggleTheme } = useTheme();
  const userId = useAuthStore((s) => s.user?.id);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const { data: activeShift } = useQuery({
    queryKey: ['active-shift', userId],
    queryFn: async () => {
      const res = await client.get('/finance/shifts', { params: { user_id: userId, limit: 1 } });
      const open = res.data.data?.find((s) => !s.closed_at);
      return open || null;
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavSection = (title, items) => {
    const filtered = items.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(user?.role);
    });
    if (filtered.length === 0) return null;
    return (
      <div className="mb-1">
        {!collapsed && <p className="text-[11px] text-gray-400 dark:text-gray-500 px-3 mb-1 mt-3 font-medium tracking-wide">{title}</p>}
        {filtered.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-900/40 dark:text-blue-400'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              }`
            }
          >
            <item.icon className={`w-5 h-5 shrink-0 transition-colors duration-150 ${
              collapsed ? 'mx-auto' : ''
            }`} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950" dir="rtl">
      <aside className={`bg-white border-l border-gray-200 dark:bg-gray-900 dark:border-gray-800 flex flex-col transition-all duration-200 ${collapsed ? 'w-[60px]' : 'w-56'}`}>
        <div className={`p-3 border-b border-gray-100 dark:border-gray-800 flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
          <img src="/logo.jpg" alt="ميزان" className="w-8 h-8 rounded-xl object-cover shrink-0" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-100 block leading-tight truncate">ميزان</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block truncate">{user?.name || 'مستخدم'}</span>
              <span className="text-[9px] text-blue-500 dark:text-blue-400 block truncate">{roleLabels[user?.role] || ''}</span>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className="text-gray-300 hover:text-gray-500 p-1 rounded-lg hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition shrink-0">
            <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {activeShift && !collapsed && (
          <div className="mx-3 mt-3 p-2 bg-green-50 border border-green-200 dark:bg-green-900/40 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-700 dark:text-green-300 font-medium">وردية مفتوحة</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {new Date(activeShift.opened_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}

        <nav className="flex-1 px-2 py-1 space-y-1 overflow-y-auto">
          {renderNavSection('', navItems)}
          {renderNavSection('المخزون', inventoryItems)}
          {renderNavSection('المالية', financeItems)}
          {renderNavSection('الإدارة', managementItems)}
        </nav>

        <div className="p-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
          <button onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-all duration-150 group">
            {dark ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            {!collapsed && <span>{dark ? 'وضع فاتح' : 'وضع داكن'}</span>}
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-950 rounded-lg transition-all duration-150 group">
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>تسجيل خروج</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <QuickActions user={user} navigate={navigate} />
      <ToastContainer />
    </div>
  );
}

function QuickActions({ user, navigate }) {
  const [open, setOpen] = useState(false);

  const actions = [
    { label: 'فاتورة بيع جديدة', icon: ShoppingCart, path: '/pos', color: 'bg-green-500', roles: ['super_admin', 'admin', 'manager', 'cashier'] },
    { label: 'فاتورة شراء جديدة', icon: ShoppingBag, path: '/purchases', color: 'bg-blue-500', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'عميل جديد', icon: Users, path: '/customers', color: 'bg-purple-500', roles: ['super_admin', 'admin', 'manager', 'cashier'] },
    { label: 'مورد جديد', icon: Truck, path: '/suppliers', color: 'bg-amber-500', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'مصروف جديد', icon: Wallet, path: '/expenses', color: 'bg-red-500', roles: ['super_admin', 'admin', 'manager', 'accountant'] },
    { label: 'تحويل مخزون', icon: ArrowLeftRight, path: '/inventory/transfer', color: 'bg-indigo-500', roles: ['super_admin', 'admin', 'manager', 'inventory_manager'] },
  ];

  const filtered = actions.filter((a) => a.roles.includes(user?.role));

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="flex flex-col items-end gap-3 relative">
            {filtered.map((action) => (
              <button
                key={action.path}
                onClick={() => { navigate(action.path); setOpen(false); }}
                className="flex items-center gap-2 bg-white dark:bg-gray-800 shadow-lg rounded-full pl-4 pr-3 py-2 hover:shadow-xl transition-all duration-200 group animate-fade-in"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">{action.label}</span>
                <span className={`w-9 h-9 ${action.color} rounded-full flex items-center justify-center`}>
                  <action.icon className="w-4 h-4 text-white" />
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open
            ? 'bg-red-500 hover:bg-red-600 rotate-45'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        <Plus className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}
