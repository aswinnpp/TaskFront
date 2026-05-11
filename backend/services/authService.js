/**
 * Auth logic: phone OTP completes signup — user is not finished until verifyOtp succeeds.
 * No email verification step (we set email_confirm via admin when finishing signup).
 *
 * Env (set in your backend .env):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY
 *   PASSWORD_RESET_REDIRECT  (optional, default supabaseauth://reset-password)
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const supabasePublic = supabaseUrl && anonKey
  ? createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

/** How long we keep pending signup data (memory only — use Redis/DB in production). */
const PENDING_TTL_MS = 15 * 60 * 1000;

/** phone (E.164) -> { email, password, createdAt } — password kept in memory briefly to send to Supabase once. */
const pendingSignupsByPhone = new Map();

function ensureClients() {
  if (!supabaseAdmin || !supabasePublic) {
    const err = new Error('Server misconfigured: missing Supabase URL or keys.');
    err.status = 500;
    throw err;
  }
}

function normalizePhone(phone) {
  return String(phone || '').trim();
}

function validateEmail(email) {
  const em = String(email || '').trim().toLowerCase();
  if (!em) return { ok: false, message: 'Email is required.' };
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(em)) return { ok: false, message: 'Invalid email.' };
  return { ok: true, value: em };
}

function validatePhone(phone) {
  const ph = normalizePhone(phone);
  if (!ph) return { ok: false, message: 'Phone is required.' };
  const re = /^\+[1-9]\d{7,14}$/;
  if (!re.test(ph)) return { ok: false, message: 'Phone must be E.164, e.g. +14155552671.' };
  return { ok: true, value: ph };
}

function validatePassword(password) {
  const pw = String(password || '');
  if (!pw) return { ok: false, message: 'Password is required.' };
  if (pw.length < 8) return { ok: false, message: 'Password must be at least 8 characters.' };
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) {
    return { ok: false, message: 'Password must include letters and numbers.' };
  }
  return { ok: true, value: pw };
}

function pruneExpiredPending() {
  const now = Date.now();
  for (const [ph, rec] of pendingSignupsByPhone.entries()) {
    if (now - rec.createdAt > PENDING_TTL_MS) pendingSignupsByPhone.delete(ph);
  }
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || null,
    phone: user.phone || user.user_metadata?.phone || null,
  };
}

function formatSession(session, user) {
  if (!session) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: publicUser(user),
  };
}

/**
 * POST /signup — validate, store temporary data, send SMS OTP only (no full user with email/password yet).
 */
async function signup({ email, phone, password }) {
  ensureClients();
  pruneExpiredPending();

  const e = validateEmail(email);
  const ph = validatePhone(phone);
  const p = validatePassword(password);
  if (!e.ok || !ph.ok || !p.ok) {
    const parts = [e.ok ? null : e.message, ph.ok ? null : ph.message, p.ok ? null : p.message].filter(Boolean);
    const err = new Error(parts.join(' '));
    err.status = 400;
    throw err;
  }

  if (pendingSignupsByPhone.has(ph.value)) {
    pendingSignupsByPhone.delete(ph.value);
  }

  pendingSignupsByPhone.set(ph.value, {
    email: e.value,
    password: p.value,
    createdAt: Date.now(),
  });

  const { error } = await supabasePublic.auth.signInWithOtp({
    phone: ph.value,
    options: { shouldCreateUser: true },
  });

  if (error) {
    pendingSignupsByPhone.delete(ph.value);
    const err = new Error(error.message || 'Failed to send OTP.');
    err.status = 400;
    throw err;
  }

  return {
    ok: true,
    message: 'OTP sent to your phone. Enter the code to finish creating your account.',
  };
}

/**
 * POST /verify-otp — verify SMS, then save email + password on the Supabase user (no separate email verification).
 * Returns session — your API can choose not to return tokens and force login screen instead.
 */
