/* ========================================
   MOFYCH Queue — Script
   Public queue status viewer
   ======================================== */

// ============ Queue API (separate deployment) ============
const QUEUE_API_URL = 'https://script.google.com/macros/s/AKfycbxyX8fxW13LZhRyEvABkBVkTC5JxWzrAyo52pcWiJA-1pRTbEuf4zkbD5hQtLZKqT_9/exec'; // Deploy separately from email system

// ============ Queue Status Options (Cotton Doll) ============
const QUEUE_STATUS_OPTIONS = {
    materialStatus: ['รอผ้าจัดส่ง', 'มีผ้าแล้ว'],
    designStatus: ['ยังไม่เริ่ม', 'กำลังทำ...', 'เสร็จสิ้น!'],
    faceEmbroidery: ['ยังไม่เริ่ม', 'กำลังทำ...', 'เสร็จสิ้น!'],
    bodySewing: ['ยังไม่เริ่ม', 'กำลังทำ...', 'เสร็จสิ้น!'],
    overallStatus: ['ยังไม่เริ่ม', 'กำลังทำ...', 'เสร็จสิ้น!'],
    shipping: ['ยังไม่จัดส่ง', 'แพคสินค้าแล้ว', 'จัดส่งแล้ว!'],
    paymentNote: ['ยังไม่จ่าย', 'มัดจำ', 'จ่ายแล้ว']
};

// ============ Queue Status Options (Cookie 3D Print) ============
const COOKIE3D_STATUS_OPTIONS = {
    designStatus: ['ยังไม่เริ่ม', 'กำลังทำ...', 'เสร็จสิ้น!'],
    modeling3D: ['ยังไม่เริ่ม', 'กำลังทำ...', 'เสร็จสิ้น!'],
    printing: ['รอปริ้น', 'กำลังปริ้น...', 'ปริ้นแล้ว!'],
    painting: ['ยังไม่เริ่ม', 'กำลังทำ...', 'เสร็จสิ้น!'],
    coating: ['ยังไม่เริ่ม', 'กำลังทำ...', 'เสร็จสิ้น!'],
    overallStatus: ['ยังไม่เริ่ม', 'กำลังทำ...', 'เสร็จสิ้น!'],
    shipping: ['ยังไม่จัดส่ง', 'แพคสินค้าแล้ว', 'จัดส่งแล้ว!'],
    paymentNote: ['ยังไม่จ่าย', 'มัดจำ', 'จ่ายแล้ว']
};
// Note: quantity (จำนวนที่สั่ง) is a free-text field, not in status options

// Status → badge class mapping
const STATUS_BADGE_MAP = {
    // Idle (gray) — ยังไม่เริ่ม / รอ
    'รอผ้าจัดส่ง': 'q-badge-idle',
    'ยังไม่เริ่ม': 'q-badge-idle',
    'ยังไม่จัดส่ง': 'q-badge-idle',
    'ยังไม่จ่าย': 'q-badge-idle',
    'รอปริ้น': 'q-badge-idle',
    // Progress (blue) — กำลังทำ
    'กำลังทำ...': 'q-badge-progress',
    'กำลังปริ้น...': 'q-badge-progress',
    // Partial (purple) — บางส่วน
    'มัดจำ': 'q-badge-partial',
    'แพคสินค้าแล้ว': 'q-badge-partial',
    // Done (cyan) — เสร็จ
    'มีผ้าแล้ว': 'q-badge-done',
    'เสร็จสิ้น!': 'q-badge-done',
    'จัดส่งแล้ว!': 'q-badge-done',
    'จ่ายแล้ว': 'q-badge-done',
    'ปริ้นแล้ว!': 'q-badge-done'
};

// "Done" state for each field — Cotton Doll
const DONE_VALUES = {
    materialStatus: 'มีผ้าแล้ว',
    designStatus: 'เสร็จสิ้น!',
    faceEmbroidery: 'เสร็จสิ้น!',
    bodySewing: 'เสร็จสิ้น!',
    overallStatus: 'เสร็จสิ้น!',
    shipping: 'จัดส่งแล้ว!',
    paymentNote: 'จ่ายแล้ว'
};

