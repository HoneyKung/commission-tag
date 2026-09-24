/* ============================================================
   MOFYCH — ตัวเชื่อมหน้าที่จัดตาม Figma เข้ากับตรรกะเดิมใน script.js

   เฟส 1 = จัดวาง + ปุ่มกดได้ **ห้ามมีอนิเมชัน**
   ไฟล์นี้จึงมีแต่การสลับสถานะ (เปลี่ยน class / hidden) ไม่มี transition ไม่มี timer
   ตรรกะทั้งหมด (ลงชื่อ / ค้นหา / ลบ) เป็นของ script.js เดิม ที่นี่ไม่แตะ

   ตัวควบคุม 2 ตัว อย่าสับสน (figma-layout-spec ข้อ 11.4)
     เชือก  → สลับ hero ระหว่างซีนปกติกับซีนเมนู
     ปุ่มดาว → เปิด-ปิดเมนูลอยที่ติดจอ โผล่เมื่อเลื่อนพ้น hero แล้วเท่านั้น
   ============================================================ */
(function () {
    'use strict';

    var stage = document.getElementById('stage');
    var dock = document.getElementById('dock');
    var fitBox = document.getElementById('fit');
    if (!stage) return;

    /* ---------- จุดที่ถือว่า "พ้น hero แล้ว" ----------
       ใช้เส้นเดียวคุมสองอย่างพร้อมกัน: ยุบซีนเมนูกลับเป็นซีนปกติ (เมฆเลื่อนกลับ)
       และให้เมนูลอยโผล่ — เจ้าของงานต้องการให้เกิดพร้อมกันที่จุดเดียว

       ค่านี้ไม่ใช่ขอบล่างของพื้นหลัง hero (1040) — เจ้าของงานชี้ตำแหน่งมาจาก
       ภาพหน้าจอ (2026-08-19) วัดกลับจากป้ายเมนูช่อง 3/4 ที่รู้พิกัดแน่นอน
       ได้ขอบบนจออยู่ที่เฟรม y ≈ 487 → รอถึง 1040 มันช้าไปกว่าครึ่ง

       อยากให้เร็ว/ช้ากว่านี้ แก้เลขนี้ตัวเดียวพอ (หน่วยเป็นพิกัดเฟรม Figma) */
    var HERO_EXIT = 487;

    /* ---------- ย่อทั้งหน้าให้พอดีจอ ----------
       เฟรม Figma กว้าง 1920 แต่พื้นที่จริงของเบราว์เซอร์มักไม่ถึง
       (สเกลระบบ 125% / หน้าต่างไม่เต็มจอ / มีแถบเลื่อน)
       → ย่อทั้งผืนทีเดียว พิกัดข้างในยังเป็นของ Figma 1:1 ทุกตัว

       ใช้ clientWidth เพราะไม่รวมแถบเลื่อนแนวตั้ง จะได้ไม่ล้นออกด้านข้าง */
    var FRAME_W = 1920;

    function applyFit() {
        var f = document.documentElement.clientWidth / FRAME_W;
        document.documentElement.style.setProperty('--fit', f);
        /* ความสูงหน้าเท่ากันทั้งสองซีนแล้ว (เลิกดันเซกชันล่าง) */
        if (fitBox) fitBox.style.height = (2879 * f) + 'px';
    }
    window.addEventListener('resize', function () {
        applyFit();
        onScroll();
    });
    applyFit();

    /* ---------- เชือก: สลับซีน ---------- */
    function setScene(name) {
        stage.dataset.scene = name;
        var rope = document.getElementById('ropeHit');
        if (rope) rope.setAttribute('aria-pressed', name === 'menu' ? 'true' : 'false');
        applyFit();          // (ความสูงเท่ากันแล้ว แต่ยังเรียกไว้เผื่อจอเปลี่ยน)
    }

    var ropeHit = document.getElementById('ropeHit');
    if (ropeHit) {
        ropeHit.addEventListener('click', function () {
            setScene(stage.dataset.scene === 'menu' ? 'main' : 'menu');
            /* ความสูง hero เปลี่ยนแล้ว ต้องคำนวณสถานะ dock ใหม่ทันที
               ไม่รอให้ผู้ใช้ขยับ scroll อีกครั้ง */
            onScroll();
        });
    }

    /* ---------- ปุ่มดาว: เมนูลอยติดจอ ---------- */
    var star = document.getElementById('menuStar');
    if (star && dock) {
        star.addEventListener('click', function () {
            var open = dock.classList.toggle('is-open');
            star.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    }

    /* เลื่อนพ้น hero → เมนูลอยโผล่ · และซีนเมนูกลับเป็นซีนปกติเอง
       (figma-layout-spec ข้อ 1 — เพื่อไม่ให้พื้นหลังสีชนกันตอนเลื่อนลง) */
    function onScroll() {
        /* ความสูง hero เป็นพิกัดของเฟรม Figma แต่ scrollY เป็นพิกัดจริงบนจอ
           ซึ่งย่อไปแล้วตาม --fit → ต้องคูณก่อนเทียบ ไม่งั้นไม่มีวันถึงเกณฑ์ */
        var f = parseFloat(getComputedStyle(document.documentElement)
            .getPropertyValue('--fit')) || 1;
        var heroH = HERO_EXIT * f;

        /* ทั้ง dock และการยุบซีนเมนูใช้เส้นเดียวกัน = เกิดพร้อมกันเสมอ
           ห้ามบวก innerHeight เพราะ hero ที่ย่อแล้วมักเตี้ยกว่า viewport
           ซึ่งจะทำให้ปุ่มดาวโผล่ตั้งแต่ยังอยู่บนสุดของหน้า */
        var past = window.scrollY >= heroH;

        if (dock) {
            dock.hidden = !past;
            if (!past && dock.classList.contains('is-open')) {
                dock.classList.remove('is-open');
                if (star) star.setAttribute('aria-expanded', 'false');
            }
        }
        if (past && stage.dataset.scene === 'menu') setScene('main');
        markHere();
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---------- ปุ่มเมนูของหน้าที่กำลังอยู่ ----------
       เมนูลอย: ป้ายของหน้าปัจจุบันยื่นออกมาขวา + เปลี่ยนเป็นสีสว่าง
       (ดีไซน์วาดตัวอย่างไว้ที่ช่อง แก้ไขฝากแทค)
       ในหน้านี้มีสองเซกชันที่นับเป็น "หน้า" คือ product กับ edit tag
       ส่วนตรวจสอบคิว/ตรวจสอบสี เป็นไฟล์อื่น ไม่มีทางเป็นหน้าปัจจุบันตรงนี้ */
    var SECTION_TOP = { product: 1040, edit: 2009 };

    function markHere() {
        if (!dock) return;
        var f = parseFloat(getComputedStyle(document.documentElement)
            .getPropertyValue('--fit')) || 1;
        /* ดูจาก "กลางจอ" ว่าตอนนี้กำลังอ่านเซกชันไหนอยู่
           ถ้าดูจากขอบบนจะเปลี่ยนช้าไป — ตอนที่บล็อกค้นหาเต็มจอแล้ว
           ขอบบนยังค้างอยู่ในโซนสินค้า ป้ายก็ยังยื่นผิดช่อง */
        var y = window.scrollY + window.innerHeight / 2;
        var n = 0;                                  // 0 = ยังอยู่ใน hero ไม่มีป้ายไหนยื่น
        if (y >= SECTION_TOP.edit * f) n = 2;
        else if (y >= SECTION_TOP.product * f) n = 1;

        [1, 2, 3, 4].forEach(function (i) {
            var on = i === n;
            var btn = dock.querySelector('.mbtn[data-btn="' + i + '"]');
            var hit = document.getElementById('dockM' + i);
            var tx = dock.querySelectorAll('.tx')[i - 1];
            if (btn) btn.classList.toggle('is-here', on);
            if (hit) {
                hit.classList.toggle('is-here', on);
                if (on) hit.setAttribute('aria-current', 'true');
                else hit.removeAttribute('aria-current');
            }
            if (tx) tx.classList.toggle('is-here-tx', on);
        });
    }

    /* ---------- เมาส์วางบนป้ายเมนู ----------
       ตัวที่กดได้เป็นพี่น้องกับงานอาร์ต ไม่ใช่พ่อลูก จึงใช้ :hover ของ CSS ตรงๆ ไม่ได้
       ต้องให้ JS ใส่คลาสให้งานอาร์ตของป้ายอันนั้นแทน */
    function linkHover(scope, hitIds) {
        if (!scope) return;
        hitIds.forEach(function (id, i) {
            var hit = document.getElementById(id);
            var btn = scope.querySelector('.mbtn[data-btn="' + (i + 1) + '"]');
            if (!hit || !btn) return;
            var on = function () { btn.classList.add('is-on'); };
            var off = function () { btn.classList.remove('is-on'); };
            hit.addEventListener('mouseenter', on);
            hit.addEventListener('mouseleave', off);
            hit.addEventListener('focus', on);
            hit.addEventListener('blur', off);
        });
    }
    linkHover(document.getElementById('pcHeroMenu'),
        ['heroM1', 'heroM2', 'heroM3', 'heroM4']);
    linkHover(document.getElementById('dockMenu'),
        ['dockM1', 'dockM2', 'dockM3', 'dockM4']);

    /* ---------- เลื่อนไปยังเซกชัน ----------
       แคนวาสถูกย่อด้วย transform: scale() ซึ่ง "ไม่กระทบ layout"
       เบราว์เซอร์เลยกระโดดไปที่พิกัดก่อนย่อ = เลยของจริงไปมากจนเห็นพื้นขาวท้ายหน้า
       getBoundingClientRect() คิดผลของ transform ให้แล้ว จึงใช้ค่านั้นแทน */
    function goTo(hash) {
        /* anchor ใต้ hero มีตำแหน่งต่างกัน 232px ระหว่างสองซีน
           ยุบเป็นซีนหลักก่อนอ่านตำแหน่ง ไม่เช่นนั้น onScroll จะยุบทีหลัง
           แล้วเป้าหมายขยับหนีขึ้นไปพ้นจอระหว่างการเลื่อน */
        if (stage.dataset.scene === 'menu') setScene('main');
        var el = document.querySelector(hash);
        if (!el) return false;
        var y = el.getBoundingClientRect().top + window.scrollY;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, Math.max(0, Math.min(y, max)));
        return true;
    }

    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) return;
        var hash = a.getAttribute('href');
        if (hash.length < 2) return;
        if (goTo(hash)) {
            e.preventDefault();
            if (dock) dock.classList.remove('is-open');
            if (star) star.setAttribute('aria-expanded', 'false');
        }
    });

    /* ---------- ติ๊กยืนยันอีเมล ----------
       วงกลมกับเครื่องหมายถูกอยู่ในงานอาร์ตแล้ว ที่นี่แค่สลับให้เห็น/ไม่เห็น */
    var chk = document.getElementById('confirmEmail');
    if (chk) {
        chk.addEventListener('change', function () {
            stage.classList.toggle('is-confirmed', chk.checked);
        });
    }

    /* ---------- ตั๋วสินค้าในฟอร์ม ----------
       ดีไซน์ให้ตั๋วมา 2 สถานะ (ปกติ / เลือกแล้ว) ช่องละ 2 ใบ โชว์ทีละใบ
       รายการจริงมาจาก renderProductSelect() ของโค้ดเดิม — ที่นี่แค่
       (1) เขียนชื่อสินค้าจริงลงบนตั๋ว  (2) สลับใบตามช่องติ๊ก */
    function ticketSets() {
        var menu = stage.dataset.scene === 'menu';
        return [
            { normal: document.getElementById(menu ? 'tkNormal1m' : 'tkNormal1'), selected: document.getElementById(menu ? 'tkSelected1m' : 'tkSelected1') },
            { normal: document.getElementById(menu ? 'tkNormal2m' : 'tkNormal2'), selected: document.getElementById(menu ? 'tkSelected2m' : 'tkSelected2') }
        ];
    }

    /* เขียนข้อความลงใน <text> ของ SVG โดยไม่ยุ่งกับตำแหน่ง (แก้แค่เนื้อใน tspan) */
    function setSvgText(root, idPrefix, value) {
        if (!root) return;
        var node = root.querySelector('text[id^="' + idPrefix + '"]');
        if (!node) return;
        var span = node.querySelector('tspan') || node;
        span.textContent = value;
    }

    /* ชื่อบนตั๋วใช้ชื่อสั้นตามดีไซน์ — ดีไซน์เขียนว่า "Cotton Doll" ไม่ใช่ชื่อเต็ม
       ชื่อเต็มในข้อมูลคือ "Cotton Doll ตุ๊กตาไอดอล" ซึ่งยาวจนล้นไปทับลูกศรในตั๋ว
       ตัดเฉพาะ "ที่แสดง" เท่านั้น ชื่อที่ส่งเข้า Google Sheets ยังเป็นชื่อเต็มเหมือนเดิม */
    function shortName(name) {
        var cut = name.split(/[฀-๿]/)[0].trim();
        return cut || name;
    }

    function paintTickets() {
        var products = (typeof getProducts === 'function') ? getProducts() : [];
        ['tkNormal1', 'tkSelected1', 'tkNormal2', 'tkSelected2',
            'tkNormal1m', 'tkSelected1m', 'tkNormal2m', 'tkSelected2m'].forEach(function (id) {
                var el = document.getElementById(id);
                if (!el) return;
                var p = products[/2/.test(id.replace(/m$/, '').slice(-1)) ? 1 : 0];
                if (!p) return;
                setSvgText(el, 'Cotton Doll', shortName(p.name));
                setSvgText(el, 'โดย', 'โดย ' + p.artist);
            });
    }

    function syncTickets() {
        var boxes = document.querySelectorAll('#productSelectList input[type="checkbox"]');
        ticketSets().forEach(function (set, i) {
            var on = boxes[i] ? boxes[i].checked : false;
            if (set.normal) set.normal.hidden = on;
            if (set.selected) set.selected.hidden = !on;
        });
    }

    /* ---------- ตัวนับฝากแทค ----------
       ดีไซน์เขียน "ฝากแทคแล้ว xx คน" — xx คือช่องที่ต้องเติมตัวเลขจริง
       ตัวซ้าย (Group 74) ชิดขวา · ตัวขวา (Group 75) ชิดซ้าย */
    function paintCounters() {
        if (typeof getProducts !== 'function') return;
        var products = getProducts();
        var countFor = (typeof getRegistrationCount === 'function') ? getRegistrationCount : function () { return 0; };
        [['countLeft', 0, true], ['countRight', 1, false]].forEach(function (row) {
            var span = document.getElementById(row[0]);
            var p = products[row[1]];
            if (!span || !p) return;
            var n = countFor(p.id);

            span.textContent = 'ฝากแทคแล้ว ' + n + ' คน';
        });
    }

    window.paintCounters = paintCounters;

    /* ---------- เริ่มทำงาน ----------
       script.js ผูก DOMContentLoaded ไว้ก่อนไฟล์นี้ → renderProductSelect() เสร็จแล้ว */
    document.addEventListener('DOMContentLoaded', function () {
        paintCounters();
        onScroll();
    });

    /* ---------- กรอบแถวรายการผลค้นหา ----------
       displayResults() ของโค้ดเดิมสร้างแถวด้วย innerHTML — ไม่มีที่ให้ใส่กรอบ
       จึงโคลนกรอบจาก <template> ที่ครอปมาจาก Figma ใส่ให้ทุกแถวหลังมันสร้างเสร็จ */
    function paintRows() {
        var tpl = document.getElementById('rowFrameTpl');
        if (!tpl) return;
        document.querySelectorAll('#resultsList .result-item').forEach(function (row) {
            if (row.querySelector('.ly--crop')) return;
            row.insertBefore(tpl.content.cloneNode(true), row.firstChild);
        });
    }

    /* ห่อฟังก์ชันของโค้ดเดิม แทนที่จะแก้ script.js (กติกา: ตรรกะใช้ของเดิมทั้งหมด) */
    function wrap(name, after) {
        var orig = window[name];
        if (typeof orig !== 'function') return;
        window[name] = function () {
            var r = orig.apply(this, arguments);
            after();
            return r;
        };
    }

    /* ข้อมูลจาก Google Sheets มาถึงทีหลัง (fetchRegistrations) → เขียนตัวนับใหม่ */
    wrap('renderProducts', paintCounters);
    wrap('displayResults', paintRows);
    /* showAddMore ของเดิมใช้ scrollIntoView ซึ่งไม่รู้จัก transform เหมือนกัน
       ปล่อยให้มันทำงานตามเดิมแล้วค่อยเลื่อนซ้ำให้ถูกที่ */
    wrap('showAddMore', function () { goTo('#hero'); });
    wrap('renderProductSelect', function () {
        paintTickets();
        syncTickets();
        document.querySelectorAll('#productSelectList input[type="checkbox"]').forEach(function (cb) {
            cb.addEventListener('change', syncTickets);
        });
    });
})();
