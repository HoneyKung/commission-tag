/* ========================================
   MOFYCH Color Reference — Script
   Part 1: Swatches, tabs, search, admin lock
   Part 2: Color finder (Delta E)
   ======================================== */

let currentLine = 'all'; // 'model' | 'game' | 'fanatic' | 'all'
let selectedColor = null;

// ============ Admin Lock ============
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('mofych_admin_logged')) {
        showColors();
    }
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Color wheel sync
    document.getElementById('colorWheel').addEventListener('input', e => {
        document.getElementById('hexInput').value = e.target.value.toUpperCase();
        document.getElementById('previewFill').style.background = e.target.value;
    });
    // Hex input sync
    document.getElementById('hexInput').addEventListener('input', e => {
        let v = e.target.value.trim();
        if (v.length === 7 && /^#[0-9A-Fa-f]{6}$/.test(v)) {
            document.getElementById('colorWheel').value = v;
            document.getElementById('previewFill').style.background = v;
        }
    });
    // Enter key on hex input
    document.getElementById('hexInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); findClosestColors(); }
    });
});

async function handleLogin(e) {
    e.preventDefault();
    const pw = document.getElementById('loginPassword').value;
    const hash = await sha256(pw);
    const settings = getSettings();
    if (hash === settings.adminPasswordHash || pw === settings.adminPassword || pw === 'mofych2026') {
        sessionStorage.setItem('mofych_admin_logged', 'true');
        showColors();
    } else {
        alert('รหัสผ่านไม่ถูกต้อง');
    }
}

async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function showColors() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('colorsLayout').style.display = 'grid';
    renderSwatches();
}

// ============ Category / Line Selection ============
function selectCategory(cat) {
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));

    if (cat === 'fabric') {
        document.getElementById('catFabric').classList.add('active');
        document.body.classList.add('fabric-mode');
        renderFabricCards();
    } else {
        document.getElementById('catPaint').classList.add('active');
        document.body.classList.remove('fabric-mode');
    }
}

function selectLine(line) {
    currentLine = line;
    document.querySelectorAll('.line-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.line-tab[data-line="${line}"]`).classList.add('active');
    renderSwatches();
}

// ============ Render Swatches ============
function hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function sortByColor(colors) {
    return [...colors].sort((a, b) => {
        const ca = hexToHsl(a.h), cb = hexToHsl(b.h);
        // Only true neutrals (sat < 5%) = black/grey/white
        const aNeutral = ca.s < 5, bNeutral = cb.s < 5;
        if (aNeutral && !bNeutral) return -1;
        if (!aNeutral && bNeutral) return 1;
        if (aNeutral && bNeutral) return ca.l - cb.l;
        // Chromatic: 15° hue buckets for tight grouping, dark to light
        const aHue = Math.floor(ca.h / 15);
        const bHue = Math.floor(cb.h / 15);
        if (aHue !== bHue) return aHue - bHue;
        return ca.l - cb.l;
    });
}

function renderSwatches() {
    const grid = document.getElementById('swatchGrid');
    const search = (document.getElementById('colorSearch')?.value || '').toLowerCase().trim();
    let colors = getFilteredColors();

    if (search) {
        colors = colors.filter(c =>
            c.c.toLowerCase().includes(search) ||
            c.n.toLowerCase().includes(search) ||
            c.h.toLowerCase().includes(search)
        );
    }

    // Sort by color similarity (except Fanatic which has its own triad order)
    if (currentLine !== 'fanatic') {
        colors = sortByColor(colors);
    }

    document.getElementById('colorCount').textContent = `แสดง ${colors.length} สี`;

    if (colors.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);">ไม่พบสีที่ค้นหา</div>';
        return;
    }

    grid.innerHTML = colors.map(c => {
        const isSelected = selectedColor && selectedColor.c === c.c;
        const textColor = isLightColor(c.h) ? '#333' : '#fff';
        const isOwned = ownedColors.has(c.c);
        return `
        <div class="swatch-card ${isSelected ? 'selected' : ''}" id="swatch-${c.c.replace('.', '')}" onclick="selectSwatch('${c.c}')">
            <div class="swatch-color">
                <div class="swatch-color-fill" style="background:${c.h};"></div>
                ${isOwned ? '<div class="owned-dot"></div>' : ''}
            </div>
            <div class="swatch-info">
                <div class="swatch-code">${c.set || c.c}</div>
                <div class="swatch-name" title="${c.n}">${c.n}</div>
                <div class="swatch-hex">${c.h}</div>
            </div>
        </div>`;
    }).join('');
}

