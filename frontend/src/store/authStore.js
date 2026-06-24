import { create } from 'zustand';

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  user: safeJsonParse(localStorage.getItem('user'), null),

  login: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
}));