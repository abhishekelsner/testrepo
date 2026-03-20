/**
 * Settings → Integrations — exact match to reference: grid of tiles with logos, Zapier section, footer.
 * Logo images via Clearbit (Google-indexed brand logos).
 */
import { useState } from 'react';
import { Input } from 'antd';
import { SearchOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import './SettingsPages.css';

const CLEARBIT_LOGO = (domain) => `https://logo.clearbit.com/${domain}`;

const INTEGRATIONS_GRID = [
  { name: 'Pipedrive', category: 'CRM', domain: 'pipedrive.com', poweredBy: false },
  { name: 'Stripe', category: 'Payments', domain: 'stripe.com', poweredBy: false },
  { name: 'Slack V2', category: 'Communication', domain: 'slack.com', poweredBy: false },
  { name: 'Zoho CRM', category: 'CRM', domain: 'zoho.com', poweredBy: false },
  { name: 'Facebook', category: 'Marketing', domain: 'facebook.com', poweredBy: false },
  { name: 'Google AdWords', category: 'Marketing', domain: 'google.com', poweredBy: false },
  { name: 'AdRoll', category: 'Marketing', domain: 'adroll.com', poweredBy: false },
  { name: 'Quickbooks', category: 'Accounting', domain: 'intuit.com', poweredBy: false },
  { name: 'Salesforce', category: 'CRM', domain: 'salesforce.com', poweredBy: false },
  { name: 'HubSpot', category: 'CRM', domain: 'hubspot.com', poweredBy: false },
  { name: 'Hotjar', category: 'Screen/Video Recording', domain: 'hotjar.com', poweredBy: false },
  { name: 'FullStory', category: 'Screen/Video Recording', domain: 'fullstory.com', poweredBy: false },
  { name: 'Crazy Egg', category: 'Information / Recording', domain: 'crazyegg.com', poweredBy: false },
  { name: 'Olark', category: 'Live Chat', domain: 'olark.com', poweredBy: false },
  { name: 'Slaask', category: 'Slack', domain: 'slaask.com', poweredBy: false },
  { name: 'Crisp', category: 'Live Chat', domain: 'crisp.chat', poweredBy: false },
  { name: 'Intercom', category: 'Chat', domain: 'intercom.com', poweredBy: false },
  { name: 'Mixpanel', category: 'Analytics', domain: 'mixpanel.com', poweredBy: false },
  { name: 'Google Analytics', category: 'Analytics', domain: 'google.com', poweredBy: false },
  { name: 'Heap', category: 'Analytics', domain: 'heap.io', poweredBy: false },
  { name: 'Drift', category: 'Live Chat', domain: 'drift.com', poweredBy: false },
  { name: 'Asana', category: 'Project Management', domain: 'asana.com', poweredBy: true },
  { name: 'Airtable', category: 'Collaboration', domain: 'airtable.com', poweredBy: true },
  { name: 'Pipedrive', category: 'Project Management', domain: 'pipedrive.com', poweredBy: true, key: 'pipedrive-pm' },
  { name: 'Eventbrite', category: 'CRM', domain: 'eventbrite.com', poweredBy: true },
  { name: 'Typeform', category: 'Customer Survey', domain: 'typeform.com', poweredBy: true },
  { name: 'Dosheroo', category: 'Analytics', domain: 'dosheroo.com', poweredBy: false },
];

function TileLogo({ item }) {
  const [imgFailed, setImgFailed] = useState(false);
  const logoUrl = item.domain ? CLEARBIT_LOGO(item.domain) : null;

  if (!logoUrl || imgFailed) {
    return (
      <div className="settings-integration-tile-logo settings-integration-tile-logo-fallback">
        {item.name.charAt(0)}
      </div>
    );
  }
  return (
    <div className="settings-integration-tile-logo">
      <img src={logoUrl} alt="" onError={() => setImgFailed(true)} />
    </div>
  );
}

function SettingsIntegrations() {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? INTEGRATIONS_GRID.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.category.toLowerCase().includes(search.toLowerCase())
      )
    : INTEGRATIONS_GRID;

  const beforeZapier = filtered.slice(0, 9);
  const afterZapier = filtered.slice(9);

  return (
    <div className="settings-page settings-page-integrations">
      <h1 className="settings-page-title">INTEGRATIONS</h1>
      <p className="settings-page-subtitle">Connect Qwilr with the tools you already use</p>

      <div className="settings-integrations-bar">
        <Input
          prefix={<SearchOutlined />}
          placeholder="Q search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="settings-integrations-search"
        />
        <button type="button" className="settings-integrations-filter-btn">
          FILTER INTEGRATIONS <DownOutlined style={{ fontSize: 10 }} />
        </button>
      </div>

      <div className="settings-integrations-grid">
        {beforeZapier.map((item) => (
          <div key={item.key || item.name + item.category} className="settings-integration-tile">
            <TileLogo item={item} />
            <div className="settings-integration-tile-name">{item.name}</div>
            <div className="settings-integration-tile-category">{item.category}</div>
            {item.poweredBy && (
              <div className="settings-integration-tile-powered">Powered by Qwilr</div>
            )}
          </div>
        ))}
      </div>

      <div className="settings-integrations-zapier">
        <div className="settings-integrations-zapier-left">
          <img
            src={CLEARBIT_LOGO('zapier.com')}
            alt=""
            className="settings-integrations-zapier-img"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="settings-integrations-zapier-logo-text">zapier</span>
        </div>
        <div className="settings-integrations-zapier-right">
          <h3 className="settings-integrations-zapier-title">
            Connect with your existing tools and automate workflows
          </h3>
          <p className="settings-integrations-zapier-desc">
            Save time with and automate everything workflow with Zapier. Sync information between
            apps in real-time. So you can focus on the work that matters.
          </p>
          <button type="button" className="settings-integrations-zapier-btn">
            EXPLORE <RightOutlined />
          </button>
        </div>
      </div>

      <div className="settings-integrations-grid">
        {afterZapier.map((item) => (
          <div key={item.key || item.name + item.category} className="settings-integration-tile">
            <TileLogo item={item} />
            <div className="settings-integration-tile-name">{item.name}</div>
            <div className="settings-integration-tile-category">{item.category}</div>
            {item.poweredBy && (
              <div className="settings-integration-tile-powered">Powered by Qwilr</div>
            )}
          </div>
        ))}
      </div>

      <footer className="settings-integrations-footer">
        Are we missing something? Feel free to{' '}
        <a href="#" className="settings-integrations-footer-link">reach out</a>
        {' '}and let us know what we can do to improve our Integrations.
      </footer>
    </div>
  );
}

export default SettingsIntegrations;
