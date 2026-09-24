/* ============================================================
   MOFYCH — ตัวช่วยของหน้าแรก
   ย้ายมาจาก hero-space.js (ฉากอวกาศเดิมเลิกใช้แล้ว)
   เหลือแค่ 2 อย่างที่ใช้ทั้งหน้า ไม่ใช่แค่ hero

   ⚠ ตั้งใจไม่มีอนิเมชันของ hero ในไฟล์นี้
     เจ้าของงานสั่งว่าเฟสนี้เอาแค่ "วางให้ตรง + กดใช้งานได้"
     โค้ดอนิเมชันเดิมยังอยู่ใน hero-space.js ในเรโป (ไม่ได้โหลดแล้ว)
   ============================================================ */
(function () {
    'use strict';

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.addEventListener('DOMContentLoaded', function () {
        setupSceneRope();
        setupProductArt();
        setupSmoothScroll();
        setupReveal();
    });

    /* ---------- เอารูปสินค้าจริงยัดเข้า "กรอบขรุขระ" ที่วาดไว้ใน SVG ----------
       ทำไมไม่ใช้ <img> ทับ: กรอบใส่รูปในดีไซน์เป็นทรงขอบขาดลายมือ
       ถ้าวาง <img> สี่เหลี่ยมมนทับ ลายขรุขระจะหายหมด
       ทำไมไม่ใช้รูปที่ Figma ฝังมา: มันคือรูปเดียวกับที่เว็บมีอยู่แล้ว
       ในเซคชันสินค้าข้างล่าง ถ้าเอามาด้วยจะแบกซ้ำอีก ~5 MB โดยเปล่าประโยชน์

       รูปมาจาก product.image ในข้อมูลจริง (ไฟล์ในเครื่อง ไม่ได้โหลดจากเน็ต)
       วงกลมติ๊กใช้วงลายมือใน SVG เป็น "ช่อง" ส่วนเครื่องหมายถูกเป็น HTML
       วางกลางวง — ไม่ถมสีทั้งวง และไม่วาดวงใหม่ทับ */
    function setupProductArt() {
        var list = document.getElementById('productSelectList');
        if (!list) return;

        // renderProductSelect() ใน script.js เติมรายการทีหลัง → รอจนมีของ
        var tries = 0;
        (function wait() {
            if (list.querySelector('.product-select-item')) return sync();
            if (++tries > 40) return;
            setTimeout(wait, 50);
        })();

        list.addEventListener('click', function () { setTimeout(sync, 20); });

        function sync() {
            var items = list.querySelectorAll('.product-select-item');
            for (var i = 0; i < items.length; i++) {
                var slot = i + 1;
                var img = items[i].querySelector('.product-select-thumb');
                var src = img && img.getAttribute('src');
                if (src) {
                    each('[data-product-slot="' + slot + '"]', function (node) {
                        node.setAttribute('href', src);
                        node.setAttribute('preserveAspectRatio', 'xMidYMid slice');
                    });
                }
            }
        }

        function each(sel, fn) {
            var nodes = document.querySelectorAll('.hero-paper ' + sel);
            for (var i = 0; i < nodes.length; i++) fn(nodes[i]);
        }
    }

    /* ---------- ดึงเชือกเพื่อสลับฉาก หลัก <-> เมนู ----------
       เฟสนี้ตัดภาพทันที ยังไม่ทำอนิเมชันตามที่เจ้าของงานสั่ง
       ฟอร์มเป็นชุดเดียวทั้งสองฉาก เปลี่ยนแค่ตำแหน่งกับองศาผ่าน CSS
       (ตัวแปร --form-x / --form-y / --form-rot ใน hero.css) */
    function setupSceneRope() {
        var hero = document.getElementById('hero');
        var rope = document.getElementById('sceneRope');
        if (!hero || !rope) return;

        rope.addEventListener('click', function () {
            var next = hero.dataset.scene === 'menu' ? 'main' : 'menu';
            hero.dataset.scene = next;
            rope.setAttribute('aria-label', next === 'menu'
                ? 'ดึงเชือกเพื่อกลับหน้าแรก'
                : 'ดึงเชือกเพื่อเปิดเมนู');
        });
    }

    /* ---------- คลิกลิงก์ #anchor แล้วเลื่อนนุ่มๆ ----------
       เลิกดักล้อเมาส์แล้ว! ของเดิมเป็น smooth scroll เขียนเอง (แบบ Lenis):
       ดัก wheel + preventDefault แล้วค่อยๆ ขยับด้วย lerp ใน rAF
       ปัญหา: window.scrollY เบราว์เซอร์ปัดเป็นจำนวนเต็ม แต่ lerp เดินทีละเศษพิกเซล
       พอส่วนต่างเกิน 2px ตัว listener จะรีเซ็ตค่าทิ้ง แล้วเริ่มใหม่ → เลื่อนเป็นช่วงๆ กระตุก
       ปล่อยให้เป็นสกรอลล์ของเบราว์เซอร์ตรงๆ ลื่นกว่าและตรงกับที่นิ้วสั่งจริง */
    function setupSmoothScroll() {
        document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('a[href^="#"]');
            if (!a) return;
            var id = a.getAttribute('href');
            if (!id || id === '#') return;
            var dest = document.querySelector(id);
            if (!dest) return;
            e.preventDefault();
            var y = dest.getBoundingClientRect().top + window.scrollY - 16;
            window.scrollTo({
                top: Math.max(y, 0),
                behavior: reduce ? 'auto' : 'smooth'
            });
        });
    }

    /* ---------- Scroll reveal ของเซคชันล่างๆ ---------- */
    function setupReveal() {
        var sels = [
            '.lookup-section .section-header',
            '.lookup-section .form-card',
            '.products-section .section-header',
            '.products-section .products-grid',
            '.footer-content'
        ];
        var targets = [];
        sels.forEach(function (s) {
            var el = document.querySelector(s);
            if (el) targets.push(el);
        });
        if (!targets.length) return;

        targets.forEach(function (el, i) {
            el.classList.add('reveal');
            el.style.setProperty('--r-delay', (i % 2) * 0.12 + 's');
        });

        if (reduce || !('IntersectionObserver' in window)) {
            targets.forEach(function (el) { el.classList.add('revealed'); });
            return;
        }
        var obs = new IntersectionObserver(function (ents) {
            ents.forEach(function (en) {
                if (en.isIntersecting) { en.target.classList.add('revealed'); obs.unobserve(en.target); }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        targets.forEach(function (el) { obs.observe(el); });
    }

})();
