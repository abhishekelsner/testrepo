import AuditLog from './auditLog.model.js';

/**
 * Log an audit event. Never throws — audit failures must not break requests.
 */
export async function logEvent({ event, userId, organizationId, email, req, metadata } = {}) {
  try {
    await AuditLog.create({
      event,
      userId: userId || null,
      organizationId: organizationId || null,
      email: email || null,
      ip: req?.ip || null,
      userAgent: req?.headers?.['user-agent'] || null,
      metadata: metadata || null,
    });
  } catch (err) {
    console.error('[audit] Failed to log event:', err.message);
  }
}
