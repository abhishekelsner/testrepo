import { Card, Form, Input, Button, message, Divider } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

import { useAuthStore } from "../../store/authStore";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";
import Logo from "../../components/Logo";

import "./auth.css";

function Login() {

  const navigate = useNavigate();

  const { login, setError, googleLogin } = useAuthStore();

  const [googleLoading, setGoogleLoading] = useState(false);

  const googleBtnRef = useRef(null);

  const onFinish = async (values) => {
    setError(null);

    try {
      const user = await login(values.email, values.password);
      if (user?.mustChangePassword) {
        navigate('/change-password');
        return;
      }
      const slug = user?.organization?.slug;
      navigate(slug ? `/${slug}/dashboard` : '/dashboard');
    } catch (err) {
      let msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Invalid email or password";
      if (!err.response && (err.code === 'ECONNREFUSED' || err.message?.includes('Network'))) {
        msg = "Cannot reach server. Start the API (e.g. npm run dev in server folder on port 3001).";
      }
      message.error(msg);
    }
  };

  const handleGoogleSuccess = async (credential) => {

    setGoogleLoading(true);

    try {

      await googleLogin(credential);

      navigate("/dashboard");

    } catch (err) {

      const msg = err.response?.data?.error || "Google sign-in failed.";

      message.error(msg);

    } finally {

      setGoogleLoading(false);

    }
  };

  const handleGoogleError = (err) => {

    message.error(err?.message || "Google sign-in encountered an error.");

  };

  const { scriptReady, renderGoogleButton } = useGoogleAuth({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
  });

  useEffect(() => {

    if (scriptReady && googleBtnRef.current) {

      renderGoogleButton(googleBtnRef.current);

    }

  }, [scriptReady, renderGoogleButton]);

  return (
    <div className="auth-page">

      <Card className="auth-card app-modal-card">

        <div className="auth-logo auth-logo-inside">
          <Logo size="large" />
        </div>

        <h1 className="auth-title">Sign In</h1>

        <p className="auth-subtitle">
          Welcome to Elsner Connect Portal
        </p>

        <Form onFinish={onFinish} layout="vertical" requiredMark>

          <Form.Item
            name="email"
            label="Login Id"
            rules={[{ required: true }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Login Id"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
            >
              SIGN IN
            </Button>

          </Form.Item>

        </Form>

        <div className="auth-links">

          <Link to="/forgot-password">
            Forgot your login details? Get help logging in.
          </Link>

          <p className="auth-links-secondary">
            Don’t have an account? <Link to="/register">Sign up</Link>
          </p>

        </div>

      </Card>

      <Divider>or continue with</Divider>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          minHeight: 44,
        }}
      >

        <div ref={googleBtnRef} style={{ width: "100%" }} />

        {googleLoading && (

          <p
            style={{
              textAlign: "center",
              color: "#888",
              fontSize: 13,
            }}
          >
            Verifying with Google…
          </p>

        )}

      </div>

    </div>
  );
}

export default Login;