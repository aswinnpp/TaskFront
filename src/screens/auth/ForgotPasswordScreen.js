import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, Snackbar, Text, TextInput } from 'react-native-paper';
import { authServiceForgotPassword } from '@backend/services/authService';
import { notificationServiceOnPasswordResetRequested } from '@backend/services/notificationService';
import { validateEmail } from '@backend/utils/validation';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const onSubmit = async () => {
    setToast('');
    const e = validateEmail(email);
    setEmailErr(e.ok ? '' : e.message);
    if (!e.ok) return;

    setLoading(true);
    const res = await authServiceForgotPassword(e.value);
    setLoading(false);

    if (!res.ok) {
      setToast(res.message);
      return;
    }

    // Local / device notification (and logs FCM-backed Expo token when configured).
    try {
      await notificationServiceOnPasswordResetRequested();
    } catch {
      /* non-fatal */
    }

    setToast('If an account exists, a reset email was sent.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="titleLarge" style={styles.heading}>
          Reset password
        </Text>
        <Text variant="bodyMedium" style={styles.muted}>
          Enter your registered email. We will send a link that opens this app.
        </Text>

        <TextInput
          label="Email"
          mode="outlined"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setEmailErr('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          error={!!emailErr}
          style={styles.input}
        />
        {!!emailErr && (
          <Text style={styles.error} variant="bodySmall">
            {emailErr}
          </Text>
        )}

        <Button mode="contained" onPress={onSubmit} loading={loading} disabled={loading} style={styles.btn}>
          Send reset email
        </Button>
        <Button mode="text" onPress={() => navigation.navigate('Login')} compact>
          Back to sign in
        </Button>
      </ScrollView>
      <Snackbar visible={!!toast} onDismiss={() => setToast('')} duration={3200}>
        {toast}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20, paddingBottom: 40 },
  heading: { color: '#f8fafc', marginBottom: 8 },
  muted: { color: '#94a3b8', marginBottom: 16 },
  input: { marginBottom: 4, backgroundColor: '#1e293b' },
  error: { color: '#fca5a5', marginBottom: 8 },
  btn: { marginTop: 8 },
});
