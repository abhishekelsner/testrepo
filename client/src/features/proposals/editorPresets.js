/**
 * Pre-built block presets and snippet templates for the editor library.
 * Images use Picsum (https://picsum.photos) — free for use, no attribution required.
 */
import { createBlock } from './BlockMenu';

/** Unique id helper for snippet blocks */
function uid() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Royalty-free placeholder images (Picsum — free to use). */
const IMAGES = {
  hero: 'https://picsum.photos/seed/proposal-hero/800/400',
  team: 'https://picsum.photos/seed/team-work/800/360',
  office: 'https://picsum.photos/seed/office/800/360',
  handshake: 'https://picsum.photos/seed/handshake/800/360',
  chart: 'https://picsum.photos/seed/chart/800/360',
  laptop: 'https://picsum.photos/seed/laptop/800/360',
};

/** Pre-built single blocks with real content (for "Blocks" in library). */
export const BLOCK_PRESETS = [
  {
    id: 'preset-hero',
    name: 'Hero heading',
    type: 'heading',
    preview: 'Unveiling the Future',
    create: () => ({ ...createBlock('heading'), content: { level: 1, text: 'Your compelling headline here' } }),
  },
  {
    id: 'preset-hero-image',
    name: 'Hero image',
    type: 'image',
    preview: 'Full-width image',
    create: () => createBlock('image'),
  },
  {
    id: 'preset-subhead',
    name: 'Subheading',
    type: 'heading',
    preview: 'Section title',
    create: () => ({ ...createBlock('heading'), content: { level: 2, text: 'Section title' } }),
  },
  {
    id: 'preset-paragraph',
    name: 'Paragraph',
    type: 'text',
    preview: 'Add your content...',
    create: () => ({ ...createBlock('text'), content: { text: 'Add your content here. You can use {{Client Name}} and other variables.' } }),
  },
  {
    id: 'preset-pricing',
    name: 'Pricing table',
    type: 'pricing',
    preview: 'Editable rows & columns table',
    create: () => createBlock('pricing'),
  },
  {
    id: 'preset-cta',
    name: 'Call to action',
    type: 'button',
    preview: 'Book a meeting',
    create: () => ({ ...createBlock('button'), content: { label: 'Book a meeting', url: 'https://calendly.com' } }),
  },
  {
    id: 'preset-divider',
    name: 'Divider',
    type: 'divider',
    preview: '—',
    create: () => createBlock('divider'),
  },
  {
    id: 'preset-agreement',
    name: 'Agreement',
    type: 'agreement',
    preview: 'Review and sign to kickstart',
    create: () => createBlock('agreement'),
  },
  {
    id: 'preset-form',
    name: 'Contact form',
    type: 'form',
    preview: 'Name, Email, Message',
    create: () => {
      const b = createBlock('form');
      b.content.fields = [
        { id: uid(), label: 'Full Name', type: 'text', required: true },
        { id: uid(), label: 'Email', type: 'email', required: true },
        { id: uid(), label: 'Message', type: 'textarea', required: false },
      ];
      return b;
    },
  },
];

/**
 * Featured pre-built templates shown in TemplatesList for one-click creation.
 * createBlocks() returns a ready-to-save blocks array.
 */
