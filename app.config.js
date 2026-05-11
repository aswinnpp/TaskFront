/**
 * Expo app configuration with deep linking and env-driven Supabase/Firebase settings.
 * Copy .env.example to .env at the Task repo root and fill values before running.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

module.exports = {
  expo: {
    name: 'Supabase Auth',
    slug: "tasktuto",
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0f172a',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.yourcompany.supabaseauth',
      ...(process.env.GOOGLE_SERVICES_PLIST
        ? { googleServicesFile: process.env.GOOGLE_SERVICES_PLIST }
        : {}),
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0f172a',
      },
      package: 'com.yourcompany.supabaseauth',
      ...(process.env.GOOGLE_SERVICES_JSON
        ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
        : {}),
    },
    scheme: 'supabaseauth',
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#6366f1',
          sounds: [],
        },
      ],
    ],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      resetPasswordPath: process.env.EXPO_PUBLIC_RESET_PASSWORD_PATH || 'reset-password',
      eas: {
        projectId: "acad8d4b-4c69-42b7-844a-b939ffa377ea",
      },
    },
  },
};
