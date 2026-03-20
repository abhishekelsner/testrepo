/**
 * Settings → Security — login providers, allow email login for admins.
 * Matches reference: centered lock icon, provider checkboxes, admin email subsection, Save button.
 */
import { useState, useEffect } from 'react';
import { LockOutlined } from '@ant-design/icons';
import { Checkbox, Button, message } from 'antd';
import { get, put, ENDPOINTS } from '../../api';
import './SettingsPages.css';

const LOGIN_PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'salesforce', label: 'Salesforce' },
  { id: 'hubspot', label: 'HubSpot' },
  { id: 'microsoft', label: 'Microsoft' },
  { id: 'email', label: 'Email' },
];

function SettingsSecurity() {
  const [loginProviders, setLoginProviders] = useState(['google', 'email']);
  const [allowAdminEmailLogin, setAllowAdminEmailLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    get(ENDPOINTS.ORG_CURRENT)
      .then(({ data }) => {
        if (data.security) {
          setLoginProviders(Array.isArray(data.security.loginProviders) ? data.security.loginProviders : ['google', 'email']);
          setAllowAdminEmailLogin(data.security.allowAdminEmailLogin === true);
        }
        setInitialized(true);
      })
      .catch(() => setInitialized(true));
  }, []);

  const toggleProvider = (id) => {
    setLoginProviders((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const onSave = async () => {
    setLoading(true);
    try {
      await put(ENDPOINTS.ORG_CURRENT, {
        security: {
          loginProviders,
          allowAdminEmailLogin,
        },
      });
      message.success('Security settings saved');
    } catch (err) {
      const msg = err.response?.status === 403
        ? 'Only admins can update security settings.'
        : (err.response?.data?.error || 'Failed to save security settings');
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    return (
      <div className="settings-page">
        <div className="settings-profile-loading">Loading security settings…</div>
      </div>
    );
  }

  return (
    <div className="settings-page settings-page-security">
      <div className="settings-security-hero">
        <div className="settings-security-hero-icon">
          <LockOutlined />
        </div>
        <h1 className="settings-page-title centered">SECURITY</h1>
        <p className="settings-page-subtitle centered">
          Control how users are able to sign into this account.
        </p>
      </div>

      <div className="settings-page-block">
        <div className="settings-security-checkbox-list">
          {LOGIN_PROVIDERS.map((provider) => (
            <label key={provider.id} className="settings-security-checkbox-item">
              <Checkbox
                checked={loginProviders.includes(provider.id)}
                onChange={() => toggleProvider(provider.id)}
              />
              <span>{provider.label}</span>
            </label>
          ))}
        </div>

        <div className="settings-security-subsection">
          <h2 className="settings-security-subtitle">Allow email login for Admins</h2>
          <p className="settings-security-subdesc">
            Enable account admins to login with their email and password, in addition to SSO (Single
            Sign On). This may be useful as a backup method, if your SSO provider is unavailable.
          </p>
          <label className="settings-security-checkbox-item">
            <Checkbox
              checked={allowAdminEmailLogin}
              onChange={(e) => setAllowAdminEmailLogin(e.target.checked)}
            />
            <span>Email (admin only)</span>
          </label>
        </div>

        <Button type="primary" className="settings-security-save-btn" onClick={onSave} loading={loading}>
          Save
        </Button>
      </div>
    </div>
  );
}

export default SettingsSecurity;
