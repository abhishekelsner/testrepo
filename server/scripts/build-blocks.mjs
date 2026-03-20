/**
 * Build the updated blocks JSON and PUT it to the running API.
 */
import https from 'https';
import http from 'http';

const TOKEN = process.argv[2];
const PROPOSAL_ID = '69b93884ecfecbcb1ea0f63f';

const cl = (domain, size = 80) => `https://logo.clearbit.com/${domain}?size=${size}`;

const blocks = [
  // 0 ── Hero banner
  {
    id: 'b-0', order: 0, type: 'html',
    content: {
      html: `<div style="background:linear-gradient(135deg,#0a1628 0%,#1a3a6c 55%,#0a1628 100%);color:#fff;padding:56px 40px 48px;text-align:center;position:relative;border-radius:8px;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;">
    <img src="${cl('elsner.com', 140)}" alt="ELSNER" height="36" style="max-height:36px;object-fit:contain;filter:brightness(0) invert(1);" onerror="this.outerHTML='<span style=&quot;font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#fff;&quot;>&#8734;&#8734; ELSNER</span>'"/>
    <a href="#agreement" style="border:1px solid rgba(255,255,255,0.4);color:#fff;padding:7px 18px;border-radius:4px;text-decoration:none;font-size:12px;font-weight:600;">Get Agreement</a>
  </div>
  <h1 style="font-size:38px;font-weight:600;color:#fff;margin:0 0 10px;line-height:1.25;">SEO Contract for {{Client Name}}</h1>
  <p style="color:rgba(255,255,255,0.55);font-size:13px;margin:0;">{{Client Website}}</p>
</div>`,
    },
  },

  // 1 ── Project Scope heading
  { id: 'b-1', order: 1, type: 'heading', content: { level: 2, text: 'Project Scope' } },

  // 2 ── Scope text
  {
    id: 'b-2', order: 2, type: 'text',
    content: {
      text: "What's Included:\n• Targeting {{Keywords Count}} keywords ({{Primary Count}} primary + {{Secondary Count}} secondary)\n• {{Optimized Pages}} optimized pages per month\n\nAdvanced SEO audit with strategy (Month 1):\n• Complete SEO setup – Google Search Console, Google Analytics, keyword mapping, baseline report, competitor analysis\n• Technical SEO optimization – sitemap, robots.txt, schema, site architecture, speed & Core Web Vitals improvements, mobile & SSL checks\n• On-page SEO – title tags, meta descriptions, header structure, URL structure, internal linking, duplicate content fixes, image optimization\n• Content marketing – 2 blog articles, 4 meta page content pieces, and 8 off-site content submissions per month\n• Link building & authority development – guest posts, niche benchmarking, business profiles, classified submissions, competitor backlinks\n• Quarterly backlink audit and ongoing link monitoring\n• Advanced Google Business Profile optimization\n• Monthly performance reports – keyword ranking, competitor tracking, search visibility, traffic insights, and backlink reports\n• Dedicated support via email, chat, and phone\n\nNote:\n• If the task list provided to the client is not completed in the current support hours, the client needs to purchase a new support package.\n• This document will be considered as a master agreement for the services; any renewal for the mentioned services will also be considered under the same contract.",
    },
  },

  // 3 ── Divider
  { id: 'b-3', order: 3, type: 'divider', content: {} },

  // 4 ── Cost heading
  { id: 'b-4', order: 4, type: 'heading', content: { level: 2, text: 'Time and Cost Estimation of the Project' } },

  // 5 ── Cost table
  {
    id: 'b-5', order: 5, type: 'html',
    content: {
      html: `<table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
  <tbody>
    <tr style="border-bottom:1px solid #e8e8e8;"><td style="padding:13px 18px;color:#6b6b6b;width:45%;">Package Cost</td><td style="padding:13px 18px;font-weight:600;color:#1a1a1a;">$1500 USD</td></tr>
    <tr style="border-bottom:1px solid #e8e8e8;background:#fafafa;"><td style="padding:13px 18px;color:#6b6b6b;">Discount</td><td style="padding:13px 18px;font-weight:600;color:#1a1a1a;">10%</td></tr>
    <tr style="border-bottom:1px solid #e8e8e8;"><td style="padding:13px 18px;color:#6b6b6b;">Total Package Cost</td><td style="padding:13px 18px;font-weight:600;color:#1a1a1a;">$1350 USD + Taxes</td></tr>
    <tr style="background:#fafafa;"><td style="padding:13px 18px;color:#6b6b6b;">Package Validity</td><td style="padding:13px 18px;font-weight:600;color:#1a1a1a;">1 Month (Auto renewed and terminated)</td></tr>
  </tbody>
</table>`,
    },
  },

  // 6 ── Divider
  { id: 'b-6', order: 6, type: 'divider', content: {} },

  // 7 ── Milestone heading
  { id: 'b-7', order: 7, type: 'heading', content: { level: 2, text: 'Milestone Payment Details and Terms' } },

  // 8 ── Payment table
  {
    id: 'b-8', order: 8, type: 'html',
    content: {
      html: `<table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
  <thead>
    <tr style="background:#f5f5f5;border-bottom:2px solid #e0e0e0;">
      <th style="padding:12px 16px;text-align:left;font-weight:700;color:#1a1a1a;font-size:12px;">Amount (USD)</th>
      <th style="padding:12px 16px;text-align:left;font-weight:700;color:#1a1a1a;font-size:12px;">Description</th>
      <th style="padding:12px 16px;text-align:left;font-weight:700;color:#1a1a1a;font-size:12px;">Invoice Date</th>
      <th style="padding:12px 16px;text-align:left;font-weight:700;color:#1a1a1a;font-size:12px;">Payment Due date</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:13px 16px;color:#2c2c2c;">$1350 + Taxes</td>
      <td style="padding:13px 16px;color:#2c2c2c;">100% Before Month Starts</td>
      <td style="padding:13px 16px;color:#2c2c2c;">20 March 2026</td>
      <td style="padding:13px 16px;color:#2c2c2c;">25 March 2026</td>
    </tr>
  </tbody>
</table>`,
    },
  },

  // 9 ── Payment terms
  {
    id: 'b-9', order: 9, type: 'text',
    content: {
      text: "• The invoice will be issued and paid in advance of every month.\n• If the invoice is not paid in 30 days from the date of invoice, then 50% of that invoice is levied as Late Payment Activity charges per day.\n• By entering into an agreement with Elsner Technologies Pvt Ltd, the client acknowledges and agrees to the non-refundable nature of the service fees.",
    },
  },

  // 10 ── Divider
  { id: 'b-10', order: 10, type: 'divider', content: {} },

  // 11 ── Securing heading
  { id: 'b-11', order: 11, type: 'heading', content: { level: 2, text: 'Securing the deal: price validity and contract terms' } },

  // 12 ── Securing text
  {
    id: 'b-12', order: 12, type: 'text',
    content: {
      text: "• The quoted price in this contract will remain valid until {{Validity Date}}. If the contract is not agreed on or before this date, we will need to reevaluate the estimate provided.\n• Once the client is in agreement for the mentioned service/s, the price may be subject to fluctuations or adjustments based on certain factors and negotiations.\n• To uphold the level of excellence in our service provision, it is customary to sign a renewal contract or agreement on an annual basis. This ensures the ongoing commitment to honor and deliver our services.",
    },
  },

  // 13 ── We are ELSNER! banner
  {
    id: 'b-13', order: 13, type: 'html',
    content: {
      html: `<div style="background:linear-gradient(135deg,#0a1628 0%,#1a3a6c 55%,#0a1628 100%);color:#fff;padding:72px 40px;text-align:center;border-radius:8px;margin:8px 0;">
  <h2 style="font-size:52px;font-weight:800;color:#fff;margin:0;letter-spacing:-1px;">We are <span style="color:#5b9af5;">ELSNER!</span></h2>
</div>`,
    },
  },

  // 14 ── About us heading
  { id: 'b-14', order: 14, type: 'heading', content: { level: 2, text: 'About us' } },

  // 15 ── About us text
  {
    id: 'b-15', order: 15, type: 'text',
    content: {
      text: 'Elsner is a full-fledged IT service-driven company providing Precise web development and Mobile Development services.\n\nA software development company that will help your business grow.',
    },
  },

  // 16 ── About us logos (clients + toolstack)
  {
    id: 'b-16', order: 16, type: 'html',
    content: {
      html: `<div>
  <p style="font-size:11px;font-weight:700;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 16px;">Trusted by our companies</p>
  <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-bottom:28px;">
    <div style="padding:10px 16px;border:1px solid #e8e8e8;border-radius:6px;display:flex;align-items:center;justify-content:center;min-width:80px;min-height:44px;background:#fff;">
      <img src="${cl('nestle.com', 120)}" alt="Nestlé" height="28" style="max-height:28px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:12px;font-weight:700;color:#1a1a1a;&quot;>Nestlé</span>'"/>
    </div>
    <div style="padding:10px 16px;border:1px solid #e8e8e8;border-radius:6px;display:flex;align-items:center;justify-content:center;min-width:80px;min-height:44px;background:#fff;">
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/UN_emblem_blue.svg/80px-UN_emblem_blue.svg.png" alt="United Nations" height="32" style="max-height:32px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:11px;font-weight:700;color:#4169e1;&quot;>United Nations</span>'"/>
    </div>
    <div style="padding:10px 16px;border:1px solid #e8e8e8;border-radius:6px;display:flex;align-items:center;justify-content:center;min-width:80px;min-height:44px;background:#fff;">
      <img src="${cl('crompton.co.in', 120)}" alt="Crompton" height="28" style="max-height:28px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:12px;font-weight:700;color:#1a1a1a;&quot;>Crompton</span>'"/>
    </div>
    <div style="padding:10px 16px;border:1px solid #e34324;background:#e34324;border-radius:6px;display:flex;align-items:center;justify-content:center;min-width:80px;min-height:44px;">
      <span style="font-size:13px;font-weight:800;color:#fff;letter-spacing:0.5px;">ATBCO</span>
    </div>
    <div style="padding:10px 16px;border:1px solid #e8e8e8;border-radius:6px;display:flex;align-items:center;justify-content:center;min-width:80px;min-height:44px;background:#fff;">
      <img src="${cl('kuchel.de', 120)}" alt="Közhiel" height="28" style="max-height:28px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:13px;font-weight:700;color:#2c3e50;&quot;>Közhiel</span>'"/>
    </div>
    <div style="padding:10px 16px;border:1px solid #e8e8e8;border-radius:6px;display:flex;align-items:center;justify-content:center;min-width:80px;min-height:44px;background:#fff;">
      <img src="${cl('mensa.org', 120)}" alt="MENSA" height="28" style="max-height:28px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:13px;font-weight:800;color:#c0392b;&quot;>MENSA</span>'"/>
    </div>
    <div style="padding:10px 16px;border:1px solid #e8e8e8;border-radius:6px;display:flex;align-items:center;justify-content:center;min-width:80px;min-height:44px;background:#fff;">
      <img src="${cl('sanremo.com.au', 120)}" alt="SANREMO" height="28" style="max-height:28px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:13px;font-weight:700;color:#1a1a1a;&quot;>SANREMO</span>'"/>
    </div>
    <div style="padding:10px 16px;border:1px solid #e8e8e8;border-radius:6px;display:flex;align-items:center;justify-content:center;min-width:80px;min-height:44px;background:#fff;">
      <img src="${cl('nustone.co.uk', 120)}" alt="nustone" height="28" style="max-height:28px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:13px;font-weight:700;color:#1a6b3c;&quot;>nustone</span>'"/>
    </div>
  </div>
  <p style="font-size:11px;font-weight:700;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Use toolstack</p>
  <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
    <div style="padding:8px 16px;background:#fff7f5;border:1px solid #fde8e0;border-radius:6px;display:flex;align-items:center;gap:8px;">
      <img src="${cl('laravel.com', 50)}" alt="Laravel" height="20" style="max-height:20px;object-fit:contain;" onerror="this.style.display='none'"/>
      <span style="font-size:12px;font-weight:600;color:#ff2d20;">Laravel</span>
    </div>
    <div style="padding:8px 16px;background:#f5f8ff;border:1px solid #dde8f8;border-radius:6px;display:flex;align-items:center;gap:8px;">
      <img src="${cl('wordpress.com', 50)}" alt="WordPress" height="20" style="max-height:20px;object-fit:contain;" onerror="this.style.display='none'"/>
      <span style="font-size:12px;font-weight:600;color:#21759b;">WordPress</span>
    </div>
    <div style="padding:8px 16px;background:#f5fff7;border:1px solid #c3e6cc;border-radius:6px;display:flex;align-items:center;gap:8px;">
      <img src="${cl('shopify.com', 50)}" alt="Shopify" height="20" style="max-height:20px;object-fit:contain;" onerror="this.style.display='none'"/>
      <span style="font-size:12px;font-weight:600;color:#96bf48;">Shopify</span>
    </div>
    <div style="padding:8px 16px;background:#fff8f0;border:1px solid #f5d5b0;border-radius:6px;display:flex;align-items:center;gap:8px;">
      <img src="${cl('magento.com', 50)}" alt="Magento" height="20" style="max-height:20px;object-fit:contain;" onerror="this.style.display='none'"/>
      <span style="font-size:12px;font-weight:600;color:#f06a25;">Magento</span>
    </div>
    <div style="padding:8px 16px;background:#f5f7ff;border:1px solid #d0d8f5;border-radius:6px;display:flex;align-items:center;gap:8px;">
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/PHP-logo.svg/80px-PHP-logo.svg.png" alt="PHP" height="20" style="max-height:20px;object-fit:contain;" onerror="this.style.display='none'"/>
      <span style="font-size:12px;font-weight:600;color:#777bb4;">PHP</span>
    </div>
    <div style="padding:8px 16px;background:#f0f9ff;border:1px solid #b8e0f7;border-radius:6px;display:flex;align-items:center;gap:8px;">
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/80px-React-icon.svg.png" alt="React" height="20" style="max-height:20px;object-fit:contain;" onerror="this.style.display='none'"/>
      <span style="font-size:12px;font-weight:600;color:#61dafb;">React</span>
    </div>
    <div style="padding:8px 16px;background:#f5fff5;border:1px solid #c3e8c3;border-radius:6px;display:flex;align-items:center;gap:8px;">
      <img src="${cl('nodejs.org', 50)}" alt="Node.js" height="20" style="max-height:20px;object-fit:contain;" onerror="this.style.display='none'"/>
      <span style="font-size:12px;font-weight:600;color:#339933;">Node.js</span>
    </div>
  </div>
</div>`,
    },
  },

  // 17 ── Our Ventures heading
  { id: 'b-17', order: 17, type: 'heading', content: { level: 2, text: 'Our Ventures' } },

  // 18 ── Our Ventures logos
  {
    id: 'b-18', order: 18, type: 'html',
    content: {
      html: `<div>
  <p style="font-size:14px;color:#5c5c5c;line-height:1.65;margin:0 0 22px;">Technology is all about bringing convenience to people's lives. Here are some of the other ventures that we are successfully operating and giving new dimensions to the world.</p>
  <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:center;">
    <div style="padding:16px 28px;border:2px solid #e8e8e8;border-radius:10px;display:flex;align-items:center;justify-content:center;min-width:130px;min-height:64px;background:#fff;">
      <img src="https://www.ecomva.com/wp-content/uploads/2021/02/logo-ecomva.png" alt="ECOMVA" height="34" style="max-height:34px;max-width:120px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:16px;font-weight:800;color:#e85c3a;&quot;>ECOMVA</span>'"/>
    </div>
    <div style="padding:16px 28px;border:2px solid #e8e8e8;border-radius:10px;display:flex;align-items:center;justify-content:center;min-width:130px;min-height:64px;background:#fff;">
      <img src="${cl('linkpublishers.com', 160)}" alt="link Publishers" height="34" style="max-height:34px;max-width:140px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:14px;font-weight:700;color:#e74c3c;&quot;>link Publishers</span>'"/>
    </div>
    <div style="padding:16px 28px;border:2px solid #e8e8e8;border-radius:10px;display:flex;align-items:center;justify-content:center;min-width:130px;min-height:64px;background:#fff;">
      <img src="${cl('weekmate.io', 160)}" alt="WeekMate" height="34" style="max-height:34px;max-width:140px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:14px;font-weight:700;color:#3498db;&quot;>WeekMate</span>'"/>
    </div>
    <div style="padding:16px 28px;border:2px solid #e8e8e8;border-radius:10px;display:flex;align-items:center;justify-content:center;min-width:110px;min-height:64px;background:#fff;">
      <img src="${cl('maiq.com', 140)}" alt="maiq" height="34" style="max-height:34px;max-width:120px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:16px;font-weight:700;color:#2c3e50;&quot;>maiq</span>'"/>
    </div>
    <div style="padding:16px 28px;border:2px solid #e8e8e8;border-radius:10px;display:flex;align-items:center;justify-content:center;min-width:110px;min-height:64px;background:#fff;">
      <img src="${cl('eldi.com', 140)}" alt="ELDI" height="34" style="max-height:34px;max-width:120px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:16px;font-weight:800;color:#1e88e5;&quot;>ELDI</span>'"/>
    </div>
  </div>
</div>`,
    },
  },

  // 19 ── Trusted by heading
  { id: 'b-19', order: 19, type: 'heading', content: { level: 2, text: 'Trusted by 100+ Companies Globally' } },

  // 20 ── Trusted by grid
  {
    id: 'b-20', order: 20, type: 'html',
    content: {
      html: `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin:16px 0;">
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <img src="${cl('nestle.com', 100)}" alt="Nestlé" height="26" style="max-height:26px;max-width:100px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:11px;font-weight:700;color:#1a1a1a;&quot;>Nestlé</span>'"/>
  </div>
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <span style="font-size:12px;font-weight:700;color:#c0392b;font-style:italic;">nina's</span>
  </div>
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <span style="font-size:12px;font-weight:700;color:#2c3e50;">Közhiel</span>
  </div>
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <img src="${cl('ecomva.com', 100)}" alt="ECOsmetics" height="26" style="max-height:26px;max-width:100px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:11px;font-weight:700;color:#27ae60;&quot;>ECOsmetics</span>'"/>
  </div>
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <img src="${cl('crompton.co.in', 100)}" alt="Crompton" height="26" style="max-height:26px;max-width:100px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:11px;font-weight:700;color:#1a1a1a;&quot;>Crompton</span>'"/>
  </div>
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <img src="${cl('sanremo.com.au', 100)}" alt="SANREMO" height="26" style="max-height:26px;max-width:100px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:11px;font-weight:700;color:#1a1a1a;&quot;>SANREMO</span>'"/>
  </div>
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <img src="${cl('sanremo.com', 100)}" alt="SANREMO" height="26" style="max-height:26px;max-width:100px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:11px;font-weight:700;color:#c0392b;&quot;>SANREMO</span>'"/>
  </div>
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/UN_emblem_blue.svg/80px-UN_emblem_blue.svg.png" alt="United Nations" height="28" style="max-height:28px;max-width:100px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:11px;font-weight:700;color:#4169e1;&quot;>UN</span>'"/>
  </div>
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <img src="${cl('dennislingo.com', 100)}" alt="Dennis Lingo" height="26" style="max-height:26px;max-width:100px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:10px;font-weight:700;color:#8e44ad;&quot;>DENNIS LINGO</span>'"/>
  </div>
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <span style="font-size:11px;font-weight:800;color:#e74c3c;letter-spacing:0.3px;">DAKU MU</span>
  </div>
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <img src="${cl('casar.com', 100)}" alt="CASAB" height="26" style="max-height:26px;max-width:100px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:11px;font-weight:700;color:#16a085;&quot;>CASAB</span>'"/>
  </div>
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <span style="font-size:11px;font-weight:700;color:#6d4c41;">COFFEE AT</span>
  </div>
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <span style="font-size:11px;font-weight:700;color:#2980b9;">Anthrope</span>
  </div>
  <div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
    <img src="${cl('mensa.org', 100)}" alt="MENSA" height="26" style="max-height:26px;max-width:100px;object-fit:contain;" onerror="this.outerHTML='<span style=&quot;font-size:11px;font-weight:800;color:#c0392b;&quot;>MENSA</span>'"/>
  </div>
</div>`,
    },
  },

  // 21 ── Industry heading
  { id: 'b-21', order: 21, type: 'heading', content: { level: 2, text: 'Industry we Served' } },

  // 22 ── Industry icons + stats
  {
    id: 'b-22', order: 22, type: 'html',
    content: {
      html: `<div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:28px;">
    <div style="text-align:center;padding:20px 8px;border:1px solid #f0f0f0;border-radius:10px;background:#fff;">
      <div style="width:42px;height:42px;margin:0 auto 10px;background:#e8f4fd;border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2980b9" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>
      </div>
      <div style="font-size:11px;color:#5c5c5c;font-weight:500;">Education</div>
    </div>
    <div style="text-align:center;padding:20px 8px;border:1px solid #f0f0f0;border-radius:10px;background:#fff;">
      <div style="width:42px;height:42px;margin:0 auto 10px;background:#fef9e7;border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#f39c12" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline stroke-linecap="round" stroke-linejoin="round" points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <div style="font-size:11px;color:#5c5c5c;font-weight:500;">Architecture &amp; Construction</div>
    </div>
    <div style="text-align:center;padding:20px 8px;border:1px solid #f0f0f0;border-radius:10px;background:#fff;">
      <div style="width:42px;height:42px;margin:0 auto 10px;background:#fde8e8;border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#e74c3c" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
      </div>
      <div style="font-size:11px;color:#5c5c5c;font-weight:500;">Pregnancy</div>
    </div>
    <div style="text-align:center;padding:20px 8px;border:1px solid #f0f0f0;border-radius:10px;background:#fff;">
      <div style="width:42px;height:42px;margin:0 auto 10px;background:#e8f8f5;border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#1abc9c" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
      </div>
      <div style="font-size:11px;color:#5c5c5c;font-weight:500;">Travel</div>
    </div>
    <div style="text-align:center;padding:20px 8px;border:1px solid #f0f0f0;border-radius:10px;background:#fff;">
      <div style="width:42px;height:42px;margin:0 auto 10px;background:#f0e8fd;border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#8e44ad" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      </div>
      <div style="font-size:11px;color:#5c5c5c;font-weight:500;">Event Management</div>
    </div>
    <div style="text-align:center;padding:20px 8px;border:1px solid #f0f0f0;border-radius:10px;background:#fff;">
      <div style="width:42px;height:42px;margin:0 auto 10px;background:#e8f4fd;border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2980b9" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/></svg>
      </div>
      <div style="font-size:11px;color:#5c5c5c;font-weight:500;">Law</div>
    </div>
    <div style="text-align:center;padding:20px 8px;border:1px solid #f0f0f0;border-radius:10px;background:#fff;">
      <div style="width:42px;height:42px;margin:0 auto 10px;background:#fef9e7;border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#f39c12" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
      </div>
      <div style="font-size:11px;color:#5c5c5c;font-weight:500;">Courier</div>
    </div>
    <div style="text-align:center;padding:20px 8px;border:1px solid #f0f0f0;border-radius:10px;background:#fff;">
      <div style="width:42px;height:42px;margin:0 auto 10px;background:#fde8e8;border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#e74c3c" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
      </div>
      <div style="font-size:11px;color:#5c5c5c;font-weight:500;">Beauty &amp; Fitness &amp; Spa</div>
    </div>
    <div style="text-align:center;padding:20px 8px;border:1px solid #f0f0f0;border-radius:10px;background:#fff;">
      <div style="width:42px;height:42px;margin:0 auto 10px;background:#e8f8f5;border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#16a085" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      </div>
      <div style="font-size:11px;color:#5c5c5c;font-weight:500;">Touch Mechanic</div>
    </div>
    <div style="text-align:center;padding:20px 8px;border:1px solid #f0f0f0;border-radius:10px;background:#fff;">
      <div style="width:42px;height:42px;margin:0 auto 10px;background:#f0e8fd;border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#8e44ad" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
      </div>
      <div style="font-size:11px;color:#5c5c5c;font-weight:500;">Physioterm</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px;padding:20px 0 4px;border-top:2px solid #e8e8e8;">
    <div style="text-align:center;"><div style="font-size:28px;font-weight:800;color:#1a1a1a;line-height:1.1;">6200+</div><div style="font-size:11px;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.4px;margin-top:4px;">Projects</div></div>
    <div style="text-align:center;"><div style="font-size:28px;font-weight:800;color:#1a1a1a;line-height:1.1;">250+</div><div style="font-size:11px;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.4px;margin-top:4px;">Team</div></div>
    <div style="text-align:center;"><div style="font-size:28px;font-weight:800;color:#1a1a1a;line-height:1.1;">19+</div><div style="font-size:11px;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.4px;margin-top:4px;">Years</div></div>
    <div style="text-align:center;"><div style="font-size:28px;font-weight:800;color:#1a1a1a;line-height:1.1;">100+</div><div style="font-size:11px;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.4px;margin-top:4px;">Countries</div></div>
    <div style="text-align:center;"><div style="font-size:28px;font-weight:800;color:#1a1a1a;line-height:1.1;">9500+</div><div style="font-size:11px;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.4px;margin-top:4px;">Clients</div></div>
  </div>
</div>`,
    },
  },

  // 23 ── EXPANSION section
  {
    id: 'b-23', order: 23, type: 'html',
    content: {
      html: `<div style="background:linear-gradient(135deg,#0d4a38 0%,#0d6e50 50%,#0d4a38 100%);color:#fff;padding:60px 40px;text-align:center;border-radius:10px;margin:8px 0;">
  <h2 style="font-size:38px;font-weight:800;color:#fff;margin:0 0 8px;">Excited About <span style="color:#7fffd4;">EXPANSION?</span></h2>
  <p style="color:rgba(255,255,255,0.75);font-size:15px;margin:0 0 36px;">Let Elsner Propel Your Business Forward!</p>
  <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap;">
    <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:24px 26px;text-align:left;min-width:210px;max-width:250px;">
      <div style="font-size:13px;font-weight:700;color:#7fffd4;margin-bottom:14px;">🇮🇳 INDIA (HQ)</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.85);line-height:1.8;">5th Floor, World Center,<br>Near Devar Mall, Ashram Road<br>Ahmedabad, Gujarat 380009<br><br>📞 +91 79950 63373<br>✉️ sales@elsner.com</div>
    </div>
    <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:24px 26px;text-align:left;min-width:210px;max-width:250px;">
      <div style="font-size:13px;font-weight:700;color:#7fffd4;margin-bottom:14px;">🇺🇸 USA</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.85);line-height:1.8;">📞 +1 408 600 0270<br>✉️ usa@elsner.com</div>
    </div>
    <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:24px 26px;text-align:left;min-width:210px;max-width:250px;">
      <div style="font-size:13px;font-weight:700;color:#7fffd4;margin-bottom:14px;">🇦🇺 AUSTRALIA</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.85);line-height:1.8;">📞 +61 383 766 284<br>✉️ aus@elsner.com</div>
    </div>
  </div>
</div>`,
    },
  },

  // 24 ── Sign off text
  {
    id: 'b-24', order: 24, type: 'text',
    content: {
      text: "We're excited to move forward with your project.\nPlease review the agreement and sign to kickstart the work.",
    },
  },

  // 25 ── View Agreement button
  { id: 'b-25', order: 25, type: 'button', content: { label: 'View Agreement', url: '#' } },

  // 26 ── Footer
  {
    id: 'b-26', order: 26, type: 'html',
    content: {
      html: `<div style="background:linear-gradient(135deg,#0a1628 0%,#1a3a6c 55%,#0a1628 100%);color:#fff;padding:64px 40px;text-align:center;border-radius:8px;margin:8px 0;">
  <div style="margin-bottom:16px;">
    <img src="${cl('elsner.com', 160)}" alt="ELSNER" height="40" style="max-height:40px;object-fit:contain;filter:brightness(0) invert(1);" onerror="this.outerHTML='<span style=&quot;font-size:24px;font-weight:900;letter-spacing:-0.5px;color:#fff;&quot;>&#8734;&#8734; ELSNER</span>'"/>
  </div>
  <h2 style="font-size:52px;font-weight:800;color:#fff;margin:0 0 24px;">Thank You!</h2>
  <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0;">© 2024 Elsner Technologies Pvt. Ltd. | All Rights Reserved.</p>
</div>`,
    },
  },
];

// ── PUT to API ────────────────────────────────────────────────────────────────
const body = JSON.stringify({ blocks });
const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/proposals/${PROPOSAL_ID}`,
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    if (res.statusCode === 200) {
      console.log('✅ Updated! Blocks:', parsed.blocks?.length);
    } else {
      console.error('❌ Error:', res.statusCode, parsed);
    }
  });
});
req.on('error', console.error);
req.write(body);
req.end();
