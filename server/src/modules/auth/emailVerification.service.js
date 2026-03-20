/**
 * Email verification tokens stored in memory (dev).
 * Replace backing store with Redis for production.
 */
const verificationTokens = new Map();

const EXPIRE_MS = 24 * 60 * 60 * 1000; // 24 hours

export function setVerificationToken(email, token) {
  verificationTokens.set(token, { email, expiresAt: Date.now() + EXPIRE_MS });
}

export function getVerificationToken(token) {
  const data = verificationTokens.get(token);
  if (!data || data.expiresAt < Date.now()) {
    verificationTokens.delete(token);
    return null;
  }
  return data.email;
}

export function invalidateVerificationToken(token) {
  verificationTokens.delete(token);
}
