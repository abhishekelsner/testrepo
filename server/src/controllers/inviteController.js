import User from '../modules/users/user.model.js';
import Organization from '../modules/organizations/organization.model.js';
import { generateTempPassword, generateInviteToken, hashPassword, validateInviteRole } from '../utils/inviteHelpers.js';
import { inviteEmailTemplate } from '../utils/emailTemplates.js';
import { sendMail, WEB_ORIGIN } from '../config/email.js';

/**
 * POST /api/team/invite — invite a team member by email and role.
 * Creates user with pending status, temp password, sends email. Idempotent for pending users (resend).
 */
export async function inviteTeamMember(req, res) {
  try {
    const { email, role } = req.body;
    const inviter = req.user;
    const organizationId = inviter.organizationId;

    if (!email || !role) {
      return res.status(400).json({ success: false, message: 'Email and role are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }
    if (!validateInviteRole(role)) {
      return res.status(400).json({ success: false, message: "Role must be 'Admin' or 'Creator'." });
    }

    const ALLOWED_ROLES = ['Admin', 'Super_Admin'];
    if (!ALLOWED_ROLES.includes(inviter.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to invite users.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim(), organizationId });

    if (existingUser) {
      if (existingUser.inviteStatus === 'accepted') {
        return res.status(409).json({ success: false, message: 'This user is already an active member of your team.' });
      }
      if (existingUser.inviteStatus === 'pending') {
        return await resendInvite(existingUser, inviter, res);
      }
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);
    const { hashedToken } = await generateInviteToken();

    const inviteTokenExpiry = new Date();
    inviteTokenExpiry.setHours(inviteTokenExpiry.getHours() + 72);

    const newUser = await User.create({
      name: email.split('@')[0] || 'Invited User',
      email: email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      role,
      organizationId,
      emailVerified: true,
      inviteStatus: 'pending',
      mustChangePassword: true,
      inviteToken: hashedToken,
      inviteTokenExpiry,
      invitedBy: inviter._id,
      invitedAt: new Date(),
    });

    const org = await Organization.findById(organizationId).lean();
    const orgName = org?.name ?? 'Your Team';
    const loginUrl = `${WEB_ORIGIN}/login`;

    await sendMail({
      to: email,
      subject: `You're invited to join ${orgName}`,
      html: inviteEmailTemplate({
        inviteeName: email.split('@')[0],
        inviterName: inviter.name ?? inviter.email,
        orgName,
        role,
        email,
        tempPassword,
        loginUrl,
      }),
    });

    return res.status(201).json({
      success: true,
      message: `Invitation sent to ${email}.`,
      data: {
        userId: newUser._id.toString(),
        email: newUser.email,
        role: newUser.role,
        inviteStatus: newUser.inviteStatus,
      },
    });
  } catch (err) {
    console.error('[inviteTeamMember]', err);
    return res.status(500).json({ success: false, message: 'Failed to send invitation. Please try again.' });
  }
}

async function resendInvite(user, inviter, res) {
  try {
    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);
    const { hashedToken } = await generateInviteToken();
    const inviteTokenExpiry = new Date();
    inviteTokenExpiry.setHours(inviteTokenExpiry.getHours() + 72);

    user.passwordHash = hashedPassword;
    user.inviteToken = hashedToken;
    user.inviteTokenExpiry = inviteTokenExpiry;
    user.mustChangePassword = true;
    user.invitedAt = new Date();
    user.invitedBy = inviter._id;
    await user.save();

    const org = await Organization.findById(user.organizationId).lean();
    const orgName = org?.name ?? 'Your Team';

    await sendMail({
      to: user.email,
      subject: `Reminder: You're invited to join ${orgName}`,
      html: inviteEmailTemplate({
        inviteeName: user.email.split('@')[0],
        inviterName: inviter.name ?? inviter.email,
        orgName,
        role: user.role,
        email: user.email,
        tempPassword,
        loginUrl: `${WEB_ORIGIN}/login`,
      }),
    });

    return res.status(200).json({
      success: true,
      message: `Invitation resent to ${user.email}.`,
    });
  } catch (err) {
    console.error('[resendInvite]', err);
    return res.status(500).json({ success: false, message: 'Failed to resend invitation.' });
  }
}

/**
 * GET /api/team/members — list members of the current org (any authenticated org member).
 */
export async function getTeamMembers(req, res) {
  try {
    const { organizationId } = req.user;
    const members = await User.find({ organizationId })
      .select('name email role inviteStatus invitedAt mustChangePassword createdAt')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: members.map((m) => ({
        ...m,
        id: m._id.toString(),
        invitedBy: m.invitedBy
          ? { id: m.invitedBy._id?.toString(), name: m.invitedBy.name, email: m.invitedBy.email }
          : null,
      })),
    });
  } catch (err) {
    console.error('[getTeamMembers]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch team members.' });
  }
}

/**
 * DELETE /api/team/members/:userId — remove a member (Admin/Super_Admin only).
 */
export async function removeTeamMember(req, res) {
  try {
    const { userId } = req.params;
    const { organizationId, _id: requesterId, role: requesterRole } = req.user;

    if (!['Admin', 'Super_Admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    if (userId === requesterId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot remove yourself.' });
    }

    const target = await User.findOne({ _id: userId, organizationId });
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found in your organization.' });
    }
    if (target.role === 'Super_Admin') {
      return res.status(403).json({ success: false, message: 'Super_Admin cannot be removed.' });
    }

    await User.deleteOne({ _id: userId });
    return res.json({ success: true, message: 'Team member removed.' });
  } catch (err) {
    console.error('[removeTeamMember]', err);
    return res.status(500).json({ success: false, message: 'Failed to remove team member.' });
  }
}
