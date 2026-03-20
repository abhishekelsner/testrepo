/**
 * Zoho Sign API configuration.
 * Uses OAuth 2.0 refresh token flow; access token is refreshed when expired.
 */
const ZOHO_SIGN_BASE = process.env.ZOHO_SIGN_BASE_URL || 'https://sign.zoho.com';
const ZOHO_ACCOUNTS_BASE = process.env.ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.com';

export const zohoConfig = {
  clientId: process.env.ZOHO_CLIENT_ID || '',
  clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
  refreshToken: process.env.ZOHO_REFRESH_TOKEN || '',
  signBaseUrl: ZOHO_SIGN_BASE.replace(/\/$/, ''),
  accountsBaseUrl: ZOHO_ACCOUNTS_BASE.replace(/\/$/, ''),
  webhookSecret: process.env.ZOHO_WEBHOOK_SECRET || '',
};

export function isZohoConfigured() {
  return !!(zohoConfig.clientId && zohoConfig.clientSecret && zohoConfig.refreshToken);
}
