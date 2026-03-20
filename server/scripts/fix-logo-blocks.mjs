/**
 * Fix malformed HTML in logo blocks.
 * Root cause: &quot; entities inside onerror attr values break HTML parsing.
 * Fix: use clean <img> tags with no onerror, plus text fallback spans hidden via CSS.
 */
import http from 'http';

const TOKEN = process.argv[2];
const PROPOSAL_ID = '69b93884ecfecbcb1ea0f63f';

const cl = (domain, size = 80) => `https://logo.clearbit.com/${domain}?size=${size}`;
const wiki = (path) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}`;

// Clean logo cell — img with no onerror, just clean HTML
function logoCell(src, alt, h = 28, extraStyle = '') {
  return `<div style="padding:10px 16px;border:1px solid #e8e8e8;border-radius:6px;display:flex;align-items:center;justify-content:center;min-width:80px;min-height:44px;background:#fff;${extraStyle}">
      <img src="${src}" alt="${alt}" height="${h}" style="max-height:${h}px;max-width:120px;object-fit:contain;display:block;">
    </div>`;
}

function textBadge(text, color, bgColor = '#fff', borderColor = '#e8e8e8') {
  return `<div style="padding:10px 16px;border:1px solid ${borderColor};background:${bgColor};border-radius:6px;display:flex;align-items:center;justify-content:center;min-width:80px;min-height:44px;">
      <span style="font-size:13px;font-weight:800;color:${color};letter-spacing:0.3px;">${text}</span>
    </div>`;
}

function techCell(src, alt, label, labelColor, bgColor, borderColor) {
  return `<div style="padding:8px 14px;background:${bgColor};border:1px solid ${borderColor};border-radius:6px;display:flex;align-items:center;gap:8px;">
      <img src="${src}" alt="${alt}" height="20" style="max-height:20px;max-width:24px;object-fit:contain;display:block;">
      <span style="font-size:12px;font-weight:600;color:${labelColor};">${label}</span>
    </div>`;
}

function trustedCell(src, alt, h = 26) {
  return `<div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
      <img src="${src}" alt="${alt}" height="${h}" style="max-height:${h}px;max-width:110px;object-fit:contain;display:block;">
    </div>`;
}

function trustedTextCell(text, color) {
  return `<div style="padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:56px;background:#fff;">
      <span style="font-size:12px;font-weight:700;color:${color};">${text}</span>
    </div>`;
}

const blocks = [
  // 16 — About us logos (clients + toolstack)  — FIXED clean HTML
  {
    id: 'b-16', order: 16, type: 'html',
    content: {
      html: `<div>
  <p style="font-size:11px;font-weight:700;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 16px;">Trusted by our companies</p>
  <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-bottom:28px;">
    ${logoCell(cl('nestle.com', 120), 'Nestlé', 28)}
    ${logoCell(wiki('e/ee/UN_emblem_blue.svg/80px-UN_emblem_blue.svg.png'), 'United Nations', 32)}
    ${logoCell(cl('apollopharmacy.in', 120), 'Apollo Pharmacy', 28)}
    ${logoCell(cl('africainvestmentforum.com', 120), 'Africa Investment Forum', 28)}
    ${logoCell(cl('crompton.co.in', 120), 'Crompton', 28)}
    ${logoCell(cl('casa39.it', 120), 'CASA39', 28)}
    ${textBadge('ATBCO', '#fff', '#e34324', '#e34324')}
    ${logoCell(cl('mensa.org', 120), 'MENSA', 28)}
    ${logoCell(cl('nustone.co.uk', 120), 'nustone', 28)}
  </div>
  <p style="font-size:11px;font-weight:700;color:#9b9b9b;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Our TechStack</p>
  <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
    ${techCell(cl('magento.com', 50), 'Magento', 'Magento', '#f06a25', '#fff8f0', '#f5d5b0')}
    ${techCell(cl('wordpress.com', 50), 'WordPress', 'WordPress', '#21759b', '#f5f8ff', '#dde8f8')}
    ${techCell(cl('shopify.com', 50), 'Shopify', 'Shopify', '#96bf48', '#f5fff7', '#c3e6cc')}
    ${techCell(cl('woocommerce.com', 50), 'WooCommerce', 'WooCommerce', '#7f54b3', '#f9f5ff', '#e0d4f7')}
    ${techCell(wiki('2/27/PHP-logo.svg/80px-PHP-logo.svg.png'), 'PHP', 'PHP', '#777bb4', '#f5f7ff', '#d0d8f5')}
    <div style="padding:8px 14px;background:#fff8e0;border:1px solid #f5d87a;border-radius:6px;display:flex;align-items:center;gap:8px;">
      <div style="width:20px;height:20px;border-radius:50%;background:#f5c518;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="font-size:9px;font-weight:900;color:#1a1a1a;">SEO</span>
      </div>
      <span style="font-size:12px;font-weight:600;color:#b8860b;">SEO</span>
    </div>
    ${techCell(wiki('d/d7/Android_robot.svg/50px-Android_robot.svg.png'), 'Android', 'Android', '#3ddc84', '#f0fff4', '#b8f0cc')}
    <div style="padding:8px 14px;background:#f5f5f5;border:1px solid #e0e0e0;border-radius:6px;display:flex;align-items:center;gap:8px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 814 1000"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 270.1-317.3 70.9 0 130.2 46.1 175.1 46.1 42.8 0 110.3-48.6 190.9-48.6 33.5 0 135.4 3.2 200.9 121.2zm-234.5-181.2C514.4 115.7 540 79.4 540 44.1c0-5.1-.6-10.3-1.3-15.4C460.2 31.5 366.6 72.3 316.9 136c-42.8 52.5-78.4 131.9-78.4 212.5 0 6.4.6 12.9 1.3 19.3 6.4.6 13.5 1.3 20.6 1.3 70.9 0 163.7-38.9 213.3-109.4z" fill="#1a1a1a"/></svg>
      <span style="font-size:12px;font-weight:600;color:#1a1a1a;">iOS App</span>
    </div>
  </div>
