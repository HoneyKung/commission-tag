# -*- coding: utf-8 -*-
"""ทำปุ่ม "กลับหน้าฝากแทค" ของหน้าประเมินราคา จากปุ่มเมนูของ hero

ปุ่มเมนูใน hero มีป้ายสองใบซ้อนกัน (ดูคอมเมนต์ในไฟล์ figma.css):
    Group 43  ป้ายน้ำเงิน = สถานะปกติ       (ต้นทางที่ 347, 273)
    Group 40  ป้ายม่วง    = สถานะเมาส์วาง   (ต้นทางที่ 297.1, 391.4)
ดีไซน์วาดช่อง "แก้ไขฝากแทค" เป็นสีม่วงไว้เป็นตัวอย่างของ "สถานะ" ไม่ใช่สีประจำช่อง

สคริปต์นี้เอาทั้งสองใบมา:
    1. ครอปเหลือเฉพาะตัวปุ่ม (bbox ของ Union ที่เป็นพื้นปุ่ม)
    2. กลับด้านซ้าย-ขวา — ปลายมนกับดาวย้ายไปอยู่ทางซ้าย อ่านเป็นทิศย้อนกลับ
       และพื้นทึบก็ย้ายมาซ้ายด้วย ตัวหนังสือจึงยังอ่านออก (ของเดิมทึบขวา จางซ้าย)
    3. ถอดป้ายตัวหนังสือเดิมออก — หน้าเว็บใส่ text จริงทับเอง (กฎ text-must-be-real-text)

ผลลัพธ์ 2 ไฟล์ใน images/figma/parts/
    back-button.svg        สถานะปกติ
    back-button-hover.svg  สถานะเมาส์วาง

รันใหม่เมื่อ export ฉากเมนูของ hero ใหม่:
    python build-back-button.py
"""
import os
import re
import sys
import xml.etree.ElementTree as ET

SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'images', 'figma', 'parts')

JOBS = [
    ('images/figma/menu-web/layers/28_Group-43.svg', 'Group 43', 'Union_8',
     ('paint107_radial_0_1', 'paint108_linear_0_1'), 'back-button.svg', 'ปกติ'),
    ('images/figma/menu-web/layers/25_Group-40.svg', 'Group 40', 'Union_2',
     ('paint101_radial_0_1', 'paint102_linear_0_1'), 'back-button-hover.svg', 'เมาส์วาง'),
]


def bbox(d):
    """bbox จากจุดปลายของทุกคำสั่งใน path (Figma export เป็นพิกัดสัมบูรณ์ M/C/H/V/L)"""
    xs, ys, x, y = [], [], 0.0, 0.0
    for cmd, body in re.findall(r'([MCHVLZ])([-\d.,\s]*)', d):
        v = [float(n) for n in re.findall(r'-?\d*\.?\d+', body)]
        if cmd in 'ML':
            for i in range(0, len(v) - 1, 2):
                x, y = v[i], v[i + 1]
                xs.append(x)
                ys.append(y)
        elif cmd == 'C':
            for i in range(0, len(v) - 5, 6):
                x, y = v[i + 4], v[i + 5]
                xs.append(x)
                ys.append(y)
        elif cmd == 'H':
            for n in v:
                x = n
                xs.append(x)
                ys.append(y)
        elif cmd == 'V':
            for n in v:
                y = n
                xs.append(x)
                ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


for src, group_id, body_id, paints, name, label in JOBS:
    root = ET.parse(os.path.join(ROOT, src)).getroot()
    byid = {e.get('id'): e for e in root.iter() if e.get('id')}
    x0, y0, x1, y1 = bbox(byid[body_id].get('d'))
    w, h = x1 - x0, y1 - y0

    out = ET.Element('{%s}svg' % SVG, {
        'width': '%.2f' % w, 'height': '%.2f' % h,
        'viewBox': '%.2f %.2f %.2f %.2f' % (x0, y0, w, h), 'fill': 'none'})
    out.append(ET.Comment(' %s (%s) จาก %s — ครอปตัวปุ่ม + กลับด้านซ้าย-ขวา + ถอดป้ายตัวหนังสือออก '
                          % (group_id, label, src)))

    defs = ET.SubElement(out, '{%s}defs' % SVG)
    for paint in paints:
        defs.append(byid[paint])

    # กลับด้าน: สะท้อนรอบแกนกลางของ bbox → translate(x0 + x1) scale(-1 1)
    flip = ET.SubElement(out, '{%s}g' % SVG, {'transform': 'translate(%.2f 0) scale(-1 1)' % (x0 + x1)})
    for child in byid[group_id]:
        keep = ET.Element(child.tag, dict(child.attrib))
        for sub in child:
            if sub.tag == '{%s}text' % SVG:
                continue
            keep.append(sub)
        flip.append(keep)

    path = os.path.join(OUT, name)
    ET.ElementTree(out).write(path, encoding='utf-8', xml_declaration=False)

    # ElementTree เขียน xmlns ซ้ำเมื่อใส่ทั้ง register_namespace และแอตทริบิวต์เอง — กันไว้
    text = open(path, encoding='utf-8').read()
    text = text.replace(' xmlns="%s" xmlns="%s"' % (SVG, SVG), ' xmlns="%s"' % SVG)
    open(path, 'w', encoding='utf-8').write(text)

    stars = [bbox(byid[i].get('d')) for i in byid if i.startswith('Star ')]
    left = min(x1 - s[2] for s in stars)
    right = max(x1 - s[0] for s in stars)
    print('%-22s %6.1f KB   ปุ่ม %.2f x %.2f · ดาวหลังกลับด้านอยู่ที่ %.2f–%.2f จากขอบซ้าย'
          % (name, os.path.getsize(path) / 1024.0, w, h, left, right))
