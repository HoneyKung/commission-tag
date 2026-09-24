# -*- coding: utf-8 -*-
"""แยกงานอาร์ตของการ์ดประเมินราคา (Frame 3 = node 169:30) ออกเป็นไฟล์ย่อยใน images/pricing/

ทำไมต้องมีสคริปต์นี้: `images/edit main figma/Frame 3.svg` หนัก 680 KB เพราะฝัง PNG เป็น base64
ดึงทั้งไฟล์ทุกครั้งที่กดสร้างการ์ดไม่ไหว และ estimate-script.js ก็ห้ามวาดทรงเอง
สคริปต์นี้จึงตัดเฉพาะชิ้นที่ใช้จริงออกมา แล้ว paintCard() ค่อยอ้างไฟล์ย่อย

ผลลัพธ์ 3 ไฟล์ — สองไฟล์ SVG ใช้ viewBox 0 0 1200 1500 เท่าแคนวาสการ์ด วาดที่ (0,0) ได้ตรงๆ
  card-back.svg   ชั้นล่าง: เส้นขอบตั๋ว · พื้นไล่สี · แถบหัวไล่สี · ดาว 4 แฉก
  card-swirl.webp ลายวนม่วง (cardbg) แกะจาก PNG ที่ฝังใน Figma หมุน/ครอป/เจาะรูปรุไว้แล้ว
  card-front.svg  ชั้นบน: กรอบภาพ · กรอบทอง · MOFYCH · วงแหวนทอง · เส้นแบ่ง · ตรา · สติกเกอร์ · รอยปรุ

รันใหม่เมื่อไหร่: เจ้าของงานแก้ Frame 3 ใน Figma แล้ว export ทับ `images/edit main figma/Frame 3.svg`
    python build-card-art.py
"""
import base64
import math
import io
import os
import re
import sys
import xml.etree.ElementTree as ET

# คอนโซล Windows ไทยเป็น cp874 พิมพ์ข้อความไทยกับสัญลักษณ์องศาไม่ออก
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SVG = 'http://www.w3.org/2000/svg'
XLINK = 'http://www.w3.org/1999/xlink'
ET.register_namespace('', SVG)
ET.register_namespace('xlink', XLINK)

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'images', 'edit main figma', 'Frame 3.svg')
SEAL = os.path.join(ROOT, 'images', 'figma', 'outline', 'Group-23.svg')
OUT = os.path.join(ROOT, 'images', 'pricing')
BACHELORETTE = os.path.join(
    os.environ.get('LOCALAPPDATA', ''), 'Microsoft', 'Windows', 'Fonts',
    'Bachelorette_PERSONAL_USE_ONLY.ttf')

root = ET.parse(SRC).getroot()
byid = {}
for el in root.iter():
    if el.get('id') and el.get('id') not in byid:
        byid[el.get('id')] = el


def wrap(children, defs=()):
    svg = ET.Element('{%s}svg' % SVG, {
        'width': '1200', 'height': '1500', 'viewBox': '0 0 1200 1500', 'fill': 'none'})
    if defs:
        holder = ET.SubElement(svg, '{%s}defs' % SVG)
        for node in defs:
            holder.append(node)
    for node in children:
        svg.append(node)
    return svg


def write(svg, name):
    path = os.path.join(OUT, name)
    ET.ElementTree(svg).write(path, encoding='utf-8', xml_declaration=False)
    print('%-22s %8.1f KB' % (name, os.path.getsize(path) / 1024.0))


def subpath_box(sub):
    """bbox ของ subpath ที่ Figma เขียนด้วย M/C/H/V แบบพิกัดสัมบูรณ์เท่านั้น"""
    xs, ys = [], []
    for cmd, body in re.findall(r'([MCHV])([-\d.,\s]*)', sub):
        vals = [float(v) for v in re.findall(r'-?\d*\.?\d+', body)]
        if cmd in 'MC':
            xs += vals[0::2]
            ys += vals[1::2]
        elif cmd == 'H':
            xs += vals
        else:
            ys += vals
    return min(xs), min(ys), max(xs), max(ys)