// "Done" state for each field — Cookie 3D Print
const COOKIE3D_DONE_VALUES = {
    designStatus: 'เสร็จสิ้น!',
    modeling3D: 'เสร็จสิ้น!',
    printing: 'ปริ้นแล้ว!',
    painting: 'เสร็จสิ้น!',
    coating: 'เสร็จสิ้น!',
    overallStatus: 'เสร็จสิ้น!',
    shipping: 'จัดส่งแล้ว!',
    paymentNote: 'จ่ายแล้ว'
};

// ============ Product Type Helpers ============
const COOKIE3D_PRODUCT_ID = 'cookie3dprint01';

function isCookie3D(productId) {
    return productId === COOKIE3D_PRODUCT_ID;
}

function getStatusOptionsForProduct(productId) {
    return isCookie3D(productId) ? COOKIE3D_STATUS_OPTIONS : QUEUE_STATUS_OPTIONS;
}

function getDoneValuesForProduct(productId) {
    return isCookie3D(productId) ? COOKIE3D_DONE_VALUES : DONE_VALUES;
}

// Queue table column definitions per product type
function getQueueColumns(productId) {
    if (isCookie3D(productId)) {
        return [
            { key: 'quantity', label: 'จำนวนที่สั่ง', shortLabel: 'จำนวน', isText: true },
            { key: 'designStatus', label: 'ออกแบบ', shortLabel: 'ออกแบบ' },
            { key: 'modeling3D', label: 'ปั้น3D', shortLabel: 'ปั้น3D' },
            { key: 'printing', label: 'ปริ้น', shortLabel: 'ปริ้น' },
            { key: 'painting', label: 'เพ้นสี', shortLabel: 'เพ้นสี' },
            { key: 'coating', label: 'เคลือบ', shortLabel: 'เคลือบ' },
            { key: 'overallStatus', label: 'สถานะรวม', shortLabel: 'สถานะ' },
            { key: 'shipping', label: 'จัดส่ง', shortLabel: 'ส่ง' },
            { key: 'paymentNote', label: 'การจ่าย', shortLabel: 'จ่าย' }
        ];
    }
    // Cotton Doll
    return [
        { key: 'materialStatus', label: 'สถานะวัสดุ', shortLabel: 'วัสดุ' },
        { key: 'designStatus', label: 'ออกแบบ', shortLabel: 'แบบ' },
        { key: 'workType', label: 'ประเภทงาน', shortLabel: 'ประเภท', isText: true },
        { key: 'faceEmbroidery', label: 'ปักหน้า', shortLabel: 'ปัก' },
        { key: 'bodySewing', label: 'เย็บตัว', shortLabel: 'เย็บ' },
        { key: 'overallStatus', label: 'สถานะรวม', shortLabel: 'สถานะ' },
        { key: 'shipping', label: 'จัดส่ง', shortLabel: 'ส่ง' },
        { key: 'paymentNote', label: 'หมายเหตุ/การจ่าย', shortLabel: 'จ่าย' }
    ];
}

// Get artist info for product
function getArtistInfo(productId) {
    if (isCookie3D(productId)) {
        return { name: 'CNP', role: 'Artist', avatar: 'logo/Logo.png' };
    }
    return { name: 'Nytan.Cha', role: 'Artist', avatar: 'logo/nytancha.png' };
}

// ============ Queue Data Layer ============
const QUEUE_STORAGE_KEY = 'mofych_queues';
const WORK_TYPES_STORAGE_KEY = 'mofych_work_types';

function getQueues() {
    return JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || '[]');
}

function getQueuesByProduct(productId) {
    const queues = getQueues();
    return queues
        .filter(q => q.productId === productId)
        .sort((a, b) => {
            // Rush queues first, then by queue number
            if (a.isRush && !b.isRush) return -1;
            if (!a.isRush && b.isRush) return 1;
            return a.queueNumber - b.queueNumber;
        });
}

function saveQueues(queues) {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queues));
}

function getWorkTypes(productId) {
    const all = JSON.parse(localStorage.getItem(WORK_TYPES_STORAGE_KEY) || '{}');
    return all[productId] || ['ร่างดาว', '20cm', '15cm'];
}

function saveWorkTypes(productId, types) {
    const all = JSON.parse(localStorage.getItem(WORK_TYPES_STORAGE_KEY) || '{}');
    all[productId] = types;
    localStorage.setItem(WORK_TYPES_STORAGE_KEY, JSON.stringify(all));
}

// ============ Init Demo Data ============
const QUEUE_DATA_VERSION = 'v4'; // bump this when status values change

