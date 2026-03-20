/**
 * Settings → Profile — exact copy of reference: Name, Email, Password with logged-in user data.
 */
import { useState, useEffect } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, IdcardOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { patch, post, ENDPOINTS } from '../../api';
import './SettingsPages.css';

function SettingsProfile() {
  const { user, setUser, loadUser } = useAuthStore();
  const [nameForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loadingName, setLoadingName] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Always refetch profile when this page mounts so we show latest data
  useEffect(() => {
    let cancelled = false;
    loadUser().then((data) => {
      if (!cancelled && data) {
        nameForm.setFieldsValue({ name: data.name ?? '' });
        emailForm.setFieldsValue({ email: data.email ?? '' });
      }
    });
    return () => { cancelled = true; };
  }, [loadUser]);

  // Sync form when user updates from store (e.g. after update name/email)
  useEffect(() => {
    if (user) {
      nameForm.setFieldsValue({ name: user.name ?? '' });
      emailForm.setFieldsValue({ email: user.email ?? '' });
    }
  }, [user, nameForm, emailForm]);

  const onUpdateName = async () => {
    const { name } = await nameForm.validateFields(['name']).catch(() => ({}));
    if (name === undefined) return;
    setLoadingName(true);
    try {
      const { data } = await patch(ENDPOINTS.AUTH_ME_UPDATE, { name });
      setUser(data);
      nameForm.setFieldsValue({ name: data.name });
      message.success('Name updated successfully');
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to update name');
    } finally {
      setLoadingName(false);
    }
  };

  const onUpdateEmail = async () => {
    const { email } = await emailForm.validateFields(['email']).catch(() => ({}));
    if (email === undefined) return;
    setLoadingEmail(true);
    try {
      const { data } = await patch(ENDPOINTS.AUTH_ME_UPDATE, { email });
      setUser(data);
      emailForm.setFieldsValue({ email: data.email });
      message.success('Email updated successfully');
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to update email');
    } finally {
      setLoadingEmail(false);
    }
  };

  const onUpdatePassword = async () => {
    const values = await passwordForm.validateFields([
      'currentPassword',
      'newPassword',
      'confirmPassword',
    ]).catch(() => null);
    if (!values) return;
    if (values.newPassword !== values.confirmPassword) {
      message.error('New password and confirm password do not match');
      return;
    }
    setLoadingPassword(true);
    try {
      await post(ENDPOINTS.AUTH_CHANGE_PASSWORD, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Password updated successfully');
      passwordForm.resetFields();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to update password');
    } finally {
      setLoadingPassword(false);
    }
  };

  const isLoading = !user;

  return (
    <div className="settings-page settings-page-profile">
      {isLoading && (
        <div className="settings-profile-loading">Loading your profile…</div>
      )}
      <div className="settings-profile-hero">
        <div className="settings-profile-hero-icon">
          <IdcardOutlined />
        </div>
        <h1 className="settings-page-title centered">PROFILE</h1>
        <p className="settings-page-subtitle centered">
          Your personal profile and login details.
        </p>
      </div>

      <div className="settings-page-block">
        <div className="settings-page-block-icon small">
          <UserOutlined />
        </div>
        <h2 className="settings-page-block-title">NAME</h2>
        <p className="settings-page-block-sub">SET YOUR NAME HERE</p>
        <Form form={nameForm} layout="vertical" initialValues={{ name: user?.name ?? '' }}>
          <Form.Item name="name" label="Name">
            <Input placeholder="Your name" size="large" disabled={isLoading} />
          </Form.Item>
          <Button
            type="primary"
            className="settings-profile-btn-primary"
            onClick={onUpdateName}
            loading={loadingName}
            disabled={isLoading}
          >
            Update Name
          </Button>
        </Form>
      </div>

      <div className="settings-page-block">
        <div className="settings-page-block-icon small">
          <MailOutlined />
        </div>
        <h2 className="settings-page-block-title">EMAIL</h2>
        <p className="settings-page-block-sub">UPDATE YOUR EMAIL ADDRESS HERE</p>
        <Form form={emailForm} layout="vertical" initialValues={{ email: user?.email ?? '' }}>
          <Form.Item name="email" label="Email">
            <Input type="email" placeholder="your@email.com" size="large" disabled={isLoading} />
          </Form.Item>
          <Button
            type="primary"
            className="settings-profile-btn-primary"
            onClick={onUpdateEmail}
            loading={loadingEmail}
            disabled={isLoading}
          >
            Update Email
          </Button>
        </Form>
      </div>

      <div className="settings-page-block">
        <div className="settings-page-block-icon small">
          <LockOutlined />
        </div>
        <h2 className="settings-page-block-title">PASSWORD</h2>
        <p className="settings-page-block-sub">SET A NEW PASSWORD HERE</p>
        <Form form={passwordForm} layout="vertical">
          <Form.Item name="currentPassword" label="Current password">
            <Input.Password size="large" placeholder="Current password" disabled={isLoading} />
          </Form.Item>
          <Form.Item name="newPassword" label="New password">
            <Input.Password size="large" placeholder="New password" disabled={isLoading} />
          </Form.Item>
          <Form.Item name="confirmPassword" label="Confirm new password">
            <Input.Password size="large" placeholder="Confirm new password" disabled={isLoading} />
          </Form.Item>
          <Button
            className="settings-profile-btn-password"
            onClick={onUpdatePassword}
            loading={loadingPassword}
            disabled={isLoading}
          >
            Update Password
          </Button>
        </Form>
      </div>
    </div>
  );
}

export default SettingsProfile;
