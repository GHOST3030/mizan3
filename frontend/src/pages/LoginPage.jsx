import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Scale } from 'lucide-react';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Button, Alert } from '../components/ui';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post('/auth/login', { username, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      } else {
        setError(err.response?.data?.message || 'حدث خطأ في الاتصال');
      }
    } finally {
      setLoading(false);
    }
  };

  const fadeIn = (delay) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(16px)',
    transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Decorative background circles */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-3xl" />

      <div className="w-full max-w-sm relative">
        {/* Brand header */}
        <div className="text-center mb-8" style={fadeIn(0)}>
          <div className="w-20 h-20 rounded-2xl mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <Scale className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">ميزان</h1>
          <p className="text-slate-400 text-sm">نظام إدارة المبيعات والمخزون</p>
        </div>

        {/* Login card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/10 p-8 dark:bg-gray-800/95 border border-white/20 dark:border-gray-700/50" style={fadeIn(0.15)}>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">تسجيل الدخول</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">أدخل بيانات الدخول للوصول إلى النظام</p>

          {error && (
            <div style={fadeIn(0.2)}>
              <Alert type="error" className="mb-4">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div style={fadeIn(0.2)}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">اسم المستخدم</label>
              <div className="relative group">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg pr-10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="أدخل اسم المستخدم"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div style={fadeIn(0.25)}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">كلمة المرور</label>
              <div className="relative group">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg pr-10 pl-10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div style={fadeIn(0.3)}>
              <Button type="submit" loading={loading} className="w-full py-2.5">
                {loading ? 'جاري الدخول...' : 'دخول'}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6" style={fadeIn(0.35)}>© 2026 ميزان — جميع الحقوق محفوظة</p>
      </div>
    </div>
  );
}
