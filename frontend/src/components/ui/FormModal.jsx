import Modal from './Modal';

export default function FormModal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth={maxWidth} closeOnBackdrop={false}>
      {children}
    </Modal>
  );
}
