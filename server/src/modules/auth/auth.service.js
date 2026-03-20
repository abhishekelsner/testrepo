import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../users/user.model.js';
import Organization from '../organizations/organization.model.js';
import * as emailVerificationService from './emailVerification.service.js';
import { sendMail, getVerificationLink } from '../../config/email.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_EXPIRY = '4h';
const REFRESH_EXPIRY = '7d';
const SALT_ROUNDS = 10;

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function register({ email, password, name, organizationName }) {
  const emailNorm = email?.trim().toLowerCase();
  const existing = await User.findOne({ email: emailNorm }).catch(() => null);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 400;
    throw err;
  }

  const slug = slugify(organizationName || name) + '-' + Date.now().toString(36);
  const org = await Organization.create({ name: organizationName || name, slug });

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    email: emailNorm,
    passwordHash,
    name,
    organizationId: org._id,
    role: 'Admin',
  });

  // Generate email verification token (no JWT until email is verified)
  const verifyToken = crypto.randomBytes(32).toString('hex');
  emailVerificationService.setVerificationToken(emailNorm, verifyToken);

  const verifyUrl = getVerificationLink(verifyToken);
  try {
    await sendMail({
      to: emailNorm,
      subject: 'Verify your ElsnerQwilr email',
      html: `
        <p>Hi ${name},</p>
        <p>Thanks for signing up. Please verify your email by clicking the link below:</p>
        <p><a href="${verifyUrl}">Verify my email</a></p>
        <p>If you didn't create an account, you can ignore this email.</p>
        <p>— ElsnerQwilr</p>
      `,
    });
  } catch (err) {
    console.error('[auth] Verification email send failed:', err.message);
    // Still return success; in dev they can use verifyToken from response
  }

  const response = {
    user: toUserResponse(user, org),
    message: 'Verification email sent. Check your inbox and click the link to verify, then sign in.',
  };
  if (process.env.NODE_ENV !== 'production') {
    response.verifyToken = verifyToken; // dev only: use /verify-email?token=<this> to verify without email
  }
  return response;
}

export async function login({ email, password, skipEmailVerification = false }) {
  const emailNorm = email?.trim().toLowerCase();
  const user = await User.findOne({ email: emailNorm }).populate('organizationId');
  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.loginFailed = true;
    err.email = emailNorm;
    throw err;
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.loginFailed = true;
    err.email = emailNorm;
    throw err;
  }

  if (!skipEmailVerification && !user.emailVerified) {
    const isSuperAdmin = String(user.role || '').toLowerCase() === 'super_admin';
    if (!isSuperAdmin) {
      const err = new Error('Please verify your email before signing in. Check your inbox for the verification link.');
      err.status = 403;
      err.code = 'EMAIL_NOT_VERIFIED';
      throw err;
    }
  }

  const org = user.organizationId;
  const accessToken = jwt.sign(
    { userId: user._id.toString(), organizationId: org._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { userId: user._id.toString() },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );

  return {
    user: toUserResponse(user, org),
    token: accessToken,
    refreshToken,
  };
}

/**
 * Admin dashboard login: POST /api/auth/admin/login
 * No email verification required. Only users with role Super_Admin can use this route.
 */
export async function loginAdminDashboard({ email, password }) {
  const emailNorm = email?.trim().toLowerCase();
  const user = await User.findOne({ email: emailNorm }).populate('organizationId');
  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.loginFailed = true;
    err.email = emailNorm;
    throw err;
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.loginFailed = true;
    err.email = emailNorm;
    throw err;
  }

  const isSuperAdmin = String(user.role || '').toLowerCase() === 'super_admin';
  if (!isSuperAdmin) {
    const err = new Error('Only Super Admin can sign in here. Use the main app for other roles.');
    err.status = 403;
    err.code = 'ADMIN_ONLY';
    throw err;
  }

  const org = user.organizationId;
  const accessToken = jwt.sign(
    { userId: user._id.toString(), organizationId: org._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { userId: user._id.toString() },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );

  return {
    user: toUserResponse(user, org),
    token: accessToken,
    refreshToken,
  };
}

