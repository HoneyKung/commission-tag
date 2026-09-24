#!/usr/bin/env python3
"""
ประกอบภาพ hero จาก Figma เข้าไปใน index.html  (2 ฉาก: หลัก + เมนู)

ทำไมต้องมีสคริปต์: ภาพ hero เป็น SVG จาก Figma ที่ต้องฝังใน HTML
(ฝังถึงจะสั่งงานด้วย CSS/JS ได้ ถ้าใช้ <img> จะแตะข้างในไม่ได้)
ต้นฉบับอยู่ที่ images/hero/hero-art.svg และ hero-menu-art.svg

วิธีใช้:
    python build-hero-art.py

เมื่อไหร่ต้องรัน:
  - export SVG ใหม่จาก Figma แล้วรัน extract-hero-images.py ทับไฟล์ต้นฉบับ
  - แก้อะไรก็ตามใน hero-art.svg / hero-menu-art.svg

ขั้นตอนที่สคริปต์ทำให้:
  1. ครอป viewBox เหลือ 2560x1899 (เท่าพื้นหลัง Rectangle 12 — คือฉากที่แสดงจริง)
  2. ถอดพื้นขาวเต็มเฟรมออก
  3. ยัดลง index.html ระหว่าง marker ของแต่ละฉาก

หมายเหตุการ export จาก Figma (ห้ามพลาด):
  ✅ Include "id" attribute   ✅ Outline text   ✅ Include bounding box
  ❌ Ignore overlapping layers
  และห้ามเปิด Clip content ของเฟรม ไม่งั้นภาพส่วนที่ล้นขอบจะหายถาวร
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
HTML = ROOT / 'index.html'

# (ไฟล์ SVG, marker ใน index.html, ชื่อไว้พิมพ์)
HERO = ROOT / 'images' / 'hero'
SCENES = [
    (HERO / 'hero-main-below.svg', 'HERO-MAIN-BELOW', 'หลัก/ชั้นล่าง'),
    (HERO / 'hero-main-paper.svg', 'HERO-MAIN-PAPER', 'หลัก/กระดาษ'),
    (HERO / 'hero-main-above.svg', 'HERO-MAIN-ABOVE', 'หลัก/ชั้นบน'),
    (HERO / 'hero-menu-below.svg', 'HERO-MENU-BELOW', 'เมนู/ชั้นล่าง'),
    (HERO / 'hero-menu-paper.svg', 'HERO-MENU-PAPER', 'เมนู/กระดาษ'),
    (HERO / 'hero-menu-above.svg', 'HERO-MENU-ABOVE', 'เมนู/ชั้นบน'),
]

# ขนาดฉากที่แสดงจริง = ขนาดของพื้นหลังล่างสุด (Rectangle 12) ใน Figma
# หน้านี้เป็นหน้ายาวเลื่อนอ่าน hero จึงสูงเท่าภาพเต็มๆ ไม่ตัดตามความสูงจอ
VIEW_W, VIEW_H = 2560, 1899


def prepare(svg: str) -> str:
    # ครอปให้เหลือเฉพาะพื้นที่จอ — overflow:visible ใน CSS จะทำให้ส่วนที่ล้นยังวาดออกมา
    svg = re.sub(r'width="\d+" height="\d+" viewBox="0 0 \d+ \d+"',
                 f'viewBox="0 0 {VIEW_W} {VIEW_H}"', svg, count=1)
    # พื้นขาวเต็มเฟรมของ Figma — hero มีพื้นของตัวเองแล้ว
    svg = re.sub(r'<rect width="\d+" height="\d+" fill="white"/>', '', svg, count=1)
    return '\n'.join('            ' + ln if ln.strip() else ln for ln in svg.split('\n'))


def main() -> int:
    html = HTML.read_text(encoding='utf-8')

    for path, marker, label in SCENES:
        if not path.exists():
            print(f'  ข้าม {label}: ไม่เจอ {path.name}', file=sys.stderr)
            continue
        start = f'<!-- {marker}:START — สร้างด้วย build-hero-art.py ห้ามแก้ด้วยมือ -->'
        end = f'<!-- {marker}:END -->'
        if start not in html or end not in html:
            print(f'  ไม่เจอ marker {marker} ใน index.html', file=sys.stderr)
            return 1
        art = prepare(path.read_text(encoding='utf-8'))
        i = html.index(start) + len(start)
        j = html.index(end)
        html = html[:i] + '\n' + art + '\n            ' + html[j:]
        print(f'  {label}: ยัด {len(art):,} ตัวอักษร')

    HTML.write_text(html, encoding='utf-8')
    print(f'  index.html รวม {len(html):,} ตัวอักษร')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