</div>`,
    },
  },

  // 18 — Our Ventures logos — FIXED clean HTML
  {
    id: 'b-18', order: 18, type: 'html',
    content: {
      html: `<div>
  <p style="font-size:14px;color:#5c5c5c;line-height:1.65;margin:0 0 22px;">Technology is all about bringing convenience to people's lives. Here are some of the other ventures that we are successfully operating and giving new dimensions to the world.</p>
  <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:center;">
    <div style="padding:16px 28px;border:2px solid #e8e8e8;border-radius:10px;display:flex;align-items:center;justify-content:center;min-width:130px;min-height:64px;background:#fff;">
      <img src="https://www.ecomva.com/wp-content/uploads/2021/02/logo-ecomva.png" alt="ECOMVA" height="32" style="max-height:32px;max-width:120px;object-fit:contain;display:block;">
    </div>
    <div style="padding:16px 28px;border:2px solid #e8e8e8;border-radius:10px;display:flex;align-items:center;justify-content:center;min-width:130px;min-height:64px;background:#fff;">
      <img src="${cl('linkpublishers.com', 160)}" alt="link Publishers" height="32" style="max-height:32px;max-width:140px;object-fit:contain;display:block;">
    </div>
    <div style="padding:16px 28px;border:2px solid #e8e8e8;border-radius:10px;display:flex;align-items:center;justify-content:center;min-width:130px;min-height:64px;background:#fff;">
      <img src="${cl('weekmate.io', 160)}" alt="WeekMate" height="32" style="max-height:32px;max-width:140px;object-fit:contain;display:block;">
    </div>
    <div style="padding:16px 28px;border:2px solid #e8e8e8;border-radius:10px;display:flex;align-items:center;justify-content:center;min-width:110px;min-height:64px;background:#fff;">
      <span style="font-size:18px;font-weight:700;color:#2c3e50;letter-spacing:-0.5px;">maiq</span>
    </div>
    <div style="padding:16px 28px;border:2px solid #e8e8e8;border-radius:10px;display:flex;align-items:center;justify-content:center;min-width:110px;min-height:64px;background:#fff;">
      <span style="font-size:18px;font-weight:800;color:#1e88e5;">ELDI</span>
    </div>
  </div>
