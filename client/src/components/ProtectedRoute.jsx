import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute({ children }) {
  const { user, loading, loadUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!user && localStorage.getItem('accessToken')) {
      loadUser();
    }
  }, [user, loadUser]);

  // Only show full-page loading when we have a token but no user yet (initial load or refetch)
  const hasToken = !!localStorage.getItem('accessToken');
  if (loading && hasToken && !user) {
    return (
      <div className="app-page-fallback">
        <Spin size="large" />
      </div>
    );
  }

  if (!user && !hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
