import React, { useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthStackNavigator from './AuthStackNavigator';
import AppStackNavigator from './AppStackNavigator';
import {
  deepLinkServiceGetInitialUrl,
  deepLinkServiceHandleUrl,
} from '../services/deepLinkService';
import { Snackbar } from 'react-native-paper';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0f172a',
    card: '#0f172a',
    text: '#f8fafc',
    border: '#1e293b',
    primary: '#6366f1',
  },
};

/**
 * Chooses App vs Auth stack and wires global deep links for Supabase recovery URLs.
 */
export default function RootNavigator() {
  const { initializing, session, user, recoveryInProgress, focusResetPasswordFlow } = useAuth();
  const [linkError, setLinkError] = React.useState('');
  const handledInitialUrl = useRef(false);

  const showApp = Boolean(user && session && !recoveryInProgress);

  useEffect(() => {
    if (initializing) return;

    (async () => {
      if (handledInitialUrl.current) return;
      handledInitialUrl.current = true;
      const url = await deepLinkServiceGetInitialUrl();
      if (!url) return;
      const res = await deepLinkServiceHandleUrl(url, { focusResetPasswordFlow });
      if (res.handled && res.error) setLinkError(res.error);
    })();
  }, [initializing, focusResetPasswordFlow]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', async ({ url }) => {
      const res = await deepLinkServiceHandleUrl(url, { focusResetPasswordFlow });
      if (res.handled && res.error) setLinkError(res.error);
    });
    return () => sub.remove();
  }, [focusResetPasswordFlow]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer theme={navTheme}>
        {showApp ? <AppStackNavigator /> : <AuthStackNavigator />}
      </NavigationContainer>
      <Snackbar visible={!!linkError} onDismiss={() => setLinkError('')} duration={4000}>
        {linkError}
      </Snackbar>
    </>
  );
}
