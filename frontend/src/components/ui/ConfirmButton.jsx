import { useState } from 'react';
import Button from './Button';
import ConfirmDialog from './ConfirmDialog';

export default function ConfirmButton({
  children, onConfirm, title = 'تأكيد', message = 'هل أنت متأكد؟',
  confirmText = 'تأكيد', variant = 'danger', size, loading, className = '', ...props
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={className}
        {...props}
      >
        {children}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => { onConfirm?.(); setOpen(false); }}
        title={title}
        message={message}
        confirmText={confirmText}
        loading={loading}
      />
    </>
  );
}
