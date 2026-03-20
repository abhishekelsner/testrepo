/**
 * Forgot / reset password: store reset tokens in memory (dev).
 * Replace with Redis for production.
 */
const resetTokens = new Map();

const EXPIRE_MS = 60 * 60 * 1000; // 1 hour

export function setResetToken(email, token) {
  resetTokens.set(token, { email, expiresAt: Date.now() + EXPIRE_MS });
}

export function getResetToken(token) {
  const data = resetTokens.get(token);
  if (!data || data.expiresAt < Date.now()) {
    resetTokens.delete(token);
    return null;
  }
  return data.email;
}

export function invalidateResetToken(token) {
  resetTokens.delete(token);
}
