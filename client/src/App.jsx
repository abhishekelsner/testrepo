import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { ProtectedRoute } from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import { useAuthStore } from './store/authStore';
import { SearchProvider } from './context/SearchContext';
import { FolderMoveProvider } from './context/FolderMoveContext';
import { FoldersProvider } from './context/FoldersContext';

// Full-viewport fallback so route change / lazy load never shows white screen
const PageFallback = () => (
  <div className="app-page-fallback">
    <Spin size="large" />
  </div>
);

function RedirectToOrgDashboard() {
  const user = useAuthStore((s) => s.user);
  const slug = user?.organization?.slug;
  if (!slug) return <Navigate to="/login" replace />;
  return <Navigate to={`/${slug}/dashboard`} replace />;
}

function IndexRedirect() {
  const { orgSlug } = useParams();
  return <Navigate to={`/${orgSlug}/dashboard`} replace />;
}

// ── Eager-loaded: no white blink on login, signup, forgot-password, or app shell ─
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import VerifyEmailPending from './features/auth/VerifyEmailPending';
import VerifyEmail from './features/auth/VerifyEmail';
import ForgotPassword from './features/auth/ForgotPassword';
import ResetPassword from './features/auth/ResetPassword';
import ChangePassword from './features/auth/ChangePassword';
import Dashboard from './features/dashboard/Dashboard';
import TemplatesList from './features/templates/TemplatesList';
import SettingsProfile from './features/settings/SettingsProfile';

// ── Lazy-loaded (less frequent) ─────────────────────────────────────────────
const AuditLogs      = lazy(() => import('./features/audit/AuditLogs'));
const Organizations  = lazy(() => import('./features/organizations/Organizations'));
const SentProposals = lazy(() => import('./features/proposals/SentProposals'));
const Deleted = lazy(() => import('./features/dashboard/Deleted'));

const ProposalEditor = lazy(() => import('./features/proposals/ProposalEditor'));
const PublicProposalView = lazy(() => import('./features/proposals/PublicProposalView'));

const SettingsLayout = lazy(() => import('./features/settings/SettingsLayout'));
const SettingsAccount = lazy(() => import('./features/settings/SettingsAccount'));
const SettingsTeam = lazy(() => import('./features/settings/SettingsTeam'));
const SettingsNotifications = lazy(() => import('./features/settings/SettingsNotifications'));
const SettingsIntegrations = lazy(() => import('./features/settings/SettingsIntegrations'));
const SettingsSubscription = lazy(() => import('./features/settings/SettingsSubscription'));
const SettingsSecurity = lazy(() => import('./features/settings/SettingsSecurity'));
const PricingPage = lazy(() => import('./features/billing/PricingPage'));
const SuccessPage = lazy(() => import('./features/billing/SuccessPage'));
const SettingsBrand = lazy(() => import('./features/settings/SettingsBrand'));
const SettingsAnalytics = lazy(() => import('./features/settings/SettingsAnalytics'));
const SettingsPlaceholder = lazy(() => import('./features/settings/SettingsPlaceholder'));
const PipelineReport = lazy(() => import('./features/reports/PipelineReport'));
const Contracts = lazy(() => import('./features/contracts/Contracts'));

function App() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* ── Public auth routes ─────────────────────────────────────── */}
          <Route path="/login"                element={<Login />} />
          <Route path="/register"             element={<Register />} />
          <Route path="/verify-email-pending" element={<VerifyEmailPending />} />
          <Route path="/verify-email"         element={<VerifyEmail />} />
          <Route path="/forgot-password"      element={<ForgotPassword />} />
          <Route path="/reset-password"       element={<ResetPassword />} />

          {/* ── Billing: success/cancel (after Stripe redirect) ─────── */}
          <Route path="/success" element={<ProtectedRoute><SuccessPage /></ProtectedRoute>} />
          <Route path="/cancel"  element={<ProtectedRoute><Navigate to="/" replace /></ProtectedRoute>} />
          <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

          {/* ── Public proposal view (no auth): /view?id=<opaque or raw id> or /view/:slug ── */}
          <Route path="/view"                  element={<PublicProposalView />} />
          <Route path="/view/:slug"            element={<PublicProposalView />} />

          {/* ── Root: redirect to org dashboard ───────────────────────── */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RedirectToOrgDashboard />
              </ProtectedRoute>
            }
          />

          {/* ── Org-scoped: AppLayout or SettingsLayout ── */}
          <Route path="/:orgSlug" element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="account" replace />} />
              <Route path="account" element={<SettingsAccount />} />
              <Route path="profile" element={<SettingsProfile />} />
              <Route path="team" element={<SettingsTeam />} />
              <Route path="subscription" element={<SettingsSubscription />} />
              <Route path="security" element={<SettingsSecurity />} />
              <Route path="notifications" element={<SettingsNotifications />} />
              <Route path="integrations" element={<SettingsIntegrations />} />
              <Route path="analytics" element={<SettingsAnalytics />} />
              <Route path="subdomain" element={<SettingsPlaceholder />} />
              <Route path="custom-domain" element={<SettingsPlaceholder />} />
              <Route path="link-preview" element={<SettingsPlaceholder />} />
            </Route>
            {/* Brand editor — full-page, no sidebar */}
            <Route path="settings/brand" element={<SettingsBrand />} />
            <Route element={<SearchProvider><FolderMoveProvider><FoldersProvider><AppLayout /></FoldersProvider></FolderMoveProvider></SearchProvider>}>
              <Route index element={<IndexRedirect />} />
              <Route path="dashboard"              element={<Dashboard />} />
              <Route path="audit"                  element={<AuditLogs />} />
              <Route path="organizations"          element={<Organizations />} />
              <Route path="templates"              element={<TemplatesList />} />
              <Route path="templates/:id/edit"     element={<ProposalEditor mode="template" />} />
              <Route path="proposals/:id/edit"     element={<ProposalEditor mode="proposal" />} />
              <Route path="reports"                element={<PipelineReport />} />
              <Route path="contracts"              element={<Contracts />} />
              <Route path="pricing"                 element={<PricingPage />} />
              <Route path="sent-proposals"         element={<SentProposals />} />
              <Route path="deleted"                  element={<Deleted />} />
            </Route>
          </Route>

          {/* ── Fallback ──────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