function initQueueDemoData() {
    const currentVersion = localStorage.getItem('mofych_queue_version');

    // If version mismatch → clear old data and re-create
    if (currentVersion !== QUEUE_DATA_VERSION) {
        localStorage.removeItem(QUEUE_STORAGE_KEY);
        localStorage.setItem('mofych_queue_version', QUEUE_DATA_VERSION);
    }

    if (localStorage.getItem(QUEUE_STORAGE_KEY)) return;

    const products = getProducts();
    if (products.length === 0) return;
    const pid = products[0].id;

    const demoQueues = [
        {
            id: generateId(), productId: pid, queueNumber: 1, workType: '20cm',
            materialStatus: 'มีผ้าแล้ว', designStatus: 'เสร็จสิ้น!',
            faceEmbroidery: 'เสร็จสิ้น!', bodySewing: 'กำลังทำ...',
            overallStatus: 'กำลังทำ...', shipping: 'ยังไม่จัดส่ง',
            paymentNote: 'จ่ายแล้ว', isRush: false, isDone: false,
            createdAt: new Date().toISOString()
        },
        {
            id: generateId(), productId: pid, queueNumber: 2, workType: 'ร่างดาว',
            materialStatus: 'รอผ้าจัดส่ง', designStatus: 'กำลังทำ...',
            faceEmbroidery: 'ยังไม่เริ่ม', bodySewing: 'ยังไม่เริ่ม',
            overallStatus: 'ยังไม่เริ่ม', shipping: 'ยังไม่จัดส่ง',
            paymentNote: 'มัดจำ', isRush: false, isDone: false,
            createdAt: new Date().toISOString()
        },
        {
            id: generateId(), productId: pid, queueNumber: 3, workType: '20cm',
            materialStatus: 'มีผ้าแล้ว', designStatus: 'เสร็จสิ้น!',
            faceEmbroidery: 'กำลังทำ...', bodySewing: 'ยังไม่เริ่ม',
            overallStatus: 'กำลังทำ...', shipping: 'ยังไม่จัดส่ง',
            paymentNote: 'จ่ายแล้ว', isRush: true, isDone: false,
            createdAt: new Date().toISOString()
        },
        {
            id: generateId(), productId: pid, queueNumber: 4, workType: '15cm',
            materialStatus: 'มีผ้าแล้ว', designStatus: 'เสร็จสิ้น!',
            faceEmbroidery: 'เสร็จสิ้น!', bodySewing: 'เสร็จสิ้น!',
            overallStatus: 'เสร็จสิ้น!', shipping: 'จัดส่งแล้ว!',
            paymentNote: 'จ่ายแล้ว', isRush: false, isDone: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateId(), productId: pid, queueNumber: 5, workType: 'ร่างดาว',
            materialStatus: 'รอผ้าจัดส่ง', designStatus: 'ยังไม่เริ่ม',
            faceEmbroidery: 'ยังไม่เริ่ม', bodySewing: 'ยังไม่เริ่ม',
            overallStatus: 'ยังไม่เริ่ม', shipping: 'ยังไม่จัดส่ง',
            paymentNote: 'ยังไม่จ่าย', isRush: false, isDone: false,
            createdAt: new Date().toISOString()
        },
        {
            id: generateId(), productId: pid, queueNumber: 6, workType: '20cm',
            materialStatus: 'มีผ้าแล้ว', designStatus: 'เสร็จสิ้น!',
            faceEmbroidery: 'เสร็จสิ้น!', bodySewing: 'เสร็จสิ้น!',
            overallStatus: 'เสร็จสิ้น!', shipping: 'แพคสินค้าแล้ว',
            paymentNote: 'จ่ายแล้ว', isRush: false, isDone: false,
            createdAt: new Date().toISOString()
        }
    ];

    saveQueues(demoQueues);

    // Default work types for this product
    saveWorkTypes(pid, ['ร่างดาว', '20cm', '15cm']);
}

// ============ Current State ============
let currentProductId = null;
let liveQueueCache = {}; // productId → queues array from API

// ============ Page Init ============
document.addEventListener('DOMContentLoaded', () => {
    initData();
    // ไม่ใช้ demo data แล้ว — ดึงจาก Google Sheets API โดยตรง

    // Restore last viewed product (remember page on refresh)
    const lastProduct = sessionStorage.getItem('mofych_queue_product');
    if (lastProduct && getProducts().find(p => p.id === lastProduct)) {
        selectProduct(lastProduct);
    } else {
        renderProductSelector();
    }
});

