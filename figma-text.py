#!/usr/bin/env python3
"""ดึงพิกัดของ <text> ทุกตัวจากไฟล์ที่ Figma export แล้วเขียนเป็น figma-text.css

    python figma-text.py

ทำไมต้องมี: เจ้าของงานสั่งว่า **ข้อความบนเว็บต้องเป็น text จริง ไม่ใช่งานอาร์ต**
(ยกเว้น MOFYCH / ข้อความในตั๋วในฟอร์ม / ข้อความในตรา / ชื่อสินค้าหน้า product)
→ ต้องเอาข้อความออกจาก SVG แล้ววาง <span> ทับให้ตรงที่เดิมเป๊ะ

พิกัดทุกค่ามาจาก attribute ในไฟล์ export ตรงๆ ไม่มีการกะ ไม่มีการปัด:
    <text transform="translate(X Y) rotate(R)" font-size="F" fill="C">
      <tspan x="tx" y="ty">…</tspan>
โครงที่ได้: กล่องนอกอยู่ที่ (X,Y) หมุน R องศา · ตัวอักษรอยู่ที่ (tx, ty) ในกล่องนั้น
ty คือ "เส้นบรรทัด" (baseline) ส่วน CSS วัดจากขอบบน → ลบระยะ baseline ของฟอนต์ออก

ผลลัพธ์ใช้แบบนี้:
    <span class="tx" data-t="ชื่อ-main">ชื่อ :</span>
"""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(__file__).resolve().parent

TEXT_RE = re.compile(r"<text\b([^>]*)>(.*?)</text>", re.S)
TSPAN_RE = re.compile(r'<tspan\b([^>]*)>(.*?)</tspan>', re.S)
ATTR = lambda s, k: (re.search(rf'{k}="([^"]*)"', s) or [None, None])[1]

# Kanit ใน Chrome: กล่องบรรทัด = 1.4933em · baseline = 1.12em จากขอบบน
# (วัดจากเบราว์เซอร์จริง ไม่ใช่ค่าจากสเปกฟอนต์)
BASELINE = 1.12

# ไฟล์ที่ต้องดึงข้อความออกมา : ชื่อย่อไว้ตั้ง data-t
SOURCES = [
    ("main", "images/figma/main-web/layers/12_ฝากแทคงาน-Commission.svg"),
    ("main", "images/figma/main-web/layers/13_แจ้งเตือนผ่าน-Email-อัตโนมัติเมื่อเปิดรอบใหม่.svg"),
    ("main", "images/figma/main-web/layers/14_button_2.svg"),
    ("main", "images/figma/main-web/layers/29_Group-74.svg"),
    ("main", "images/figma/main-web/layers/30_Group-75.svg"),
    ("form", "images/figma/parts/form/Group-55.svg"),
    ("form", "images/figma/parts/form/Group-57_2.svg"),
    ("form", "images/figma/parts/form/Group-63.svg"),
    ("form", "images/figma/parts/form/Group-64.svg"),
    ("form", "images/figma/main-web/layers/16_form-card-3degreerotate.svg"),
    ("lookup", "images/figma/parts/main/Group-72.svg"),
    ("lookupfull", "images/figma/menu-web/layers/29_Group-73.svg"),
    ("menu", "images/figma/menu-web/layers/25_Group-40.svg"),
    ("menu", "images/figma/menu-web/layers/26_Group-41.svg"),
    ("menu", "images/figma/menu-web/layers/27_Group-42.svg"),
    ("menu", "images/figma/menu-web/layers/28_Group-43.svg"),
    ("dock", "images/figma/parts/main/Group-40.svg"),
    ("dock", "images/figma/parts/main/Group-41.svg"),
    ("dock", "images/figma/parts/main/Group-42.svg"),
    ("dock", "images/figma/parts/main/Group-43.svg"),
    ("formmenu", "images/figma/parts/form-menu/Group-55.svg"),
    ("formmenu", "images/figma/parts/form-menu/Group-57.svg"),
    ("formmenu", "images/figma/parts/form-menu/Group-63.svg"),
    ("formmenu", "images/figma/parts/form-menu/Group-64.svg"),
    ("formmenu", "images/figma/menu-web/layers/13_form-card-3degreerotate.svg"),
]

# กลุ่มที่เจ้าของงานสั่งให้คงเป็นงานอาร์ต — ข้ามไป ไม่ต้องทำเป็น text
SKIP_TEXT = {"Cotton Doll", "Cookie", "3D Print", "MOFYCH", "COMFIRM",
             "SELECT HERE", "โดย Nytan.Cha", "admin"}


