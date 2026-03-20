import { useEffect, useState } from 'react';
import { Card, Typography, Button, Spin, message } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { post, ENDPOINTS } from '../../api';
import Logo from '../../components/Logo';
import './auth.css';

const { Paragraph } = Typography;

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Missing verification token');
      return;
    }
    post(ENDPOINTS.AUTH_VERIFY_EMAIL, { token })
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err.response?.data?.error || 'Verification failed');
        message.error(err.response?.data?.error || 'Verification failed');
      });
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <Logo size="large" />
      </div>
      <Card className="auth-card app-modal-card" style={{ maxWidth: 440 }}>
        <h1 className="auth-title">Verify email</h1>
        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>Verifying your email…</Paragraph>
          </div>
        )}
        {status === 'success' && (
          <>
            <p className="auth-subtitle">Your email is verified. You can now sign in.</p>
            <Link to="/login">
              <Button type="primary" block size="large" style={{ marginTop: 16 }}>
                Sign in
              </Button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="auth-error">{errorMsg}</p>
            <div className="auth-links">
              <Link to="/login">Back to Sign in</Link>
              <p className="auth-links-secondary">
                <Link to="/register">Register again</Link>
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default VerifyEmail;
