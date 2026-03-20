import { create } from 'zustand';
import { get, post, ENDPOINTS } from '../api';

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export const useAuthStore = create((set, getState) => ({
  user: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  //google login 
  
  googleLogin: async (credential) => {
    set({ error: null });
    const { data } = await post(ENDPOINTS.AUTH_GOOGLE, { token: credential });
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
    if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
    set({ user: data.user });
    return data.user;
  },

  loadUser: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ user: null, loading: false });
      return null;
    }
    try {
      const { data } = await get(ENDPOINTS.AUTH_ME);
      set({ user: data, loading: false, error: null });
      return data;
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      set({ user: null, loading: false });
      return null;
    }
  },

  login: async (email, password) => {
    set({ error: null });
    const { data } = await post(ENDPOINTS.AUTH_LOGIN, { email, password });
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
    if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
    set({ user: data.user });
    console.log("fetched data",data);
    return data.user;
  },

  register: async (payload) => {
    set({ error: null });
    const { data } = await post(ENDPOINTS.AUTH_REGISTER, payload);
    // No token on register — user must verify email first, then sign in
    return data;
  },

  logout: async () => {
    try {
      await post(ENDPOINTS.AUTH_LOGOUT);
    } catch {
      // Ignore — server may be unavailable; client always clears tokens
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    set({ user: null });
  },

  isAuthenticated: () => !!getState().user || !!localStorage.getItem(TOKEN_KEY),
}));
