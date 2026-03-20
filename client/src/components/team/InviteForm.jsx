import { useState } from 'react';
import { useTeamInvite } from '../../hooks/useTeamInvite';
import './InviteForm.css';

const ROLES = ['Admin', 'Creator'];

export default function InviteForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Creator');
  const { sendInvite, loading, error, success } = useTeamInvite();

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await sendInvite({ email, role });
    if (result.ok) {
      setEmail('');
      setRole('Creator');
      onSuccess?.();
    }
  }

  return (
    <div className="invite-team-card">
      <div className="invite-team-header">
        <h3 className="invite-team-title">Invite Team Member</h3>
        <p className="invite-team-desc">
          They&apos;ll receive an email with a temporary password to join your workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="invite-team-form">
        <div className="invite-team-input-wrap">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="invite-team-input"
            autoComplete="email"
          />
        </div>
        <div className="invite-team-select-wrap">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="invite-team-select"
            aria-label="Role"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="invite-team-btn"
        >
          {loading ? 'Sending…' : 'Send Invite'}
        </button>
      </form>

      {success && (
        <div className="invite-team-feedback success" role="status">
          {success}
        </div>
      )}
      {error && (
        <div className="invite-team-feedback error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
