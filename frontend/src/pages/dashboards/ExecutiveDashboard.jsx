import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { Card, Badge } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { useFieldPermission } from '../../hooks/useFieldPermission';
import { formatCurrency } from '../../utils/currency';
import FloatingActionButton from '../../components/FloatingActionButton';

const KPI_ICONS = {
  sales: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  profit: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
  invoice: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  customers: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  expenses: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
  purchases: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  products: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
  suppliers: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>,
  receivables: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
  payables: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>,
};

function TrendBadge({ value, inverse = false }) {
  if (value === null || value === undefined) return null;
  const isUp = inverse ? value < 0 : value > 0;
  const isDown = inverse ? value > 0 : value < 0;
  const color = isUp ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400'
    : isDown ? 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400'
    : 'text-gray-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${color}`}>
      {isUp ? (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
      ) : isDown ? (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
      ) : null}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function KpiSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
          <div className="h-7 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

function KpiCard({ title, value, subtitle, trend, icon, color, onClick, loading }) {
  const colorMap = {
    green: { border: 'border-green-500', bg: 'from-green-500/10', text: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-100 dark:bg-green-900/40', iconColor: 'text-green-600 dark:text-green-400' },
    emerald: { border: 'border-emerald-500', bg: 'from-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    blue: { border: 'border-blue-500', bg: 'from-blue-500/10', text: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400' },
    purple: { border: 'border-purple-500', bg: 'from-purple-500/10', text: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-600 dark:text-purple-400' },
    amber: { border: 'border-amber-500', bg: 'from-amber-500/10', text: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400' },
    red: { border: 'border-red-500', bg: 'from-red-500/10', text: 'text-red-600 dark:text-red-400', iconBg: 'bg-red-100 dark:bg-red-900/40', iconColor: 'text-red-600 dark:text-red-400' },
    cyan: { border: 'border-cyan-500', bg: 'from-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', iconColor: 'text-cyan-600 dark:text-cyan-400' },
    indigo: { border: 'border-indigo-500', bg: 'from-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400' },
  };
  const s = colorMap[color] || colorMap.blue;
  return (
    <div onClick={onClick}
      className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 border-r-4 ${s.border} p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} to-transparent opacity-50 group-hover:opacity-80 transition-opacity`} />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium mb-1.5 ${s.text}`}>{title}</p>
            {loading ? (
              <div className="space-y-2"><div className="h-7 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /><div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></div>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">{value}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {trend !== undefined && <TrendBadge value={trend} />}
                  {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
                </div>
              </>
            )}
          </div>
          {icon && <div className={`w-10 h-10 rounded-xl ${s.iconBg} ${s.iconColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>{icon}</div>}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, show = true }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-0.5 w-6 rounded-full bg-gradient-to-l from-blue-500 to-blue-400" />
      <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 tracking-wide">{title}</h3>
      {subtitle && <span className="text-xs text-gray-400 dark:text-gray-500">— {subtitle}</span>}
    </div>
  );
}

function KpiRow({ title, subtitle, children, show = true }) {
  if (!show) return null;
  return (
    <div>
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {children}
      </div>
    </div>
  );
}

function SalesKpiCards({ today, month, navigate, showProfit }) {
  return (
    <>
      <KpiRow title="اليوم" subtitle={today ? new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : undefined} show={!!today}>
        {!today ? [1,2,3,4].map(i => <KpiSkeleton key={i} />) : (
          <>
            <KpiCard title="إجمالي المبيعات" value={`${formatCurrency(today.total_sales)} ﷼`} subtitle={today.invoice_count > 0 ? `${today.invoice_count} فاتورة` : undefined} trend={today.trends?.sales} icon={KPI_ICONS.sales} color="green" onClick={() => navigate('/sales')} />
            {showProfit && <KpiCard title="صافي الربح" value={`${formatCurrency(today.net_profit)} ﷼`} subtitle={today.expense_count > 0 ? `مصروفات ${formatCurrency(today.expenses)} ﷼` : undefined} trend={today.trends?.profit} icon={KPI_ICONS.profit} color="emerald" onClick={() => navigate('/reports')} />}
            <KpiCard title="عدد الفواتير" value={today.invoice_count} subtitle={today.active_customers > 0 ? `${today.active_customers} عميل نشط` : undefined} icon={KPI_ICONS.invoice} color="blue" onClick={() => navigate('/sales')} />
            <KpiCard title="العملاء النشطون" value={today.active_customers} icon={KPI_ICONS.customers} color="purple" onClick={() => navigate('/customers')} />
          </>
        )}
      </KpiRow>

      <KpiRow title="الشهر الحالي" subtitle={month ? `إجمالي المبيعات ${formatCurrency(month.total_sales)} ﷼` : undefined} show={!!month}>
        {!month ? [1,2,3,4].map(i => <KpiSkeleton key={i} />) : (
          <>
            <KpiCard title="إجمالي المبيعات" value={`${formatCurrency(month.total_sales)} ﷼`} subtitle={month.sales_count > 0 ? `${month.sales_count} فاتورة` : undefined} trend={month.trends?.sales} icon={KPI_ICONS.sales} color="green" onClick={() => navigate('/reports')} />
            {showProfit && <KpiCard title="صافي الربح" value={`${formatCurrency(month.total_profit)} ﷼`} trend={month.trends?.profit} icon={KPI_ICONS.profit} color="emerald" onClick={() => navigate('/reports')} />}
            <KpiCard title="المصروفات" value={`${formatCurrency(month.total_expenses)} ﷼`} subtitle={month.expense_count > 0 ? `${month.expense_count} مصروف` : undefined} trend={month.trends?.expenses} icon={KPI_ICONS.expenses} color="red" onClick={() => navigate('/expenses')} />
            <KpiCard title="إجمالي المشتريات" value={`${formatCurrency(month.purchase_amount)} ﷼`} subtitle={month.purchase_count > 0 ? `${month.purchase_count} فاتورة` : undefined} icon={KPI_ICONS.purchases} color="amber" onClick={() => navigate('/purchases')} />
          </>
        )}
      </KpiRow>
    </>
  );
}

function BusinessKpiCards({ finance, inventory, navigate, showFinancialSummary }) {
  if (!finance && !inventory) return null;
  return (
    <KpiRow title="مؤشرات الأعمال">
      {finance && (
        <>
          {showFinancialSummary && (
            <KpiCard title="الذمم المدينة" value={`${formatCurrency(finance.outstanding_receivables)} ﷼`} icon={KPI_ICONS.receivables} color="cyan" onClick={() => navigate('/pending-payments')} />
          )}
          {showFinancialSummary && (
            <KpiCard title="الذمم الدائنة" value={`${formatCurrency(finance.outstanding_payables)} ﷼`} icon={KPI_ICONS.payables} color="red" onClick={() => navigate('/purchases')} />
          )}
          <KpiCard title="إجمالي العملاء" value={finance.total_customers || 0} icon={KPI_ICONS.customers} color="blue" onClick={() => navigate('/customers')} />
          <KpiCard title="إجمالي الموردين" value={finance.total_suppliers || 0} icon={KPI_ICONS.suppliers} color="amber" onClick={() => navigate('/suppliers')} />
        </>
      )}
      {inventory && (
        <KpiCard title="إجمالي المنتجات" value={inventory.total_products || 0} icon={KPI_ICONS.products} color="purple" onClick={() => navigate('/products')} />
      )}
    </KpiRow>
  );
}

function MiniBarChart({ data, dataKey, labelKey, height = 160, color = '#22c55e' }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center" style={{ height }}><p className="text-xs text-gray-400 dark:text-gray-500">لا توجد بيانات</p></div>
  );
  const values = data.map(d => d[dataKey]);
  const maxVal = Math.max(...values, 1);
  return (
    <div className="flex items-end justify-between gap-1" style={{ height }}>
      {data.map((d, i) => {
        const pct = (d[dataKey] / maxVal) * 100;
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0 group relative">
            <div className="hidden group-hover:block absolute -top-8 bg-gray-800 dark:bg-gray-700 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
              {formatCurrency(d[dataKey])} ﷼
            </div>
            <div className="w-full rounded-t-md transition-all duration-300 hover:opacity-80 cursor-pointer" style={{ height: `${Math.max(pct, 2)}%`, backgroundColor: color }} />
            <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate w-full text-center">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChartsSection({ dailyTrend, monthlyTrend, navigate, showDaily = true, showMonthly = true }) {
  if (!showDaily && !showMonthly) return null;
  if (!dailyTrend || dailyTrend.length === 0) showDaily = false;
  if (!monthlyTrend || monthlyTrend.length === 0) showMonthly = false;
  if (!showDaily && !showMonthly) return null;

  const formattedDaily = (dailyTrend || []).map(d => ({
    ...d,
    date: d.date ? d.date.slice(5) : d.date,
  }));

  return (
    <div className={`grid grid-cols-1 ${(showDaily && showMonthly) ? 'lg:grid-cols-2' : ''} gap-6`}>
      {showDaily && (
        <Card>
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                </div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">اتجاه المبيعات اليومي</h3>
              </div>
              <button onClick={() => navigate('/reports')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">تقرير كامل</button>
            </div>
          </div>
          <div className="p-5">
            <MiniBarChart data={formattedDaily} dataKey="sales" labelKey="date" color="#22c55e" />
          </div>
        </Card>
      )}

      {showMonthly && (
        <Card>
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                </div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">اتجاه الإيرادات الشهري</h3>
              </div>
              <button onClick={() => navigate('/reports')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">تقرير كامل</button>
            </div>
          </div>
          <div className="p-5">
            <MiniBarChart data={monthlyTrend} dataKey="revenue" labelKey="label" color="#3b82f6" />
          </div>
        </Card>
      )}
    </div>
  );
}

function InventoryCards({ data, navigate, showValue }) {
  if (!data) return null;
  return (
    <Card className="h-full">
      <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
          </div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100">المخزون</h3>
        </div>
        <Badge color="blue">{data.total_products || 0} منتج</Badge>
      </div>
      <div className="p-5 grid grid-cols-2 gap-3">
        {showValue && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition border border-gray-100 dark:border-gray-700" onClick={() => navigate('/reports')}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">قيمة المخزون</p><p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrency(data.inventory_value)} ﷼</p>
          </div>
        )}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition border border-gray-100 dark:border-gray-700" onClick={() => navigate('/inventory')}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">قيمة البيع</p><p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrency(data.inventory_selling_value)} ﷼</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition border border-amber-100 dark:border-amber-800/50" onClick={() => navigate('/inventory/low-stock')}>
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">مخزون منخفض</p><p className="text-lg font-bold text-amber-700 dark:text-amber-300">{data.low_stock_count || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition border border-red-100 dark:border-red-800/50" onClick={() => navigate('/inventory/low-stock')}>
          <p className="text-xs text-red-600 dark:text-red-400 mb-1">نفد من المخزون</p><p className="text-lg font-bold text-red-700 dark:text-red-300">{data.out_of_stock_count || 0}</p>
        </div>
      </div>
    </Card>
  );
}

function FinanceCards({ data, navigate, showSafeBalance }) {
  if (!data) return null;
  return (
    <Card className="h-full">
      <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>
          </div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100">المالية</h3>
        </div>
        <Badge color="green">{data.pending_payment_schedules_count || 0} دفعة معلقة</Badge>
      </div>
      <div className="p-5 grid grid-cols-2 gap-3">
        {showSafeBalance && (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition border border-blue-100 dark:border-blue-800/50" onClick={() => navigate('/cash-registers')}>
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">رصيد الصندوق</p><p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(data.cash_balance)} ﷼</p>
          </div>
        )}
        {showSafeBalance && (
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/10 rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition border border-indigo-100 dark:border-indigo-800/50" onClick={() => navigate('/safe')}>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">رصيد الخزنة</p><p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(data.safe_balance)} ﷼</p>
          </div>
        )}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition border border-amber-100 dark:border-amber-800/50" onClick={() => navigate('/pending-payments')}>
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">ذمم مدينة</p><p className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatCurrency(data.outstanding_receivables)} ﷼</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition border border-red-100 dark:border-red-800/50" onClick={() => navigate('/purchases')}>
          <p className="text-xs text-red-600 dark:text-red-400 mb-1">ذمم دائنة</p><p className="text-lg font-bold text-red-700 dark:text-red-300">{formatCurrency(data.outstanding_payables)} ﷼</p>
        </div>
      </div>
    </Card>
  );
}

const SectionCard = ({ title, icon, badge, children }) => (
  <Card className="h-full">
    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon && <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">{icon}</div>}
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{title}</h3>
      </div>
      {badge && <Badge color="gray" className="text-xs">{badge}</Badge>}
    </div>
    {children}
  </Card>
);

const AnalyticsEmptyState = () => (
  <div className="p-6 text-center">
    <svg className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
    <p className="text-sm text-gray-400 dark:text-gray-500">لا توجد بيانات</p>
  </div>
);

function TopAnalytics({ data, navigate }) {
  const topRevenue = data?.top_products?.by_revenue || [];
  const topCustomers = data?.top_customers || [];
  const topSuppliers = data?.top_suppliers || [];
  if (topRevenue.length === 0 && topCustomers.length === 0 && topSuppliers.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SectionCard title="أفضل 10 منتجات" icon={<svg className="w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>} badge="إيرادات">
        {topRevenue.length === 0 ? <AnalyticsEmptyState /> : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {topRevenue.slice(0, 10).map((p, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${i < 3 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{i + 1}</span>
                  <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{p.product?.name_ar || p.product?.name}</span>
                </div>
                <span className="text-sm font-bold text-green-600 dark:text-green-400 shrink-0 mr-2">{formatCurrency(p.total)} ﷼</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="أفضل 10 عملاء" icon={<svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}>
        {topCustomers.length === 0 ? <AnalyticsEmptyState /> : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {topCustomers.slice(0, 10).map((c, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition" onClick={() => navigate('/customers')}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="min-w-0"><p className="text-sm text-gray-800 dark:text-gray-100 truncate">{c.customer?.name}</p><p className="text-xs text-gray-400 dark:text-gray-500">{c.invoices} فاتورة</p></div>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">{formatCurrency(c.total)} ﷼</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="أفضل الموردين" icon={<svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>}>
        {topSuppliers.length === 0 ? <AnalyticsEmptyState /> : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {topSuppliers.slice(0, 10).map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition" onClick={() => navigate('/suppliers')}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="min-w-0"><p className="text-sm text-gray-800 dark:text-gray-100 truncate">{s.supplier?.name}</p><p className="text-xs text-gray-400 dark:text-gray-500">{s.count} فاتورة</p></div>
                </div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 shrink-0">{formatCurrency(s.total)} ﷼</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function AlertsWidget({ data, navigate }) {
  if (!data || data.length === 0) return null;

  const typeStyles = {
    danger: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500', title: 'text-red-700 dark:text-red-300' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500', title: 'text-amber-700 dark:text-amber-300' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500', title: 'text-blue-700 dark:text-blue-300' },
  };

  const alertIcons = {
    'مخزون منخفض': { icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /></svg>, color: 'text-red-500' },
    'رصيد سلبي في الصندوق': { icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>, color: 'text-red-500' },
    'مصروفات معلقة': { icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>, color: 'text-amber-500' },
    'ذمم مدينة متأخرة': { icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></svg>, color: 'text-amber-500' },
    'ذمم دائنة مستحقة': { icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>, color: 'text-blue-500' },
  };

  return (
    <Card>
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          </div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100">التنبيهات</h3>
        </div>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {data.map((alert, i) => {
          const s = typeStyles[alert.type] || typeStyles.info;
          const ai = alertIcons[alert.title] || { icon: null, color: 'text-gray-500' };
          return (
            <div key={i} className={`${s.bg} ${s.border} border rounded-xl p-4 cursor-pointer hover:shadow-sm transition flex flex-col`}
              onClick={() => alert.link && navigate(alert.link)}>
              <div className="flex items-center gap-2 mb-2">
                {ai.icon && <span className={ai.color}>{ai.icon}</span>}
                <span className={`w-2 h-2 ${s.dot} rounded-full`} />
                <Badge color={alert.type === 'danger' ? 'red' : alert.type === 'warning' ? 'yellow' : 'blue'}>{alert.count}</Badge>
              </div>
              <p className={`text-sm font-bold ${s.title} mb-0.5`}>{alert.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">{alert.message}</p>
              {alert.items && alert.items.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                  {alert.items.map((item, j) => (
                    <p key={j} className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                      {item.name_ar || item.name} — {item.current_stock}/{item.min_stock}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DashboardSkeleton({ showBusinessKpi = true, showCharts = true }) {
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div><SectionHeader title="اليوم" /><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">{[1,2,3,4].map(i => <KpiSkeleton key={i} />)}</div></div>
      <div><SectionHeader title="الشهر الحالي" /><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">{[1,2,3,4].map(i => <KpiSkeleton key={i} />)}</div></div>
      {showBusinessKpi && <div><SectionHeader title="مؤشرات الأعمال" /><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <KpiSkeleton key={i} />)}</div></div>}
      {showCharts && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{[1,2].map(i => <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse p-5"><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" /><div className="h-40 bg-gray-100 dark:bg-gray-700/50 rounded-xl" /></div>)}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1,2].map(i => <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse p-5"><div className="flex items-center justify-between mb-4"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" /><div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" /></div><div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(j => <div key={j} className="h-20 bg-gray-100 dark:bg-gray-700/50 rounded-xl" />)}</div></div>)}
      </div>
    </div>
  );
}

function useRolePermissions(role) {
  const showFullKPIs = ['super_admin', 'admin', 'manager'].includes(role);
  const showFinancialKPIs = ['super_admin', 'admin', 'manager', 'accountant'].includes(role);
  const showSalesKPIs = ['super_admin', 'admin', 'manager', 'cashier'].includes(role);
  const showInventorySection = ['super_admin', 'admin', 'manager', 'inventory_manager'].includes(role);
  const showCharts = ['super_admin', 'admin', 'manager'].includes(role);
  const showChartsFinancial = ['super_admin', 'admin', 'manager', 'accountant'].includes(role);
  const showAlerts = ['super_admin', 'admin', 'manager'].includes(role);
  const showProfit = ['super_admin', 'admin', 'manager'].includes(role);
  const showTopAnalytics = ['super_admin', 'admin', 'manager'].includes(role);
  return { showFullKPIs, showFinancialKPIs, showSalesKPIs, showInventorySection, showCharts, showChartsFinancial, showAlerts, showProfit, showTopAnalytics };
}

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const { canViewDailyProfit, canViewInventoryValue, canViewSafeBalance, canViewFinancialSummary } = useFieldPermission();
  const perm = useRolePermissions(role);

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['executive-dashboard'],
    queryFn: async () => { const res = await client.get('/executive-dashboard'); return res.data; },
    refetchInterval: 120000,
  });

  if (isLoading) return <DashboardSkeleton showBusinessKpi={perm.showFullKPIs} showCharts={perm.showCharts} />;

  const d = data || {};

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">لوحة القيادة التنفيذية</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {dataUpdatedAt && <span className="mr-2 text-xs text-gray-400 dark:text-gray-500">آخر تحديث: {new Date(dataUpdatedAt).toLocaleTimeString('ar')}</span>}
          </p>
        </div>
      </div>

      <SalesKpiCards today={d.today} month={d.month} navigate={navigate} showProfit={perm.showProfit && canViewDailyProfit()} />

      {(perm.showFullKPIs || perm.showFinancialKPIs) && <BusinessKpiCards finance={d.finance} inventory={d.inventory} navigate={navigate} showFinancialSummary={perm.showFinancialKPIs && canViewFinancialSummary()} />}

      {(perm.showCharts || perm.showChartsFinancial) && <ChartsSection dailyTrend={d.daily_sales_trend} monthlyTrend={d.monthly_revenue_trend} navigate={navigate} showDaily={perm.showCharts} showMonthly={perm.showChartsFinancial} />}

      {(perm.showInventorySection || perm.showFinancialKPIs) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {perm.showInventorySection && <InventoryCards data={d.inventory} navigate={navigate} showValue={canViewInventoryValue()} />}
          {perm.showFinancialKPIs && <FinanceCards data={d.finance} navigate={navigate} showSafeBalance={canViewSafeBalance()} />}
        </div>
      )}

      {perm.showTopAnalytics && <TopAnalytics data={d} navigate={navigate} />}

      {perm.showAlerts && <AlertsWidget data={d.alerts} navigate={navigate} />}

      <FloatingActionButton />
    </div>
  );
}