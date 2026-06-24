import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import client from '../../api/client';
import { Card, Badge } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/currency';

const roleAccess = {
  super_admin: { kpi: 'all', charts: 'all', alerts: 'all' },
  admin: { kpi: 'all', charts: 'all', alerts: 'all' },
  manager: { kpi: 'all', charts: 'all', alerts: 'all' },
  accountant: { kpi: 'financial', charts: 'monthly_revenue', alerts: 'financial' },
  cashier: { kpi: 'products', charts: 'daily_sales', alerts: 'none' },
  inventory_manager: { kpi: 'products', charts: 'none', alerts: 'inventory' },
  auditor: { kpi: 'financial', charts: 'monthly_revenue', alerts: 'financial' },
};

function useChartData(queryKey, url) {
  return useQuery({
    queryKey,
    queryFn: async () => { const res = await client.get(url); return res.data; },
    refetchInterval: 120000,
    staleTime: 60000,
  });
}

function getAccess(role) {
  return roleAccess[role] || { kpi: 'none', charts: 'none', alerts: 'none' };
}

export default function EnhancedDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const access = getAccess(role);
  const isManager = role === 'manager';

  const { data: financeData, isLoading: financeLoading } = useQuery({
    queryKey: ['dash-finance'],
    queryFn: async () => { const res = await client.get('/executive-dashboard/finance'); return res.data; },
    refetchInterval: 120000,
  });

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['dash-inventory'],
    queryFn: async () => { const res = await client.get('/executive-dashboard/inventory'); return res.data; },
    refetchInterval: 120000,
  });

  const dailyTrend = useChartData(['dash-daily-trend'], '/executive-dashboard/daily-sales-trend?days=30');
  const monthlyTrend = useChartData(['dash-monthly-trend'], '/executive-dashboard/monthly-revenue-trend?months=12');

  const { data: topProducts } = useQuery({
    queryKey: ['dash-top-products'],
    queryFn: async () => { const res = await client.get('/executive-dashboard/top-products?limit=10'); return res.data; },
    refetchInterval: 120000,
  });

  const { data: topCustomers } = useQuery({
    queryKey: ['dash-top-customers'],
    queryFn: async () => { const res = await client.get('/executive-dashboard/top-customers?limit=10'); return res.data; },
    refetchInterval: 120000,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['dash-alerts'],
    queryFn: async () => { const res = await client.get('/executive-dashboard/alerts'); return res.data; },
    refetchInterval: 60000,
  });

  const isLoading = financeLoading || inventoryLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  const f = financeData || {};
  const inv = inventoryData || {};
  const alerts = alertsData?.alerts || [];
  const topRev = topProducts?.by_revenue || [];
  const topCust = topCustomers || [];

  const showAll = access.kpi === 'all';
  const showFinancial = access.kpi === 'financial' || showAll;
  const showProducts = access.kpi === 'products' || showAll;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">لوحة التحكم</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {(showAll || showFinancial) && (
          <KpiCard
            title="الذمم المدينة"
            value={formatCurrency(f.outstanding_receivables || 0)}
            subtitle="مستحقات العملاء"
            color="border-amber-500"
            icon="💰"
            onClick={() => navigate('/pending-payments')}
          />
        )}
        {(showAll || showFinancial) && (
          <KpiCard
            title="الذمم الدائنة"
            value={formatCurrency(f.outstanding_payables || 0)}
            subtitle="مستحقات الموردين"
            color="border-red-500"
            icon="📋"
            onClick={() => navigate('/purchases')}
          />
        )}
        {(showAll || showFinancial) && (
          <KpiCard
            title="إجمالي العملاء"
            value={f.total_customers || 0}
            subtitle="عدد العملاء المسجلين"
            color="border-blue-500"
            icon="👥"
            onClick={() => navigate('/customers')}
          />
        )}
        {(showAll || showFinancial) && (
          <KpiCard
            title="إجمالي الموردين"
            value={f.total_suppliers || 0}
            subtitle="عدد الموردين المسجلين"
            color="border-purple-500"
            icon="🚚"
            onClick={() => navigate('/suppliers')}
          />
        )}
        {(showAll || showProducts) && (
          <KpiCard
            title="إجمالي المنتجات"
            value={inv.total_products || 0}
            subtitle="عدد المنتجات النشطة"
            color="border-green-500"
            icon="📦"
            onClick={() => navigate('/products')}
          />
        )}
      </div>

      {/* Charts Section */}
      <ChartsSection
        access={access}
        dailyTrend={dailyTrend}
        monthlyTrend={monthlyTrend}
        topProducts={topRev}
        topCustomers={topCust}
        navigate={navigate}
      />

      {/* Alert Widgets */}
      {access.alerts !== 'none' && (
        <AlertWidgets
          alerts={alerts}
          access={access}
          inventoryData={inv}
          navigate={navigate}
        />
      )}
    </div>
  );
}

