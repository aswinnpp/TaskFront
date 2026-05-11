import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import {
  notificationServiceInitialize,
  notificationServiceRegisterPushToken,
} from '@backend/services/notificationService';

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#6366f1',
    secondary: '#a5b4fc',
    background: '#0f172a',
    surface: '#1e293b',
    onSurface: '#f8fafc',
  },
};

export default function App() {
  useEffect(() => {
    (async () => {
      await notificationServiceInitialize();
      await notificationServiceRegisterPushToken();
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="light" />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
