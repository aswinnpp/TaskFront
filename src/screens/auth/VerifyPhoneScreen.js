import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text, TextInput } from 'react-native-paper';
import authApiService from '../../services/authApiService';
import { validateOtp } from '../../config/validation';

/**
 * Confirms SMS OTP after signup. On success, user goes to Login (no session until login).
 */
export default function VerifyPhoneScreen({ route, navigation }) {
  const phone = route.params?.phone || '';
  const [otp, setOtp] = useState('');
  const [otpErr, setOtpErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const onVerify = async () => {
    setToast('');
    const o = validateOtp(otp);
    setOtpErr(o.ok ? '' : o.message);
    if (!o.ok) return;
    if (!phone) {
      setToast('Missing phone. Go back and sign up again.');
      return;
    }

    setLoading(true);
    const res = await authApiService.verifyOtp({ phone, otp: o.value });
    setLoading(false);
    if (!res.ok) {
      setToast(res.message);
      return;
    }

    const successMsg = 'Phone verified successfully. Please login.';
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login', params: { phoneVerifiedMessage: successMsg } }],
    });
  };

  const onResend = async () => {
    if (!phone) return;
    setLoading(true);
    const res = await authApiService.resendOtp({ phone });
    setLoading(false);
    if (!res.ok) setToast(res.message);
    else setToast('A new code was sent if SMS is enabled.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.box}>
        <Text variant="titleLarge" style={styles.heading}>
          Enter SMS code
        </Text>
        <Text variant="bodyMedium" style={styles.muted}>
          We sent a 6-digit code to {phone || 'your phone'}.
        </Text>

        <TextInput
          label="One-time code"
          mode="outlined"
          value={otp}
          onChangeText={(t) => {
            setOtp(t);
            setOtpErr('');
          }}
          keyboardType="number-pad"
          maxLength={6}
          error={!!otpErr}
          style={styles.input}
        />
        {!!otpErr && (
          <Text style={styles.error} variant="bodySmall">
            {otpErr}
          </Text>
        )}

        <Button mode="contained" onPress={onVerify} loading={loading} disabled={loading} style={styles.btn}>
          Verify
        </Button>
        <Button mode="outlined" onPress={onResend} disabled={loading}>
          Resend code
        </Button>
      </View>
      <Snackbar visible={!!toast} onDismiss={() => setToast('')} duration={2800}>
        {toast}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f172a' },
  box: { padding: 20 },
  heading: { color: '#f8fafc', marginBottom: 8 },
  muted: { color: '#94a3b8', marginBottom: 16 },
  input: { marginBottom: 4, backgroundColor: '#1e293b' },
  error: { color: '#fca5a5', marginBottom: 8 },
  btn: { marginTop: 8, marginBottom: 8 },
});