// ============ Fetch Queues from API ============
async function fetchQueuesFromAPI(productId) {
    try {
        const url = `${QUEUE_API_URL}?action=getQueues&productId=${encodeURIComponent(productId)}`;
        const response = await fetch(url);
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            // Sort: rush first, then by queue number
            result.data.sort((a, b) => {
                if (a.isRush && !b.isRush) return -1;
                if (!a.isRush && b.isRush) return 1;
                return a.queueNumber - b.queueNumber;
            });
            liveQueueCache[productId] = result.data;
            return result.data;
        }
    } catch (err) {
        console.warn('API fetch failed, using localStorage fallback:', err);
    }
    // Fallback to localStorage
    return getQueuesByProduct(productId);
}

// ============ Product Selector ============
function renderProductSelector() {
    const products = getProducts();
    const grid = document.getElementById('productSelectorGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-muted);"><p>ยังไม่มีสินค้า</p></div>';
        return;
    }

    // Render cards with local data first, then update with API data
    grid.innerHTML = products.map(product => {
        const queues = liveQueueCache[product.id] || getQueuesByProduct(product.id);
        const totalQ = queues.length;
        const doneQ = queues.filter(q => q.isDone).length;
        const imageHTML = product.image
            ? `<div class="product-select-card-img"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"></div>`
            : `<div class="product-select-card-img"><img src="logo/Logo.png" alt="" style="width:48px;height:48px;opacity:0.15;object-fit:contain;filter:var(--wanderer-filter);"></div>`;

        return `
            <div class="product-select-card animate-on-scroll" onclick="selectProduct('${product.id}')">
                ${imageHTML}
                <div class="product-select-card-body">
                    <div class="product-select-card-name">${escapeHtml(product.name)}</div>
                    <div class="product-select-card-artist">โดย <span>${escapeHtml(product.artist)}</span></div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                        <span style="font-size:0.78rem;color:var(--text-muted);">คิว ${totalQ} รายการ</span>
                        ${doneQ > 0 ? `<span style="font-size:0.72rem;color:var(--cyan);">• เสร็จ ${doneQ}</span>` : ''}
                    </div>
                    <span class="product-select-card-btn">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 5l7 7-7 7"/>
                        </svg>
                        ดูสถานะคิว
                    </span>
                </div>
            </div>`;
    }).join('');

    setupScrollAnimations();
}

// ============ Select Product → Show Queue ============
async function selectProduct(productId) {
    currentProductId = productId;
    const product = getProducts().find(p => p.id === productId);
    if (!product) return;

    // Remember selected product for page refresh
    sessionStorage.setItem('mofych_queue_product', productId);

    // Hide selector, show queue
    document.getElementById('productSelectorSection').style.display = 'none';
    document.getElementById('queueViewSection').classList.add('active');

    // Update page description
    document.getElementById('queuePageDesc').textContent = `คิวงาน ${product.name}`;

    // Update title
    document.getElementById('queueProductTitle').innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--blue-400);">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z" fill="currentColor"/>
        </svg>
        คิว ${escapeHtml(product.name)}
    `;

    // Update artist card dynamically
    const artistInfo = getArtistInfo(productId);
    const artistAvatar = document.querySelector('.artist-avatar');
    const artistName = document.querySelector('.artist-name');
    const artistRole = document.querySelector('.artist-role');
    if (artistAvatar) artistAvatar.src = artistInfo.avatar;
    if (artistName) artistName.textContent = artistInfo.name;
    if (artistRole) artistRole.textContent = artistInfo.role;

    // Update table headers dynamically
    const columns = getQueueColumns(productId);
    const thead = document.querySelector('#queueTable thead tr');
    if (thead) {
        thead.innerHTML = `<th class="col-queue">Q</th>` +
            columns.map(col => `<th title="${escapeHtml(col.label)}">${escapeHtml(col.shortLabel)}</th>`).join('') +
            `<th title="คิวเร่ง">คิวเร่ง</th>`;
    }

    // Show loading state
    const colCount = columns.length + 2; // Q + columns + rush
    const tbody = document.getElementById('queueTableBody');
    tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align:center;padding:48px;color:var(--text-muted);">
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
            <div class="q-loading-spinner"></div>
            <span>กำลังโหลดคิว...</span>
        </div>
    </td></tr>`;
    document.getElementById('queueTable').style.display = 'table';
    document.getElementById('queueEmpty').style.display = 'none';

    // Fetch from API
    const queues = await fetchQueuesFromAPI(productId);
    renderQueueTable(productId, queues);
}

