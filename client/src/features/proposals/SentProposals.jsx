/**
 * Shared with me — proposals where current user's email is in collaborators.
 * Route: /:orgSlug/sent-proposals
 * Actions: Open/Edit if access exists.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Button, Table, Popconfirm, Spin, message, Tag, Space, Tooltip,
} from 'antd';
import { TeamOutlined, EyeOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { get } from '../../api/service';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { encodeUrlOpaque } from '../../utils/urlQueryOpaque';

const { Title } = Typography;

function SentProposals() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const myEmail = String(user?.email || '').trim().toLowerCase();

  const loadProposals = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await get(ENDPOINTS.PROPOSALS_SHARED_WITH_ME);
      const all = Array.isArray(data) ? data : [];
      const shared = all.filter((p) => String(p.createdBy || '') !== String(user?.id || ''));
      setList(shared);
    } catch {
      message.error('Failed to load shared pages');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [myEmail, user?.id]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  function openView(slug) {
    const url = `${window.location.origin}/view/${slug}`;
    window.open(url, '_blank');
  }

  function openEdit(id) {
    const slug = user?.organization?.slug;
    if (!slug) {
      message.warning('Your organization is not available');
      return;
    }
    navigate(`/${slug}/proposals/${encodeUrlOpaque(id)}/edit`);
  }

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title, record) => (
        <Space>
          <span>{title || 'Untitled'}</span>
          {record.slug && (
            <Tag color="green">Published</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Shared by',
      key: 'sharedBy',
      width: 260,
      render: (_, record) => {
        const name = record.createdByName || 'Team member';
        const email = record.createdByEmail || '—';
        return (
          <Space direction="vertical" size={0}>
            <span style={{ fontSize: 13 }}>{name}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{email}</span>
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View (open public link)">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openView(record.slug)} disabled={!record.slug} />
          </Tooltip>
          <Tooltip title="Edit shared page">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Title level={3}>Shared with me</Title>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        Pages other teammates shared with your email for collaboration.
      </p>
      <div style={{ marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={loadProposals} loading={loading}>
          Refresh
        </Button>
      </div>
      <Table
        loading={loading}
        dataSource={list}
        rowKey="id"
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} shared page${t !== 1 ? 's' : ''}` }}
        locale={{ emptyText: 'No pages shared with you yet.' }}
      />
    </>
  );
}

export default SentProposals;
