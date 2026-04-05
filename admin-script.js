/* ========================================
   MOFYCH Admin Dashboard — Script
   Product-based notifications, no queue system
   ======================================== */

// ============ Email Templates ============
const EMAIL_TEMPLATES = [
    {
        name: 'นับถอยหลัง',
        subject: '✦ MOFYCH — เปิดรับ "{product}" รอบใหม่เร็วๆ นี้!',
        body: `สวัสดีค่ะ คุณ {name}

อีก 2 วันจะเปิดรับ "{product}" รอบใหม่แล้ว!

เตรียมตัวไว้ได้เลย จะเปิดรับเร็วๆ นี้
ติดตามรายละเอียดเพิ่มเติมได้ที่เฟสบุ๊ค MOFYCH ในกลุ่มคอมมิชชั่น

— MOFYCH Team`
    },
    {
        name: 'เปิดรับวันนี้',
        subject: '✦ MOFYCH — เปิดรับ "{product}" แล้ววันนี้!',
        body: `สวัสดีค่ะ คุณ {name}

วันนี้เปิดรับ "{product}" แล้ว!

รีบมาจองกันนะคะ จำนวนจำกัด
ติดตามได้ที่เฟสบุ๊ค MOFYCH ในกลุ่มคอมมิชชั่น

— MOFYCH Team`
    }
];

// ============ Init ============
document.addEventListener('DOMContentLoaded', () => {
    initData();
    if (sessionStorage.getItem('mofych_admin_logged')) { showAdmin(); }
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    // Toggle label update
    const toggle = document.getElementById('productStatusToggle');
    if (toggle) {
        toggle.addEventListener('change', () => {
            document.getElementById('toggleLabel').textContent = toggle.checked ? 'เปิดรับ' : 'ปิดรับ';
        });
    }
    // Load default template
    selectTemplate(0);
});

function handleLogin(e) {
    e.preventDefault();
    const pw = document.getElementById('loginPassword').value;
    if (pw === getSettings().adminPassword) {
        sessionStorage.setItem('mofych_admin_logged', 'true');
        showAdmin();
    } else {
        showToast('รหัสผ่านไม่ถูกต้อง', 'error');
    }
}

function showAdmin() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('adminLayout').style.display = 'flex';
    updateStats();
    renderAdminProducts();
    renderRegistrations();
    populateNotifyProductSelect();
    updateNotifyCount();
}

// ============ Tab Switching ============
function switchTab(name) {
    document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
    document.getElementById('tab-' + name).style.display = 'block';
    document.querySelectorAll('.sidebar-link[data-tab]').forEach(l => l.classList.remove('active'));
    const active = document.querySelector(`[data-tab="${name}"]`);
    if (active) active.classList.add('active');
    if (name === 'registrations') renderRegistrations();
    if (name === 'notify') { populateNotifyProductSelect(); updateNotifyCount(); }
}

function updateStats() {
    const products = getProducts();
    const regs = getRegistrations();
    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statRegistrations').textContent = regs.length;
}

// ============ Product Management ============
function renderAdminProducts() {
    const products = getProducts();
    const list = document.getElementById('adminProductsList');
    const regs = getRegistrations();
    if (products.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:48px;color:var(--gray-400);"><p>ยังไม่มีสินค้า กดปุ่มเพิ่มสินค้าด้านบน</p></div>';
        return;
    }
    list.innerHTML = products.map(p => {
        const count = regs.filter(r => r.productId === p.id).length;
        const statusBadge = p.status === 'open'
            ? '<span class="product-card-status status-open" style="margin:0;"><span class="status-dot"></span> เปิดรับ</span>'
            : '<span class="product-card-status status-closed" style="margin:0;"><span class="status-dot"></span> ปิดรับ</span>';
        const imgInfo = p.image ? `<span style="font-size:0.78rem;color:var(--gray-400);"> | รูป: ${escapeHtml(p.image).substring(0, 30)}...</span>` : '';
        return `
            <div class="admin-list-item">
                <div class="item-info">
                    <h4>${escapeHtml(p.name)} ${statusBadge}</h4>
                    <p>โดย ${escapeHtml(p.artist)} &middot; ${count} คนฝากแทค${imgInfo}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-icon" onclick="editProduct('${p.id}')">แก้ไข</button>
                    <button class="btn-icon danger" onclick="deleteProduct('${p.id}')">ลบ</button>
                </div>
            </div>`;
    }).join('');
}

