/**
 * Zoho Sign: send document, status, download, webhook.
 */
import Contract from '../models/Contract.js';
import * as zohoService from '../services/zohoService.js';

/**
 * POST /api/zoho/send-document
 * Body: { documentBase64, requestName?, signerName, signerEmail, templateId?, proposalId? }
 */
export async function sendDocument(req, res) {
  try {
    const { documentBase64, requestName, signerName, signerEmail, templateId, proposalId } = req.body;
    const userId = req.userId;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization context required.' });
    }
    if (!signerName || !signerEmail) {
      return res.status(400).json({ success: false, message: 'Signer name and email are required.' });
    }
    if (!documentBase64 || typeof documentBase64 !== 'string') {
      return res.status(400).json({ success: false, message: 'Document (base64) is required.' });
    }

    let buffer;
    try {
      buffer = Buffer.from(documentBase64, 'base64');
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid document base64.' });
    }
    if (buffer.length === 0) {
      return res.status(400).json({ success: false, message: 'Document is empty.' });
    }

    const result = await zohoService.sendDocumentForSignature(
      buffer,
      requestName || 'Document for signature',
      signerName.trim(),
      signerEmail.trim().toLowerCase(),
      organizationId
    );

    await Contract.create({
      userId,
      organizationId,
      templateId: templateId || null,
      proposalId: proposalId || null,
      zoho_request_id: result.request_id,
      request_name: requestName || 'Document for signature',
      signer_name: signerName.trim(),
      signer_email: signerEmail.trim().toLowerCase(),
      status: result.request_status === 'sent' ? 'sent' : result.request_status,
    });

    return res.status(201).json({
      success: true,
      message: 'Document sent for signature.',
      data: { request_id: result.request_id },
    });
  } catch (err) {
    console.error('[zoho sendDocument]', err);
    const message = err.message || 'Failed to send document for signature.';
    return res.status(err.status === 401 ? 401 : 500).json({ success: false, message });
  }
}

/**
 * GET /api/zoho/status/:requestId
 */
export async function getStatus(req, res) {
  try {
    const { requestId } = req.params;
    const organizationId = req.organizationId;

    const contract = await Contract.findOne({ zoho_request_id: requestId, organizationId });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found.' });
    }

    const status = await zohoService.getRequestStatus(requestId, organizationId);

    contract.status = status.request_status;
    if (status.request_status === 'completed') {
      contract.completed_at = new Date();
    }
    await contract.save();

    return res.json({
      success: true,
      data: {
        request_id: status.request_id,
        status: status.request_status,
        action_status: status.action_status,
        signer_email: status.signer_email,
        signer_name: status.signer_name,
        completed_time: status.completed_time,
      },
    });
  } catch (err) {
    console.error('[zoho getStatus]', err);
    return res.status(err.status === 404 ? 404 : 500).json({
      success: false,
      message: err.message || 'Failed to fetch status.',
    });
  }
}

/**
 * GET /api/zoho/download/:requestId
 */
export async function downloadDocument(req, res) {
  try {
    const { requestId } = req.params;
    const organizationId = req.organizationId;

    const contract = await Contract.findOne({ zoho_request_id: requestId, organizationId });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found.' });
    }

    const pdfBuffer = await zohoService.downloadSignedDocument(requestId, organizationId);
    const buffer = Buffer.from(pdfBuffer);

    if (contract.status !== 'completed') {
      contract.status = 'completed';
      contract.completed_at = new Date();
      await contract.save();
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="signed-${requestId}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    console.error('[zoho download]', err);
    return res.status(err.status === 404 ? 404 : 500).json({
      success: false,
      message: err.message || 'Failed to download document.',
    });
  }
}

/**
 * GET /api/zoho/contracts — list contracts for the organization.
 */
export async function listContracts(req, res) {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return res.json({ success: true, data: [] });
    }
    const contracts = await Contract.find({ organizationId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: contracts.map((c) => ({
        id: c._id.toString(),
        zoho_request_id: c.zoho_request_id,
        request_name: c.request_name,
        signer_name: c.signer_name,
        signer_email: c.signer_email,
        status: c.status,
        templateId: c.templateId?.toString(),
        proposalId: c.proposalId?.toString(),
        completed_at: c.completed_at,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error('[zoho listContracts]', err);
    return res.status(500).json({ success: false, message: 'Failed to list contracts.' });
  }
}

/**
 * POST /api/zoho/webhook — Zoho Sign webhook (document_sent, document_viewed, document_signed, document_completed).
 * Register in app with express.raw({ type: 'application/json' }) so req.body is a Buffer.
 */
export async function handleWebhook(req, res) {
  try {
    const rawBody = req.body;
    let payload;
    if (Buffer.isBuffer(rawBody)) {
      payload = JSON.parse(rawBody.toString('utf8'));
    } else if (typeof rawBody === 'string') {
      payload = JSON.parse(rawBody);
    } else {
      payload = rawBody;
    }

    const requestId = payload.request_id ?? payload.request?.request_id ?? payload.data?.request_id;
    const event = payload.event ?? payload.event_type ?? payload.type ?? payload.action;

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Missing request_id.' });
    }

    const statusMap = {
      document_sent: 'sent',
      document_viewed: 'viewed',
      document_signed: 'signed',
      document_completed: 'completed',
      request_sent: 'sent',
      request_viewed: 'viewed',
      request_signed: 'signed',
      request_completed: 'completed',
      completed: 'completed',
      signed: 'signed',
      viewed: 'viewed',
      sent: 'sent',
    };
    const status = statusMap[event] || 'sent';

    const contract = await Contract.findOneAndUpdate(
      { zoho_request_id: requestId },
      {
        status,
        ...(status === 'completed' ? { completed_at: new Date() } : {}),
      },
      { new: true }
    );

    if (!contract) {
      return res.status(200).json({ success: true, message: 'Contract not found; event logged.' });
    }

    return res.status(200).json({ success: true, message: 'Webhook processed.' });
  } catch (err) {
    console.error('[zoho webhook]', err);
    return res.status(500).json({ success: false, message: 'Webhook processing failed.' });
  }
}
