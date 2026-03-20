/**
 * Central list of API endpoints. Use with api service (get, post, put, delete).
 * Paths are relative to api baseURL (/api) — no leading /api here to avoid double /api.
 */

export const ENDPOINTS = {
  // Auth
  AUTH_REGISTER: 'auth/register',
  AUTH_LOGIN: 'auth/login',
  AUTH_LOGOUT: 'auth/logout',
  AUTH_ME: 'auth/me',
  AUTH_ME_UPDATE: 'auth/me',
  AUTH_CHANGE_PASSWORD: 'auth/me/change-password',
  AUTH_FORGOT_PASSWORD: 'auth/forgot-password',
  AUTH_RESET_PASSWORD: 'auth/reset-password',
  AUTH_REFRESH: 'auth/refresh',
  AUTH_VERIFY_EMAIL: 'auth/verify-email',
  AUTH_ACCEPT_INVITE: 'auth/accept-invite',
  AUTH_GOOGLE: 'auth/google',

  // Dashboard
  DASHBOARD_SUMMARY: 'dashboard/summary',
  DASHBOARD_ACTIVITY: 'dashboard/activity',

  // Folders (per-user, Mongo-backed)
  FOLDERS: 'folders',
  FOLDER_BY_ID: (id) => `folders/${id}`,

  // Proposals
  PROPOSALS: 'proposals',
  PROPOSALS_SHARED_WITH_ME: 'proposals/shared-with-me',
  PROPOSALS_DELETED: 'proposals/deleted',
  PROPOSAL_BY_ID: (id) => `proposals/${id}`,
  PROPOSAL_RESTORE: (id) => `proposals/${id}/restore`,
  PROPOSAL_PUBLISH: (id) => `proposals/${id}/publish`,
  PROPOSAL_SEND_EMAIL: (id) => `proposals/${id}/send-email`,
  PROPOSAL_COLLABORATORS: (id) => `proposals/${id}/collaborators`,
  PROPOSAL_EXPORT_PDF: (id) => `proposals/${id}/export-pdf`,
  // proposal_blocks are embedded in the proposal document; use PROPOSAL_BY_ID PUT to update
  PROPOSAL_BLOCKS: (id) => `proposals/${id}/blocks`,
  PUBLIC_PROPOSAL: (slug) => `public/proposals/${slug}`,
  PUBLIC_PROPOSAL_BY_ID: (id) => `public/proposals/by-id/${id}`,
  PUBLIC_PROPOSAL_EVENTS: (slug) => `public/proposals/${slug}/events`,
  PUBLIC_PROPOSAL_IDENTIFY: (slug) => `public/proposals/${slug}/identify`,
  PUBLIC_VIEWER_STATUS: (slugOrId, byId) => (byId ? `public/proposals/by-id/${slugOrId}/viewer-status` : `public/proposals/${slugOrId}/viewer-status`),
  PUBLIC_ACCEPT_AGREEMENT: (slugOrId, byId) => (byId ? `public/proposals/by-id/${slugOrId}/accept-agreement` : `public/proposals/${slugOrId}/accept-agreement`),

  // Agreements
  AGREEMENTS: 'agreements',
  AGREEMENT_BY_ID: (id) => `agreements/${id}`,
  AGREEMENT_APPROVE: (id) => `agreements/${id}/approve`,
  AGREEMENT_SEND_ZOHO: (id) => `agreements/${id}/send-to-zoho`,
  AGREEMENT_RESEND: (id) => `agreements/${id}/resend`,
  PUBLIC_AGREEMENT: (slug) => `public/agreements/${slug}`,

  // Clauses
  CLAUSES: 'clauses',
  CLAUSE_BY_ID: (id) => `clauses/${id}`,
  CLAUSE_LOCK: (id) => `clauses/${id}/lock`,

  // Templates
  TEMPLATES: 'templates',
  TEMPLATE_BY_ID: (id) => `templates/${id}`,

  // Payments
  PAYMENTS: 'payments',
  PAYMENTS_CREATE_INTENT: 'payments/create-intent',

  // Analytics / Reports
  ANALYTICS_PROPOSAL: (id) => `analytics/proposals/${id}`,
  ANALYTICS_REPORTS: 'analytics/reports',
  REPORTS_PIPELINE: 'reports/pipeline',

  // Notifications
  NOTIFICATIONS: 'notifications',

  // Billing (Stripe subscription)
  BILLING_STATUS: 'billing/status',
  BILLING_CREATE_CHECKOUT: 'billing/create-checkout-session',
  BILLING_CONFIRM_SESSION: 'billing/confirm-session',
  BILLING_SYNC: 'billing/sync',
  BILLING_CANCEL: 'billing/cancel',

  // Organization / Team / Branding
  ORG_CURRENT: 'organizations/current',
  ORG_BRANDING: 'organizations/current/branding',
  ORG_MEMBERS: 'organizations/current/members',
  ORG_MEMBER_ROLE: (userId) => `organizations/current/members/${userId}/role`,
  ORG_INVITES: 'organizations/current/invites',

  // Team: list members (any org user); invite & remove member (Admin/Super_Admin)
  TEAM_INVITE: 'team/invite',
  TEAM_MEMBERS: 'team/members',
  TEAM_MEMBER: (userId) => `team/members/${userId}`,

  // Admin (role-based)
  ADMIN_AUDIT_LOGS: 'admin/audit-logs',
  ADMIN_ORGANIZATIONS: 'admin/organizations',
  ADMIN_ORGANIZATION_SUSPEND: (id) => `admin/organizations/${id}/suspend`,
  ADMIN_ORGANIZATION_SUBSCRIPTION: (id) => `admin/organizations/${id}/subscription`,
  ADMIN_SUBSCRIPTIONS: 'admin/subscriptions',
  ADMIN_USAGE: 'admin/usage',

  // Zoho Sign
  ZOHO_SEND_DOCUMENT: 'zoho/send-document',
  ZOHO_CONTRACTS: 'zoho/contracts',
  ZOHO_STATUS: (requestId) => `zoho/status/${requestId}`,
  ZOHO_DOWNLOAD: (requestId) => `zoho/download/${requestId}`,

  // Saved Blocks (user library)
  SAVED_BLOCKS: 'saved-blocks',
  SAVED_BLOCK_BY_ID: (id) => `saved-blocks/${id}`,

  // Images
  IMAGES: 'images',
  IMAGE_UPLOAD: 'images/upload',
  IMAGE_BY_ID: (id) => `images/${id}`,

  // Health
  HEALTH: 'health',
};

export default ENDPOINTS;
