import { useEffect, useState } from 'react';
import { Card, Table, Typography, Select, Button, Form, Input, Spin, message } from 'antd';
import { get, post, put, ENDPOINTS } from '../../api';
import { useAuthStore } from '../../store/authStore';

const { Title } = Typography;

const ROLES = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Creator', label: 'Creator' },
];

function Organizations() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'Admin';

  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [orgRes, membersRes, invitesRes] = await Promise.all([
        get(ENDPOINTS.ORG_CURRENT),
        get(ENDPOINTS.ORG_MEMBERS),
        isAdmin ? get(ENDPOINTS.ORG_INVITES) : Promise.resolve({ data: [] }),
      ]);
      setOrg(orgRes.data);
      setMembers(membersRes.data);
      setInvites(invitesRes?.data || []);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await put(ENDPOINTS.ORG_MEMBER_ROLE(userId), { role: newRole });
      message.success('Role updated');
      loadData();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleInvite = async (values) => {
    try {
      await post(ENDPOINTS.ORG_INVITES, { email: values.email, role: values.role || 'Creator' });
      message.success('Invite sent');
      inviteForm.resetFields();
      loadData();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to send invite');
    }
  };

  const memberColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role, record) =>
        isAdmin ? (
          <Select
            value={role}
            options={ROLES}
            onChange={(v) => handleRoleChange(record.id, v)}
            style={{ width: 120 }}
          />
        ) : (
          role
        ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => (v ? new Date(v).toLocaleDateString() : '—'),
    },
  ];

  const inviteColumns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (v) => (v ? new Date(v).toLocaleDateString() : '—'),
    },
  ];

  if (loading && !org) {
    return (
      <div className="app-page-fallback">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <Title level={3}>Organizations</Title>

      <Card className="app-card" title="Current organization" style={{ marginBottom: 24 }}>
        {org && (
          <p style={{ margin: 0 }}>
            <strong>{org.name}</strong> <span style={{ color: 'var(--color-text-secondary)' }}>({org.slug})</span>
          </p>
        )}
      </Card>

      <Card className="app-card" title="Members" style={{ marginBottom: 24 }}>
        <Table
          rowKey="id"
          columns={memberColumns}
          dataSource={members}
          pagination={false}
          size="small"
        />
      </Card>

      {isAdmin && (
        <>
          <Card className="app-card" title="Invite member" style={{ marginBottom: 24 }}>
            <Form form={inviteForm} layout="inline" onFinish={handleInvite}>
              <Form.Item name="email" rules={[{ required: true }, { type: 'email' }]} style={{ minWidth: 220 }}>
                <Input placeholder="Email" />
              </Form.Item>
              <Form.Item name="role" initialValue="Creator">
                <Select options={ROLES} style={{ width: 120 }} placeholder="Role" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  Send invite
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Card className="app-card" title="Pending invites">
            <Table
              rowKey="id"
              columns={inviteColumns}
              dataSource={invites}
              pagination={false}
              size="small"
              locale={{ emptyText: 'No pending invites' }}
            />
          </Card>
        </>
      )}
    </>
  );
}

export default Organizations;
