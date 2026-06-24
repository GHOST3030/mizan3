import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { Card, Badge, Button, PageHeader } from '../../components/ui';
import { formatCurrency } from '../../utils/currency';

export default function ManagerDashboard() {
  const navigate = useNavigate();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => { const res = await client.get('/reports/dashboard'); return res.data; },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const d = dashboard;
  const todaySales = d?.today;
  const weekSales = d?.week;
  const monthSales = d?.month;
  const topProducts = d?.today?.top_products || [];
  const recentSales = d?.recent_sales || [];
  const lowStockProducts = d?.low_stock_products || [];

  return (
    <div className="p-6" dir="rtl">
      <PageHeader
        title="لوحة التحكم — المدير"
        description={new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        actions={<Badge color={d?.active_shifts > 0 ? 'green' : 'gray'}>{d?.active_shifts > 0 ? `${d.active_shifts} وردية مفتوحة` : 'لا توجد ورديات مفتوحة'}</Badge>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card className="p-5 border-r-4 border-blue-500" onClick={() => navigate('/sales')}>
          <p className="text-sm text-blue-600 font-medium mb-1">فواتير اليوم</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{todaySales?.sales_count || 0}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">مقابل {weekSales?.sales_count || 0} هذا الأسبوع</p>
        </Card>
        <Card className="p-5 border-r-4 border-green-500">
          <p className="text-sm text-green-600 font-medium mb-1">مبيعات اليوم</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(todaySales?.total)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">﷼</span></p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">الشهر: {formatCurrency(monthSales?.total)} ﷼</p>
        </Card>
        <Card className="p-5 border-r-4 border-red-400">
          <p className="text-sm text-red-600 font-medium mb-1">مصروفات اليوم</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(d?.today_expenses?.total)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">﷼</span></p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{d?.today_expenses?.count || 0} مصروف</p>
        </Card>
        <Card className="p-5 border-r-4 border-purple-500 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/inventory/low-stock')}>
          <p className="text-sm text-purple-600 font-medium mb-1">مخزون منخفض</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{lowStockProducts.length}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">منتج يحتاج إعادة طلب</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <div className="p-5 border-b dark:border-gray-700">
            <h2 className="font-bold text-gray-800 dark:text-gray-100">🏆 أكثر المنتجات مبيعاً اليوم</h2>
          </div>
          {topProducts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">لا توجد مبيعات اليوم</div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {topProducts.slice(0, 5).map((p, i) => (
                <div key={p.product_id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5">{i + 1}</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{p.product?.name_ar || p.product?.name || '—'}</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">{p.quantity || 0} وحدة</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 dark:text-gray-100">🕐 آخر المبيعات</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>عرض الكل</Button>
          </div>
          {recentSales.length === 0 ? (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">لا توجد مبيعات</div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {recentSales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {sale.customer?.name || 'زبون نقدي'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{sale.invoice_number}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-green-600">{(sale.total || 0).toLocaleString()} ﷼</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(sale.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 dark:text-gray-100">⚡ الاختصارات السريعة</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            <QuickActionButton label="نقطة البيع" icon="🛒" color="bg-blue-500" onClick={() => navigate('/pos')} />
            <QuickActionButton label="فواتير البيع" icon="🧾" color="bg-green-500" onClick={() => navigate('/sales')} />
            <QuickActionButton label="المصروفات" icon="💸" color="bg-red-500" onClick={() => navigate('/expenses')} />
            <QuickActionButton label="المنتجات" icon="📦" color="bg-purple-500" onClick={() => navigate('/products')} />
            <QuickActionButton label="المشتريات" icon="📥" color="bg-amber-500" onClick={() => navigate('/purchases')} />
            <QuickActionButton label="التقارير" icon="📈" color="bg-teal-500" onClick={() => navigate('/reports')} />
          </div>
        </Card>

        <Card>
          <div className="p-5 border-b dark:border-gray-700">
            <h2 className="font-bold text-gray-800 dark:text-gray-100">📊 ملخص سريع</h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">مصروفات معلقة</span>
              <span className="font-bold text-amber-600">{d?.pending_expenses || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">ورديات مفتوحة</span>
              <span className="font-bold text-green-600">{d?.active_shifts || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">العملاء</span>
              <span className="font-bold text-teal-600">{d?.total_customers || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">الموردين</span>
              <span className="font-bold text-indigo-600">{d?.total_suppliers || 0}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickActionButton({ label, icon, color, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:shadow-md dark:hover:shadow-gray-900 transition text-right">
      <span className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-white text-lg`}>{icon}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
    </button>
  );
}
