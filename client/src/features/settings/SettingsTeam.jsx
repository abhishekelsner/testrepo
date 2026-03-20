/**
 * Settings → Team — member list, invite (admins), invite status.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Table, Spin, Alert } from 'antd';
import { TeamOutlined, UserOutlined } from '@ant-design/icons';
import InviteForm from '../../components/team/InviteForm';
import { get, ENDPOINTS } from '../../api';
import { useAuthStore } from '../../store/authStore';
import './SettingsPages.css';

const ADMIN_ROLES = ['Admin', 'Super_Admin'];

function SettingsTeam() {
  const { orgSlug } = useParams();
  const user = useAuthStore((s) => s.user);
  const canInvite = user?.role && ADMIN_ROLES.includes(user.role);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMembers = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data: body } = await get(ENDPOINTS.TEAM_MEMBERS);
      const list = Array.isArray(body?.data) ? body.data : [];
      setMembers(list);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Could not load team members.';
      setError(msg);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const activeCount = members.filter((m) => m.inviteStatus !== 'pending').length;
  const pendingCount = members.filter((m) => m.inviteStatus === 'pending').length;

  return (
    <div className="settings-page">
      <div className="settings-page-block settings-summary-card">
        <div className="settings-summary-icon">
          <TeamOutlined />
        </div>
        <h2 className="settings-page-block-title">SUMMARY</h2>
        <p className="settings-page-subtitle">
          <strong>{members.length}</strong> {members.length === 1 ? 'person' : 'people'} on this account
          {pendingCount > 0 && (
            <>
              {' '}
              ({activeCount} active, {pendingCount} pending invite{pendingCount !== 1 ? 's' : ''})
            </>
          )}
          .
        </p>
        <Link to={`/${orgSlug}/settings/subscription`}>
          <Button type="primary" className="settings-page-btn-primary">
            EXPLORE PLANS
          </Button>
        </Link>
      </div>

      {canInvite && (
        <div className="settings-page-block">
          <InviteForm onSuccess={loadMembers} />
        </div>
      )}

      <div className="settings-page-block">
        <h2 className="settings-page-block-title">Account Invite Requests</h2>
        <p className="settings-page-subtitle">
          Pending invitations appear in the table below with status &quot;Pending&quot;.
        </p>
      </div>

      <div className="settings-page-block">
        <h2 className="settings-page-block-title">Everyone on the account</h2>
        <p className="settings-page-subtitle">Team members and their roles.</p>

        {error && (
          <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            dataSource={members}
            rowKey="id"
            pagination={false}
            size="small"
            locale={{ emptyText: 'No team members found.' }}
            columns={[
              {
                title: 'Name',
                key: 'name',
                render: (_, row) => (
                  <span>
                    <UserOutlined style={{ marginRight: 8, color: '#888' }} />
                    {row.name || '—'}
                  </span>
                ),
              },
              {
                title: 'Email',
                dataIndex: 'email',
                key: 'email',
                ellipsis: true,
              },
              {
                title: 'Role',
                dataIndex: 'role',
                key: 'role',
                width: 120,
              },
              {
                title: 'Status',
                dataIndex: 'inviteStatus',
                key: 'inviteStatus',
                width: 110,
                render: (status) =>
                  status === 'pending' ? (
                    <span style={{ color: '#d48806' }}>Pending</span>
                  ) : (
                    <span style={{ color: '#389e0d' }}>Active</span>
                  ),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}

export default SettingsTeam;
