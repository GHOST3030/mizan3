import { useAuthStore } from '../store/authStore';
import { hasPermission } from '../utils/permissions';

export function CanViewField({ fieldPermission, children, fallback = '******' }) {
  const user = useAuthStore((s) => s.user);
  return hasPermission(user, fieldPermission) ? children : fallback;
}
