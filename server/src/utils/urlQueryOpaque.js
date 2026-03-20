/**
 * Same algorithm as client/src/utils/urlQueryOpaque.js — encode IDs/folder names for URLs.
 * Set PUBLIC_QUERY_OBFUSCATE_KEY to the same value as client VITE_PUBLIC_QUERY_OBFUSCATE_KEY
 * so server-generated links (e.g. emails) match the SPA.
 */

import { Buffer } from 'buffer';

const PREFIX_B64 = 'b1.';
const PREFIX_XOR = 'x1.';

function getObfuscateKey() {
  return (process.env.PUBLIC_QUERY_OBFUSCATE_KEY || process.env.VITE_PUBLIC_QUERY_OBFUSCATE_KEY || '').trim();
}

export function encodeUrlOpaque(plain) {
  if (plain == null || plain === '') return '';
  const str = String(plain);
  const key = getObfuscateKey();
  const payload = Buffer.from(str, 'utf8');
  if (key) {
    const kbuf = Buffer.from(key, 'utf8');
    if (kbuf.length === 0) {
      return PREFIX_B64 + payload.toString('base64url');
    }
    const out = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i += 1) {
      out[i] = payload[i] ^ kbuf[i % kbuf.length];
    }
    return PREFIX_XOR + out.toString('base64url');
  }
  return PREFIX_B64 + payload.toString('base64url');
}
