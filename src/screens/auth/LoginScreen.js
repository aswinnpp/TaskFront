import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, Snackbar, Text, TextInput } from 'react-native-paper';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import authApiService from '../../services/authApiService';
import { validateEmail, validatePassword } from '../../config/validation';
import { useAuth } from '../../context/AuthContext';

/** Maps legacy email-verification errors to the phone-first flow. */
function friendlyLoginError(message) {
  const m = String(message || '');
  const lower = m.toLowerCase();
  if (lower.includes('email') && (lower.includes('verif') || lower.includes('confirm'))) {
    return 'Complete phone verification with the SMS code from signup, then sign in here.';
  }
  if (lower.includes('phone') && (lower.includes('verif') || lower.includes('not verified'))) {
    return 'Verify your phone with the SMS code we sent, then sign in.';
  }
  return m;
}

export default function LoginScreen({ navigation }) {
  const route = useRoute();
  const { setAuthFromApiResponse } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  useFocusEffect(
    useCallback(() => {
      const msg = route.params?.phoneVerifiedMessage;
      if (msg) {
        setToast(msg);
        navigation.setParams({ phoneVerifiedMessage: undefined });
      }
    }, [navigation, route.params?.phoneVerifiedMessage])
  );

  const onSubmit = async () => {
    setToast('');
    const e = validateEmail(email);
    const p = validatePassword(password);
    setEmailErr(e.ok ? '' : e.message);
    setPasswordErr(p.ok ? '' : p.message);
    if (!e.ok || !p.ok) return;

    setLoading(true);
    const res = await authApiService.login({ email: e.value, password: p.value });
    setLoading(false);

    if (!res.ok) {
      setToast(friendlyLoginError(res.message));
      return;
    }
    await setAuthFromApiResponse(res.data);
    setToast('Signed in successfully.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="titleLarge" style={styles.heading}>
          Welcome back
        </Text>
        <Text variant="bodyMedium" style={styles.muted}>
          Sign in with your email and password after you verify your phone with the signup SMS code.
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
          autoComplete="email"
          error={!!emailErr}
          style={styles.input}
        />
        {!!emailErr && (
          <Text style={styles.error} variant="bodySmall">
            {emailErr}
          </Text>
        )}

        <TextInput
          label="Password"
          mode="outlined"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setPasswordErr('');
          }}
          secureTextEntry
          autoComplete="password"
          error={!!passwordErr}
          style={styles.input}
        />
        {!!passwordErr && (
          <Text style={styles.error} variant="bodySmall">
            {passwordErr}
          </Text>
        )}

        <Button mode="contained" onPress={onSubmit} loading={loading} disabled={loading} style={styles.btn}>
          Sign in
        </Button>

        <Button mode="text" onPress={() => navigation.navigate('ForgotPassword')} compact>
          Forgot password?
        </Button>
        <Button mode="text" onPress={() => navigation.navigate('SignUp')} compact>
          Create an account
        </Button>
      </ScrollView>
      <Snackbar visible={!!toast} onDismiss={() => setToast('')} duration={2200}>
        {toast}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20, paddingBottom: 40 },
  heading: { color: '#f8fafc', marginBottom: 6 },
  muted: { color: '#94a3b8', marginBottom: 20 },
  input: { marginBottom: 4, backgroundColor: '#1e293b' },
  error: { color: '#fca5a5', marginBottom: 8 },
  btn: { marginTop: 12, marginBottom: 8 },
});
