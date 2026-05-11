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

class AuthApiService {
  async getStoredAuth() {
    return readAuth();
  }

  async signup({ email, password, phone }) {
    try {
      const data = await apiRequest('/auth/signup', {
        method: 'POST',
        body: { email, password, phone },
      });
      if (data?.accessToken) await persistAuth(data);
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH API ERROR]', 'signup', err?.message || err);
      return toResult(false, { message: err?.message || 'Signup failed.' });
    }
  }

  async login({ email, password }) {
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (data?.accessToken) await persistAuth(data);
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH API ERROR]', 'login', err?.message || err);
      return toResult(false, { message: err?.message || 'Login failed.' });
    }
  }

  async verifyOtp({ phone, otp }) {
    try {
      const data = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: { phone, otp },
      });
      if (data?.accessToken) await persistAuth(data);
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH API ERROR]', 'verify-otp', err?.message || err);
      return toResult(false, { message: err?.message || 'OTP verification failed.' });
    }
  }

  async resendOtp({ phone }) {
    try {
      const data = await apiRequest('/auth/resend-otp', {
        method: 'POST',
        body: { phone },
      });
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH API ERROR]', 'resend-otp', err?.message || err);
      return toResult(false, { message: err?.message || 'Resend OTP failed.' });
    }
  }

  async forgotPassword({ email }) {
    try {
      const data = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH API ERROR]', 'forgot-password', err?.message || err);
      return toResult(false, { message: err?.message || 'Request failed.' });
    }
  }

  async resetPassword({ accessToken, refreshToken, newPassword }) {
    try {
      const data = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: { accessToken, refreshToken, newPassword, confirmPassword: newPassword },
      });
      if (data?.accessToken) await persistAuth(data);
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH API ERROR]', 'reset-password', err?.message || err);
      return toResult(false, { message: err?.message || 'Reset password failed.' });
    }
  }

  async refreshToken() {
    try {
      const { refreshToken } = await readAuth();
      if (!refreshToken) return toResult(false, { message: 'Missing refresh token.' });
      const data = await apiRequest('/auth/refresh-token', {
        method: 'POST',
        body: { refreshToken },
      });
      if (data?.accessToken) await persistAuth(data);
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH API ERROR]', 'refresh-token', err?.message || err);
      return toResult(false, { message: err?.message || 'Token refresh failed.' });
    }
  }

  async logout() {
    try {
      const { accessToken } = await readAuth();
      try {
        if (accessToken) {
          await apiRequest('/auth/logout', {
            method: 'POST',
            token: accessToken,
          });
        }
      } finally {
        await clearAuth();
      }
      return toResult(true, {});
    } catch (err) {
      console.log('[AUTH API ERROR]', 'logout', err?.message || err);
      await clearAuth();
      return toResult(false, { message: err?.message || 'Logout failed.' });
    }
  }
}

export default new AuthApiService();

