import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag } from 'lucide-react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  Button, PageHeader, Table, Badge, Pagination, PageTransition,
  SearchInput, ConfirmButton, toast, Breadcrumbs,
} from '../../components/ui';
import PurchaseForm from './PurchaseForm';
import { Can } from '../../components/Can';
import { PERMISSIONS } from '../../utils/permissions';

export default function PurchasesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editPurchase, setEditPurchase] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page, search],
    queryFn: async () => {
      const res = await client.get('/purchases', { params: { page, q: search || undefined } });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/purchases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['purchases']);
      toast('تم حذف الفاتورة بنجاح', 'success');
    },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ أثناء الحذف', 'error'),
  });

  const statusBadge = (status) => {
    const map = {
      draft: { label: 'مسودة', color: 'amber' },
      completed: { label: 'مكتملة', color: 'green' },
      returned: { label: 'مرتجعة', color: 'red' },
      cancelled: { label: 'ملغية', color: 'gray' },
    };
    const s = map[status] || { label: status, color: 'gray' };
    return <Badge color={s.color} dot>{s.label}</Badge>;
  };

  const columns = [
    { key: 'invoice_number', label: 'رقم الفاتورة', className: 'font-medium text-gray-800 dark:text-gray-100' },
    { key: 'supplier_name', label: 'المورد', render: (r) => r.supplier?.name || '—' },
    { key: 'total', label: 'الإجمالي', render: (r) => <span className="font-medium text-green-600 dark:text-green-400">{r.total.toLocaleString()} ﷼</span> },
    { key: 'status', label: 'الحالة', render: (r) => statusBadge(r.status) },
    { key: 'created_at', label: 'التاريخ', render: (r) => <span className="text-gray-500 dark:text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString('ar')}</span> },
  ];

  return (
    <PageTransition>
      <Breadcrumbs items={[{ label: 'المشتريات', to: '/purchases' }, { label: 'جميع الفواتير' }]} />
      <PageHeader
        title="إدارة المشتريات"
        description="عرض وإدارة فواتير المشتريات"
        actions={
          <Can permission={PERMISSIONS.MANAGE_PURCHASES}>
            <Button onClick={() => { setEditPurchase(null); setShowForm(true); }}>
              <ShoppingBag className="w-4 h-4" />
              فاتورة مشتريات جديدة
            </Button>
          </Can>
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الفاتورة أو المورد..." />
      </div>

      <Table
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        emptyMessage="لا توجد فواتير مشتريات"
        emptyIcon="📄"
        renderActions={(row) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Can permission={PERMISSIONS.MANAGE_PURCHASES}>
              <Button variant="ghost" size="sm" onClick={() => { setEditPurchase(row); setShowForm(true); }}>عرض</Button>
            </Can>
            {row.status !== 'returned' && (
              <Can permission={PERMISSIONS.MANAGE_PURCHASES}>
                <ConfirmButton
                  variant="ghost-danger"
                  size="sm"
                  onConfirm={() => deleteMutation.mutate(row.id)}
                  message="هل أنت متأكد من حذف هذه الفاتورة؟"
                >
                  حذف
                </ConfirmButton>
              </Can>
            )}
          </div>
        )}
      />

      <Pagination meta={data?.meta} onPageChange={setPage} />

      {showForm && (
        <PurchaseForm
          purchase={editPurchase}
          userId={user?.id}
          onClose={() => { setShowForm(false); setEditPurchase(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries(['purchases']);
            setShowForm(false);
            setEditPurchase(null);
            toast(isLoading ? 'تم إنشاء الفاتورة' : 'تم تحديث الفاتورة', 'success');
          }}
        />
      )}
    </PageTransition>
  );
}