# ============================================================ 1) card-back
def punch_star_through_card_body():
    """ดาว 4 แฉกกลางแถบหัวต้องเป็น "รูทะลุ" จริง

    Figma เจาะรูดาวไว้ที่ `cardtop` ชั้นเดียว แต่ `cardbotton` ที่ปูอยู่ข้างล่างไม่ได้เจาะ
    พื้นไล่สีของ cardbotton เลยโผล่ขึ้นมาอุดรูไว้ ได้ดาวทึบแทนที่จะโปร่ง
    แก้โดยก๊อป subpath ของดาวจาก cardtop มาต่อท้าย d ของ cardbotton
    (subpath ดาววนสวนทางกับกรอบนอกอยู่แล้ว nonzero จึงเจาะทะลุให้เอง ไม่ต้องแตะ fill-rule)
    """
    star = None
    for sub in byid['cardtop'].get('d').split('Z'):
        if not sub.strip():
            continue
        x0, y0, x1, y1 = subpath_box(sub)
        if x1 - x0 < 200:                                # ดาว 72×113 ไม่ใช่กรอบการ์ด 1150 กว้าง
            star = sub.strip()
    assert star, 'หา subpath ดาวใน cardtop ไม่เจอ'
    body = ET.Element(byid['cardbotton'].tag, dict(byid['cardbotton'].attrib))
    body.set('d', byid['cardbotton'].get('d') + star + 'Z')
    return body


# ลำดับเลเยอร์ตาม Figma: cardline1 → cardbotton → cardtop → cardline2 (เส้นขอบดาว)
write(wrap(
    [byid['cardline1'], punch_star_through_card_body(), byid['cardtop'], byid['cardline2']],
    [byid['paint0_linear_169_30'], byid['paint1_linear_169_30']],
), 'card-back.svg')


# =========================================================== 2) card-swirl
# cardbg ถมด้วย pattern0 ที่หมุนรูปต้นฉบับ 90 องศาแล้วครอป — คำนวณกลับเป็นภาพแบนๆ
# pattern0: use href=#image0 transform=matrix(0 -0.000725689 0.00116686 0 -0.187865 1.81422)
#   u = 0.00116686*py - 0.187865    (u,v = พิกัด 0..1 ใน bounding box ของ path)
#   v = -0.000725689*px + 1.81422
# กลับสมการ: u∈[0,1] → py 160.99..1018.13 · v∈[0,1] → px 1121.72..2500
# u โตตาม py และ v โตเมื่อ px ลดลง = หมุนภาพทวนเข็ม 90 องศาแล้วครอป
from PIL import Image, ImageChops, ImageDraw  # noqa: E402

BG_X, BG_Y, BG_W, BG_H = 86.0, 25.0, 553.0, 889.0   # bbox ของ path cardbg
SCALE = 2                                            # เก็บใหญ่ 2 เท่า ตอนวาดจึงเป็นการย่อ = คม

raw = open(SRC, encoding='utf-8').read()
b64 = re.search(r'<image id="image0_169_30"[^>]*base64,([^"]+)"', raw).group(1)
art = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGBA')
art = art.transpose(Image.ROTATE_90)                 # PIL ROTATE_90 = ทวนเข็ม
art = art.crop((161, 0, 1018, 1379))
art = art.resize((int(BG_W * SCALE), int(BG_H * SCALE)), Image.LANCZOS)

# path cardbg = สี่เหลี่ยมลบรูปรุ 9 รู (แคปซูลสูง 15 มุมโค้ง 7.5 ที่ y 231–246)
# วาดหน้ากากที่ 4 เท่าแล้วย่อ เพื่อให้ขอบรูไม่หยัก (PIL วาดแบบไม่ลบรอยหยัก)
holes = []
for sub in byid['cardbg'].get('d').split('Z'):
    if not sub.strip():
        continue
    x0, y0, x1, y1 = subpath_box(sub)
    if y1 < 300:                                     # เฉพาะรูปรุ ไม่เอากรอบนอก
        holes.append((x0, x1))
assert len(holes) == 9, holes

FINE = 4
mask = Image.new('L', (art.width * FINE, art.height * FINE), 255)
pen = ImageDraw.Draw(mask)
for left, right in holes:
    pen.rounded_rectangle(
        [(left - BG_X) * SCALE * FINE, (231.0 - BG_Y) * SCALE * FINE,
         (right - BG_X) * SCALE * FINE, (246.0 - BG_Y) * SCALE * FINE],
        radius=7.5 * SCALE * FINE, fill=0)
mask = mask.resize(art.size, Image.LANCZOS)
art.putalpha(ImageChops.multiply(art.getchannel('A'), mask))
art.save(os.path.join(OUT, 'card-swirl.webp'), 'WEBP', quality=90, method=6)
print('%-22s %8.1f KB' % ('card-swirl.webp',
                          os.path.getsize(os.path.join(OUT, 'card-swirl.webp')) / 1024.0))


