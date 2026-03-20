import Payment from './payment.model.js';

/**
 * Get payments for a proposal.
 */
export async function getPaymentsByProposalId(proposalId) {
  return Payment.find({ proposalId }).sort({ createdAt: -1 }).lean();
}

/**
 * Get payments for an organization.
 */
export async function getPaymentsByOrganization(organizationId, query = {}) {
  const filter = { organizationId };
  if (query.proposalId) filter.proposalId = query.proposalId;
  if (query.status) filter.status = query.status;
  return Payment.find(filter).sort({ createdAt: -1 }).lean();
}
