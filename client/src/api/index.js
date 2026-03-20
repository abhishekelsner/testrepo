/**
 * API module — use this for all API calls.
 *
 * Usage:
 *   import api, { get, post, put, patch, del, ENDPOINTS } from '@/api';
 *
 *   const { data } = await get(ENDPOINTS.AUTH_ME);
 *   await post(ENDPOINTS.AUTH_LOGIN, { email, password });
 *   await put(ENDPOINTS.PROPOSAL_BY_ID(id), { title, blocks });
 */
export { get, post, put, patch, del, ENDPOINTS } from './service.js';
export { default } from './service.js';