function getFilteredColors() {
    if (currentLine === 'model') return VALLEJO_MODEL_COLOR;
    if (currentLine === 'game') return VALLEJO_GAME_COLOR;
    if (currentLine === 'fanatic') return AP_FANATIC_ACRYLIC;
    if (currentLine === 'citadel') return CITADEL_COLOUR;
    if (currentLine === 'ak3rdgen') return AK_3RDGEN;
    if (currentLine === 'thaitone') return THAITONE;
    return ALL_PAINTS;
}

// ============ Select Swatch ============
function selectSwatch(code) {
    const color = ALL_PAINTS.find(c => c.c === code) ||
        VALLEJO_ALL.find(c => c.c === code) ||
        AP_FANATIC_ALL.find(c => c.c === code);
    if (!color) return;

    selectedColor = color;

    // Update hex input & preview
    document.getElementById('hexInput').value = color.h;
    document.getElementById('colorWheel').value = color.h;
    document.getElementById('previewFill').style.background = color.h;

    // Show detail
    showColorDetail(color);

    // Copy hex
    copyToClipboard(color.h);

    // Re-render to show selected state
    renderSwatches();
}

function showColorDetail(color) {
    const section = document.getElementById('detailSection');
    const detail = document.getElementById('selectedDetail');
    section.style.display = 'block';

    const rgb = hexToRgb(color.h);
    const brand = color.c.startsWith('WP') ? 'Army Painter' : color.c.startsWith('AK') ? 'AK Interactive' : (THAITONE.some(p => p.c === color.c && p.set === color.set) ? 'ไทยโทน' : (color.set ? 'Citadel' : 'Vallejo'));
    const line = color.line || color.set || (color.c.startsWith('72.') ? 'Game Color' : color.c.startsWith('WP') ? 'Fanatic' : 'Model Color');

    detail.innerHTML = `
        <div class="selected-detail-color" style="background:${color.h};"></div>
        <h4>${color.n}</h4>
        <div class="detail-row"><span class="label">${color.set ? 'ประเภท' : 'รหัสขวด'}</span><span>${color.set || color.c}</span></div>
        <div class="detail-row"><span class="label">แบรนด์</span><span>${brand}</span></div>
        <div class="detail-row"><span class="label">สาย</span><span>${line}</span></div>
        <div class="detail-row"><span class="label">Hex</span><span style="font-family:var(--font-en);font-weight:600;">${color.h}</span></div>
        <div class="detail-row"><span class="label">RGB</span><span style="font-family:var(--font-en);">${rgb.r}, ${rgb.g}, ${rgb.b}</span></div>
    `;
}

