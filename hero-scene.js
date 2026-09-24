/* ========================================
   MOFYCH — Hero Scene Motion Engine
   อินโทรแบบหนัง + parallax + smooth scroll + เอฟเฟคจิปาถะ
   ไม่พึ่ง library ภายนอก
   ======================================== */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

    document.addEventListener('DOMContentLoaded', function () {
        buildTicker();
        buildPetals();
        startIntro();
        setupParallax();
        setupSmoothScroll();
        setupReveal();
        setupMagneticButtons();
        setupCardTilt();
    });


    /* ============ อินโทร: ปลดล็อกให้ฉากไหลขึ้นมา ============ */
    function startIntro() {
        var hero = document.getElementById('hero');
        if (!hero) return;
        if (reduceMotion) { hero.classList.remove('scene-armed'); return; }
        // รอเฟรมถัดไปให้ browser ทันคำนวณ layout ก่อน แล้วค่อยยิงอนิเมชัน
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                hero.classList.remove('scene-armed');
                hero.classList.add('scene-go');
            });
        });
    }


    /* ============ แถบวิ่งท้าย hero ============ */
    function buildTicker() {
        var track = document.getElementById('tickerTrack');
        if (!track) return;
        var words = [
            'COMMISSION OPEN', 'HANDMADE WITH LOVE', 'MOFYCH STUDIO',
            'CUSTOM ART', 'NYTAN.CHA', 'FIGURE PAINTING'
        ];
        var star = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z"/></svg>';
        var half = words.map(function (w) {
            return '<span class="ticker-item">' + star + w + '</span>';
        }).join('');
        // ใส่สองชุดเพื่อให้วนต่อเนื่องไร้รอยต่อ (keyframe เลื่อน -50%)
        track.innerHTML = half + half;
    }


    /* ============ กลีบดอกไม้ร่วง ============ */
    function buildPetals() {
        var layer = document.getElementById('petalLayer');
        if (!layer || reduceMotion) return;
        var count = isTouch ? 8 : 16;
        var frag = document.createDocumentFragment();
        for (var i = 0; i < count; i++) {
            var p = document.createElement('div');
            p.className = 'petal';
            var size = 7 + Math.random() * 9;
            p.style.left = (Math.random() * 100) + '%';
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.setProperty('--drift', (Math.random() * 160 - 80) + 'px');
            p.style.animationDuration = (9 + Math.random() * 9) + 's';
            p.style.animationDelay = (-Math.random() * 16) + 's';
            p.style.opacity = 0.35 + Math.random() * 0.5;
            frag.appendChild(p);
        }
        layer.appendChild(frag);
    }


    /* ============ Parallax: สกรอลล์ + เมาส์ ============ */
    function setupParallax() {
        var hero = document.getElementById('hero');
        var scenes = [document.getElementById('heroSceneBg'), document.getElementById('heroSceneFg')]
            .filter(Boolean);
        if (!hero || !scenes.length || reduceMotion) return;

        var mxTarget = 0, myTarget = 0, mx = 0, my = 0;
        var running = true;

        if (!isTouch) {
            window.addEventListener('mousemove', function (e) {
                mxTarget = (e.clientX / window.innerWidth - 0.5) * 2;
                myTarget = (e.clientY / window.innerHeight - 0.5) * 2;
            }, { passive: true });
        }

        // หยุดคำนวณเมื่อ hero เลื่อนพ้นจอ
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                running = entries[0].isIntersecting;
            }, { threshold: 0 }).observe(hero);
        }

        function frame() {
            if (running) {
                var h = hero.offsetHeight || window.innerHeight;
                var sp = Math.min(Math.max(window.scrollY / h, 0), 1);
                mx += (mxTarget - mx) * 0.06;
                my += (myTarget - my) * 0.06;
                for (var i = 0; i < scenes.length; i++) {
                    scenes[i].style.setProperty('--sp', sp.toFixed(4));
                    scenes[i].style.setProperty('--mx', mx.toFixed(4));
                    scenes[i].style.setProperty('--my', my.toFixed(4));
                }
            }
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }


    /* ============ Smooth scroll (แบบเดียวกับ Lenis) ============ */
    function setupSmoothScroll() {
        if (reduceMotion || isTouch) return;

        var target = window.scrollY;
        var current = target;
        var active = false;

        function maxScroll() {
            return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        }

        // ปล่อยให้กล่องที่สกรอลล์ได้เองทำงานตามปกติ
        function insideScrollable(el) {
            while (el && el !== document.body && el !== document.documentElement) {
                if (el.hasAttribute && el.hasAttribute('data-native-scroll')) return true;
                var s = getComputedStyle(el);
                if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) return true;
                el = el.parentElement;
            }
            return false;
        }

        window.addEventListener('wheel', function (e) {
            if (e.ctrlKey) return;                       // ปล่อยให้ซูมได้
            if (insideScrollable(e.target)) return;
            e.preventDefault();
            target = Math.min(Math.max(target + e.deltaY, 0), maxScroll());
            active = true;
        }, { passive: false });

        // สกรอลล์จากทางอื่น (คีย์บอร์ด, ลากแถบเลื่อน, ลิงก์ #) → sync กลับ
        // เทียบตำแหน่งแทนการใช้ flag เพราะ scroll event มาไม่ตรงเฟรมกับที่เราสั่ง
        window.addEventListener('scroll', function () {
            if (Math.abs(window.scrollY - current) <= 2) return;   // สกรอลล์ของเราเอง
            target = current = window.scrollY;
            active = false;
        }, { passive: true });

        window.addEventListener('resize', function () {
            target = current = window.scrollY;
        }, { passive: true });

        function frame() {
            if (active) {
                var diff = target - current;
                if (Math.abs(diff) < 0.3) {
                    current = target;
                    active = false;
                } else {
                    current += diff * 0.11;
                }
                window.scrollTo(0, current);
            }
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);

        // ลิงก์ในหน้า: เลื่อนแบบนุ่ม แล้วค่อยคืนคุมให้ smooth scroll
        document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('a[href^="#"]');
            if (!a) return;
            var id = a.getAttribute('href');
            if (!id || id === '#') return;
            var dest = document.querySelector(id);
            if (!dest) return;
            e.preventDefault();
            var nav = document.getElementById('navbar');
            var offset = nav ? nav.offsetHeight + 12 : 0;
            var y = dest.getBoundingClientRect().top + window.scrollY - offset;
            target = current = Math.min(Math.max(y, 0), maxScroll());
            active = false;
            window.scrollTo({ top: target, behavior: 'smooth' });
        });
    }


    /* ============ Scroll reveal ทีละชิ้น ============ */
    function setupReveal() {
        var groups = [
            '.lookup-section .section-header',
            '.lookup-section .form-card',
            '.products-section .section-header',
            '.products-section .products-grid',
            '.footer-content'
        ];
        var targets = [];
        groups.forEach(function (sel) {
            var el = document.querySelector(sel);
            if (el) targets.push(el);
        });
        if (!targets.length) return;

        targets.forEach(function (el, i) {
            el.classList.add('reveal');
            el.style.setProperty('--r-delay', (i % 2) * 0.12 + 's');
        });

        if (reduceMotion || !('IntersectionObserver' in window)) {
            targets.forEach(function (el) { el.classList.add('revealed'); });
            return;
        }
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) {
                    en.target.classList.add('revealed');
                    obs.unobserve(en.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        targets.forEach(function (el) { obs.observe(el); });
    }


    /* ============ ปุ่มดูดเมาส์ (magnetic) ============ */
    function setupMagneticButtons() {
        if (reduceMotion || isTouch) return;
        document.querySelectorAll('.hero .btn').forEach(function (btn) {
            btn.addEventListener('mousemove', function (e) {
                var r = btn.getBoundingClientRect();
                var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
                var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
                btn.style.setProperty('--mag-x', (dx * 7).toFixed(2) + 'px');
                btn.style.setProperty('--mag-y', (dy * 7).toFixed(2) + 'px');
            });
            btn.addEventListener('mouseleave', function () {
                btn.style.setProperty('--mag-x', '0px');
                btn.style.setProperty('--mag-y', '0px');
            });
        });
    }


    /* ============ การ์ดฟอร์มเอียงตามเมาส์ ============ */
    function setupCardTilt() {
        if (reduceMotion || isTouch) return;
        var card = document.querySelector('.hero .form-card');
        if (!card) return;
        card.addEventListener('mousemove', function (e) {
            var r = card.getBoundingClientRect();
            var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
            var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
            card.style.setProperty('--tilt-y', (dx * 5).toFixed(2) + 'deg');
            card.style.setProperty('--tilt-x', (-dy * 5).toFixed(2) + 'deg');
        });
        card.addEventListener('mouseleave', function () {
            card.style.setProperty('--tilt-y', '0deg');
            card.style.setProperty('--tilt-x', '0deg');
        });
    }

})();
