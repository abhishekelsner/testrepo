/**
 * Settings → Subscription. On free: only plan + upgrade CTA. On paid: plan, payment details, period, payment history, cancel.
 */
import { useState, useEffect } from 'react';
import { CreditCardOutlined, MailOutlined, FileTextOutlined, StopOutlined } from '@ant-design/icons';
import { get, post, ENDPOINTS } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { message, Table } from 'antd';
import './SettingsPages.css';

const PLAN_LABELS = { free: 'Free', single: 'Single', team: 'Team', business: 'Business', enterprise: 'Enterprise' };
const PLAN_MEMBER_DESC = { single: '1 member only', team: 'Up to 10 members' };
const CARD_BRAND_LABELS = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', discover: 'Discover' };

function SettingsSubscription() {
  const { user } = useAuthStore();
  const [org, setOrg] = useState(null);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const isPaid =
    billing?.subscriptionStatus === 'active' || billing?.subscriptionStatus === 'trialing';
  const planName =
    billing?.plan
      ? PLAN_LABELS[billing.plan] || billing.plan
      : org?.subscription
        ? PLAN_LABELS[org.subscription] || org.subscription
        : 'Free';
  const displayEmail = billing?.billingEmail || user?.email || '';
  const cardDisplay =
    billing?.paymentMethodBrand && billing?.paymentMethodLast4
      ? `${CARD_BRAND_LABELS[billing.paymentMethodBrand] || billing.paymentMethodBrand} ****${billing.paymentMethodLast4}`
      : null;
  const cardNumberDisplay =
    billing?.paymentMethodLast4 ? `**** **** **** ${billing.paymentMethodLast4}` : null;
  const expiryDisplay =
    billing?.paymentMethodExpMonth != null && billing?.paymentMethodExpYear != null
      ? `${String(billing.paymentMethodExpMonth).padStart(2, '0')}/${billing.paymentMethodExpYear}`
      : null;
  const nameOnCard = billing?.paymentMethodName || null;
  const periodDisplay =
    billing?.currentPeriodStart && billing?.currentPeriodEnd
      ? `${new Date(billing.currentPeriodStart).toLocaleDateString()} – ${new Date(billing.currentPeriodEnd).toLocaleDateString()}`
      : billing?.currentPeriodEnd
        ? `Ends ${new Date(billing.currentPeriodEnd).toLocaleDateString()}`
        : null;
  const expiresOnDate = billing?.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: 'long' })
    : null;
  const memberLimitDesc = billing?.plan ? PLAN_MEMBER_DESC[billing.plan] : null;
  const hasAnyPaymentDetails =
    displayEmail || nameOnCard || cardNumberDisplay || cardDisplay || expiryDisplay;

  useEffect(() => {
    Promise.all([
      get(ENDPOINTS.ORG_CURRENT).then(({ data }) => data),
      get(ENDPOINTS.BILLING_STATUS).then(({ data }) => data).catch(() => null),
    ])
      .then(([orgData, billingData]) => {
        setOrg(orgData);
        setBilling(billingData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.email]);

  const onUpgrade = () => {
    window.location.href = user?.organization?.slug
      ? `/${user.organization.slug}/pricing`
      : '/';
  };

  const onSyncPlan = () => {
    setSyncLoading(true);
    post(ENDPOINTS.BILLING_SYNC)
      .then((res) => {
        if (res.data?.ok) {
          message.success(`Plan synced: ${res.data.plan}. ${res.data.modifiedCount ? 'Database updated.' : ''}`);
          return get(ENDPOINTS.BILLING_STATUS).then((r) => setBilling(r.data));
        }
        message.info(res.data?.message || 'Nothing to sync');
      })
      .catch((err) => message.error(err.response?.data?.error || 'Sync failed'))
      .finally(() => setSyncLoading(false));
  };

  const onCancelSubscription = () => {
    setCancelLoading(true);
    post(ENDPOINTS.BILLING_CANCEL)
      .then((res) => {
        message.success(res.data?.message || 'Subscription will cancel at period end');
        setBilling((b) => (b ? { ...b, cancelAtPeriodEnd: true, currentPeriodEnd: res.data?.currentPeriodEnd } : b));
      })
      .catch((err) => message.error(err.response?.data?.error || 'Cancel failed'))
      .finally(() => setCancelLoading(false));
  };

  if (loading) {
    return (
      <div className="settings-page settings-page-subscription">
        <div className="settings-page-block">
          <p className="settings-page-subtitle">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page settings-page-subscription">
      {/* 1. Subscription overview — always shown */}
      <div className="settings-page-block">
        <div className="settings-page-block-icon">
          <CreditCardOutlined />
        </div>
        <h1 className="settings-page-title">SUBSCRIPTION</h1>
        <p className="settings-page-subtitle">
          {isPaid ? 'Manage your plan and payment details here.' : 'Upgrade to unlock more features.'}
        </p>
        <p className="settings-subscription-plan-text">
          You are currently on the <strong>{planName} plan</strong>
          {memberLimitDesc && <> — {memberLimitDesc}</>}
        </p>
        {isPaid && billing?.memberCount != null && (
          <p className="settings-subscription-plan-text" style={{ marginTop: 4 }}>
            Members: <strong>{billing.memberCount} / {billing.memberLimit}</strong>
            {billing.plan === 'single' && billing.memberLimit === 1 && ' (Single plan allows 1 person only)'}
            {billing.plan === 'team' && ' (Team plan allows up to 10 people)'}
          </p>
        )}
        {isPaid && expiresOnDate && (
          <div className="settings-subscription-expiry-box">
            <span className="settings-subscription-expiry-label">Subscription valid until</span>
            <span className="settings-subscription-expiry-value">{expiresOnDate}</span>
          </div>
        )}
        {isPaid && periodDisplay && (
          <p className="settings-subscription-plan-text" style={{ marginTop: 4 }}>
            Billing period: {periodDisplay}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {isPaid ? (
            <button type="button" className="settings-subscription-btn-primary" onClick={onUpgrade}>
              CHANGE PLAN
            </button>
          ) : (
            <button type="button" className="settings-subscription-btn-primary" onClick={onUpgrade}>
              UPGRADE
            </button>
          )}
          {/* {isPaid && (
            <button
              type="button"
              className="settings-subscription-btn-secondary"
              onClick={onSyncPlan}
              disabled={syncLoading}
            >
              {syncLoading ? 'Syncing…' : 'Sync plan from Stripe'}
            </button>
          )} */}
        </div>
      </div>

      {/* 2. Payment details — always shown when paid */}
      {isPaid && (
        <div className="settings-page-block">
          <div className="settings-page-block-icon">
            <CreditCardOutlined />
          </div>
          <h1 className="settings-page-title">PAYMENT DETAILS</h1>
          <p className="settings-page-subtitle">Billing contact and card on file</p>
          {hasAnyPaymentDetails ? (
            <>
              <div className="settings-subscription-detail-row">
                <span className="settings-subscription-detail-label">Billing email</span>
                <span className="settings-subscription-detail-value">{displayEmail || '—'}</span>
              </div>
              {nameOnCard && (
                <div className="settings-subscription-detail-row">
                  <span className="settings-subscription-detail-label">Name on card</span>
                  <span className="settings-subscription-detail-value">{nameOnCard}</span>
                </div>
              )}
              {cardNumberDisplay && (
                <div className="settings-subscription-detail-row">
                  <span className="settings-subscription-detail-label">Card number</span>
                  <span className="settings-subscription-detail-value">{cardNumberDisplay}</span>
                </div>
              )}
              {cardDisplay && (
                <div className="settings-subscription-detail-row">
                  <span className="settings-subscription-detail-label">Card type</span>
                  <span className="settings-subscription-detail-value">{cardDisplay}</span>
                </div>
              )}
              {expiryDisplay && (
                <div className="settings-subscription-detail-row">
                  <span className="settings-subscription-detail-label">Card expiry</span>
                  <span className="settings-subscription-detail-value">{expiryDisplay}</span>
                </div>
              )}
            </>
          ) : (
            <p className="settings-subscription-email-desc">
              Payment method details will appear here after your subscription is recorded. Refresh the page in a moment if you just subscribed.
            </p>
          )}
          <p className="settings-subscription-email-desc">
            This is the primary email for communication regarding your subscription.
          </p>
          <button
            type="button"
            className="settings-subscription-btn-secondary"
            onClick={() => message.info('Update billing email can be connected to your API.')}
          >
            UPDATE EMAIL
          </button>
        </div>
      )}

      {/* 3. Payment history — only when paid */}
      {isPaid && billing?.recentPayments?.length > 0 && (
        <div className="settings-page-block">
          <div className="settings-page-block-icon">
            <FileTextOutlined />
          </div>
          <h1 className="settings-page-title">PAYMENT HISTORY</h1>
          <p className="settings-page-subtitle">Recent subscription payments (saved in your account)</p>
          <Table
            dataSource={billing.recentPayments}
            rowKey="id"
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Date',
                dataIndex: 'paidAt',
                key: 'paidAt',
                render: (v) => (v ? new Date(v).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'),
              },
              {
                title: 'Amount',
                dataIndex: 'amount',
                key: 'amount',
                render: (amount, r) =>
                  amount != null
                    ? new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency: (r.currency || 'usd').toUpperCase(),
                      }).format(amount)
                    : '—',
              },
              {
                title: 'Period',
                key: 'period',
                render: (_, r) =>
                  r.periodStart && r.periodEnd
                    ? `${new Date(r.periodStart).toLocaleDateString()} – ${new Date(r.periodEnd).toLocaleDateString()}`
                    : '—',
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '—'),
              },
            ]}
          />
        </div>
      )}

      {/* 4. Cancel subscription — only when paid and not already cancelling */}
      {isPaid && !billing?.cancelAtPeriodEnd && (
        <div className="settings-page-block">
          <div className="settings-page-block-icon">
            <StopOutlined />
          </div>
          <h1 className="settings-page-title">CANCEL SUBSCRIPTION</h1>
          <p className="settings-page-subtitle">We'll be sorry to see you go.</p>
          <button
            type="button"
            className="settings-subscription-btn-cancel"
            onClick={onCancelSubscription}
            disabled={cancelLoading}
          >
            {cancelLoading ? 'Cancelling…' : 'CANCEL SUBSCRIPTION'}
          </button>
        </div>
      )}

      {isPaid && billing?.cancelAtPeriodEnd && billing?.currentPeriodEnd && (
        <div className="settings-page-block">
          <p className="settings-subscription-plan-text">
            Your subscription will end on{' '}
            <strong>{new Date(billing.currentPeriodEnd).toLocaleDateString()}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

export default SettingsSubscription;
