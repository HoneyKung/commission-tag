(function () {
    'use strict';

    const config = window.MOFYCH_PRICING;
    const form = document.getElementById('customerEstimator');
    if (!config || !form) return;

    const frontWrap = document.getElementById('frontHairChoices');
    const detailWrap = document.getElementById('hairDetailChoices');
    const backWrap = document.getElementById('backHairChoices');
    const patchWrap = document.getElementById('patchworkChoices');

    function esc(value) {
        return String(value).replace(/[&<>'"]/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[char]));
    }

    /* รายการที่เดิมขึ้นว่า "ตรวจแบบ" (เปีย/มวย/ลอน/มัด · ผมยาวจากผ้าทั้งชิ้น · ลายซับซ้อน · ปักนอกใบหน้า)
       ตอนนี้กรอกราคาที่ตกลงกันได้เลย ช่องราคาเป็น "พี่น้อง" ของ input ตัวเลือก ไม่ใช่ลูกของ <label>
       จะได้คลิกพิมพ์ได้โดยตัวเลือกไม่สลับ และโผล่เฉพาะตอนที่ตัวเลือกนั้นถูกเลือก (ดู .choice-price ใน CSS)
       ค่า 0 = ยังไม่ตกลงราคา ให้กลับไปแสดงเป็นช่วงราคาเริ่มต้นเหมือนเดิม */
    function priceFieldMarkup(item, groupName) {
        if (!item.customPrice) return '';
        const min = item.minPrice || 0;
        return `
            <label class="choice-price">
                <span>ราคาที่ตกลง</span>
                <input type="number" data-price-for="${esc(groupName)}-${esc(item.id)}"
                    min="${min}" step="10" value="${min}" aria-label="ราคาสำหรับ ${esc(item.title)}">
            </label>`;
    }

    function renderVisualChoices(items, inputType, groupName) {
        return items.map((item, index) => `
            <div class="pick">
                <input type="${inputType}" name="${groupName}" id="${groupName}-${esc(item.id)}"
                    value="${esc(item.id)}" ${inputType === 'radio' && index === 0 ? 'checked' : ''}>
                <label for="${groupName}-${esc(item.id)}">
                    <img src="${esc(item.image)}" alt="">
                    <strong>${esc(item.title)}</strong>
                    <small>${esc(item.description || item.publicDescription || '')}</small>
                </label>${priceFieldMarkup(item, groupName)}
            </div>`).join('');
    }

    frontWrap.innerHTML = renderVisualChoices(config.frontHair, 'radio', 'frontHair');
    detailWrap.innerHTML = renderVisualChoices(config.hairDetails, 'checkbox', 'hairDetail');
    backWrap.innerHTML = config.backHair.map((item, index) => `
        <div class="opt">
            <input type="radio" name="backHair" id="back-${esc(item.id)}" value="${esc(item.id)}" ${index === 0 ? 'checked' : ''}>
            <label for="back-${esc(item.id)}"><span>${esc(item.title)}</span><em>${item.price ? '+' + item.price : item.customPrice ? 'กรอกราคา' : 'รวมแล้ว'}</em></label>${priceFieldMarkup(item, 'backHair')}
        </div>`).join('');
    patchWrap.innerHTML = config.patchwork.map((item, index) => `
        <div class="opt">
            <input type="radio" name="patchwork" id="patch-${esc(item.id)}" value="${esc(item.id)}" ${index === 0 ? 'checked' : ''}>
            <label for="patch-${esc(item.id)}"><span>${esc(item.title)}</span><em>${item.customPrice ? 'กรอกราคา' : item.price ? '+' + item.price : 'ไม่เพิ่ม'}</em></label>${priceFieldMarkup(item, 'patchwork')}
        </div>`).join('');

    // หน้าเว็บโชว์แค่ราคาบนแถบลอย ลิสต์ "สิ่งที่เลือก"/"ลักษณะของแบบ" ย้ายไปอยู่บนการ์ดอย่างเดียว
    const resultPrice = document.getElementById('resultPrice');
    let latestEstimate = null;

    function byId(items, id) {
        return items.find(item => item.id === id);
    }

    function checkedValue(name) {
        return form.querySelector(`[name="${name}"]:checked`)?.value || '';
    }

    /* อ่านราคาที่กรอกเอง — ต่ำกว่าขั้นต่ำให้ดันขึ้นเป็นขั้นต่ำ (ปักนอกใบหน้าขั้นต่ำ 50)
       คืน 0 เมื่อยังไม่กรอก = ยังไม่ตกลงราคา รายการนั้นจะดันผลไปเป็นช่วง "เริ่ม ..." เหมือนเดิม */
    function customPriceOf(key) {
        const input = form.querySelector(`[data-price-for="${key}"]`);
        if (!input) return 0;
        const value = Math.round(Number(input.value) || 0);
        return value > 0 ? Math.max(Number(input.min) || 0, value) : 0;
    }

    function computeEstimate() {
        const front = byId(config.frontHair, checkedValue('frontHair')) || config.frontHair[0];
        const details = Array.from(form.querySelectorAll('[name="hairDetail"]:checked'))
            .map(input => byId(config.hairDetails, input.value)).filter(Boolean);
        const back = byId(config.backHair, checkedValue('backHair')) || config.backHair[0];
        const patch = byId(config.patchwork, checkedValue('patchwork')) || config.patchwork[0];

        const detailPrice = id => customPriceOf('hairDetail-' + id);
        const backPrice = back.customPrice ? customPriceOf('backHair-' + back.id) : (back.price || 0);
        const patchPrice = patch.customPrice ? customPriceOf('patchwork-' + patch.id) : (patch.price || 0);

        const bundledDetails = details.filter(item => item.bundleEligible);
        const specialDetails = details.filter(item => !item.bundleEligible);
        /* กรอกราคาแล้วถือว่าตกลงกันจบ ไม่ต้องดันผลไปเป็นช่วง "ตรวจแบบ" อีก
           เหลือแต่รายการที่ยังไม่กรอกเท่านั้นที่ยังนับ tier ของตัวเอง */
        const openSpecials = specialDetails.filter(item => !item.customPrice || !detailPrice(item.id));
        const backOpen = Boolean(back.customPrice) && !backPrice;
        const patchOpen = Boolean(patch.customPrice) && !patchPrice;
        let tier = Math.max(front.tier, backOpen ? back.tier : 0, ...openSpecials.map(item => item.tier), 0);

        let exactAdd = backPrice;
        const selections = [front.title];
        const reasons = front.publicDescription ? [front.publicDescription] : [];
        /* การ์ดใบใหม่แบ่งลิสต์เป็นสองฝั่งตามดีไซน์ Frame 3 — ฝั่งผมมีคำอธิบายใต้ชื่อ
           ฝั่งเพิ่มเติมมีราคาต่อแถว และแต่ละฝั่งมียอดรวมของตัวเอง
           hairTotal + extraTotal ต้องเท่ากับ exactAdd เสมอ ตรรกะราคาไม่ได้เปลี่ยน */
        /* คำบรรยายบนการ์ดมีที่แค่บรรทัดเดียว (กว้าง 265 px) จึงมี cardDescription แยกไว้ใน
           pricing-data.js — สั้นกว่า publicDescription ที่ใช้ในลิสต์ "ทำไมราคานี้" บนหน้าเว็บ */
        const cardText = item => item.cardDescription || item.publicDescription || item.description || '';

        const hairDetails = [{
            title: front.title,
            description: cardText(front)
        }];
        const extraDetails = [];
        /* เงินบนการ์ดถูกแบ่งเป็นสามก้อนที่ไม่ทับกัน แล้วยอดรวมค่อยบวกทั้งสามก้อนกับตัวเปล่า
             hairTotal  = ยอดรวมฝั่งลิสต์ผม   (ราคา tier หน้าม้า + ราคาเหมามิติทรงผม + ผมหลังราคาตายตัว)
             extraTotal = ยอดรวมฝั่งลิสต์เพิ่มเติม (สีผิว · ต่อลาย · ของเสริม · แม่เหล็ก ที่ราคาตายตัว)
             artistAdd  = "ราคาประเมินเพิ่มเติม" = ทุกรายการที่ศิลปินกรอกราคาเองในฟอร์ม
           รวมกันแล้วต้องเท่ากับ band.min + exactAdd เป๊ะ ตรรกะคิดเงินจึงไม่ได้เปลี่ยนเลย */
        let hairTotal = 0;
        let extraTotal = 0;
        let artistAdd = 0;

        details.forEach(item => {
            const price = item.customPrice ? detailPrice(item.id) : 0;
            if (price) exactAdd += price;
            selections.push(item.title + (price ? ` +${price} บาท` : ''));
            if (item.publicDescription) reasons.push(item.publicDescription);
            artistAdd += price;
            hairDetails.push({
                title: item.title,
                priceLabel: price ? `+${price} บาท` : '',
                description: cardText(item)
            });
        });
        if (bundledDetails.length) {
            const bundlePrice = config.hairDetailBundle.prices[bundledDetails.length] || 0;
            exactAdd += bundlePrice;
            hairTotal += bundlePrice;
            selections.push(`${config.hairDetailBundle.label} ${bundledDetails.length} อย่าง +${bundlePrice} บาท`);
        }
        /* ลิสต์ฝั่งซ้ายบนหน้าเว็บเป็น "ของที่เลือกเพิ่ม" จึงยังข้าม 'ผมหลังสั้น' ซึ่งเป็นค่าตั้งต้น */
        if (back.id !== 'short') {
            selections.push(back.title + (backPrice ? ` +${backPrice} บาท` : ''));
            if (back.publicDescription) reasons.push(back.publicDescription);
        }
        /* แต่บนการ์ดให้ผมหลังขึ้นทุกกรณี รวมทั้ง 'ผมหลังสั้น' (เจ้าของงานสั่ง 2026-08-30)
           'สั้น' ราคา 0 การบวกนอกเงื่อนไขจึงไม่กระทบยอดใดๆ */
        if (back.customPrice) artistAdd += backPrice;
        else hairTotal += backPrice;
        hairDetails.push({
            title: back.title,
            priceLabel: backPrice ? `+${backPrice} บาท` : '',
            description: cardText(back)
        });

        const skinCount = Math.max(0, Number(document.getElementById('extraSkinColors').value) || 0);
        if (skinCount) {
            exactAdd += skinCount * 50;
            selections.push(`เพิ่มสีผิว ${skinCount} สี +${skinCount * 50} บาท`);
            reasons.push('เพิ่มการแบ่งสีผิวตามตำแหน่งในดีไซน์ของตัวละคร');
            extraTotal += skinCount * 50;
            extraDetails.push({
                title: `เพิ่มสีผิว ${skinCount} สี`,
                priceLabel: `+${skinCount * 50} บาท`,
                description: 'เพิ่มการแบ่งสีผิวตามตำแหน่งในดีไซน์ของตัวละคร'
            });
        }

        if (patch.id !== 'none') {
            exactAdd += patchPrice;
            selections.push(patch.title + (patchPrice ? ` +${patchPrice} บาท` : ''));
            if (patch.publicDescription) reasons.push(patch.publicDescription);
            if (patch.customPrice) artistAdd += patchPrice;
            else extraTotal += patchPrice;
            extraDetails.push({
                title: patch.title,
                priceLabel: patchPrice ? `+${patchPrice} บาท` : '',
                description: patch.publicDescription || ''
            });
        }

        form.querySelectorAll('[data-extra]:checked').forEach(input => {
            const extra = config.exactExtras[input.dataset.extra];
            if (!extra) return;
            // ปักนอกใบหน้าใช้ราคาที่กรอก ถ้าเว้นว่างไว้ให้ถอยไปใช้ขั้นต่ำของรายการ
            const price = extra.customPrice
                ? (customPriceOf('extra-' + input.dataset.extra) || extra.price)
                : extra.price;
            exactAdd += price;
            selections.push(`${extra.label} +${price} บาท`);
            if (extra.customPrice) artistAdd += price;
            else extraTotal += price;
            extraDetails.push({
                title: extra.label,
                priceLabel: `+${price} บาท`,
                description: extra.publicDescription || ''
            });
        });

        const magnetPoints = Math.max(0, Number(document.getElementById('magnetPoints').value) || 0);
        if (magnetPoints) {
            exactAdd += magnetPoints * 20;
            selections.push(`แม่เหล็กเพิ่มเติม ${magnetPoints} จุด +${magnetPoints * 20} บาท`);
            extraTotal += magnetPoints * 20;
            extraDetails.push({
                title: `แม่เหล็กเพิ่มเติม ${magnetPoints} จุด`,
                priceLabel: `+${magnetPoints * 20} บาท`,
                description: 'เพิ่มจุดยึดแม่เหล็กตามตำแหน่งที่ต้องการ'
            });
        }

        const custom = tier >= 4 || patchOpen;
        const band = config.hairBands[tier];
        hairTotal += band.min;
        const min = config.basePrice + band.min + exactAdd;
        const max = custom || band.max === null ? null : config.basePrice + band.max + exactAdd;

        if (min === max) resultPrice.textContent = `${min.toLocaleString('th-TH')} บาท`;
        else if (max === null) resultPrice.textContent = `เริ่ม ${min.toLocaleString('th-TH')} บาท`;
        else resultPrice.textContent = `${min.toLocaleString('th-TH')}–${max.toLocaleString('th-TH')} บาท`;

        latestEstimate = {
            min, max, custom, tierLabel: band.label, selections, reasons,
            exactAdd, artistAdd, hairDetails, hairTotal, extraDetails, extraTotal,
            frontId: front.id,
            backId: back.id,
            patchId: patch.id,
            skinCount,
            magnetPoints,
            detailIds: details.map(item => item.id)
        };
    }

    /* ตัดบรรทัดที่ขอบคำจริง — ของเดิมตัดทีละอักขระ (Array.from(text)) เลยได้
       "น้ำห|นัก" · "ตัวล|ะคร" (ขึ้นบรรทัดด้วยสระ ะ) · "2|0 ซม." · "บนใบหน้|า"
       Intl.Segmenter locale th รู้ขอบคำไทย ถ้าเบราว์เซอร์ไม่มีให้ถอยไปตัดที่ช่องว่าง */
    const wordSegmenter = (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function')
        ? new Intl.Segmenter('th', { granularity: 'word' })
        : null;

    // ะ ั า ำ สระบน-ล่าง ๆ ์ วรรณยุกต์ — ห้ามเป็นตัวแรกของบรรทัด
    const NO_LINE_START = /[ะ-ฺๅ-๎]/;

    function segmentText(text) {
        if (wordSegmenter) return Array.from(wordSegmenter.segment(text), part => part.segment);
        return text.split(/(\s+)/).filter(Boolean);
    }

    function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
        const chunks = [];
        segmentText(String(text)).forEach(chunk => {
            if (ctx.measureText(chunk).width <= maxWidth) {
                chunks.push(chunk);
                return;
            }
            // ก้อนเดียวยาวเกินบรรทัด (คำที่ Segmenter ไม่รู้จัก) ตัดทีละอักขระ
            // แต่ไม่ยอมให้สระ/วรรณยุกต์ไปเป็นตัวแรกของบรรทัดถัดไป
            let piece = '';
            Array.from(chunk).forEach(char => {
                const test = piece + char;
                if (piece && ctx.measureText(test).width > maxWidth && !NO_LINE_START.test(char)) {
                    chunks.push(piece);
                    piece = char;
                } else {
                    piece = test;
                }
            });
            if (piece) chunks.push(piece);
        });

        let line = '';
        let lines = 0;
        for (let i = 0; i < chunks.length; i += 1) {
            const test = line + chunks[i];
            if (line && ctx.measureText(test).width > maxWidth) {
                ctx.fillText(line.replace(/\s+$/, ''), x, y + lines * lineHeight);
                lines += 1;
                if (lines >= maxLines) return y + lines * lineHeight;
                line = /^\s+$/.test(chunks[i]) ? '' : chunks[i];
            } else {
                line = test;
            }
        }
        if (line.trim() && lines < maxLines) {
            ctx.fillText(line.replace(/\s+$/, ''), x, y + lines * lineHeight);
            lines += 1;
        }
        return y + lines * lineHeight;
    }

    /* ================= การ์ดประเมินราคา — วาดตามดีไซน์ Figma `Frame 3` (node 169:30) =================
       เฟรม Figma กว้าง 1200 สูง 1500 = ขนาด canvas พอดี → พิกัดทุกตัวในไฟล์นี้คือพิกัด canvas ตรงๆ
       ไม่มีการคูณสเกลใดๆ (เลขไหนอ่านมาจาก SVG ก็ใส่ตรงนั้น รวมทั้งทศนิยม ห้ามปัดให้สวย)

       งานอาร์ตที่ canvas วาดเองไม่ได้ ถูกตัดออกจาก Frame 3.svg ไว้ล่วงหน้าโดย build-card-art.py
       เพราะไฟล์ต้นทางหนัก 680 KB (ฝัง PNG เป็น base64) ดึงทุกครั้งที่กดสร้างการ์ดไม่ไหว
       ที่นี่จึงเหลือแค่ "วางชั้นอาร์ต + เขียนตัวหนังสือ"
           ชั้น 1 card-back.svg    ขอบตั๋ว · พื้นไล่สี · แถบหัวไล่สี · ดาว 4 แฉก
           ชั้น 2 card-swirl.webp  ลายวนม่วง (cardbg) เจาะรูปรุมาให้แล้ว
           ชั้น 3 กรอบภาพ (พื้นขาว รอสไปรท์)
           ชั้น 4 card-front.svg   กรอบทอง · MOFYCH · วงแหวนทอง · เส้นแบ่ง · ตรา CONFIRM · สติกเกอร์ · รอยปรุ
           ชั้น 5 ตัวหนังสือทั้งหมด วาดด้วย fillText เพื่อให้เป็น text จริงและใช้ฟอนต์เว็บได้ */
    const CARD_W = 1200;
    const CARD_H = 1500;

    /* ?v= ต้องบวกทุกครั้งที่รัน build-card-art.py ใหม่ ไม่งั้นเบราว์เซอร์กินไฟล์อาร์ตเก่าจากแคช
       (กฎเดียวกับ ?v= ของ css/js ในหน้า แต่ไฟล์พวกนี้โหลดจาก JS จึงต้องใส่ตรงนี้) */
    const CARD_ART_VERSION = '2';
    const CARD_ART = {
        back: 'images/pricing/card-back.svg?v=' + CARD_ART_VERSION,
        swirl: 'images/pricing/card-swirl.webp?v=' + CARD_ART_VERSION,
        front: 'images/pricing/card-front.svg?v=' + CARD_ART_VERSION
    };
    // bbox ของ path «cardbg» ใน Frame 3.svg — ไฟล์ webp ถูกครอปมาพอดีช่องนี้แล้ว
    const CARD_SWIRL_BOX = [86, 25, 553, 889];

    // สีทุกตัวคัดลอกจาก Frame 3.svg ไม่ได้เดา
    const INK = '#0E00A8';        // หัวข้อลิสต์ · ชื่อสินค้า
    const PLUM = '#7C2D45';       // ตัวเลขราคาทุกจุด
    const MUTED = '#777A80';      // คำอธิบาย · ป้ายกำกับราคา
    const PAPER = '#FFFFFF';
    // สีเลขลำดับ ไล่ตามแถวแบบเดียวกับใน Figma แล้ววนซ้ำเมื่อครบ 5
    const ORDER_COLORS = ['#71EAF3', '#95C1FB', '#C8A6F7', '#F8A9D6', '#9DF3C9'];

    /* Montserrat กับ Piazzolla ไม่มีอักษรไทย — ใส่ Kanit ต่อท้ายให้ตัวไทยตกไปใช้ Kanit
       (Figma เองก็ตกฟอนต์แบบเดียวกัน) */
    const MONT = 'Montserrat, Kanit, sans-serif';
    const KANIT = 'Kanit, sans-serif';
    const PIAZ = 'Piazzolla, Kanit, serif';

    /* ลิสต์ผม — y ของแถวแรกมาจาก tspan จริง ระยะห่างแถว 88.1667
       ดีไซน์วางไว้ 5 แถว และไม่มีการยุบแถว: จำนวนที่ลูกค้าเลือกได้จริงไม่เกินนี้ */
    const HAIR_ROWS = {
        step: 88.1667,
        numberX: 632, numberY: 407.995,
        textX: 697.45, titleY: 393.897, descY: 421.711,
        // กว้างได้ถึงเส้นตั้งทอง «Line 22» ที่ x 980.5 เว้นช่องไฟไว้ 18
        textWidth: 265
    };

    // ลิสต์เพิ่มเติม — แถวแรก y 927.897 ระยะห่างแถว 60 · โควตา 8 แถว
    const EXTRA_ROWS = {
        quota: 8,
        step: 60,
        numberX: 600, numberY: 929.313,
        textX: 665.45, titleY: 927.897,
        priceRight: 1125
    };

    /* การ์ดแยกชื่อรุ่นกับขนาดคนละบรรทัด («Cotton Doll» / «Type 20 cm») แต่ต้นทางมีสายเดียว
       คือ config.modelName = 'Cotton Doll · Long Body 20 cm' จึงตัดเอาที่นี่ ไม่ไปแตะข้อมูลราคา */
    const MODEL_NAME = String(config.modelName || '');
    const PRODUCT_NAME = MODEL_NAME.split('·')[0].trim() || 'Cotton Doll';
    const PRODUCT_SIZE = (/(\d+(?:\.\d+)?)\s*(?:cm|ซม\.?)/i.exec(MODEL_NAME) || [])[1];

    let cardObjectUrl = '';
    const cardArtCache = {};

    /* SVG ที่โหลดผ่าน Image() ถูก rasterize ที่ขนาด intrinsic ของไฟล์ก่อนเสมอ
       ท่าเดียวกับ getHeroCircleSeal() ตัวเดิม: ครอบ viewBox ใหม่แล้วสั่ง rasterize ใหญ่กว่าขนาดที่วาดจริง
       ที่นี่ใช้ 2 เท่า เพราะตัวหนังสือรอบตรา CONFIRM เล็กมาก ถ้า rasterize 1:1 จะเละ */
    function loadVectorArt(src, pixelScale) {
        if (cardArtCache[src]) return cardArtCache[src];
        const job = fetch(encodeURI(src))
            .then(response => (response.ok ? response.text() : Promise.reject(new Error(src))))
            .then(markup => new Promise(resolve => {
                const inner = markup.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
                /* fill="none" ห้ามหาย! ค่าเริ่มต้นของ fill ใน SVG คือ "ดำ" และมันสืบทอดลงไปทุกชั้น
                   ชิ้นที่เป็นเส้นล้วน (วงแหวน bg-spin · ดาว cardline2 · รอยปรุ cardline3 · กรอบ dollframe2)
                   ไม่มี fill ของตัวเอง ถ้าไม่ประกาศตรงนี้จะโดนถมดำจนรูกลายเป็นจุดทึบ */
                const sized = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" width="'
                    + (CARD_W * pixelScale) + '" height="' + (CARD_H * pixelScale)
                    + '" viewBox="0 0 ' + CARD_W + ' ' + CARD_H + '">' + inner + '</svg>';
                const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
                const image = new Image();
                image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
                image.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
                image.src = url;
            }))
            .catch(() => null);
        cardArtCache[src] = job;
        return job;
    }

    function loadRasterArt(src) {
        if (cardArtCache[src]) return cardArtCache[src];
        const job = new Promise(resolve => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => resolve(null);
            image.src = encodeURI(src);
        });
        cardArtCache[src] = job;
        return job;
    }

    function loadCardArt() {
        return Promise.all([
            // ชั้นล่างเป็นรูปทรงใหญ่ๆ 1:1 ก็คมแล้ว · ชั้นบนต้อง 2 เท่าเพราะตัวหนังสือรอบตราเล็กมาก
            loadVectorArt(CARD_ART.back, 1),
            loadRasterArt(CARD_ART.swirl),
            loadVectorArt(CARD_ART.front, 2)
        ]).then(([back, swirl, front]) => ({ back, swirl, front }));
    }

    /* ฟอนต์ของ Google โหลดจริงต่อเมื่อมีอะไรบนหน้าใช้มันอยู่ — Montserrat กับ Piazzolla
       ใช้เฉพาะบนการ์ด ไม่มีที่ไหนบนหน้าเรียก ถ้าไม่สั่ง load() เอง canvas จะวาดด้วยฟอนต์สำรอง
       ('ก0' บังคับให้ดึง subset ทั้งไทยและละติน) */
    const CARD_FONTS = [
        ['300 24px Kanit', 'ก0'], ['400 24px Kanit', 'ก0'], ['500 24px Kanit', 'ก0'],
        ['600 24px Kanit', 'ก0'], ['800 24px Kanit', 'ก0'], ['900 24px Kanit', 'ก0'],
        ['400 24px Montserrat', '0A'], ['500 24px Montserrat', '0A'],
        ['600 24px Montserrat', '0A'], ['800 24px Montserrat', '0A'],
        ['900 24px Montserrat', '0A'], ['800 24px Piazzolla', '0A']
    ];

    function loadCardFonts() {
        if (!document.fonts || !document.fonts.load) return Promise.resolve();
        return Promise.all(CARD_FONTS.map(
            pair => document.fonts.load(pair[0], pair[1]).catch(() => null)));
    }

    /* ดีไซน์ล็อกขนาดตัวอักษรไว้ตายตัว แต่ข้อความมาจากที่ลูกค้าเลือก
       ถ้าไม่ย่อ ชื่อรายการยาวๆ หรือราคาที่เป็นช่วงจะทะลุกรอบ → ย่อลงทีละ 1px จนพอดี */
    function fitFont(ctx, text, maxWidth, weight, size, family, minSize) {
        let current = size;
        ctx.font = `${weight} ${current}px ${family}`;
        while (current > minSize && ctx.measureText(text).width > maxWidth) {
            current -= 1;
            ctx.font = `${weight} ${current}px ${family}`;
        }
        return current;
    }

    function drawFitted(ctx, text, x, baseline, maxWidth, weight, size, family, minSize, align) {
        fitFont(ctx, text, maxWidth, weight, size, family, minSize);
        ctx.textAlign = align || 'left';
        ctx.fillText(text, x, baseline);
        ctx.textAlign = 'left';
    }

    function bahtText(amount) {
        return `${Number(amount || 0).toLocaleString('th-TH')} บาท`;
    }

    function totalPriceText(estimate) {
        if (estimate.max === null) return `เริ่ม ${estimate.min.toLocaleString('th-TH')} บาท`;
        if (estimate.min === estimate.max) return `${estimate.min.toLocaleString('th-TH')} บาท`;
        return `${estimate.min.toLocaleString('th-TH')}–${estimate.max.toLocaleString('th-TH')} บาท`;
    }

    /* ลิสต์เพิ่มเติมมีที่ 8 แถว แต่ของเสริมมีให้เลือกมากกว่านั้น เกินโควตาจึงยุบแถวสุดท้ายเป็นบรรทัดสรุป
       (ใช้กับลิสต์เพิ่มเติมอย่างเดียว ลิสต์ผมไม่ยุบ) */
    function fitRows(items, quota) {
        if (items.length <= quota) return items;
        const rest = items.slice(quota - 1);
        return items.slice(0, quota - 1).concat({
            title: `เพิ่มเติมอีก ${rest.length} รายการ`,
            description: rest.map(item => item.title).join(' · '),
            priceLabel: ''
        });
    }

    /* ทรงกรอบภาพจริงจาก path «dollframe» ใน Frame 3.svg — สี่เหลี่ยมที่มุมเว้าเป็นวงโค้งทั้ง 4 มุม
       ห้ามวาดเป็นสี่เหลี่ยมมนแทน มุมจะไม่ตรงกับกรอบทองที่พิมพ์ทับอยู่ใน card-front.svg */
    const DOLL_FRAME_PATH = 'M496.006 289C496.272 302.3 507.136 313 520.5 313C520.667 313 520.834 312.996 521 312.993V863.006C520.834 863.003 520.667 863 520.5 863C506.969 863 496 873.969 496 887.5C496 887.667 496.003 887.834 496.006 888H111.994C111.997 887.834 112 887.667 112 887.5C112 874.136 101.3 863.272 88 863.006V312.993C101.134 312.73 111.731 302.134 111.994 289H496.006Z';
    const dollFramePath = typeof Path2D === 'function' ? new Path2D(DOLL_FRAME_PATH) : null;

    /* ช่องใส่สไปรท์ = «dollframe» ซึ่งเป็นกรอบมุมตัด (88, 289) 433×599 — ไม่ใช่กรอบเส้นทอง
       «dollframe2» (94, 298) 421×581 เป็นแค่เส้นขอบทองที่พิมพ์ทับภาพอีกที ไม่ใช่ช่องใส่ภาพ
       ทุกโซนวางซ้อนกันในกรอบเดียวนี้: โซนผมทั้งผม · ผมสองสี · ผิวสองสี · เพิ่มปัก · หู/หางแม่เหล็ก */
    const DOLL_SPRITE_BOX = { x: 88, y: 289, width: 433, height: 599 };

    function drawDollFrame(ctx, estimate) {
        ctx.save();
        ctx.fillStyle = PAPER;
        if (dollFramePath) ctx.fill(dollFramePath);
        else ctx.fillRect(88, 289, 433, 599);
        ctx.restore();
        drawDollSprites(ctx, DOLL_SPRITE_BOX, estimate);
    }

    /* จุดเดียวที่ต้องแก้ตอนได้ไฟล์สไปรท์มา — วาดทับกันในกรอบเดียวตามลำดับโซน
       เฟสนี้ยังไม่มีไฟล์ จึงเว้นกรอบขาวไว้ ห้ามวาดตุ๊กตาเองเด็ดขาด (ของเดิมวาดมือแล้วไม่ผ่าน) */
    function drawDollSprites(ctx, box, estimate) {   // eslint-disable-line no-unused-vars
    }

    function paintCard(ctx, art) {
        const data = latestEstimate;

        // พื้นโปร่งใส — ดีไซน์ใหม่ไม่มีพื้นหลัง ห้าม fillRect ทับทั้งผืน ไม่งั้น PNG ไม่ใส
        ctx.clearRect(0, 0, CARD_W, CARD_H);

        if (art.back) ctx.drawImage(art.back, 0, 0, CARD_W, CARD_H);
        if (art.swirl) {
            ctx.drawImage(art.swirl, CARD_SWIRL_BOX[0], CARD_SWIRL_BOX[1],
                CARD_SWIRL_BOX[2], CARD_SWIRL_BOX[3]);
        }
        drawDollFrame(ctx, data);
        if (art.front) ctx.drawImage(art.front, 0, 0, CARD_W, CARD_H);

        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';

        // ---------- แถบหัว (ข้อความคงที่ ชิดขวาที่ x 998 ตามสเปก) ----------
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'right';
        ctx.font = `600 40px ${MONT}`;
        ctx.fillText('ใบประเมินราคา', 998, 125.921);
        ctx.font = `300 24px ${KANIT}`;
        ctx.fillText('ราคานี้เป็นราคาประเมินเบื้องต้น', 998, 160.041);
        ctx.textAlign = 'left';

        // ---------- ฝั่งซ้าย: ชื่อสินค้าและราคา ----------
        ctx.fillStyle = MUTED;
        ctx.font = `400 32px ${KANIT}`;
        ctx.fillText(PRODUCT_SIZE ? `Type ${PRODUCT_SIZE} cm` : 'Type', 88, 945.085);

        ctx.fillStyle = INK;
        drawFitted(ctx, PRODUCT_NAME, 88, 996.384, 431, 500, 53, KANIT, 30);

        ctx.fillStyle = MUTED;
        ctx.font = `400 24px ${MONT}`;
        ctx.fillText('ราคาประเมินเพิ่มเติม', 88, 1049.41);
        ctx.fillStyle = PLUM;
        drawFitted(ctx, bahtText(data.artistAdd), 88, 1089.01, 431, 800, 48, PIAZ, 30);

        ctx.fillStyle = MUTED;
        ctx.font = `400 35px ${MONT}`;
        ctx.fillText('ราคาประเมินรวมทั้งหมด', 88, 1184.35);
        ctx.fillStyle = PLUM;
        drawFitted(ctx, totalPriceText(data), 88, 1269.41, 431, 800, 99, PIAZ, 46);

        // ---------- ฝั่งขวา: หัวข้อลิสต์ทั้งสองก้อน ----------
        ctx.fillStyle = INK;
        ctx.font = `600 36px ${MONT}`;
        ctx.fillText('รายละเอียดประเมินผม', 600, 317.487);
        ctx.fillText('รายละเอียดเพิ่มเติม', 600, 851.487);

        // ---------- ลิสต์ผม ----------
        (data.hairDetails || []).forEach((item, index) => {
            const shift = index * HAIR_ROWS.step;

            ctx.fillStyle = ORDER_COLORS[index % ORDER_COLORS.length];
            ctx.font = `800 41.2958px ${MONT}`;
            ctx.fillText(String(index + 1).padStart(2, '0'),
                HAIR_ROWS.numberX, HAIR_ROWS.numberY + shift);

            ctx.fillStyle = '#000000';
            drawFitted(ctx, item.title, HAIR_ROWS.textX, HAIR_ROWS.titleY + shift,
                HAIR_ROWS.textWidth, 500, 28.05, MONT, 18);

            if (item.description) {
                ctx.fillStyle = MUTED;
                ctx.font = `400 18.7px ${MONT}`;
                // ดีไซน์ให้คำอธิบายบรรทัดเดียว — ตัดที่ขอบคำไทยด้วย wrapCanvasText แล้วเอาแค่บรรทัดแรก
                wrapCanvasText(ctx, item.description, HAIR_ROWS.textX, HAIR_ROWS.descY + shift,
                    HAIR_ROWS.textWidth, 22, 1);
            }
        });

        // ยอดรวมฝั่งผม — สองบรรทัด กึ่งกลางที่ x 1060.5 (กล่อง Figma 932..1189)
        ctx.fillStyle = PLUM;
        drawFitted(ctx, Number(data.hairTotal || 0).toLocaleString('th-TH'),
            1060.5, 560.005, 200, 800, 48, PIAZ, 28, 'center');
        ctx.font = `800 48px ${PIAZ}`;
        ctx.textAlign = 'center';
        ctx.fillText('บาท', 1060.5, 617.616);
        ctx.textAlign = 'left';

        // ---------- ลิสต์เพิ่มเติม ----------
        fitRows(data.extraDetails || [], EXTRA_ROWS.quota).forEach((item, index) => {
            const y = EXTRA_ROWS.titleY + index * EXTRA_ROWS.step;

            ctx.fillStyle = ORDER_COLORS[index % ORDER_COLORS.length];
            ctx.font = `800 32px ${MONT}`;
            ctx.fillText(String(index + 1).padStart(2, '0'),
                EXTRA_ROWS.numberX, EXTRA_ROWS.numberY + index * EXTRA_ROWS.step);

            let priceWidth = 0;
            if (item.priceLabel) {
                ctx.fillStyle = PLUM;
                ctx.font = `900 28.05px ${MONT}`;
                priceWidth = ctx.measureText(item.priceLabel).width;
                ctx.textAlign = 'right';
                ctx.fillText(item.priceLabel, EXTRA_ROWS.priceRight, y);
                ctx.textAlign = 'left';
            }

            ctx.fillStyle = '#000000';
            const room = EXTRA_ROWS.priceRight - EXTRA_ROWS.textX - (priceWidth ? priceWidth + 24 : 0);
            drawFitted(ctx, item.title, EXTRA_ROWS.textX, y, room, 400, 28.05, MONT, 17);
        });

        // ยอดรวมฝั่งเพิ่มเติม — กึ่งกลางที่ x 849.5 (กล่อง Figma 681..1018)
        ctx.fillStyle = PLUM;
        drawFitted(ctx, bahtText(data.extraTotal), 849.5, 1425.01, 337, 800, 48, PIAZ, 28, 'center');
    }

    function downloadCard() {
        if (!latestEstimate) computeEstimate();
        const canvas = document.createElement('canvas');
        canvas.width = CARD_W;
        canvas.height = CARD_H;
        const ctx = canvas.getContext('2d');

        // รอฟอนต์โหลดก่อน ไม่งั้น canvas วาดด้วยฟอนต์สำรองแล้วการ์ดคนละหน้าตากับเว็บ
        const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        Promise.all([ready, loadCardFonts(), loadCardArt()]).then(results => {
            paintCard(ctx, results[2]);
            canvas.toBlob(blob => {
                if (!blob) return;
                if (cardObjectUrl) URL.revokeObjectURL(cardObjectUrl);
                const url = URL.createObjectURL(blob);
                cardObjectUrl = url;
                document.getElementById('cardPreviewImage').src = url;
                document.getElementById('cardDownloadLink').href = url;
                document.getElementById('cardPreview').hidden = false;
                document.body.style.overflow = 'hidden';
            }, 'image/png');
        });
    }

    /* ดันค่าที่ต่ำกว่าขั้นต่ำให้เห็นกับตาตอนออกจากช่อง ไม่ใช่ดันเงียบๆ ตอนคิดเงินอย่างเดียว
       ทำตอน change (ออกจากช่อง) ไม่ใช่ตอน input ไม่งั้นพิมพ์ 5 ระหว่างจะพิมพ์ 500 แล้วโดนเด้งเป็น 50 */
    form.addEventListener('change', event => {
        const input = event.target;
        if (!input.matches || !input.matches('[data-price-for]')) return;
        const min = Number(input.min) || 0;
        const value = Math.round(Number(input.value) || 0);
        if (value > 0 && value < min) input.value = String(min);
    });

    form.addEventListener('input', computeEstimate);
    form.addEventListener('change', computeEstimate);
    document.getElementById('downloadEstimate').addEventListener('click', downloadCard);
    document.getElementById('closeCardPreview').addEventListener('click', () => {
        document.getElementById('cardPreview').hidden = true;
        document.body.style.overflow = '';
    });
    document.getElementById('resetEstimate').addEventListener('click', () => {
        form.reset();
        computeEstimate();
        window.scrollTo({ top: form.offsetTop - 20, behavior: 'smooth' });
    });

    computeEstimate();
}());
