import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authApiService from '../services/authApiService';
import { deepLinkSessionStorage } from '../services/deepLinkService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [recoveryInProgress, setRecoveryInProgressState] = useState(false);
  const [authStackKey, setAuthStackKey] = useState(0);
  /** First screen for cold start (logged-out). Recovery flow overrides to ResetPassword. */
  const [authInitialRoute, setAuthInitialRoute] = useState('Splash');

  const refreshRecoveryFlag = useCallback(async () => {
    const flag = await deepLinkSessionStorage.getRecoveryInProgress();
    setRecoveryInProgressState(flag);
    return flag;
  }, []);

  const setAuthFromApiResponse = useCallback(
    async (data) => {
      // Backend returns { accessToken, refreshToken, user, ... }
      const accessToken = data?.accessToken || null;
      const refreshToken = data?.refreshToken || null;
      const newUser = data?.user || null;
      setSession(accessToken ? { accessToken, refreshToken } : null);
      setUser(newUser);
      await refreshRecoveryFlag();
    },
    [refreshRecoveryFlag]
  );

  const clearAuthState = useCallback(async () => {
    await authApiService.logout();
    setSession(null);
    setUser(null);
    await refreshRecoveryFlag();
    setAuthInitialRoute('Login');
    setAuthStackKey((k) => k + 1);
  }, [refreshRecoveryFlag]);

  /** Call after a successful password-recovery deep link so the Auth stack shows Reset Password. */
  const focusResetPasswordFlow = useCallback(async () => {
    await refreshRecoveryFlag();
    setAuthInitialRoute('ResetPassword');
    setAuthStackKey((k) => k + 1);
  }, [refreshRecoveryFlag]);

  /** After successful password update or manual cancel, return auth stack to Login. */
  const resetAuthStackToLogin = useCallback(async () => {
    await refreshRecoveryFlag();
    setAuthInitialRoute('Login');
    setAuthStackKey((k) => k + 1);
  }, [refreshRecoveryFlag]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await refreshRecoveryFlag();
      if (cancelled) return;
      const stored = await authApiService.getStoredAuth();
      if (stored?.accessToken) {
        setSession({
          accessToken: stored.accessToken,
          refreshToken: stored.refreshToken,
        });
        setUser(stored.user);
      } else {
        setSession(null);
        setUser(null);
      }
      setInitializing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshRecoveryFlag]);

  const value = useMemo(
    () => ({
      session,
      user,
      initializing,
      recoveryInProgress,
      authStackKey,
      authInitialRoute,
      refreshRecoveryFlag,
      focusResetPasswordFlow,
      resetAuthStackToLogin,
      setAuthFromApiResponse,
      clearAuthState,
    }),
    [
      session,
      user,
      initializing,
      recoveryInProgress,
      authStackKey,
      authInitialRoute,
      refreshRecoveryFlag,
      focusResetPasswordFlow,
      resetAuthStackToLogin,
      setAuthFromApiResponse,
      clearAuthState,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
