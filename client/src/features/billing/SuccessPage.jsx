/**
 * Post-checkout success page. Stripe redirects here with ?session_id=...
 * We call confirm-session so the DB is updated even when webhooks don't run (e.g. local dev).
 * Poll for status with a timeout so the user is never stuck.
 */
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';
import { get, post, ENDPOINTS } from '../../api';
import { useAuthStore } from '../../store/authStore';
import './SuccessPage.css';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 15000;

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { user } = useAuthStore();
  const [polling, setPolling] = useState(!!sessionId);
  const [status, setStatus] = useState(null);
  const confirmedRef = useRef(false);

  // 1) Confirm session once so DB is updated (works even without Stripe webhook)
  useEffect(() => {
    if (!sessionId || confirmedRef.current) return;
    confirmedRef.current = true;
    post(ENDPOINTS.BILLING_CONFIRM_SESSION, { sessionId })
      .then((res) => {
        if (res.data?.success) setStatus((s) => s || { plan: 'single', subscriptionStatus: 'active' });
      })
      .catch(() => {});
  }, [sessionId]);

  // 2) Poll status until active or timeout — then stop so user is never stuck
  useEffect(() => {
    if (!sessionId) {
      setPolling(false);
      return;
    }
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    const t = setInterval(() => {
      if (Date.now() >= deadline) {
        setPolling(false);
        return;
      }
      get(ENDPOINTS.BILLING_STATUS)
        .then((res) => {
          if (res.data?.subscriptionStatus === 'active' || res.data?.subscriptionStatus === 'trialing') {
            setStatus(res.data);
            setPolling(false);
          }
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [sessionId]);

  const slug = user?.organization?.slug;
  const dashboardUrl = slug ? `/${slug}/dashboard` : '/';
  const subscriptionUrl = slug ? `/${slug}/settings/subscription` : '/';

  return (
    <div className="success-page">
      <Result
        status="success"
        title="Subscription Active"
        subTitle={
          sessionId
            ? polling
              ? 'Confirming your subscription…'
              : status
                ? `You're on the ${status.plan} plan. View and manage your subscription in Settings.`
                : 'Your subscription is being activated. You can return to the app.'
            : 'No session ID. If you just completed checkout, your subscription may still be activating.'
        }
        extra={
          <>
            {polling && sessionId && <Spin style={{ marginBottom: 16 }} />}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to={subscriptionUrl}>
                <Button type="primary" size="large">
                  Manage subscription
                </Button>
              </Link>
              <Link to={dashboardUrl}>
                <Button size="large">Go to Dashboard</Button>
              </Link>
            </div>
          </>
        }
      />
    </div>
  );
}
