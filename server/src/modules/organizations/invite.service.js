import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Invite from './invite.model.js';
import User from '../users/user.model.js';
import Organization from './organization.model.js';
import Workspace from '../../models/Workspace.js';
import { enforceUserLimit } from '../../utils/planLimits.js';

const EXPIRE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SALT_ROUNDS = 10;

export async function createInvite({ organizationId, email, role, invitedBy }) {
  const emailNorm = email.trim().toLowerCase();

  // Prevent inviting existing org members
  const existing = await User.findOne({ email: emailNorm, organizationId });
  if (existing) {
    const err = new Error('User is already a member of this organization');
    err.status = 400;
    throw err;
  }

  // Plan limit: after this invite is accepted, member count would be current + 1
  const workspace = await Workspace.findOne({ organizationId });
  if (workspace) {
    const memberCount = await User.countDocuments({ organizationId });
    enforceUserLimit(workspace, memberCount + 1);
  }

  // Upsert: replace any pending invite for the same email+org
  const token = crypto.randomBytes(32).toString('hex');
  await Invite.findOneAndDelete({ organizationId, email: emailNorm, acceptedAt: null });
  const invite = await Invite.create({
    organizationId,
    email: emailNorm,
    role: role || 'Creator',
    token,
    invitedBy,
    expiresAt: new Date(Date.now() + EXPIRE_MS),
  });

  // TODO: Send invite email with link: WEB_ORIGIN/accept-invite?token=<token>
  return {
    id: invite._id.toString(),
    email: invite.email,
    role: invite.role,
    token, // included in dev so it can be tested without email
    expiresAt: invite.expiresAt,
  };
}

export async function listInvites(organizationId) {
  const invites = await Invite.find({ organizationId, acceptedAt: null }).lean();
  return invites.map((i) => ({
    id: i._id.toString(),
    email: i.email,
    role: i.role,
    expiresAt: i.expiresAt,
    createdAt: i.createdAt,
  }));
}

export async function acceptInvite({ token, name, password }) {
  const invite = await Invite.findOne({ token, acceptedAt: null });
  if (!invite || invite.expiresAt < new Date()) {
    const err = new Error('Invalid or expired invite token');
    err.status = 400;
    throw err;
  }

  const org = await Organization.findById(invite.organizationId);
  if (!org) {
    const err = new Error('Organization not found');
    err.status = 400;
    throw err;
  }

  // Check if email is already registered globally — if so, just add to org
  let user = await User.findOne({ email: invite.email });
  if (user) {
    if (user.organizationId.toString() === invite.organizationId.toString()) {
      const err = new Error('Already a member of this organization');
      err.status = 400;
      throw err;
    }
    // For now: one org per user — cannot join a second org
    const err = new Error('This email is already registered under another organization');
    err.status = 400;
    throw err;
  }

  if (!name || !password) {
    const err = new Error('Name and password are required');
    err.status = 400;
    throw err;
  }

  // Plan limit: adding one member
  const workspace = await Workspace.findOne({ organizationId: invite.organizationId });
  if (workspace) {
    const memberCount = await User.countDocuments({ organizationId: invite.organizationId });
    enforceUserLimit(workspace, memberCount + 1);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  user = await User.create({
    email: invite.email,
    passwordHash,
    name: name.trim(),
    organizationId: invite.organizationId,
    role: invite.role,
  });

  invite.acceptedAt = new Date();
  await invite.save();

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    organization: { id: org._id.toString(), name: org.name, slug: org.slug },
  };
}
