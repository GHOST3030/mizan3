import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'تأكيد', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'تأكيد'} maxWidth="max-w-sm">
      <div className="p-5 space-y-4">
        <p className="text-gray-600 dark:text-gray-300 text-sm">{message}</p>
        <div className="flex gap-3">
          <Button variant="danger" onClick={onConfirm} loading={loading} className="flex-1">{confirmText}</Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </div>
    </Modal>
  );
}
