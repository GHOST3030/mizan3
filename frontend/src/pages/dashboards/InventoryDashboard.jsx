import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { Card, Badge, Button, PageHeader } from '../../components/ui';
import { formatCurrency } from '../../utils/currency';

export default function InventoryDashboard() {
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
  const lowStockProducts = d?.low_stock_products || [];


  return (
    <div className="p-6" dir="rtl">
      <PageHeader
        title="لوحة التحكم — مسؤول المخزون"
        description={new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card className="p-5 border-r-4 border-purple-500 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/inventory/low-stock')}>
          <p className="text-sm text-purple-600 font-medium mb-1">مخزون منخفض</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{lowStockProducts.length}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">منتج يحتاج إعادة طلب</p>
        </Card>
        <Card className="p-5 border-r-4 border-amber-500 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/products')}>
          <p className="text-sm text-amber-600 font-medium mb-1">المنتجات</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{d?.summary?.total_products || 0}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">منتج</p>
        </Card>
        <Card className="p-5 border-r-4 border-blue-500 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/inventory')}>
          <p className="text-sm text-blue-600 font-medium mb-1">المخزون</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(d?.summary?.total_inventory_value)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">﷼ قيمة المخزون</p>
        </Card>
        <Card className="p-5 border-r-4 border-green-500 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/warehouses')}>
          <p className="text-sm text-green-600 font-medium mb-1">المستودعات</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{d?.summary?.total_warehouses || 0}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">مستودع</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 dark:text-gray-100">⚠️ منتجات منخفضة المخزون</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/inventory/low-stock')}>عرض الكل</Button>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">جميع المنتجات متوفرة بكميات كافية</div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {lowStockProducts.slice(0, 10).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{p.name_ar || p.name}</span>
                  <Badge color={p.current_stock === 0 ? 'red' : 'amber'}>
                    {p.current_stock === 0 ? 'نفد بالكامل' : `متبقي ${p.current_stock}`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="p-5 border-b dark:border-gray-700">
            <h2 className="font-bold text-gray-800 dark:text-gray-100">⚡ اختصارات سريعة</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            <QuickActionButton label="المنتجات" icon="📦" color="bg-blue-500" onClick={() => navigate('/products')} />
            <QuickActionButton label="المخزون" icon="📋" color="bg-purple-500" onClick={() => navigate('/inventory')} />
            <QuickActionButton label="جرد المخزون" icon="📝" color="bg-green-500" onClick={() => navigate('/inventory/stock-count')} />
            <QuickActionButton label="تحويل مخزون" icon="🔄" color="bg-amber-500" onClick={() => navigate('/inventory/transfer')} />
            <QuickActionButton label="تالف ومفقود" icon="🗑️" color="bg-red-500" onClick={() => navigate('/inventory/wastage')} />
            <QuickActionButton label="المستودعات" icon="🏗️" color="bg-teal-500" onClick={() => navigate('/warehouses')} />
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
