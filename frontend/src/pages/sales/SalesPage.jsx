import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Undo2, RotateCcw, Printer } from 'lucide-react';
import client from '../../api/client';
import {
  Button, PageHeader, Table, Badge, PageTransition, SearchInput,
  Select, Modal, ConfirmButton, toast, Breadcrumbs,
} from '../../components/ui';
import { printReceipt, printA4 } from '../../utils/print';
import { Can } from '../../components/Can';
import { PERMISSIONS } from '../../utils/permissions';

const methodLabels = { cash: 'نقداً', card: 'بطاقة', transfer: 'حوالة', credit: 'آجل' };
const statusColor = { draft: 'amber', completed: 'green', returned: 'red', cancelled: 'gray' };
const statusLabel = { draft: 'مسودة', completed: 'مكتملة', returned: 'مرتجعة', cancelled: 'ملغية' };

export default function SalesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNote, setCancelNote] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sales', search, statusFilter, page],
    queryFn: async () => {
      const res = await client.get('/sales', {
        params: { q: search || undefined, status: statusFilter || undefined, page },
      });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/sales/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['sales']); toast('تم حذف الفاتورة', 'success'); },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const returnMutation = useMutation({
    mutationFn: (id) => client.post(`/sales/${id}/return`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      setSelectedSale(null);
      toast('تم إرجاع الفاتورة', 'success');
    },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason, note }) => client.post(`/sales/${id}/cancel`, { reason, note }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      setCancelTarget(null);
      setCancelReason('');
      setCancelNote('');
      toast('تم إلغاء الفاتورة', 'success');
    },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const handleCancelSubmit = () => {
    if (!cancelReason.trim()) return;
    cancelMutation.mutate({ id: cancelTarget.id, reason: cancelReason, note: cancelNote || undefined });
  };

  const columns = [
    { key: 'invoice_number', label: 'رقم الفاتورة', sortable: true, render: (s) => <span className="font-medium text-gray-800 dark:text-gray-100">{s.invoice_number}</span> },
    { key: 'customer', label: 'العميل', render: (s) => s.customer?.name || <span className="text-gray-400">نقدي</span> },
    { key: 'total', label: 'الإجمالي', sortable: true, render: (s) => <span className="font-medium text-green-600 dark:text-green-400">{s.total?.toLocaleString()} ﷼</span> },
    { key: 'paid_amount', label: 'المدفوع', render: (s) => `${s.paid_amount?.toLocaleString()} ﷼` },
    {
      key: 'payments', label: 'طريقة الدفع',
      render: (s) => s.payments?.length > 0 ? (methodLabels[s.payments[0].method] || s.payments[0].method) : <span className="text-gray-400">—</span>,
    },
    { key: 'status', label: 'الحالة', render: (s) => <Badge color={statusColor[s.status] || 'gray'}>{statusLabel[s.status] || s.status}</Badge> },
    { key: 'user', label: 'الكاشير', render: (s) => s.user?.name || <span className="text-gray-400">—</span> },
    {
      key: 'created_at', label: 'التاريخ', sortable: true,
      render: (s) => <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(s.created_at).toLocaleString('ar')}</span>,
    },
  ];

  return (
    <PageTransition>
      <Breadcrumbs items={[{ label: 'المبيعات', to: '/sales' }, { label: 'فواتير البيع' }]} />
      <PageHeader
        title="سجل فواتير البيع"
        actions={
          <Button variant="warning" onClick={() => navigate('/sales/return')}>
            <Undo2 className="w-4 h-4" /> إرجاع مبيعات
          </Button>
        }
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-md">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="بحث برقم الفاتورة أو اسم العميل..." />
        </div>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">كل الحالات</option>
          <option value="completed">مكتملة</option>
          <option value="draft">مسودة</option>
          <option value="returned">مرتجعة</option>
          <option value="cancelled">ملغية</option>
        </Select>
      </div>

      <Table
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        emptyMessage="لا توجد فواتير"
        emptyIcon="🧾"
        meta={data?.meta}
        onPageChange={setPage}
        onRowClick={(s) => setSelectedSale(selectedSale?.id === s.id ? null : s)}
        renderActions={(sale) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => setSelectedSale(selectedSale?.id === sale.id ? null : sale)}>
              {selectedSale?.id === sale.id ? 'إخفاء' : 'تفاصيل'}
            </Button>
            {sale.status === 'completed' && (
              <div className="relative group">
                <Button variant="ghost" size="sm" iconOnly><Printer className="w-4 h-4" /></Button>
                <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg shadow-lg z-20 whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => printReceipt(sale)} className="w-full text-right">🧾 حرارية</Button>
                  <Button variant="ghost" size="sm" onClick={() => printA4(sale)} className="w-full text-right">📄 A4</Button>
                </div>
              </div>
            )}
            {(sale.status === 'completed' || sale.status === 'draft') && (
              <Can permission={PERMISSIONS.CANCEL_SALES}>
                <Button variant="ghost" size="sm" onClick={() => { setCancelTarget(sale); setCancelReason(''); setCancelNote(''); }}
                  className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950">إلغاء</Button>
              </Can>
            )}
            {sale.status === 'completed' && (
              <Can permission={PERMISSIONS.CREATE_RETURNS}>
                <ConfirmButton variant="ghost-warning" size="sm"
                  onConfirm={() => returnMutation.mutate(sale.id)}
                  message={`إرجاع الفاتورة ${sale.invoice_number}؟`}>
                  <RotateCcw className="w-3.5 h-3.5" /> إرجاع
                </ConfirmButton>
              </Can>
            )}
            <Can permission={PERMISSIONS.DELETE_SALES}>
              <ConfirmButton variant="ghost-danger" size="sm"
                onConfirm={() => deleteMutation.mutate(sale.id)}
                message={`حذف الفاتورة ${sale.invoice_number}؟`}>حذف</ConfirmButton>
            </Can>
          </div>
        )}
      />

      {selectedSale && (
        <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 animate-slide-down">
          <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-4">
            فاتورة {selectedSale.invoice_number}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">العميل</span>
              <div className="font-medium text-gray-800 dark:text-gray-100">{selectedSale.customer?.name || 'نقدي'}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">الكاشير</span>
              <div className="font-medium text-gray-800 dark:text-gray-100">{selectedSale.user?.name || '—'}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">الحالة</span>
              <div className="mt-1">
                <Badge color={statusColor[selectedSale.status] || 'gray'}>{statusLabel[selectedSale.status] || selectedSale.status}</Badge>
              </div>
              {selectedSale.status === 'cancelled' && (
                <div className="mt-2 space-y-1">
                  {selectedSale.cancellation_reason && (
                    <div className="text-xs text-red-600 dark:text-red-400">
                      <span className="font-medium">سبب الإلغاء:</span> {selectedSale.cancellation_reason}
                    </div>
                  )}
                  {selectedSale.cancellation_note && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">ملاحظات:</span> {selectedSale.cancellation_note}
                    </div>
                  )}
                  {selectedSale.cancellation_status === 'pending_review' && (
                    <Badge color="amber">بانتظار المراجعة</Badge>
                  )}
                </div>
              )}
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">التاريخ</span>
              <div className="font-medium text-gray-800 dark:text-gray-100">{new Date(selectedSale.created_at).toLocaleString('ar')}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm mb-4">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-800">
                <tr>
                  <th className="text-right px-3 py-2">المنتج</th>
                  <th className="text-right px-3 py-2">الكمية</th>
                  <th className="text-right px-3 py-2">السعر</th>
                  <th className="text-right px-3 py-2">الخصم</th>
                  <th className="text-right px-3 py-2">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {selectedSale.items?.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{item.product?.name_ar || item.product?.name || 'منتج'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.quantity}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.unit_price?.toLocaleString()} ﷼</td>
                    <td className="px-3 py-2 text-red-500 dark:text-red-400">{item.discount?.toLocaleString() || 0} ﷼</td>
                    <td className="px-3 py-2 font-medium text-green-600 dark:text-green-400">{item.total?.toLocaleString()} ﷼</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center border-t dark:border-gray-800 pt-3">
            <div>
              {selectedSale.payments?.map((p, i) => (
                <div key={i} className="text-sm text-gray-600 dark:text-gray-400">
                  {methodLabels[p.method] || p.method}: {p.amount?.toLocaleString()} ﷼
                </div>
              ))}
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-500 dark:text-gray-400">الإجمالي</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{selectedSale.total?.toLocaleString()} ﷼</div>
            </div>
          </div>
        </div>
      )}

      <Modal open={!!cancelTarget} title="إلغاء الفاتورة" onClose={() => { setCancelTarget(null); setCancelReason(''); setCancelNote(''); }} maxWidth="max-w-sm">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          إلغاء الفاتورة: <span className="font-medium text-gray-800 dark:text-gray-100">{cancelTarget?.invoice_number}</span>
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">سبب الإلغاء *</label>
            <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              placeholder="اكتب سبب الإلغاء..."
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات إضافية (اختياري)</label>
            <input value={cancelNote} onChange={(e) => setCancelNote(e.target.value)}
              placeholder="ملاحظات..."
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="secondary" onClick={() => { setCancelTarget(null); setCancelReason(''); setCancelNote(''); }}>رجوع</Button>
          <Button variant="danger" onClick={handleCancelSubmit} loading={cancelMutation.isPending}
            disabled={!cancelReason.trim() || cancelMutation.isPending}>
            تأكيد الإلغاء
          </Button>
        </div>
      </Modal>
    </PageTransition>
  );
}
