const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.BROWSER_TEST_PORT || 4173);
const origin = `http://127.0.0.1:${PORT}`;
const adminKey = crypto.randomBytes(32).toString('hex');
const products = ['Cotton Doll ตุ๊กตาไอดอล', 'Cookie 3D Print'];
let registrations = [
  { name: 'Sample Visitor', email: 'visitor@example.test', productName: products[0], date: '2026-09-01' },
  { name: 'Second Sample', email: 'second@example.test', productName: products[1], date: '2026-09-02' }
];
let queues = [{ productId: 'mnlpjt1xshaa6', queueNumber: 1, workType: 'งานเย็บ', materialStatus: 'รอผ้าจัดส่ง', designStatus: 'ยังไม่เริ่ม', faceEmbroidery: 'ยังไม่เริ่ม', bodySewing: 'ยังไม่เริ่ม', overallStatus: 'ยังไม่เริ่ม', shipping: 'ยังไม่จัดส่ง', paymentNote: 'ยังไม่จ่าย', isRush: false, isDone: false, createdAt: '2026-09-01T00:00:00.000Z' }];
const workTypes = [{ productId: 'mnlpjt1xshaa6', workTypeName: 'งานเย็บ' }];
function respond(res, value, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
  res.end(JSON.stringify(value));
}
function mask(email) { const [local, domain] = email.split('@'); return domain ? local.slice(0, Math.min(2, local.length)) + '***@' + domain : '***'; }
function registrationEndpoint(req, res, url, data) {
  if (req.method === 'GET') return respond(res, { status: 'MOFYCH mock registration API' });
  const action = data.action;
  if (action === 'verifyAdmin') return respond(res, { success: data.adminKey === adminKey });
  if (['broadcast', 'getRegistrations'].includes(action) && data.adminKey !== adminKey) return respond(res, { success: false, error: 'UNAUTHORIZED' });
  if (action === 'getCounts') {
    const counts = Object.fromEntries(products.map(name => [name, registrations.filter(row => row.productName === name).length]));
    return respond(res, { success: true, counts });
  }
  if (action === 'register') {
    const names = data.productNames || [data.productName];
    const saved = [], duplicates = [];
    for (const productName of names) {
      if (registrations.some(row => row.email.toLowerCase() === String(data.email).toLowerCase() && row.productName === productName)) { duplicates.push(productName); continue; }
      registrations.push({ name: data.name, email: String(data.email).toLowerCase(), productName, date: new Date().toISOString() });
      saved.push(productName);
    }
    return respond(res, { success: true, saved, duplicates });
  }
  if (action === 'lookupByEmail') return respond(res, { success: true, data: registrations.filter(row => row.email.toLowerCase() === String(data.email || '').toLowerCase()).map(row => ({ productName: row.productName, date: row.date })) });
  if (action === 'lookupByName') return respond(res, { success: true, emails: [...new Set(registrations.filter(row => row.name.toLowerCase().includes(String(data.name || '').toLowerCase())).map(row => mask(row.email)))] });
  if (action === 'deleteReg') {
    const before = registrations.length;
    registrations = registrations.filter(row => !(row.email.toLowerCase() === String(data.email).toLowerCase() && row.productName === data.productName));
    return respond(res, { success: true, removed: before - registrations.length });
  }
  if (action === 'getRegistrations') return respond(res, { success: true, data: registrations.map(row => ({ 'ชื่อ': row.name, Email: row.email, 'สินค้า': row.productName, 'วันที่': row.date })) });
  if (action === 'broadcast') return respond(res, { success: true, count: 0, total: 0, failed: [], quotaLeft: 100 });
  return respond(res, { success: false, error: 'Unknown action' });
}
function queueEndpoint(req, res, url, data) {
  const action = url.searchParams.get('action') || data.action;
  if (req.method === 'GET') {
    if (action === 'getQueues') {
      const productId = url.searchParams.get('productId') || '';
      return respond(res, { success: true, data: queues.filter(row => !productId || row.productId === productId) });
    }
    if (action === 'getWorkTypes') {
      const productId = url.searchParams.get('productId') || '';
      return respond(res, { success: true, data: workTypes.filter(row => !productId || row.productId === productId) });
    }
    return respond(res, { status: 'MOFYCH mock queue API' });
  }
  if (data.adminKey !== adminKey) return respond(res, { success: false, error: 'UNAUTHORIZED' });
  if (action === 'verifyAdmin') return respond(res, { success: true });
  if (action === 'bulkUpdate') {
    queues = (data.queues || []).map((row, index) => ({ ...row, productId: data.productId, queueNumber: row.queueNumber || index + 1 }));
    return respond(res, { success: true, message: 'Mock sync complete' });
  }
  return respond(res, { success: true });
}
const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return respond(res, {});
  const url = new URL(req.url, origin);
  if (url.pathname === '/mock-registration' || url.pathname === '/mock-queue') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      let data = {};
      if (raw) { try { data = JSON.parse(raw); } catch { return respond(res, { success: false, error: 'Invalid JSON' }, 400); } }
      if (url.pathname === '/mock-registration') return registrationEndpoint(req, res, url, data);
      return queueEndpoint(req, res, url, data);
    });
    return;
  }
  let relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const file = path.resolve(ROOT, '.' + relative);
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) return respond(res, { error: 'forbidden' }, 403);
  fs.readFile(file, (error, buffer) => {
    if (error) return respond(res, { error: 'not found' }, 404);
    const ext = path.extname(file).toLowerCase();
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
    let output = buffer;
    if (ext === '.js') {
      let text = buffer.toString('utf8');
      text = text.replace(/https:\/\/script\.google\.com\/macros\/s\/AKfycbz61XBdNkAS8IeMzR4CnlojyWbHxVjOHbgjMg6-NgrLPLDORRwIp7V2GQhYFIBsC0dJ\/exec/g, origin + '/mock-registration');
      text = text.replace(/https:\/\/script\.google\.com\/macros\/s\/AKfycbxyX8fxW13LZhRyEvABkBVkTC5JxWzrAyo52pcWiJA-1pRTbEuf4zkbD5hQtLZKqT_9\/exec/g, origin + '/mock-queue');
      output = Buffer.from(text, 'utf8');
    }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(output);
  });
});
server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`Browser fixture: ${origin}\nMock ADMIN_KEY: ${adminKey}\n`);
});
process.on('SIGINT', () => server.close(() => process.exit(0)));
