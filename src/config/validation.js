function ok(value) {
  return { ok: true, value };
}

function bad(message) {
  return { ok: false, message };
}

export function validateEmail(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return bad('Email is required.');
  // Reasonable email check (not overly strict).
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(value)) return bad('Enter a valid email address.');
  return ok(value);
}

export function validatePassword(raw) {
  const value = String(raw || '');
  if (!value) return bad('Password is required.');
  if (value.length < 8) return bad('Password must be at least 8 characters.');
  const hasLetter = /[A-Za-z]/.test(value);
  const hasNumber = /\d/.test(value);
  if (!hasLetter || !hasNumber) return bad('Password must include letters and numbers.');
  return ok(value);
}

export function validatePhoneE164(raw) {
  const value = String(raw || '').trim();
  if (!value) return bad('Phone is required.');
  const re = /^\+[1-9]\d{7,14}$/;
  if (!re.test(value)) return bad('Phone must be in E.164 format, e.g. +14155552671');
  return ok(value);
}

export function validateOtp(raw) {
  const value = String(raw || '').trim();
  if (!value) return bad('Code is required.');
  if (!/^\d{6}$/.test(value)) return bad('Code must be 6 digits.');
  return ok(value);
}

