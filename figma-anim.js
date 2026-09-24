/* ============================================================
   MOFYCH — อนิเมชัน (เฟส 3)

   แยกจาก figma.js เพราะ figma.js คือตรรกะเฟส 1/2 ที่ต้องไม่มี timer เลย
   ไฟล์นี้เติมทีละส่วน ส่วนละบล็อก ถอดบล็อกไหนออกหน้าก็ยังทำงานเหมือนเดิม

   โหลดหลัง figma.js เสมอ
   ============================================================ */
(function () {
    'use strict';

    /* ผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหว → ไม่รันของที่ "ขยับเอง" (เชือก)
       ส่วนปุ่มยังต้องสลับสถานะอยู่ เพราะมันคือผลตอบรับตอนกด ไม่ใช่ของประดับ
       figma-anim.css เป็นคนตัด transition ให้เปลี่ยนทันทีแทน */
    var REDUCE = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var stage = document.getElementById('stage');
    if (!stage) return;

    var DEG = 180 / Math.PI;

    /* ============================================================
       ส่วนที่ 1 — เชือก

       เชือกในไฟล์ Figma แยกเป็น 3 กลุ่มมาแล้ว เรียงจากบนลงล่าง:

         พาร์ท 1  Group 20  เส้นเชือก + ลูกกลมทอง   ← ตัวที่แกว่ง
         พาร์ท 2  Group 19  ดาว + แสงส้มหลังดาว     ← ตามพาร์ท 1
         พาร์ท 3  Group 17  จุกปลาย                 ← ตามพาร์ท 2

       มีสองแกนที่ขยับพร้อมกันได้ ไม่ยุ่งกัน:
         แกนแกว่ง  (มุม)  = ลูกตุ้ม 3 ข้อต่อ แกว่งเองช้าๆ ตลอดเวลา
         แกนดึง    (ยืด)  = สปริง กดค้างแล้วเชือกยาวลง ปล่อยแล้วเด้งกลับ

       ⚠ ห้ามเอากลุ่มไปซ้อนกันใน DOM เพื่อให้ transform ตกทอด
         เพราะลำดับหน้าหลังในไฟล์คือ จุก < ดาว < เส้น (จุกอยู่ล่างสุด)
         ถ้าซ้อนจะกลายเป็น เส้น < ดาว < จุก ซึ่งกลับด้าน
         → ปล่อยให้เป็นพี่น้องกันเหมือนเดิม แล้วต่อ transform เอง
           SVG อ่าน transform จากขวาไปซ้าย "rotate(A) rotate(B)"
           = หมุน B ก่อนแล้วค่อยหมุน A ทับ = ได้ผลเท่ากับซ้อนชั้นเป๊ะ
       ============================================================ */
    (function rope() {

        if (REDUCE) return;

        var pc = document.getElementById('pcRope');
        var hit = document.getElementById('ropeHit');
        if (!pc) return;

        /* หา id แบบเจาะจงใน #pcRope เท่านั้น — ชื่อกลุ่มที่ Figma ตั้งมา
           (Group 17/19/20) ซ้ำกับเลเยอร์อื่นในหน้าได้ ห้ามใช้ getElementById */
        var gCord = pc.querySelector('[id="Group 20"]');    /* พาร์ท 1 */
        var gStar = pc.querySelector('[id="Group 19"]');    /* พาร์ท 2 */
        var gTail = pc.querySelector('[id="Group 17"]');    /* พาร์ท 3 */
        var cord = pc.querySelector('[id="Vector 30"]');    /* เฉพาะเส้น */
        var ball = pc.querySelector('[id="Ellipse 30"]');   /* เฉพาะลูกกลมทอง */
        if (!gCord || !gStar || !gTail || !cord || !ball) return;

        /* ---------- จุดหมุน 3 จุด (พิกัดเฟรม Figma อ่านจากไฟล์ 23_rope.svg) ----------
           P0 ปลายบนสุดของเส้นเชือก y=-103 (อยู่นอกเฟรม โดนตัดไปแล้ว)
              ใช้เป็นจุดแขวน — แขนยาว 275px ทำให้คาบแกว่งช้าเองโดยไม่ต้องฝืน
           P1 ลูกกลมทอง Ellipse 30 = ข้อต่อระหว่างเส้นเชือกกับดาว
           P2 ขอบบนของจุกปลาย Vector 31 = ข้อต่อระหว่างดาวกับจุก */
        var P0X = 178.9, P0Y = -103.0;
        var P1X = 174.609, P1Y = 172.455;
        var P2X = 174.609, P2Y = 211.7;

        var L1 = P1Y - P0Y;        /* ความยาวเส้นเชือกตอนไม่โดนดึง = 275.455 */
        var HIT_LEN = 299.1 - P0Y; /* จากจุดแขวนถึงก้นกล่องกด = 402.1 */

        /* ============================================================
           ค่าที่ปรับได้ — อยากได้ฟีลอื่นแก้ตรงนี้ที่เดียว
           ============================================================ */

        /* ---------- แกนแกว่ง ----------
           G = แรงดึงกลับเข้าแนวดิ่ง (ยิ่งน้อยยิ่งแกว่งช้า)
           D = แรงต้าน / หน่วง       (ยิ่งมากยิ่งหยุดเร็ว)
           K = แรงที่พาร์ทล่างถูกพาร์ทบนลาก (ยิ่งมากยิ่งตามติด ยิ่งน้อยยิ่งอืด) */

        /* พาร์ท 1 — คาบแกว่งอิสระ 2π/√G ≈ 3.6 วินาที */
        var G1 = 3.0, D1 = 0.75;

        /* แกว่งเองช้าๆ ตลอดเวลา — ทำโดยให้ "แนวพัก" ของเชือกส่ายช้าๆ
           แล้วปล่อยให้ตัวเชือกวิ่งตามด้วยฟิสิกส์จริง (ไม่ใช่สั่งมุมตรงๆ)
           ผลคือตอนโดนกระตุก มันแกว่งอิสระแล้วค่อยๆ กลับมาเข้าจังหวะเดิมเอง
           ซ้อนสองคาบที่ไม่ลงตัวกัน (9.0 กับ 5.7 วิ) จะได้ไม่ดูวนซ้ำ
           แอมพลิจูดรวมออกมาราว ±3 องศา = หัวดาวขยับซ้ายขวาราว 15px */
        var SWAY_A1 = 0.030, SWAY_W1 = 2 * Math.PI / 9.0;
        var SWAY_A2 = 0.012, SWAY_W2 = 2 * Math.PI / 5.7;

        /* พาร์ท 2 / 3 — ตัวที่ทำให้เชือก "ปลิว" ไม่ใช่ขยับเป็นแท่งเดียว
           K ต่ำ = ถูกลากหลวมๆ ตามไม่ทัน · D ต่ำ = เลยแล้วแกว่งกลับหลายที
           G ยังต้องมีอยู่ ไม่งั้นตอนเชือกเอียงค้าง พาร์ทล่างจะเอียงตามเป็นเส้นตรง
           ทั้งที่ของจริงมันต้องห้อยดิ่งลงกว่า = เชือกโค้ง ไม่ใช่ไม้แข็ง

           ζ (อัตราหน่วง) = D / (2√(G+K)) ≈ 0.15 ทั้งคู่ → แกว่งกลับราว 4-5 ที
           อยากให้ปลิวนานขึ้นลด D · อยากให้ตามติดขึ้นเพิ่ม K */
        var G2 = 0.90, K2 = 3.0, D2 = 0.62;
        var G3 = 0.70, K3 = 2.2, D3 = 0.46;

        /* ---------- แกนดึง (กดแล้วเชือกยืดลง–เด้งกลับ) ----------
           ⚠ แกนนี้เจ้าของงานบอกว่าดีแล้ว อย่าไปยุ่ง — ทั้ง 3 พาร์ทยืดลงพร้อมกัน
             เท่ากันด้วยสปริงตัวเดียว การแยกชิ้นให้ไปทำที่แกนแกว่งอย่างเดียว

           PULL_DEPTH  กดค้างแล้วเชือกยาวลงกี่ px
           PULL_K      ความแข็งสปริง — คาบ 2π/√K ≈ 0.66 วิ
           PULL_D      แรงต้าน — ยิ่งน้อยยิ่งเด้งหลายที
                       ค่านี้ให้เด้งเลยขึ้นไปราว 1/3 ของระยะกด (~9px) แล้วนิ่ง
           PULL_HOLD   กดแวบเดียวก็ยังนับว่ากดค้างอย่างน้อยกี่ ms
                       ไม่งั้นคลิกเร็วๆ เชือกจะแทบไม่ขยับ */
        var PULL_DEPTH = 26;
        var PULL_K = 90, PULL_D = 6.26;
        var PULL_HOLD = 130;

        /* ---------- แรงเหวี่ยงข้างตอนกด ----------
           ทิศตามฝั่งที่จับ: จับซ้ายเชือกเหวี่ยงซ้าย จับขวาเหวี่ยงขวา
           KICK_MAX 0.26 rad/s ≈ แกว่งอิสระราว 8 องศาแล้วค่อยๆ ซาลง */
        var KICK_GAIN = 0.005, KICK_MAX = 0.26;
        var KICK_KEY = 0.18;   /* เปิดด้วยคีย์บอร์ด ไม่มีตำแหน่งเมาส์ให้อ้าง */

        /* ============================================================ */

        /* ---------- สถานะ ----------
           th = มุมเทียบแนวดิ่ง (เรเดียน, สัมบูรณ์) · w = ความเร็วเชิงมุม
           pull = ระยะที่เชือกยืดลงตอนนี้ (px) · pullV = ความเร็วของมัน */
        var t = 0;
        var th1, th2, th3;
        var w1 = 0, w2 = 0, w3 = 0;
        var pull = 0, pullV = 0;           /* ระยะยืด ใช้ร่วมกันทั้ง 3 พาร์ท */
        var held = false, holdTimer = 0;

        function sway(time) {
            return SWAY_A1 * Math.sin(time * SWAY_W1) +
                SWAY_A2 * Math.sin(time * SWAY_W2 + 2.1);
        }
        th1 = th2 = th3 = sway(0);   /* เริ่มที่แนวพัก จะได้ไม่กระตุกตอนโหลด */

        /* ---------- ฟิสิกส์ ----------
           เดินทีละ 1/120 วิคงที่ ไม่ใช้ dt จริงของเฟรม
           เพราะจอ 60/120/144Hz หรือเฟรมตกจะทำให้ค่าคงที่ข้างบนให้ผลไม่เท่ากัน */
        var STEP = 1 / 120;
        var carry = 0;

        function integrate() {
            /* ---- แกนดึง: สปริงตัวเดียว ทั้ง 3 พาร์ทยืดเท่ากัน ----
               กดค้าง = ลงไป PULL_DEPTH · ปล่อย = กลับ 0
               ที่เด้งเลยขึ้นไปตอนปล่อยเป็นเพราะโมเมนตัมล้วน ไม่ได้สั่งให้เด้ง */
            var pa = PULL_K * ((held ? PULL_DEPTH : 0) - pull) - PULL_D * pullV;
            pullV += pa * STEP; pull += pullV * STEP;

            /* ---- แกนแกว่ง: ตรงนี้คือที่เดียวที่ทำให้เห็นเป็น 3 ชิ้นแยกกัน ---- */
            var rest = sway(t);
            var a1 = -G1 * Math.sin(th1 - rest) - D1 * w1;
            var a2 = -G2 * Math.sin(th2) + K2 * (th1 - th2) - D2 * w2;
            var a3 = -G3 * Math.sin(th3) + K3 * (th2 - th3) - D3 * w3;

            w1 += a1 * STEP; th1 += w1 * STEP;
            w2 += a2 * STEP; th2 += w2 * STEP;
            w3 += a3 * STEP; th3 += w3 * STEP;

            t += STEP;
        }

        /* ---------- วาด ---------- */
        function rot(deg, cx, cy) {
            return 'rotate(' + deg.toFixed(3) + ' ' + cx + ' ' + cy + ')';
        }

        function draw() {
            var d1 = th1 * DEG;
            var d2 = (th2 - th1) * DEG;   /* มุมของพาร์ท 2 เทียบพาร์ท 1 */
            var d3 = (th3 - th2) * DEG;   /* มุมของพาร์ท 3 เทียบพาร์ท 2 */

            var p = pull.toFixed(2);

            /* translate อยู่ "หลัง" rotate(d1) → เลื่อนตามแนวเชือกที่เอียงอยู่
               ไม่ใช่เลื่อนลงตรงๆ ตามแกน y ของหน้า (ซึ่งจะดูเหมือนของหลุด) */
            var m1 = rot(d1, P0X, P0Y);
            var m2 = m1 + ' translate(0 ' + p + ') ' + rot(d2, P1X, P1Y);
            var m3 = m2 + ' ' + rot(d3, P2X, P2Y);

            gCord.setAttribute('transform', m1);
            gStar.setAttribute('transform', m2);
            gTail.setAttribute('transform', m3);

            /* ในพาร์ท 1 สองชิ้นนี้ยืดคนละแบบ:
                 เส้นเชือก  ยืดยาวลง (scale แนวตั้งรอบจุดแขวน — ความหนาไม่เปลี่ยน)
                 ลูกกลมทอง เลื่อนลงเฉยๆ ถ้า scale ด้วยวงกลมจะกลายเป็นวงรี */
            cord.setAttribute('transform', 'translate(0 ' + P0Y + ') scale(1 ' +
                ((L1 + pull) / L1).toFixed(5) + ') translate(0 ' + (-P0Y) + ')');
            ball.setAttribute('transform', 'translate(0 ' + p + ')');

            /* ตำแหน่งกดตามตำแหน่งที่แกว่ง — จุดหมุนตั้งไว้ใน figma-anim.css
               หมุนตามพาร์ท 1 + ยืดก้นกล่องลงเท่าที่เชือกยืด (scale รอบจุดเดียวกัน) */
            if (hit) {
                hit.style.transform = 'rotate(' + d1.toFixed(3) + 'deg) scaleY(' +
                    ((HIT_LEN + pull) / HIT_LEN).toFixed(5) + ')';
            }
        }

        /* ---------- ลูป ----------
           หยุดเมื่อเลื่อนพ้นเชือก หรือสลับแท็บไปแล้ว — เชือกอยู่บนสุดของหน้า
           ไม่มีเหตุให้เผาเฟรมทิ้งตอนผู้ใช้อ่านเนื้อหาข้างล่าง */
        var raf = 0;
        var last = 0;

        function frame(now) {
            raf = requestAnimationFrame(frame);

            var dt = (now - last) / 1000;
            last = now;
            if (dt > 0.25) dt = 0.25;     /* กลับมาจากแท็บอื่น อย่าเดินรวดเดียว */

            carry += dt;
            while (carry >= STEP) {
                integrate();
                carry -= STEP;
            }
            draw();
        }

        function start() {
            if (raf) return;
            last = performance.now();
            carry = 0;
            raf = requestAnimationFrame(frame);
        }

        function stop() {
            if (!raf) return;
            cancelAnimationFrame(raf);
            raf = 0;
        }

        /* ---------- กด/ปล่อย ----------
           figma.js เป็นคนสลับซีนตอน click ที่นี่ดูแลแค่การขยับของเชือก */
        function press(clientX) {
            clearTimeout(holdTimer);
            held = true;

            if (clientX != null) {
                /* .stage ถูกย่อด้วย scale(--fit) → ต้องหารกลับก่อนเทียบพิกัดเฟรม */
                var r = stage.getBoundingClientRect();
                var f = r.width / 1920;
                if (f) {
                    var v = (((clientX - r.left) / f) - P1X) * KICK_GAIN;
                    w1 += v > KICK_MAX ? KICK_MAX : (v < -KICK_MAX ? -KICK_MAX : v);
                }
            } else {
                w1 += KICK_KEY;
            }
            start();
        }

        function release() {
            if (!held) return;
            clearTimeout(holdTimer);
            holdTimer = setTimeout(function () { held = false; }, PULL_HOLD);
        }

        if (hit) {
            hit.addEventListener('pointerdown', function (ev) { press(ev.clientX); });

            /* ปล่อยนอกกล่องกดก็ต้องเด้งกลับ → ดักที่ window ไม่ใช่ที่ปุ่ม */
            window.addEventListener('pointerup', release);
            window.addEventListener('pointercancel', release);

            /* เปิดด้วยคีย์บอร์ด (Enter/Space) ไม่มี pointerdown/pointerup ให้จับ */
            hit.addEventListener('click', function (ev) {
                if (ev.detail === 0) { press(null); release(); }
            });
        }

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) stop(); else start();
        });

        /* เชือกยาว 299px อยู่บนสุดของ hero — ใช้กล่องกดเป็นตัววัดว่ายังเห็นอยู่ไหม
           เบราว์เซอร์ที่ไม่มี IntersectionObserver ก็แค่รันตลอด ไม่พัง */
        if (hit && window.IntersectionObserver) {
            new IntersectionObserver(function (es) {
                if (es[0].isIntersecting) start(); else stop();
            }).observe(hit);
        } else {
            start();
        }

        draw();
    }());

    /* ============================================================
       ส่วนที่ 2 — ปุ่ม สำรวจชิ้นงาน

       ที่นี่ทำแค่ "บอกสถานะ" การขยับจริงอยู่ใน figma-anim.css ทั้งหมด
       ทำไมไม่ใช้ :hover / :active เฉยๆ — ตัวรับคลิก (<a id="btnExplore">)
       อยู่ "หลัง" กล่องงานอาร์ตในลำดับ DOM และ CSS เลือกพี่น้องที่อยู่
       ข้างหน้าไม่ได้ จะย้ายลำดับก็ไม่ได้เพราะตัวรับคลิกต้องทับอยู่ข้างบน
       ============================================================ */
    (function btnExplore() {

        var wrap = document.getElementById('pcBtnExplore');
        var hit = document.getElementById('btnExplore');
        if (!wrap || !hit) return;

        var byTouch = false;

        function set(name, on) { wrap.classList.toggle(name, on); }

        function up() {
            set('is-down', false);
            /* จอสัมผัสไม่มี "เอาเมาส์ออก" ถ้าไม่เคลียร์เอง ปุ่มจะค้างสถานะยกไว้ */
            if (byTouch) { set('is-hover', false); byTouch = false; }
        }

        hit.addEventListener('pointerenter', function (ev) {
            if (ev.pointerType !== 'touch') set('is-hover', true);
        });
        hit.addEventListener('pointerleave', function () {
            set('is-hover', false); set('is-down', false);
        });
        hit.addEventListener('pointerdown', function (ev) {
            byTouch = ev.pointerType === 'touch';
            set('is-down', true);
        });

        /* ดักที่ window เพราะปล่อยนิ้วนอกปุ่มก็ต้องเด้งกลับ */
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);

        /* คีย์บอร์ด — โฟกัสให้เท่ากับเอาเมาส์วาง · เคาะ Enter/เว้นวรรคให้เท่ากับกด
           เช็ค :focus-visible ก่อน ไม่งั้นคลิกด้วยเมาส์แล้วปุ่มจะค้างสถานะยก */
        hit.addEventListener('focus', function () {
            if (hit.matches(':focus-visible')) set('is-hover', true);
        });
        hit.addEventListener('blur', function () {
            set('is-hover', false); set('is-down', false);
        });
        hit.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') set('is-down', true);
        });
        hit.addEventListener('keyup', function () { set('is-down', false); });
    }());

    /* ============================================================
       ส่วนที่ 7 — เมาส์วาง/กด ของปุ่มเมนู 4 อันใน hero

       ปุ่มหนึ่งช่องมี 3 ชิ้น (ป้าย · ตัวหนังสือ · ตัวคลิก) ที่เป็นพี่น้องกัน
       ไม่ใช่พ่อลูก จึงใช้ :hover ของ CSS ตรงๆ ไม่ได้ ต้องแปะคลาสให้ทั้งสามชิ้น
       (figma.js ทำแบบเดียวกันอยู่แล้วสำหรับสลับป้ายสี — is-on)
       ที่นี่ดูแลเฉพาะ "การขยับ" การขยับจริงอยู่ใน figma-anim.css ทั้งหมด
       ============================================================ */
    (function heroMenuBtns() {

        var scope = document.getElementById('pcHeroMenu');
        if (!scope) return;

        function mark(n, name, on) {
            var els = scope.querySelectorAll('[data-btn="' + n + '"]');
            for (var i = 0; i < els.length; i++) els[i].classList.toggle(name, on);
        }

        [1, 2, 3, 4].forEach(function (n) {
            var hit = document.getElementById('heroM' + n);
            if (!hit) return;
            var byTouch = false;

            hit.addEventListener('pointerenter', function (ev) {
                if (ev.pointerType !== 'touch') mark(n, 'is-hot', true);
            });
            hit.addEventListener('pointerleave', function () {
                mark(n, 'is-hot', false);
                mark(n, 'is-press', false);
            });
            hit.addEventListener('pointerdown', function (ev) {
                byTouch = ev.pointerType === 'touch';
                mark(n, 'is-press', true);
            });

            /* ปล่อยนอกปุ่มก็ต้องเด้งกลับ → ดักที่ window */
            function up() {
                mark(n, 'is-press', false);
                /* จอสัมผัสไม่มี "เอาเมาส์ออก" ถ้าไม่เคลียร์เอง ปุ่มจะค้างสถานะยก */
                if (byTouch) { mark(n, 'is-hot', false); byTouch = false; }
            }
            window.addEventListener('pointerup', up);
            window.addEventListener('pointercancel', up);

            hit.addEventListener('focus', function () {
                if (hit.matches(':focus-visible')) mark(n, 'is-hot', true);
            });
            hit.addEventListener('blur', function () {
                mark(n, 'is-hot', false);
                mark(n, 'is-press', false);
            });
            hit.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter' || ev.key === ' ') mark(n, 'is-press', true);
            });
            hit.addEventListener('keyup', function () { mark(n, 'is-press', false); });
        });
    }());

    /* ============================================================
       ส่วนที่ 9 — เปิด/ปิดการเตรียมชั้นภาพ

       เปิดตอน hero ยังอยู่บนจอ (= ตอนที่ยังกดเชือกสลับซีนได้)
       ปิดตอนเลื่อนพ้นไปแล้ว เพื่อคืนหน่วยความจำการ์ดจอ
       รายชื่อชิ้นที่ต้องเตรียมอยู่ใน figma-anim.css ส่วนที่ 9
       ============================================================ */
    /* ============================================================
       ส่วนที่ 10 — สับการ์ด สำรับ 3 ใบ

       ที่นี่ทำแค่ "ย้ายใบไหนไปช่องไหน" กับ "เปลี่ยนรูป"
       ตำแหน่งกับท่าทางทั้งหมดอยู่ใน figma-anim.css ส่วนที่ 10

       ⭐ เปลี่ยนรูปตอนใบนั้นไปถึงช่อง 3 (ล่างสุด) ซึ่งโดนบังอยู่
         ใบที่วนขึ้นมาข้างบนจึงเป็นรูปใหม่เสมอ ไม่ใช่ใบเดิมวนกลับมา
       ============================================================ */
    (function deck() {

        var cards = [
            document.getElementById('pcCard1'),
            document.getElementById('pcCard2'),
            document.getElementById('pcCard3')
        ];
        if (cards.some(function (c) { return !c; })) return;

        /* รูปที่หมุนเวียน — ไฟล์ที่ figma-webimg.py ย่อไว้แล้ว
           เพิ่ม/ลดได้ตามใจ ยิ่งเยอะยิ่งไม่ซ้ำ */
        var PHOTOS = [
            'images/figma/main-web/web/e16c04262b23.webp',
            'images/figma/main-web/web/86e7a1779d30.webp',
            'images/figma/main-web/web/a78dbcb21fdd.webp',
            'images/figma/main-web/web/c508a2308f73.webp',
            'images/figma/main-web/web/e74e939d386a.webp'
        ];
        /* ค้างโชว์ใบบนสุดนานขึ้น (เจ้าของงานสั่ง 2026-08-20) จาก 3.8 เป็น 7 วิ
           เวลาที่ "ค้างนิ่ง" จริง = EVERY ลบเวลาที่ใช้สับ (TUCK 860ms) = ~6.1 วิ */
        var EVERY = 7000;      /* สับทุกกี่ ms */
        var MOVE = 620;        /* ต้องเท่ากับ --deck-move ใน CSS (ขาขึ้น) */
        var TUCK = 860;        /* ต้องเท่ากับ --deck-tuck ใน CSS (ขาลง) */

        var next = 0;          /* รูปถัดไปในคิว */
        var slot = [1, 2, 3];  /* ใบที่ i อยู่ช่องไหน */

        function photo(card) { return card.querySelector('.card-photo'); }

        function paint() {
            cards.forEach(function (c, i) { c.dataset.slot = slot[i]; });
        }

        /* โหลดรูปไว้ล่วงหน้า ไม่งั้นตอนสลับจะเห็นการ์ดว่างแวบนึง */
        PHOTOS.forEach(function (src) { new Image().src = src; });

        cards.forEach(function (c, i) {
            var im = photo(c);
            if (im) im.setAttributeNS('http://www.w3.org/1999/xlink', 'href', PHOTOS[i % PHOTOS.length]);
        });
        next = cards.length % PHOTOS.length;
        paint();

        function step() {
            /* หาใบที่อยู่ช่อง 1 กับช่อง 2 ก่อน เพื่อใส่ท่าให้ถูกใบ */
            var top = slot.indexOf(1), mid = slot.indexOf(2);

            /* ⭐ คุมชั้นภาพจากตรงนี้ ไม่ใช่ในคีย์เฟรม
               ถ้าใส่ z-index ลงคีย์เฟรม อนิเมชันทั้งชุดจะตกไปคำนวณบน main thread
               (GPU ทำ z-index ไม่ได้) แล้วมันจะกระตุกเป็นช่วงๆ

                 11 = ใบที่กำลังมุดลง ใต้สุดทันที
                 13 = ใบที่กำลังออกมา อยู่เหนือใบที่เพิ่งขึ้นมาเป็นช่อง 2 (12)
                      แต่ยังต่ำกว่าฟอร์ม (20) จึงยังดูเหมือนคลานออกมาจากใต้ฟอร์ม
                      ถ้าปล่อยให้เป็น 12 เท่ากัน เบราว์เซอร์จะตัดสินด้วยลำดับ DOM
                      ซึ่งสลับไปมาทุกรอบ = เห็นรูปผิดใบแวบนึง */
            /* ⚠ ใบที่กำลังมุดลง "ห้าม" จมชั้นตั้งแต่เฟรมแรก
               ของเดิมสั่ง 11 ทันที มันเลยหายไปหลังฟอร์มพรึ่บเดียว = เห็นเป็นกระพริบ
               ต้องปล่อยให้อยู่ชั้นบน (21) ระหว่างยกขึ้นและออกข้างก่อน
               แล้วค่อยจมตอนมันวกกลับเข้ามาในแนวฟอร์มจริงๆ (52% ของทาง) */
            cards[top].style.zIndex = '21';
            cards[mid].style.zIndex = '13';

            cards[top].classList.add('is-tuck');
            cards[mid].classList.add('is-rise');

            /* เส้นทองวิบตอนใบนี้ "ถึงช่องบนแล้ว" ไม่ใช่ตอนกำลังบิน จะได้เห็นชัด
               (แทนการวิ่งวนตลอดเวลาแบบเดิม ซึ่งกิน GPU ทั้ง 5 ชุดพร้อมกัน) */
            var gs = cards[mid].querySelector('.goldshine');
            if (gs) setTimeout(function () {
                gs.classList.remove('is-shine');
                void gs.offsetWidth;
                gs.classList.add('is-shine');
                setTimeout(function () { gs.classList.remove('is-shine'); }, 1200);
            }, MOVE);

            /* หมุนเวียน: 1→3 · 2→1 · 3→2 */
            slot = slot.map(function (n) { return n === 1 ? 3 : n - 1; });
            paint();

            /* พ้นแนวกระดาษฟอร์มแล้วค่อยยกขึ้นชั้นบน (ตรงกับคีย์เฟรมช่วง 38-44%)
               ⚠ ต้องเป็น 22 ไม่ใช่ 21
                 ช่วง 287-437ms ใบที่กำลังมุดลงยังค้างอยู่ที่ 21 (ยังไม่ถึงคิวจม)
                 ถ้าใบที่กำลังขึ้นได้ 21 เท่ากัน เบราว์เซอร์จะตัดสินด้วยลำดับ DOM
                 ซึ่งสลับไปมาทุกรอบ → 1 ใน 3 รอบใบที่ขึ้นจะไปโผล่ใต้ใบที่มุด = กระพริบ
                 22 = อยู่เหนือใบที่มุดแน่นอนทุกรอบ และยังต่ำกว่ากลุ่ม 30 (ตรา/ปากกา/เชือก)
                 พออนิเมชันจบ JS ล้าง inline ทิ้ง คลาส data-slot='1' คืนค่า 21 ให้เอง */
            setTimeout(function () { cards[mid].style.zIndex = '22'; }, MOVE * 0.44);
            /* ใบที่มุดลง — วกกลับเข้าแนวฟอร์มแล้ว ค่อยจมลงชั้นล่าง */
            setTimeout(function () { cards[top].style.zIndex = '11'; }, TUCK * 0.52);

            setTimeout(function () {
                cards[top].classList.remove('is-tuck');
                cards[mid].classList.remove('is-rise');
                /* คืนให้คลาส data-slot คุมชั้นต่อ */
                cards[top].style.zIndex = '';
                cards[mid].style.zIndex = '';

                /* ใบที่เพิ่งลงไปช่อง 3 โดนบังแล้ว เปลี่ยนรูปตรงนี้ */
                var im = photo(cards[top]);
                if (im) {
                    im.setAttributeNS('http://www.w3.org/1999/xlink', 'href', PHOTOS[next]);
                    next = (next + 1) % PHOTOS.length;
                }
            }, TUCK);
        }

        var timer = setInterval(step, EVERY);

        /* หยุดตอนสลับแท็บไป ไม่งั้นกลับมาแล้วมันสับรัวเพื่อไล่เวลาที่หายไป */
        document.addEventListener('visibilitychange', function () {
            clearInterval(timer);
            if (!document.hidden) timer = setInterval(step, EVERY);
        });
    }());

    /* ============================================================
       ส่วนที่ 12 — การ์ดขวา 2 ใบ เอียง 3D ตามเมาส์

       อ่านตำแหน่งเมาส์เทียบกลางการ์ด แล้วส่งเป็นองศาให้ CSS ผ่านตัวแปร
       การเอียงจริงอยู่ใน figma-anim.css — ที่นี่ไม่แตะ style ตรงๆ นอกจาก 2 ตัวแปร
       ============================================================ */
    /* กรอบทองของฟอร์ม — เดิมวิบวนตลอดเวลา ตอนนี้วิบครั้งเดียวตอนเมาส์เข้ามาในฟอร์ม

       ⚠ ต้องผูกที่ #pcForm ตัวแม่ ห้ามผูกที่กระดาษ
         ช่องกรอก ตั๋ว ปุ่ม เป็น "พี่น้อง" ของกระดาษ ไม่ใช่ลูก
         ผูกที่กระดาษแล้วพอเมาส์เลื่อนไปโดนของพวกนั้นจะนับว่าออกจากกระดาษ
         พอเลื่อนกลับมาก็นับว่าเข้าใหม่ = วิบรัวๆ ตลอดเวลาที่ขยับเมาส์ในฟอร์ม
         pointerenter/leave ของตัวแม่นับลูกทุกตัวรวมเป็นก้อนเดียว เข้าทีเดียวจบ

       กระดาษยังต้องเปิดรับเมาส์อยู่ (figma-anim.css) เพราะพื้นที่ว่างบนกระดาษ
       ต้องนับเป็นส่วนหนึ่งของฟอร์มด้วย ไม่งั้นเลื่อนผ่านที่ว่างจะกลายเป็นออกนอกฟอร์ม */
    (function formShine() {

        var form = document.getElementById('pcForm');
        var shine = document.querySelector('.goldshine--form');
        if (!form || !shine) return;

        var bar = shine.querySelector('i');
        if (bar) bar.addEventListener('animationend', function () {
            shine.classList.remove('is-shine');
        });

        form.addEventListener('pointerenter', function () {
            if (shine.classList.contains('is-shine')) return;
            shine.classList.add('is-shine');
        });
    }());

    (function cardShine() {

        /* เดิมโมดูลนี้ส่งองศาเอียง 3D ให้การ์ดขวา — ถอดออกแล้ว (เจ้าของงานสั่ง 2026-08-20)
           เหลือหน้าที่เดียวคือสั่งให้เส้นทองวิบตอนเอาเมาส์วาง */
        [['tiltC', 'pcCardC'], ['tiltD', 'pcCardD']].forEach(function (pair) {
            var zone = document.getElementById(pair[0]);
            var card = document.getElementById(pair[1]);
            if (!zone || !card) return;
            var shine = card.querySelector('.goldshine');
            if (!shine) return;

            var bar = shine.querySelector('i');
            if (bar) bar.addEventListener('animationend', function () {
                shine.classList.remove('is-shine');
            });

            zone.addEventListener('pointerenter', function () {
                shine.classList.remove('is-shine');
                void shine.offsetWidth;
                shine.classList.add('is-shine');
            });
        });
    }());

    /* ============================================================
       ส่วนที่ 13 — ดาวประดับ ระบบสุ่มเกิด-ดับ (animation-list ข้อ 1.1)

       ⭐ ไม่ใช่ "สุ่มครั้งเดียวแล้ววาง" — แต่ละดวงเกิด อยู่พักนึง ดับ
         แล้วสุ่มค่าใหม่ทั้งหมดไปเกิดที่อื่น วนแบบนี้ตลอด

       ค่าทั้งหมดถอดมาจาก 11_background-Star_3.svg ซึ่งเป็นผลลัพธ์
       หนึ่งครั้งของระบบนี้ที่ดีไซน์วาดไว้เป็นตัวอย่าง:
         6 ดวงพร้อมกัน · อยู่ฝั่งซ้ายรอบบล็อกแบรนด์ x 222..798  y 49..580
         กว้าง 20..68 px · เต็มสี 5 ดวง แบบเส้น 1 ดวง
         สี #95C1FB #C8A6F7 #71EAF3 #F8A9D6 #9C55FF

       ⭐ ดาวตั้งตรงเสมอ — หมุนเฉพาะตอนเกิดกับตอนดับ (เร็วๆ รอบเดียว)
         ไม่เอียงมั่ว ไม่หมุนค้าง
       ============================================================ */
    (function starField() {

        /* ระบบเดียวใช้ทั้งหน้า — ดีไซน์วางชุดดาวไว้ 3 ที่ ขนาดกับสีชุดเดียวกันเป๊ะทุกชุด
             hero        11_background-Star_3   6 ดวง  x 222..775   y   49..509
             สินค้าซ้าย   background-Star        5 ดวง  x  57..509   y 1211..1670
             สินค้าขวา    background-Star_2      6 ดวง  x 1194..1747 y 1456..1917
           ทั้งสามไฟล์ไม่ฝังลงหน้าแล้ว ระบบนี้เป็นคนสร้างแทน
           (เซกชัน edit tag ไม่มีชุดดาวประดับในดีไซน์ จึงไม่มีโซนที่นั่น) */
        var ZONES = [
            { box: 'pcHeroStars', area: [200, 40, 820, 600], max: 6 },
            { box: 'pcProdStar1', area: [40, 1190, 530, 1690], max: 5 },
            { box: 'pcProdStar2', area: [1180, 1440, 1780, 1940], max: 6 }
        ];

        var SEED = 20260819;
        var EVERY = [380, 900];          /* เว้นกี่ ms ค่อยเกิดดวงถัดไปในโซนนั้น */
        var LIFE = [2000, 4200];         /* แต่ละดวงอยู่นานกี่ ms ก่อนเริ่มดับ */
        var IN = 520, OUT = 400;         /* ต้องตรงกับ star-in / star-out ใน CSS */
        var LINE_ODDS = 0.18;            /* โอกาสได้ดาวแบบเส้น (ตัวอย่างมี 1 ใน 6) */
        var FAR = 150;                   /* ห้ามเกิดใกล้ดวงที่ยังอยู่ในโซนเดียวกันเกินกว่านี้ */
        var EDGE = 300;                  /* เผื่อขอบจอกี่ px ค่อยหยุดปล่อยดาวในโซนที่พ้นไป */

        /* ขนาดเป็น "ชั้น" ไม่ใช่ช่วงต่อเนื่อง
           ดูจากไฟล์ตัวอย่าง: กว้าง 68 / 45 / 23 / 23 / 23 / 20
           = เล็ก 4 - กลาง 1 - ใหญ่ 1  → กลางกับใหญ่ต้องหายากพอๆ กัน
           ถ้าใช้ช่วงต่อเนื่องแล้วถ่วงน้ำหนัก ขนาดกลางจะออกบ่อยกว่าใหญ่เสมอ
           เพราะความหนาแน่นมันไล่ลงเป็นเส้น — ต้องแยกชั้นแล้วให้น้ำหนักเองถึงคุมได้ */
        var TIERS = [
            { w: [20, 28], odds: 6 },    /* เล็ก */
            { w: [38, 50], odds: 1 },    /* กลาง */
            { w: [58, 70], odds: 1 }     /* ใหญ่ */
        ];

        /* สีที่ดีไซน์ใช้จริงในเลเยอร์ตัวอย่าง (เหมือนกันทั้งสามชุด) */
        var COLORS = ['#95C1FB', '#C8A6F7', '#71EAF3', '#F8A9D6', '#9C55FF'];

        /* ทรงดาวจากคลัง images/figma/outer — เต็มสี 1 แบบ - แบบเส้น 3 แบบ */
        var SHAPES = [
            { w: 72, h: 113, solid: true, d: 'M36 0C36 0 38.2449 31.7844 46.3562 44.5145C54.4674 57.2447 72 56.5 72 56.5C72 56.5 54.4674 55.7553 46.3562 68.4855C38.2449 81.2156 36 113 36 113C36 113 33.7551 81.2156 25.6438 68.4855C17.5326 55.7553 0 56.5 0 56.5C0 56.5 17.5326 57.2447 25.6438 44.5145C33.7551 31.7844 36 0 36 0Z' },
            { w: 52, h: 79, solid: false, d: 'M26 2C26 2 27.4966 23.0959 32.9041 31.545C38.3116 39.9942 50 39.5 50 39.5C50 39.5 38.3116 39.0058 32.9041 47.4549C27.4966 55.9041 26 77 26 77C26 77 24.5034 55.9041 19.0959 47.4549C13.6884 39.0058 2 39.5 2 39.5C2 39.5 13.6884 39.9942 19.0959 31.545C24.5034 23.0959 26 2 26 2Z' },
            { w: 40, h: 60, solid: false, d: 'M20 2C20 2 21.1225 17.7516 25.1781 24.0603C29.2337 30.369 38 30 38 30C38 30 29.2337 29.631 25.1781 35.9397C21.1225 42.2484 20 58 20 58C20 58 18.8775 42.2484 14.8219 35.9397C10.7663 29.631 2 30 2 30C2 30 10.7663 30.369 14.8219 24.0603C18.8775 17.7516 20 2 20 2Z' },
            { w: 76, h: 117, solid: false, d: 'M38 2C38 2 40.2449 33.7844 48.3562 46.5145C56.4674 59.2447 74 58.5 74 58.5C74 58.5 56.4674 57.7553 48.3562 70.4855C40.2449 83.2156 38 115 38 115C38 115 35.7551 83.2156 27.6438 70.4855C19.5326 57.7553 2 58.5 2 58.5C2 58.5 19.5326 59.2447 27.6438 46.5145C35.7551 33.7844 38 2 38 2Z' }
        ];
        var SOLID = SHAPES.filter(function (v) { return v.solid; });
        var LINE = SHAPES.filter(function (v) { return !v.solid; });

        var seed = SEED;
        function rnd() {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed / 0x7fffffff;
        }
        function span(a, b) { return a + rnd() * (b - a); }
        function pick(a) { return a[Math.floor(rnd() * a.length)]; }

        function tierOf() {
            var total = 0, i;
            for (i = 0; i < TIERS.length; i++) total += TIERS[i].odds;
            var r = rnd() * total;
            for (i = 0; i < TIERS.length; i++) {
                r -= TIERS[i].odds;
                if (r <= 0) return TIERS[i];
            }
            return TIERS[0];
        }

        /* --fit เปลี่ยนเฉพาะตอนย่อ/ขยายหน้าต่าง อ่านเก็บไว้พอ
           ถ้าอ่านทุกรอบจะไปบังคับให้เบราว์เซอร์คำนวณสไตล์ใหม่ฟรีๆ */
        var fit = 1;
        function readFit() {
            fit = parseFloat(getComputedStyle(document.documentElement)
                .getPropertyValue('--fit')) || 1;
        }
        readFit();
        window.addEventListener('resize', readFit);

        var NS = 'http://www.w3.org/2000/svg';

        function spot(z) {
            /* สุ่มจุดใหม่ ถ้าใกล้ดวงอื่นในโซนเดียวกันเกินไปก็สุ่มใหม่ ลองไม่เกิน 14 ครั้ง */
            var x, y;
            for (var t = 0; t < 14; t++) {
                x = span(z.area[0], z.area[2]);
                y = span(z.area[1], z.area[3]);
                var ok = true;
                for (var j = 0; j < z.live.length; j++) {
                    var dx = z.live[j][0] - x, dy = z.live[j][1] - y;
                    if (dx * dx + dy * dy < FAR * FAR) { ok = false; break; }
                }
                if (ok) break;
            }
            return [x, y];
        }

        /* ⭐ สร้างดาวไว้ล่วงหน้าเท่าเพดานของโซน แล้วหมุนเวียนใช้ ห้ามสร้างใหม่-ลบทิ้ง
           ของเดิมสร้าง <svg> ใหม่ทุกครั้งที่ดาวเกิดและลบทิ้งทุกครั้งที่ดับ
           ทุกครั้งที่ DOM เปลี่ยน เบราว์เซอร์ต้องคิดโครงชั้นใหม่ทั้งหน้า (Layerize)
           วัดด้วยโปรไฟล์เลอร์บนเครื่องเจ้าของงาน: Layerize กิน 28.4% เป็นอันดับหนึ่ง
           หมุนเวียนใช้แล้วโครง DOM นิ่งสนิท เหลือแค่เปลี่ยนค่าในชิ้นเดิม
           ⚠ หน้าตาไม่เปลี่ยนเลย ดาวยังเกิด-ดับ-สุ่มตำแหน่งแบบเดิมทุกอย่าง */
        function makePool(z) {
            z.pool = [];
            for (var i = 0; i < z.max; i++) {
                var svg = document.createElementNS(NS, 'svg');
                svg.setAttribute('class', 'bgstar');
                var path = document.createElementNS(NS, 'path');
                svg.appendChild(path);
                z.el.appendChild(svg);
                z.pool.push({ svg: svg, path: path, busy: false, at: null });
            }
        }

        function freeOne(z) {
            for (var i = 0; i < z.pool.length; i++) {
                if (!z.pool[i].busy) return z.pool[i];
            }
            return null;
        }

        function spawn(z) {
            var slot = freeOne(z);
            if (!slot) return;

            var sh = rnd() < LINE_ODDS ? pick(LINE) : pick(SOLID);
            var col = pick(COLORS);
            var t = tierOf();
            var w = span(t.w[0], t.w[1]);
            var h = w * sh.h / sh.w;
            var at = spot(z);

            var svg = slot.svg, path = slot.path;
            svg.setAttribute('viewBox', '0 0 ' + sh.w + ' ' + sh.h);
            svg.style.left = (at[0] - w / 2).toFixed(1) + 'px';
            svg.style.top = (at[1] - h / 2).toFixed(1) + 'px';
            svg.style.width = w.toFixed(1) + 'px';
            svg.style.height = h.toFixed(1) + 'px';

            path.setAttribute('d', sh.d);
            if (sh.solid) {
                path.setAttribute('fill', col);
                path.removeAttribute('stroke');
                path.removeAttribute('stroke-width');
            } else {
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', col);
                path.setAttribute('stroke-width', '4');
                path.setAttribute('stroke-linejoin', 'round');
            }

            /* ถอดคลาสแล้วบังคับให้คิดใหม่ก่อนใส่กลับ ไม่งั้นดวงที่วนกลับมาใช้จะไม่เล่นท่าเกิดซ้ำ */
            svg.classList.remove('is-in', 'is-out');
            void svg.getBoundingClientRect();
            svg.classList.add('is-in');

            slot.busy = true;
            slot.at = at;
            z.live.push(at);

            setTimeout(function () {
                svg.classList.remove('is-in');
                svg.classList.add('is-out');
                setTimeout(function () {
                    slot.busy = false;
                    var i = z.live.indexOf(at);
                    if (i >= 0) z.live.splice(i, 1);
                }, OUT);
            }, IN + span(LIFE[0], LIFE[1]));
        }

        /* โซนที่เลื่อนพ้นจอไปแล้วหยุดปล่อยดาว — ดวงที่ค้างอยู่ปล่อยให้หมดอายุเอง
           ไม่งั้นทั้งหน้ามีดาววิ่งอยู่ 17 ดวงตลอดเวลาทั้งที่มองเห็นทีละโซน */
        function onScreen(z) {
            var top = z.area[1] * fit, bot = z.area[3] * fit;
            return bot > window.scrollY - EDGE &&
                top < window.scrollY + window.innerHeight + EDGE;
        }

        /* ปล่อยเป็นสายพาน ไม่ใช่ล็อกช่องแล้วรอช่องว่าง
           แต่ละดวงเกิดเมื่อไหร่ ดับเมื่อไหร่ เป็นเรื่องของมันเอง ไม่ผูกกับใคร
           จำนวนที่เห็นเลยแกว่งอยู่ใต้เพดานของโซนนั้น = ระยิบระยับต่อเนื่อง
           ไม่ใช่หายไปทั้งชุดแล้วโผล่มาทั้งชุด */
        ZONES.forEach(function (z) {
            z.el = document.getElementById(z.box);
            if (!z.el) return;
            z.live = [];
            /* ⭐ โซนสินค้าอยู่ครึ่งล่างของหน้า สร้างดาวรอไว้ตั้งแต่เปิดหน้าก็เปล่าประโยชน์
               (11 ดวงที่ไม่มีใครเห็นแต่เบราว์เซอร์ต้องคิดโครงชั้นให้ทุกเฟรม)
               สร้างตอนโซนนั้นโผล่เข้าจอครั้งแรกพอ — โซน hero สร้างทันทีเพราะเห็นตั้งแต่แรก */
            if (z.box === 'pcHeroStars') makePool(z);
            (function tick() {
                if (onScreen(z)) {
                    if (!z.pool) makePool(z);
                    if (z.live.length < z.max) spawn(z);
                }
                setTimeout(tick, span(EVERY[0], EVERY[1]));
            }());
        });
    }());

    /* ============================================================
       ส่วนที่ 14 — ดาวตก ระบบสุ่ม (animation-list ข้อ 1.2)

       ต้นแบบถอดมาจาก 24_animate-star-drop.svg ซึ่งดีไซน์วาดตัวอย่างไว้ 2 ดวง
       ดวงนึง = หัวดาว (แบบเส้น fill #EFF6FF stroke #0E00A8) + หางเป็นเส้นไล่สี
       หางไล่จากใสตรงหัว → สว่างสุดที่ 16.8% → ใสอีกทีตรงปลาย

       ⭐ ทิศเคลื่อนที่ได้จากองศาของหางโดยตรง
         หางเอียง -38.00° (ทั้งสองดวงในไฟล์เท่ากันเป๊ะ)
         หางอยู่ "ข้างหลัง" ดาวเสมอ → ดาวจึงพุ่งไปทางตรงข้าม +142.00°
         เวกเตอร์ทิศ (-0.7880, 0.6157) = ลงซ้าย

       ต่างจากดาวประดับตรง: น้อยกว่า (2 ดวง) · ผ่านไปเร็ว · ไม่จอดนิ่ง
       ============================================================ */
    (function shootStar() {

        var box = document.getElementById('pcStarDrop');
        if (!box) return;

        var MAX = 2;                     /* เห็นพร้อมกันได้มากสุดกี่ดวง */
        var EVERY = [1900, 5400];        /* เว้นกี่ ms ค่อยปล่อยดวงถัดไป */
        var AREA = [360, 60, 1180, 700]; /* จุดที่ดาวเริ่มพุ่ง (x0 y0 x1 y1) */
        var SIZE = [0.58, 1.05];         /* ย่อ-ขยายจากต้นแบบ */
        var FAR = [300, 620];            /* พุ่งไปไกลกี่ px ก่อนหายไป */
        var FLY = [620, 1250];           /* ใช้เวลาพุ่งกี่ ms — เร็วแบบดาวตกจริง */

        /* ทิศพุ่ง = ตรงข้ามกับองศาของหาง */
        var UX = -0.788, UY = 0.6157;

        /* สีสว่างกลางหาง — ในไฟล์ตัวอย่างใช้ #C8A6F7 กับ #71EAF3
           เพิ่มอีกสองสีจากพาเลตโฮโลชุดเดียวกันให้หลากหลายขึ้น */
        var ACCENT = ['#C8A6F7', '#71EAF3', '#F8A9D6', '#9DF3C9'];

        var VB = '0 0 132.96 122.84';
        var LN = [24.87, 85.94, 126.16, 6.8];        /* หาง: x1 y1 x2 y2 (พิกัดในกล่องเอง) */
        var SW = 13.6027;           /* ความหนาหาง */
        var HEAD = 'M29.06 46.17C29.06 46.17 30.45 65.82 35.46 73.69C40.48 81.56 51.32 81.1 51.32 81.1C51.32 81.1 40.48 80.64 35.46 88.51C30.45 96.38 29.06 116.04 29.06 116.04C29.06 116.04 27.67 96.38 22.66 88.51C17.64 80.64 6.8 81.1 6.8 81.1C6.8 81.1 17.64 81.56 22.66 73.69C27.67 65.82 29.06 46.17 29.06 46.17Z';
        var W = 132.96, H = 122.84;
        /* จุดเริ่ม-จบของไล่สี (เยื้องจากเส้นหางนิดหน่อยตามไฟล์ต้นฉบับ) */
        var G = [29.36, 91.7, 130.65, 12.56];

        var seed = 77012026;
        function rnd() {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed / 0x7fffffff;
        }
        function span(a, b) { return a + rnd() * (b - a); }
        function pick(a) { return a[Math.floor(rnd() * a.length)]; }

        var NS = 'http://www.w3.org/2000/svg';

        /* ⭐ สร้างไว้ล่วงหน้าเท่าเพดาน แล้วหมุนเวียนใช้ ห้ามสร้างใหม่-ลบทิ้ง
           ทุกครั้งที่ DOM เปลี่ยน เบราว์เซอร์ต้องคิดโครงชั้นใหม่ทั้งหน้า (Layerize)
           ดวงหนึ่งมี 6 element (svg + defs + gradient + 3 stop + line + path)
           สร้าง-ลบทุกครั้งที่ยิงจึงแพงกว่าที่เห็น — หมุนเวียนใช้แล้วโครง DOM นิ่งสนิท
           ⚠ หน้าตาไม่เปลี่ยน ยังสุ่มสีหาง ขนาด ตำแหน่ง ระยะ ความเร็ว เหมือนเดิมทุกดวง */
        var pool = [];

        function build(n) {
            var svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', VB);
            svg.setAttribute('class', 'shootstar');

            var defs = document.createElementNS(NS, 'defs');
            var grad = document.createElementNS(NS, 'linearGradient');
            grad.setAttribute('id', 'shoot' + n);
            grad.setAttribute('gradientUnits', 'userSpaceOnUse');
            grad.setAttribute('x1', G[0]); grad.setAttribute('y1', G[1]);
            grad.setAttribute('x2', G[2]); grad.setAttribute('y2', G[3]);
            var stops = [];
            [['0', '#95C1FB', '0'], ['0.168269', ACCENT[0], '1'], ['1', '#FBFDFF', '0']]
                .forEach(function (v) {
                    var st = document.createElementNS(NS, 'stop');
                    st.setAttribute('offset', v[0]);
                    st.setAttribute('stop-color', v[1]);
                    st.setAttribute('stop-opacity', v[2]);
                    grad.appendChild(st);
                    stops.push(st);
                });
            defs.appendChild(grad);
            svg.appendChild(defs);

            var ln = document.createElementNS(NS, 'line');
            ln.setAttribute('x1', LN[0]); ln.setAttribute('y1', LN[1]);
            ln.setAttribute('x2', LN[2]); ln.setAttribute('y2', LN[3]);
            ln.setAttribute('stroke', 'url(#shoot' + n + ')');
            ln.setAttribute('stroke-width', SW);
            svg.appendChild(ln);

            var head = document.createElementNS(NS, 'path');
            head.setAttribute('d', HEAD);
            head.setAttribute('fill', '#EFF6FF');
            head.setAttribute('stroke', '#0E00A8');
            head.setAttribute('stroke-width', '2.47322');
            head.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(head);

            box.appendChild(svg);
            var slot = { svg: svg, mid: stops[1], busy: false };
            svg.addEventListener('animationend', function () { slot.busy = false; });
            return slot;
        }

        for (var i = 0; i < MAX; i++) pool.push(build(i));

        function spawn() {
            var slot = null;
            for (var i = 0; i < pool.length; i++) {
                if (!pool[i].busy) { slot = pool[i]; break; }
            }
            if (!slot) return;

            var k = span(SIZE[0], SIZE[1]);
            var w = W * k, h = H * k;
            var far = span(FAR[0], FAR[1]);
            var svg = slot.svg;

            svg.style.left = (span(AREA[0], AREA[2]) - w / 2).toFixed(1) + 'px';
            svg.style.top = (span(AREA[1], AREA[3]) - h / 2).toFixed(1) + 'px';
            svg.style.width = w.toFixed(1) + 'px';
            svg.style.height = h.toFixed(1) + 'px';
            svg.style.setProperty('--dx', (UX * far).toFixed(1) + 'px');
            svg.style.setProperty('--dy', (UY * far).toFixed(1) + 'px');
            svg.style.animationDuration = span(FLY[0], FLY[1]).toFixed(0) + 'ms';
            slot.mid.setAttribute('stop-color', pick(ACCENT));

            /* บังคับให้เริ่มรอบใหม่ ไม่งั้นดวงที่วนกลับมาใช้จะไม่บินซ้ำ */
            svg.style.animationName = 'none';
            void svg.getBoundingClientRect();
            svg.style.animationName = '';

            slot.busy = true;
        }

        (function tick() {
            spawn();
            setTimeout(tick, span(EVERY[0], EVERY[1]));
        }());
    }());

    /* ============================================================
       ส่วนที่ 15 — เปลี่ยนรูปในการ์ดขวาแบบครอสเฟด (animation-list ข้อ 3.3)

       ไฟล์การ์ด (parts/card/frame-c · frame-d) มีชั้นรูปซ้อนกัน 2 ชั้นทับกันสนิทอยู่แล้ว
       ที่นี่ทำแค่ 3 จังหวะ: ยัดรูปใหม่ลงชั้นบน → ให้มันจางเข้ามาทับ →
       พอทึบแล้วยัดรูปเดียวกันลงชั้นล่างแล้วตัดชั้นบนกลับไปโปร่ง (พร้อมรับรูปถัดไป)
       ท่าจางทั้งหมดอยู่ใน figma-anim.css ส่วนที่ 12

       ⭐ สลับทีละใบสลับกันไป ไม่เปลี่ยนพร้อมกัน
         การ์ดสองใบอยู่ติดกัน ถ้าเปลี่ยนพร้อมกันมุมขวาทั้งมุมจะกระพริบเป็นก้อนเดียว
       ============================================================ */
    (function cardPhotos() {

        /* ตั้งค่าลดการเคลื่อนไหว = ไม่ต้องวนรูป ค้างรูปที่ Figma วางไว้ */
        if (REDUCE) return;

        var XLINK = 'http://www.w3.org/1999/xlink';

        /* คลังรูปชุดเดียวกับสำรับซ้าย (ส่วนที่ 10) — ไฟล์ที่ figma-webimg.py ย่อไว้แล้ว
           เริ่มที่รูปอื่นก่อน เพราะทั้งสองใบตั้งต้นด้วย e16c... ที่ Figma ฝังมา */
        var PHOTOS = [
            'images/figma/main-web/web/a78dbcb21fdd.webp',
            'images/figma/main-web/web/c508a2308f73.webp',
            'images/figma/main-web/web/86e7a1779d30.webp',
            'images/figma/main-web/web/e74e939d386a.webp',
            'images/figma/main-web/web/e16c04262b23.webp'
        ];

        var FADE = 900;       /* ต้องเท่ากับ --ph-time ใน CSS */
        var EVERY = 3900;     /* เว้นกี่ ms ค่อยสลับใบถัดไป = ใบเดิมเปลี่ยนทุก ~7.8 วิ */

        var cards = [];
        ['pcCardC', 'pcCardD'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            var a = el.querySelector('.card-photo--a');
            var b = el.querySelector('.card-photo--b');
            if (a && b) cards.push({ el: el, a: a, b: b });
        });
        if (!cards.length) return;

        /* โหลดไว้ล่วงหน้า ไม่งั้นรูปแรกของแต่ละใบจะจางเข้ามาแบบยังโหลดไม่เสร็จ */
        PHOTOS.forEach(function (src) { new Image().src = src; });

        function put(im, src) { im.setAttributeNS(XLINK, 'href', src); }

        var next = 0, turn = 0;

        function swap(c) {
            var src = PHOTOS[next];
            next = (next + 1) % PHOTOS.length;

            put(c.b, src);
            c.el.classList.add('is-swap');

            setTimeout(function () {
                /* ตอนนี้ชั้นบนทึบสนิท เปลี่ยนรูปชั้นล่างได้โดยไม่มีใครเห็น */
                put(c.a, src);
                /* เผื่อเวลาให้ชั้นล่างวาดเสร็จก่อนค่อยตัดชั้นบนทิ้ง
                   ถ้าตัดในเฟรมเดียวกันเลย เสี่ยงเห็นกรอบการ์ดว่างหนึ่งเฟรม */
                setTimeout(function () {
                    c.el.classList.add('is-cut');
                    c.el.classList.remove('is-swap');
                    void c.el.offsetWidth;   /* บังคับให้คิดค่าใหม่ทันที ก่อนคืน transition */
                    c.el.classList.remove('is-cut');
                }, 80);
            }, FADE);
        }

        setInterval(function () {
            /* ไม่ต้องทำงานตอนไม่มีใครดู — .is-live คือ hero ยังอยู่บนจอ (ส่วนที่ 9) */
            if (document.hidden || !stage.classList.contains('is-live')) return;
            swap(cards[turn]);
            turn = (turn + 1) % cards.length;
        }, EVERY);
    }());

    /* ============================================================
       ส่วนที่ 16 — เมฆใหญ่เลื่อนสวนตอนสกรอลล์ (animation-list ข้อ 1.5)

       เลื่อนหน้าลง เมฆขึ้นสวนช้าๆ — ท่ามาตรฐานของเว็บหน้ายาว
       ตัวลอยขึ้น-ลงเองเป็นคีย์เฟรมใน figma-anim.css ส่วนที่ 16 (คนละช่องกัน)

       ⭐ ไม่เขียนค่าลง translate ตรงๆ ตามสกรอลล์ แต่ให้ "ไล่ตาม" ทีละเฟรม
         สกรอลล์ของเมาส์วีลมาเป็นก้อนๆ (ทีละ 100+ px) ถ้าผูกค่าตรงๆ
         เมฆจะกระโดดตามเป็นขั้นบันไดเห็นชัด เพราะมันขยับน้อยกว่าหน้าอยู่แล้ว
         ไล่ตามแบบหน่วงจะได้เส้นเรียบต่อเนื่อง = ความรู้สึก "ลอย" ที่เว็บหน้ายาวใช้กัน

       ⭐ ต้องหารด้วย --fit ก่อนเขียน
         ค่าที่เขียนลงไปเป็นพิกัดในเฟรม Figma ซึ่งถูกย่อทั้งผืนอีกทีตอนแสดงผล
         ถ้าไม่หาร จอเล็กจะสวนน้อยกว่าจอใหญ่ทั้งที่เลื่อนเท่ากัน
       ============================================================ */
    (function cloudScroll() {

        if (REDUCE) return;

        var el = document.getElementById('pcCloud1');
        if (!el) return;

        var SPEED = 0.18;    /* เลื่อนหน้าลง 100px → เมฆขึ้นสวน 18px (วัดบนจอจริง) */
        var EASE = 0.1;      /* ไล่ตามเร็วแค่ไหนต่อเฟรม — ยิ่งน้อยยิ่งหน่วงยิ่งลอย */

        var fit = 1;
        function readFit() {
            fit = parseFloat(getComputedStyle(document.documentElement)
                .getPropertyValue('--fit')) || 1;
        }
        readFit();
        window.addEventListener('resize', readFit);

        function target() { return -window.scrollY * SPEED / fit; }

        var now = target(), want = now, running = false;
        el.style.translate = '0 ' + now.toFixed(1) + 'px';

        function frame() {
            now += (want - now) * EASE;
            el.style.translate = '0 ' + now.toFixed(1) + 'px';
            if (Math.abs(want - now) > 0.05) {
                requestAnimationFrame(frame);
            } else {
                running = false;
            }
        }

        window.addEventListener('scroll', function () {
            /* เลื่อนพ้น hero ไปแล้วไม่ต้องคิดต่อ — .is-live คือ hero ยังอยู่บนจอ (ส่วนที่ 9)
               ค่าค้างไว้เท่าเดิม พอเลื่อนกลับขึ้นมาก็ไล่ตามให้ทันเอง */
            if (!stage.classList.contains('is-live')) return;
            want = target();
            if (!running) {
                running = true;
                requestAnimationFrame(frame);
            }
        }, { passive: true });
    }());

    /* ============================================================
       ส่วนที่ 19 — ตราประทับ (animation-list ข้อ 4)

       ⭐ แยกเป็น 3 ท่า ไม่ใช่คลิปเดียวรวด เพราะ "ตอนกดปุ่มยังไม่รู้ผล"
         script.js ต้องยิงไป Google Sheets แล้วอ่านกลับมายืนยันก่อน ใช้เวลาไม่แน่นอน
         ถ้าเล่นเป็นคลิปเดียวจบ ตราจะประทับไปแล้วตั้งแต่ยังไม่รู้ว่าบันทึกผ่านไหม

           วางเมาส์ที่ปุ่ม (ต้องกรอกครบก่อน)  → ยกขึ้นลอยค้างเหนือรอยตรา
           เอาเมาส์ออก                        → กลับไปตลับหมึก (ยังไม่กดลง)
           กดปุ่ม                             → กดลง แล้วค้างไว้ = จังหวะรอผล
           สำเร็จ                             → รอยตราโผล่ + ยกขึ้น → กลับตลับหมึก
           ไม่สำเร็จ                          → ยกขึ้นกลับตลับหมึกเฉยๆ ไม่มีรอยตรา

       ท่าทางทั้งหมดอยู่ใน figma-anim.css ส่วนที่ 19 ที่นี่ทำแค่สลับคลาสกับวัดระยะ
       ============================================================ */
    (function stampSeal() {

        var stick = document.getElementById('pcStampStick');
        var seal = document.getElementById('pcSeal');
        var btn = document.getElementById('submitBtn');
        if (!stick || !seal || !btn) return;

        /* กึ่งกลางวงกลมใหญ่สุดของด้ามตรา = ฐานตราที่แตะกระดาษ (Ellipse 14 · r 77.6)
           ขนาดพอดีกับรอยตราที่มันทิ้งไว้ (รอยตรา r 71.9) = ฐานนี้แหละคือหน้าที่ประทับ
           วงเล็กที่มีหน้าแมว (r 39.9) คือ "ลูกจับ" ที่อยู่บนด้าม ไม่ใช่หน้าที่แตะกระดาษ

           ⭐ ผลพลอยได้: transform-origin ใน CSS ตั้งเป็นจุดเดียวกันนี้
             จุดนี้จึงไม่ขยับเลยตอน scale/rotate = ท่าลอยรอกับท่ากดตรงจุดเดียวกันเป๊ะ */
        var ANCHOR = [1831.67, 798.67];
        /* กึ่งกลางรอยตรา — วัดจาก outline/Group-23.svg ด้วย getBBox จริง */
        var TARGET = [1561.05, 661.23];

        var TRAVEL = 550;    /* ต้องเท่ากับ transition ของ .is-ready ใน CSS */
        var PRESS = 130;     /* ต้องเท่ากับ transition ของ .is-press */
        var GUARD = 1200;    /* กดแล้วปุ่มไม่ถูกล็อกภายในเท่านี้ = ฟอร์มไม่ผ่านด่านตรวจ */

        /* จุดในพิกัดเฟรม → จุดจริงหลังผ่าน transform ของชิ้นนั้น (ชดเชย transform-origin ด้วย)
           ไม่รวมช่อง translate/rotate/scale ซึ่งเป็นของอนิเมชัน เอาเฉพาะตำแหน่งฐานของซีน */
        function place(el, pt) {
            var cs = getComputedStyle(el);
            var t = cs.transform;
            if (!t || t === 'none') return pt.slice();
            var m = new DOMMatrix(t);
            var o = cs.transformOrigin.split(' ').map(parseFloat);
            /* ⚠ transform-origin นับจากมุมกล่องของชิ้นนั้น ไม่ใช่มุมเฟรม
               ชิ้นที่ถูกครอปแล้วกล่องไม่ได้อยู่ที่ 0,0 จึงต้องบวกมุมกล่องกลับเข้าไป
               ให้อยู่ระบบพิกัดเดียวกับจุดที่ส่งเข้ามา (offsetLeft/Top วัดจาก .stage) */
            var ox = (o[0] || 0) + el.offsetLeft, oy = (o[1] || 0) + el.offsetTop;
            var v = m.transformPoint(new DOMPoint(pt[0] - ox, pt[1] - oy));
            return [v.x + ox, v.y + oy];
        }

        function measure() {
            var a = place(stick, ANCHOR), t = place(seal, TARGET);
            stick.style.setProperty('--st-x', (t[0] - a[0]).toFixed(2) + 'px');
            stick.style.setProperty('--st-y', (t[1] - a[1]).toFixed(2) + 'px');
        }

        /* "กรอกครบ" = เงื่อนไขเดียวกับด่านตรวจของ script.js
           ถ้ายังไม่ครบ ด้ามตราจะไม่ยกขึ้นเลย = เป็นสัญญาณบอกในตัวว่ายังกดไม่ได้ */
        function ready() {
            var n = document.getElementById('regName');
            var e = document.getElementById('regEmail');
            var c = document.getElementById('confirmEmail');
            var picked = document.querySelectorAll(
                '#productSelectList input[type="checkbox"]:checked').length;
            return !!(n && n.value.trim() && e && e.value.trim() && picked && c && c.checked);
        }

        var busy = false;    /* กดแล้วกำลังรอผล — ห้ามให้เมาส์เข้า-ออกมายุ่งช่วงนี้ */
        var won = false;     /* รอบนี้สำเร็จแล้วหรือยัง */
        var guard = 0;

        function lift() {
            if (busy || REDUCE || !ready()) return;
            /* ⭐ ประทับไปแล้ว = จบงาน ห้ามยกมารออีก (เจ้าของงานสั่ง 2026-08-21)
               รอยตราบนกระดาษคือหลักฐานว่าลงชื่อเรียบร้อย ถ้ายังลอยมาจ่อทุกครั้งที่
               เอาเมาส์วางปุ่ม จะดูเหมือนระบบยังรอให้ปั๊มอยู่ ทั้งที่ปั๊มไปแล้ว
               เงื่อนไขผูกกับ "มีรอยตราอยู่บนฟอร์มไหม" ตรงๆ ถ้ารอยตราหายไปก็กลับมาลอยได้เหมือนเดิม */
            if (seal.classList.contains('is-stamped')) return;
            measure();
            stick.classList.add('is-ready');
        }

        function home() {
            if (busy) return;
            stick.classList.remove('is-ready');
        }

        btn.addEventListener('pointerenter', lift);
        btn.addEventListener('pointerleave', home);
        btn.addEventListener('focus', lift);
        btn.addEventListener('blur', home);

        function release(ok) {
            clearTimeout(guard);
            if (ok) seal.classList.add('is-stamped');
            stick.classList.remove('is-press');
            setTimeout(function () {
                busy = false;
                stage.classList.remove('is-stamping');
                /* สำเร็จแล้ว = จบงาน กลับตลับหมึกเสมอ ถึงเมาส์จะยังค้างอยู่บนปุ่มก็ตาม
                   (ถ้ายังลอยค้างอยู่จะดูเหมือนระบบยังรออะไรอยู่ ทั้งที่ประทับเสร็จแล้ว)
                   ส่วนกรณีไม่สำเร็จ เมาส์ยังอยู่บนปุ่มก็ลอยรอต่อ เพราะเดี๋ยวเขาต้องกดใหม่ */
                if (ok || !btn.matches(':hover')) stick.classList.remove('is-ready');
            }, ok ? TRAVEL * 0.8 : PRESS + 120);
        }

        function press() {
            busy = true;
            won = false;
            stage.classList.add('is-stamping');   /* บอกส่วนที่ 21 ให้ล็อกฟอร์มให้ตรงไว้ */
            measure();
            if (stick.classList.contains('is-ready')) {
                stick.classList.add('is-press');
            } else {
                /* เข้ามาทางคีย์บอร์ด/จอสัมผัส ยังไม่ได้ยกขึ้น — ยกก่อนแล้วค่อยกด */
                stick.classList.add('is-ready');
                setTimeout(function () { stick.classList.add('is-press'); }, TRAVEL * 0.75);
            }
            clearTimeout(guard);
            /* ปุ่มถูกล็อก = ด่านตรวจผ่านแล้วกำลังส่งจริง ถ้าไม่ถูกล็อกแปลว่าไม่ผ่าน ให้ยกกลับ */
            guard = setTimeout(function () {
                if (busy && !btn.disabled && !won) release(false);
            }, GUARD);
        }

        btn.addEventListener('click', function () {
            if (REDUCE || busy || !ready()) return;
            press();
        });

        /* ไม่แตะ script.js เลย — ดูจากกล่อง "สำเร็จ" ที่ script.js เป็นคนเปิดเอง */
        var okBox = document.getElementById('formSuccess');
        if (okBox && window.MutationObserver) {
            new MutationObserver(function () {
                if (!okBox.style.display || okBox.style.display === 'none') return;

                /* ⭐ กล่อง "ลงชื่อสำเร็จ! / ฝากแทคอีกรายการ" เป็นของธีมเก่าก่อนรื้อเป็น Figma
                   ดีไซน์ Figma ไม่มีสถานะหน้านี้ — คำยืนยันคือรอยตรากับ toast
                   ปิดทิ้งแล้วคืนกระดาษฟอร์มกลับมา ไม่งั้นกระดาษจะกลายเป็นหน้าอื่นไปเลย */
                okBox.style.display = 'none';
                var f = document.getElementById('registerForm');
                if (f) f.style.display = '';

                won = true;
                if (REDUCE) { seal.classList.add('is-stamped'); return; }
                release(true);
            }).observe(okBox, { attributes: true, attributeFilter: ['style'] });
        }

        /* ปุ่มถูกปลดล็อกแล้วแต่ยังไม่มีสัญญาณสำเร็จ = ส่งไม่ผ่าน ให้ยกกลับโดยไม่ประทับ */
        if (window.MutationObserver) {
            new MutationObserver(function () {
                if (btn.disabled) return;
                if (busy && !won) release(false);
            }).observe(btn, { attributes: true, attributeFilter: ['disabled'] });
        }

        /* เรียกมือได้จาก console ตอนเทส — เล่นครบรอบให้ดูโดยไม่ต้องรอเซิร์ฟเวอร์ */
        window.mofychStamp = function () {
            seal.classList.remove('is-stamped');
            stick.classList.remove('is-press');
            stick.classList.remove('is-ready');
            busy = false;
            measure();
            stick.classList.add('is-ready');
            setTimeout(function () {
                busy = true;
                stick.classList.add('is-press');
                setTimeout(function () { won = true; release(true); }, 900);
            }, TRAVEL);
        };
    }());

    /* ============================================================
       ส่วนที่ 20 — hover ของตั๋วสินค้า (animation-list ข้อ 3.5)

       ตัวรับเมาส์กับงานอาร์ตอยู่คนละกิ่งของ DOM (ช่อง SELECT อยู่ใน #productSelectList
       ที่โค้ดเดิมสร้าง · งานอาร์ตอยู่ในเลเยอร์ .tk) CSS เอื้อมข้ามไปหากันไม่ได้
       ที่นี่ทำแค่แปะคลาส ท่าทางทั้งหมดอยู่ใน figma-anim.css ส่วนที่ 20

       ⚠ ผูกฟังบน #productSelectList ตัวแม่ ไม่ผูกทีละรายการ
         เพราะ renderProductSelect() ของโค้ดเดิมสร้างรายการใหม่ได้ทีหลัง ถ้าผูกทีละใบจะหลุด
       ============================================================ */
    (function ticketHover() {

        if (REDUCE) return;

        var list = document.getElementById('productSelectList');
        if (!list) return;

        /* ช่องที่ i ใช้งานอาร์ตสองใบ (ปกติ / เลือกแล้ว) โชว์ทีละใบ แปะคลาสให้ทั้งคู่ */
        function layers(i) {
            return ['tkNormal' + (i + 1), 'tkSelected' + (i + 1)]
                .map(function (id) { return document.getElementById(id); })
                .filter(Boolean);
        }

        function mark(i, cls, on) {
            layers(i).forEach(function (el) { el.classList.toggle(cls, on); });
        }

        function itemOf(el) {
            return el && el.closest ? el.closest('.product-select-item') : null;
        }

        function indexOf(item) {
            return item ? Array.prototype.indexOf.call(list.children, item) : -1;
        }

        list.addEventListener('pointerover', function (ev) {
            var i = indexOf(itemOf(ev.target));
            if (i >= 0) mark(i, 'is-hot', true);
        });

        list.addEventListener('pointerout', function (ev) {
            var item = itemOf(ev.target);
            var i = indexOf(item);
            if (i < 0) return;
            if (ev.relatedTarget && item.contains(ev.relatedTarget)) return;
            mark(i, 'is-hot', false);
        });

        /* กดเลือก = แสงวับกวาดทั้งใบรอบเดียว (ไม่เล่นตอนโฮเวอร์)
           ต้องแปะให้ทั้งสองใบ เพราะจังหวะกดคือจังหวะที่สลับใบพอดี
           ถอดคลาสออกเมื่อจบ จะได้เล่นซ้ำได้ทุกครั้งที่กด */
        list.addEventListener('click', function (ev) {
            var i = indexOf(itemOf(ev.target));
            if (i < 0) return;
            layers(i).forEach(function (el) {
                el.classList.remove('is-flash');
                void el.offsetWidth;          /* บังคับให้เริ่มรอบใหม่ ไม่งั้นกดรัวๆ แล้วไม่เล่นซ้ำ */
                el.classList.add('is-flash');
            });
            setTimeout(function () { mark(i, 'is-flash', false); }, 1000);
        });

        /* ปุ่มดาว "ไปดูสินค้า" — เจ้าของงานสั่งว่าห้ามลามไปทั้งใบ (2026-08-19)
           วางเมาส์ที่ดาวแล้วให้ดาวโตกับหมุนไวขึ้นเท่านั้น ตัวตั๋วไม่ต้องขยับ */
        [0, 1].forEach(function (i) {
            var arrow = document.getElementById('tkArrow' + (i + 1));
            if (!arrow) return;
            arrow.addEventListener('pointerenter', function () { mark(i, 'is-star', true); });
            arrow.addEventListener('pointerleave', function () { mark(i, 'is-star', false); });
        });
    }());

    (function preheat() {

        var mark = document.getElementById('ropeHit');

        /* เบราว์เซอร์ที่ไม่มี IntersectionObserver ก็เปิดค้างไว้ ไม่พัง แค่กินแรมกว่า */
        if (!mark || !window.IntersectionObserver) {
            stage.classList.add('is-live');
            return;
        }

        /* เผื่อขอบ 600px — เตรียมไว้ก่อนที่เชือกจะโผล่เข้ามาในจอจริง
           ถ้ารอให้เห็นเชือกก่อนค่อยเตรียม จะไม่ทันคนที่เลื่อนขึ้นมาแล้วกดเลย */
        new IntersectionObserver(function (es) {
            stage.classList.toggle('is-live', es[0].isIntersecting);
        }, { rootMargin: '600px' }).observe(mark);
    }());

}());
