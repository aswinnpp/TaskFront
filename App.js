import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import notificationApiService from './src/services/notificationApiService';

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
    const initializeNotifications = async () => {
      try {
        await notificationApiService.initialize();
        await notificationApiService.registerPushToken();
      } catch (error) {
        console.log(
          '[NOTIFICATION INIT ERROR]',
          error?.message || error
        );
      }
    };

    initializeNotifications();
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