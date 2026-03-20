import { Card, Typography, Button } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../../components/Logo';
import './auth.css';

const { Paragraph } = Typography;

function VerifyEmailPending() {
  const location = useLocation();
  const email = location.state?.email || '';
  const verifyToken = location.state?.verifyToken; // dev only: link to verify without email

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <Logo size="large" />
      </div>
      <Card className="auth-card app-modal-card" style={{ maxWidth: 440 }}>
        <h1 className="auth-title">Check your email</h1>
        <p className="auth-subtitle">
          We sent a verification link to <strong>{email || 'your email'}</strong>. Click the link in that message to
          verify your account, then sign in.
        </p>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          If you don&apos;t see it, check your spam folder. The link may take a few minutes to arrive.
        </Paragraph>
        {verifyToken && (
          <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 12 }}>
            Dev: <Link to={`/verify-email?token=${verifyToken}`}>Verify now (no email)</Link>
          </Paragraph>
        )}
        <div className="auth-links">
          <Link to="/login">Back to Sign in</Link>
        </div>
      </Card>
    </div>
  );
}

export default VerifyEmailPending;
