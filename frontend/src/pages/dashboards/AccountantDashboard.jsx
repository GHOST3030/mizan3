import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { Card, Button, PageHeader } from '../../components/ui';
import { formatCurrency } from '../../utils/currency';

export default function AccountantDashboard() {
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
  const monthSales = d?.month;
  const recentSales = d?.recent_sales || [];

  return (
    <div className="p-6" dir="rtl">
      <PageHeader
        title="لوحة التحكم — المحاسب"
        description={new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card className="p-5 border-r-4 border-green-500 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/sales')}>
          <p className="text-sm text-green-600 font-medium mb-1">مبيعات اليوم</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(todaySales?.total)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">﷼</span></p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">الشهر: {formatCurrency(monthSales?.total)} ﷼</p>
        </Card>
        <Card className="p-5 border-r-4 border-red-400 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/expenses')}>
          <p className="text-sm text-red-500 font-medium mb-1">مصروفات اليوم</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(d?.today_expenses?.total)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">﷼</span></p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{d?.today_expenses?.count || 0} مصروف</p>
        </Card>
        <Card className="p-5 border-r-4 border-amber-400 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/expenses')}>
          <p className="text-sm text-amber-500 font-medium mb-1">مصروفات معلقة</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{d?.pending_expenses || 0}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">تنتظر الاعتماد</p>
        </Card>
        <Card className="p-5 border-r-4 border-blue-400 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/safe')}>
          <p className="text-sm text-blue-600 font-medium mb-1">الخزنة</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{d?.safe_balances?.length || 0}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">حساب</p>
        </Card>
      </div>

      {d?.safe_balances?.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-4 mb-6 dark:bg-gray-800">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3">أرصدة الخزنة</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {d.safe_balances.map((safe) => (
              <div key={safe.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">{safe.name_ar || safe.name}</div>
                <div className="font-bold text-gray-800 dark:text-gray-100">{safe.balance.toLocaleString()} <span className="text-xs font-normal text-gray-400 dark:text-gray-500">{safe.currency?.code}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <Card>
          <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 dark:text-gray-100">⚡ اختصارات سريعة</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            <QuickActionButton label="المصروفات" icon="💸" color="bg-red-500" onClick={() => navigate('/expenses')} />
            <QuickActionButton label="الخزنة" icon="🔒" color="bg-blue-500" onClick={() => navigate('/safe')} />
            <QuickActionButton label="فواتير البيع" icon="🧾" color="bg-green-500" onClick={() => navigate('/sales')} />
            <QuickActionButton label="التقارير" icon="📈" color="bg-teal-500" onClick={() => navigate('/reports')} />
            <QuickActionButton label="الصناديق" icon="💰" color="bg-amber-500" onClick={() => navigate('/cash-registers')} />
            <QuickActionButton label="تحويل عملات" icon="🔄" color="bg-purple-500" onClick={() => navigate('/currency-exchange')} />
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
