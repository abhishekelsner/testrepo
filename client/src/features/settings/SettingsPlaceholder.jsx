/**
 * Placeholder for settings sections (Subscription, Security, API, Brand, etc.).
 */
import { useLocation } from 'react-router-dom';
import './SettingsPages.css';

function SettingsPlaceholder() {
  const path = useLocation().pathname.split('/').pop() || 'settings';
  const title = path.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="settings-page">
      <h1 className="settings-page-title">{title.toUpperCase()}</h1>
      <p className="settings-page-subtitle">This section is under construction. Add content when you have the design.</p>
    </div>
  );
}

export default SettingsPlaceholder;
