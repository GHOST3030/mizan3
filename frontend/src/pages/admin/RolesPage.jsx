import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { Button, Modal, Table, Badge, Card, Alert } from '../../components/ui';
import { permissionGroups } from '../../utils/permissions';

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [showPermModal, setShowPermModal] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [saveError, setSaveError] = useState('');
  const queryClient = useQueryClient();

  const { data: roles, isLoading, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await client.get('/permissions/roles');
      return res.data;
    },
  });

  const { error: permsError } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await client.get('/permissions/permissions');
      return res.data;
    },
  });

  const permMutation = useMutation({
    mutationFn: async ({ roleId, permission_keys }) => {
      const res = await client.put(`/permissions/roles/${roleId}/permissions`, { permission_keys });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      setShowPermModal(false);
      setSaveError('');
    },
    onError: (err) => {
      setSaveError(
        err.response?.status === 403
          ? 'ليس لديك صلاحية تعديل الصلاحيات. تأكد من أن حسابك لديه صلاحية المشرف العام أو مدير النظام وقم بتشغيل تحديث صلاحيات المستخدمين.'
          : err.response?.data?.message || err.message || 'حدث خطأ في حفظ الصلاحيات'
      );
    },
  });

  const openPermModal = (role) => {
    setSelectedRole(role);
    setSelectedPerms(role.role_permissions?.map(rp => rp.permission.key) || []);
    setShowPermModal(true);
  };

  const togglePerm = (key) => {
    setSelectedPerms(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSavePerms = () => {
    if (!selectedRole) return;
    permMutation.mutate({ roleId: selectedRole.id, permission_keys: selectedPerms });
  };

  const columns = [
    { key: 'name', label: 'الاسم', render: (r) => (
      <span className="font-medium text-gray-800 dark:text-gray-100">{r.label || r.name}</span>
    )},
    { key: 'name', label: 'المعرف', render: (r) => (
      <code className="text-xs text-gray-500 dark:text-gray-400">{r.name}</code>
    )},
    { key: 'is_system', label: 'النوع', render: (r) => (
      <Badge color={r.is_system ? 'blue' : 'green'}>{r.is_system ? 'نظام' : 'مخصص'}</Badge>
    )},
    { key: '_count', label: 'المستخدمين', render: (r) => (
      <span className="text-sm text-gray-600 dark:text-gray-300">{r._count?.users || 0}</span>
    )},
    { key: 'permissions', label: 'الصلاحيات', render: (r) => (
      <span className="text-sm text-gray-600 dark:text-gray-300">{r.role_permissions?.length || 0} صلاحية</span>
    )},
  ];

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">إدارة الأدوار والصلاحيات</h1>
        <Badge color="info" className="text-xs">نظام الصلاحيات المستند إلى قاعدة البيانات</Badge>
      </div>

      <Card className="mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          يمكنك إدارة الأدوار وتعيين الصلاحيات لكل دور. الأدوار الأساسية لا يمكن حذفها.
        </p>
      </Card>

      {rolesError && (
        <Alert type="error" className="mb-4">
          {rolesError.response?.status === 403
            ? 'ليس لديك صلاحية الوصول إلى إدارة الأدوار. صلاحية المشرف العام أو مدير النظام مطلوبة.'
            : rolesError.message || 'حدث خطأ في تحميل البيانات'}
        </Alert>
      )}

      {permsError && (
        <Alert type="error" className="mb-4">
          {permsError.response?.status === 403
            ? 'ليس لديك صلاحية الوصول إلى إدارة الصلاحيات.'
            : permsError.message || 'حدث خطأ في تحميل الصلاحيات'}
        </Alert>
      )}

      <Table
        columns={columns}
        data={roles}
        isLoading={isLoading}
        emptyMessage="لا يوجد أدوار"
        renderActions={(r) => (
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => openPermModal(r)}>
              إدارة الصلاحيات
            </Button>
          </div>
        )}
      />

      <Modal
        open={showPermModal}
        onClose={() => setShowPermModal(false)}
        title={selectedRole ? `صلاحيات: ${selectedRole.label || selectedRole.name}` : ''}
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto" dir="rtl">
          {selectedRole?.is_system && (
            <Alert type="info" className="mb-4">
              هذا دور نظام — يمكن تعديل صلاحياته ولكن لا يمكن حذفه
            </Alert>
          )}

          {saveError && (
            <Alert type="error" className="mb-4">{saveError}</Alert>
          )}

          {permissionGroups.map((group) => (
            <div key={group.group}>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{group.label}</h4>
              <div className="space-y-1 mr-2">
                {group.permissions.map((perm) => {
                  const isSelected = selectedPerms.includes(perm.key);
                  return (
                    <label
                      key={perm.key}
                      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePerm(perm.key)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-sm">{perm.label}</span>
                      <code className="text-[10px] text-gray-400 dark:text-gray-500 mr-auto">{perm.key}</code>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button variant="ghost" onClick={() => setShowPermModal(false)}>إلغاء</Button>
          <Button
            variant="primary"
            onClick={handleSavePerms}
            loading={permMutation.isPending}
          >
            حفظ الصلاحيات
          </Button>
        </div>
      </Modal>
    </div>
  );
}