// ============ Back to Product Selector ============
function showProductSelector() {
    currentProductId = null;
    sessionStorage.removeItem('mofych_queue_product');
    document.getElementById('productSelectorSection').style.display = 'block';
    document.getElementById('queueViewSection').classList.remove('active');
    document.getElementById('queuePageDesc').textContent = 'เลือกสินค้าที่ต้องการดูสถานะคิว';
    renderProductSelector();
}

// ============ Render Queue Table ============
function renderQueueTable(productId, queues) {
    // Use passed queues or fallback to localStorage
    if (!queues) queues = getQueuesByProduct(productId);
    const tbody = document.getElementById('queueTableBody');
    const emptyDiv = document.getElementById('queueEmpty');
    const tableContainer = document.querySelector('.queue-table-container');
    const columns = getQueueColumns(productId);
    const colCount = columns.length + 2; // Q + columns + rush

    if (queues.length === 0) {
        tableContainer.style.display = 'none';
        emptyDiv.style.display = 'block';
        updateQueueStats(queues, productId);
        return;
    }

    tableContainer.style.display = 'block';
    emptyDiv.style.display = 'none';

    tbody.innerHTML = queues.map(q => {
        const rowClasses = [];
        if (q.isRush) rowClasses.push('row-rush');
        if (q.isDone) rowClasses.push('row-done');

        // Done row → merged message instead of individual badges
        if (q.isDone) {
            return `
            <tr class="${rowClasses.join(' ')}">
                <td class="col-queue" data-label="">Q${q.queueNumber}</td>
                <td colspan="${colCount - 1}" class="done-message" data-label="">เสร็จเรียบร้อยแล้ว~</td>
            </tr>`;
        }

        // Build cells dynamically based on columns
        const cells = columns.map(col => {
            if (col.isText) {
                return `<td data-label="${escapeHtml(col.shortLabel)}"><span class="q-type-text">${escapeHtml(q[col.key] || '')}</span></td>`;
            }
            return `<td data-label="${escapeHtml(col.shortLabel)}">${badge(q[col.key])}</td>`;
        }).join('');

        return `
            <tr class="${rowClasses.join(' ')}">
                <td class="col-queue" data-label="">Q${q.queueNumber}</td>
                ${cells}
                <td data-label="คิวเร่ง">${rushIcon(q.isRush)}</td>
            </tr>`;
    }).join('');

    updateQueueStats(queues, productId);
}

// ============ Badge Helper ============
function badge(value) {
    const cls = STATUS_BADGE_MAP[value] || 'q-badge-idle';
    return `<span class="q-badge ${cls}">${escapeHtml(value)}</span>`;
}

function rushIcon(isRush) {
    return `<span class="rush-icon ${isRush ? 'active' : ''}">${isRush ? '🔥' : '—'}</span>`;
}

function doneIcon(isDone) {
    return `<span class="done-icon ${isDone ? 'active' : ''}">${isDone ? '✓' : '—'}</span>`;
}

// ============ Stats ============
function updateQueueStats(queues, productId) {
    const total = queues.length;
    const done = queues.filter(q => q.isDone).length;
    // นับ "กำลังทำ" = ยังไม่เสร็จ แต่มี field ไหนเริ่มทำแล้ว (ไม่ใช่สถานะเริ่มต้นทั้งหมด)
    const INITIAL_VALUES = ['รอผ้าจัดส่ง', 'ยังไม่เริ่ม', 'ยังไม่จัดส่ง', 'ยังไม่จ่าย', 'รอปริ้น'];
    const columns = getQueueColumns(productId || currentProductId);
    const progress = queues.filter(q => {
        if (q.isDone) return false;
        // ตรวจทุก field ที่ไม่ใช่ text column
        return columns
            .filter(col => !col.isText)
            .map(col => q[col.key])
            .some(val => val && !INITIAL_VALUES.includes(val));
    }).length;

    const statTotal = document.getElementById('statTotal');
    const statProgress = document.getElementById('statProgress');
    const statDone = document.getElementById('statDone');

    if (statTotal) statTotal.textContent = total;
    if (statProgress) statProgress.textContent = progress;
    if (statDone) statDone.textContent = done;
}

