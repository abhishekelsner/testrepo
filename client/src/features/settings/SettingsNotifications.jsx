/**
 * Settings → Notifications — placeholder (Engagement, Viewership, Transaction events per reference).
 */
import { Switch, Button } from 'antd';
import { BellOutlined, EyeOutlined, DollarOutlined } from '@ant-design/icons';
import './SettingsPages.css';

function SettingsNotifications() {
  return (
    <div className="settings-page">
      <div className="settings-page-hero">
        <div className="settings-page-hero-icon"><BellOutlined /></div>
        <h1 className="settings-page-title">NOTIFICATIONS</h1>
        <p className="settings-page-subtitle">Choose which notifications you will receive for your pages. For more information visit the <a href="#">notifications help docs</a>.</p>
      </div>

      <div className="settings-page-card">
        <div className="settings-page-card-header">
          <span className="settings-page-card-icon"><BellOutlined /></span>
          <div>
            <h2 className="settings-page-card-title">Engagement events</h2>
            <p className="settings-page-card-desc">Get notified when your pages are engaged with</p>
          </div>
          <Button type="link" className="settings-page-card-action">Disable all</Button>
        </div>
        <div className="settings-page-card-body">
          <div className="settings-page-toggle-row"><span>Comment added or resolved</span><Switch defaultChecked /></div>
          <div className="settings-page-toggle-row"><span>Page engagement level changed</span><Switch defaultChecked /></div>
        </div>
      </div>

      <div className="settings-page-card">
        <div className="settings-page-card-header">
          <span className="settings-page-card-icon"><EyeOutlined /></span>
          <div>
            <h2 className="settings-page-card-title">Viewership events</h2>
            <p className="settings-page-card-desc">Who is viewing your pages</p>
          </div>
          <Button type="link" className="settings-page-card-action">Disable all</Button>
        </div>
        <div className="settings-page-card-body">
          <div className="settings-page-toggle-row"><span>Page viewed</span><Switch defaultChecked /></div>
          <div className="settings-page-toggle-row"><span>User identified</span><Switch defaultChecked /></div>
        </div>
      </div>

      <div className="settings-page-card">
        <div className="settings-page-card-header">
          <span className="settings-page-card-icon"><DollarOutlined /></span>
          <div>
            <h2 className="settings-page-card-title">Transaction events</h2>
            <p className="settings-page-card-desc">Pricing, e-sign and payment interactions</p>
          </div>
          <Button type="link" className="settings-page-card-action">Enable all</Button>
        </div>
        <div className="settings-page-card-body">
          <div className="settings-page-toggle-row"><span>Page accepted</span><span className="settings-page-badge">ENABLED</span></div>
          <div className="settings-page-toggle-row"><span>Accept process stalled</span><Switch defaultChecked /></div>
        </div>
      </div>
    </div>
  );
}

export default SettingsNotifications;
