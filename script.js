/* ========================================
   MOFYCH Commission Tag — Main Script
   Dark Mode + Wanderer + Products w/ Images
   ======================================== */

// ============ Google Apps Script Backend ============
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz61XBdNkAS8IeMzR4CnlojyWbHxVjOHbgjMg6-NgrLPLDORRwIp7V2GQhYFIBsC0dJ/exec';

/* ============ ชื่อสินค้ามาตรฐานของระบบฝากแทค ============
   Google Apps Script เลือกแท็บในชีตจาก "ชื่อสินค้า" ไม่ใช่รหัส
   ถ้าหลุดรหัสดิบไป (mnlpjt1xshaa6 / cookie3dprint01) มันจะตกไปแท็บ default
   = รายการ Cookie ไปโผล่ในแท็บของ Cotton ซึ่งเคยเกิดมาแล้ว

   ⚠ ห้ามพึ่ง localStorage อย่างเดียว catalog ในเครื่องแก้ได้/หายได้
     ตารางนี้เป็นตัวตัดสินสุดท้ายของสองสินค้าที่มีอยู่จริง
   ⚠ รหัสพวกนี้ระบบคิวใช้อยู่ด้วย ห้ามเปลี่ยนค่ารหัส เปลี่ยนได้แค่ "ชื่อที่ส่งไปชีต" */
const REGISTRATION_PRODUCT_NAMES = Object.freeze({
    mnlpjt1xshaa6: 'Cotton Doll ตุ๊กตาไอดอล',
    cookie3dprint01: 'Cookie 3D Print'
});

/* แปลงรหัสสินค้า → ชื่อมาตรฐานที่ส่งขึ้นชีตได้
   คืน null เมื่อไม่รู้จัก เพื่อให้ผู้เรียกตัดสินใจเอง ห้ามปล่อยรหัสดิบไปเป็นชื่อสินค้า */
function getCanonicalRegistrationProductName(productId) {
    const fixed = REGISTRATION_PRODUCT_NAMES[productId];
    if (fixed) return fixed;
    const product = getProducts().find(p => p.id === productId);
    return product && product.name ? product.name : null;
}

// ============ Data Layer ============
const STORAGE_KEYS = { products: 'mofych_products', registrations: 'mofych_registrations', settings: 'mofych_settings' };

function initData() {
    // ใช้ productId คงที่ เพื่อให้ตรงกับ Google Sheets ทุกเครื่อง
    const FIXED_PRODUCT_ID = 'mnlpjt1xshaa6';
    const FIXED_COOKIE3D_ID = 'cookie3dprint01';

    if (!localStorage.getItem(STORAGE_KEYS.products)) {
        localStorage.setItem(STORAGE_KEYS.products, JSON.stringify([
            { id: FIXED_PRODUCT_ID, name: 'Cotton Doll ตุ๊กตาไอดอล', artist: 'Nytan.Cha', status: 'open', image: 'images/Cottondoll.png', createdAt: new Date().toISOString() },
            { id: FIXED_COOKIE3D_ID, name: 'Cookie 3D Print', artist: 'CNP', status: 'open', image: 'images/Cookie3DPrint.jpg', createdAt: new Date().toISOString() }
        ]));
    } else {
        // บังคับแก้ productId / รูปภาพเก่าที่ผิด
        let products = JSON.parse(localStorage.getItem(STORAGE_KEYS.products));
        let changed = false;
        products.forEach(p => {
            // แก้ productId ให้ตรงกับ Google Sheets
            if (p.name.includes('Doll') && p.id !== FIXED_PRODUCT_ID) {
                p.id = FIXED_PRODUCT_ID;
                changed = true;
            }
            if (p.name.includes('Doll') && (!p.image || p.image === 'images/Cotton doll.png' || p.image === '')) {
                p.image = 'images/Cottondoll.png';
                p.name = 'Cotton Doll ตุ๊กตาไอดอล';
                changed = true;
            }
            // แก้ Cookie 3D Print productId
            if (p.name.includes('Cookie 3D') && p.id !== FIXED_COOKIE3D_ID) {
                p.id = FIXED_COOKIE3D_ID;
                changed = true;
            }
        });
        // เพิ่ม Cookie 3D Print ถ้ายังไม่มี
        if (!products.find(p => p.id === FIXED_COOKIE3D_ID)) {
            products.push({ id: FIXED_COOKIE3D_ID, name: 'Cookie 3D Print', artist: 'CNP', status: 'open', image: 'images/Cookie3DPrint.jpg', createdAt: new Date().toISOString() });
            changed = true;
        }
        if (changed) localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
    }
    if (!localStorage.getItem(STORAGE_KEYS.registrations)) {
        localStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.settings)) {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({
            adminPasswordHash: '5e09f68817f3bff0e91cced36b88d853b91c32e4f9c2a5e3d2c6e8a0b4f7d1e3',
            queueStages: ['รอคิว', 'กำลังออกแบบ', 'กำลังผลิต', 'ตรวจสอบคุณภาพ', 'เสร็จแล้ว', 'ส่งแล้ว']
        }));
    }
}

function getProducts() { return JSON.parse(localStorage.getItem(STORAGE_KEYS.products) || '[]'); }
function getRegistrations() { return JSON.parse(localStorage.getItem(STORAGE_KEYS.registrations) || '[]'); }
function getSettings() { return JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}'); }
function saveRegistrations(r) { localStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify(r)); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 7); }

