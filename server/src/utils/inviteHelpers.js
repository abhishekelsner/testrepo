import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generates a human-readable temporary password.
 * Format: Word + 4-digit number + Symbol → e.g. "Falcon#8241"
 */
export function generateTempPassword() {
  const adjectives = ['Swift', 'Bright', 'Noble', 'Calm', 'Bold', 'Keen', 'Sharp', 'Prime'];
  const nouns = ['Falcon', 'Ridge', 'Stone', 'Forge', 'Vale', 'Crest', 'Peak', 'Wave'];
  const symbols = ['#', '@', '!', '$', '%', '&'];

  const word = adjectives[Math.floor(Math.random() * adjectives.length)] +
    nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];

  return `${word}${symbol}${number}`;
}

/**
 * Generates a secure invite token and its bcrypt hash.
 * Store the hash in DB, send the raw token in the email URL.
 */
export async function generateInviteToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = await bcrypt.hash(rawToken, 10);
  return { rawToken, hashedToken };
}

/**
 * Hash a plain password.
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 12);
}

/**
 * Validate that a role string is an allowed invitable role.
 * Super_Admin cannot be assigned via invite.
 */
export function validateInviteRole(role) {
  const INVITABLE_ROLES = ['Admin', 'Creator'];
  return INVITABLE_ROLES.includes(role);
}
