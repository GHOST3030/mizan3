import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { Can } from '../components/Can';
import { CanViewField } from '../components/CanViewField';
import { useFieldPermission } from '../hooks/useFieldPermission';
import { PERMISSIONS } from '../utils/permissions';

const tabs = [
  { id: 'balance', label: 'رصيد المخزون' },
  { id: 'movements', label: 'حركات المخزون' },
  { id: 'counts', label: 'جرد المخزون' },
];

const typeLabels = {
  purchase: 'مشتريات',
  sale: 'مبيعات',
  adjustment: 'تسوية',
  transfer_in: 'تحويل وارد',
  transfer_out: 'تحويل صادر',
  return_purchase: 'مرتجع مشتريات',
  return_sale: 'مرتجع مبيعات',
  initial: 'رصيد افتتاحي',
};

const typeColors = {
  purchase: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
  sale: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  adjustment: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
  transfer_in: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  transfer_out: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  return_purchase: 'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/20',
  return_sale: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20',
  initial: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800',
};

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('balance');
  const [search, setSearch] = useState('');
  const { canViewProductCost, canViewInventoryValue } = useFieldPermission();

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['inventory-balance', search],
    queryFn: async () => {
      const res = await client.get('/inventory/balance', { params: { q: search || undefined, limit: 100 } });
      return res.data;
    },
    enabled: activeTab === 'balance',
  });

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: async () => {
      const res = await client.get('/inventory/movements', { params: { limit: 100 } });
      return res.data;
    },
    enabled: activeTab === 'movements',
  });

  const { data: countsData, isLoading: countsLoading } = useQuery({
    queryKey: ['stock-counts'],
    queryFn: async () => {
      const res = await client.get('/inventory/stock-counts', { params: { limit: 50 } });
      return res.data;
    },
    enabled: activeTab === 'counts',
  });

  return (
    <div className="p-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">إدارة المخزون</h1>

      <Can permission={PERMISSIONS.MANAGE_INVENTORY}>
        <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id ? 'bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Can>

      {activeTab === 'balance' && (
        <div>
          <div className="mb-4">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الباركود..."
              className="w-full max-w-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
            {balanceLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-800">
                  <tr>
                    <th className="text-right px-4 py-3">المنتج</th>
                    <th className="text-right px-4 py-3">الباركود</th>
                    <th className="text-right px-4 py-3">المستودع</th>
                    <th className="text-right px-4 py-3">الكمية</th>
                    {canViewProductCost() && <th className="text-right px-4 py-3">سعر التكلفة</th>}
                    <th className="text-right px-4 py-3">سعر البيع</th>
                    {canViewInventoryValue() && <th className="text-right px-4 py-3">القيمة</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {balanceData?.data?.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد أرصدة</td></tr>
                  ) : (
                    balanceData?.data?.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                          {item.product?.name_ar || item.product?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{item.product?.barcode || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.warehouse?.name_ar || 'رئيسي'}</td>
                        <td className={`px-4 py-3 font-bold ${item.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {item.quantity}
                        </td>
                        {canViewProductCost() && (
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            <CanViewField fieldPermission="field:view_product_cost" fallback="******">
                              {item.product?.cost_price?.toLocaleString()} ﷼
                            </CanViewField>
                          </td>
                        )}
                        <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">{item.product?.selling_price?.toLocaleString()} ﷼</td>
                        {canViewInventoryValue() && (
                          <td className="px-4 py-3 text-gray-800 dark:text-gray-100 font-medium">
                            {((item.product?.cost_price || 0) * item.quantity).toLocaleString()} ﷼
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
          {movementsLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-800">
                <tr>
                  <th className="text-right px-4 py-3">التاريخ</th>
                  <th className="text-right px-4 py-3">المنتج</th>
                  <th className="text-right px-4 py-3">النوع</th>
                  <th className="text-right px-4 py-3">الكمية</th>
                  <th className="text-right px-4 py-3">المستودع</th>
                  <th className="text-right px-4 py-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {movementsData?.data?.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد حركات</td></tr>
                ) : (
                  movementsData?.data?.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(m.created_at).toLocaleDateString('ar')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                        {m.product?.name_ar || m.product?.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[m.type] || ''}`}>
                          {typeLabels[m.type] || m.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-bold ${m.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{m.warehouse?.name_ar || 'رئيسي'}</td>
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{m.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'counts' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
          {countsLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-800">
                <tr>
                  <th className="text-right px-4 py-3">التاريخ</th>
                  <th className="text-right px-4 py-3">المستخدم</th>
                  <th className="text-right px-4 py-3">المستودع</th>
                  <th className="text-right px-4 py-3">عدد الأصناف</th>
                  <th className="text-right px-4 py-3">الفروقات</th>
                  <th className="text-right px-4 py-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {countsData?.data?.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد جرد</td></tr>
                ) : (
                  countsData?.data?.map((c) => {
                    const differences = c.items?.filter((i) => i.difference !== 0) || [];
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                          {new Date(c.counted_at).toLocaleDateString('ar')}
                        </td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-100">{c.user?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.warehouse?.name_ar || 'رئيسي'}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{c.items?.length || 0}</td>
                        <td className="px-4 py-3">
                          {differences.length > 0 ? (
                            <span className="text-red-500 dark:text-red-400 font-medium">{differences.length} صنف</span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400">مطابق</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{c.notes || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
