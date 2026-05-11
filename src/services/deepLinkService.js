import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  recoveryInProgress: 'auth.recoveryInProgress',
  pendingResetAccessToken: 'auth.pendingResetAccessToken',
  pendingResetRefreshToken: 'auth.pendingResetRefreshToken',
};

async function setRecoveryInProgress(value) {
  await AsyncStorage.setItem(STORAGE_KEYS.recoveryInProgress, value ? '1' : '0');
}

async function getRecoveryInProgress() {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.recoveryInProgress);
  return v === '1';
}

async function setPendingResetAccessToken(token) {
  if (!token) {
    await AsyncStorage.removeItem(STORAGE_KEYS.pendingResetAccessToken);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.pendingResetAccessToken, token);
}

async function getPendingResetAccessToken() {
  return (await AsyncStorage.getItem(STORAGE_KEYS.pendingResetAccessToken)) || null;
}

async function setPendingResetRefreshToken(token) {
  if (!token) {
    await AsyncStorage.removeItem(STORAGE_KEYS.pendingResetRefreshToken);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.pendingResetRefreshToken, token);
}

async function getPendingResetRefreshToken() {
  return (await AsyncStorage.getItem(STORAGE_KEYS.pendingResetRefreshToken)) || null;
}

function parseUrl(url) {
  const parsed = Linking.parse(url);
  const host = parsed.hostname || '';
  const path = parsed.path || '';
  const combined = host && path ? `${host}/${path}` : host || path || '';
  const queryParams = parsed.queryParams || {};
  return { path: combined, queryParams };
}

/**
 * Returns { handled: boolean, error?: string }
 * - For password reset and auth callback links, it stores state needed by the app
 * - Callers can trigger UI navigation via provided callbacks
 */
export async function deepLinkServiceHandleUrl(url, { focusResetPasswordFlow } = {}) {
  try {
    console.log('[DEEPLINK RECEIVED]', url);

    const { path, queryParams } = parseUrl(url);

    // Examples we support:
    // - tasktuto://password-reset?access_token=...&type=recovery
    // - tasktuto://auth/callback?access_token=...&refresh_token=...
    const normalizedPath = String(path || '').replace(/^\/+/, '');

    if (normalizedPath.startsWith('password-reset')) {
      const accessToken =
        queryParams.access_token ||
        queryParams.token ||
        queryParams.accessToken ||
        null;
      const refreshToken =
        queryParams.refresh_token ||
        queryParams.refreshToken ||
        null;

      await setRecoveryInProgress(true);
      await setPendingResetAccessToken(accessToken);
      await setPendingResetRefreshToken(refreshToken);

      if (typeof focusResetPasswordFlow === 'function') {
        await focusResetPasswordFlow();
      }

      return { handled: true };
    }

    if (normalizedPath.startsWith('auth/callback')) {
      // Auth callback is handled by normal login flow in-app.
      return { handled: true };
    }

    return { handled: false };
  } catch (err) {
    return { handled: true, error: err?.message || 'Failed to handle deep link.' };
  }
}

export async function deepLinkServiceGetInitialUrl() {
  const url = await Linking.getInitialURL();
  return url || null;
}

export const deepLinkSessionStorage = {
  getRecoveryInProgress,
  setRecoveryInProgress,
  getPendingResetAccessToken,
  setPendingResetAccessToken,
  getPendingResetRefreshToken,
  setPendingResetRefreshToken,
};

