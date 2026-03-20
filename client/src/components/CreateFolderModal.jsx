/**
 * Create Folder modal — matches reference: "Name this folder", Share folder section, collaborator list.
 * Uses logged-in user data (name, email) — not hardcoded "Elsner Technologies".
 */
import { useState } from 'react';
import { Modal, Input, Button, Select, message } from 'antd';
import { FolderOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import './CreateFolderModal.css';

export default function CreateFolderModal({ open, onClose, onCreate }) {
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [shareSearch, setShareSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [ownerPermission, setOwnerPermission] = useState('can_edit');

  async function handleCreate() {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onCreate(trimmed);
      setName('');
      setShareSearch('');
      onClose();
    } catch (e) {
      message.error(e?.response?.data?.error || e?.message || 'Failed to create folder');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setName('');
    setShareSearch('');
    onClose();
  }

  const initials = (user?.name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const displayName = user?.organization?.name || user?.name || 'You';
  const displayEmail = user?.email || '';

  return (
    <Modal
      title={null}
      open={open}
      onCancel={handleCancel}
      footer={null}
      closable
      closeIcon={<span aria-label="Close">×</span>}
      destroyOnHidden
      centered
      className="create-folder-modal"
      width={440}
    >
      <div className="create-folder-modal-body">
        <h2 className="create-folder-modal-title">
          <FolderOutlined className="create-folder-modal-title-icon" />
          Name this folder
        </h2>

        <div className="create-folder-modal-input-wrap">
          <FolderOutlined className="create-folder-modal-folder-icon" />
          <Input
            placeholder="Name this folder"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onPressEnter={handleCreate}
            className="create-folder-modal-input"
            variant="borderless"
            autoFocus
          />
        </div>

        <div className="create-folder-modal-share-section">
          <label className="create-folder-modal-share-label">Share folder.</label>
          <Input
            placeholder="Enter a name or email"
            prefix={<SearchOutlined className="create-folder-modal-search-icon" />}
            value={shareSearch}
            onChange={(e) => setShareSearch(e.target.value)}
            className="create-folder-modal-share-input"
            allowClear
          />
        </div>

        <div className="create-folder-modal-collaborators">
          <div className="create-folder-modal-collab-row">
            <div className="create-folder-modal-collab-avatar create-folder-modal-avatar-owner">
              {initials}
            </div>
            <div className="create-folder-modal-collab-info">
              <span className="create-folder-modal-collab-name">
                {displayName} (you)
              </span>
              <span className="create-folder-modal-collab-email">{displayEmail}</span>
            </div>
            <Select
              value={ownerPermission}
              onChange={setOwnerPermission}
              options={[
                { label: 'Can edit', value: 'can_edit' },
                { label: 'Can view', value: 'can_view' },
              ]}
              className="create-folder-modal-permission-select"
              suffixIcon={<span className="create-folder-modal-caret">▾</span>}
            />
          </div>
          <div className="create-folder-modal-collab-row">
            <div className="create-folder-modal-collab-avatar create-folder-modal-avatar-group">
              <TeamOutlined />
            </div>
            <div className="create-folder-modal-collab-info">
              <span className="create-folder-modal-collab-name">Admins</span>
              <span className="create-folder-modal-collab-email">1 person</span>
            </div>
            <span className="create-folder-modal-permission-static">Can edit</span>
          </div>
        </div>

        <div className="create-folder-modal-actions">
          <Button className="create-folder-modal-btn-cancel" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="primary"
            className="create-folder-modal-btn-create"
            onClick={handleCreate}
            loading={saving}
            disabled={!name.trim()}
          >
            Create folder
          </Button>
        </div>
      </div>
    </Modal>
  );
}
