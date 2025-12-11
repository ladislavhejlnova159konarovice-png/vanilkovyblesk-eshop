// Simple smoke test script using global fetch (Node 18+).
// Does: GET /, GET /admin/login (extract CSRF), POST /admin/login, GET /admin/orders
const base = 'http://localhost:3000';
// Try to load ADMIN_PASSWORD from .env if present
const fs = require('fs');
let pw = process.env.ADMIN_PASSWORD || 'change_this_to_a_strong_password';
try {
  const env = fs.readFileSync('.env', 'utf8');
  const m = env.match(/^\s*ADMIN_PASSWORD\s*=\s*(.+)\s*$/m);
  if (m && m[1]) pw = m[1].trim();
} catch (e) {
  // ignore
}

let cookies = [];

function saveSetCookie(header) {
  if (!header) return;
  // header may contain multiple cookies separated by \n in Node fetch
  const parts = header.split(/\r?\n/).filter(Boolean);
  for (const part of parts) {
    const kv = part.split(';')[0].trim();
    if (kv) cookies = cookies.filter(c => !c.startsWith(kv.split('=')[0] + '='));
    cookies.push(kv);
  }
}

async function http(path, opts = {}) {
  opts.headers = opts.headers || {};
  if (cookies.length) opts.headers['cookie'] = cookies.join('; ');
  const res = await fetch(base + path, opts);
  const sc = res.headers.get('set-cookie');
  if (sc) saveSetCookie(sc);
  return res;
}

async function run() {
  try {
    // wait for server health endpoint to be available (retry a few times)
    let r1 = null;
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        r1 = await http('/health');
        if (r1 && r1.status === 200) break;
      } catch (e) {
        // ignore and retry
      }
      // wait 200ms then retry
      await new Promise(res => setTimeout(res, 200));
    }
    if (!r1) throw new Error('fetch failed');
    if (r1.status !== 200) throw new Error('health endpoint did not return 200');
    console.log('GET /health ->', r1.status);

    // now fetch the root and proceed with the rest of smoke steps
    const root = await http('/');
    console.log('GET / ->', root.status);

    const r2 = await http('/admin/login');
    console.log('GET /admin/login ->', r2.status);
    const html = await r2.text();
    const m = html.match(/name="_csrf"\s+value="([^"]+)"/);
    if (!m) {
      console.error('CSRF token not found in login page');
      process.exit(2);
    }
    const csrf = m[1];

    const body = `password=${encodeURIComponent(pw)}&_csrf=${encodeURIComponent(csrf)}`;
    const r3 = await http('/admin/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
    console.log('POST /admin/login ->', r3.status);

    const r4 = await http('/admin/orders');
    console.log('GET /admin/orders ->', r4.status);
    const ordersHtml = await r4.text();
    if (/Orders|Objednávky/i.test(ordersHtml)) {
      console.log('Orders page content looks OK');
      setTimeout(() => process.exit(0), 100);
    } else {
      console.error('Orders page returned but content not recognised');
      setTimeout(() => process.exit(3), 100);
    }
  } catch (err) {
    console.error('Smoke test failed:', err.message || err);
    setTimeout(() => process.exit(1), 100);
  }
}

run();
