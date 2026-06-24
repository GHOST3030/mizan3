import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tags, Plus } from 'lucide-react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  Button, PageHeader, Table, PageTransition, FormModal, Alert,
  Input, Select, ConfirmButton, toast, Breadcrumbs,
} from '../../components/ui';
import { Can } from '../../components/Can';
import { PERMISSIONS } from '../../utils/permissions';

export default function CustomerGroupsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [error, setError] = useState('');
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: groups, isLoading } = useQuery({
    queryKey: ['customer-groups'],
    queryFn: async () => { const res = await client.get('/customers/groups'); return res.data; },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/customers/groups/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['customer-groups']); toast('تم حذف المجموعة', 'success'); },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const columns = [
    { key: 'name', label: 'الاسم', render: (g) => <span className="font-medium text-gray-800 dark:text-gray-100">{g.name_ar || g.name}</span> },
    { key: 'description', label: 'الوصف', render: (g) => g.description || <span className="text-gray-400">—</span> },
    { key: 'parent', label: 'المجموعة الأم', render: (g) => g.parent?.name || <span className="text-gray-400">—</span> },
  ];

  return (
    <PageTransition>
      <Breadcrumbs items={[
        { label: 'العملاء', to: '/customers' },
        { label: 'المجموعات', to: '/customers/groups' },
      ]} />
      <PageHeader
        title="مجموعات العملاء"
        actions={canManage && (
          <Can permission={PERMISSIONS.MANAGE_CUSTOMERS}>
            <Button onClick={() => { setEditGroup(null); setShowForm(true); }}><Plus className="w-4 h-4" /> إضافة مجموعة</Button>
          </Can>
        )}
      />

      {error && <Alert type="error" onClose={() => setError('')} className="mb-4">{error}</Alert>}

      <Table
        columns={columns}
        data={groups}
        isLoading={isLoading}
        emptyMessage="لا يوجد مجموعات"
        emptyIcon="🏷️"
        renderActions={(g) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {canManage && (
              <Can permission={PERMISSIONS.MANAGE_CUSTOMERS}>
                <Button variant="ghost" size="sm" onClick={() => { setEditGroup(g); setShowForm(true); }}>تعديل</Button>
              </Can>
            )}
            {canManage && (
              <Can permission={PERMISSIONS.MANAGE_CUSTOMERS}>
                <ConfirmButton variant="ghost-danger" size="sm" onConfirm={() => deleteMutation.mutate(g.id)} message={`حذف المجموعة ${g.name_ar || g.name}؟`}>حذف</ConfirmButton>
              </Can>
            )}
          </div>
        )}
      />

      {showForm && (
        <GroupFormModal
          group={editGroup} groups={groups}
          onClose={() => { setShowForm(false); setEditGroup(null); }}
          onSuccess={() => { queryClient.invalidateQueries(['customer-groups']); setShowForm(false); setEditGroup(null); toast(editGroup ? 'تم تحديث المجموعة' : 'تم إضافة المجموعة', 'success'); }}
        />
      )}
    </PageTransition>
  );
}

function GroupFormModal({ group, groups, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: group?.name_ar || group?.name || '',
    description: group?.description || '',
    parent_id: group?.parent_id || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, parent_id: form.parent_id || null };
      if (group) {
        await client.put(`/customers/groups/${group.id}`, payload);
      } else {
        await client.post('/customers/groups', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error?.[0]?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal open onClose={onClose} title={group ? 'تعديل المجموعة' : 'إضافة مجموعة'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        <Input label="الاسم *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} as="textarea" rows={3} />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المجموعة الأم</label>
          <Select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
            <option value="">— بدون —</option>
            {groups?.filter((g) => !group || g.id !== group.id).map((g) => (
              <option key={g.id} value={g.id}>{g.name_ar || g.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">{group ? 'حفظ التعديلات' : 'إضافة المجموعة'}</Button>
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </FormModal>
  );
}
