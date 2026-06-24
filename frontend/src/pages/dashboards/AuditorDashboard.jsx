import { useAuthStore } from '../../store/authStore';

export default function AuditorDashboard() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-6" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-8 text-center">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">مرحباً {user?.name}</h1>
        <p className="text-gray-500 dark:text-gray-400">لوحة التدقيق — يتمتع دور المدقق بصلاحيات قراءة فقط</p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <a href="/reports" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-md transition">
            <p className="font-bold text-gray-800 dark:text-gray-100">التقارير</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">عرض التقارير المالية</p>
          </a>
          <a href="/admin/roles" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-md transition">
            <p className="font-bold text-gray-800 dark:text-gray-100">الصلاحيات</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">مراجعة الأدوار والصلاحيات</p>
          </a>
          <a href="/inventory" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-md transition">
            <p className="font-bold text-gray-800 dark:text-gray-100">المخزون</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">حركة المخزون والتقييم</p>
          </a>
        </div>
      </div>
    </div>
  );
}
