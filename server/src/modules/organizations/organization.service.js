import User from '../users/user.model.js';
import Organization from './organization.model.js';

export async function getCurrent(organizationId) {
  const org = await Organization.findById(organizationId).lean();
  if (!org) return null;
  return {
    id: org._id.toString(),
    name: org.name,
    slug: org.slug,
    website: org.website || '',
    defaultSharing: org.defaultSharing || 'private',
    creatorInvitePermission: org.creatorInvitePermission || 'any',
    aiFeaturesEnabled: org.aiFeaturesEnabled !== false,
    security: {
      loginProviders: org.security?.loginProviders?.length ? org.security.loginProviders : ['google', 'email'],
      allowAdminEmailLogin: org.security?.allowAdminEmailLogin === true,
    },
    branding: org.branding,
    analyticsSettings: {
      timezone: org.analyticsSettings?.timezone || 'Etc/UTC',
      currency: org.analyticsSettings?.currency || 'USD',
      engagementEnabled: org.analyticsSettings?.engagementEnabled === true,
      savedFilters: org.analyticsSettings?.savedFilters?.length
        ? org.analyticsSettings.savedFilters
        : [{ name: 'Proposals', createdBy: 'QWILR' }],
      enableLastEdited: org.analyticsSettings?.enableLastEdited === true,
    },
    subscription: org.subscription,
    customDomain: org.customDomain,
  };
}

export async function updateCurrent(organizationId, updates) {
  const org = await Organization.findById(organizationId);
  if (!org) return null;
  const allowed = ['name', 'website', 'defaultSharing', 'creatorInvitePermission', 'aiFeaturesEnabled', 'security', 'branding', 'analyticsSettings'];
  for (const key of allowed) {
    if (updates[key] === undefined) continue;
    if (key === 'aiFeaturesEnabled') {
      org[key] = !!updates[key];
    } else if (key === 'security') {
      const s = updates.security;
      if (s && typeof s === 'object') {
        if (!org.security) org.security = {};
        if (Array.isArray(s.loginProviders)) org.security.loginProviders = s.loginProviders;
        if (typeof s.allowAdminEmailLogin === 'boolean') org.security.allowAdminEmailLogin = s.allowAdminEmailLogin;
        org.markModified('security');
      }
    } else if (key === 'branding') {
      const b = updates.branding;
      if (b && typeof b === 'object') {
        if (!org.branding) org.branding = {};
        if (Array.isArray(b.colors)) org.branding.colors = b.colors;
        if (b.fonts && typeof b.fonts === 'object') org.branding.fonts = b.fonts;
        if (typeof b.sameFont === 'boolean') org.branding.sameFont = b.sameFont;
        if (b.logo !== undefined) org.branding.logo = b.logo;
        if (b.primaryColor !== undefined) org.branding.primaryColor = b.primaryColor;
        if (typeof b.agreementTemplate === 'string') org.branding.agreementTemplate = b.agreementTemplate;
        org.markModified('branding');
      }
    } else if (key === 'analyticsSettings') {
      const a = updates.analyticsSettings;
      if (a && typeof a === 'object') {
        if (!org.analyticsSettings) org.analyticsSettings = {};
        if (a.timezone !== undefined) org.analyticsSettings.timezone = a.timezone;
        if (a.currency !== undefined) org.analyticsSettings.currency = a.currency;
        if (typeof a.engagementEnabled === 'boolean') org.analyticsSettings.engagementEnabled = a.engagementEnabled;
        if (Array.isArray(a.savedFilters)) org.analyticsSettings.savedFilters = a.savedFilters;
        if (typeof a.enableLastEdited === 'boolean') org.analyticsSettings.enableLastEdited = a.enableLastEdited;
        org.markModified('analyticsSettings');
      }
    } else {
      org[key] = updates[key];
    }
  }
  await org.save();
  return getCurrent(organizationId);
}

export async function getMembers(organizationId) {
  const users = await User.find({ organizationId })
    .select('email name role createdAt')
    .lean();
  return users.map((u) => ({
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
  }));
}

export async function updateMemberRole(organizationId, userId, newRole, requestedByUser) {
  if (requestedByUser.role !== 'Admin') {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  const user = await User.findOne({ _id: userId, organizationId });
  if (!user) {
    const err = new Error('Member not found');
    err.status = 404;
    throw err;
  }
  const validRoles = ['Admin', 'Creator'];
  if (!validRoles.includes(newRole)) {
    const err = new Error('Invalid role');
    err.status = 400;
    throw err;
  }
  user.role = newRole;
  await user.save();
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