</div>`,
    },
  },

  // 20 — Trusted by grid — FIXED clean HTML
  {
    id: 'b-20', order: 20, type: 'html',
    content: {
      html: `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin:16px 0;">
  ${trustedCell(cl('nestle.com', 100), 'Nestlé')}
  ${trustedTextCell("nina's", '#c0392b')}
  ${trustedTextCell('Közhiel', '#2c3e50')}
  ${trustedCell(cl('apollopharmacy.in', 100), 'Apollo')}
  ${trustedCell(cl('crompton.co.in', 100), 'Crompton')}
  ${trustedCell(cl('africainvestmentforum.com', 100), 'Africa Investment Forum')}
  ${trustedCell(wiki('e/ee/UN_emblem_blue.svg/80px-UN_emblem_blue.svg.png'), 'United Nations', 28)}
  ${trustedCell(cl('casa39.it', 100), 'CASA39')}
  ${trustedCell(cl('saree.com', 100), 'saree.com')}
  ${trustedCell(cl('videocon.com', 100), 'Videocon')}
  ${trustedTextCell('DENNIS LINGO', '#8e44ad')}
  ${trustedTextCell('DAKU MU', '#e74c3c')}
  ${trustedCell(cl('mensa.org', 100), 'MENSA')}
  ${trustedCell(cl('nustone.co.uk', 100), 'nustone')}
</div>`,
    },
  },

  // 0 — Hero banner — FIXED (remove onerror from img)
  {
    id: 'b-0', order: 0, type: 'html',
    content: {
      html: `<div style="background:linear-gradient(135deg,#0a1628 0%,#1a3a6c 55%,#0a1628 100%);color:#fff;padding:56px 40px 48px;text-align:center;position:relative;border-radius:8px;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;">
    <img src="${cl('elsner.com', 140)}" alt="ELSNER" height="36" style="max-height:36px;object-fit:contain;filter:brightness(0) invert(1);display:block;">
    <a href="#agreement" style="border:1px solid rgba(255,255,255,0.4);color:#fff;padding:7px 18px;border-radius:4px;text-decoration:none;font-size:12px;font-weight:600;">Get Agreement</a>
  </div>
  <h1 style="font-size:38px;font-weight:600;color:#fff;margin:0 0 10px;line-height:1.25;">SEO Contract for {{Client Name}}</h1>
  <p style="color:rgba(255,255,255,0.55);font-size:13px;margin:0;">{{Client Website}}</p>
</div>`,
    },
  },

  // 26 — Footer — FIXED
  {
    id: 'b-26', order: 26, type: 'html',
    content: {
      html: `<div style="background:linear-gradient(135deg,#0a1628 0%,#1a3a6c 55%,#0a1628 100%);color:#fff;padding:64px 40px;text-align:center;border-radius:8px;margin:8px 0;">
  <div style="margin-bottom:16px;">
    <img src="${cl('elsner.com', 160)}" alt="ELSNER" height="40" style="max-height:40px;object-fit:contain;filter:brightness(0) invert(1);display:block;margin:0 auto;">
  </div>
  <p style="font-size:14px;color:rgba(255,255,255,0.6);margin:0 0 6px;">620, Sakar-IX, Ashram Road</p>
  <p style="font-size:14px;color:rgba(255,255,255,0.6);margin:0 0 6px;">Ahmedabad – 380009, Gujarat, India</p>
  <a href="https://www.elsner.com" style="color:#5b9af5;font-size:13px;text-decoration:none;">www.elsner.com</a>
</div>`,
    },
  },
];

// Fetch current proposal, merge only changed blocks, then PUT
async function run() {
  if (!TOKEN) { console.error('Usage: node fix-logo-blocks.mjs <JWT_TOKEN>'); process.exit(1); }

  // 1. GET current proposal
  const current = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 3000,
      path: `/api/proposals/${PROPOSAL_ID}`, method: 'GET',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.end();
  });

  // 2. Merge: replace only the blocks we fixed
  const fixMap = {};
  for (const b of blocks) fixMap[b.id] = b;

  const merged = (current.blocks || []).map(b => fixMap[b.id] ? { ...b, ...fixMap[b.id] } : b);

  // 3. PUT updated proposal
  const payload = JSON.stringify({ title: current.title, blocks: merged, variables: current.variables || {} });
  const result = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 3000,
      path: `/api/proposals/${PROPOSAL_ID}`, method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  if (result.blocks) {
    console.log(`✅ Fixed! Blocks: ${result.blocks.length}`);
  } else {
    console.error('❌ Error:', JSON.stringify(result));
  }
}

run().catch(console.error);
