import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Typography, Select, Spin, message } from 'antd';
import { get, ENDPOINTS } from '../../api';
import { useAuthStore } from '../../store/authStore';

const { Title } = Typography;

const EVENT_OPTIONS = [
  { value: '', label: 'All events' },
  { value: 'register', label: 'Register' },
  { value: 'login', label: 'Login' },
  { value: 'login_failed', label: 'Login failed' },
  { value: 'logout', label: 'Logout' },
  { value: 'forgot_password', label: 'Forgot password' },
  { value: 'password_reset', label: 'Password reset' },
  { value: 'email_verified', label: 'Email verified' },
  { value: 'invite_sent', label: 'Invite sent' },
  { value: 'invite_accepted', label: 'Invite accepted' },
  { value: 'role_changed', label: 'Role changed' },
];

function AuditLogs() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ items: [], total: 0 });
  const [event, setEvent] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const orgSlug = user?.organization?.slug;

  useEffect(() => {
    if (user && user.role !== 'Admin') {
      message.warning('Only Admin can view audit logs.');
      navigate(orgSlug ? `/${orgSlug}/dashboard` : '/dashboard', { replace: true });
    }
  }, [user, orgSlug, navigate]);

  const fetchLogs = async (skip = 0, limit = 20, eventFilter = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
      if (eventFilter) params.set('event', eventFilter);
      const { data: res } = await get(`${ENDPOINTS.ADMIN_AUDIT_LOGS}?${params}`);
      setData(res);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to load audit logs');
      setData({ items: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'Admin') return;
    const skip = (pagination.current - 1) * pagination.pageSize;
    fetchLogs(skip, pagination.pageSize, event || undefined);
  }, [user?.role, pagination.current, pagination.pageSize, event]);

  const columns = [
    { title: 'Event', dataIndex: 'event', key: 'event', width: 140, render: (v) => <code>{v}</code> },
    { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
    { title: 'IP', dataIndex: 'ip', key: 'ip', width: 120 },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v) => (v ? new Date(v).toLocaleString() : '—'),
    },
    { title: 'User agent', dataIndex: 'userAgent', key: 'userAgent', ellipsis: true },
  ];

  return (
    <>
      <Title level={3}>Audit logs</Title>
      <Card className="app-card">
        <div style={{ marginBottom: 16 }}>
          <Select
            value={event || undefined}
            onChange={setEvent}
            options={EVENT_OPTIONS}
            style={{ width: 180 }}
            placeholder="Filter by event"
            allowClear
          />
        </div>
        <Spin spinning={loading}>
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={data.items}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: data.total,
              showSizeChanger: true,
              showTotal: (t) => `Total ${t} logs`,
              onChange: (page, pageSize) => setPagination((p) => ({ ...p, current: page, pageSize: pageSize || 20 })),
            }}
            size="small"
          />
        </Spin>
      </Card>
    </>
  );
}

export default AuditLogs;
