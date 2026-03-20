/**
 * Common API service — single place for all HTTP calls.
 * Base URL is from env so it works when API is on 5173 or another port.
 * Use ENDPOINTS from ./endpoints with get, post, put, patch, delete.
 */
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isAuthRequest = err.config?.url?.includes('auth/login') || err.config?.url?.includes('auth/register');
      if (!isAuthRequest) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);


/**
 * GET request
 * @param {string} url - Endpoint URL (use ENDPOINTS from endpoints.js)
 * @param {object} [config] - Axios config (params, headers, etc.)
 * @returns {Promise}
 */
export function get(url, config = {}) {
  return api.get(url, config);
}

/**
 * POST request
 * @param {string} url - Endpoint URL
 * @param {object} [data] - Request body
 * @param {object} [config] - Axios config
 * @returns {Promise}
 */
export function post(url, data = {}, config = {}) {
  return api.post(url, data, config);
}

/**
 * PUT request
 * @param {string} url - Endpoint URL
 * @param {object} [data] - Request body
 * @param {object} [config] - Axios config
 * @returns {Promise}
 */
export function put(url, data = {}, config = {}) {
  return api.put(url, data, config);
}

/**
 * PATCH request
 * @param {string} url - Endpoint URL
 * @param {object} [data] - Request body
 * @param {object} [config] - Axios config
 * @returns {Promise}
 */
export function patch(url, data = {}, config = {}) {
  return api.patch(url, data, config);
}

/**
 * DELETE request
 * @param {string} url - Endpoint URL
 * @param {object} [config] - Axios config
 * @returns {Promise}
 */
export function del(url, config = {}) {
  return api.delete(url, config);
}

export { ENDPOINTS } from './endpoints.js';
export default api;
