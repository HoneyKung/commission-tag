const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const KEY = require('node:crypto').randomBytes(32).toString('hex');
const PRODUCTS = ['Cotton Doll ตุ๊กตาไอดอล', 'Cookie 3D Print'];

class Sheet {
  constructor(rows = []) { this.rows = rows.map(row => row.slice()); }
  getDataRange() { return { getValues: () => this.rows.map(row => row.slice()) }; }
  appendRow(row) { this.rows.push(row.slice()); }
  deleteRow(index) { this.rows.splice(index - 1, 1); }
  getLastRow() { return this.rows.length; }
  getRange(row, col) {
    const sheet = this;
    return {
      setFontWeight() { return this; }, setBackground() { return this; }, setFontColor() { return this; },
      setValue(value) { if (sheet.rows[row - 1]) sheet.rows[row - 1][col - 1] = value; return this; },
      setValues(values) { values.forEach((valuesRow, offset) => { sheet.rows[row - 1 + offset] = valuesRow.slice(); }); return this; }
    };
  }
  setColumnWidth() {}
  setFrozenRows() {}
}
function env(seed = {}) {
  const sheets = new Map(Object.entries(seed).map(([name, rows]) => [name, new Sheet(rows)]));
  const state = { opens: 0, mail: [], key: null };
  const book = {
    getSheetByName(name) { return sheets.get(name) || null; },
    insertSheet(name) { const sheet = new Sheet(); sheets.set(name, sheet); return sheet; }
  };
  const sandbox = {
    SpreadsheetApp: { openByUrl() { state.opens++; return book; } },
    PropertiesService: { getScriptProperties() { return { getProperty(name) { return name === 'ADMIN_KEY' ? state.key : null; } }; } },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput(content) { return { content, setMimeType() { return this; } }; } },
    MailApp: { sendEmail(mail) { state.mail.push(mail); }, getRemainingDailyQuota() { return 100; } },
    Logger: { log() {} }, Date, JSON, Object, Array, String, Number, Math, Error, RegExp, parseInt, isNaN
  };
  return { sandbox, state, sheets };
}
function load(file, seed, mutate) {
  let source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  if (mutate) source = source.replace(/if \(!e\.postData \|\| !e\.postData\.contents \|\| !isAuthorized\(data\)\) \{/g, 'if (false) {');
  const app = env(seed);
  vm.createContext(app.sandbox);
  vm.runInContext(source, app.sandbox, { filename: file });
  return app;
}
function post(app, data, options = {}) {
  return JSON.parse(app.sandbox.doPost({
    postData: options.noBody ? undefined : { contents: JSON.stringify(data) },
    parameter: options.parameter || {}
  }).content);
}
function get(app, parameter = {}) { return JSON.parse(app.sandbox.doGet({ parameter }).content); }
function denied(actual) { assert.deepEqual(actual, { success: false, error: 'UNAUTHORIZED' }); }

const registrationSeed = {
  'ฝากแทค': [['ชื่อ', 'Email', 'สินค้า', 'วันที่'], ['Alice Example', 'alice.one@example.test', PRODUCTS[0], '2026-09-01'], ['Bob Example', 'bob.two@example.test', 'mnlpjt1xshaa6', '2026-09-02']],
  'ฝากแทค-Cookie3DPrint': [['ชื่อ', 'Email', 'สินค้า', 'วันที่'], ['Alice Example', 'alice.one@example.test', PRODUCTS[1], '2026-09-03'], ['Cara Example', 'cara.three@example.test', PRODUCTS[1], '2026-09-04']]
};
const cottonHeaders = ['productId', 'queueNumber', 'workType', 'materialStatus', 'designStatus', 'faceEmbroidery', 'bodySewing', 'overallStatus', 'shipping', 'paymentNote', 'isRush', 'isDone', 'createdAt'];
const queueSeed = {
  'คิวงาน': [cottonHeaders, ['mnlpjt1xshaa6', 1, 'งานเย็บ', 'รอผ้าจัดส่ง', 'ยังไม่เริ่ม', 'ยังไม่เริ่ม', 'ยังไม่เริ่ม', 'ยังไม่เริ่ม', 'ยังไม่จัดส่ง', 'ยังไม่จ่าย', 'FALSE', 'FALSE', '2026-09-01T00:00:00.000Z']],
  'ประเภทงาน': [['productId', 'workTypeName'], ['mnlpjt1xshaa6', 'งานเย็บ']]
};
function run(mutate = false) {
  let assertions = 0;
  const check = fn => { fn(); assertions++; };
  const fixed = load('google-apps-script-fixed.js', registrationSeed, mutate);
  const fixedActions = [
    { action: 'verifyAdmin' }, { action: 'getRegistrations' },
    { action: 'broadcast', productName: PRODUCTS[0], emailSubject: 'Test', emailBody: 'Test' }
  ];
  for (const action of fixedActions) {
    check(() => denied(post(fixed, action)));
    check(() => denied(post(fixed, { ...action, adminKey: 'invalid-' + KEY })));
    assert.equal(fixed.state.opens, 0);
    assert.equal(fixed.state.mail.length, 0);
  }
  fixed.state.key = KEY;
  check(() => assert.deepEqual(post(fixed, { action: 'verifyAdmin', adminKey: KEY }), { success: true }));
  check(() => denied(post(fixed, { action: 'getRegistrations', adminKey: KEY }, { noBody: true, parameter: { action: 'getRegistrations', adminKey: KEY } })));
  check(() => denied(post(fixed, { action: 'getRegistrations' }, { parameter: { action: 'getRegistrations', adminKey: KEY } })));
  check(() => assert.equal(get(fixed, { action: 'getRegistrations', adminKey: KEY }).data, undefined));
  const registrations = post(fixed, { action: 'getRegistrations', adminKey: KEY });
  check(() => assert.equal(registrations.data.length, 4));
  const broadcast = post(fixed, { action: 'broadcast', adminKey: KEY, productName: PRODUCTS[0], emailSubject: 'Test', emailBody: 'Test' });
  check(() => assert.equal(broadcast.count, 2));
  check(() => assert.equal(fixed.state.mail.length, 2));

  const unset = load('google-apps-script-fixed.js', registrationSeed, mutate);
  for (const action of fixedActions) check(() => denied(post(unset, { ...action, adminKey: KEY })));
  assert.equal(unset.state.opens, 0);
  assert.equal(unset.state.mail.length, 0);

  const counts = post(fixed, { action: 'getCounts' });
  check(() => assert.deepEqual(counts.counts, { [PRODUCTS[0]]: 2, [PRODUCTS[1]]: 2 }));
  check(() => assert.equal(JSON.stringify(counts).includes('@'), false));
  const byEmail = post(fixed, { action: 'lookupByEmail', email: 'ALICE.ONE@example.test' });
  check(() => assert.equal(byEmail.data.length, 2));
  check(() => assert.deepEqual(Object.keys(byEmail.data[0]).sort(), ['date', 'productName']));
  const byName = post(fixed, { action: 'lookupByName', name: 'alice' });
  check(() => assert.deepEqual(byName.emails, ['al***@example.test']));
  check(() => assert.equal(JSON.stringify(byName).includes('alice.one'), false));
  for (const params of [{ action: 'getRegistrations' }, { action: 'broadcast' }, { action: 'anything' }]) {
    const response = get(fixed, params);
    check(() => assert.equal(JSON.stringify(response).includes('Alice Example'), false));
    check(() => assert.equal(JSON.stringify(response).includes('alice.one@example.test'), false));
  }

  const beforeMail = fixed.state.mail.length;
  const beforeRows = fixed.sheets.get('ฝากแทค').rows.length;
  const newReg = { action: 'register', name: 'New Customer', email: 'NEW@example.test', productNames: PRODUCTS };
  const saved = post(fixed, newReg);
  check(() => assert.deepEqual(saved.saved, PRODUCTS));
  check(() => assert.deepEqual(saved.duplicates, []));
  check(() => assert.equal(fixed.state.mail.length, beforeMail + 1));
  const duplicate = post(fixed, { ...newReg, email: 'new@example.test' });
  check(() => assert.deepEqual(duplicate.saved, []));
  check(() => assert.deepEqual(duplicate.duplicates, PRODUCTS));
  check(() => assert.equal(fixed.sheets.get('ฝากแทค').rows.length, beforeRows + 1));
  check(() => assert.equal(fixed.state.mail.length, beforeMail + 1));

  const queue = load('google-apps-script-queue.js', queueSeed, mutate);
  const queueActions = [
    { action: 'addQueue', productId: 'mnlpjt1xshaa6' },
    { action: 'updateQueue', productId: 'mnlpjt1xshaa6', queueNumber: 1 },
    { action: 'deleteQueue', productId: 'mnlpjt1xshaa6', queueNumber: 1 },
    { action: 'bulkUpdate', productId: 'mnlpjt1xshaa6', queues: [] },
    { action: 'addWorkType', productId: 'mnlpjt1xshaa6', workTypeName: 'Sample' },
    { action: 'deleteWorkType', productId: 'mnlpjt1xshaa6', workTypeName: 'งานเย็บ' }
  ];
  for (const action of queueActions) {
    check(() => denied(post(queue, action)));
    check(() => denied(post(queue, { ...action, adminKey: 'wrong' })));
    assert.equal(queue.state.opens, 0);
  }
  queue.state.key = KEY;
  check(() => assert.deepEqual(post(queue, { action: 'verifyAdmin', adminKey: KEY }), { success: true }));
  check(() => denied(post(queue, { action: 'bulkUpdate', productId: 'mnlpjt1xshaa6', queues: [] }, { parameter: { action: 'getRegistrations', adminKey: KEY } })));
  const queues = get(queue, { action: 'getQueues', productId: 'mnlpjt1xshaa6' });
  check(() => assert.deepEqual(Object.keys(queues.data[0]).sort(), cottonHeaders.slice().sort()));
  check(() => assert.equal(queues.data[0].queueNumber, 1));
  check(() => assert.deepEqual(get(queue, { action: 'getWorkTypes', productId: 'mnlpjt1xshaa6' }), { success: true, data: [{ productId: 'mnlpjt1xshaa6', workTypeName: 'งานเย็บ' }] }));
  for (const action of [
    { action: 'addQueue', productId: 'mnlpjt1xshaa6' },
    { action: 'updateQueue', productId: 'mnlpjt1xshaa6', queueNumber: 1, designStatus: 'เสร็จแล้ว' },
    { action: 'deleteQueue', productId: 'mnlpjt1xshaa6', queueNumber: 1 },
    { action: 'bulkUpdate', productId: 'mnlpjt1xshaa6', queues: [] },
    { action: 'addWorkType', productId: 'mnlpjt1xshaa6', workTypeName: 'Sample Type' },
    { action: 'deleteWorkType', productId: 'mnlpjt1xshaa6', workTypeName: 'Sample Type' }
  ]) {
    const response = post(queue, { ...action, adminKey: KEY });
    check(() => assert.equal(response.success, true, action.action + ' should succeed with the configured key'));
  }
  const queueUnset = load('google-apps-script-queue.js', queueSeed, mutate);
  for (const action of queueActions) check(() => denied(post(queueUnset, { ...action, adminKey: KEY })));
  assert.equal(queueUnset.state.opens, 0);

  if (mutate) throw new Error('authorization mutation unexpectedly passed the denial assertions');
  return assertions;
}
try {
  const assertions = run(process.argv.includes('--mutate-auth'));
  process.stdout.write('Apps Script access tests passed (' + assertions + ' assertions).\n');
} catch (error) {
  process.stderr.write('Apps Script access tests failed: ' + error.message + '\n');
  process.exitCode = 1;
}

