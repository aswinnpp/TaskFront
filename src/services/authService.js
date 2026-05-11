import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../config/api';

const STORAGE_KEYS = {
  accessToken: 'auth.accessToken',
  refreshToken: 'auth.refreshToken',
  user: 'auth.user',
};

async function persistAuth({ accessToken, refreshToken, user }) {
  const ops = [];
  if (typeof accessToken === 'string') ops.push([STORAGE_KEYS.accessToken, accessToken]);
  if (typeof refreshToken === 'string') ops.push([STORAGE_KEYS.refreshToken, refreshToken]);
  if (user) ops.push([STORAGE_KEYS.user, JSON.stringify(user)]);
  if (ops.length) await AsyncStorage.multiSet(ops);
}

async function clearAuth() {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.accessToken,
    STORAGE_KEYS.refreshToken,
    STORAGE_KEYS.user,
  ]);
}

async function readAuth() {
  const [[, accessToken], [, refreshToken], [, userJson]] = await AsyncStorage.multiGet([
    STORAGE_KEYS.accessToken,
    STORAGE_KEYS.refreshToken,
    STORAGE_KEYS.user,
  ]);
  return {
    accessToken: accessToken || null,
    refreshToken: refreshToken || null,
    user: userJson ? JSON.parse(userJson) : null,
  };
}

function toResult(ok, payload) {
  return { ok, ...payload };
}

/**
 * All auth-related HTTP calls go through this module (assignment requirement).
 * Paths match backend routes under /api/auth/ (e.g. /api/auth/signup).
 */
class AuthService {
  async getStoredAuth() {
    return readAuth();
  }

  async signup({ email, password, phone }) {
    try {
      const data = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: { email, password, phone },
      });
      if (data?.accessToken) await persistAuth(data);
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH]', 'signup', err?.message || err);
      return toResult(false, { message: err?.message || 'Signup failed.' });
    }
  }

  async login({ email, password }) {
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (data?.accessToken) await persistAuth(data);
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH]', 'login', err?.message || err);
      return toResult(false, { message: err?.message || 'Login failed.' });
    }
  }

  async verifyOtp({ phone, otp }) {
    try {
      const data = await apiRequest('/api/auth/verify-otp', {
        method: 'POST',
        body: { phone, otp },
      });
      if (data?.accessToken) await persistAuth(data);
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH]', 'verify-otp', err?.message || err);
      return toResult(false, { message: err?.message || 'OTP verification failed.' });
    }
  }

  async resendOtp({ phone }) {
    try {
      const data = await apiRequest('/api/auth/resend-otp', {
        method: 'POST',
        body: { phone },
      });
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH]', 'resend-otp', err?.message || err);
      return toResult(false, { message: err?.message || 'Resend OTP failed.' });
    }
  }

  async forgotPassword({ email }) {
    try {
      const data = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH]', 'forgot-password', err?.message || err);
      return toResult(false, { message: err?.message || 'Request failed.' });
    }
  }

  async resetPassword({ accessToken, refreshToken, newPassword }) {
    try {
      const data = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          accessToken,
          refreshToken,
          newPassword,
          confirmPassword: newPassword,
        },
      });
      if (data?.accessToken) await persistAuth(data);
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH]', 'reset-password', err?.message || err);
      return toResult(false, { message: err?.message || 'Reset password failed.' });
    }
  }

  async getProfile() {
    try {
      const { accessToken } = await readAuth();
      if (!accessToken) return toResult(false, { message: 'Not authenticated.' });
      const data = await apiRequest('/api/auth/profile', {
        method: 'GET',
        token: accessToken,
      });
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH]', 'profile', err?.message || err);
      return toResult(false, { message: err?.message || 'Failed to load profile.' });
    }
  }

  async logout() {
    try {
      const { accessToken } = await readAuth();
      try {
        if (accessToken) {
          await apiRequest('/api/auth/logout', {
            method: 'POST',
            token: accessToken,
          });
        }
      } finally {
        await clearAuth();
      }
      return toResult(true, {});
    } catch (err) {
      console.log('[AUTH]', 'logout', err?.message || err);
      await clearAuth();
      return toResult(false, { message: err?.message || 'Logout failed.' });
    }
  }
}

export default new AuthService();
