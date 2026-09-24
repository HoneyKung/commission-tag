#!/usr/bin/env python3
"""
เตรียมไฟล์ SVG ของ hero จากไฟล์ที่ export มาจาก Figma

รับเข้า (วางไว้ใน images/hero/):
    Frame 2 outline.svg     ฉากหลัก   (ต้อง export แบบ Outline text)
    Frame 2-menu.svg        ฉากเมนู

ผลิตออก (images/hero/):
    art/*.png|jpg           รูปที่ฝังมาใน SVG แยกออกเป็นไฟล์นอก
    hero-<scene>-below.svg  ชั้นภาพที่อยู่ "ใต้" กระดาษฟอร์ม
    hero-<scene>-paper.svg  กระดาษฟอร์ม + กรอบทอง (ไม่เอาเนื้อในที่ Figma ร่างไว้)
    hero-<scene>-above.svg  ชั้นภาพที่อยู่ "เหนือ" กระดาษฟอร์ม (ปากกา ตรา การ์ด เชือก ฯลฯ)

ทำไมต้องแยก 3 ชั้น: กระดาษฟอร์มมีปากกา/ตราปั๊ม/การ์ดตุ๊กตาทับอยู่ข้างบน
ถ้ายกฟอร์มออกมาเป็นชั้นเดียวบนสุด มันจะไปบังของที่ควรอยู่หน้ามัน
พอแยกแล้วเอา "กล่องฟอร์ม" (กระดาษ + ช่องกรอก HTML) แทรกกลางได้พอดี
และกระดาษกับเนื้อในอยู่ในกล่องเดียวกัน → ขยับทีเดียวไปพร้อมกันเสมอ

วิธีใช้:
    python prepare-hero-svg.py
    python build-hero-art.py      # แล้วยัดเข้า index.html
"""
import base64
import re
import sys
from pathlib import Path

HERO = Path(__file__).parent / 'images' / 'hero'
ART = HERO / 'art'
VIEW_W, VIEW_H = 2560, 1899

SCENES = [
    ('main', 'Frame 2 outline.svg', 'Frame 2'),
    ('menu', 'Frame 2-menu.svg', 'Frame 2-menu'),
]

# ตั้งชื่อไฟล์รูปให้อ่านออก แทนชื่อ imageN_0_1 ของ Figma
NICE = {
    'bg2': 'nebula-bg2', 'bg1': 'nebula-bg1', 'clound2': 'cloud-top',
    'clound1': 'cloud-left', 'pen': 'pen', 'stampink': 'card-back',
}


