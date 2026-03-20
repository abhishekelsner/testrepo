import { Card, Form, Input, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { post, ENDPOINTS } from '../../api';
import Logo from '../../components/Logo';
import './auth.css';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [success, setSuccess] = useState(false);

  const onFinish = async (values) => {
    try {
      await post(ENDPOINTS.AUTH_RESET_PASSWORD, {
        token: values.token || token,
        newPassword: values.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-logo">
          <Logo size="large" />
        </div>
        <Card className="auth-card app-modal-card" style={{ maxWidth: 400 }}>
          <p className="auth-subtitle">Password reset successful. You can now sign in.</p>
          <div className="auth-links">
            <Link to="/login">Sign in</Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <Logo size="large" />
      </div>
      <Card className="auth-card app-modal-card" title="Reset password">
        <Form onFinish={onFinish} layout="vertical" requiredMark>
          {!token && (
            <Form.Item name="token" label="Reset token" rules={[{ required: true }]}>
              <Input placeholder="Paste token from email" size="large" />
            </Form.Item>
          )}
          <Form.Item
            name="newPassword"
            label="New password"
            rules={[{ required: true }, { min: 6 }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="New password" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              RESET PASSWORD
            </Button>
          </Form.Item>
        </Form>
        <div className="auth-links">
          <Link to="/login">Back to Sign in</Link>
        </div>
      </Card>
    </div>
  );
}

export default ResetPassword;
