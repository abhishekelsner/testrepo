/**
 * Library dropdown panel — exact copy of reference: Blocks, Themes, Automations, Templates, Engagement scores, Payments, Agreements.
 */
import { Link, useParams } from 'react-router-dom';
import {
  AppstoreOutlined,
  BgColorsOutlined,
  // ThunderboltOutlined, // Automations (commented)
  FileTextOutlined,
  // BarChartOutlined, // Engagement scores (commented)
  // CreditCardOutlined, // Payments (commented)
  FileDoneOutlined,
} from '@ant-design/icons';
import './LibraryDropdown.css';

const LIBRARY_ITEMS = [
  { key: 'blocks', title: 'Blocks', description: 'Reusable content blocks', icon: <AppstoreOutlined />, path: 'proposals' },
  { key: 'themes', title: 'Themes', description: 'Manage your branding and styles', icon: <BgColorsOutlined />, path: 'settings/brand' },
  // { key: 'automations', title: 'Automations', description: 'Automate workflows', icon: <ThunderboltOutlined />, path: '#' },
  { key: 'templates', title: 'Templates', description: 'Create and manage templates', icon: <FileTextOutlined />, path: 'templates' },
  // { key: 'engagement', title: 'Engagement scores', description: 'Monitor page engagement', icon: <BarChartOutlined />, path: '#' },
  // { key: 'payments', title: 'Payments', description: 'Manage one off and recurring payments', icon: <CreditCardOutlined />, path: '#' },
];
const AGREEMENTS_ITEM = { key: 'agreements', title: 'Agreements', description: 'Create and manage agreements and contracts', icon: <FileDoneOutlined />, path: '/' };

function LibraryDropdown({ visible, onClose }) {
  const { orgSlug } = useParams();
  if (!visible) return null;

  return (
    <>
      <div className="library-dropdown-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="library-dropdown-panel">
        <div className="library-dropdown-grid">
          {LIBRARY_ITEMS.map((item) => {
            const linkPath = item.path === 'templates' ? `/${orgSlug}/templates` : item.path === 'settings/brand' ? `/${orgSlug}/settings/brand` : null;
            return linkPath ? (
              <Link
                key={item.key}
                to={linkPath}
                className="library-dropdown-item"
                onClick={onClose}
              >
                <span className="library-dropdown-icon">{item.icon}</span>
                <div className="library-dropdown-text">
                  <span className="library-dropdown-title">{item.title}</span>
                  <span className="library-dropdown-desc">{item.description}</span>
                </div>
              </Link>
            ) : (
              <div key={item.key} className="library-dropdown-item library-dropdown-item-disabled">
                <span className="library-dropdown-icon">{item.icon}</span>
                <div className="library-dropdown-text">
                  <span className="library-dropdown-title">{item.title}</span>
                  <span className="library-dropdown-desc">{item.description}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="library-dropdown-sep" />
        <div className="library-dropdown-item library-dropdown-item-full library-dropdown-item-disabled">
          <span className="library-dropdown-icon">{AGREEMENTS_ITEM.icon}</span>
          <div className="library-dropdown-text">
            <span className="library-dropdown-title">{AGREEMENTS_ITEM.title}</span>
            <span className="library-dropdown-desc">{AGREEMENTS_ITEM.description}</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default LibraryDropdown;
