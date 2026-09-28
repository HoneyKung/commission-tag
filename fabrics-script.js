/* ========================================
   MOFYCH  หน้าเลือกสีผ้าสำหรับลูกค้า
   อ่าน FABRIC_SKIN กับ FABRIC_HAIR จาก fabric-data.js ชุดเดียวกับหน้าแอดมิน colors.html
   หน้านี้ไม่มีรหัสแอดมิน เพราะข้อมูลสีผ้าเสิร์ฟสาธารณะอยู่แล้ว
   ======================================== */
(function () {
    'use strict';

    // ราคาเพิ่มตามหน้าประเมินราคา  pricing-data.js สีผมมากกว่า 1 สี  estimate-script.js เพิ่มสีผิวสีละ 50
    var EXTRA_HAIR_PRICE = 100;
    var EXTRA_SKIN_PRICE = 50;

    var groups = {
        skin: { label: 'สีผิว', list: typeof FABRIC_SKIN !== 'undefined' ? FABRIC_SKIN : [], picked: [] },
        hair: { label: 'สีผม', list: typeof FABRIC_HAIR !== 'undefined' ? FABRIC_HAIR : [], picked: [] }
    };

    function byCode(group, code) {
        return groups[group].list.filter(function (f) { return f.code === code; })[0] || null;
    }

    // ชื่อที่ลูกค้าเห็นและที่คัดลอก  รหัสนำหน้าชื่อ แบบที่ลูกค้าในคอมพิมพ์ในบรีฟ
    function labelOf(f) {
        return f.code + ' ' + f.name;
    }

    // มีของก่อน หมดไว้ท้าย  ในกลุ่มเดียวกันคงลำดับจากไฟล์ข้อมูล
    function ordered(list) {
        var avail = list.filter(function (f) { return f.available; });
        var out = list.filter(function (f) { return !f.available; });
        return avail.concat(out);
    }

    function swatchStyle(f) {
        if (f.photo) return 'background-image:url(' + JSON.stringify(String(f.photo)) + ')';
        return 'background-color:' + (/^#[0-9a-f]{3,8}$/i.test(f.hex || '') ? f.hex : '#ffffff');
    }

    function renderGrid(group) {
        var grid = document.getElementById(group === 'skin' ? 'gridSkin' : 'gridHair');
        grid.textContent = '';
        ordered(groups[group].list).forEach(function (f) {
            var picked = groups[group].picked.indexOf(f.code) >= 0;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'fab-chip' + (picked ? ' is-picked' : '') + (f.available ? '' : ' is-out');
            btn.disabled = !f.available;
            btn.setAttribute('aria-pressed', picked ? 'true' : 'false');
            btn.setAttribute('aria-label', groups[group].label + ' ' + labelOf(f) + (f.available ? '' : ' หมด'));

            var sw = document.createElement('span');
            sw.className = 'fab-chip__swatch';
            sw.setAttribute('style', swatchStyle(f));
            if (!f.available) {
                var out = document.createElement('span');
                out.className = 'fab-chip__out';
                out.textContent = 'หมด';
                sw.appendChild(out);
            }
            btn.appendChild(sw);

            var code = document.createElement('span');
            code.className = 'fab-chip__code';
            code.textContent = f.code;
            btn.appendChild(code);

            var name = document.createElement('span');
            name.className = 'fab-chip__name';
            name.textContent = f.name;
            btn.appendChild(name);

            btn.addEventListener('click', function () { toggle(group, f.code); });
            grid.appendChild(btn);
        });
    }

    function toggle(group, code) {
        var picked = groups[group].picked;
        var at = picked.indexOf(code);
        if (at >= 0) picked.splice(at, 1);
        else picked.push(code);
        renderGrid(group);
        renderTray();
    }

    function pickedLabels(group) {
        return groups[group].picked.map(function (code) { return byCode(group, code); })
            .filter(Boolean).map(labelOf);
    }

    function briefText() {
        var skin = pickedLabels('skin');
        var hair = pickedLabels('hair');
        var lines = [];
        if (skin.length) lines.push('สีผิว : ' + skin.join(', '));
        if (hair.length) lines.push('สีผม : ' + hair.join(', '));
        return lines.join('\n');
    }

    function hintText() {
        var hints = [];
        var skinExtra = Math.max(0, groups.skin.picked.length - 1);
        if (skinExtra) hints.push('เพิ่มสีผิว ' + skinExtra + ' สี +' + (skinExtra * EXTRA_SKIN_PRICE) + ' บาท');
        if (groups.hair.picked.length > 1) hints.push('สีผมมากกว่า 1 สี +' + EXTRA_HAIR_PRICE + ' บาท');
        return hints.join(' · ');
    }

    function renderTray() {
        var skin = pickedLabels('skin');
        var hair = pickedLabels('hair');
        document.getElementById('traySkin').textContent = skin.length ? skin.join(', ') : 'ยังไม่ได้เลือก';
        document.getElementById('trayHair').textContent = hair.length ? hair.join(', ') : 'ยังไม่ได้เลือก';
        var hint = hintText();
        var hintEl = document.getElementById('trayHint');
        hintEl.textContent = hint;
        hintEl.hidden = !hint;
        var any = skin.length + hair.length > 0;
        document.getElementById('trayCopy').disabled = !any;
        document.getElementById('trayClear').disabled = !any;
    }

    var toastTimer = null;
    function toast(text) {
        var el = document.getElementById('trayToast');
        el.textContent = text;
        el.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.hidden = true; }, 2200);
    }

    // วิธีเก่า เลือกข้อความใน textarea ที่ซ่อนไว้แล้วสั่งคัดลอก  ใช้ได้ในเบราว์เซอร์ในแอปหลายตัวที่ไม่ให้ใช้คลิปบอร์ดแบบใหม่
    function copyWithTextarea(text) {
        var area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        document.body.appendChild(area);
        area.select();
        area.setSelectionRange(0, text.length);
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(area);
        return ok;
    }

    // คลิปบอร์ดแบบใหม่ใช้ได้เฉพาะหน้า https กับ localhost และบางเบราว์เซอร์ในแอปปฏิเสธหรือค้าง
    // ปฏิเสธหรือไม่ตอบใน 1.5 วินาที ลองวิธีเก่าต่อ
    function copyText(text) {
        return new Promise(function (resolve, reject) {
            var done = false;
            function fallback() {
                if (done) return;
                done = true;
                if (copyWithTextarea(text)) resolve(); else reject(new Error('copy_failed'));
            }
            if (!(navigator.clipboard && window.isSecureContext)) { fallback(); return; }
            var timer = setTimeout(fallback, 1500);
            navigator.clipboard.writeText(text).then(function () {
                if (done) return;
                done = true;
                clearTimeout(timer);
                resolve();
            }, function () {
                clearTimeout(timer);
                fallback();
            });
        });
    }

    function selectGroup(group) {
        ['skin', 'hair'].forEach(function (g) {
            var tab = document.getElementById(g === 'skin' ? 'tabSkin' : 'tabHair');
            var panel = document.getElementById(g === 'skin' ? 'panelSkin' : 'panelHair');
            var on = g === group;
            tab.setAttribute('aria-selected', on ? 'true' : 'false');
            tab.classList.toggle('is-on', on);
            panel.hidden = !on;
        });
    }

    function init() {
        if (typeof FABRIC_DATA_IS_SAMPLE !== 'undefined' && FABRIC_DATA_IS_SAMPLE) {
            document.getElementById('fabSample').hidden = false;
        }
        document.getElementById('tabSkin').addEventListener('click', function () { selectGroup('skin'); });
        document.getElementById('tabHair').addEventListener('click', function () { selectGroup('hair'); });
        document.getElementById('trayClear').addEventListener('click', function () {
            groups.skin.picked = [];
            groups.hair.picked = [];
            document.getElementById('trayManual').hidden = true;
            renderGrid('skin');
            renderGrid('hair');
            renderTray();
        });
        document.getElementById('trayCopy').addEventListener('click', function () {
            var text = briefText();
            if (!text) return;
            var manual = document.getElementById('trayManual');
            copyText(text).then(function () {
                manual.hidden = true;
                toast('คัดลอกแล้ว วางในแชตได้เลย');
            }, function () {
                manual.value = text;
                manual.hidden = false;
                manual.focus();
                manual.select();
                toast('คัดลอกอัตโนมัติไม่ได้ กดค้างที่ข้อความด้านล่างเพื่อคัดลอก หรือแคปหน้าจอส่งมาแทน');
            });
        });
        selectGroup('skin');
        renderGrid('skin');
        renderGrid('hair');
        renderTray();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
