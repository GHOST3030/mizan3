import { useAuthStore } from '../store/authStore';
import { hasPermission } from '../utils/permissions';

export function Can({ permission, children, fallback = null }) {
  const user = useAuthStore((s) => s.user);
  return hasPermission(user, permission) ? children : fallback;
}
