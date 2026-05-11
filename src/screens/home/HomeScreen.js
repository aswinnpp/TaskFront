import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Card, Snackbar, Text } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import authApiService from '../../services/authApiService';

export default function HomeScreen() {
  const { user, resetAuthStackToLogin, clearAuthState } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const email = user?.email || '—';
  const phone = user?.phone || user?.user_metadata?.phone || '—';
  const id = user?.id || '—';

  useEffect(() => {
    if (!user) setToast('Your session is invalid. Please sign in again.');
  }, [user]);

  const onLogout = async () => {
    setLoading(true);
    const res = await authApiService.logout();
    setLoading(false);
    if (!res.ok) {
      setToast(res.message);
      return;
    }
    await clearAuthState();
    await resetAuthStackToLogin();
    setToast('Signed out.');
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text variant="headlineSmall" style={styles.title}>
        Account
      </Text>
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="labelLarge" style={styles.label}>
            Email
          </Text>
          <Text variant="bodyLarge" style={styles.value}>
            {email}
          </Text>
          <Text variant="labelLarge" style={[styles.label, styles.mt]}>
            Phone
          </Text>
          <Text variant="bodyLarge" style={styles.value}>
            {phone}
          </Text>
          <Text variant="labelLarge" style={[styles.label, styles.mt]}>
            User ID
          </Text>
          <Text selectable variant="bodySmall" style={styles.mono}>
            {id}
          </Text>
        </Card.Content>
      </Card>

      <Button mode="contained" buttonColor="#dc2626" onPress={onLogout} loading={loading} disabled={loading} style={styles.btn}>
        Log out
      </Button>

      <Snackbar visible={!!toast} onDismiss={() => setToast('')} duration={2200}>
        {toast}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  title: { color: '#f8fafc', marginBottom: 16 },
  card: { backgroundColor: '#1e293b', marginBottom: 20 },
  label: { color: '#94a3b8' },
  value: { color: '#f8fafc' },
  mono: { color: '#e2e8f0', marginTop: 4 },
  mt: { marginTop: 12 },
  btn: { alignSelf: 'stretch' },
});
