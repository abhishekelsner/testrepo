/**
 * Zoho Sign API service: OAuth token refresh, create request, add fields, submit, status, download.
 */
import { zohoConfig, isZohoConfigured } from '../config/zoho.js';
import ZohoCredential from '../models/ZohoCredential.js';

const SIGN_API = `${zohoConfig.signBaseUrl}/api/v1`;
const TOKEN_URL = `${zohoConfig.accountsBaseUrl}/oauth/v2/token`;

let inMemoryAccessToken = null;
let inMemoryExpiresAt = null;

/**
 * Get valid access token (from memory, DB, or refresh).
 */
export async function getAccessToken(organizationId = null) {
  const now = new Date();
  if (inMemoryAccessToken && inMemoryExpiresAt && inMemoryExpiresAt > now) {
    return inMemoryAccessToken;
  }
  const cred = await ZohoCredential.findOne(organizationId ? { organizationId } : { organizationId: null }).lean();
  if (cred && cred.accessToken && new Date(cred.expiresAt) > now) {
    inMemoryAccessToken = cred.accessToken;
    inMemoryExpiresAt = new Date(cred.expiresAt);
    return cred.accessToken;
  }
  const refreshToken = cred?.refreshToken || zohoConfig.refreshToken;
  if (!refreshToken || !zohoConfig.clientId || !zohoConfig.clientSecret) {
    throw new Error('Zoho Sign is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN.');
  }
  const tokens = await refreshAccessToken(refreshToken);
  inMemoryAccessToken = tokens.access_token;
  inMemoryExpiresAt = new Date(Date.now() + (tokens.expires_in - 60) * 1000);
  if (cred) {
    await ZohoCredential.updateOne(
      { _id: cred._id },
      { accessToken: tokens.access_token, expiresAt: inMemoryExpiresAt }
    );
  } else if (tokens.refresh_token) {
    await ZohoCredential.findOneAndUpdate(
      { organizationId: organizationId || null },
      {
        organizationId: organizationId || null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: inMemoryExpiresAt,
      },
      { upsert: true }
    );
  }
  return tokens.access_token;
}

async function refreshAccessToken(refreshToken) {
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: zohoConfig.clientId,
    client_secret: zohoConfig.clientSecret,
    grant_type: 'refresh_token',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error + (data.error_description ? ': ' + data.error_description : ''));
  }
  return {
    access_token: data.access_token,
    expires_in: data.expires_in || 3600,
    refresh_token: data.refresh_token || refreshToken,
  };
}

async function zohoRequest(method, path, options = {}, organizationId = null) {
  const token = await getAccessToken(organizationId);
  const url = path.startsWith('http') ? path : `${SIGN_API}${path}`;
  const headers = {
    Authorization: `Zoho-oauthtoken ${token}`,
    ...options.headers,
  };
  const res = await fetch(url, { method, ...options, headers });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text };
  }
  if (res.status === 401 && body.code === 2) {
    inMemoryAccessToken = null;
    inMemoryExpiresAt = null;
    const token2 = await getAccessToken(organizationId);
    return zohoRequest(method, path, { ...options, headers: { ...options.headers, Authorization: `Zoho-oauthtoken ${token2}` } }, organizationId);
  }
  if (!res.ok) {
    const err = new Error(body.message || body.error || `Zoho API ${res.status}`);
    err.status = res.status;
    err.zoho = body;
    throw err;
  }
  return body;
}

/**
 * Create a request (draft) and optionally add signature field and submit.
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} requestName - Name of the request
 * @param {string} signerName - Recipient name
 * @param {string} signerEmail - Recipient email
 * @param {string} [organizationId] - Optional org for token scope
 * @returns {Promise<{ request_id: string, request_status: string }>}
 */