export const FEATURED_TEMPLATES = [
  {
    id: 'featured-elsner-demo',
    name: 'elsner demo',
    type: 'proposal',
    description: 'SEO contract with project scope, cost estimation, payment milestones, about us, and more',
    createBlocks: () => [
      // ── Hero banner ────────────────────────────────────────────────
      {
        ...createBlock('html'),
        content: {
          html: `<div style="background:linear-gradient(135deg,#0a1628 0%,#1a3a6c 55%,#0a1628 100%);color:#fff;padding:56px 40px 48px;text-align:center;position:relative;border-radius:8px;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;">
    <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;">&#8734;&#8734; ELSNER</div>
    <a href="#agreement" style="border:1px solid rgba(255,255,255,0.4);color:#fff;padding:7px 18px;border-radius:4px;text-decoration:none;font-size:12px;font-weight:600;">Get Agreement</a>
  </div>
  <h1 style="font-size:38px;font-weight:600;color:#fff;margin:0 0 10px;line-height:1.25;">SEO Contract for {{Client Name}}</h1>
  <p style="color:rgba(255,255,255,0.55);font-size:13px;margin:0;">{{Client Website}}</p>
</div>`,
        },
      },
      // ── Project Scope ──────────────────────────────────────────────
      { ...createBlock('heading'), content: { level: 2, text: 'Project Scope' } },
      {
        ...createBlock('text'),
        content: {
          text: `What's Included:
• Targeting {{Keywords Count}} keywords ({{Primary Count}} primary + {{Secondary Count}} secondary)
• {{Optimized Pages}} optimized pages per month

Advanced SEO audit with strategy (Month 1):
• Complete SEO setup – Google Search Console, Google Analytics, keyword mapping, baseline report, competitor analysis
• Technical SEO optimization – sitemap, robots.txt, schema, site architecture, speed & Core Web Vitals improvements, mobile & SSL checks
• On-page SEO – title tags, meta descriptions, header structure, URL structure, internal linking, duplicate content fixes, image optimization
• Content marketing – 2 blog articles, 4 meta page content pieces, and 8 off-site content submissions per month
• Link building & authority development – guest posts, niche benchmarking, business profiles, classified submissions, competitor backlinks
• Quarterly backlink audit and ongoing link monitoring
• Advanced Google Business Profile optimization
• Monthly performance reports – keyword ranking, competitor tracking, search visibility, traffic insights, and backlink reports
• Dedicated support via email, chat, and phone

Note:
• If the task list provided to the client is not completed in the current support hours, the client needs to purchase a new support package.
• This document will be considered as a master agreement for the services; any renewal for the mentioned services will also be considered under the same contract.`,
        },
      },
      { ...createBlock('divider') },
      // ── Time & Cost ────────────────────────────────────────────────
      { ...createBlock('heading'), content: { level: 2, text: 'Time and Cost Estimation of the Project' } },
      {
        ...createBlock('html'),
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
      { ...createBlock('divider') },
      // ── Milestone Payments ─────────────────────────────────────────
      { ...createBlock('heading'), content: { level: 2, text: 'Milestone Payment Details and Terms' } },
      {
        ...createBlock('html'),
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
      <td style="padding:13px 16px;color:#2c2c2c;">$1350</td>
      <td style="padding:13px 16px;color:#2c2c2c;">100% Before Month Starts</td>
      <td style="padding:13px 16px;color:#2c2c2c;">{{Invoice Date}}</td>
      <td style="padding:13px 16px;color:#2c2c2c;">{{Payment Due Date}}</td>
    </tr>
  </tbody>
</table>`,
        },
      },
      {
        ...createBlock('text'),
        content: {
          text: `• The invoice will be issued and paid in advance of every month.
• If the invoice is not paid in 30 days from the date of invoice, then 50% of that invoice is levied as Late Payment Activity charges per day.
• By entering into an agreement with Elsner Technologies Pvt Ltd, the client acknowledges and agrees to the non-refundable nature of the service fees.`,
        },
      },
      { ...createBlock('divider') },
      // ── Securing the deal ──────────────────────────────────────────
      { ...createBlock('heading'), content: { level: 2, text: 'Securing the deal: price validity and contract terms' } },
      {
        ...createBlock('text'),
        content: {
          text: `• The quoted price in this contract will remain valid until {{Validity Date}}. If the contract is not agreed on or before this date, we will need to reevaluate the estimate provided.
• Once the client is in agreement for the mentioned service/s, the price may be subject to fluctuations or adjustments based on certain factors and negotiations.
• To uphold the level of excellence in our service provision, it is customary to sign a renewal contract or agreement on an annual basis. This ensures the ongoing commitment to honor and deliver our services.`,
        },
      },
      // ── We are ELSNER! dark section ────────────────────────────────
      {
        ...createBlock('html'),
        content: {
          html: `<div style="background:linear-gradient(135deg,#0a1628 0%,#1a3a6c 55%,#0a1628 100%);color:#fff;padding:72px 40px;text-align:center;border-radius:8px;margin:8px 0;">
  <h2 style="font-size:52px;font-weight:800;color:#fff;margin:0;letter-spacing:-1px;">We are <span style="color:#5b9af5;">ELSNER!</span></h2>
</div>`,
        },
      },
      // ── About us ───────────────────────────────────────────────────
      { ...createBlock('heading'), content: { level: 2, text: 'About us' } },
      {
        ...createBlock('text'),
        content: {
          text: 'Elsner is a full-fledged IT service-driven company providing Precise web development and Mobile Development services.\n\nA software development company that will help your business grow.',
        },
      },
      {
        ...createBlock('html'),
        content: {
          html: `<div>
  <p style="font-size:11px;font-weight:700;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 14px;">Trusted by our companies</p>
  <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:20px;">
    <div style="padding:7px 14px;border:1px solid #e8e8e8;border-radius:6px;font-size:12px;font-weight:600;color:#3b3b3b;">Nestlé</div>
    <div style="padding:7px 14px;border:1px solid #e8e8e8;border-radius:6px;font-size:12px;font-weight:600;color:#3b3b3b;">United Nations</div>
    <div style="padding:7px 14px;border:1px solid #e8e8e8;border-radius:6px;font-size:12px;font-weight:600;color:#3b3b3b;">Crompton</div>
    <div style="padding:7px 14px;border:1px solid #e8e8e8;border-radius:6px;font-size:12px;font-weight:600;color:#3b3b3b;">ATBCO</div>
    <div style="padding:7px 14px;border:1px solid #e8e8e8;border-radius:6px;font-size:12px;font-weight:600;color:#3b3b3b;">Kuzbek</div>
    <div style="padding:7px 14px;border:1px solid #e8e8e8;border-radius:6px;font-size:12px;font-weight:600;color:#3b3b3b;">MENSA</div>
    <div style="padding:7px 14px;border:1px solid #e8e8e8;border-radius:6px;font-size:12px;font-weight:600;color:#3b3b3b;">nustone</div>
  </div>
  <p style="font-size:11px;font-weight:700;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">Use toolstack</p>
  <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
    <div style="padding:6px 12px;background:#f5f5f5;border-radius:4px;font-size:12px;font-weight:600;color:#5c5c5c;">Shopify</div>
    <div style="padding:6px 12px;background:#f5f5f5;border-radius:4px;font-size:12px;font-weight:600;color:#5c5c5c;">WooCommerce</div>
    <div style="padding:6px 12px;background:#f5f5f5;border-radius:4px;font-size:12px;font-weight:600;color:#5c5c5c;">PHP</div>
    <div style="padding:6px 12px;background:#f5f5f5;border-radius:4px;font-size:12px;font-weight:600;color:#5c5c5c;">Magento</div>
  </div>
</div>`,
        },
      },
      // ── Our Ventures ───────────────────────────────────────────────
      { ...createBlock('heading'), content: { level: 2, text: 'Our Ventures' } },
      {
        ...createBlock('html'),
        content: {
          html: `<div>
  <p style="font-size:14px;color:#5c5c5c;line-height:1.65;margin:0 0 22px;">Technology is all about bringing convenience to people's lives. Here are some of the other ventures that we are successfully operating and giving new dimensions to the world.</p>
  <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;">
    <div style="padding:12px 22px;border:2px solid #e8e8e8;border-radius:8px;font-size:15px;font-weight:800;color:#e85c3a;">ECOMVA</div>
    <div style="padding:12px 22px;border:2px solid #e8e8e8;border-radius:8px;font-size:15px;font-weight:700;color:#2a6fc4;">link Publishers</div>
    <div style="padding:12px 22px;border:2px solid #e8e8e8;border-radius:8px;font-size:15px;font-weight:700;color:#2a6fc4;">WeekMate</div>
    <div style="padding:12px 22px;border:2px solid #e8e8e8;border-radius:8px;font-size:15px;font-weight:700;color:#5c5c5c;">maiq</div>
    <div style="padding:12px 22px;border:2px solid #e8e8e8;border-radius:8px;font-size:15px;font-weight:800;color:#1e88e5;">ELDI</div>
  </div>
</div>`,
        },
      },
      // ── Trusted by 100+ ───────────────────────────────────────────
      { ...createBlock('heading'), content: { level: 2, text: 'Trusted by 100+ Companies Globally' } },
      {
        ...createBlock('html'),
        content: {
          html: `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin:16px 0;">
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">Nestlé</div>
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">nina's</div>
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">Kuzbek</div>
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">ECOmva</div>
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">Crompton</div>
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">ATBCO</div>
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">MENSA</div>
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">nustone</div>
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">UN</div>
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">DENNIS LINGO</div>
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">DAKU MU</div>
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">CASAB</div>
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">COFFEE AT</div>
  <div style="padding:12px 8px;border:1px solid #e8e8e8;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:#3b3b3b;">Anthrope</div>
</div>`,
        },
      },
      // ── Industry we Served ─────────────────────────────────────────
      { ...createBlock('heading'), content: { level: 2, text: 'Industry we Served' } },
      {
        ...createBlock('html'),
        content: {
          html: `<div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:28px;">
    <div style="text-align:center;padding:18px 8px;border:1px solid #f0f0f0;border-radius:8px;"><div style="font-size:28px;margin-bottom:6px;">🎓</div><div style="font-size:11px;color:#5c5c5c;line-height:1.3;">Education</div></div>
    <div style="text-align:center;padding:18px 8px;border:1px solid #f0f0f0;border-radius:8px;"><div style="font-size:28px;margin-bottom:6px;">🏛️</div><div style="font-size:11px;color:#5c5c5c;line-height:1.3;">Architecture &amp; Construction</div></div>
    <div style="text-align:center;padding:18px 8px;border:1px solid #f0f0f0;border-radius:8px;"><div style="font-size:28px;margin-bottom:6px;">🏥</div><div style="font-size:11px;color:#5c5c5c;line-height:1.3;">Pregnancy</div></div>
    <div style="text-align:center;padding:18px 8px;border:1px solid #f0f0f0;border-radius:8px;"><div style="font-size:28px;margin-bottom:6px;">✈️</div><div style="font-size:11px;color:#5c5c5c;line-height:1.3;">Travel</div></div>
    <div style="text-align:center;padding:18px 8px;border:1px solid #f0f0f0;border-radius:8px;"><div style="font-size:28px;margin-bottom:6px;">🎮</div><div style="font-size:11px;color:#5c5c5c;line-height:1.3;">Event Management</div></div>
    <div style="text-align:center;padding:18px 8px;border:1px solid #f0f0f0;border-radius:8px;"><div style="font-size:28px;margin-bottom:6px;">⚖️</div><div style="font-size:11px;color:#5c5c5c;line-height:1.3;">Law</div></div>
    <div style="text-align:center;padding:18px 8px;border:1px solid #f0f0f0;border-radius:8px;"><div style="font-size:28px;margin-bottom:6px;">🚢</div><div style="font-size:11px;color:#5c5c5c;line-height:1.3;">Courier</div></div>
    <div style="text-align:center;padding:18px 8px;border:1px solid #f0f0f0;border-radius:8px;"><div style="font-size:28px;margin-bottom:6px;">🏦</div><div style="font-size:11px;color:#5c5c5c;line-height:1.3;">Beauty &amp; Fitness &amp; Spa</div></div>
    <div style="text-align:center;padding:18px 8px;border:1px solid #f0f0f0;border-radius:8px;"><div style="font-size:28px;margin-bottom:6px;">🎾</div><div style="font-size:11px;color:#5c5c5c;line-height:1.3;">Touch Mechanic</div></div>
    <div style="text-align:center;padding:18px 8px;border:1px solid #f0f0f0;border-radius:8px;"><div style="font-size:28px;margin-bottom:6px;">💊</div><div style="font-size:11px;color:#5c5c5c;line-height:1.3;">Physiterm</div></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px;padding-top:20px;border-top:1px solid #e8e8e8;">
    <div style="text-align:center;"><div style="font-size:26px;font-weight:800;color:#1a1a1a;">6200+</div><div style="font-size:11px;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">Projects</div></div>
    <div style="text-align:center;"><div style="font-size:26px;font-weight:800;color:#1a1a1a;">250+</div><div style="font-size:11px;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">Team</div></div>
    <div style="text-align:center;"><div style="font-size:26px;font-weight:800;color:#1a1a1a;">19+</div><div style="font-size:11px;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">Years</div></div>
    <div style="text-align:center;"><div style="font-size:26px;font-weight:800;color:#1a1a1a;">100+</div><div style="font-size:11px;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">Countries</div></div>
    <div style="text-align:center;"><div style="font-size:26px;font-weight:800;color:#1a1a1a;">9500+</div><div style="font-size:11px;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">Clients</div></div>
  </div>
</div>`,
        },
      },
      // ── EXPANSION section ──────────────────────────────────────────
      {
        ...createBlock('html'),
        content: {
          html: `<div style="background:linear-gradient(135deg,#0d4a38 0%,#0d6e50 50%,#0d4a38 100%);color:#fff;padding:60px 40px;text-align:center;border-radius:10px;margin:8px 0;">
  <h2 style="font-size:38px;font-weight:800;color:#fff;margin:0 0 8px;">Excited About <span style="color:#7fffd4;">EXPANSION?</span></h2>
  <p style="color:rgba(255,255,255,0.75);font-size:15px;margin:0 0 36px;">Let Elsner Propel Your Business Forward!</p>
  <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap;">
    <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:22px 24px;text-align:left;min-width:180px;">
      <div style="font-size:11px;font-weight:700;color:#7fffd4;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">&#127470;&#127475; INDIA (HQ)</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.85);line-height:1.65;">5th Floor, World Center,<br>Near Devar Mall, Ashram Road<br>Ahmedabad, Gujarat 380009<br><br>📞 +91 79950 63373<br>✉️ sales@elsner.com</div>
    </div>
    <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:22px 24px;text-align:left;min-width:180px;">
      <div style="font-size:11px;font-weight:700;color:#7fffd4;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">&#127482;&#127480; USA</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.85);line-height:1.65;">📞 +1 408 600 0270<br>✉️ usa@elsner.com</div>
    </div>
    <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:22px 24px;text-align:left;min-width:180px;">
      <div style="font-size:11px;font-weight:700;color:#7fffd4;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">&#127462;&#127482; AUSTRALIA</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.85);line-height:1.65;">📞 +61 383 766 284<br>✉️ aus@elsner.com</div>
    </div>
  </div>
</div>`,
        },
      },
      // ── Sign off ───────────────────────────────────────────────────
      { ...createBlock('text'), content: { text: "We're excited to move forward with your project.\nPlease review the agreement and sign to kickstart the work." } },
      { ...createBlock('button'), content: { label: 'View Agreement', url: '#' } },
      // ── Footer ─────────────────────────────────────────────────────
      {
        ...createBlock('html'),
        content: {
          html: `<div style="background:linear-gradient(135deg,#0a1628 0%,#1a3a6c 55%,#0a1628 100%);color:#fff;padding:64px 40px;text-align:center;border-radius:8px;margin:8px 0;">
  <div style="font-size:24px;font-weight:900;letter-spacing:-0.5px;color:#fff;margin-bottom:16px;">&#8734;&#8734; ELSNER</div>
  <h2 style="font-size:52px;font-weight:800;color:#fff;margin:0 0 24px;">Thank You!</h2>
  <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0;">© 2024 Elsner Technologies Pvt. Ltd. | All Rights Reserved.</p>
</div>`,
        },
      },
    ].map((b, i) => ({ ...b, order: i })),
  },
];

/** Pre-built snippets: full proposal-style templates with images and real content. */
export const SNIPPETS = [
  {
    id: 'snippet-full-sales-proposal',
    name: 'Complete Sales Proposal',
    description: 'Hero image, headline, intro, pricing, testimonial, CTA',
    preview: 'Full proposal with images',
    createBlocks: () => [
      { ...createBlock('image'), content: { url: IMAGES.hero, alt: 'Welcome' } },
      { ...createBlock('heading'), content: { level: 1, text: 'Proposal for {{Client Name}}' } },
      { ...createBlock('text'), content: { text: 'Thank you for the opportunity to work with you. We\'re pleased to present this proposal, tailored to your goals and timeline. Below you\'ll find our recommended approach, investment, and next steps.' } },
      { ...createBlock('divider') },
      { ...createBlock('heading'), content: { level: 2, text: 'What we\'ll deliver' } },
      { ...createBlock('text'), content: { text: 'We combine strategy, design, and execution to deliver outcomes that matter. Our team will work as an extension of yours—transparent, responsive, and focused on your success.' } },
      { ...createBlock('image'), content: { url: IMAGES.office, alt: 'Our approach' } },
      { ...createBlock('heading'), content: { level: 2, text: 'Investment' } },
      (() => {
        const b = createBlock('pricing');
        b.content.options = [
          { id: uid(), name: 'Starter', description: 'Essential scope, 4-week delivery', amount: 2499, interval: 'one-time', selected: false },
          { id: uid(), name: 'Standard', description: 'Full scope, 8-week delivery', amount: 4999, interval: 'one-time', selected: false },
          { id: uid(), name: 'Enterprise', description: 'Custom scope and timeline', amount: 9999, interval: 'one-time', selected: false },
        ];
        b.content.totals = { subtotal: 0, total: 0 };
        return b;
      })(),
      { ...createBlock('heading'), content: { level: 2, text: 'What our clients say' } },
      { ...createBlock('text'), content: { text: '"Professional, on time, and great to work with. The results exceeded our expectations." — Sarah M., Head of Marketing' } },
      { ...createBlock('button'), content: { label: 'Accept this proposal', url: '#' } },
    ].map((b, i) => ({ ...b, order: i })),
  },
  {
    id: 'snippet-sales-proposal',
    name: 'Sales Proposal Template',
    description: 'Heading, intro, pricing, and CTA',
    preview: 'Sales Proposal',
    createBlocks: () => [
      { ...createBlock('heading'), content: { level: 1, text: 'Proposal for {{Client Name}}' } },
      { ...createBlock('text'), content: { text: 'Thank you for your interest. We\'re pleased to present this proposal tailored to your needs.' } },
      { ...createBlock('divider') },
      (() => {
        const b = createBlock('pricing');
        b.content.options = [
          { id: uid(), name: 'Option A', description: 'Description here', amount: 0, interval: 'one-time', selected: false },
          { id: uid(), name: 'Option B', description: 'Description here', amount: 0, interval: 'one-time', selected: false },
        ];
        b.content.totals = { subtotal: 0, total: 0 };
        return b;
      })(),
      { ...createBlock('button'), content: { label: 'Accept proposal', url: '#' } },
    ].map((b, i) => ({ ...b, order: i })),
  },
  {
    id: 'snippet-creative-hero',
    name: 'Creative Hero Section',
    description: 'Image, headline, and CTA',
    preview: 'Hero with image',
    createBlocks: () => [
      { ...createBlock('image'), content: { url: IMAGES.hero, alt: 'Hero' } },
      { ...createBlock('heading'), content: { level: 1, text: 'Unveiling the Future of Creativity' } },
      { ...createBlock('text'), content: { text: 'We\'re not just a creative studio—we\'re a haven for innovation and artistry. Our team is driven by a passion for crafting experiences that are as unique as they are unforgettable.' } },
      { ...createBlock('button'), content: { label: 'Book a meeting', url: 'https://calendly.com' } },
    ].map((b, i) => ({ ...b, order: i })),
  },
  {
    id: 'snippet-executive-summary',
    name: 'Executive Summary',
    description: 'Title and two text sections',
    preview: 'Executive Summary',
    createBlocks: () => [
      { ...createBlock('heading'), content: { level: 1, text: 'Executive Summary' } },
      { ...createBlock('text'), content: { text: 'This document outlines the key points and recommendations for {{Client Name}}.' } },
      { ...createBlock('text'), content: { text: 'Add your main findings, metrics, and next steps here.' } },
    ].map((b, i) => ({ ...b, order: i })),
  },
  {
    id: 'snippet-feature-section',
    name: 'Feature section',
    description: 'Heading, description, and CTA button',
    preview: 'Feature section',
    createBlocks: () => [
      { ...createBlock('heading'), content: { level: 2, text: 'Why work with us' } },
      { ...createBlock('text'), content: { text: 'We deliver results through a combination of expertise, transparency, and commitment to your success.' } },
      { ...createBlock('button'), content: { label: 'Get started', url: '#' } },
    ].map((b, i) => ({ ...b, order: i })),
  },
  {
    id: 'snippet-quote',
    name: 'Quote / testimonial',
    description: 'Heading and quote text',
    preview: 'Quote block',
    createBlocks: () => [
      { ...createBlock('heading'), content: { level: 2, text: 'What our clients say' } },
      { ...createBlock('text'), content: { text: '"Add a short testimonial or quote here." — Client name' } },
    ].map((b, i) => ({ ...b, order: i })),
  },
  {
    id: 'snippet-pricing-page',
    name: 'Pricing & sign-up',
    description: 'Image, heading, pricing table, CTA',
    preview: 'Pricing page',
    createBlocks: () => [
      { ...createBlock('image'), content: { url: IMAGES.chart, alt: 'Plans' } },
      { ...createBlock('heading'), content: { level: 1, text: 'Choose your plan' } },
      (() => {
        const b = createBlock('pricing');
        b.content.options = [
          { id: uid(), name: 'Basic', description: 'For individuals', amount: 29, interval: 'monthly', selected: false },
          { id: uid(), name: 'Pro', description: 'For teams', amount: 79, interval: 'monthly', selected: false },
          { id: uid(), name: 'Business', description: 'For organizations', amount: 199, interval: 'monthly', selected: false },
        ];
        b.content.totals = { subtotal: 0, total: 0 };
        return b;
      })(),
      { ...createBlock('button'), content: { label: 'Get started', url: '#' } },
    ].map((b, i) => ({ ...b, order: i })),
  },
];
