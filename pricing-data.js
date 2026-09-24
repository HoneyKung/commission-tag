(function () {
    'use strict';

    window.MOFYCH_PRICING = {
        version: 'cotton-longbody-20-v27',
        modelName: 'Cotton Doll · Long Body 20 cm',
        basePrice: 1800,
        baseDescription: 'ตัวเปล่า ปักรายละเอียดบนใบหน้า และทรงผมเสย/ไม่มีหน้าม้า',
        targetMargin: 0.25,
        wageComparisons: [80, 100, 120],
        hairBands: {
            0: { min: 0, max: 0, label: 'ไม่มีหน้าม้า', publicLabel: '1,800 บาท' },
            1: { min: 100, max: 100, label: 'หน้าม้า 2.5D พื้นฐาน', publicLabel: '1,900 บาท' },
            2: { min: 200, max: 200, label: 'ผม 2.5D รายละเอียดเพิ่ม', publicLabel: '2,000 บาท' },
            3: { min: 300, max: 300, label: 'หน้าม้าลายลึก/แสก หรือกรอบผม 2.5D', publicLabel: '2,100 บาท' },
            4: { min: 400, max: null, label: 'ทรงผมพิเศษ', publicLabel: 'เริ่ม 2,200 บาท' }
        },
        frontHair: [
            {
                id: 'bald', tier: 0, title: 'ไม่มีหน้าม้า', image: 'images/pricing/hair-bald.svg',
                description: 'ผมเสยหรือทรงที่เปิดช่วงหน้าผาก',
                cardDescription: 'ผมเย็บติดทั่วไป',
                publicDescription: 'เปิดใบหน้าได้ชัด เหมาะกับทรงเสยหรือดีไซน์ที่เน้นรายละเอียดบนใบหน้า',
                internalNote: 'ใช้โครงสร้างหัวมาตรฐานโดยไม่ต้องสร้างชิ้นหน้าม้าแยก'
            },
            {
                id: 'full', tier: 1, title: 'หน้าม้าเต็มแบบเรียบ', image: 'images/pricing/hair-bangs.svg',
                description: 'ขอบหน้าม้าเรียบหรือมีโค้งเดียว ดูสะอาดตา',
                cardDescription: 'เย็บชิ้นหน้าม้าแต่เส้นน้อย',
                publicDescription: 'ให้กรอบหน้าดูนุ่มและเรียบสะอาด เข้ากับตัวละครได้หลายสไตล์',
                internalNote: 'เป็นหน้าม้า 2.5D แบบพื้นฐาน ใช้ชิ้นแพตเทิร์นและแนวเก็บขอบน้อยที่สุด'
            },
            {
                id: 'pointed', tier: 2, title: 'หน้าม้าช่อหญ้า', image: 'images/pricing/hair-detail.svg',
                description: 'ปลายผมเป็นช่อ โดยร่องระหว่างช่อไม่ลึกถึงโคนผม',
                cardDescription: 'เย็บชิ้นหน้าม้าแต่เส้นมาก',
                publicDescription: 'ปลายผมเป็นช่อช่วยเพิ่มจังหวะและบุคลิก โดยยังคงทรงหน้าม้าที่กระชับ',
                internalNote: 'มีแนวตัดและแนวเก็บขอบมากกว่าแบบเรียบ แต่ยังใช้โครงหน้าม้าชิ้นหลักต่อเนื่องกัน'
            },
            {
                id: 'parted', tier: 3, title: 'หน้าม้าแสก/โคนผมลึก', image: 'images/pricing/hair-parted.svg',
                description: 'มีแนวแสกหรือร่องแบ่งช่อยาวเกือบถึงโคนผม เห็นทิศทางของเส้นผมชัดเจน',
                cardDescription: 'เย็บชิ้นหน้าม้าแยกหรือแสกสูง',
                publicDescription: 'แนวแสกและช่อลึกช่วยกำหนดกรอบหน้า และถ่ายทอดทิศทางของเส้นผมได้ชัดขึ้น',
                internalNote: 'ต้องแยกทิศทางและวางแนวช่อลึกหลายช่วง รวมทั้งจัดตำแหน่งให้สัมพันธ์กับงานปักหน้า'
            },
            {
                id: 'curled', tier: 4, title: 'หน้าม้าหยักศก/ม้วน', image: 'images/pricing/hair-special.svg',
                description: 'มีเส้นโค้ง ม้วน หรือลอนที่เป็นส่วนสำคัญของทรงผม',
                cardDescription: 'เย็บแบบเส้นโค้งหรือลอน',
                publicDescription: 'เส้นโค้งและลอนช่วยเพิ่มมิติและเอกลักษณ์ให้ทรงผม โดยอ้างอิงรูปทรงจากดีไซน์ตัวละคร',
                internalNote: 'ต้องสร้างรูปทรงสามมิติและควบคุมให้ลอนคงรูป จึงต้องดูภาพอ้างอิงก่อน'
            }
        ],
        hairDetailBundle: {
            label: 'มิติเพิ่มของทรงผม',
            prices: { 0: 0, 1: 100, 2: 180, 3: 250 }
        },
        hairDetails: [
            {
                id: 'side-locks', tier: 2, bundleEligible: true, title: 'ปอยผมข้างหู', image: 'images/pricing/hair-side-locks.svg',
                description: 'เติมกรอบหน้าด้านข้าง ช่วยให้ทรงผมดูต่อเนื่องและมีมิติมากขึ้น',
                cardDescription: 'ชิ้นผมข้างใบหน้าหรือหลังใบหู',
                publicDescription: 'เติมกรอบหน้าด้านข้าง ช่วยให้ทรงผมดูต่อเนื่องและมีมิติมากขึ้น',
                internalNote: 'ต้องทำชิ้นผมแยก จัดซ้าย–ขวา และยึดตำแหน่งโดยยังรักษามิติ'
            },
            {
                id: 'crown-layer', tier: 2, bundleEligible: true, title: 'ชั้นผมบนหัว', image: 'images/pricing/hair-crown.svg',
                description: 'เพิ่มระดับของเส้นผมเหนือหน้าม้า ช่วยให้ทรงดูมีน้ำหนักและความลึก',
                cardDescription: 'เพิ่มมิติของผมเย็บเพิ่มอีกชิ้น',
                publicDescription: 'เพิ่มระดับของเส้นผมเหนือหน้าม้า ช่วยให้ทรงดูมีน้ำหนักและความลึก',
                internalNote: 'เพิ่มชิ้นผมอีกระดับเหนือแนวหน้าม้าเพื่อสร้างเงาและความลึก'
            },
            {
                id: 'hair-frame', tier: 3, bundleEligible: true, title: 'กรอบผมล้อมใบหน้า', image: 'images/pricing/hair-frame.svg',
                description: 'โอบกรอบใบหน้าและเชื่อมทรงผมด้านหน้า–ด้านข้างให้ดูสมบูรณ์ขึ้น',
                cardDescription: 'ชิ้นผมตามไลน์ผมรอบหัวตลค.',
                publicDescription: 'โอบกรอบใบหน้าและเชื่อมทรงผมด้านหน้า–ด้านข้างให้ดูสมบูรณ์ขึ้น',
                internalNote: 'ต้องวาดชิ้นกรอบตามแนวรอยต่อหัว เก็บขอบ และเย็บให้โค้งขึ้นลงตามทรงตัวละคร'
            },
            {
                id: 'special-structure', tier: 4, customPrice: true, title: 'เปีย/มวย/ลอน/มัด', image: 'images/pricing/hair-special.svg',
                description: 'รูปทรงผมเฉพาะจะประเมินตามภาพอ้างอิงของแต่ละแบบ',
                cardDescription: 'ชิ้นผมขึ้นรูปทรงพิเศษ',
                publicDescription: 'รูปทรงผมเฉพาะจะประเมินตามภาพอ้างอิง เพื่อให้ใกล้เคียงดีไซน์ของตัวละคร',
                internalNote: 'เป็นโครงสร้างผมเฉพาะที่ต้องทดลองแพตเทิร์นและวิธีขึ้นทรงก่อนยืนยันราคา'
            }
        ],
        backHair: [
            { id: 'short', tier: 0, price: 0, title: 'ผมหลังสั้น', description: '', cardDescription: 'สั้นหรือยาวประบ่า ตัดแต่งได้', publicDescription: '', internalNote: '' },
            {
                id: 'wig-long', tier: 0, price: 270, title: 'ต่อวิกผมยาว',
                cardDescription: 'เย็บวิกผมยาวในชั้นผมผ้า',
                publicDescription: 'เพิ่มความยาวและการทิ้งตัวของเส้นผม เหมาะกับตัวละครที่มีผมยาวพลิ้ว',
                internalNote: 'ต้องต่อเส้นวิกเข้ากับผ้าขนและใช้เวลาในการสางและจัดทรงเพิ่ม'
            },
            {
                id: 'fabric-long', tier: 4, price: 0, customPrice: true, title: 'ผมยาวจากผ้าทั้งชิ้น',
                cardDescription: 'ชิ้นผ้าผมยาวตามรูป',
                publicDescription: 'ให้ทรงผมยาวเป็นชิ้นผ้าเต็มรูป พร้อมปรับน้ำหนักและการตกตัวตามดีไซน์',
                internalNote: 'เป็นเทคนิคที่ต้องทดลองน้ำหนัก การตกตัว และโครงสร้างก่อนยืนยันราคา'
            }
        ],
        patchwork: [
            { id: 'none', price: 0, title: 'ไม่มีงานต่อลาย', publicDescription: '', internalNote: '' },
            {
                id: 'simple', price: 100, title: 'ต่อลายผ้าแบบง่าย',
                publicDescription: 'เพิ่มตำแหน่งสีด้วยการต่อผ้า เหมาะกับลายที่มีรูปทรงชัดเจน',
                internalNote: 'ต้องแบ่งแพตเทิร์นและต่อผ้าหลายสีให้กลับมาเป็นชิ้นส่วนเดียว'
            },
            {
                id: 'multi', price: 200, title: 'ต่อลายหลายปื้น',
                publicDescription: 'รองรับลายหลายตำแหน่งและการจัดวางสีที่ต่อเนื่องกันทั้งสองด้าน',
                internalNote: 'ใช้ผ้าหลายชิ้นและต้องจัดลายซ้าย–ขวาให้สัมพันธ์กัน เช่น หูสีวัว'
            },
            {
                id: 'custom', price: 0, custom: true, customPrice: true, title: 'ลายซับซ้อน',
                publicDescription: 'ลายที่มีรูปทรงหรือการจัดวางเฉพาะ จะประเมินจากภาพอ้างอิงของแต่ละแบบ',
                internalNote: 'จำนวนรอยต่อและรูปทรงลายต้องประเมินจากภาพอ้างอิง'
            }
        ],
        exactExtras: {
            skeleton: {
                label: 'เพิ่มกระดูก', price: 100,
                publicDescription: 'ช่วยให้จัดแขน ขา และท่าทางของตุ๊กตาได้'
            },
            extraHairColor: {
                label: 'สีผมมากกว่า 1 สี', price: 100,
                publicDescription: 'เพิ่มสีผมเพื่อถ่ายทอดลายและเอกลักษณ์ของตัวละคร'
            },
            externalEmbroidery: {
                label: 'ปักเพิ่มเติมนอกใบหน้า', price: 50, customPrice: true, minPrice: 50,
                publicDescription: 'เพิ่มรายละเอียดปักตามตำแหน่งอื่นของดีไซน์'
            },
            hardEarsLegs: {
                label: 'หู/เขาแบบผ้า', price: 160,
                publicDescription: 'ทำหู/เขาเป็นชิ้นผ้าเย็บติดกับตัว'
            },
            magneticEarsLegs: {
                label: 'หู/เขาแม่เหล็ก', price: 200,
                publicDescription: 'ถอดและติดหู/เขาได้ด้วยแม่เหล็ก'
            },
            hardTail: {
                label: 'หางแบบผ้า', price: 80,
                publicDescription: 'ทำหางเป็นชิ้นผ้าเย็บติดกับตัว'
            },
            magneticTail: {
                label: 'หางแม่เหล็ก', price: 100,
                publicDescription: 'ถอดและติดหางได้สะดวกด้วยแม่เหล็ก'
            }
        },
        defaults: {
            salePrice: 1800,
            materials: {
                skinFabric: 7.5,
                hairFabric: 18.75,
                stuffing: 6.2,
                waterSolubleGel: 5,
                packaging: 80,
                miscConsumables: 0,
                utilities: 0
            },
            machine: { purchasePrice: 4500, lifeHours: 1000, jobHours: 3 },
            tasks: [
                { id: 'design', label: 'วาดและออกแบบ', hours: 1.5 },
                { id: 'sourcing', label: 'เลือกและสั่งสีผ้า', hours: 1.5 },
                { id: 'gel', label: 'วาดลายลงเจล', hours: 0.75 },
                { id: 'cut-body', label: 'วาดและตัดชิ้นตัว', hours: 1 },
                { id: 'cut-hair', label: 'วาดและตัดชิ้นผม', hours: 1 },
                { id: 'embroidery', label: 'ปักหน้าด้วยมือ', hours: 7 },
                { id: 'sew-body', label: 'เย็บตัว', hours: 6 },
                { id: 'hair-pieces', label: 'ทำชิ้นผมแยก', hours: 3 },
                { id: 'head-hair', label: 'เย็บหัวและประกอบผม', hours: 6 },
                { id: 'stuffing', label: 'ยัดใย', hours: 1 },
                { id: 'washing', label: 'ซักและล้างเจล', hours: 0.67 },
                { id: 'finishing', label: 'ไดร์ หวี จัดทรง และปักแก้ม', hours: 1 },
                { id: 'customer', label: 'คุยและอัปเดตลูกค้า', hours: 0.25 },
                { id: 'packing', label: 'แพ็กและวาดการ์ดกล่อง', hours: 2 }
            ]
        }
    };
}());
