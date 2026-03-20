/**
 * Obfuscates query/path tokens (folder names, Mongo IDs) so URLs are not human-readable.
 *
 * - With no env key: Base64URL wrapper (prefix b1.) — casual obscurity only.
 * - With VITE_PUBLIC_QUERY_OBFUSCATE_KEY: XOR + Base64URL (prefix x1.) — stronger obscurity.
 *
 * Not true secrecy: any secret in VITE_* is visible in the built bundle. This only hides
 * plain text from casual inspection of the address bar; APIs still receive real IDs after decode.
 */

const PREFIX_B64 = 'b1.';
const PREFIX_XOR = 'x1.';

function getObfuscateKey() {
  return (import.meta.env.VITE_PUBLIC_QUERY_OBFUSCATE_KEY || '').trim();
}

function utf8Encode(str) {
  return new TextEncoder().encode(str);
}

function utf8Decode(bytes) {
  return new TextDecoder().decode(bytes);
}

function bytesToBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function xorBytes(data, keyStr) {
  const key = utf8Encode(keyStr || '');
  if (key.length === 0) return data;
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    out[i] = data[i] ^ key[i % key.length];
  }
  return out;
}

/** Encode a plain string for use in ?query= or /path/:segment */
export function encodeUrlOpaque(plain) {
  if (plain == null || plain === '') return '';
  const str = String(plain);
  const key = getObfuscateKey();
  const payload = utf8Encode(str);
  if (key) {
    return PREFIX_XOR + bytesToBase64Url(xorBytes(payload, key));
  }
  return PREFIX_B64 + bytesToBase64Url(payload);
}

/** Decode token from URL (React Router already URI-decodes search params). */
export function decodeUrlOpaque(encoded) {
  if (encoded == null || encoded === '') return '';
  const raw = String(encoded).trim();
  if (raw.startsWith(PREFIX_XOR)) {
    const key = getObfuscateKey();
    if (!key) {
      if (import.meta.env.DEV) {
        console.warn('[urlQueryOpaque] x1.* token requires VITE_PUBLIC_QUERY_OBFUSCATE_KEY');
      }
      return raw;
    }
    try {
      const bytes = base64UrlToBytes(raw.slice(PREFIX_XOR.length));
      return utf8Decode(xorBytes(bytes, key));
    } catch {
      return raw;
    }
  }
  if (raw.startsWith(PREFIX_B64)) {
    try {
      return utf8Decode(base64UrlToBytes(raw.slice(PREFIX_B64.length)));
    } catch {
      return raw;
    }
  }
  /* Legacy bookmarks: raw folder name or raw ObjectId */
  return raw;
}
