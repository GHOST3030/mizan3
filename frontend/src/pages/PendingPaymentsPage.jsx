import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { Button, Modal, PageHeader, Pagination } from '../components/ui';
import { Can } from '../components/Can';
import { PERMISSIONS } from '../utils/permissions';

export default function PendingPaymentsPage() {
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [collectTarget, setCollectTarget] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('cash');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: async () => {
      if (!customerSearch) return [];
      const res = await client.get('/customers', { params: { q: customerSearch, limit: 10 } });
      return res.data.data || [];
    },
    enabled: customerSearch.length > 0,
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['payment-schedules', selectedCustomer?.id, page],
    queryFn: async () => {
      const params = selectedCustomer ? { customer_id: selectedCustomer.id, page, limit: '10' } : { page };
      const res = await client.get('/sales/payment-schedules/list', { params });
      return res.data;
    },
    enabled: !!selectedCustomer,
  });

  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.name);
    setPage(1);
  };

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => client.post(`/sales/payment-schedules/${id}/pay`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['payment-schedules']);
      queryClient.invalidateQueries(['customers-search']);
      setCollectTarget(null);
      setCollectAmount('');
    },
  });

  const handleCollect = (schedule) => {
    setCollectTarget(schedule);
    setCollectAmount(String(schedule.amount - schedule.paid_amount));
  };

  const handlePay = () => {
    if (!collectTarget || !collectAmount) return;
    payMutation.mutate({
      id: collectTarget.id,
      data: {
        amount: parseInt(collectAmount) || 0,
        method: collectMethod,
        currency_id: collectTarget.sale.currency.id,
        exchange_rate: 1,
      },
    });
  };

  return (
    <div className="p-6" dir="rtl">
      <PageHeader title="تحصيل المدفوعات" />

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اختيار عميل</label>
        <div className="relative">
          <input value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); if (!e.target.value) setSelectedCustomer(null); }}
            placeholder="ابحث عن عميل..."
            className="w-full max-w-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {customerSearch && !selectedCustomer && customers?.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
              {customers.map((c) => (
                <button key={c.id} onClick={() => handleSelectCustomer(c)}
                  className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b dark:border-gray-700 last:border-0">
                  <span className="font-medium">{c.name}</span>
                  {c.phone && <span className="text-gray-500 dark:text-gray-400 mr-2">📞 {c.phone}</span>}
                  {(c.balance || 0) > 0 && <span className="text-amber-600 dark:text-amber-400 mr-2">({c.balance.toLocaleString()} ﷼)</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedCustomer && (
        <>
          <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
            <span>👤</span>
            <span>{selectedCustomer.name}</span>
            <span className="mr-auto">
              الرصيد: <span className={`font-bold ${(selectedCustomer.balance || 0) > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {(selectedCustomer.balance ?? 0).toLocaleString()} ﷼
              </span>
            </span>
          </div>

          {isLoading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">جاري التحميل...</div>
          ) : !schedules?.data?.length ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">لا توجد مدفوعات معلقة لهذا العميل</div>
          ) : (
            <div className="space-y-3">
              {schedules.data.map((s) => {
                const remaining = s.amount - s.paid_amount;
                const isOverdue = s.due_date && new Date(s.due_date) < new Date();
                return (
                  <div key={s.id} className={`bg-white dark:bg-gray-900 border ${isOverdue ? 'border-red-300 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'} rounded-xl p-4 flex items-center justify-between`}>
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-100">
                        فاتورة #{s.sale.invoice_number}
                        {s.status === 'partial' && <span className="mr-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">مسدد جزئياً</span>}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        المتبقي: <span className="font-bold text-amber-600 dark:text-amber-400">{remaining.toLocaleString()} ﷼</span>
                        {s.due_date && (
                          <span className={`mr-3 ${isOverdue ? 'text-red-500 dark:text-red-400' : ''}`}>
                            | تاريخ الاستحقاق: {new Date(s.due_date).toLocaleDateString('ar')}
                            {isOverdue && ' 🚩 متأخر'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        الإجمالي: {s.sale.total.toLocaleString()} ﷼ | المدفوع: {s.paid_amount.toLocaleString()} ﷼
                      </div>
                    </div>
                    <Can permission={PERMISSIONS.MANAGE_CUSTOMERS}>
                      <Button size="sm" onClick={() => handleCollect(s)}>تحصيل</Button>
                    </Can>
                  </div>
                );
              })}
            </div>
          )}
          {schedules?.data?.length > 0 && <Pagination meta={schedules?.meta} onPageChange={setPage} />}
        </>
      )}

      {collectTarget && (
        <Modal open title="تحصيل دفعة" onClose={() => setCollectTarget(null)} maxWidth="max-w-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            فاتورة #{collectTarget.sale.invoice_number} — المتبقي: {(collectTarget.amount - collectTarget.paid_amount).toLocaleString()} ﷼
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ</label>
            <input type="number" value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)}
              max={collectTarget.amount - collectTarget.paid_amount}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-1 mt-1">
              {[collectTarget.amount - collectTarget.paid_amount, Math.round((collectTarget.amount - collectTarget.paid_amount) / 2)].map((amt, i) => (
                <Button key={i} variant="outline" size="sm" onClick={() => setCollectAmount(String(amt))}>
                  {amt.toLocaleString()} ﷼
                </Button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">طريقة الدفع</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: 'نقداً' },
                { id: 'card', label: 'بطاقة' },
                { id: 'transfer', label: 'حوالة' },
              ].map((m) => (
                <Button key={m.id} type="button" variant={collectMethod === m.id ? 'primary' : 'outline'} size="sm"
                  onClick={() => setCollectMethod(m.id)}>{m.label}</Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setCollectTarget(null)}>إلغاء</Button>
            <Can permission={PERMISSIONS.MANAGE_CUSTOMERS}>
              <Button onClick={handlePay} loading={payMutation.isPending}
                disabled={payMutation.isPending || !parseInt(collectAmount) || parseInt(collectAmount) <= 0}>
                تأكيد التحصيل
              </Button>
            </Can>
          </div>
        </Modal>
      )}
    </div>
  );
}