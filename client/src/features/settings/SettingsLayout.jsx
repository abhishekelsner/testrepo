/**
 * Settings layout — exact copy of reference: SETTINGS header, left sidebar (ACCOUNT, INTEGRATIONS, BRAND & APPEARANCE), main content.
 */
import { Layout, Dropdown } from 'antd';
import { Link, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { DownOutlined } from '@ant-design/icons';
import {
  BankOutlined,
  UserOutlined,
  TeamOutlined,
  CreditCardOutlined,
  LockOutlined,
  BellOutlined,
  ApiOutlined,
  BarChartOutlined,
  BgColorsOutlined,
  GlobalOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import Logo from '../../components/Logo';
import './SettingsLayout.css';

const { Header, Content } = Layout;

const SIDEBAR_WIDTH = 280;

const ACCOUNT_ITEMS = [
  { key: 'account', path: 'account', label: 'Account', sub: 'Company name and account settings', icon: <BankOutlined /> },
  { key: 'profile', path: 'profile', label: 'Profile', sub: 'Manage names, email and password', icon: <UserOutlined /> },
  { key: 'team', path: 'team', label: 'Team', sub: 'Invite team members to share and collaborate', icon: <TeamOutlined /> },
  { key: 'subscription', path: 'subscription', label: 'Subscription', sub: 'Manage your plan and credit cards', icon: <CreditCardOutlined /> },
  // { key: 'security', path: 'security', label: 'Security', sub: 'Manage the safety and security of your account', icon: <LockOutlined /> },
  { key: 'notifications', path: 'notifications', label: 'Notifications', sub: 'Adjust your notifications', icon: <BellOutlined /> },
];

const INTEGRATIONS_ITEMS = [
  { key: 'integrations', path: 'integrations', label: 'Integrations', sub: 'Connect Qwilr to other software', icon: <ApiOutlined /> },
  { key: 'analytics', path: 'analytics', label: 'Analytics & Reporting', sub: 'Manage settings for metrics in analytics and reports', icon: <BarChartOutlined /> },
];

const BRAND_ITEMS = [
  { key: 'brand', path: 'brand', label: 'Brand Editor', sub: 'Set up your brand style and permissions', icon: <BgColorsOutlined /> },
  // { key: 'subdomain', path: 'subdomain', label: 'Subdomain', sub: 'Manage your subdomain', icon: <GlobalOutlined /> },
  // { key: 'custom-domain', path: 'custom-domain', label: 'Custom Domain', sub: 'Setup your custom domain', icon: <LinkOutlined /> },
  // { key: 'link-preview', path: 'link-preview', label: 'Link Preview', sub: 'Change how your pages are previewed', icon: <LinkOutlined /> },
];

const CREATOR_ONLY_SETTINGS = ['profile'];

function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { orgSlug } = useParams();
  const { user, logout } = useAuthStore();

  const role = user?.role || '';
  const isCreator = role === 'Creator';

  const expectedSlug = user?.organization?.slug;
  if (expectedSlug && orgSlug !== expectedSlug) {
    return <Navigate to={`/${expectedSlug}/settings/${isCreator ? 'profile' : 'account'}`} replace />;
  }

  const base = `/${orgSlug}/settings`;
  const currentPath = location.pathname.split('/settings/')[1]?.split('/')[0] || 'account';

  /* Creator can only access Profile; redirect to profile if they hit any other settings path */
  if (isCreator && !CREATOR_ONLY_SETTINGS.includes(currentPath)) {
    return <Navigate to={`${base}/profile`} replace />;
  }

  const visibleAccountItems = isCreator
    ? ACCOUNT_ITEMS.filter((item) => item.key === 'profile')
    : ACCOUNT_ITEMS;
  const visibleIntegrationsItems = isCreator ? [] : INTEGRATIONS_ITEMS;
  const visibleBrandItems = isCreator ? [] : BRAND_ITEMS;

  const userMenuItems = [
    { key: 'logout', label: 'Log out', onClick: () => logout().then(() => navigate('/login')) },
  ];

  const initials = (user?.name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const renderNavItem = (item) => {
    const isActive = currentPath === item.path;
    return (
      <Link
        key={item.key}
        to={`${base}/${item.path}`}
        className={`settings-nav-item ${isActive ? 'active' : ''}`}
      >
        <span className="settings-nav-icon">{item.icon}</span>
        <div className="settings-nav-text">
          <span className="settings-nav-label">{item.label}</span>
          <span className="settings-nav-sub">{item.sub}</span>
        </div>
      </Link>
    );
  };

  return (
    <Layout className="settings-layout">
      <Header className="settings-header">
        <div className="settings-header-left">
          <Link to={`/${orgSlug}/dashboard`} className="settings-header-logo">
            <Logo size="small" />
          </Link>
          <span className="settings-header-title">SETTINGS</span>
        </div>
        <div className="settings-header-right">
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
            <button type="button" className="settings-header-user">
              <span className="settings-header-avatar">{initials}</span>
              <DownOutlined className="settings-header-avatar-caret" />
            </button>
          </Dropdown>
        </div>
      </Header>
      <Layout className="settings-body">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-section">
            <div className="settings-sidebar-heading">ACCOUNT</div>
            {visibleAccountItems.map(renderNavItem)}
          </div>
          {/* {visibleIntegrationsItems.length > 0 && (
            <div className="settings-sidebar-section">
              <div className="settings-sidebar-heading">INTEGRATIONS</div>
              {visibleIntegrationsItems.map(renderNavItem)}
            </div>
          )} */}
          {/* {visibleBrandItems.length > 0 && (
            <div className="settings-sidebar-section">
              <div className="settings-sidebar-heading">BRAND & APPEARANCE</div>
              {visibleBrandItems.map(renderNavItem)}
            </div>
          )} */}
        </aside>
        <Content className="settings-content">
          <Outlet />
          <a href="#" className="settings-help-float" aria-label="Help">? HELP</a>
        </Content>
      </Layout>
    </Layout>
  );
}

export default SettingsLayout;
