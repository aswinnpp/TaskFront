import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

/**
 * Brief branded splash inside the auth stack; hands off to Login.
 */
export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const t = setTimeout(() => {
      navigation.replace('Login');
    }, 900);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={styles.wrap}>
      <Text variant="headlineMedium" style={styles.title}>
        Supabase Auth
      </Text>
      <Text variant="bodyMedium" style={styles.sub}>
        Secure sign-in for React Native
      </Text>
      <ActivityIndicator animating color="#a5b4fc" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  title: { color: '#f8fafc', marginBottom: 8 },
  sub: { color: '#94a3b8', marginBottom: 24 },
  spinner: { marginTop: 8 },
});
