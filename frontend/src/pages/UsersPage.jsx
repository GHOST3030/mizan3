import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Button, Modal, Alert, Badge, Table } from '../components/ui';
import { Can } from '../components/Can';
import { PERMISSIONS } from '../utils/permissions';

const roleLabels = {
  admin: 'مدير عام',
  manager: 'مدير',
  cashier: 'كاشير',
  accountant: 'محاسب',
  inventory_manager: 'مسؤول مخزون',
};

const roleColors = {
  admin: 'purple',
  manager: 'blue',
  cashier: 'green',
  accountant: 'amber',
  inventory_manager: 'teal',
};

export default function UsersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await client.get('/auth/users');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/auth/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['users']),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => client.put(`/auth/users/${id}`, { is_active: !is_active }),
    onSuccess: () => queryClient.invalidateQueries(['users']),
  });

  const columns = [
    { key: 'name', label: 'الاسم', render: (u) => <span className="font-medium text-gray-800 dark:text-gray-100">{u.name}</span> },
    { key: 'username', label: 'اسم المستخدم' },
    { key: 'role', label: 'الدور', render: (u) => <Badge color={roleColors[u.role]}>{roleLabels[u.role] || u.role}</Badge> },
    { key: 'is_active', label: 'الحالة', render: (u) => (
      <Badge color={u.is_active !== false ? 'green' : 'red'}>{u.is_active !== false ? 'نشط' : 'موقوف'}</Badge>
    )},
    { key: 'created_at', label: 'تاريخ الإنشاء', render: (u) => (
      <span className="text-gray-500 dark:text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString('ar')}</span>
    )},
  ];

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">إدارة المستخدمين</h1>
        <Can permission={PERMISSIONS.MANAGE_USERS}><Button onClick={() => { setEditUser(null); setShowForm(true); }}>+ إضافة مستخدم</Button></Can>
      </div>

      {error && (
        <Alert type="error" className="mb-4">
          {error.response?.status === 403
            ? 'ليس لديك صلاحية الوصول إلى إدارة المستخدمين.'
            : error.message || 'حدث خطأ في تحميل المستخدمين'}
        </Alert>
      )}

      <Table
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="لا يوجد مستخدمين"
        renderActions={(u) => (
          <div className="flex gap-2">
            <Can permission={PERMISSIONS.MANAGE_USERS}><Button variant="ghost" size="sm" onClick={() => { setEditUser(u); setShowForm(true); }}>تعديل</Button></Can>
            <Can permission={PERMISSIONS.MANAGE_USERS}><Button variant="ghost" size="sm"
              onClick={() => toggleActiveMutation.mutate({ id: u.id, is_active: u.is_active })}>
              {u.is_active !== false ? 'تعطيل' : 'تفعيل'}
            </Button></Can>
            {u.username !== 'admin' && (
              <Can permission={PERMISSIONS.MANAGE_USERS}><Button variant="ghost" size="sm" className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => { if (confirm('حذف المستخدم؟')) deleteMutation.mutate(u.id); }}>حذف</Button></Can>
            )}
          </div>
        )}
      />

      {showForm && (
        <UserFormModal
          user={editUser}
          branchId={branchId}
          onClose={() => { setShowForm(false); setEditUser(null); }}
          onSuccess={() => { queryClient.invalidateQueries(['users']); setShowForm(false); setEditUser(null); }}
        />
      )}
    </div>
  );
}

function UserFormModal({ user, branchId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    password: '',
    role: user?.role || 'cashier',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        branch_id: branchId,
        name: form.name,
        username: form.username,
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
      };
      if (user) {
        await client.put(`/auth/users/${user.id}`, payload);
      } else {
        await client.post('/auth/users', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title={user ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المستخدم *</label>
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
            required disabled={!!user} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {user ? 'كلمة المرور (اتركه فارغاً إن لم ترد التغيير)' : 'كلمة المرور *'}
          </label>
          <input type="password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
            required={!user} minLength={6} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الدور *</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100">
            <option value="cashier">كاشير</option>
            <option value="accountant">محاسب</option>
            <option value="inventory_manager">مسؤول مخزون</option>
            <option value="manager">مدير</option>
            <option value="admin">مدير عام</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">
            {loading ? 'جاري الحفظ...' : user ? 'حفظ التعديلات' : 'إضافة المستخدم'}
          </Button>
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </Modal>
  );
}