export async function loginWithGoogle(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const err = new Error('Google Sign-In is not configured. Set GOOGLE_CLIENT_ID on the server.');
    err.status = 503;
    throw err;
  }
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  const email = (payload.email || '').trim().toLowerCase();
  const name = payload.name || payload.email || 'User';
  const googleId = payload.sub;
  if (!email) {
    const err = new Error('Google account has no email.');
    err.status = 400;
    throw err;
  }
  let user = await User.findOne({ email }).populate('organizationId');
  if (!user) {
    const slug = slugify(name) + '-' + Date.now().toString(36);
    const org = await Organization.create({ name: name.trim(), slug });
    const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);
    user = await User.create({
      email,
      passwordHash: placeholderHash,
      name: name.trim(),
      organizationId: org._id,
      role: 'Admin',
      emailVerified: true,
      googleId,
    });
    await user.populate('organizationId');
  } else {
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
  }
  const org = user.organizationId;
  const accessToken = jwt.sign(
    { userId: user._id.toString(), organizationId: org._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { userId: user._id.toString() },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
  return {
    user: toUserResponse(user, org),
    token: accessToken,
    refreshToken,
  };
}

export async function getMe(userId) {
  const user = await User.findById(userId).populate('organizationId');
  if (!user) return null;
  const org = user.organizationId;
  const permissions = getPermissionsForRole(user.role);
  return {
    ...toUserResponse(user, org),
    permissions,
  };
}

export async function updateProfile(userId, { name, email }) {
  const user = await User.findById(userId).populate('organizationId');
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  if (typeof name === 'string' && name.trim()) {
    user.name = name.trim();
  }
  if (typeof email === 'string' && email.trim()) {
    const emailNorm = email.trim().toLowerCase();
    if (emailNorm !== user.email) {
      const existing = await User.findOne({ organizationId: user.organizationId, email: emailNorm });
      if (existing) {
        const err = new Error('Email already in use in this organization');
        err.status = 400;
        throw err;
      }
      user.email = emailNorm;
    }
  }
  await user.save();
  return toUserResponse(user, user.organizationId);
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  if (!user.passwordHash) {
    const err = new Error('Account uses social login; set password via reset flow');
    err.status = 400;
    throw err;
  }
  const valid = await user.comparePassword(currentPassword);
  if (!valid) {
    const err = new Error('Current password is incorrect');
    err.status = 400;
    throw err;
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    const err = new Error('New password must be at least 6 characters');
    err.status = 400;
    throw err;
  }
  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.mustChangePassword = false;
  user.inviteStatus = 'accepted';
  user.inviteToken = null;
  user.inviteTokenExpiry = null;
  await user.save();
  return { message: 'Password updated successfully' };
}

export async function refreshAccessToken(refreshToken) {
  const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  const user = await User.findById(payload.userId).populate('organizationId');
  if (!user) {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
  }
  const org = user.organizationId;
  const accessToken = jwt.sign(
    { userId: user._id.toString(), organizationId: org._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
  return {
    user: toUserResponse(user, org),
    token: accessToken,
  };
}

export async function verifyEmail(token) {
  const email = emailVerificationService.getVerificationToken(token);
  if (!email) {
    const err = new Error('Invalid or expired verification token');
    err.status = 400;
    throw err;
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const err = new Error('User not found');
    err.status = 400;
    throw err;
  }
  if (user.emailVerified) {
    emailVerificationService.invalidateVerificationToken(token);
    return toUserResponse(user, null); // already verified
  }
  user.emailVerified = true;
  await user.save();
  emailVerificationService.invalidateVerificationToken(token);
  return { id: user._id.toString(), email: user.email, emailVerified: true };
}

function toUserResponse(user, org) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
    mustChangePassword: user.mustChangePassword ?? false,
    organization: org
      ? {
          id: org._id.toString(),
          name: org.name,
          slug: org.slug,
        }
      : null,
  };
}

function getPermissionsForRole(role) {
  const map = {
    Admin: ['template_edit', 'send_agreements', 'view_analytics', 'branding', 'billing', 'admin'],
    Creator: ['template_edit', 'send_agreements', 'view_analytics'],
    Super_Admin: ['template_edit', 'send_agreements', 'view_analytics', 'branding', 'billing', 'admin', 'super_admin_dashboard'],
  };
  return map[role] || [];
}