function showAddProduct() {
    document.getElementById('addProductForm').style.display = 'block';
    document.getElementById('productFormTitle').textContent = 'เพิ่มสินค้าใหม่';
    document.getElementById('editProductId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productArtist').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productStatusToggle').checked = true;
    document.getElementById('toggleLabel').textContent = 'เปิดรับ';
    document.getElementById('productName').focus();
}

function hideAddProduct() { document.getElementById('addProductForm').style.display = 'none'; }

function editProduct(id) {
    const p = getProducts().find(p => p.id === id);
    if (!p) return;
    document.getElementById('addProductForm').style.display = 'block';
    document.getElementById('productFormTitle').textContent = 'แก้ไขสินค้า';
    document.getElementById('editProductId').value = id;
    document.getElementById('productName').value = p.name;
    document.getElementById('productArtist').value = p.artist;
    document.getElementById('productImage').value = p.image || '';
    document.getElementById('productStatusToggle').checked = p.status === 'open';
    document.getElementById('toggleLabel').textContent = p.status === 'open' ? 'เปิดรับ' : 'ปิดรับ';
    document.getElementById('productName').focus();
}

function saveProduct() {
    const name = document.getElementById('productName').value.trim();
    const artist = document.getElementById('productArtist').value.trim();
    const image = document.getElementById('productImage').value.trim();
    const status = document.getElementById('productStatusToggle').checked ? 'open' : 'closed';
    const editId = document.getElementById('editProductId').value;
    if (!name || !artist) { showToast('กรุณากรอกชื่อสินค้าและชื่ออาร์ติสท์', 'error'); return; }

    const products = getProducts();
    if (editId) {
        const p = products.find(p => p.id === editId);
        if (p) { p.name = name; p.artist = artist; p.image = image; p.status = status; }
    } else {
        products.push({ id: generateId(), name, artist, image, status, createdAt: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
    hideAddProduct();
    renderAdminProducts();
    updateStats();
    showToast(editId ? 'แก้ไขสินค้าสำเร็จ' : 'เพิ่มสินค้าสำเร็จ', 'success');
}

function deleteProduct(id) {
    if (!confirm('ต้องการลบสินค้านี้?')) return;
    const products = getProducts().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
    renderAdminProducts();
    updateStats();
    showToast('ลบสินค้าสำเร็จ', 'info');
}

// ============ Registrations ============
function renderRegistrations() {
    const search = (document.getElementById('searchReg')?.value || '').toLowerCase();
    let regs = getRegistrations();
    const products = getProducts();
    if (search) regs = regs.filter(r => r.name.toLowerCase().includes(search) || r.email.toLowerCase().includes(search));
    regs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const tbody = document.getElementById('regTableBody');

    if (regs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:48px;color:var(--gray-400);">${search ? 'ไม่พบผลลัพธ์' : 'ยังไม่มีรายการฝากแทค'}</td></tr>`;
        return;
    }
    tbody.innerHTML = regs.map(r => {
        const product = products.find(p => p.id === r.productId);
        const pName = product ? product.name : '(ลบแล้ว)';
        const date = new Date(r.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        const action = `<button class="btn-icon danger" onclick="adminDeleteReg('${r.id}')">ลบ</button>`;
        return `<tr><td><strong>${escapeHtml(r.name)}</strong></td><td>${escapeHtml(r.email)}</td><td>${escapeHtml(pName)}</td><td>${date}</td><td>${action}</td></tr>`;
    }).join('');
}

function adminDeleteReg(id) {
    if (!confirm('ต้องการลบรายการฝากแทคนี้?')) return;
    const regs = getRegistrations().filter(r => r.id !== id);
    saveRegistrations(regs);
    renderRegistrations();
    updateStats();
    showToast('ลบรายการสำเร็จ', 'info');
}

// ============ Email Notifications (Per-Product) ============

function populateNotifyProductSelect() {
    const select = document.getElementById('notifyProductSelect');
    if (!select) return;
    const products = getProducts();
    select.innerHTML = products.map(p =>
        `<option value="${p.id}">${escapeHtml(p.name)}</option>`
    ).join('');
    if (products.length === 0) {
        select.innerHTML = '<option value="">ยังไม่มีสินค้า</option>';
    }
}

function selectTemplate(index) {
    const tpl = EMAIL_TEMPLATES[index];
    document.getElementById('emailSubject').value = tpl.subject;
    document.getElementById('emailBody').value = tpl.body;
    document.querySelectorAll('.template-tab').forEach((t, i) => {
        t.classList.toggle('active', i === index);
    });
}

function togglePreview() {
    const prev = document.getElementById('emailPreview');
    const select = document.getElementById('notifyProductSelect');
    const selectedProduct = select?.options[select.selectedIndex]?.text || 'สินค้าตัวอย่าง';

    if (prev.style.display === 'none') {
        const body = document.getElementById('emailBody').value;
        prev.textContent = body.replace(/{name}/g, 'ชื่อลูกค้าตัวอย่าง').replace(/{product}/g, selectedProduct);
        prev.style.display = 'block';
    } else {
        prev.style.display = 'none';
    }
}

function updateNotifyCount() {
    const select = document.getElementById('notifyProductSelect');
    if (!select || !select.value) { document.getElementById('notifyCount').textContent = '0'; return; }

    const selectedProductId = select.value;
    const regs = getRegistrations().filter(r => r.productId === selectedProductId);
    const uniqueEmails = new Set(regs.map(r => r.email));
    document.getElementById('notifyCount').textContent = uniqueEmails.size;
}

function sendNotification() {
    const select = document.getElementById('notifyProductSelect');
    if (!select || !select.value) { showToast('กรุณาเลือกสินค้าที่จะแจ้งเตือน', 'error'); return; }

    const selectedProductId = select.value;
    const selectedProductName = select.options[select.selectedIndex].text;
    const regs = getRegistrations().filter(r => r.productId === selectedProductId);
    const uniqueEmails = new Set(regs.map(r => r.email));

    if (uniqueEmails.size === 0) { showToast('ไม่มีรายชื่อที่ต้องแจ้งเตือนสำหรับสินค้านี้', 'error'); return; }
    if (!confirm(`ต้องการส่ง Email แจ้ง "${selectedProductName}" ไปยัง ${uniqueEmails.size} คน?`)) return;

    const btn = document.getElementById('sendNotifyBtn');
    btn.disabled = true;
    btn.textContent = 'กำลังส่ง...';

    // ส่งผ่าน Google Apps Script จริง — ส่ง subject + body ที่ admin แก้ไขไปด้วย
    const emailSubject = document.getElementById('emailSubject').value.replace(/{product}/g, selectedProductName);
    const emailBody = document.getElementById('emailBody').value;

    const payload = {
        action: 'broadcast',
        productName: selectedProductName,
        emailSubject: emailSubject,
        emailBody: emailBody
    };

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    })
        .then(() => {
            btn.disabled = false;
            btn.textContent = 'ส่ง Email แจ้งเตือน';
            showToast(`ส่ง Email แจ้ง "${selectedProductName}" สำเร็จ ${uniqueEmails.size} คน ✦`, 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            btn.disabled = false;
            btn.textContent = 'ส่ง Email แจ้งเตือน';
            showToast('เกิดข้อผิดพลาดในการส่ง กรุณาลองใหม่', 'error');
        });
}