export async function sendDocumentForSignature(pdfBuffer, requestName, signerName, signerEmail, organizationId = null) {
  if (!isZohoConfigured() && !(await ZohoCredential.findOne({ organizationId: organizationId || null }))) {
    throw new Error('Zoho Sign is not configured.');
  }

  const form = new FormData();
  form.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'document.pdf');
  const data = {
    requests: {
      request_name: requestName || 'Document for signature',
      is_sequential: true,
      expiration_days: 30,
      email_reminders: true,
      reminder_period: 3,
      notes: 'Please sign this document.',
      actions: [
        {
          action_type: 'SIGN',
          recipient_name: signerName,
          recipient_email: signerEmail,
          signing_order: 0,
          verify_recipient: true,
          verification_type: 'EMAIL',
          private_notes: 'Please sign the document.',
        },
      ],
    },
  };
  form.append('data', JSON.stringify(data));

  const token = await getAccessToken(organizationId);
  const url = `${SIGN_API}/requests`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
    },
    body: form,
  });

  const responseBody = await res.json();
  if (responseBody.status === 'failure' || (responseBody.code !== undefined && responseBody.code !== 0)) {
    const err = new Error(responseBody.message || responseBody.error || 'Failed to create request');
    err.zoho = responseBody;
    throw err;
  }

  const req = responseBody.requests;
  const requestId = req.request_id;
  const documentId = req.document_ids?.[0]?.document_id;
  const actionId = req.actions?.[0]?.action_id;

  if (documentId && actionId) {
    try {
      await addSignatureField(requestId, documentId, actionId, signerName, signerEmail, organizationId);
    } catch (e) {
      console.warn('[zoho] Add signature field failed, submitting anyway:', e.message);
    }
  }

  try {
    const submitRes = await zohoRequest('POST', `/requests/${requestId}/submit`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, organizationId);
    const submitted = submitRes.requests || submitRes;
    return {
      request_id: submitted.request_id || requestId,
      request_status: submitted.request_status || 'sent',
    };
  } catch (e) {
    if (e.zoho?.message?.toLowerCase().includes('field')) {
      throw new Error('Zoho Sign requires at least one signature field. Please try again or check Zoho account settings.');
    }
    throw e;
  }
}

async function addSignatureField(requestId, documentId, actionId, recipientName, recipientEmail, organizationId) {
  const body = {
    requests: {
      request_name: 'Document for signature',
      actions: [
        {
          action_id: actionId,
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          action_type: 'SIGN',
          fields: {
            image_fields: [
              {
                field_name: 'Signature-1',
                field_label: 'Signature',
                field_type_name: 'Signature',
                document_id: documentId,
                action_id: actionId,
                is_mandatory: true,
                x_coord: 100,
                y_coord: 600,
                abs_width: 200,
                abs_height: 50,
                page_no: 0,
                is_resizable: true,
                is_draggable: true,
                description_tooltip: 'Sign here',
              },
            ],
          },
        },
      ],
    },
  };
  await zohoRequest('PUT', `/requests/${requestId}`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, organizationId);
}

/**
 * Get request status from Zoho.
 */
export async function getRequestStatus(requestId, organizationId = null) {
  const data = await zohoRequest('GET', `/requests/${requestId}`, {}, organizationId);
  const req = data.requests || data;
  const status = mapZohoStatus(req.request_status);
  const actions = req.actions || [];
  let actionStatus = 'pending';
  if (actions.length > 0) {
    const a = actions[0];
    if (a.action_status === 'SIGNED' || a.action_status === 'COMPLETED') actionStatus = 'signed';
    else if (a.action_status === 'VIEWED') actionStatus = 'viewed';
    else if (a.action_status === 'NOACTION' || a.action_status === 'UNOPENED') actionStatus = 'pending';
  }
  return {
    request_id: req.request_id,
    request_status: status,
    action_status: actionStatus,
    signer_email: actions[0]?.recipient_email,
    signer_name: actions[0]?.recipient_name,
    completed_time: req.completed_time,
  };
}

function mapZohoStatus(s) {
  if (!s) return 'sent';
  const lower = String(s).toLowerCase();
  if (lower === 'completed' || lower === 'done') return 'completed';
  if (lower === 'viewed') return 'viewed';
  if (lower === 'signed') return 'signed';
  if (lower === 'declined') return 'declined';
  if (lower === 'expired') return 'expired';
  if (lower === 'inprogress' || lower === 'in progress') return 'viewed';
  return 'sent';
}

/**
 * Download signed document PDF.
 */
export async function downloadSignedDocument(requestId, organizationId = null) {
  const token = await getAccessToken(organizationId);
  const url = `${SIGN_API}/requests/${requestId}/documents/pdf`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = {}; }
    const err = new Error(body.message || body.error || `Download failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.arrayBuffer();
}

export { isZohoConfigured };
