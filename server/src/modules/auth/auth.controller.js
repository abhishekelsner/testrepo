import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../users/user.model.js';
import * as forgotPasswordService from './forgotPassword.service.js';
import { sendMail, getResetPasswordLink } from '../../config/email.js';

const SALT_ROUNDS = 10;

export async function forgotPassword(email) {
  const user = await User.findOne({ email: email?.trim().toLowerCase() });
  if (!user) {
    return; // Do not reveal whether email exists
  }
  const token = crypto.randomBytes(32).toString('hex');
  forgotPasswordService.setResetToken(user.email, token);

  const resetUrl = getResetPasswordLink(token);
  try {
    await sendMail({
      to: user.email,
      subject: 'Reset your ElsnerQwilr password',
      html: `
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your password. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>
        <p>— ElsnerQwilr</p>
      `,
    });
  } catch (err) {
    console.error('[auth] Reset password email send failed:', err.message);
  }

  return { token };
}

export async function resetPassword(token, newPassword) {
  const email = forgotPasswordService.getResetToken(token);
  if (!email) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const err = new Error('User not found');
    err.status = 400;
    throw err;
  }
  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
  forgotPasswordService.invalidateResetToken(token);
}