// ============ Thai Date Helper ============
// ป้องกันบวกปีซ้ำ: Sheets เก็บ พ.ศ. แต่ th-TH locale จะบวก +543 อีก
function formatThaiDate(dateStr) {
    if (!dateStr) return '-';
    // ถ้าเป็น format จาก Sheets เช่น "5/4/2569 21:22:53"
    // แยก parse เอง เพื่อไม่ให้ new Date() ตีความปี 2569 เป็น ค.ศ.
    const match = dateStr.toString().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
        let [, d, m, y] = match;
        y = parseInt(y);
        // ถ้าปี > 2400 → น่าจะเป็น พ.ศ. แล้ว แปลงกลับเป็น ค.ศ. ก่อน
        if (y > 2400) y -= 543;
        const dt = new Date(y, parseInt(m) - 1, parseInt(d));
        return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    // ถ้าเป็น ISO format ปกติ เช่น "2026-04-24T07:00:00Z"
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return dateStr;
    return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ============ Sync with Google Sheets ============
function fetchRegistrationRows() {
    return fetch(APPS_SCRIPT_URL + '?action=getRegistrations', { cache: 'no-store' })
        .then(res => {
            if (!res.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ (${res.status})`);
            return res.json();
        })
        .then(data => {
            if (!data || data.success !== true || !Array.isArray(data.data)) {
                throw new Error('รูปแบบข้อมูลจาก Google Sheets ไม่ถูกต้อง');
            }
            return data.data;
        });
}

function applyRegistrationRows(rows) {
    const products = getProducts();
    const newRegs = rows.map(row => {
        const product = products.find(p => p.name === row['สินค้า']);
        return {
            id: generateId(),
            name: row['ชื่อ'],
            email: row['Email'],
            productId: product ? product.id : row['สินค้า'],
            createdAt: row['วันที่'] || new Date().toISOString()
        };
    });

    // Google Sheets เป็นแหล่งข้อมูลหลัก อัปเดต local cache หลังอ่านสำเร็จเท่านั้น
    saveRegistrations(newRegs);
    renderProducts();

    if (typeof renderRegistrations === 'function') renderRegistrations();
    if (typeof updateStats === 'function') updateStats();
    if (typeof updateNotifyCount === 'function') updateNotifyCount();
}

function fetchRegistrations() {
    return fetchRegistrationRows()
        .then(rows => {
            applyRegistrationRows(rows);
            return rows;
        })
        .catch(err => {
            console.error('Error fetching registrations:', err);
            return null;
        });
}

/* ⭐ deployment ตัวนี้ตอบกลับข้ามออริจินได้จริง (ยิงเทสแล้วอ่าน JSON กลับมาได้ 2026-08-19)
   จึงเลิกใช้ no-cors = อ่านผลจากคำตอบได้เลย ไม่ต้องวนอ่านชีตมายืนยันอีก
   ⚠ Content-Type ต้องเป็น text/plain เท่านั้น จะได้เป็น simple request ไม่มี preflight
     (Apps Script ไม่ตอบ OPTIONS ถ้าโดน preflight คำขอจะตายก่อนถึง doPost) */
function postToRegistrationBackend(payload) {
    return fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload)
    }).then(res => {
        if (!res.ok) throw new Error(`ส่งข้อมูลไม่สำเร็จ (${res.status})`);
        return res.json();
    });
}

/* ⚠ ตั้งแต่ 2026-08-19 การลงชื่อ/ยกเลิกไม่ใช้ชุดนี้แล้ว เพราะอ่านคำตอบของ POST ได้ตรงๆ
   เก็บไว้เผื่อโค้ดส่วนอื่นเรียกใช้ และเผื่อ deployment ใหม่ในอนาคตตอบข้ามออริจินไม่ได้ */
const VERIFY_DELAYS = [600, 1000, 1600, 2400];

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function rowMatchesRegistration(row, email, productName) {
    return String(row['Email'] || '').trim().toLowerCase() === email.toLowerCase()
        && String(row['สินค้า'] || '').trim() === productName;
}

function verifyRemoteRegistration(email, productNames, shouldExist, attempt) {
    const n = attempt || 0;
    return fetchRegistrationRows()
        .then(rows => {
            const matchesExpectedState = productNames.every(productName => {
                const found = rows.some(row => rowMatchesRegistration(row, email, productName));
                return shouldExist ? found : !found;
            });
            if (matchesExpectedState) return rows;
            throw new Error('ยังไม่พบผลที่ต้องการใน Google Sheets');
        })
        .catch(err => {
            if (n >= VERIFY_DELAYS.length) throw err;
            return wait(VERIFY_DELAYS[n]).then(() =>
                verifyRemoteRegistration(email, productNames, shouldExist, n + 1));
        });
}

// ============ Init ============
document.addEventListener('DOMContentLoaded', () => {
    initData();
    initTheme();
    renderProducts();
    renderProductSelect();
    setupNavbar();
    setupMascots();
    setupScrollAnimations();
    setupFormHandlers();

    // ดึงข้อมูลรายชื่อจาก Google Sheets ทันทีที่โหลดเว็บ
    fetchRegistrations();
});

// ============ ธีม ============
// เว็บนี้มีโหมดสว่างอย่างเดียว ไม่มีดาร์กโหมด
// (ยังตั้ง attribute ไว้เพราะบาง selector ใน queue-style.css ผูกกับ [data-theme="light"])
function initTheme() {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.removeItem('mofych_theme');
}

// ============ Navbar ============
function setupNavbar() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    if (navbar) {
        window.addEventListener('scroll', () => { navbar.classList.toggle('scrolled', window.scrollY > 20); });
    }
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => { hamburger.classList.toggle('active'); mobileMenu.classList.toggle('open'); });
        document.querySelectorAll('.mobile-link').forEach(link => {
            link.addEventListener('click', () => { hamburger.classList.remove('active'); mobileMenu.classList.remove('open'); });
        });
    }
}

// ============ Products ============
function renderProducts() {
    const products = getProducts();
    const grid = document.getElementById('productsGrid');
    const noProducts = document.getElementById('noProducts');
    if (!grid) return;
    if (products.length === 0) { grid.style.display = 'none'; if (noProducts) noProducts.style.display = 'block'; return; }
    grid.style.display = 'grid';
    if (noProducts) noProducts.style.display = 'none';

    const heartSVG = `<svg class="heart-icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

    grid.innerHTML = products.map(product => {
        const regCount = getRegistrations().filter(r => r.productId === product.id).length;
        const statusClass = product.status === 'open' ? 'status-open' : 'status-closed';
        const statusText = product.status === 'open' ? 'เปิดรับ' : 'ปิดรับ';
        const imageHTML = product.image
            ? `<div class="product-card-image"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"></div>`
            : `<div class="product-card-image"><img src="logo/Logo.png" alt="" class="placeholder-img"></div>`;
        return `
            <div class="product-card animate-on-scroll">
                ${imageHTML}
                <div class="product-card-body">
                    <div class="product-card-status ${statusClass}"><span class="status-dot"></span> ${statusText}</div>
                    <h3 class="product-card-name">${escapeHtml(product.name)}</h3>
                    <p class="product-card-artist">โดย <span>${escapeHtml(product.artist)}</span></p>
                    <p class="product-card-count">${heartSVG} ฝากแทคแล้ว ${regCount} คน</p>
                </div>
            </div>`;
    }).join('');
    setupScrollAnimations();
}

function renderProductSelect() {
    const products = getProducts();
    const list = document.getElementById('productSelectList');
    if (!list) return;
    if (products.length === 0) { list.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">ยังไม่มีสินค้าในขณะนี้</p>'; return; }
    list.innerHTML = products.map((product, i) => {
        const thumb = product.image ? `<img src="${escapeHtml(product.image)}" alt="" class="product-select-thumb">` : '';
        return `
            <label class="product-select-item" data-product-id="${product.id}">
                <input type="checkbox" name="products" value="${product.id}">
                <div class="product-checkbox">&#10003;</div>
                ${thumb}
                <div class="product-select-info">
                    <div class="product-select-name">${escapeHtml(product.name)}</div>
                    <div class="product-select-artist">โดย ${escapeHtml(product.artist)}</div>
                </div>
            </label>`;
    }).join('');
    list.querySelectorAll('.product-select-item').forEach(item => {
        item.addEventListener('click', () => {
            setTimeout(() => {
                const cb = item.querySelector('input[type="checkbox"]');
                item.classList.toggle('selected', cb.checked);
            }, 10);
        });
    });
}

// ============ Form ============
function setupFormHandlers() {
    const form = document.getElementById('registerForm');
    if (form) form.addEventListener('submit', handleRegister);
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const confirmBox = document.getElementById('confirmEmail');
    const selectedProducts = [];
    document.querySelectorAll('#productSelectList input[type="checkbox"]:checked').forEach(cb => selectedProducts.push(cb.value));

    // Hide previous errors
    const productErr = document.getElementById('productError');
    const confirmErr = document.getElementById('confirmError');
    if (productErr) productErr.style.display = 'none';
    if (confirmErr) confirmErr.style.display = 'none';

    if (!name || !email) { showToast('กรุณากรอกชื่อและ Email', 'error'); return; }
    if (!isValidEmail(email)) { showToast('กรุณากรอก Email ให้ถูกต้อง', 'error'); return; }
    if (selectedProducts.length === 0) {
        if (productErr) productErr.style.display = 'block';
        showToast('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ', 'error'); return;
    }
    if (confirmBox && !confirmBox.checked) {
        if (confirmErr) confirmErr.style.display = 'block';
        showToast('กรุณาติ๊กยืนยันว่า Email ถูกต้อง', 'error'); return;
    }

    const regs = getRegistrations();
    const dupes = [];
    selectedProducts.forEach(pid => {
        if (regs.find(r => r.email.toLowerCase() === email.toLowerCase() && r.productId === pid)) {
            const p = getProducts().find(p => p.id === pid);
            dupes.push(p ? p.name : pid);
        }
    });
    if (dupes.length) { showToast(`คุณเคยฝากแทค "${dupes.join(', ')}" แล้ว`, 'error'); return; }

    // แปลงรหัสเป็นชื่อมาตรฐานก่อนส่งเสมอ ถ้าแปลงไม่ได้แปลว่ามีสินค้าที่ระบบไม่รู้จัก
    const selectedProductNames = [];
    for (const pid of selectedProducts) {
        const canonical = getCanonicalRegistrationProductName(pid);
        if (!canonical) {
            showToast('ระบบไม่รู้จักสินค้าที่เลือก กรุณารีเฟรชหน้าแล้วลองใหม่', 'error');
            return;
        }
        selectedProductNames.push(canonical);
    }

    const btn = document.getElementById('submitBtn');
    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loading').style.display = 'inline-flex';
    btn.disabled = true;

    /* ⭐ ยิงครั้งเดียวถึงจะเลือกหลายสินค้า
       Apps Script จะเขียนแถวแยกตามแท็บให้เหมือนเดิม แต่ส่งอีเมล "ฉบับเดียว" ที่บอกครบทุกสินค้า
       (เดิมยิงสินค้าละครั้ง = ลูกค้าได้เมล 2 ฉบับ และรอ MailApp สองรอบ)
       ส่ง productName ตัวเดียวไปด้วย เผื่อ Apps Script ที่ยังไม่ได้ deploy ตัวใหม่ */
    postToRegistrationBackend({
        action: 'register',
        name: name,
        email: email.toLowerCase(),
        productNames: selectedProductNames,
        productName: selectedProductNames[0]
    })
        .then(res => {
            if (!res || res.success !== true) {
                throw new Error((res && res.error) || 'บันทึกไม่สำเร็จ');
            }
            /* Apps Script ตัวใหม่ตอบ saved มาว่าบันทึกอะไรไปบ้าง
               ถ้าไม่มี saved แปลว่ายังเป็นตัวเก่าที่บันทึกได้ทีละสินค้า → ส่งที่เหลือตามไป */
            const saved = Array.isArray(res.saved) ? res.saved : [selectedProductNames[0]];
            const missing = selectedProductNames.filter(n => saved.indexOf(n) === -1);
            if (!missing.length) return res;
            return Promise.all(missing.map(productName => postToRegistrationBackend({
                action: 'register',
                name: name,
                email: email.toLowerCase(),
                productName: productName
            }))).then(() => res);
        })
        .then(() => {
            /* เซิร์ฟเวอร์ยืนยันมาแล้วว่าเขียนลงชีตจริง แสดงผลได้เลย ไม่ต้องวนอ่านชีตมายืนยัน */
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('formSuccess').style.display = 'block';
            createSparkles(btn, 12);
            showToast('ลงชื่อฝากแทคสำเร็จ!', 'success');
            // อัปเดตตัวนับ/รายการตามหลังเงียบๆ ผู้ใช้ไม่ต้องรอ
            fetchRegistrations();
        })
        .catch(err => {
            console.error('Registration failed:', err);
            showToast(err.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่', 'error');
        })
        .finally(() => {
            btn.querySelector('.btn-text').style.display = 'inline-flex';
            btn.querySelector('.btn-loading').style.display = 'none';
            btn.disabled = false;
        });
}

function resetForm() {
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('formSuccess').style.display = 'none';
    document.getElementById('registerForm').reset();
    renderProductSelect();
}

// ============ Lookup ============
function lookupTags() {
    const email = document.getElementById('lookupEmail').value.trim().toLowerCase();
    if (!email || !isValidEmail(email)) { showToast('กรุณากรอก Email ให้ถูกต้อง', 'error'); return; }
    displayResults(email);
}

function displayResults(email) {
    const resultsDiv = document.getElementById('lookupResults');
    const emptyDiv = document.getElementById('lookupEmpty');
    const regs = getRegistrations().filter(r => r.email === email);
    const products = getProducts();

    if (regs.length === 0) { resultsDiv.style.display = 'none'; emptyDiv.style.display = 'block'; return; }
    emptyDiv.style.display = 'none';
    resultsDiv.style.display = 'block';
    document.getElementById('resultsEmail').textContent = email;

    document.getElementById('resultsList').innerHTML = regs.map(reg => {
        const product = products.find(p => p.id === reg.productId);
        const productName = product ? product.name : 'สินค้าที่ถูกลบ';
        const date = formatThaiDate(reg.createdAt);
        const actions = `<button class="btn btn-danger btn-sm" onclick="cancelTag('${reg.id}','${email}')">ลบ</button>`;
        return `<div class="result-item"><div class="result-info"><div class="result-product">${escapeHtml(productName)}</div><div class="result-date">ลงชื่อเมื่อ ${date}</div></div>${actions}</div>`;
    }).join('');
}

function cancelTag(regId, email) {
    if (!confirm('ต้องการลบฝากแทครายการนี้?')) return;

    // ดึงชื่อสินค้ามาเตรียมส่งให้ Apps Script ก่อนลบ
    const reg = getRegistrations().find(r => r.id === regId);
    if (!reg) return;
    // ต้องเป็นชื่อมาตรฐาน ไม่งั้น Apps Script จะไปลบผิดแท็บ
    const productName = getCanonicalRegistrationProductName(reg.productId);
    if (!productName) { showToast('ระบบไม่รู้จักสินค้าของรายการนี้', 'error'); return; }

    postToRegistrationBackend({
        action: 'deleteReg',
        email: email,
        productName: productName
    })
        .then(res => {
            if (!res || res.success !== true) {
                throw new Error((res && res.error) || 'ลบไม่สำเร็จ');
            }
            showToast('ยกเลิกฝากแทคสำเร็จ (ระบบจะส่งอีเมลยืนยันให้คุณ)', 'info');
            // อ่านรายการใหม่มาอัปเดตหน้า แล้วค่อยแสดงผลลัพธ์ที่เหลือ
            return fetchRegistrations().then(() => displayResults(email));
        })
        .catch(err => {
            console.error('Delete failed:', err);
            showToast(err.message || 'ยกเลิกไม่สำเร็จ กรุณาลองใหม่', 'error');
        });
}

function showAddMore() {
    const email = document.getElementById('lookupEmail').value.trim();
    document.getElementById('regEmail').value = email;
    document.getElementById('hero').scrollIntoView({ behavior: 'smooth' });
}

// ============ Forgot Email ============
function toggleForgotEmail() {
    const c = document.getElementById('forgotContent');
    if (c) c.style.display = c.style.display === 'none' ? 'block' : 'none';
}

function lookupByName() {
    const name = document.getElementById('forgotName').value.trim().toLowerCase();
    if (!name) { showToast('กรุณากรอกชื่อ', 'error'); return; }

    const regs = getRegistrations();
    const matches = regs.filter(r => r.name.toLowerCase().includes(name));
    if (matches.length === 0) { showToast('ไม่พบชื่อนี้ในระบบ', 'error'); return; }

    // Show masked emails
    const uniqueEmails = [...new Set(matches.map(r => r.email))];
    const masked = uniqueEmails.map(maskEmail);
    const msg = 'พบ Email ที่ลงไว้:\n' + masked.join('\n') + '\n\nลองใส่ Email เต็มเพื่อค้นหา';
    alert(msg);
}

function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const show = local.substring(0, Math.min(2, local.length));
    return show + '***@' + domain;
}

// ============ Wandering Character (GPU-accelerated) ============
/* ============================================================
   มาสคอต A & B — ระบบชีวิตและการเจอกัน
   ทั้งคู่เป็น "หัวลอย" ไม่มีตัว ไม่มีเท้า → ลอย/เด้ง/กระโดด ไม่ใช่เดิน

   A = แมวหยิ่ง  นิ่ง ดุ สายแคะแบบเงียบ → ช้า ลอยเรียบ ไปทีเดียวไกล ไม่มีประกาย
   B = หมาเด็ก   ล้น สายเข้าหา          → เร็ว กระโดดเป็นห้วง อนุภาคเยอะ

   ทุกท่าเล่นด้วย transform + อนุภาค ไม่ต้องมีเฟรมอนิเมชัน 2D
   ⚠ transform แยก 4 ชั้น (ดูหมายเหตุใน style.css) — ที่นี่แตะได้แค่ชั้นนอกสุด
   ============================================================ */
const MASCOT_REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MASCOT_TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;

const MASCOT_CFG = {
    // แมวหยิ่ง — นานๆ ขยับที แต่ไปทีเดียวไกล ลอยเรียบไม่เด้ง
    a: {
        moveMs: 2600, curve: 'cubic-bezier(.42,0,.34,1)',
        pause: [8000, 16000], reach: 520, hop: false, personal: 120
    },
    // หมาเด็ก — ขยับบ่อย ไปใกล้ๆ กระโดดเป็นห้วง 3–4 ที
    b: {
        moveMs: 330, curve: 'cubic-bezier(.3,0,.55,1)',
        pause: [3000, 7000], reach: 210, hop: true, personal: 0
    }
};

function mClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function mSize() { return window.innerWidth < 768 ? 50 : 65; }
function mMaxX() { return window.innerWidth - mSize(); }
function mMaxY() { return window.innerHeight - mSize(); }
function mPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function setupMascots() {
    const a = makeMascot('wanderer1', 'a');
    const b = makeMascot('wanderer2', 'b');
    if (!a && !b) return;

    // เริ่มห่างกันพอสมควร ไม่งั้นจะเล่นซีนใส่กันตั้งแต่วินาทีแรกที่เปิดหน้า
    if (a) { a.moveTo(mClamp(window.innerWidth - 140, 0, mMaxX()), window.innerHeight * .26, true); scheduleRoam(a); }
    if (b) { b.moveTo(mClamp(window.innerWidth - 190, 0, mMaxX()), window.innerHeight * .70, true); scheduleRoam(b); }

    if (a && b && !MASCOT_REDUCE) startDuet(a, b);

    window.addEventListener('resize', () => {
        [a, b].forEach(m => { if (m) m.moveTo(mClamp(m.x, 0, mMaxX()), mClamp(m.y, 0, mMaxY()), true); });
    });
}

function makeMascot(id, kind) {
    const el = document.getElementById(id);
    if (!el) return null;

    const m = {
        el, kind,
        cfg: MASCOT_CFG[kind],
        hop: el.querySelector('.wanderer-hop'),
        inner: el.querySelector('.wanderer-inner'),
        x: 0, y: 0,
        dragging: false,
        busy: false,          // กำลังเล่นซีน — ห้ามให้ roam มาแทรก
        lastMove: Date.now(),
        timers: []
    };

    m.clearTimers = () => { m.timers.forEach(clearTimeout); m.timers = []; };
    m.later = (fn, ms) => { const t = setTimeout(fn, ms); m.timers.push(t); return t; };

    m.moveTo = (px, py, instant) => {
        m.x = px; m.y = py;
        if (instant) el.classList.remove('walking');
        el.style.transform = `translate(${px}px, ${py}px)`;
    };

    // รูปวาดหันซ้ายทั้งคู่ → หันขวาเมื่อไหร่ค่อยพลิกแกน X
    m.face = towardX => el.classList.toggle('flipped', towardX > m.x);

    m.cx = () => m.x + mSize() / 2;
    m.cy = () => m.y + mSize() / 2;

    /* ----- ลาก ----- */
    let offX = 0, offY = 0;
    el.addEventListener('pointerdown', e => {
        m.dragging = true;
        m.clearTimers();
        el.classList.add('dragging');
        el.classList.remove('walking');
        const r = el.getBoundingClientRect();
        offX = e.clientX - r.left; offY = e.clientY - r.top;
        e.preventDefault();
    });
    document.addEventListener('pointermove', e => {
        if (!m.dragging) return;
        m.moveTo(mClamp(e.clientX - offX, 0, mMaxX()), mClamp(e.clientY - offY, 0, mMaxY()), true);
    });
    document.addEventListener('pointerup', () => {
        if (!m.dragging) return;
        m.dragging = false;
        el.classList.remove('dragging');
        // B ตกแล้วเด้ง 2 ที / A ตกลงนิ่งเฉยๆ
        if (kind === 'b') { playHop(m, 260); m.later(() => playHop(m, 220), 300); }
        emoteBurst(m, kind === 'b' ? 'star' : 'sweat', kind === 'b' ? 6 : 1);
        m.later(() => scheduleRoam(m), 2200);
    });
    el.addEventListener('click', () => {
        if (m.dragging || m.busy) return;
        if (kind === 'b') { emoteBurst(m, 'star', 5); playHop(m, 280); }
        else { el.classList.add('is-annoyed'); m.later(() => el.classList.remove('is-annoyed'), 1100); }
    });

    return m;
}

/* ---------- ท่ากระโดด 1 ที (squash & stretch) ---------- */
function playHop(m, ms) {
    if (MASCOT_REDUCE) return;
    const dur = ms || m.cfg.moveMs;
    [m.hop, m.inner].forEach(n => {
        if (!n) return;
        n.classList.remove('is-hop');
        void n.offsetWidth;                       // reflow — ไม่งั้นอนิเมชันไม่รีสตาร์ต
        n.style.setProperty('--hop', dur + 'ms');
        n.classList.add('is-hop');
    });
    m.later(() => { [m.hop, m.inner].forEach(n => n && n.classList.remove('is-hop')); }, dur + 30);
}

/* ---------- ลอยเรียบไปจุดหมาย (A) ---------- */
function glide(m, tx, ty, ms, curve, done) {
    if (m.dragging) { if (done) done(); return; }
    const dur = ms || m.cfg.moveMs;
    m.face(tx);
    m.el.style.setProperty('--mv', dur + 'ms');
    m.el.style.setProperty('--mc', curve || m.cfg.curve);
    m.el.classList.add('walking');
    m.moveTo(mClamp(tx, 4, mMaxX()), mClamp(ty, 4, mMaxY()));
    m.lastMove = Date.now();
    m.later(() => { m.el.classList.remove('walking'); if (done) done(); }, dur + 50);
}

/* ---------- กระโดดเป็นห้วงไปจุดหมาย (B) ---------- */
function hopSeq(m, tx, ty, steps, done) {
    if (m.dragging) { if (done) done(); return; }
    const sx = m.x, sy = m.y, n = steps || 3;
    let i = 0;
    m.face(tx);
    (function step() {
        if (m.dragging) { m.el.classList.remove('walking'); if (done) done(); return; }
        i++;
        const t = i / n;
        m.el.style.setProperty('--mv', m.cfg.moveMs + 'ms');
        m.el.style.setProperty('--mc', m.cfg.curve);
        m.el.classList.add('walking');
        playHop(m, m.cfg.moveMs);
        m.moveTo(mClamp(sx + (tx - sx) * t, 4, mMaxX()), mClamp(sy + (ty - sy) * t, 4, mMaxY()));
        m.lastMove = Date.now();
        if (i < n) m.later(step, m.cfg.moveMs + 80);
        else m.later(() => { m.el.classList.remove('walking'); if (done) done(); }, m.cfg.moveMs + 60);
    })();
}

function moveMascot(m, tx, ty, done) {
    if (m.cfg.hop) hopSeq(m, tx, ty, 3 + Math.floor(Math.random() * 2), done);
    else glide(m, tx, ty, null, null, done);
}

/* ---------- เดินเล่นแบบสุ่ม ---------- */
function scheduleRoam(m) {
    m.clearTimers();
    if (m.dragging || m.busy) return;
    const wait = m.cfg.pause[0] + Math.random() * (m.cfg.pause[1] - m.cfg.pause[0]);
    m.later(() => {
        if (m.dragging || m.busy) return;
        if (document.hidden) { scheduleRoam(m); return; }        // แท็บไม่ได้แสดงผล = ไม่ต้องขยับ
        const ang = Math.random() * Math.PI * 2;
        const r = m.cfg.reach * (0.45 + Math.random() * 0.55);
        moveMascot(m,
            mClamp(m.x + Math.cos(ang) * r, 8, mMaxX()),
            mClamp(m.y + Math.sin(ang) * r, 8, mMaxY()),
            () => scheduleRoam(m));
    }, wait);
}

/* ---------- ระบบ "เจอกัน" ---------- */
function startDuet(a, b) {
    let coolUntil = Date.now() + 6000;    // เว้น 6 วิแรกหลังเปิดหน้า ให้คนได้ดูเว็บก่อน
    let apart = true;                 // ต้องห่างเกิน 400px ก่อน ถึงจะเล่นซีนใหม่ได้
    const slow = MASCOT_TOUCH ? 2 : 1;    // มือถือ: ลดความถี่ซีนลงครึ่ง

    setInterval(() => {
        if (document.hidden) return;
        const d = Math.hypot(a.cx() - b.cx(), a.cy() - b.cy());
        if (d > 400) apart = true;

        // โซนรู้ตัว — B หันหา A ทันที / A หยุดนิ่งทำเป็นไม่สน
        const aware = d < 340;
        a.el.classList.toggle('is-aware', aware && !a.dragging && !a.busy);
        b.el.classList.toggle('is-aware', aware && !b.dragging && !b.busy);
        if (aware) {
            if (!a.busy && !a.dragging && !a.el.classList.contains('walking')) a.face(b.x);
            if (!b.busy && !b.dragging && !b.el.classList.contains('walking')) b.face(a.x);
        }

        if (a.busy || b.busy) return;

        // B เข้าหาเองถ้า A นิ่งนานเกิน 12 วิ
        if (!aware && !b.dragging && !a.dragging &&
            Date.now() - a.lastMove > 12000 && Date.now() > coolUntil && Math.random() < .04) {
            b.clearTimers();
            hopSeq(b, a.x + (Math.random() < .5 ? -150 : 150), a.y + 40, 4, () => scheduleRoam(b));
            return;
        }

        if (Date.now() < coolUntil || !apart || d >= 130) return;
        
        apart = false;
        coolUntil = Date.now() + (25000 + Math.random() * 15000) * slow;
        if (a.dragging || b.dragging) sceneDragMeet(a, b);
        else mPick([sceneBump, scenePoke, sceneClingy])(a, b);
    }, 140);
}

function lockM(m) { m.busy = true; m.clearTimers(); m.el.classList.remove('is-aware'); }
function unlockM(m) { m.busy = false; scheduleRoam(m); }

/* ทิศหนีออกจากอีกตัว */
function fleeTarget(m, other, dist) {
    let ang = Math.atan2(m.cy() - other.cy(), m.cx() - other.cx());
    if (!isFinite(ang)) ang = Math.random() * Math.PI * 2;
    let tx = m.x + Math.cos(ang) * dist;
    let ty = m.y + Math.sin(ang) * dist;
    // ชนขอบจอแล้วเบนออกด้านข้างแทน
    if (tx < 8 || tx > mMaxX() - 8) tx = m.x - Math.cos(ang) * dist * .6;
    if (ty < 8 || ty > mMaxY() - 8) ty = m.y - Math.sin(ang) * dist * .6;
    return { x: mClamp(tx, 8, mMaxX()), y: mClamp(ty, 8, mMaxY()) };
}

/* ---- ซีน 1 : ลากมาชน → B กระโดด / A หันหน้าหนี ---- */
function sceneDragMeet(a, b) {
    lockM(a); lockM(b);

    b.el.classList.add('is-excited');
    emoteBurst(b, 'star', 6);
    b.later(() => emoteBurst(b, 'clover', 3), 180);
    [0, 340, 680].forEach(t => b.later(() => playHop(b, 300), t));
    b.later(() => { b.el.classList.remove('is-excited'); unlockM(b); }, 1150);

    emoteBurst(a, 'gloom', 1);
    a.el.classList.add('is-annoyed');
    if (a.dragging) {
        a.later(() => { a.el.classList.remove('is-annoyed'); unlockM(a); }, 1100);
    } else {
        const away = fleeTarget(a, b, 170);
        a.later(() => emoteBurst(a, 'poof', 1), 140);
        glide(a, away.x, away.y, 640, 'cubic-bezier(.3,0,.32,1)', () => {
            a.el.classList.remove('is-annoyed');
            unlockM(a);
        });
    }
}

/* ---- ซีน 2 : ลอยมาเจอกันเอง → เด้งชนเบาๆ ---- */
function sceneBump(a, b) {
    lockM(a); lockM(b);
    a.el.classList.add('is-bump');
    b.el.classList.add('is-bump');

    const mx = (a.cx() + b.cx()) / 2, my = (a.cy() + b.cy()) / 2;
    emoteAt(mx, my, 'impact', 3);
    emoteAt(mx, my - 10, 'star', 4);

    const ang = Math.atan2(a.cy() - b.cy(), a.cx() - b.cx()) || 0;
    const back = (m, sign, done) => glide(m,
        m.x + Math.cos(ang) * 26 * sign, m.y + Math.sin(ang) * 26 * sign,
        300, 'cubic-bezier(.2,.9,.4,1)', done);

    back(a, 1, () => { a.el.classList.remove('is-bump'); unlockM(a); });
    back(b, -1, () => { b.el.classList.remove('is-bump'); unlockM(b); });
    b.later(() => emoteBurst(b, 'clover', 3), 280);
}

/* ---- ซีน 3 : A แคะ B → เข้ามาเงียบๆ สะกิดแล้วหนี ---- */
function scenePoke(a, b) {
    lockM(a); lockM(b);

    const ang = Math.atan2(a.cy() - b.cy(), a.cx() - b.cx()) || 0;
    // เข้ามาช้ามาก และ "ไม่มีเอฟเฟกต์ตอนเข้า" — ความเงียบคือสิ่งที่ทำให้ดูกวน
    glide(a, b.x + Math.cos(ang) * 60, b.y + Math.sin(ang) * 60, 1500, 'cubic-bezier(.4,0,.5,1)', () => {
        a.el.classList.add('is-annoyed');
        b.el.classList.add('is-dizzy');
        emoteBurst(b, 'q', 1);
        b.later(() => emoteBurst(b, 'sweat', 1), 200);

        a.later(() => {
            a.el.classList.remove('is-annoyed');
            emoteBurst(a, 'poof', 1);
            const away = fleeTarget(a, b, 280);
            glide(a, away.x, away.y, 540, 'cubic-bezier(.3,0,.3,1)', () => unlockM(a));
        }, 280);

        b.later(() => { b.el.classList.remove('is-dizzy'); unlockM(b); }, 900);
    });
}

/* ---- ซีน 4 : B ตื๊อ A → วนรอบ A แล้ว A ลอยหนีเงียบๆ ---- */
function sceneClingy(a, b) {
    lockM(a); lockM(b);
    emoteBurst(b, 'heart', 2);
    b.later(() => emoteBurst(b, 'note', 2), 320);

    const start = Math.atan2(b.cy() - a.cy(), b.cx() - a.cx()) || 0;
    const steps = 6, sweep = Math.PI * 3;      // 1 รอบครึ่ง
    let i = 0;

    (function next() {
        if (i >= steps) {
            unlockM(b);
            emoteBurst(a, 'irritate', 1);
            // A นิ่งสนิทไม่ตอบก่อน แล้วค่อยลอยหนีเงียบๆ
            a.later(() => {
                const away = fleeTarget(a, b, 320);
                glide(a, away.x, away.y, 900, 'cubic-bezier(.35,0,.3,1)', () => unlockM(a));
            }, 1400);
            return;
        }
        const ang = start + (sweep * (++i / steps));
        hopSeq(b, a.x + Math.cos(ang) * 86, a.y + Math.sin(ang) * 86, 1, next);
    })();
}

// ============ Sparkles ============
function createSparkles(el, count) {
    const c = document.getElementById('sparkleContainer');
    if (!c) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    // พาเลตเว็บ: มิ้นต์ / ฟ้าโฮโล / ฟ้าคราม / ลาเวนเดอร์ / ชมพูโฮโล / ทอง
    const colors = ['#9DF3C9', '#71EAF3', '#95C1FB', '#C8A6F7', '#F8A9D6', '#D8B45A'];
    for (let i = 0; i < count; i++) {
        const s = document.createElement('div');
        s.className = 'sparkle';
        const a = (Math.PI * 2 / count) * i, sp = 30 + Math.random() * 40;
        s.style.left = (cx + Math.cos(a) * sp) + 'px'; s.style.top = (cy + Math.sin(a) * sp) + 'px';
        s.style.background = colors[Math.floor(Math.random() * colors.length)];
        s.style.width = (4 + Math.random() * 5) + 'px'; s.style.height = s.style.width;
        c.appendChild(s);
        setTimeout(() => s.remove(), 1200);
    }
}

// ============ เอฟเฟกต์อารมณ์ของมาสคอต ============
// ใช้ #sparkleContainer เดิม ไม่สร้าง container ใหม่
// ทุกชิ้นวาดด้วยโค้ด (mask SVG / gradient) ไม่ต้องมีไฟล์ภาพ
const FX_SIZE = { clover: 20, heart: 20, note: 20, sweat: 30, q: 16, gloom: 62, poof: 46, irritate: 22, impact: 4 };
const FX_STATIC = { gloom: 1, poof: 1, irritate: 1, impact: 1 };
const FX_COLORS = ['#71EAF3', '#C8A6F7', '#D8B45A', '#F8A9D6', '#95C1FB'];

/* ปล่อยเอฟเฟกต์เหนือหัวมาสคอต */
function emoteBurst(m, type, count) {
    if (type === 'sweat') {
        const faceSide = m.el.classList.contains('flipped') ? 1 : -1;
        emoteAt(
            m.cx() + faceSide * mSize() * 0.42,
            m.cy() - mSize() * 0.37,
            type,
            count
        );
        return;
    }

    emoteAt(m.cx(), m.cy() - mSize() * 0.45, type, count);
}

function emoteAt(cx, cy, type, count) {
    const c = document.getElementById('sparkleContainer');
    if (!c || MASCOT_REDUCE) return;
    const n = count || 1;

    for (let i = 0; i < n; i++) {
        // ดาววิ้ง — ใช้ .sparkle เดิมที่เป็นทรงสี่แฉกอยู่แล้ว แค่เปลี่ยนมาใช้พาเลตต์ใหม่
        if (type === 'star') {
            const s = document.createElement('div');
            s.className = 'sparkle';
            const ang = (Math.PI * 2 / n) * i + Math.random() * .6;
            const sp = 26 + Math.random() * 34;
            const w = 4 + Math.random() * 5;
            s.style.left = (cx + Math.cos(ang) * sp) + 'px';
            s.style.top = (cy + Math.sin(ang) * sp) + 'px';
            s.style.background = FX_COLORS[Math.floor(Math.random() * FX_COLORS.length)];
            s.style.width = w + 'px';
            s.style.height = w + 'px';
            c.appendChild(s);
            setTimeout(() => s.remove(), 1300);
            continue;
        }

        const d = document.createElement('div');
        d.className = 'fx fx-' + type;
        if (type === 'q') d.textContent = '?';

        const size = FX_SIZE[type] || 20;
        let ox = -size / 2, oy = -size / 2;

        if (type === 'impact') {
            oy = -20;
            d.style.setProperty('--fr', (i * 52 - 52) + 'deg');
        } else if (!FX_STATIC[type]) {
            ox += Math.random() * 40 - 20;
            oy += Math.random() * 14 - 7;
            d.style.setProperty('--fx-dx', (Math.random() * 44 - 22).toFixed(0) + 'px');
            d.style.setProperty('--fr', (Math.random() * 26 - 13).toFixed(0) + 'deg');
            d.style.setProperty('--fr2', (Math.random() * 80 - 40).toFixed(0) + 'deg');
            d.style.animationDelay = (i * .09).toFixed(2) + 's';
        }

        d.style.left = (cx + ox) + 'px';
        d.style.top = (cy + oy) + 'px';
        c.appendChild(d);
        setTimeout(() => d.remove(), 2400);
    }
}

// ============ Scroll Animations ============
function setupScrollAnimations() {
    const obs = new IntersectionObserver(e => { e.forEach(en => { if (en.isIntersecting) en.target.classList.add('visible'); }); }, { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll').forEach(el => obs.observe(el));
}

// ============ Toast ============
function showToast(message, type) {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type || 'info'}`;
    t.textContent = message;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('toast-out'); setTimeout(() => t.remove(), 300); }, 3500);
}

// ============ Utils ============
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

// ============ Google Apps Script Helper ============
// ส่งข้อมูลผ่าน hidden form + iframe (หลีก CORS ได้ 100%)
function postToAppsScript(data, callback) {
    const iframeName = 'gas_iframe_' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = APPS_SCRIPT_URL;
    form.target = iframeName;
    form.style.display = 'none';

    // ส่ง JSON เป็น hidden input
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify(data);
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();

    // รอ 3 วินาทีแล้วเรียก callback (ไม่สามารถอ่าน response จาก iframe cross-origin ได้)
    setTimeout(() => {
        if (callback) callback();
        // cleanup
        try { document.body.removeChild(form); } catch (e) { }
        try { document.body.removeChild(iframe); } catch (e) { }
    }, 3000);
}
