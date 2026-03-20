/**
 * Zoho Sign API routes.
 */
import { Router } from 'express';
import {
  sendDocument,
  getStatus,
  downloadDocument,
  listContracts,
  handleWebhook,
} from '../controllers/zohoController.js';

const router = Router();

router.post('/send-document', sendDocument);
router.get('/status/:requestId', getStatus);
router.get('/download/:requestId', downloadDocument);
router.get('/contracts', listContracts);

export default router;

export { handleWebhook };