def num(v, d=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return d


def parse(path: Path, scope: str):
    txt = path.read_text(encoding="utf-8")
    rows = []
    for m in TEXT_RE.finditer(txt):
        at, inner = m.group(1), m.group(2)
        tid = ATTR(at, "id") or ""
        base = re.sub(r"_\d+$", "", tid)
        if base in SKIP_TEXT or base.startswith("[Copy]"):
            continue
        tr = ATTR(at, "transform") or ""
        mt = re.search(r"translate\(([-\d.]+)[ ,]+([-\d.]+)\)", tr)
        mr = re.search(r"rotate\(([-\d.]+)\)", tr)
        ox, oy = (num(mt.group(1)), num(mt.group(2))) if mt else (0.0, 0.0)
        rot = num(mr.group(1)) if mr else 0.0
        fs = num(ATTR(at, "font-size"), 16)
        fill = ATTR(at, "fill") or "black"
        underline = "underline" in at
        weight = ATTR(at, "font-weight")
        family = ATTR(at, "font-family") or "Kanit"

        spans = []
        for s in TSPAN_RE.finditer(inner):
            sat, body = s.group(1), s.group(2)
            spans.append({
                "x": num(ATTR(sat, "x")),
                "y": num(ATTR(sat, "y")),
                "text": re.sub(r"\s+", " ", body).strip(),
            })
        if not spans:
            continue
        # บาง <text> ไม่มี transform — Figma เขียนพิกัดจริงไว้ที่ tspan แทน
        # ย้ายมาเป็นจุดอ้างอิงของกล่องนอก จะได้คิดแบบเดียวกันหมด
        if not mt:
            ox, oy = spans[0]["x"], spans[0]["y"]
            for sp in spans:
                sp["x"] -= ox
                sp["y"] -= oy
        rows.append({
            "scope": scope, "id": tid, "ox": ox, "oy": oy, "rot": rot,
            "fs": fs, "fill": fill, "underline": underline,
            "weight": weight, "family": family, "spans": spans,
            "src": path.name,
        })
    return rows


def slugify(s):
    s = re.sub(r"[\s/]+", "-", s.strip())
    return re.sub(r"[^0-9A-Za-z฀-๿._+-]", "", s) or "t"


def main():
    out = ["""/* ============================================================
   ตำแหน่งข้อความ — สร้างด้วย figma-text.py ห้ามแก้ด้วยมือ
   ทุกค่ามาจาก attribute ของ <text> ในไฟล์ที่ Figma export ไม่มีการกะเอง

     กล่องนอก (.tx)        = translate() ของ <text>  + rotate()
     ตัวอักษร (.tx > span) = tspan x, y  โดย y เป็น baseline
                             → top = y - (font-size x 1.12) ระยะ baseline ของ Kanit

   แก้ข้อความ/เพิ่มบรรทัด ให้ไปแก้ที่ index.template.html แล้วรัน figma-page.py
   ============================================================ */

.tx {
    position: absolute;
    transform-origin: 0 0;
    white-space: pre;
    line-height: normal;
    pointer-events: none;
}

.tx>span {
    position: absolute;
    display: block;
    /* nowrap ไม่ใช่ pre — ขึ้นบรรทัดใหม่ในไฟล์ HTML ต้องไม่กลายเป็นการตัดบรรทัดจริง
       ดีไซน์ที่มีหลายบรรทัดจะแยกเป็นหลาย tspan (= หลาย span) อยู่แล้ว */
    white-space: nowrap;
}
"""]
    index = []
    seen = {}
    for scope, rel in SOURCES:
        p = ROOT / rel
        if not p.exists():
            print("!! ไม่เจอ:", rel)
            continue
        for r in parse(p, scope):
            key = slugify(r["id"]) + "-" + scope
            seen[key] = seen.get(key, 0) + 1
            if seen[key] > 1:
                key += str(seen[key])
            # --ax / --ay = พิกัดดิบจาก Figma เก็บไว้ให้บล็อกที่ต้องวางแบบไหล
            # (บล็อกค้นหามี 5 สถานะ ความสูงเปลี่ยน → คำนวณ top เทียบกล่องแม่แทน)
            rules = [f"--ax:{r['ox']:g}px", f"--ay:{r['oy']:g}px",
                     f"left:{r['ox']:g}px", f"top:{r['oy']:g}px",
                     f"font-family:'{r['family']}',sans-serif",
                     f"font-size:{r['fs']:g}px", f"color:{r['fill']}"]
            if r["rot"]:
                rules.append(f"transform:rotate({r['rot']:g}deg)")
            if r["weight"]:
                rules.append(f"font-weight:{r['weight']}")
            if r["underline"]:
                rules.append("text-decoration:underline")
            out.append(f'\n/* {r["src"]} — «{r["spans"][0]["text"][:40]}» */')
            out.append('[data-t="%s"] { %s; }' % (key, "; ".join(rules)))
            for i, sp in enumerate(r["spans"]):
                top = sp["y"] - r["fs"] * BASELINE
                sel = f'[data-t="{key}"]>span'
                if len(r["spans"]) > 1:
                    sel += f":nth-child({i + 1})"
                out.append('%s { left:%gpx; top:%gpx; }' % (sel, sp["x"], round(top, 3)))
            index.append((key, r["spans"][0]["text"], r["src"]))

    (ROOT / "figma-text.css").write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"เขียน figma-text.css — ข้อความ {len(index)} ชิ้น\n")
    for k, t, src in index:
        print(f'  data-t="{k}"'.ljust(52), f"«{t[:44]}»")


if __name__ == "__main__":
    main()
