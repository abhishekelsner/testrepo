/**
 * Pricing / subscription page: shows current plan, Subscribe (redirect to Stripe Checkout),
 * and Cancel (owner only, when active and !cancelAtPeriodEnd).
 */
import { useState, useEffect } from 'react';
import { Card, Button, Spin, message } from 'antd';
import { get, post, ENDPOINTS } from '../../api';
import { useAuthStore } from '../../store/authStore';
import './PricingPage.css';

const PLAN_LABELS = { single: 'Single', team: 'Team' };
const STATUS_LABELS = { active: 'Active', inactive: 'Inactive', trialing: 'Trialing', past_due: 'Past due' };

export default function PricingPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    get(ENDPOINTS.BILLING_STATUS)
      .then((res) => setStatus(res.data))
      .catch((err) => {
        message.error(err.response?.data?.error || 'Failed to load billing status');
        setStatus({
          plan: 'single',
          subscriptionStatus: 'inactive',
          memberCount: 0,
          memberLimit: 1,
          cancelAtPeriodEnd: false,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = (plan) => {
    setCheckoutLoading(plan);
    post(ENDPOINTS.BILLING_CREATE_CHECKOUT, { plan })
      .then((res) => {
        const url = res.data?.url;
        if (url) window.location.href = url;
        else message.error('No checkout URL returned');
      })
      .catch((err) => {
        message.error(err.response?.data?.error || 'Checkout failed');
        setCheckoutLoading(null);
      });
  };

  const handleCancel = () => {
    setCancelLoading(true);
    post(ENDPOINTS.BILLING_CANCEL)
      .then((res) => {
        message.success(res.data?.message || 'Subscription will cancel at period end');
        setStatus((s) => (s ? { ...s, cancelAtPeriodEnd: true, currentPeriodEnd: res.data?.currentPeriodEnd } : s));
      })
      .catch((err) => {
        message.error(err.response?.data?.error || 'Cancel failed');
      })
      .finally(() => setCancelLoading(false));
  };

  if (loading) {
    return (
      <div className="pricing-page">
        <Spin size="large" />
      </div>
    );
  }

  const isOwner = user?.role === 'Admin';
  const showCancel =
    isOwner &&
    status?.subscriptionStatus === 'active' &&
    !status?.cancelAtPeriodEnd;

  return (
    <div className="pricing-page">
      <h1 className="pricing-page-title">Subscription</h1>
      <p className="pricing-page-subtitle">
        Current plan: <strong>{PLAN_LABELS[status?.plan] || status?.plan}</strong>
        {status?.subscriptionStatus && (
          <> — {STATUS_LABELS[status.subscriptionStatus] || status.subscriptionStatus}</>
        )}
        {status?.memberCount != null && (
          <> · {status.memberCount} / {status.memberLimit} members</>
        )}
      </p>
      {status?.cancelAtPeriodEnd && status?.currentPeriodEnd && (
        <p className="pricing-page-warning">
          Subscription will end on {new Date(status.currentPeriodEnd).toLocaleDateString()}.
        </p>
      )}

      <div className="pricing-page-cards">
        <Card title="Single" className="pricing-card">
          <p>1 user. Ideal for individuals.</p>
          <Button
            type="primary"
            onClick={() => handleSubscribe('single')}
            loading={checkoutLoading === 'single'}
            disabled={status?.plan === 'single' && status?.subscriptionStatus === 'active'}
          >
            {status?.plan === 'single' && status?.subscriptionStatus === 'active'
              ? 'Current plan'
              : 'Subscribe'}
          </Button>
        </Card>
        <Card title="Team" className="pricing-card">
          <p>Up to 10 users. For teams.</p>
          <Button
            type="primary"
            onClick={() => handleSubscribe('team')}
            loading={checkoutLoading === 'team'}
            disabled={status?.plan === 'team' && status?.subscriptionStatus === 'active'}
          >
            {status?.plan === 'team' && status?.subscriptionStatus === 'active'
              ? 'Current plan'
              : 'Subscribe'}
          </Button>
        </Card>
      </div>

      {showCancel && (
        <div className="pricing-page-cancel">
          <Button danger onClick={handleCancel} loading={cancelLoading}>
            Cancel subscription at period end
          </Button>
        </div>
      )}
    </div>
  );
}