function KpiCard({ title, value, subtitle, color, onClick, icon }) {
  const borderColor = color;
  return (
    <Card className={`border-r-4 ${borderColor} cursor-pointer hover:shadow-md transition-all duration-200`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-bold text-gray-800 dark:text-gray-100 truncate">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{subtitle}</p>}
        </div>
        <span className="text-2xl opacity-60 shrink-0">{icon}</span>
      </div>
    </Card>
  );
}

function ChartsSection({ access, dailyTrend, monthlyTrend, topProducts, topCustomers, navigate }) {
  const showAll = access.charts === 'all';
  const chartCards = [];

  if (showAll || access.charts === 'daily_sales') {
    chartCards.push(
      <Card key="daily" className="p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">اتجاه المبيعات اليومية (آخر 30 يوم)</h3>
        <div className="w-full" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyTrend.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
              <Tooltip
                formatter={(value) => [formatCurrency(value) + ' ﷼', 'المبيعات']}
                labelFormatter={(label) => new Date(label).toLocaleDateString('ar')}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Line type="monotone" dataKey="sales" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  if (showAll || access.charts === 'monthly_revenue') {
    chartCards.push(
      <Card key="monthly" className="p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">الإيرادات الشهرية (آخر 12 شهر)</h3>
        <div className="w-full" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrend.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
              <Tooltip
                formatter={(value) => [formatCurrency(value) + ' ﷼', 'الإيرادات']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  if (showAll) {
    chartCards.push(
      <Card key="top-products" className="p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">أفضل المنتجات</h3>
        <div className="w-full" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProducts.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
              <YAxis type="category" dataKey={(d) => d.product?.name_ar || d.product?.name || ''} tick={{ fontSize: 10 }} stroke="#9ca3af" width={100} />
              <Tooltip
                formatter={(value) => [formatCurrency(value) + ' ﷼', 'الإيرادات']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="total" fill="#a855f7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  if (showAll) {
    chartCards.push(
      <Card key="top-customers" className="p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">أفضل العملاء</h3>
        <div className="w-full" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCustomers.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
              <YAxis type="category" dataKey={(d) => d.customer?.name || ''} tick={{ fontSize: 10 }} stroke="#9ca3af" width={100} />
              <Tooltip
                formatter={(value) => [formatCurrency(value) + ' ﷼', 'المشتريات']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="total" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  const gridCols = chartCards.length <= 2 ? `grid-cols-1 ${chartCards.length === 2 ? 'lg:grid-cols-2' : ''}` : 'grid-cols-1 md:grid-cols-2';

  return (
    <div className={`grid ${gridCols} gap-6`}>
      {chartCards}
    </div>
  );
}

function AlertWidgets({ alerts, access, inventoryData, navigate }) {
  const filteredAlerts = useMemo(() => {
    if (access.alerts === 'all') return alerts;
    if (access.alerts === 'financial') return alerts.filter((a) =>
      a.title?.includes('ذمم') || a.title?.includes('مصروفات')
    );
    if (access.alerts === 'inventory') return alerts.filter((a) =>
      a.title?.includes('مخزون')
    );
    return [];
  }, [alerts, access.alerts]);

  if (filteredAlerts.length === 0) return null;

  const typeStyles = {
    danger: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500', title: 'text-red-700 dark:text-red-300' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500', title: 'text-amber-700 dark:text-amber-300' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500', title: 'text-blue-700 dark:text-blue-300' },
  };

  return (
    <Card>
      <div className="p-5 border-b dark:border-gray-700">
        <h3 className="font-bold text-gray-800 dark:text-gray-100">التنبيهات</h3>
      </div>
      <div className="p-5 space-y-3">
        {filteredAlerts.map((alert, i) => {
          const s = typeStyles[alert.type] || typeStyles.info;
          return (
            <div key={i} className={`${s.bg} ${s.border} border rounded-xl p-4 cursor-pointer hover:shadow-sm transition`}
              onClick={() => alert.link && navigate(alert.link)}>
              <div className="flex items-start gap-3">
                <span className={`w-2.5 h-2.5 ${s.dot} rounded-full mt-1.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${s.title}`}>{alert.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{alert.message}</p>
                  {alert.items && alert.items.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {alert.items.map((item, j) => (
                        <p key={j} className="text-xs text-gray-500 dark:text-gray-400">
                          {item.name_ar} — المخزون: {item.current_stock} / الحد: {item.min_stock}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <Badge color={alert.type === 'danger' ? 'red' : alert.type === 'warning' ? 'yellow' : 'blue'}>{alert.count}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
