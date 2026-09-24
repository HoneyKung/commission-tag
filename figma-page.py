#!/usr/bin/env python3
"""ประกอบ index.html จาก index.template.html โดยแทนที่มาร์กเกอร์ด้วยเนื้อ SVG จริง

    python figma-page.py

มาร์กเกอร์ในเทมเพลต — วางบรรทัดเดียว ใส่ path เทียบรากโปรเจกต์:

    <!--@ images/figma/lite/main/layers/23_rope.svg -->

ถ้าต่อท้ายด้วย 4 ตัวเลข = ครอป viewBox ให้เหลือเฉพาะกล่องนั้น (x y w h จาก Figma)
ใช้กับชิ้นที่ต้องอยู่ใน layout แบบไหล (บล็อกค้นหา) ซึ่งวางแบบเต็มเฟรมไม่ได้:

    <!--@ images/figma/parts/lookup-main/Subtract.svg | 725 2252 470.7 40.8 -->

ทำไมต้อง inline ไม่ใช้ <img>: animation-list ข้อ 8 บังคับว่าเชือก/ดาว/เส้นทอง/
ตัวนับ/ปุ่ม/การ์ดรูป ต้องเป็นโหนดจริงที่ JS แก้ได้ — <img> แตะข้างในไม่ได้
ส่วนงานอาร์ตที่ขยับด้วย transform เฉยๆ ยังใช้ <img> ตามเดิม (ดูเทมเพลต)

⚠ id ใน SVG ที่ Figma export มาซ้ำกันข้ามไฟล์ (paint0_linear_0_1 ฯลฯ)
พอ inline หลายไฟล์ในหน้าเดียว gradient/mask จะไปดึงของไฟล์อื่น ภาพเพี้ยน
→ สคริปต์นี้เติมท้าย id เฉพาะตัวที่ "ถูกอ้างถึง" (url(#..) / href="#..") ให้ไม่ซ้ำ
   ส่วน id ที่เป็นชื่อเลเยอร์ (rope / Group 20 / Star 3) ปล่อยไว้เหมือนเดิม
   จะได้ยังอ้างอิงตามชื่อใน Figma ได้
"""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent
MARK = re.compile(r'^([ \t]*)<!--@\s*(\S+?)\s*(?:\|\s*([-\d. ]+?)\s*)?(@notext)?\s*-->[ \t]*$', re.M)
TEXT_EL = re.compile(r'<text\b.*?</text>', re.S)
REF = re.compile(r'url\(#([^)]+)\)|(?:xlink:)?href="#([^"]+)"')


def inline(svg_path: Path, tag: str, crop: str = None, notext: bool = False) -> str:
    txt = svg_path.read_text(encoding="utf-8")

    # ตัว <text> ในไฟล์ export เอาไว้ดูพิกัดเฉยๆ — บนหน้าเว็บใช้ข้อความ HTML จริงแทน
    # (ยกเว้นงานอาร์ตที่เจ้าของงานระบุ: MOFYCH / ตั๋วในฟอร์ม / ตรา / ชื่อสินค้าหน้า product)
    if notext:
        txt = TEXT_EL.sub("", txt)

    # 1) หา id ที่มีคนอ้างถึงจริง แล้วเติมท้ายให้ไม่ซ้ำข้ามไฟล์
    used = {m.group(1) or m.group(2) for m in REF.finditer(txt)}
    for rid in sorted(used, key=len, reverse=True):
        new = f"{rid}--{tag}"
        txt = txt.replace(f'id="{rid}"', f'id="{new}"')
        txt = txt.replace(f"url(#{rid})", f"url(#{new})")
        txt = txt.replace(f'href="#{rid}"', f'href="#{new}"')

    # 2) path ของรูปข้างใน SVG เขียนไว้เทียบโฟลเดอร์ของไฟล์ SVG
    #    พอย้ายมาอยู่ใน index.html ต้องแก้ให้เทียบรากโปรเจกต์แทน
    base = svg_path.parent.relative_to(ROOT).as_posix()

    def fix_href(m):
        attr, val = m.group(1), m.group(2)
        if val.startswith(("#", "data:", "http", "/")):
            return m.group(0)
        rel = (Path(base) / val).as_posix()
        while "/../" in rel:
            rel = re.sub(r"[^/]+/\.\./", "", rel, count=1)
        return f'{attr}="{rel}"'

    txt = re.sub(r'((?:xlink:)?href)="([^"]+)"', fix_href, txt)

    # 3) ตัด width/height ทิ้ง ให้ CSS คุมขนาดแทน (viewBox ยังเท่าเฟรมเต็มเหมือนเดิม)
    txt = re.sub(r'<svg([^>]*?)\s+width="[^"]*"', r"<svg\1", txt, count=1)
    txt = re.sub(r'<svg([^>]*?)\s+height="[^"]*"', r"<svg\1", txt, count=1)

    # 4) ครอป — ใช้กับชิ้นที่ต้องอยู่ใน layout แบบไหล จึงกางเต็มเฟรมไม่ได้
    cls = "ly"
    if crop:
        nums = crop.split()
        if len(nums) != 4:
            raise ValueError(f"crop ต้องมี 4 ตัวเลข: {svg_path} → {crop!r}")
        txt = re.sub(r'viewBox="[^"]*"', f'viewBox="{" ".join(nums)}"', txt, count=1)
        cls = "ly ly--crop"

    txt = txt.replace("<svg ", f'<svg class="{cls}" aria-hidden="true" focusable="false" ', 1)
    return txt.strip()


def main():
    tpl = ROOT / "index.template.html"
    if not tpl.exists():
        print("!! ไม่เจอ index.template.html")
        return 1
    src = tpl.read_text(encoding="utf-8")
    seen, missing, count = {}, [], 0

    def sub(m):
        nonlocal count
        indent, rel, crop, notext = m.group(1), m.group(2), m.group(3), bool(m.group(4))
        p = ROOT / rel
        if not p.exists():
            missing.append(rel)
            return f'{indent}<!-- !! ไม่เจอไฟล์: {rel} -->'
        # ชื่อย่อสำหรับเติมท้าย id — กันชนกันเองด้วยตัวนับ
        stem = re.sub(r"[^0-9A-Za-z]+", "", p.stem)[-14:].lower() or "ly"
        seen[stem] = seen.get(stem, 0) + 1
        tag = stem if seen[stem] == 1 else f"{stem}{seen[stem]}"
        count += 1
        body = inline(p, tag, crop, notext)
        return "\n".join(indent + ln for ln in body.splitlines())

    out = MARK.sub(sub, src)
    header = ("<!-- ไฟล์นี้ถูกสร้างด้วย figma-page.py — แก้ที่ index.template.html แล้วรันใหม่\n"
              "     python figma-page.py  -->\n")
    (ROOT / "index.html").write_text(header + out, encoding="utf-8")
    size = (ROOT / "index.html").stat().st_size
    print(f"ฝัง SVG {count} ไฟล์ → index.html  ({size/1024:.0f} KB)")
    for m in missing:
        print("  !! ไม่เจอ:", m)
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
