import { Router } from 'express';
import * as authService from './auth.service.js';
import * as authController from './auth.controller.js';
import { authenticate } from './auth.middleware.js';
import { logEvent } from './audit.service.js';
import * as inviteService from '../organizations/invite.service.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, organizationName } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const result = await authService.register({
      email: email.trim(),
      password,
      name: name.trim(),
      organizationName: organizationName?.trim(),
    });
    logEvent({ event: 'register', userId: result.user.id, organizationId: result.user.organization?.id, email: result.user.email, req });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    let result;
    try {
      result = await authService.login({ email: email.trim(), password });
    } catch (loginErr) {
      if (loginErr.loginFailed) {
        logEvent({ event: 'login_failed', email: loginErr.email, req, metadata: { reason: loginErr.message } });
      }
      throw loginErr;
    }
    logEvent({ event: 'login', userId: result.user.id, organizationId: result.user.organization?.id, email: result.user.email, req });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/admin/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    let result;
    try {
      result = await authService.loginAdminDashboard({ email: email.trim(), password });
    } catch (loginErr) {
      if (loginErr.loginFailed) {
        logEvent({ event: 'login_failed', email: loginErr.email, req, metadata: { reason: loginErr.message } });
      }
      throw loginErr;
    }
    logEvent({ event: 'login', userId: result.user.id, organizationId: result.user.organization?.id, email: result.user.email, req, metadata: { adminDashboard: true } });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/google', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Google token is required' });
    }
    const result = await authService.loginWithGoogle(token);
    logEvent({ event: 'login', userId: result.user.id, organizationId: result.user.organization?.id, email: result.user.email, req, metadata: { provider: 'google' } });
    res.json(result);
  } catch (err) {
    const status = err.status || 401;
    if (status === 503) return res.status(503).json({ error: err.message });
    if (status === 400) return res.status(400).json({ error: err.message });
    if (status === 401) return res.status(401).json({ error: 'Invalid Google token.' });
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const me = await authService.getMe(req.userId);
    if (!me) return res.status(404).json({ error: 'User not found' });
    res.json(me);
  } catch (err) {
    next(err);
  }
});

router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const me = await authService.updateProfile(req.userId, { name, email });
    res.json(me);
  } catch (err) {
    next(err);
  }
});

router.post('/me/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    await authService.changePassword(req.userId, currentPassword, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, async (req, res) => {
  logEvent({ event: 'logout', userId: req.userId, organizationId: req.organizationId, email: req.user?.email, req });
  // Stateless JWT: client drops tokens. For Redis refresh token invalidation, delete token here.
  res.json({ message: 'Logged out successfully' });
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }
    const result = await authService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const result = await authController.forgotPassword(email);
    if (result) {
      logEvent({ event: 'forgot_password', email: email.trim().toLowerCase(), req });
    }
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and newPassword are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    await authController.resetPassword(token, newPassword);
    logEvent({ event: 'password_reset', req });
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });
    const result = await authService.verifyEmail(token);
    logEvent({ event: 'email_verified', email: result.email, req });
    res.json({ message: 'Email verified successfully', user: result });
  } catch (err) {
    next(err);
  }
});

router.post('/accept-invite', async (req, res, next) => {
  try {
    const { token, name, password } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });
    if (!name || !password) return res.status(400).json({ error: 'name and password are required' });
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const user = await inviteService.acceptInvite({ token, name, password });
    logEvent({ event: 'invite_accepted', email: user.email, organizationId: user.organization?.id, req });
    res.status(201).json({ message: 'Invite accepted. Account created.', user });
  } catch (err) {
    next(err);
  }
});

export default router;