# =========================================================== 3) card-front
def strip_children(group, drop_fill_prefix):
    """คัดลอก <g> โดยตัดลูกที่ถมด้วย pattern ทิ้ง (ภาพ placeholder ของ Figma)"""
    out = ET.Element(group.tag, dict(group.attrib))
    for child in group:
        if (child.get('fill') or '').startswith(drop_fill_prefix):
            continue
        out.append(child)
    return out


def mofych_outline():
    """MOFYCH ในการ์ดใช้ฟอนต์ Bachelorette ซึ่งไม่มีบนเว็บ และ SVG ที่โหลดผ่าน Image()
       ก็ดึงฟอนต์ภายนอกไม่ได้ → ถอดเป็นเส้น outline จากไฟล์ฟอนต์จริงตั้งแต่ตอน build
       ค่าทุกตัว (transform · font-size · gradient · stroke-width) ก๊อปจาก <text id="MOFYCH">"""
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.ttLib import TTFont

    node = byid['MOFYCH']
    tspan = node[0]
    size = float(node.get('font-size'))
    ox, oy = float(tspan.get('x')), float(tspan.get('y'))
    word = tspan.text

    font = TTFont(BACHELORETTE)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = size / font['head'].unitsPerEm

    commands = []
    pen_x = 0.0
    for char in word:
        name = cmap[ord(char)]
        sink = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(sink, (scale, 0, 0, -scale, ox + pen_x, oy)))
        commands.append(sink.getCommands())
        pen_x += glyphs[name].width * scale
    print('%-22s %8s  กว้าง %.1f px (Figma บอก 378.3)' % ('MOFYCH outline', '', pen_x))

    holder = ET.Element('{%s}g' % SVG, {'id': 'MOFYCH', 'transform': node.get('transform')})
    ET.SubElement(holder, '{%s}path' % SVG, {
        'd': ' '.join(c for c in commands if c),
        'fill': node.get('fill'),
        'stroke': node.get('stroke'),
        'stroke-width': node.get('stroke-width'),
        'stroke-linejoin': 'round',
    })
    return holder


def seal_group():
    """ตรา CONFIRM — ใช้ Group-23.svg ที่ถอดตัวหนังสือรอบวงเป็นเส้นไว้แล้ว
       (สี #7C2D45 ตรงกับ Frame 3 · ฟอนต์ Parastoo กับ Piazzolla ไม่มีในเครื่อง จึงถอดเองไม่ได้)

       ห้ามทาบด้วย bounding box: ตราใน Frame 3 ถูกหมุนไว้ราว 5.68 องศา bbox จึงบอกได้แค่ขนาด
       ไม่บอกมุม พอทาบด้วย bbox ตราออกมาไม่หมุนตามของเดิม
       แก้โดยจับ path1 (หัวหมา) ของทั้งสองไฟล์ ซึ่งเป็นเส้นเดียวกันและไล่จุดเรียงตรงกันทีละจุด
       แล้วแก้สมการ similarity จากจุดคู่แรกกับจุดกลางเส้น ได้ทั้งสเกล มุม และตำแหน่งพร้อมกัน"""
    def anchors(d):
        """จุดปลายของทุกคำสั่งใน path (Figma export เป็น absolute M/L/H/V/C ล้วน)"""
        out = []
        x = y = 0.0
        for cmd, body in re.findall(r'([MCHVLZ])([-\d.,\s]*)', d):
            v = [float(n) for n in re.findall(r'-?\d*\.?\d+', body)]
            if cmd in 'ML':
                for i in range(0, len(v) - 1, 2):
                    x, y = v[i], v[i + 1]
                    out.append((x, y))
            elif cmd == 'C':
                for i in range(0, len(v) - 5, 6):
                    x, y = v[i + 4], v[i + 5]
                    out.append((x, y))
            elif cmd == 'H':
                for n in v:
                    x = n
                    out.append((x, y))
            elif cmd == 'V':
                for n in v:
                    y = n
                    out.append((x, y))
        return out

    seal_root = ET.parse(SEAL).getroot()
    seal_ids = {el.get('id'): el for el in seal_root.iter() if el.get('id')}
    dst = anchors(byid['path1'].get('d'))
    src = anchors(seal_ids['path1_4'].get('d'))
    assert len(src) == len(dst), 'path1 ของสองไฟล์จุดไม่เท่ากัน (%d/%d) — Figma export เปลี่ยนรูปทรง?' % (
        len(src), len(dst))

    a, b = 0, len(src) // 2
    dp = complex(dst[b][0] - dst[a][0], dst[b][1] - dst[a][1])
    dq = complex(src[b][0] - src[a][0], src[b][1] - src[a][1])
    scale = abs(dp) / abs(dq)
    angle = math.degrees(math.atan2(dp.imag, dp.real) - math.atan2(dq.imag, dq.real))
    cos_a, sin_a = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    tx = dst[a][0] - scale * (cos_a * src[a][0] - sin_a * src[a][1])
    ty = dst[a][1] - scale * (sin_a * src[a][0] + cos_a * src[a][1])

    worst = 0.0
    for (qx, qy), (px, py) in zip(src, dst):
        worst = max(worst, math.hypot(
            scale * (cos_a * qx - sin_a * qy) + tx - px,
            scale * (sin_a * qx + cos_a * qy) + ty - py))
    print('%-22s %8s  หมุน %.4f° สเกล %.4f · คลาดเคลื่อนสูงสุด %.3f px'
          % ('stamp', '', angle, scale, worst))
    assert worst < 1.0, 'ทาบตราไม่ลง คลาดเคลื่อน %.2f px' % worst

    holder = ET.Element('{%s}g' % SVG, {
        'id': 'stamp',
        'transform': 'translate(%.4f %.4f) rotate(%.4f) scale(%.6f)' % (tx, ty, angle, scale)})
    holder.append(seal_ids['Group 23'])
    return holder


