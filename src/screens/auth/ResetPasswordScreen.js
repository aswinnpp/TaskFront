import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, Snackbar, Text, TextInput } from 'react-native-paper';
import { authServiceUpdatePassword } from '@backend/services/authService';
import { PASSWORD_RULES_TEXT } from '@backend/utils/constants';
import { validatePassword } from '@backend/utils/validation';

/**
 * Shown after Supabase recovery deep link sets a session with type=recovery.
 */
export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [confirmErr, setConfirmErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const onSubmit = async () => {
    setToast('');
    const p = validatePassword(password);
    setPasswordErr(p.ok ? '' : p.message);
    let cErr = '';
    if (confirm !== password) cErr = 'Passwords do not match.';
    setConfirmErr(cErr);
    if (!p.ok || cErr) return;

    setLoading(true);
    const res = await authServiceUpdatePassword(p.value);
    setLoading(false);

    if (!res.ok) {
      setToast(res.message);
      return;
    }
    setToast('Password updated. You are signed in.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="titleLarge" style={styles.heading}>
          Choose a new password
        </Text>
        <Text variant="bodySmall" style={styles.muted}>
          {PASSWORD_RULES_TEXT}
        </Text>

        <TextInput
          label="New password"
          mode="outlined"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setPasswordErr('');
          }}
          secureTextEntry
          error={!!passwordErr}
          style={styles.input}
        />
        {!!passwordErr && (
          <Text style={styles.error} variant="bodySmall">
            {passwordErr}
          </Text>
        )}

        <TextInput
          label="Confirm password"
          mode="outlined"
          value={confirm}
          onChangeText={(t) => {
            setConfirm(t);
            setConfirmErr('');
          }}
          secureTextEntry
          error={!!confirmErr}
          style={styles.input}
        />
        {!!confirmErr && (
          <Text style={styles.error} variant="bodySmall">
            {confirmErr}
          </Text>
        )}

        <Button mode="contained" onPress={onSubmit} loading={loading} disabled={loading} style={styles.btn}>
          Update password
        </Button>
      </ScrollView>
      <Snackbar visible={!!toast} onDismiss={() => setToast('')} duration={2800}>
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
