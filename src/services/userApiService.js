import authApiService from './authApiService';
import { apiRequest } from '../config/api';

function toResult(ok, payload) {
  return { ok, ...payload };
}

class UserApiService {
  async getMe() {
    try {
      const { accessToken } = await authApiService.getStoredAuth();
      if (!accessToken) return toResult(false, { message: 'Not authenticated.' });
      const data = await apiRequest('/users/me', { token: accessToken });
      return toResult(true, { data });
    } catch (err) {
      console.log('[AUTH API ERROR]', 'users/me', err?.message || err);
      return toResult(false, { message: err?.message || 'Failed to load profile.' });
    }
  }
}

export default new UserApiService();