def extract_images(svg: str) -> str:
    """ดึงรูป base64 ที่ฝังใน SVG ออกเป็นไฟล์นอก แล้วเปลี่ยน href ให้ชี้ไฟล์"""
    pat2img = {}
    for m in re.finditer(r'<pattern id="([^"]+)"[^>]*>(.*?)</pattern>', svg, re.S):
        u = re.search(r'(?:xlink:)?href="#([^"]+)"', m.group(2))
        if u:
            pat2img[m.group(1)] = u.group(1)

    users = {}
    for m in re.finditer(r'<(?:rect|path|g|use)\b([^>]*?)/?>', svg):
        a = m.group(1)
        f = re.search(r'fill="url\(#(pattern[^)]+)\)"', a)
        i = re.search(r'id="([^"]*)"', a)
        if f and i and pat2img.get(f.group(1)):
            users.setdefault(pat2img[f.group(1)], []).append(i.group(1))

    # รูปไหนเป็นรูปสินค้าในกรอบขรุขระ → ไม่เอาขึ้นเว็บ ให้ JS ยัดรูปจริงแทน
    # หมายเหตุ: id อยู่ที่ <g id="Rectangle 21"> แต่ fill="url(#pattern…)"
    # อยู่ที่ <path> ข้างใน จึงต้องมองเข้าไปในบล็อกของกลุ่ม ไม่ใช่ดูแค่แท็กเดียว
    slot_of = {}
    for gid, slot in THUMB_SLOTS.items():
        g = re.search(r'<g id="%s"[^>]*>' % re.escape(gid), svg)
        if not g:
            continue
        depth, end = 1, len(svg)
        for m in re.finditer(r'<(/?)g\b[^>]*?(/?)>', svg[g.end():]):
            if m.group(2) == '/':
                continue
            depth += -1 if m.group(1) else 1
            if depth == 0:
                end = g.end() + m.start()
                break
        f = re.search(r'fill="url\(#(pattern[^)]+)\)"', svg[g.end():end])
        if f and pat2img.get(f.group(1)):
            slot_of[pat2img[f.group(1)]] = slot
    print(f'  กรอบใส่รูปสินค้า: {len(slot_of)} ช่อง -> {sorted(slot_of.items(), key=lambda kv: kv[1])}')

    def repl(m):
        iid, fmt, data = m.group('id'), m.group('fmt'), m.group('data')
        if iid in slot_of:
            # ถอดรูปที่ Figma ฝังมาทิ้ง เหลือไว้แค่ช่องเปล่าให้ JS เติม
            tagged = m.group(0).replace(f'data:image/{fmt};base64,{data}', '')
            return tagged.replace('<image ', f'<image data-product-slot="{slot_of[iid]}" ', 1)
        who = [u for u in users.get(iid, []) if u]
        base = who[0] if who else iid
        name = NICE.get(base) or re.sub(r'[^A-Za-z0-9_-]+', '-', base).strip('-').lower() or iid
        fn = f"{name}.{'jpg' if fmt == 'jpeg' else fmt}"
        (ART / fn).write_bytes(base64.b64decode(data))
        return m.group(0).replace(f'data:image/{fmt};base64,{data}', f'images/hero/art/{fn}')

    pat = re.compile(r'<image[^>]*?id="(?P<id>[^"]+)"[^>]*?href="data:image/(?P<fmt>[a-z]+);base64,'
                     r'(?P<data>[^"]+)"[^>]*?/?>')
    svg = pat.sub(repl, svg)

    # ติดป้ายวงกลมติ๊กขรุขระ ให้ JS หาเจอ (Ellipse 25/26/28 = ช่อง 1/2/3)
    for eid, slot in (('Ellipse 25', 1), ('Ellipse 26', 2), ('Ellipse 28', 3)):
        svg = svg.replace(f'id="{eid}"', f'id="{eid}" data-check-slot="{slot}"', 1)
    return svg


def split_children(svg: str, group_id: str):
    """คืน (ชิ้นก่อน Form, ชิ้น Form, ชิ้นหลัง Form) เป็นสตริง XML ดิบ"""
    open_tag = re.search(r'<g id="%s"[^>]*>' % re.escape(group_id), svg)
    start = open_tag.end()
    depth, end = 1, None
    for m in re.finditer(r'<(/?)g\b[^>]*?(/?)>', svg[start:]):
        if m.group(2) == '/':
            continue
        depth += -1 if m.group(1) else 1
        if depth == 0:
            end = start + m.start()
            break
    body = svg[start:end]

    # ไล่ลูกชั้นแรก
    kids, depth, cur = [], 0, 0
    for m in re.finditer(r'<(/?)(g|rect|path|line|circle|ellipse|image|text)\b[^>]*?(/?)>', body):
        close, tag, selfclose = m.group(1), m.group(2), m.group(3)
        if depth == 0 and not close:
            if selfclose or tag in ('rect', 'line', 'image', 'circle', 'ellipse'):
                kids.append((cur, m.end(), body[m.start():m.end()]))
                cur = m.end()
                continue
            depth, open_at = 1, m.start()
            continue
        if not close and not selfclose:
            depth += 1
        elif close:
            depth -= 1
            if depth == 0:
                kids.append((cur, m.end(), body[open_at:m.end()]))
                cur = m.end()

    before, form, after = [], '', []
    seen_form = False
    for _, _, chunk in kids:
        if chunk.startswith('<g id="Form"'):
            form, seen_form = chunk, True
        elif seen_form:
            after.append(chunk)
        else:
            before.append(chunk)
    return '\n'.join(before), form, '\n'.join(after)


