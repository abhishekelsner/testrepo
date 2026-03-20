import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../../api/service';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import './auth.css';

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (next.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await post(ENDPOINTS.AUTH_CHANGE_PASSWORD, {
        currentPassword: current,
        newPassword: next,
      });
      setUser(user ? { ...user, mustChangePassword: false } : user);
      const slug = user?.organization?.slug;
      navigate(slug ? `/${slug}/dashboard` : '/');
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.message ?? 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="change-password-page">
      <div className="change-password-card">
        <div className="change-password-header">
          <h1 className="change-password-title">Set Your Password</h1>
          <p className="change-password-desc">
            You&apos;re using a temporary password. Please set a permanent one to continue.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="change-password-form">
          {[
            ['Current (Temporary) Password', current, setCurrent, 'current-password'],
            ['New Password', next, setNext, 'new-password'],
            ['Confirm New Password', confirm, setConfirm, 'new-password'],
          ].map(([label, val, setter, autoComplete]) => (
            <div key={label} className="change-password-field">
              <label className="change-password-label" htmlFor={label.replace(/\s/g, '-')}>
                {label}
              </label>
              <input
                id={label.replace(/\s/g, '-')}
                type="password"
                autoComplete={autoComplete}
                value={val}
                onChange={(e) => setter(e.target.value)}
                required
                className="change-password-input"
              />
            </div>
          ))}
          {error && (
            <div className="change-password-error" role="alert">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="change-password-btn"
          >
            {loading ? 'Saving…' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
