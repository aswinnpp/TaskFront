import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  repositoryOnAuthStateChange,
  repositoryGetSession,
} from '@backend/repositories/authRepository';
import { getRecoveryInProgress } from '@backend/storage/sessionStorage';

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
    const flag = await getRecoveryInProgress();
    setRecoveryInProgressState(flag);
    return flag;
  }, []);

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
      const { data } = await repositoryGetSession();
      if (cancelled) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setInitializing(false);
    })();

    const subscription = repositoryOnAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      await refreshRecoveryFlag();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
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
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
