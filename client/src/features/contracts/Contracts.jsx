/**
 * Contracts — list documents sent for signature via Zoho Sign; show status and download signed PDF.
 */
import { useState, useEffect } from 'react';
import { Button, Table, Tag, message, Space, Typography } from 'antd';
import { DownloadOutlined, SendOutlined, ReloadOutlined } from '@ant-design/icons';
import { get, ENDPOINTS } from '../../api';
import SendForSignatureModal from '../../components/SendForSignatureModal';
import './Contracts.css';

const statusColors = {
  sent: 'blue',
  viewed: 'cyan',
  signed: 'orange',
  completed: 'green',
  declined: 'red',
  expired: 'default',
};

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const { data } = await get(ENDPOINTS.ZOHO_CONTRACTS);
      setContracts(data?.data ?? []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load contracts.');
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleDownload = async (requestId) => {
    setDownloadingId(requestId);
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${baseURL}/${ENDPOINTS.ZOHO_DOWNLOAD(requestId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || `Download failed: ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed-${requestId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('Download started.');
    } catch (err) {
      message.error(err.message || 'Download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  const refreshStatus = async (requestId) => {
    setRefreshingId(requestId);
    try {
      await get(ENDPOINTS.ZOHO_STATUS(requestId));
      await loadContracts();
      message.success('Status updated.');
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to refresh status.');
    } finally {
      setRefreshingId(null);
    }
  };

  const columns = [
    {
      title: 'Request name',
      dataIndex: 'request_name',
      key: 'request_name',
      render: (t) => t || '—',
    },
    {
      title: 'Signer',
      key: 'signer',
      render: (_, r) => (
        <span>
          {r.signer_name}
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.signer_email}</Typography.Text>
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status] || 'default'}>
          {(status || 'sent').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Sent',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => (v ? new Date(v).toLocaleDateString() : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            loading={refreshingId === r.zoho_request_id}
            onClick={() => refreshStatus(r.zoho_request_id)}
          >
            Refresh
          </Button>
          {(r.status === 'completed' || r.status === 'signed') && (
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              loading={downloadingId === r.zoho_request_id}
              onClick={() => handleDownload(r.zoho_request_id)}
            >
              Download
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="contracts-page">
      <div className="contracts-page-header">
        <Typography.Title level={4} style={{ margin: 0 }}>Contracts & Signatures</Typography.Title>
        <Button type="primary" icon={<SendOutlined />} onClick={() => setModalOpen(true)}>
          Send for Signature
        </Button>
      </div>
      <Table
        rowKey="zoho_request_id"
        columns={columns}
        dataSource={contracts}
        loading={loading}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: 'No contracts yet. Send a document for signature to get started.' }}
      />
      <SendForSignatureModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => loadContracts()}
      />
    </div>
  );
}