// ============ Color Finder (CIEDE2000) ============
function findClosestColors() {
    const hex = document.getElementById('hexInput').value.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        alert('กรุณาใส่ Hex code ที่ถูกต้อง (เช่น #FF5733)');
        return;
    }

    document.getElementById('previewFill').style.background = hex;
    document.getElementById('colorWheel').value = hex;

    const targetLab = hexToLab(hex);
    const results = ALL_PAINTS.map(c => ({
        ...c,
        deltaE: deltaE(targetLab, hexToLab(c.h))
    })).sort((a, b) => a.deltaE - b.deltaE).slice(0, 8);

    // Show results
    const section = document.getElementById('resultsSection');
    const container = document.getElementById('matchResults');
    section.style.display = 'block';
    document.getElementById('toolsPlaceholder').style.display = 'none';

    container.innerHTML = results.map((r, i) => {
        let badgeClass = 'far';
        let label = `ΔE00 ${r.deltaE.toFixed(1)}`;
        if (r.deltaE < 0.1) { badgeClass = 'exact'; label = '✓ ตรงกัน'; }
        else if (r.deltaE < 2) { badgeClass = 'exact'; label = `ใกล้มาก · ΔE00 ${r.deltaE.toFixed(1)}`; }
        else if (r.deltaE < 5) { badgeClass = 'close'; }

        return `
        <div class="match-card ${i === 0 ? 'best' : ''}" onclick="selectSwatch('${r.c}')">
            <div class="match-swatch" style="background:${r.h};position:relative;">${ownedColors.has(r.c) ? '<div class="owned-dot" style="top:2px;right:2px;width:10px;height:10px;"></div>' : ''}</div>
            <div class="match-info">
                <div class="match-code">${r.c} — ${r.line || ''}</div>
                <div class="match-name">${r.n}</div>
            </div>
            <div class="match-delta ${badgeClass}">${label}</div>
        </div>`;
    }).join('');

    // Highlight best match in grid
    highlightSwatch(results[0]?.c);

    // Part 3: Always show mixing recipes
    findMixingRecipes(hex);
}

function highlightSwatch(code) {
    document.querySelectorAll('.swatch-card.highlighted').forEach(el => el.classList.remove('highlighted'));
    if (!code) return;
    const el = document.getElementById('swatch-' + code.replace('.', ''));
    if (el) {
        el.classList.add('highlighted');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ============ Color Math ============
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function rgbToLab(r, g, b) {
    // sRGB → XYZ → Lab (D65)
    let rr = r / 255, gg = g / 255, bb = b / 255;
    rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
    gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
    bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
    let x = (rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375) / 0.95047;
    let y = (rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750);
    let z = (rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041) / 1.08883;
    x = x > 0.008856 ? Math.cbrt(x) : (7.787 * x) + 16 / 116;
    y = y > 0.008856 ? Math.cbrt(y) : (7.787 * y) + 16 / 116;
    z = z > 0.008856 ? Math.cbrt(z) : (7.787 * z) + 16 / 116;
    return { L: (116 * y) - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

function hexToLab(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToLab(r, g, b);
}

function deltaE(lab1, lab2) {
    // CIEDE2000 (kL = kC = kH = 1)
    const degToRad = deg => deg * Math.PI / 180;
    const radToDeg = rad => rad * 180 / Math.PI;
    const pow7 = value => Math.pow(value, 7);

    const L1 = lab1.L, a1 = lab1.a, b1 = lab1.b;
    const L2 = lab2.L, a2 = lab2.a, b2 = lab2.b;
    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const meanC = (C1 + C2) / 2;
    const G = 0.5 * (1 - Math.sqrt(pow7(meanC) / (pow7(meanC) + pow7(25))));

    const a1Prime = (1 + G) * a1;
    const a2Prime = (1 + G) * a2;
    const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
    const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);

    function huePrime(b, aPrime) {
        if (aPrime === 0 && b === 0) return 0;
        const hue = radToDeg(Math.atan2(b, aPrime));
        return hue >= 0 ? hue : hue + 360;
    }

    const h1Prime = huePrime(b1, a1Prime);
    const h2Prime = huePrime(b2, a2Prime);
    const deltaLPrime = L2 - L1;
    const deltaCPrime = C2Prime - C1Prime;

    let deltaHuePrime = 0;
    if (C1Prime * C2Prime !== 0) {
        const hueDiff = h2Prime - h1Prime;
        if (Math.abs(hueDiff) <= 180) deltaHuePrime = hueDiff;
        else if (hueDiff > 180) deltaHuePrime = hueDiff - 360;
        else deltaHuePrime = hueDiff + 360;
    }
    const deltaHPrime = 2 * Math.sqrt(C1Prime * C2Prime)
        * Math.sin(degToRad(deltaHuePrime / 2));

    const meanLPrime = (L1 + L2) / 2;
    const meanCPrime = (C1Prime + C2Prime) / 2;
    let meanHuePrime;
    if (C1Prime * C2Prime === 0) {
        meanHuePrime = h1Prime + h2Prime;
    } else if (Math.abs(h1Prime - h2Prime) <= 180) {
        meanHuePrime = (h1Prime + h2Prime) / 2;
    } else if (h1Prime + h2Prime < 360) {
        meanHuePrime = (h1Prime + h2Prime + 360) / 2;
    } else {
        meanHuePrime = (h1Prime + h2Prime - 360) / 2;
    }

    const T = 1
        - 0.17 * Math.cos(degToRad(meanHuePrime - 30))
        + 0.24 * Math.cos(degToRad(2 * meanHuePrime))
        + 0.32 * Math.cos(degToRad(3 * meanHuePrime + 6))
        - 0.20 * Math.cos(degToRad(4 * meanHuePrime - 63));
    const deltaTheta = 30 * Math.exp(-Math.pow((meanHuePrime - 275) / 25, 2));
    const RC = 2 * Math.sqrt(pow7(meanCPrime) / (pow7(meanCPrime) + pow7(25)));
    const SL = 1 + (0.015 * Math.pow(meanLPrime - 50, 2))
        / Math.sqrt(20 + Math.pow(meanLPrime - 50, 2));
    const SC = 1 + 0.045 * meanCPrime;
    const SH = 1 + 0.015 * meanCPrime * T;
    const RT = -Math.sin(degToRad(2 * deltaTheta)) * RC;

    const lTerm = deltaLPrime / SL;
    const cTerm = deltaCPrime / SC;
    const hTerm = deltaHPrime / SH;
    return Math.sqrt(
        lTerm * lTerm + cTerm * cTerm + hTerm * hTerm + RT * cTerm * hTerm
    );
}

// ============ Utilities ============
function isLightColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showCopyToast(text);
    }).catch(() => { });
}

