/* ========================================
   MOFYCH Commission Tag — Main Script
   Dark Mode + Wanderer + Products w/ Images
   ======================================== */

// ============ Google Apps Script Backend ============
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz61XBdNkAS8IeMzR4CnlojyWbHxVjOHbgjMg6-NgrLPLDORRwIp7V2GQhYFIBsC0dJ/exec';

// ============ Data Layer ============
const STORAGE_KEYS = { products: 'mofych_products', registrations: 'mofych_registrations', settings: 'mofych_settings' };

function initData() {
    if (!localStorage.getItem(STORAGE_KEYS.products)) {
        localStorage.setItem(STORAGE_KEYS.products, JSON.stringify([
            { id: generateId(), name: 'Custom Doll 20cm Long Body', artist: 'Nytan.Cha', status: 'open', image: '', createdAt: new Date().toISOString() }
        ]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.registrations)) {
        localStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.settings)) {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({
            adminPassword: 'mofych2026',
            queueStages: ['รอคิว', 'กำลังออกแบบ', 'กำลังผลิต', 'ตรวจสอบคุณภาพ', 'เสร็จแล้ว', 'ส่งแล้ว']
        }));
    }
}

function getProducts() { return JSON.parse(localStorage.getItem(STORAGE_KEYS.products) || '[]'); }
function getRegistrations() { return JSON.parse(localStorage.getItem(STORAGE_KEYS.registrations) || '[]'); }
function getSettings() { return JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}'); }
function saveRegistrations(r) { localStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify(r)); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 7); }

// ============ Init ============
document.addEventListener('DOMContentLoaded', () => {
    initData();
    initTheme();
    renderProducts();
    renderProductSelect();
    setupNavbar();
    setupWanderer();
    setupScrollAnimations();
    setupFormHandlers();
});

// ============ Dark/Light Mode ============
function initTheme() {
    const saved = localStorage.getItem('mofych_theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
    }
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('mofych_theme', next);
        });
    }
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
        const checked = i === 0 ? 'checked' : '';
        const sel = i === 0 ? 'selected' : '';
        const thumb = product.image ? `<img src="${escapeHtml(product.image)}" alt="" class="product-select-thumb">` : '';
        return `
            <label class="product-select-item ${sel}" data-product-id="${product.id}">
                <input type="checkbox" name="products" value="${product.id}" ${checked}>
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

    const btn = document.getElementById('submitBtn');
    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loading').style.display = 'inline-flex';
    btn.disabled = true;

    // ส่งข้อมูลไป Google Sheets ผ่าน Apps Script
    // fetch จะ error ตอนอ่าน response (CORS redirect) แต่ข้อมูลถึง server แล้ว
    const products = getProducts();
    const promises = selectedProducts.map(pid => {
        const product = products.find(p => p.id === pid);
        const payload = {
            action: 'register',
            name: name,
            email: email.toLowerCase(),
            productName: product ? product.name : pid
        };
        return fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        }).catch(() => 'sent'); // CORS error = ข้อมูลถึง server แล้ว ถือว่าสำเร็จ
    });

    Promise.all(promises)
        .then(() => {
            const regs = getRegistrations();
            selectedProducts.forEach(pid => {
                regs.push({ id: generateId(), name, email: email.toLowerCase(), productId: pid, createdAt: new Date().toISOString() });
            });
            saveRegistrations(regs);

            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('formSuccess').style.display = 'block';
            createSparkles(btn, 12);
            renderProducts();
            showToast('ลงชื่อฝากแทคสำเร็จ! ✦', 'success');
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
        const date = new Date(reg.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        const actions = `<button class="btn btn-danger btn-sm" onclick="cancelTag('${reg.id}','${email}')">ลบ</button>`;
        return `<div class="result-item"><div class="result-info"><div class="result-product">${escapeHtml(productName)}</div><div class="result-date">ลงชื่อเมื่อ ${date}</div></div>${actions}</div>`;
    }).join('');
}

function cancelTag(regId, email) {
    if (!confirm('ต้องการลบฝากแทครายการนี้?')) return;
    const regs = getRegistrations().filter(r => r.id !== regId);
    saveRegistrations(regs);
    showToast('ลบฝากแทคสำเร็จ', 'info');
    displayResults(email);
    renderProducts();
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
function setupWanderer() {
    const w = document.getElementById('wanderer');
    if (!w) return;

    let x = window.innerWidth - 120, y = window.innerHeight / 2;
    let isDragging = false, dragOffX = 0, dragOffY = 0, walkTimer = null, walking = true;

    function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
    function getSize() { return window.innerWidth < 768 ? 50 : 65; }
    function setPos(px, py) { w.style.transform = `translate(${px}px, ${py}px)`; }

    // Initial position
    setPos(x, y);

    function startWalk() { if (isDragging) return; walking = true; scheduleWalk(); }

    function scheduleWalk() {
        if (!walking || isDragging) return;
        walkTimer = setTimeout(() => {
            if (isDragging) return;
            const size = getSize(), maxX = window.innerWidth - size, maxY = window.innerHeight - size;
            let tx, ty;
            const b = Math.random();
            if (b < 0.25) {
                const e = Math.floor(Math.random() * 4);
                tx = e < 2 ? Math.random() * maxX : (e === 2 ? 10 : maxX - 10);
                ty = e >= 2 ? Math.random() * maxY : (e === 0 ? 10 : maxY - 10);
            } else {
                tx = 100 + Math.random() * (maxX - 200);
                ty = 100 + Math.random() * (maxY - 200);
            }
            tx = clamp(tx, 10, maxX); ty = clamp(ty, 10, maxY);
            w.classList.toggle('flipped', tx < x);
            w.classList.add('walking');
            setPos(tx, ty);
            x = tx; y = ty;
            setTimeout(() => { w.classList.remove('walking'); scheduleWalk(); }, 3200);
        }, 2500 + Math.random() * 4500);
    }

    function onDown(e) {
        isDragging = true; walking = false;
        clearTimeout(walkTimer);
        w.classList.add('dragging'); w.classList.remove('walking');
        const r = w.getBoundingClientRect();
        dragOffX = e.clientX - r.left; dragOffY = e.clientY - r.top;
        e.preventDefault();
    }
    function onMove(e) {
        if (!isDragging) return;
        const s = getSize();
        const nx = clamp(e.clientX - dragOffX, 0, window.innerWidth - s);
        const ny = clamp(e.clientY - dragOffY, 0, window.innerHeight - s);
        setPos(nx, ny);
        x = nx; y = ny;
    }
    function onUp() {
        if (!isDragging) return;
        isDragging = false;
        w.classList.remove('dragging');
        createSparkles(w, 6);
        setTimeout(startWalk, 3000);
    }

    w.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    w.addEventListener('click', () => { if (!isDragging) createSparkles(w, 8); });
    setTimeout(startWalk, 2000);
    window.addEventListener('resize', () => {
        const s = getSize();
        x = clamp(x, 0, window.innerWidth - s);
        y = clamp(y, 0, window.innerHeight - s);
        setPos(x, y);
    });
}

// ============ Sparkles ============
function createSparkles(el, count) {
    const c = document.getElementById('sparkleContainer');
    if (!c) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const colors = ['#a7f3d0', '#67e8f9', '#a5b4fc', '#c4b5fd', '#f0abfc', '#fda4af'];
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
