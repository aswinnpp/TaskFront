import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, Snackbar, Text, TextInput } from 'react-native-paper';
import {
  authServiceSignUp,
  authServiceStartPhoneVerification,
} from '@backend/services/authService';
import { PASSWORD_RULES_TEXT } from '@backend/utils/constants';
import { validateEmail, validatePassword, validatePhone } from '@backend/utils/validation';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const onSubmit = async () => {
    setToast('');
    const e = validateEmail(email);
    const ph = validatePhone(phone);
    const p = validatePassword(password);
    setEmailErr(e.ok ? '' : e.message);
    setPhoneErr(ph.ok ? '' : ph.message);
    setPasswordErr(p.ok ? '' : p.message);
    if (!e.ok || !ph.ok || !p.ok) return;

    setLoading(true);
    const res = await authServiceSignUp(e.value, p.value, ph.value);
    setLoading(false);

    if (!res.ok) {
      setToast(res.message);
      return;
    }

    if (res.needsEmailConfirmation) {
      setToast('Check your email to confirm your account, then sign in.');
      navigation.navigate('Login');
      return;
    }

    // Session available (email confirmation disabled in Supabase project)
    const otpRes = await authServiceStartPhoneVerification(res.phone);
    if (!otpRes.ok) {
      setToast(
        otpRes.message +
          ' You can verify your phone later from the app once SMS is configured in Supabase.'
      );
      navigation.navigate('Login');
      return;
    }

    navigation.navigate('VerifyPhone', { phone: otpRes.phone });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="titleLarge" style={styles.heading}>
          Create account
        </Text>
        <Text variant="bodySmall" style={styles.muted}>
          {PASSWORD_RULES_TEXT}
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

        <TextInput
          label="Phone (E.164)"
          mode="outlined"
          value={phone}
          onChangeText={(t) => {
            setPhone(t);
            setPhoneErr('');
          }}
          keyboardType="phone-pad"
          placeholder="+14155552671"
          error={!!phoneErr}
          style={styles.input}
        />
        {!!phoneErr && (
          <Text style={styles.error} variant="bodySmall">
            {phoneErr}
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
          error={!!passwordErr}
          style={styles.input}
        />
        {!!passwordErr && (
          <Text style={styles.error} variant="bodySmall">
            {passwordErr}
          </Text>
        )}

        <Button mode="contained" onPress={onSubmit} loading={loading} disabled={loading} style={styles.btn}>
          Sign up
        </Button>
        <Button mode="text" onPress={() => navigation.navigate('Login')} compact>
          Already have an account? Sign in
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
  heading: { color: '#f8fafc', marginBottom: 6 },
  muted: { color: '#94a3b8', marginBottom: 16 },
  input: { marginBottom: 4, backgroundColor: '#1e293b' },
  error: { color: '#fca5a5', marginBottom: 8 },
  btn: { marginTop: 12 },
});