function showCopyToast(text) {
    const existing = document.querySelector('.copy-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = `คัดลอก ${text} แล้ว`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
}

// ============ Part 3: Color Mixing ============

// Primary colors from Vallejo (closest to pure primaries)
const PRIMARY_CODES = [
    '70.951', '72.001', // White
    '70.950', '72.051', // Black
    '70.957', '70.926', '70.947', '72.010', '72.106', // Red
    '70.949', '70.952', '70.915', '72.005', '72.103', // Yellow
    '70.930', '70.963', '70.809', '72.022', '72.021'  // Blue
];

function getPrimaryPaints() {
    return VALLEJO_ALL.filter(c => PRIMARY_CODES.includes(c.c));
}

function getNonPrimaryPaints() {
    return VALLEJO_ALL.filter(c => !PRIMARY_CODES.includes(c.c));
}

// Mix two opaque paints with a single-constant Kubelka-Munk approximation.
// ค่า Hex ไม่มีข้อมูล pigment จริง ผลลัพธ์จึงยังเป็นแนวทางและควรทดสอบสีจริง
function mixColors(hex1, hex2, ratio) {
    // ratio = 0..1 where 0 = all hex1, 1 = all hex2
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);

    const toLinear = v => {
        const channel = v / 255;
        return channel <= 0.04045
            ? channel / 12.92
            : Math.pow((channel + 0.055) / 1.055, 2.4);
    };
    const toSrgb = reflectance => {
        const channel = reflectance <= 0.0031308
            ? 12.92 * reflectance
            : 1.055 * Math.pow(reflectance, 1 / 2.4) - 0.055;
        return Math.round(Math.min(1, Math.max(0, channel)) * 255);
    };
    const toKS = reflectance => {
        /* ค่า 0 ใน Hex ไม่ได้แปลว่า pigment สะท้อนแสงเป็นศูนย์จริง
           กำหนด floor 1% เพื่อไม่ให้สีอิ่มสองสีผสมกันกลายเป็นดำสนิท */
        const safe = Math.max(0.01, reflectance);
        return Math.pow(1 - safe, 2) / (2 * safe);
    };
    const fromKS = ks => 1 + ks - Math.sqrt(ks * ks + 2 * ks);
    const mixChannel = (v1, v2) => {
        const ks = toKS(toLinear(v1)) * (1 - ratio) + toKS(toLinear(v2)) * ratio;
        return toSrgb(fromKS(ks));
    };

    return {
        r: mixChannel(c1.r, c2.r),
        g: mixChannel(c1.g, c2.g),
        b: mixChannel(c1.b, c2.b)
    };
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Find best ratio for mixing two paints to match target
function findBestRatio(targetLab, hex1, hex2) {
    let bestDelta = Infinity;
    let bestRatio = 0.5;
    // สูตรใช้งานจริงตวงง่ายกว่าเมื่อแบ่งทีละ 10%
    for (let r = 0.1; r <= 0.9; r += 0.1) {
        const mixed = mixColors(hex1, hex2, r);
        const mixedLab = rgbToLab(mixed.r, mixed.g, mixed.b);
        const d = deltaE(targetLab, mixedLab);
        if (d < bestDelta) {
            bestDelta = d;
            bestRatio = r;
        }
    }
    return { ratio: bestRatio, deltaE: bestDelta };
}

// Find best mixing recipes from a pool of paints
function findMixRecipes(targetHex, paintPool, maxResults) {
    const targetLab = hexToLab(targetHex);
    const recipes = [];
    let candidates = paintPool;

    /* CIEDE2000 แพงกว่า CIE76 มาก จำกัดชุดค้นหาไว้ที่สีเดี่ยวที่ใกล้ที่สุด
       และเติมแม่สีกลับเข้ามา เพื่อยังหาแนวทางผสมขาว/ดำ/แม่สีได้ */
    if (paintPool.length > 100) {
        const nearest = [...paintPool]
            .sort((a, b) => deltaE(targetLab, hexToLab(a.h)) - deltaE(targetLab, hexToLab(b.h)))
            .slice(0, 40);
        const primaries = paintPool.filter(p => PRIMARY_CODES.includes(p.c));
        candidates = [...new Map([...nearest, ...primaries].map(p => [p.c, p])).values()];
    }
    const len = candidates.length;

    // Try all pairs
    for (let i = 0; i < len; i++) {
        for (let j = i + 1; j < len; j++) {
            const result = findBestRatio(targetLab, candidates[i].h, candidates[j].h);
            if (result.deltaE < 25) { // ตัดสูตรที่ห่างจนไม่มีประโยชน์
                const mixed = mixColors(candidates[i].h, candidates[j].h, result.ratio);
                recipes.push({
                    paints: [candidates[i], candidates[j]],
                    ratios: [Math.round((1 - result.ratio) * 100), Math.round(result.ratio * 100)],
                    deltaE: result.deltaE,
                    mixedHex: rgbToHex(mixed.r, mixed.g, mixed.b)
                });
            }
        }
    }

    return recipes.sort((a, b) => a.deltaE - b.deltaE).slice(0, maxResults);
}

function isMixablePaint(paint) {
    const n = paint.n.toLowerCase();
    const line = (paint.line || paint.set || '').toLowerCase();
    
    // Exclude by name keywords
    if (n.includes('fluorescent') || n.includes('metallic') || n.includes('metal') || n.includes('neon') || n.includes('clear')) return false;
    
    // Exclude by line/set keywords
    if (line.includes('metallic') || line.includes('metal') || line.includes('fx') || 
        line.includes('wash') || line.includes('ink') || line.includes('primer') || 
        line.includes('auxiliary') || line.includes('effects')) {
        return false;
    }
    
    return true;
}

// Main mixing function — called from findClosestColors
function findMixingRecipes(targetHex) {
    const section = document.getElementById('mixSection');
    const primaryContainer = document.getElementById('mixPrimaryResults');
    const extendedContainer = document.getElementById('mixExtendedResults');

    section.style.display = 'block';
    primaryContainer.innerHTML = '<div style="color:var(--text-muted);font-size:0.82rem;padding:8px;">⏳ คำนวณสูตรแม่สี...</div>';
    extendedContainer.innerHTML = '';

    // Use setTimeout to not block UI
    setTimeout(() => {
        // Primary recipes (using only primary-adjacent colors)
        const primaryPaints = getPrimaryPaints();
        const primaryRecipes = findMixRecipes(targetHex, primaryPaints, 3);
        primaryContainer.innerHTML = renderRecipes(primaryRecipes, targetHex);

        // Extended recipes (using all colors, excluding pairs already shown)
        const allPaints = ALL_PAINTS.filter(isMixablePaint);
        const extRecipes = findMixRecipes(targetHex, allPaints, 3);
        extendedContainer.innerHTML = renderRecipes(extRecipes, targetHex);
    }, 50);
}

function renderRecipes(recipes, targetHex) {
    if (recipes.length === 0) {
        return '<div style="color:var(--text-muted);font-size:0.82rem;padding:8px;">ไม่พบสูตรที่เหมาะสม</div>';
    }

    return recipes.map((r, i) => {
        const line1 = r.paints[0].line || r.paints[0].set || (r.paints[0].c.startsWith('72.') ? 'Game' : r.paints[0].c.startsWith('WP') ? 'Fanatic' : 'Model');
        const line2 = r.paints[1].line || r.paints[1].set || (r.paints[1].c.startsWith('72.') ? 'Game' : r.paints[1].c.startsWith('WP') ? 'Fanatic' : 'Model');

        let deltaClass = 'far';
        if (r.deltaE < 2) deltaClass = 'exact';
        else if (r.deltaE < 5) deltaClass = 'close';

        return `
        <div class="mix-card">
            <div class="mix-compare">
                <div class="mix-swatch-pair">
                    <div class="mix-swatch" style="background:${targetHex};" title="สีเป้าหมาย"></div>
                    <div class="mix-arrow">→</div>
                    <div class="mix-swatch" style="background:${r.mixedHex};" title="สีผสม"></div>
                </div>
                <div class="match-delta ${deltaClass}">ΔE00 ${r.deltaE.toFixed(1)}</div>
            </div>
            <div class="mix-recipe">
                <div class="mix-paint">
                    <div class="mix-paint-swatch" style="background:${r.paints[0].h};"></div>
                    <div class="mix-paint-info">
                        <span class="mix-paint-code">${r.paints[0].c}</span>
                        <span class="mix-paint-name">${r.paints[0].n}</span>
                    </div>
                    <span class="mix-ratio">${r.ratios[0]}%</span>
                </div>
                <div class="mix-plus">+</div>
                <div class="mix-paint">
                    <div class="mix-paint-swatch" style="background:${r.paints[1].h};"></div>
                    <div class="mix-paint-info">
                        <span class="mix-paint-code">${r.paints[1].c}</span>
                        <span class="mix-paint-name">${r.paints[1].n}</span>
                    </div>
                    <span class="mix-ratio">${r.ratios[1]}%</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ============ Part 4: Inventory System (Owned Colors) ============

const OWNED_KEY = 'mofych_owned_colors';
let ownedColors = new Set(JSON.parse(localStorage.getItem(OWNED_KEY) || '[]'));
let invFilter = 'all';

function saveOwned() {
    localStorage.setItem(OWNED_KEY, JSON.stringify([...ownedColors]));
    updateOwnedCounter();
}

function updateOwnedCounter() {
    const counter = document.getElementById('ownedCounter');
    const count = ownedColors.size;
    if (count > 0) {
        counter.textContent = `มี ${count} สี`;
        counter.classList.add('visible');
    } else {
        counter.classList.remove('visible');
    }
}

// Toggle inventory modal
function toggleInventoryModal() {
    const overlay = document.getElementById('inventoryModalOverlay');
    const isOpen = overlay.classList.contains('open');
    if (isOpen) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    } else {
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderInventoryTable();
        document.getElementById('inventorySearch').focus();
    }
}

function closeInventoryIfOverlay(e) {
    if (e.target === document.getElementById('inventoryModalOverlay')) {
        toggleInventoryModal();
    }
}

// Keyboard: ESC to close
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const overlay = document.getElementById('inventoryModalOverlay');
        if (overlay && overlay.classList.contains('open')) {
            toggleInventoryModal();
        }
    }
});

// Filter in modal
function setInvFilter(line) {
    invFilter = line;
    document.querySelectorAll('.inv-filter').forEach(b => b.classList.remove('active'));
    document.querySelector(`.inv-filter[data-inv-line="${line}"]`).classList.add('active');
    renderInventoryTable();
}

function getInvFilteredColors() {
    if (invFilter === 'model') return VALLEJO_MODEL_COLOR.map(p => ({ ...p, line: 'Model Color' }));
    if (invFilter === 'game') return VALLEJO_GAME_COLOR.map(p => ({ ...p, line: 'Game Color' }));
    if (invFilter === 'fanatic') return AP_FANATIC_ACRYLIC.map(p => ({ ...p, line: 'Fanatic' }));
    if (invFilter === 'citadel') return CITADEL_COLOUR.map(p => ({ ...p, line: p.set || 'Citadel' }));
    if (invFilter === 'ak3rdgen') return AK_3RDGEN.map(p => ({ ...p, line: p.set || 'AK 3rd Gen' }));
    if (invFilter === 'thaitone') return THAITONE.map(p => ({ ...p, line: p.set || 'ไทยโทน' }));
    return ALL_PAINTS;
}

// Render the inventory table
function renderInventoryTable() {
    const wrap = document.getElementById('inventoryTableWrap');
    const search = (document.getElementById('inventorySearch')?.value || '').toLowerCase().trim();
    let colors = getInvFilteredColors();

    if (search) {
        colors = colors.filter(c =>
            c.c.toLowerCase().includes(search) ||
            c.n.toLowerCase().includes(search) ||
            c.h.toLowerCase().includes(search)
        );
    }

    const ownedCount = colors.filter(c => ownedColors.has(c.c)).length;
    document.getElementById('inventoryCount').textContent = `${ownedCount} / ${colors.length}`;

    if (colors.length === 0) {
        wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">ไม่พบสี</div>';
        return;
    }

    let html = `<table class="inv-table">
        <thead>
            <tr>
                <th>มี</th>
                <th class="th-swatch">สี</th>
                <th>รหัส</th>
                <th>ชื่อ</th>
                <th>Hex</th>
                <th>สาย</th>
            </tr>
        </thead>
        <tbody>`;

    colors.forEach(c => {
        const owned = ownedColors.has(c.c);
        const line = c.line || c.set || (c.c.startsWith('72.') ? 'Game Color' : c.c.startsWith('WP') ? 'Fanatic' : 'Model Color');
        html += `
            <tr class="${owned ? 'owned-row' : ''}" onclick="toggleOwned('${c.c}')">
                <td><div class="inv-checkbox ${owned ? 'checked' : ''}"></div></td>
                <td><div class="inv-swatch" style="background:${c.h};"></div></td>
                <td><span class="inv-code">${c.set || c.c}</span></td>
                <td><span class="inv-name" title="${c.n}">${c.n}</span></td>
                <td><span class="inv-hex">${c.h}</span></td>
                <td><span class="inv-line-badge">${line}</span></td>
            </tr>`;
    });

    html += '</tbody></table>';
    wrap.innerHTML = html;
}

// Toggle a single color
function toggleOwned(code) {
    if (ownedColors.has(code)) {
        ownedColors.delete(code);
    } else {
        ownedColors.add(code);
    }
    saveOwned();
    renderInventoryTable();
    renderSwatches();
}

// Select all visible
function selectAllVisible() {
    const colors = getInvFilteredColors();
    const search = (document.getElementById('inventorySearch')?.value || '').toLowerCase().trim();
    let filtered = colors;
    if (search) {
        filtered = colors.filter(c =>
            c.c.toLowerCase().includes(search) ||
            c.n.toLowerCase().includes(search) ||
            c.h.toLowerCase().includes(search)
        );
    }
    filtered.forEach(c => ownedColors.add(c.c));
    saveOwned();
    renderInventoryTable();
    renderSwatches();
}

// Deselect all visible
function deselectAllVisible() {
    const colors = getInvFilteredColors();
    const search = (document.getElementById('inventorySearch')?.value || '').toLowerCase().trim();
    let filtered = colors;
    if (search) {
        filtered = colors.filter(c =>
            c.c.toLowerCase().includes(search) ||
            c.n.toLowerCase().includes(search) ||
            c.h.toLowerCase().includes(search)
        );
    }
    filtered.forEach(c => ownedColors.delete(c.c));
    saveOwned();
    renderInventoryTable();
    renderSwatches();
}

// Init counter on load
document.addEventListener('DOMContentLoaded', () => {
    updateOwnedCounter();
});

// ============ FABRIC CARDS ============
let currentFabricTab = 'all'; // 'all' | 'skin' | 'hair'

function selectFabricTab(tab) {
    currentFabricTab = tab;
    document.querySelectorAll('.fabric-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.fabric-tab[data-fabric="${tab}"]`).classList.add('active');
    renderFabricCards();
}

function renderFabricCards() {
    const area = document.getElementById('fabricGridArea');
    if (!area) return;

    const search = (document.getElementById('fabricSearch')?.value || '').toLowerCase().trim();

    const filterList = (list) => {
        if (!search) return list;
        return list.filter(f =>
            f.code.toLowerCase().includes(search) ||
            f.name.toLowerCase().includes(search) ||
            f.hex.toLowerCase().includes(search)
        );
    };

    let html = '';

    if (currentFabricTab === 'all' || currentFabricTab === 'skin') {
        const skinList = filterList(typeof FABRIC_SKIN !== 'undefined' ? FABRIC_SKIN : []);
        html += renderFabricSection('🧑 สีผิว', skinList);
    }

    if (currentFabricTab === 'all' || currentFabricTab === 'hair') {
        const hairList = filterList(typeof FABRIC_HAIR !== 'undefined' ? FABRIC_HAIR : []);
        html += renderFabricSection('💇 สีผม', hairList);
    }

    if (!html.trim()) {
        html = '<div style="text-align:center;padding:48px;color:var(--text-muted);">ไม่พบผ้าที่ค้นหา</div>';
    }

    area.innerHTML = html;
}

function renderFabricSection(title, items) {
    if (!items || items.length === 0) return '';

    const availCount = items.filter(f => f.available).length;

    let html = `
        <div class="fabric-category-header">
            <h3>${title}</h3>
            <span class="fabric-count">มี ${availCount} / ${items.length} สี</span>
        </div>
        <div class="fabric-grid">`;

    items.forEach(f => {
        const isAvail = f.available;
        const badgeClass = isAvail ? 'available' : 'unavailable';
        const badgeIcon = isAvail ? '✓' : '✕';
        const cardClass = isAvail ? '' : ' unavailable';

        html += `
            <div class="fabric-card${cardClass}">
                <div class="fabric-swatch">
                    <div class="fabric-swatch-fill" style="background:${f.hex};"></div>
                    <div class="fabric-badge ${badgeClass}">${badgeIcon}</div>
                </div>
                <div class="fabric-info">
                    <div class="fabric-code">${f.name}</div>
                </div>
            </div>`;
    });

    html += '</div>';
    return html;
}
