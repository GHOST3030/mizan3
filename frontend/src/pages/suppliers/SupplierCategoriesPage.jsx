import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Plus } from 'lucide-react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  Button, PageHeader, Table, PageTransition, FormModal, Alert,
  Input, ConfirmButton, toast, Breadcrumbs,
} from '../../components/ui';
import { Can } from '../../components/Can';
import { PERMISSIONS } from '../../utils/permissions';

export default function SupplierCategoriesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['supplier-categories'],
    queryFn: async () => { const res = await client.get('/suppliers/categories'); return res.data; },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/suppliers/categories/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['supplier-categories']); toast('تم حذف التصنيف', 'success'); },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const columns = [
    { key: 'name', label: 'الاسم', render: (c) => <span className="font-medium text-gray-800 dark:text-gray-100">{c.name}</span> },
    { key: 'description', label: 'الوصف', render: (c) => c.description || <span className="text-gray-400">—</span> },
  ];

  return (
    <PageTransition>
      <Breadcrumbs items={[
        { label: 'الموردين', to: '/suppliers' },
        { label: 'التصنيفات', to: '/suppliers/categories' },
      ]} />
      <PageHeader
        title="تصنيفات الموردين"
        actions={canManage && (
          <Can permission={PERMISSIONS.MANAGE_SUPPLIERS}>
            <Button onClick={() => { setEditCategory(null); setShowForm(true); }}><Plus className="w-4 h-4" /> إضافة تصنيف</Button>
          </Can>
        )}
      />

      <Table
        columns={columns}
        data={categories}
        isLoading={isLoading}
        emptyMessage="لا يوجد تصنيفات"
        emptyIcon="📂"
        renderActions={(c) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {canManage && (
              <Can permission={PERMISSIONS.MANAGE_SUPPLIERS}>
                <Button variant="ghost" size="sm" onClick={() => { setEditCategory(c); setShowForm(true); }}>تعديل</Button>
              </Can>
            )}
            {canManage && (
              <Can permission={PERMISSIONS.MANAGE_SUPPLIERS}>
                <ConfirmButton variant="ghost-danger" size="sm" onConfirm={() => deleteMutation.mutate(c.id)} message={`حذف التصنيف ${c.name}؟`}>حذف</ConfirmButton>
              </Can>
            )}
          </div>
        )}
      />

      {showForm && (
        <CategoryFormModal
          category={editCategory}
          onClose={() => { setShowForm(false); setEditCategory(null); }}
          onSuccess={() => { queryClient.invalidateQueries(['supplier-categories']); setShowForm(false); setEditCategory(null); toast(editCategory ? 'تم تحديث التصنيف' : 'تم إضافة التصنيف', 'success'); }}
        />
      )}
    </PageTransition>
  );
}

function CategoryFormModal({ category, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: category?.name || '', description: category?.description || '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (category) {
        await client.put(`/suppliers/categories/${category.id}`, form);
      } else {
        await client.post('/suppliers/categories', form);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal open onClose={onClose} title={category ? 'تعديل التصنيف' : 'إضافة تصنيف'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        <Input label="الاسم *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} as="textarea" rows={3} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">{category ? 'حفظ التعديلات' : 'إضافة التصنيف'}</Button>
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </FormModal>
  );
}
