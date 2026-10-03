(function () {
    'use strict';

    /* ผู้เขียนสั่ง 3 ต.ค.  เลื่อนแล้วหยุด เมนูกางเองทุกครั้ง  เลื่อนอีกก็เก็บ หรือคนกดเก็บเอง
       นับเฉพาะการเลื่อนที่คนทำเอง  หลักเดียวกับ figma.js ของหน้าแรก */
    var AUTO_DELAY_MS = 800;
    var INPUT_WINDOW_MS = 1000;
    var dock = null;
    var toggle = null;
    var menu = null;
    var autoTimer = 0;
    var autoOpen = false;
    var userScrolling = false;
    var lastInput = 0;

    function setOpen(open) {
        if (!dock) return;
        dock.classList.toggle('is-open', open);
        if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (menu) menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    function noteInput() { lastInput = Date.now(); }

    function setFit() {
        if (!dock) return;
        var fit = Math.max(0.6, document.documentElement.clientWidth / 1920);
        dock.style.setProperty('--mf-fit', String(fit));
    }

    function markCurrentPage() {
        if (!dock) return;
        var here = { estimate: 1, queue: 3, fabrics: 4 }[document.body.dataset.mfDockPage];
        for (var i = 1; i <= 4; i += 1) {
            var step = document.getElementById('mfDockStep' + i);
            var link = document.getElementById('mfDockLink' + i);
            if (!step || !link) continue;
            if (i === here) {
                step.setAttribute('aria-current', 'page');
                link.setAttribute('aria-current', 'page');
            } else {
                step.removeAttribute('aria-current');
                link.removeAttribute('aria-current');
            }
        }
    }

    function setHover(link, step) {
        link.addEventListener('mouseenter', function () { step.classList.add('is-on'); });
        link.addEventListener('mouseleave', function () { step.classList.remove('is-on'); });
        link.addEventListener('focus', function () { step.classList.add('is-on'); });
        link.addEventListener('blur', function () { step.classList.remove('is-on'); });
    }

    function attach() {
        dock = document.getElementById('mfDock');
        if (!dock) return;
        toggle = document.getElementById('mfDockToggle');
        menu = document.getElementById('mfDockMenu');
        setFit();
        markCurrentPage();

        for (var i = 1; i <= 4; i += 1) {
            var link = document.getElementById('mfDockLink' + i);
            var step = document.getElementById('mfDockStep' + i);
            if (link && step) setHover(link, step);
        }

        toggle.addEventListener('click', function () {
            clearTimeout(autoTimer);
            autoOpen = false;
            setOpen(!dock.classList.contains('is-open'));
        });

        window.addEventListener('resize', setFit, { passive: true });
        window.addEventListener('wheel', noteInput, { passive: true });
        window.addEventListener('touchmove', noteInput, { passive: true });
        window.addEventListener('keydown', function (event) {
            if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].indexOf(event.key) !== -1) noteInput();
        });
        window.addEventListener('scroll', function () {
            if (Date.now() - lastInput < INPUT_WINDOW_MS) userScrolling = true;
            if (autoOpen) { autoOpen = false; setOpen(false); }
            clearTimeout(autoTimer);
            if (!userScrolling) return;
            autoTimer = setTimeout(function () {
                userScrolling = false;
                if (dock.classList.contains('is-open')) return;
                autoOpen = true;
                setOpen(true);
            }, AUTO_DELAY_MS);
        }, { passive: true });
        document.addEventListener('pointerdown', function (event) {
            if (event.target === document.documentElement) noteInput();
            if (dock.contains(event.target) || !dock.classList.contains('is-open')) return;
            clearTimeout(autoTimer);
            autoOpen = false;
            setOpen(false);
        });
        dock.addEventListener('click', function (event) {
            if (event.target.closest('.mf-dock-link')) { autoOpen = false; setOpen(false); }
        });
    }

    fetch('mf-dock.html?v=1', { cache: 'no-cache' })
        .then(function (response) {
            if (!response.ok) throw new Error('mf-dock.html could not be loaded');
            return response.text();
        })
        .then(function (markup) {
            document.body.insertAdjacentHTML('beforeend', markup);
            attach();
        })
        .catch(function (error) {
            console.error(error);
        });
}());