def namespace_defs(defs: str, body: str, suffix: str):
    """เติมท้าย id ที่ประกาศใน <defs> กันชนกันเวลามี SVG หลายอันในหน้าเดียว"""
    ids = set(re.findall(r'<(?:linearGradient|radialGradient|pattern|image|clipPath|mask|filter|symbol)'
                         r'[^>]*?\sid="([^"]+)"', defs))
    if not ids:
        return defs, body
    pattern = re.compile(r'(?<=[#"])(' + '|'.join(re.escape(i) for i in sorted(ids, key=len, reverse=True)) + r')(?=["\)])')

    def sub(text):
        text = re.sub(r'\sid="(' + '|'.join(re.escape(i) for i in ids) + r')"',
                      lambda m: f' id="{m.group(1)}{suffix}"', text)
        text = re.sub(r'url\(#([^)]+)\)',
                      lambda m: f'url(#{m.group(1)}{suffix})' if m.group(1) in ids else m.group(0), text)
        text = re.sub(r'((?:xlink:)?href)="#([^"]+)"',
                      lambda m: f'{m.group(1)}="#{m.group(2)}{suffix}"' if m.group(2) in ids else m.group(0), text)
        return text
    return sub(defs), sub(body)


# ชิ้นใน Group 21 ที่ตัดทิ้ง = "ตัวหนังสือ" เท่านั้น
#   (id ภาษาไทยถูก encode เป็น &#224;… / ภาษาอังกฤษระบุชื่อตรงๆ)
#
# งานอาร์ตทุกชิ้นเก็บไว้หมด — กล่องลายมือ (Rectangle 20/23/24/25/26),
# กรอบขรุขระใส่รูปสินค้า (Rectangle 21/22) และวงกลมติ๊กขรุขระ (Ellipse 25-28)
# เส้นหยาบๆ พวกนั้นคือดีไซน์ ห้ามวาดใหม่ด้วย CSS ทับ
#
# กรอบ Rectangle 21/22 ใช้เป็น "ช่องใส่รูป" — รูปข้างในถูกถอดออก
# แล้วให้ JS เอารูปสินค้าจริงจากข้อมูลยัดเข้าไปแทน (ดู hero.js)
# ไม่งั้นต้องแบกรูปตุ๊กตาที่ Figma ฝังมาอีก 5 MB ทั้งที่เว็บมีรูปเดียวกันอยู่แล้ว
DROP_TEXT_IDS = {'Cotton Doll', 'Coolie 3D Print'}
DROP_ART_IDS = set()

# กรอบใส่รูปสินค้า → ช่องที่เท่าไหร่ (JS ใช้ data-product-slot หาเจอ)
THUMB_SLOTS = {'Rectangle 21': 1, 'Rectangle 22': 2}


def strip_form_content(form: str):
    """ตัดตัวหนังสือกับรูปสินค้าออกจาก Group 21 แต่เก็บกล่องลายมือไว้ทั้งหมด"""
    g = re.search(r'<g id="Group 21"[^>]*>', form)
    if not g:
        return form, []
    start = g.end()
    depth, end = 1, len(form)
    for m in re.finditer(r'<(/?)g\b[^>]*?(/?)>', form[start:]):
        if m.group(2) == '/':
            continue
        depth += -1 if m.group(1) else 1
        if depth == 0:
            end = start + m.start()
            break
    inner = form[start:end]

    kept, dropped, depth, open_at, cur = [], [], 0, 0, 0
    for m in re.finditer(r'<(/?)(g|path|rect|line|circle|ellipse|text|image)\b[^>]*?(/?)>', inner):
        close, tag, selfclose = m.group(1), m.group(2), m.group(3)
        if depth == 0 and not close:
            if selfclose or tag in ('rect', 'line', 'image', 'circle', 'ellipse', 'path'):
                chunk, cur = inner[cur:m.end()], m.end()
            else:
                depth, open_at = 1, m.start()
                continue
        else:
            if not close and not selfclose:
                depth += 1
                continue
            if not close:
                continue
            depth -= 1
            if depth != 0:
                continue
            chunk, cur = inner[cur:m.end()], m.end()
        idm = re.search(r'id="([^"]*)"', chunk)
        cid = idm.group(1) if idm else ''
        if cid.startswith('&#') or cid in DROP_TEXT_IDS or cid in DROP_ART_IDS:
            dropped.append(cid[:20] if not cid.startswith('&#') else '(ไทย)')
        else:
            kept.append(chunk)
    return form[:start] + '\n'.join(kept) + form[end:], dropped


HEAD = ('<svg viewBox="0 0 %d %d" fill="none" xmlns="http://www.w3.org/2000/svg" '
        'xmlns:xlink="http://www.w3.org/1999/xlink">' % (VIEW_W, VIEW_H))


