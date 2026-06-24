import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ACTIONS = [
  { label: 'بيع جديد', path: '/pos', icon: '💰', roles: ['super_admin', 'admin', 'manager', 'cashier'] },
  { label: 'مشتريات جديدة', path: '/purchases', icon: '📦', roles: ['super_admin', 'admin', 'manager'] },
  { label: 'عميل جديد', path: '/customers', icon: '👤', roles: ['super_admin', 'admin', 'manager', 'cashier'] },
  { label: 'مورد جديد', path: '/suppliers', icon: '🚚', roles: ['super_admin', 'admin', 'manager'] },
  { label: 'مصروف جديد', path: '/expenses', icon: '💸', roles: ['super_admin', 'admin', 'manager', 'cashier', 'accountant'] },
  { label: 'تحويل مخزون', path: '/inventory/transfer', icon: '🔄', roles: ['super_admin', 'admin', 'manager', 'inventory_manager'] },
];

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  const visibleActions = ACTIONS.filter((a) => a.roles.includes(role));

  if (visibleActions.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col-reverse items-center gap-2" dir="rtl">
      {open && visibleActions.map((action) => (
        <button
          key={action.path}
          onClick={() => { navigate(action.path); setOpen(false); }}
          className="group flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-xl transition-all duration-200 animate-fade-in"
        >
          <span className="text-lg">{action.icon}</span>
          <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
        </button>
      ))}
      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-red-500 hover:bg-red-600 rotate-45'
            : 'bg-blue-600 hover:bg-blue-700'
        } text-white`}
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}