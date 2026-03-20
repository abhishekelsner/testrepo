/**
 * Settings → Account — Company Details, Default Sharing, Creator Invite Permissions, Feature Permissions.
 * Matches reference UI and wires to GET/PUT organizations/current.
 */
import { useState, useEffect } from 'react';
import { Form, Input, Radio, Button, Switch, message } from 'antd';
import {
  BankOutlined,
  TeamOutlined,
  UserAddOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { get, put, ENDPOINTS } from '../../api';
import './SettingsPages.css';

const DEFAULT_SHARING_OPTIONS = [
  { value: 'private', label: 'PAGES ARE PRIVATE BY DEFAULT' },
  { value: 'view_everyone', label: 'PAGES CAN BE VIEWED BY EVERYONE' },
  { value: 'edit_everyone', label: 'PAGES CAN BE EDITED BY EVERYONE' },
];

const CREATOR_INVITE_OPTIONS = [
  { value: 'any', label: 'CREATORS CAN MANAGE INVITATIONS FOR ANY USER' },
  { value: 'same_domain', label: 'CREATORS CAN MANAGE INVITATIONS FOR USERS WITH THE SAME EMAIL DOMAIN' },
  { value: 'none', label: "CREATORS CAN'T INVITE OTHER USERS" },
];

function SettingsAccount() {
  const [companyForm] = Form.useForm();
  const [org, setOrg] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [loadingSharing, setLoadingSharing] = useState(false);
  const [loadingCreator, setLoadingCreator] = useState(false);
  const [defaultSharing, setDefaultSharing] = useState('private');
  const [creatorInvite, setCreatorInvite] = useState('any');
  const [aiFeatures, setAiFeatures] = useState(true);

  const loadOrg = async () => {
    try {
      const { data } = await get(ENDPOINTS.ORG_CURRENT);
      setOrg(data);
      companyForm.setFieldsValue({
        companyName: data.name || '',
        companyWebsite: data.website || 'https://',
      });
      setDefaultSharing(data.defaultSharing || 'private');
      setCreatorInvite(data.creatorInvitePermission || 'any');
      setAiFeatures(data.aiFeaturesEnabled !== false);
      return data;
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to load account');
      return null;
    }
  };

  useEffect(() => {
    loadOrg();
  }, []);

  const onUpdateCompany = async () => {
    const values = await companyForm.validateFields().catch(() => null);
    if (!values || !org) return;
    setLoadingCompany(true);
    try {
      const { data } = await put(ENDPOINTS.ORG_CURRENT, {
        name: values.companyName?.trim() || org.name,
        website: values.companyWebsite?.trim() || '',
      });
      setOrg(data);
      message.success('Company details updated');
    } catch (err) {
      const msg = err.response?.status === 403
        ? 'Only admins can update company details.'
        : (err.response?.data?.error || 'Failed to update company details');
      message.error(msg);
    } finally {
      setLoadingCompany(false);
    }
  };

  const onUpdateSharing = async () => {
    if (!org) return;
    setLoadingSharing(true);
    try {
      const { data } = await put(ENDPOINTS.ORG_CURRENT, { defaultSharing });
      setOrg(data);
      setDefaultSharing(data.defaultSharing);
      message.success('Default sharing updated');
    } catch (err) {
      const msg = err.response?.status === 403
        ? 'Only admins can update default sharing.'
        : (err.response?.data?.error || 'Failed to update defaults');
      message.error(msg);
    } finally {
      setLoadingSharing(false);
    }
  };

  const onUpdateCreatorPermissions = async () => {
    if (!org) return;
    setLoadingCreator(true);
    try {
      const { data } = await put(ENDPOINTS.ORG_CURRENT, { creatorInvitePermission: creatorInvite });
      setOrg(data);
      setCreatorInvite(data.creatorInvitePermission);
      message.success('Creator invite permissions updated');
    } catch (err) {
      const msg = err.response?.status === 403
        ? 'Only admins can update creator permissions.'
        : (err.response?.data?.error || 'Failed to update permissions');
      message.error(msg);
    } finally {
      setLoadingCreator(false);
    }
  };

  const onAiFeaturesChange = async (checked) => {
    setAiFeatures(checked);
    if (!org) return;
    try {
      const { data } = await put(ENDPOINTS.ORG_CURRENT, { aiFeaturesEnabled: checked });
      setOrg(data);
      message.success(checked ? 'AI features enabled' : 'AI features disabled');
    } catch (err) {
      setAiFeatures(!checked);
      const msg = err.response?.status === 403
        ? 'Only admins can update feature permissions.'
        : (err.response?.data?.error || 'Failed to update');
      message.error(msg);
    }
  };

  if (!org) {
    return (
      <div className="settings-page">
        <div className="settings-profile-loading">Loading account…</div>
      </div>
    );
  }

  return (
    <div className="settings-page settings-page-account">
      {/* 1. Company Details */}
      <div className="settings-page-block">
        <div className="settings-page-block-icon">
          <BankOutlined />
        </div>
        <h1 className="settings-page-title">COMPANY DETAILS</h1>
        <p className="settings-page-subtitle">Update your company details here.</p>
        <Form form={companyForm} layout="vertical" className="settings-page-form">
          <Form.Item label="COMPANY NAME" name="companyName">
            <Input placeholder="Elsner Technologies" size="large" />
          </Form.Item>
          <Form.Item label="COMPANY WEBSITE" name="companyWebsite">
            <Input placeholder="https://" size="large" />
          </Form.Item>
          <Button
            type="primary"
            size="large"
            className="settings-page-btn-primary settings-account-btn"
            onClick={onUpdateCompany}
            loading={loadingCompany}
          >
            UPDATE COMPANY DETAILS
          </Button>
        </Form>
      </div>

      {/* 2. Default Sharing */}
      <div className="settings-page-block">
        <div className="settings-page-block-icon">
          <TeamOutlined />
        </div>
        <h1 className="settings-page-title">DEFAULT SHARING</h1>
        <p className="settings-page-subtitle">
          Choose how newly created pages are shared with your team.
        </p>
        <Radio.Group
          value={defaultSharing}
          onChange={(e) => setDefaultSharing(e.target.value)}
          className="settings-page-radio-group"
        >
          {DEFAULT_SHARING_OPTIONS.map((opt) => (
            <Radio key={opt.value} value={opt.value} className="settings-page-radio">
              {opt.label}
            </Radio>
          ))}
        </Radio.Group>
        <Button
          className="settings-account-btn-secondary"
          onClick={onUpdateSharing}
          loading={loadingSharing}
        >
          UPDATE DEFAULTS
        </Button>
      </div>

      {/* 3. Creator Invite Permissions */}
      <div className="settings-page-block">
        <div className="settings-page-block-icon">
          <UserAddOutlined />
        </div>
        <h1 className="settings-page-title">CREATOR INVITE PERMISSIONS</h1>
        <p className="settings-page-subtitle">
          Choose how creators manage invitations for new users to your account. Team admins are
          able to invite any user.
        </p>
        <Radio.Group
          value={creatorInvite}
          onChange={(e) => setCreatorInvite(e.target.value)}
          className="settings-page-radio-group"
        >
          {CREATOR_INVITE_OPTIONS.map((opt) => (
            <Radio key={opt.value} value={opt.value} className="settings-page-radio">
              {opt.label}
            </Radio>
          ))}
        </Radio.Group>
        <Button
          className="settings-account-btn-secondary"
          onClick={onUpdateCreatorPermissions}
          loading={loadingCreator}
        >
          UPDATE PERMISSIONS
        </Button>
      </div>

      {/* 4. Feature Permissions */}
      <div className="settings-page-block">
        <div className="settings-page-block-icon">
          <AppstoreOutlined />
        </div>
        <h1 className="settings-page-title">FEATURE PERMISSIONS</h1>
        <p className="settings-page-subtitle">Manage features on your Qwilr account.</p>
        <div className="settings-account-toggle-row">
          <div className="settings-account-toggle-label">
            <span className="settings-account-toggle-title">AI features</span>
            <span className="settings-account-toggle-desc">Let your team use Qwilr's AI features</span>
          </div>
          <Switch checked={aiFeatures} onChange={onAiFeaturesChange} />
        </div>
      </div>
    </div>
  );
}

export default SettingsAccount;
