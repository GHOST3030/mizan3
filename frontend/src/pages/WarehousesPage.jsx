import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import {
  Button, PageHeader, PageTransition, FormModal, Alert,
  ConfirmButton, Badge, Card, Skeleton, toast, Breadcrumbs,
} from '../components/ui';
import { Can } from '../components/Can';
import { PERMISSIONS } from '../utils/permissions';

export default function WarehousesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editWh, setEditWh] = useState(null);
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const queryClient = useQueryClient();

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses', branchId],
    queryFn: async () => { const res = await client.get(`/inventory/warehouses?branch_id=${branchId}`); return res.data; },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/inventory/warehouses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['warehouses']); toast('تم حذف المخزن', 'success'); },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  return (
    <PageTransition>
      <Breadcrumbs items={[{ label: 'المخزون' }, { label: 'المخازن', to: '/warehouses' }]} />
      <PageHeader
        title="المخازن"
        actions={<Can permission={PERMISSIONS.MANAGE_INVENTORY}><Button onClick={() => { setEditWh(null); setShowForm(true); }}><Plus className="w-4 h-4" /> إضافة مخزن</Button></Can>}
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : warehouses?.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">لا توجد مخازن</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {warehouses?.map((wh) => (
            <Card key={wh.id} hover>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{wh.name_ar || wh.name}</h3>
                <Badge color={wh.is_active ? 'green' : 'red'}>{wh.is_active ? 'نشط' : 'غير نشط'}</Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{wh.name}</p>
              <div className="flex gap-2">
                <Can permission={PERMISSIONS.MANAGE_INVENTORY}><Button variant="ghost" size="sm" onClick={() => { setEditWh(wh); setShowForm(true); }}>تعديل</Button></Can>
                {user?.role === 'admin' && (
                  <Can permission={PERMISSIONS.MANAGE_INVENTORY}>
                    <ConfirmButton variant="ghost-danger" size="sm" onConfirm={() => deleteMutation.mutate(wh.id)} message={`حذف المخزن ${wh.name_ar || wh.name}؟`}>حذف</ConfirmButton>
                  </Can>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <WarehouseFormModal
          warehouse={editWh} branchId={branchId}
          onClose={() => { setShowForm(false); setEditWh(null); }}
          onSuccess={() => { queryClient.invalidateQueries(['warehouses']); setShowForm(false); setEditWh(null); toast(editWh ? 'تم تحديث المخزن' : 'تم إضافة المخزن', 'success'); }}
        />
      )}
    </PageTransition>
  );
}

function WarehouseFormModal({ warehouse, branchId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: warehouse?.name || '', name_ar: warehouse?.name_ar || '',
    is_active: warehouse?.is_active ?? true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { branch_id: branchId, ...form };
      if (warehouse) {
        await client.put(`/inventory/warehouses/${warehouse.id}`, payload);
      } else {
        await client.post('/inventory/warehouses', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal open onClose={onClose} title={warehouse ? 'تعديل المخزن' : 'إضافة مخزن'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم (إنجليزي) *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم (عربي) *</label>
          <input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_active" checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600" />
          <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">نشط</label>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">{warehouse ? 'حفظ التعديلات' : 'إضافة المخزن'}</Button>
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </FormModal>
  );
}