def shrink(svg: str) -> str:
    """ตัดทศนิยมที่ Figma ใส่มาเกินจำเป็น (6-7 ตำแหน่ง) เหลือ 2 ตำแหน่ง
    ที่สเกลจริง 1 design px ยุบเหลือ ~0.4 px บนจอ FullHD ทศนิยม 2 ตำแหน่ง
    จึงละเอียดกว่าที่ตาเห็นหลายเท่า แต่ลดขนาดไฟล์ได้ราว 35%"""
    def num(m):
        v = float(m.group(0))
        # ⚠ ห้ามแตะเลขที่เล็กกว่า 1
        # ค่าสเกลของ pattern ใน Figma เป็นเลขจิ๋วอย่าง 0.00106383
        # ถ้าตัดเหลือ 2 ตำแหน่งจะกลายเป็น 0 → รูปถูกย่อจนหายทั้งภาพ
        if abs(v) < 1:
            return m.group(0)
        s = f'{v:.2f}'.rstrip('0').rstrip('.')
        return s if s not in ('', '-0') else '0'
    # เลขธรรมดา (ไม่ยุ่งกับ scientific notation ที่ Figma ใช้ในเมทริกซ์)
    svg = re.sub(r'-?\d+\.\d{3,}(?![eE\d])', num, svg)
    # ช่องว่างซ้ำ + บรรทัดว่าง
    svg = re.sub(r'\n\s*\n', '\n', svg)
    return svg


def trim_defs(defs: str, body: str) -> str:
    """เก็บเฉพาะ <defs> ที่ไฟล์นี้ใช้จริง

    Figma ใส่ defs ทั้งก้อน (gradient/pattern/image หลายร้อยตัว) มาให้
    พอแยกเป็น 3 ชั้นแล้วก๊อปทั้งก้อนไปทุกไฟล์ index.html จะพองโดยเปล่าประโยชน์
    """
    kids = []
    depth, open_at = 0, 0
    inner = re.sub(r'^<defs>|</defs>$', '', defs.strip(), flags=re.S)
    for m in re.finditer(r'<(/?)(\w+)\b[^>]*?(/?)>', inner):
        close, tag, selfclose = m.group(1), m.group(2), m.group(3)
        if depth == 0 and not close:
            if selfclose:
                kids.append(inner[m.start():m.end()])
                continue
            depth, open_at = 1, m.start()
        elif not close and not selfclose:
            depth += 1
        elif close:
            depth -= 1
            if depth == 0:
                kids.append(inner[open_at:m.end()])

    by_id = {}
    for k in kids:
        m = re.search(r'\sid="([^"]+)"', k)
        if m:
            by_id[m.group(1)] = k

    def refs(text):
        return set(re.findall(r'url\(#([^)]+)\)', text)) | set(re.findall(r'(?:xlink:)?href="#([^"]+)"', text))

    need, queue = set(), list(refs(body))
    while queue:
        r = queue.pop()
        if r in need or r not in by_id:
            continue
        need.add(r)
        queue.extend(refs(by_id[r]))

    kept = [by_id[i] for i in by_id if i in need]
    return '<defs>\n' + '\n'.join(kept) + '\n</defs>' if kept else ''


def write(name: str, defs: str, body: str, suffix: str):
    defs, body = namespace_defs(defs, body, suffix)
    defs = trim_defs(defs, body)
    out = shrink(f'{HEAD}\n{body}\n{defs}\n</svg>\n')
    (HERO / name).write_text(out, encoding='utf-8')
    print(f'  {name:<28} {len(out.encode()):>9,} B')


def main() -> int:
    ART.mkdir(parents=True, exist_ok=True)
    for scene, src, group in SCENES:
        path = HERO / src
        if not path.exists():
            print(f'ไม่เจอ {src}', file=sys.stderr)
            return 1
        print(f'\n=== ฉาก {scene} ({src}) ===')
        svg = extract_images(path.read_text(encoding='utf-8'))
        defs_m = re.search(r'<defs>.*</defs>', svg, re.S)
        defs = defs_m.group(0) if defs_m else ''
        before, form, after = split_children(svg, group)

        form_paper, dropped = strip_form_content(form)
        print(f'  ตัดออกจาก Group 21: {len(dropped)} ชิ้น -> {", ".join(dropped[:8])}')

        write(f'hero-{scene}-below.svg', defs, before, f'__{scene}b')
        write(f'hero-{scene}-paper.svg', defs, form_paper, f'__{scene}p')
        write(f'hero-{scene}-above.svg', defs, after, f'__{scene}a')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
