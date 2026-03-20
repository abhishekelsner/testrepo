import { Card, Form, Input, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { post, ENDPOINTS } from '../../api';
import Logo from '../../components/Logo';
import './auth.css';

function ForgotPassword() {
  const [sent, setSent] = useState(false);

  const onFinish = async (values) => {
    try {
      await post(ENDPOINTS.AUTH_FORGOT_PASSWORD, { email: values.email });
      setSent(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-logo">
          <Logo size="large" />
        </div>
        <Card className="auth-card app-modal-card" style={{ maxWidth: 400 }}>
          <p className="auth-subtitle">If that email exists, we sent a reset link. Check your inbox.</p>
          <div className="auth-links">
            <Link to="/login">Back to Sign in</Link>
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
      <Card className="auth-card app-modal-card" title="Forgot password">
        <p className="auth-subtitle">
          Enter your email and we’ll send a reset link.
        </p>
        <Form onFinish={onFinish} layout="vertical" requiredMark>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              SEND RESET LINK
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

export default ForgotPassword;
