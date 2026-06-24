import { useState } from 'react';
import Button from './ui/Button';

export default function OpeningBalanceModal({ entity, type, onSave, onClose, loading }) {
  const [amount, setAmount] = useState(String(entity?.opening_balance ?? ''));
  const [date, setDate] = useState(entity?.opening_balance_date?.split('T')[0] || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      opening_balance: parseInt(amount) || 0,
      opening_balance_date: date || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 mb-4 dark:text-gray-100">
          رصيد افتتاحي - {entity?.name}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">الرصيد الافتتاحي (﷼)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="0" autoFocus />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">التاريخ</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <p className="text-xs text-gray-500 mb-4 dark:text-gray-400">
            الرصيد الافتتاحي هو المبلغ الذي كان على العميل قبل بدء استخدام النظام.
            {type === 'customer' ? ' سيتم إضافته إلى رصيد المشتريات والمدفوعات.' : ' سيتم إضافته إلى رصيد المشتريات.'}
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose}>إلغاء</Button>
            <Button type="submit" loading={loading}>حفظ</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
