/**
 * Test profile API: login -> GET /auth/me -> PATCH /auth/me
 * Run with server already running: node server/scripts/test-profile-api.js
 * Uses same base URL as client proxy (default 3000; server uses API_PORT from .env or 3001).
 */
const BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const EMAIL = 'admin@elsner.com';
const PASSWORD = 'Admin@123';

async function request(method, path, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || res.statusText || `HTTP ${res.status}`);
  return data;
}

async function run() {
  console.log('Testing profile API at', BASE);
  try {
    const loginRes = await request('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
    const token = loginRes.token;
    if (!token) {
      console.error('Login did not return token:', loginRes);
      process.exit(1);
    }
    console.log('Login OK, got token');

    const me = await request('GET', '/api/auth/me', null, token);
    console.log('GET /api/auth/me OK:', { id: me.id, name: me.name, email: me.email });

    const updated = await request('PATCH', '/api/auth/me', { name: me.name || 'Admin' }, token);
    console.log('PATCH /api/auth/me OK:', { name: updated.name, email: updated.email });

    console.log('All profile API tests passed.');
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
}

run();
