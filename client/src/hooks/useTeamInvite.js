import { useState } from 'react';
import { post, get, del } from '../api/service';
import { ENDPOINTS } from '../api/endpoints';

export function useTeamInvite() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function sendInvite({ email, role }) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await post(ENDPOINTS.TEAM_INVITE, { email, role });
      setSuccess(data.message);
      return { ok: true };
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Failed to send invitation.';
      setError(msg);
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }

  async function fetchMembers() {
    try {
      const { data } = await get(ENDPOINTS.TEAM_MEMBERS);
      return data.data ?? [];
    } catch {
      return [];
    }
  }

  async function removeMember(userId) {
    try {
      await del(ENDPOINTS.TEAM_MEMBER(userId));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message ?? 'Failed to remove member.' };
    }
  }

  return { sendInvite, fetchMembers, removeMember, loading, error, success };
}
