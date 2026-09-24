/* ============================================================
   MOFYCH — HERO สเก็ตช์ลายเส้น : ตัวขับเคลื่อน
   ไม่พึ่ง library ภายนอก
   ============================================================ */
(function () {
    'use strict';

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

    /* ============================================================
       TODO[ART] — ช่องรอ "ภาพวาดจริง"
       4 ชิ้นนี้ผมวาดด้วยโค้ดแล้วไม่ได้ลายมือแบบในภาพร่าง ควรใช้ไฟล์วาดจริง
       ใส่ path ไฟล์ตรงนี้ (PNG โปร่ง) แล้วมันจะสลับจากรูปที่โค้ดวาดไปใช้ไฟล์ทันที
       ใส่ null = ใช้ของที่โค้ดวาดไปก่อน
       ============================================================ */
    var ART = {
        check: null,     // วงกลมติ๊กถูก มุมซ้ายบนของกระดาษ  (จัตุรัส ~300x300)
        cursor: null,    // ลูกศรเคอร์เซอร์ มุมขวาล่าง        (~220x310 ตั้ง)
        rope: null,      // เชือกถัก ต่อกันได้แนวตั้ง          (~40px กว้าง สูงเท่าไหร่ก็ได้)
        wordmark: null   // คำว่า MOFYCH ลายมือ               (~900x230 แนวนอน)
    };

    /* ---------- เส้นวงกลมลายมือ (มีหางลากเลยจุดเริ่ม) ---------- */
    var RING_OUTER = 'M60,6 C90,6 114,28 114,59 C114,90 91,114 60,114 C29,114 6,91 6,60 ' +
        'C6,30 28,7 57,6 C64,5.6 71,6.6 77,8.6';
    var RING_INNER = 'M60,15 C86,15 105,33 105,59 C105,85 85,105 60,105 C35,105 15,86 15,60 ' +
        'C15,34 34,16 58,15 C62,14.8 66,15 69,15.4';

    /* TODO[ART] — รูปในวง "ภาพงาน" ที่ลอยขึ้นริมซ้าย
       ยังไม่มีรูปผลงานจริง ทุกช่องจึงเป็นวงเปล่าที่เขียนว่า "ภาพงาน"
       ใส่ path รูปแทน null ได้เลย (เช่น 'images/work-01.png') ยิ่งเยอะยิ่งไม่ซ้ำ */
    var WORK_IMAGES = [null, null, null, null, null];

    document.addEventListener('DOMContentLoaded', function () {
        applyArt();
        startIntro();
        setupRope();
        setupFormTilt();
        setupProps();
        setupFormProgress();
        setupSmoothScroll();
        setupReveal();
        if (!reduce) startWorkFloat();
    });


    /* ---------- ของประดับ Game UI: parallax ตามเมาส์ ----------
       แตะแค่ transform ของ .gx-layer เท่านั้น
       ลูกข้างใน (แอสโทรเลบหมุน / คริสตัลลอย) จึงมีอนิเมชันของตัวเองได้ไม่ชนกัน */
    function setupProps() {
        var host = document.getElementById('gxProps');
        var hero = document.getElementById('hero');
        if (!host || !hero || reduce || isTouch) return;

        var layers = Array.prototype.slice.call(host.querySelectorAll('.gx-layer'));
        if (!layers.length) return;

        var raf = 0, tx = 0, ty = 0;

        function apply() {
            raf = 0;
            layers.forEach(function (el) {
                var d = parseFloat(el.getAttribute('data-depth')) || 6;
                el.style.transform =
                    'translate3d(' + (tx * d).toFixed(2) + 'px,' + (ty * d).toFixed(2) + 'px,0)';
            });
        }

        hero.addEventListener('pointermove', function (e) {
            var r = hero.getBoundingClientRect();
            if (!r.width || !r.height) return;
            // สวนทางเมาส์ (-1..1) ระยะจริงสูงสุด = depth ของชั้นนั้น = 18px
            tx = ((e.clientX - r.left) / r.width - .5) * -2;
            ty = ((e.clientY - r.top) / r.height - .5) * -2;
            if (!raf) raf = requestAnimationFrame(apply);
        });

        hero.addEventListener('pointerleave', function () {
            tx = 0; ty = 0;
            if (!raf) raf = requestAnimationFrame(apply);
        });
    }


    /* ---------- ตัวนับความครบของฟอร์มแบบ HUD ----------
       นับจากค่าที่กรอกจริง 3 อย่าง: ชื่อ / Email / เลือกสินค้าอย่างน้อย 1
       ใช้ MutationObserver ดูคลาส .selected ด้วย เพราะ script.js เป็นคนสลับคลาสนั้น
       (ถ้าดักแค่ click อาจอ่านค่าก่อนที่ script.js จะสลับเสร็จ) */
    function setupFormProgress() {
        var box = document.getElementById('formProgress');
        var form = document.getElementById('registerForm');
        var list = document.getElementById('productSelectList');
        if (!box || !form) return;

        var dots = box.querySelectorAll('i');
        var num = box.querySelector('b');

        function val(id) {
            var el = document.getElementById(id);
            return el ? el.value.trim() : '';
        }

        function update() {
            var done = [
                val('regName').length > 0,
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('regEmail')),
                !!(list && list.querySelector('.product-select-item.selected'))
            ];
            var n = 0;
            for (var i = 0; i < dots.length; i++) {
                if (done[i]) n++;
                dots[i].classList.toggle('on', !!done[i]);
            }
            if (num) num.textContent = n + '/3';
            box.classList.toggle('is-full', n === dots.length);
        }

        form.addEventListener('input', update);
        form.addEventListener('change', update);

        // #formProgress อยู่นอก #productSelectList → toggle คลาสข้างในไม่ย้อนมาปลุก observer
        if (list && window.MutationObserver) {
            new MutationObserver(update).observe(list, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }

        update();
    }


    /* ---------- สลับช่อง TODO[ART] ไปใช้ไฟล์ภาพวาดจริง ---------- */
    function applyArt() {
        Object.keys(ART).forEach(function (key) {
            var src = ART[key];
            if (!src) return;
            var slot = document.querySelector('[data-art-slot="' + key + '"]');
            if (!slot) return;
            var alt = slot.textContent.trim();
            slot.innerHTML = '';
            var img = document.createElement('img');
            img.src = src;
            img.alt = alt;
            slot.appendChild(img);
            slot.classList.add('has-art');
        });
    }


    /* ---------- อินโทร ---------- */
    function startIntro() {
        var hero = document.getElementById('hero');
        if (!hero) return;
        if (reduce) { hero.classList.remove('armed'); return; }
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                hero.classList.remove('armed');
                hero.classList.add('go');
            });
        });
    }


    /* ---------- วง "ภาพงาน" ลอยขึ้นแล้วเล็กหายไป (แบบอีโมจิไลฟ์) ---------- */
    var workIdx = 0;
    var worksOn = true;

    /* อยู่ฉากเมนู (ฉาก 2) ให้วงภาพงานดีดขึ้นบนหายไปทุกใบ แล้วหยุดปล่อยวงใหม่ */
    function setWorksVisible(on) {
        var host = document.getElementById('skWorks');
        if (!host || worksOn === on) return;
        worksOn = on;
        host.classList.toggle('is-away', !on);
        if (on) {
            // กลับมาฉากแบรนด์ — ปล่อยพร้อมกัน 4 ใบแต่ให้ "เริ่มไปแล้ว" คนละจังหวะ
            // (animation-delay ติดลบ) วงจะกระจายทั่วคอลัมน์ทันที ไม่กระจุกอยู่ล่างสุด
            [0, 1.9, 3.6, 5.1].forEach(function (pre) { spawnWork(pre); });
        } else {
            flingWorksAway(host);
        }
    }

    /* ดีดวงที่ค้างอยู่บนจอขึ้นข้างบนให้หมด ทีละใบไล่กัน
       ต้องหยุดอนิเมชันเดิมแล้ว "ตรึง" matrix ปัจจุบันไว้ก่อน
       ไม่งั้นพอสลับอนิเมชันมันจะกระโดดกลับไปจุดเริ่มต้นให้เห็น */
    function flingWorksAway(host) {
        Array.prototype.forEach.call(host.children, function (el, i) {
            var m = getComputedStyle(el).transform;
            if (m === 'none') m = '';

            el.style.animation = 'none';
            el.style.transform = m;
            void el.offsetWidth;                     // บังคับ reflow ให้ค่าที่ตรึงมีผลก่อน

            var spin = (Math.random() * 22 - 11).toFixed(1);
            var lag = (i * 0.035).toFixed(3);
            // เคิร์ฟติดลบช่วงต้น = ย่อลงเก็บแรงนิดนึงก่อนดีดขึ้น แล้วพุ่งออกไปเลย ไม่หน่วงท้าย
            el.style.transition =
                'transform .38s cubic-bezier(.5,-0.5,.75,.4) ' + lag + 's, ' +
                'opacity .26s ease-in ' + (+lag + 0.14).toFixed(3) + 's';
            // ย่อเล็กลงตอนพุ่งออก ไม่ใช่โป่งใหญ่ (ของเดิม scale 1.22 ใหญ่เกิน)
            el.style.transform = 'translateY(-125vh) scale(.78) rotate(' + spin + 'deg) ' + m;
            el.style.opacity = '0';
        });
        setTimeout(function () { if (!worksOn) host.innerHTML = ''; }, 620);
    }

    /* preroll = จำนวนวินาทีที่ให้ "เริ่มไปแล้ว" ตอนเกิด (ใช้ animation-delay ติดลบ) */
    function spawnWork(preroll) {
        var host = document.getElementById('skWorks');
        if (!host || document.hidden || !worksOn) return;
        if (!host.offsetParent) return;                // จอแคบซ่อนคอลัมน์นี้ไว้
        if (host.childElementCount > 5) return;        // อย่าให้แน่นเกิน

        var size = 96 + Math.random() * 76;            // 96–172px (ของเดิมใหญ่เกิน)
        var dur = 6.4 + Math.random() * 2.8;           // 6.4–9.2 วินาที (เดิม 10–15 อืดไป)
        var startX = -40 + Math.random() * 146;        // เกาะริมซ้าย มีล้นขอบบ้าง
        var drift = Math.random() * 120 - 30;          // ระยะส่ายซ้ายขวาระหว่างลอย
        var pre = preroll || 0;

        var fig = document.createElement('figure');
        fig.className = 'sk-work';
        fig.style.setProperty('--x', startX.toFixed(0) + 'px');
        fig.style.setProperty('--s', size.toFixed(0) + 'px');
        fig.style.setProperty('--dx', drift.toFixed(0) + 'px');
        fig.style.setProperty('--dur', dur.toFixed(2) + 's');

        // สุ่มทางส่ายให้ทุกใบเดินคนละเส้น — ช่วง k3/k5 ติดลบบังคับให้มีจังหวะแกว่งกลับ
        function rnd(a, b) { return (a + Math.random() * (b - a)).toFixed(2); }
        fig.style.setProperty('--k1', rnd(.05, .45));
        fig.style.setProperty('--k2', rnd(.25, .70));
        fig.style.setProperty('--k3', rnd(-.60, -.05));
        fig.style.setProperty('--k4', rnd(.30, .90));
        fig.style.setProperty('--k5', rnd(-.40, .15));
        fig.style.setProperty('--rot', (Math.random() < .5 ? -1 : 1) * (3 + Math.random() * 8).toFixed(1) + 'deg');
        if (pre) {
            // เกิดกลางอากาศ (เริ่มไปแล้ว) — ต้องมีอนิเมชันปรากฏซ้อนด้วย
            // ไม่งั้นมันจะโผล่พรึบเหมือนกระพริบ
            fig.style.setProperty('--pre', '-' + pre + 's');
            fig.classList.add('is-warp-in');
        }

        // วงแหวนคู่ — เส้นเต็มวงทั้งสองชั้น ไม่ใช่ขีดสั้นๆ
        var rings = '<path d="' + RING_OUTER + '"/><path class="ring-inner" d="' + RING_INNER + '"/>';

        var src = WORK_IMAGES[workIdx++ % WORK_IMAGES.length];
        fig.innerHTML =
            '<div class="sk-work-fill"></div>' +
            '<svg class="sk-work-ring" viewBox="0 0 120 120">' + rings + '</svg>' +
            (src
                ? '<img src="' + src + '" alt="" loading="lazy">'
                : '<span class="sk-work-label">ภาพงาน</span>');

        host.appendChild(fig);
        setTimeout(function () { fig.remove(); }, (dur - pre) * 1000 + 300);
    }

    function startWorkFloat() {
        // เปิดหน้ามาให้มีวงกระจายทั่วคอลัมน์เลย ไม่ต้องรอไล่ขึ้นทีละใบ
        setTimeout(function () {
            [0, 1.9, 3.6, 5.1].forEach(function (pre) { spawnWork(pre); });
        }, 900);
        var tick = function () {
            spawnWork();
            setTimeout(tick, 1500 + Math.random() * 1100);
        };
        setTimeout(tick, 3200);
    }


    /* ---------- ฟอร์มเอียงตามเมาส์ ---------- */
    function setupFormTilt() {
        var card = document.getElementById('form3d');
        var hero = document.getElementById('hero');
        if (!card || !hero || reduce || isTouch) return;

        var BASE_Y = -7, BASE_X = 1.5;

        hero.addEventListener('mousemove', function (e) {
            var r = hero.getBoundingClientRect();
            var dx = (e.clientX - (r.left + r.width / 2)) / r.width;    // -0.5 … 0.5
            var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
            card.style.setProperty('--fy', (BASE_Y + dx * 8).toFixed(2) + 'deg');
            card.style.setProperty('--fx', (BASE_X - dy * 6).toFixed(2) + 'deg');
        }, { passive: true });

        hero.addEventListener('mouseleave', function () {
            card.style.setProperty('--fy', BASE_Y + 'deg');
            card.style.setProperty('--fx', BASE_X + 'deg');
        });
    }


    /* ---------- เชือกดึงเปลี่ยนฉาก ---------- */
    function setupRope() {
        var rope = document.getElementById('sceneRope');
        var win = document.getElementById('sceneWindow');
        if (!rope || !win) return;

        var busy = false;

        function switchScene() {
            if (busy) return;
            var panels = Array.prototype.slice.call(win.querySelectorAll('.scene-panel'));
            if (panels.length < 2) return;
            busy = true;

            var cur = panels.filter(function (p) { return p.classList.contains('is-active'); })[0] || panels[0];
            var next = panels[(panels.indexOf(cur) + 1) % panels.length];

            // วงภาพงานเป็นของฉากแบรนด์ ไปฉากอื่นก็ต้องลอยหายไปด้วย
            setWorksVisible(next.getAttribute('data-scene') === '1');

            // ป้ายโค้ดฉากแบบ HUD
            var code = document.getElementById('sceneCode');
            if (code) code.textContent = 'Scene 0' + (next.getAttribute('data-scene') || '1');

            if (reduce) {
                cur.classList.remove('is-active');
                next.classList.add('is-active');
                busy = false;
                return;
            }

            // วงเล็บ HUD หุบเข้าแล้วกางออก — ต่อท้ายจังหวะเดิม ไม่แตะคีย์เฟรม scene-up/scene-down
            win.classList.add('is-swapping');
            setTimeout(function () { win.classList.remove('is-swapping'); }, 240);

            // ตัวเลขต้องตรงกับ .is-leaving (.34s) / .is-entering (.52s) ใน hero-space.css
            cur.classList.add('is-leaving');
            setTimeout(function () {
                cur.classList.remove('is-active', 'is-leaving');
                next.classList.add('is-active', 'is-entering');
                setTimeout(function () {
                    next.classList.remove('is-entering');
                    busy = false;
                }, 530);
            }, 335);
        }

        // ดึงลง (เมาส์/นิ้ว) แล้วปล่อย = เปลี่ยนฉาก
        var startY = null;
        rope.addEventListener('pointerdown', function (e) {
            startY = e.clientY;
            rope.classList.add('is-pulling');
            rope.setPointerCapture && rope.setPointerCapture(e.pointerId);
        });
        rope.addEventListener('pointermove', function (e) {
            if (startY === null) return;
            var dy = Math.max(0, Math.min(46, e.clientY - startY));
            rope.style.setProperty('--pull', dy.toFixed(0) + 'px');
        });
        function release() {
            if (startY === null) return;
            startY = null;
            rope.classList.remove('is-pulling');
            rope.style.removeProperty('--pull');
            switchScene();
        }
        rope.addEventListener('pointerup', release);
        rope.addEventListener('pointercancel', function () {
            startY = null;
            rope.classList.remove('is-pulling');
            rope.style.removeProperty('--pull');
        });

        // คีย์บอร์ด
        rope.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchScene(); }
        });

        // ปุ่ม "หน้าแรก" ในฉาก 2 = กลับฉาก 1
        var home = win.querySelector('[data-scene-home]');
        if (home) {
            home.addEventListener('click', function (e) {
                e.preventDefault();
                switchScene();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
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
            if (!a || a.hasAttribute('data-scene-home')) return;
            var id = a.getAttribute('href');
            if (!id || id === '#') return;
            var dest = document.querySelector(id);
            if (!dest) return;
            e.preventDefault();
            var y = dest.getBoundingClientRect().top + window.scrollY - 16;
            // If target is the edit-tag section, align to the section background top
            if (id === '#lookup') {
                var fit = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fit')) || 1;
                y = 2009 * fit;
            }
            window.scrollTo({
                top: Math.max(y, 0),
                behavior: reduce ? 'auto' : 'smooth'
            });
        });
    }


    /* ---------- Scroll reveal ---------- */
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