front = [
    strip_children(byid['dollframe'], 'url(#pattern'),
    byid['cardframe'],
    mofych_outline(),
    byid['bg-spin'],
    byid['Line 16'], byid['Line 22'], byid['Line 18'], byid['Line 19'], byid['Line 21'],
    byid['Line 20'], byid['Line 17'], byid['Line 17_2'],
    seal_group(),
    byid['dollframe2'],
    byid['framesticker'],
    byid['cardline3'],
]
write(wrap(front, [byid['paint2_linear_169_30'], byid['paint3_linear_169_30']]), 'card-front.svg')


# =========================================================== 4) doll-frame
# หน้าประเมินราคาเอา "กรอบสไปรท์" ใบเดียวกับบนการ์ดไปวางในคอลัมน์ขวา
# ครอปตาม bbox ของ dollframe (88, 289) 433x599 แล้วแยกเป็นสองชั้นเหมือนที่การ์ดวาง:
#     doll-frame.svg       พื้นขาวทรงมุมเว้า   → ชั้นล่าง สไปรท์วางทับได้
#     doll-frame-line.svg  เส้นขอบ + ขอบทอง   → ชั้นบน พิมพ์ทับสไปรท์อีกที
# ไม่เอา framesticker เพราะมันล้นออกนอกกรอบไปทางซ้ายถึง x -18
FRAME_X, FRAME_Y, FRAME_W, FRAME_H = 88.0, 289.0, 433.0, 599.0


def frame_svg(comment):
    el = ET.Element('{%s}svg' % SVG, {
        'width': '%.0f' % FRAME_W, 'height': '%.0f' % FRAME_H,
        'viewBox': '%.0f %.0f %.0f %.0f' % (FRAME_X, FRAME_Y, FRAME_W, FRAME_H), 'fill': 'none'})
    el.append(ET.Comment(comment))
    return el


doll = byid['dollframe']
shape = None
for child in doll:
    if child.get('d') and (child.get('fill') or '').startswith('url(#pattern'):
        shape = child.get('d')
assert shape, 'หา path ทรงกรอบใน dollframe ไม่เจอ'

fill = frame_svg(' พื้นกรอบใส่สไปรท์ — ทรงเดียวกับบนการ์ด (path ของ dollframe) ')
ET.SubElement(fill, '{%s}path' % SVG, {'d': shape, 'fill': '#FFFFFF'})
write(fill, 'doll-frame.svg')

line = frame_svg(' เส้นขอบกรอบสไปรท์ — dollframe (ขอบมุมเว้า) + dollframe2 (ขอบทอง) พิมพ์ทับสไปรท์ ')
line.append(strip_children(doll, 'url(#pattern'))
line.append(byid['dollframe2'])
write(line, 'doll-frame-line.svg')
