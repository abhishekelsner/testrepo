/**
 * TemplatesList — list, create, edit, delete proposal templates.
 * Route: /templates  (rendered inside AppLayout — no own Layout/Header).
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography, Button, Card, Row, Col, Modal, Input,
  Popconfirm, Empty, Spin, message, Tag,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { get, post, put, del } from '../../api/service';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { FEATURED_TEMPLATES } from '../proposals/editorPresets';
import { encodeUrlOpaque } from '../../utils/urlQueryOpaque';

const { Title, Text } = Typography;

function TemplatesList() {
  const navigate = useNavigate();
  const { orgSlug } = useParams();
  const { user } = useAuthStore();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create, object = rename
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  const canEdit   = ['Owner', 'Admin', 'Creator'].includes(user?.role);
  const canDelete = ['Owner', 'Admin'].includes(user?.role);

  // ─── Load templates ───────────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await get(ENDPOINTS.TEMPLATES, { params: { type: 'proposal' } });
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      message.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // ─── Create ───────────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setNameInput('');
    setModalOpen(true);
  }

  // ─── Rename ───────────────────────────────────────────────────────────
  function openRename(template) {
    setEditTarget(template);
    setNameInput(template.name);
    setModalOpen(true);
  }

  async function handleModalOk() {
    const name = nameInput.trim();
    if (!name) return message.warning('Template name is required');
    setSaving(true);
    try {
      if (editTarget) {
        const { data } = await put(ENDPOINTS.TEMPLATE_BY_ID(editTarget.id), { name });
        setTemplates((prev) => prev.map((t) => (t.id === editTarget.id ? data : t)));
        message.success('Template renamed');
        setModalOpen(false);
      } else {
        const { data } = await post(ENDPOINTS.TEMPLATES, { name, type: 'proposal', blocks: [], variables: {} });
        setTemplates((prev) => [data, ...prev]);
        setModalOpen(false);
        // Navigate immediately to editor to add blocks
        navigate(`/${orgSlug}/templates/${encodeUrlOpaque(data.id)}/edit`);
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────
  async function handleDelete(id) {
    try {
      await del(ENDPOINTS.TEMPLATE_BY_ID(id));
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      message.success('Template deleted');
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to delete template');
    }
  }

  // ─── Create from featured template ───────────────────────────────────
  async function createFromFeatured(featured) {
    setSaving(true);
    try {
      const blocks = featured.createBlocks();
      const { data } = await post(ENDPOINTS.TEMPLATES, {
        name: featured.name,
        type: featured.type,
        blocks,
        variables: {},
      });
      setTemplates((prev) => [data, ...prev]);
      message.success(`"${featured.name}" template created`);
      navigate(`/${orgSlug}/templates/${encodeUrlOpaque(data.id)}/edit`);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to create template');
    } finally {
      setSaving(false);
    }
  }

  // ─── Use template → create proposal ──────────────────────────────────
  async function useTemplate(template) {
    try {
      const { data } = await post(ENDPOINTS.PROPOSALS, {
        title: `From template: ${template.name}`,
        templateId: template.id,
      });
      navigate(`/${orgSlug}/proposals/${encodeUrlOpaque(data.id)}/edit`);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to create proposal from template');
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Proposal Templates</Title>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Template
          </Button>
        )}
      </div>

      {/* ── Featured templates ── */}
      {canEdit && (
        <div style={{ marginBottom: 32 }}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Start from a featured template
          </Text>
          <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
            {FEATURED_TEMPLATES.map((ft) => (
              <Col key={ft.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  className="app-card"
                  hoverable
                  style={{ borderStyle: 'dashed', borderColor: 'var(--primary-color)', background: '#fafbff' }}
                >
                  <Card.Meta
                    avatar={<FileTextOutlined style={{ fontSize: 24, color: 'var(--primary-color)' }} />}
                    title={ft.name}
                    description={
                      <div>
                        <Tag color="purple" style={{ fontSize: 11 }}>featured</Tag>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                          {ft.description}
                        </Text>
                      </div>
                    }
                  />
                  <Button
                    type="primary"
                    size="small"
                    loading={saving}
                    style={{ marginTop: 12, width: '100%' }}
                    onClick={() => createFromFeatured(ft)}
                  >
                    Use Template
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {loading ? (
        <div className="app-page-fallback"><Spin /></div>
      ) : templates.length === 0 ? (
        <Empty
          image={<FileTextOutlined style={{ fontSize: 48, color: 'var(--bg-gray-shade5)' }} />}
          description="No templates yet"
        >
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Create your first template
            </Button>
          )}
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {templates.map((t) => (
            <Col key={t.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                className="app-card"
                hoverable
                actions={[
                  canEdit && (
                    <EditOutlined
                      key="edit"
                      title="Edit template blocks"
                      onClick={() => navigate(`/${orgSlug}/templates/${encodeUrlOpaque(t.id)}/edit`)}
                    />
                  ),
                  canEdit && (
                    <Button
                      key="rename"
                      type="text"
                      size="small"
                      style={{ fontSize: 11 }}
                      onClick={() => openRename(t)}
                    >
                      Rename
                    </Button>
                  ),
                  canDelete && (
                    <Popconfirm
                      key="delete"
                      title="Delete this template?"
                      onConfirm={() => handleDelete(t.id)}
                      okText="Delete"
                      okType="danger"
                    >
                      <DeleteOutlined style={{ color: 'var(--color-danger)' }} />
                    </Popconfirm>
                  ),
                ].filter(Boolean)}
              >
                <Card.Meta
                  avatar={<FileTextOutlined style={{ fontSize: 24, color: 'var(--primary-color)' }} />}
                  title={t.name}
                  description={
                    <div>
                      <Tag color="blue" style={{ fontSize: 11 }}>proposal</Tag>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                        {t.blocks?.length || 0} block{t.blocks?.length !== 1 ? 's' : ''}
                      </Text>
                    </div>
                  }
                />
                <Button
                  type="primary"
                  size="small"
                  style={{ marginTop: 12, width: '100%' }}
                  onClick={() => useTemplate(t)}
                >
                  Use Template
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Create / Rename Modal */}
      <Modal
        title={editTarget ? 'Rename Template' : 'New Template'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        okText={editTarget ? 'Save' : 'Create & Edit'}
        confirmLoading={saving}
      >
        <Input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Template name"
          onPressEnter={handleModalOk}
          autoFocus
          style={{ marginTop: 8 }}
        />
      </Modal>
    </>
  );
}

export default TemplatesList;