async function verifyOtp({ phone, otp }) {
  ensureClients();
  pruneExpiredPending();

  const ph = validatePhone(phone);
  if (!ph.ok) {
    const err = new Error(ph.message);
    err.status = 400;
    throw err;
  }

  const token = String(otp || '').trim();
  if (!token) {
    const err = new Error('OTP is required.');
    err.status = 400;
    throw err;
  }

  const pending = pendingSignupsByPhone.get(ph.value);
  if (!pending) {
    const err = new Error('No pending signup for this phone. Please sign up again.');
    err.status = 400;
    throw err;
  }

  const { data, error } = await supabasePublic.auth.verifyOtp({
    phone: ph.value,
    token,
    type: 'sms',
  });

  if (error || !data?.user || !data?.session) {
    const err = new Error(error?.message || 'Invalid or expired OTP.');
    err.status = 400;
    throw err;
  }

  const userId = data.user.id;

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: pending.email,
    password: pending.password,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: {
      ...(data.user.user_metadata || {}),
      phone_verified: true,
      signup_completed: true,
    },
  });

  if (updateError) {
    const err = new Error(updateError.message || 'Could not save account after OTP.');
    err.status = 400;
    throw err;
  }

  pendingSignupsByPhone.delete(ph.value);

  const { data: refreshed, error: refreshErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (refreshErr) {
    const err = new Error(refreshErr.message || 'Account saved but profile could not be loaded.');
    err.status = 500;
    throw err;
  }

  return {
    ok: true,
    message: 'Phone verified. Your account is ready — please sign in.',
    user: publicUser(refreshed?.user || data.user),
  };
}

/**
 * POST /login — email + password; only allowed if phone was verified during signup.
 */
async function login({ email, password }) {
  ensureClients();

  const em = validateEmail(email);
  const pw = String(password || '');
  if (!em.ok) {
    const err = new Error(em.message);
    err.status = 400;
    throw err;
  }
  if (!pw) {
    const err = new Error('Password is required.');
    err.status = 400;
    throw err;
  }

  const { data, error } = await supabasePublic.auth.signInWithPassword({
    email: em.value,
    password: pw,
  });

  if (error || !data?.session) {
    const err = new Error(error?.message || 'Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const user = data.user;
  const meta = user.user_metadata || {};
  const phoneOk = Boolean(user.phone_confirmed_at || meta.phone_verified || meta.signup_completed);
  if (!phoneOk) {
    await supabasePublic.auth.signOut();
    const err = new Error('Complete phone verification before signing in.');
    err.status = 403;
    throw err;
  }

  return formatSession(data.session, user);
}

/**
 * POST /forgot-password — only sends reset email (no signup email verification).
 */
async function forgotPassword({ email }) {
  ensureClients();

  const em = validateEmail(email);
  if (!em.ok) {
    const err = new Error(em.message);
    err.status = 400;
    throw err;
  }

  const redirectTo =
    process.env.PASSWORD_RESET_REDIRECT || 'supabaseauth://reset-password';

  const { error } = await supabasePublic.auth.resetPasswordForEmail(em.value, {
    redirectTo,
  });

  if (error) {
    const err = new Error(error.message || 'Could not send reset email.');
    err.status = 400;
    throw err;
  }

  return { ok: true, message: 'If an account exists for this email, a reset link was sent.' };
}

/**
 * POST /reset-password — expects recovery session tokens from the deep link (how your route passes them).
 */
async function resetPassword({ accessToken, refreshToken, newPassword }) {
  ensureClients();

  const p = validatePassword(newPassword);
  if (!p.ok) {
    const err = new Error(p.message);
    err.status = 400;
    throw err;
  }

  if (!accessToken) {
    const err = new Error('Missing access token. Open the reset link from your email again.');
    err.status = 400;
    throw err;
  }

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: !!refreshToken, persistSession: false },
  });

  if (refreshToken) {
    await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }

  const { data, error } = await client.auth.updateUser({ password: p.value });

  if (error) {
    const err = new Error(error.message || 'Invalid or expired reset link.');
    err.status = 400;
    throw err;
  }

  return {
    ok: true,
    message: 'Password updated. You can sign in.',
    user: publicUser(data.user),
  };
}

/**
 * GET /profile — bearer access token.
 */
async function getProfile(accessToken) {
  ensureClients();

  if (!accessToken) {
    const err = new Error('Missing authorization token.');
    err.status = 401;
    throw err;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data?.user) {
    const err = new Error(error?.message || 'Invalid or expired session.');
    err.status = 401;
    throw err;
  }

  return { user: publicUser(data.user) };
}

/**
 * POST /logout — revoke refresh server-side when possible; client should still discard tokens.
 */
async function logout(accessToken) {
  ensureClients();

  if (!accessToken) {
    return { ok: true };
  }

  try {
    const { data: userData } = await supabaseAdmin.auth.getUser(accessToken);
    const uid = userData?.user?.id;
    if (uid && typeof supabaseAdmin.auth.admin.signOut === 'function') {
      await supabaseAdmin.auth.admin.signOut(uid, 'global');
    }
  } catch (_) {
    /* still tell client to clear local session */
  }

  return { ok: true };
}

module.exports = {
  signup,
  verifyOtp,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  logout,
};
