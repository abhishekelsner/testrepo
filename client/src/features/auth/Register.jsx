import { Card, Form, Input, Button } from 'antd';
import { UserOutlined, LockOutlined, TeamOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Logo from '../../components/Logo';
import './auth.css';

function Register() {
  const navigate = useNavigate();
  const { register, setError, error } = useAuthStore();

  const onFinish = async (values) => {
    setError(null);
    try {
      const data = await register({
        email: values.email,
        password: values.password,
        name: values.name,
        organizationName: values.organizationName,
      });
      navigate('/verify-email-pending', { state: { email: values.email, verifyToken: data.verifyToken } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <Logo size="large" />
      </div>
      <Card className="auth-card app-modal-card" title="Sign Up">
        <p className="auth-subtitle">Create your account and organization</p>
        {error && <p className="auth-error">{error}</p>}
        <Form onFinish={onFinish} layout="vertical" requiredMark>
          <Form.Item name="name" label="Full name" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} placeholder="Name" size="large" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true }, { type: 'email' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true }, { min: 6 }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Form.Item name="organizationName" label="Organization name">
            <Input prefix={<TeamOutlined />} placeholder="Company / org name" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              REGISTER
            </Button>
          </Form.Item>
        </Form>
        <div className="auth-links">
          <p className="auth-links-secondary">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default Register;
