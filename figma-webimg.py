#!/usr/bin/env python3
"""ทำรูปเวอร์ชันเว็บจาก SVG ที่ export มาจาก Figma

หลักการ: ความชัดมาจาก "ขนาดที่ส่ง = ขนาดที่แสดงจริง x 2 (จอ Retina)"
ไม่ใช่จากไฟล์ใหญ่ — รูปสินค้าโชว์ที่ 669px แต่ต้นฉบับ 3456px คือใหญ่เกินไป 5 เท่าเปล่าๆ

ทำ 3 อย่าง
  1. ย่อรูปตามขนาดที่แสดงจริง x 2 แล้วเข้ารหัสเป็น AVIF + WebP เก็บไว้ที่ <dest>/web/
  2. สร้างชุดเลเยอร์ใหม่ที่ฝัง WebP ที่ย่อแล้วแทนของเดิม → <dest>/layers/ (เปิดผ่าน <img> ได้เลย)
  3. เก็บต้นฉบับไว้เหมือนเดิม ไม่แตะ

    python figma-webimg.py "images/main figma/Frame 2.svg" images/figma/main-web
"""
import base64
import hashlib
import io
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image

# ใช้ตัวช่วยชุดเดียวกับ figma-svg.py (ชื่อไฟล์มีขีดกลาง import ตรงๆ ไม่ได้)
import importlib.util
_spec = importlib.util.spec_from_file_location("figma_svg", Path(__file__).with_name("figma-svg.py"))
_fs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_fs)
S, HREF, load, local = _fs.S, _fs.HREF, _fs.load, _fs.local
needed_defs, build_defs_index = _fs.needed_defs, _fs.build_defs_index
make_layer_svg, safe_name = _fs.make_layer_svg, _fs.safe_name

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DPR = 2          # เผื่อจอ Retina
WEBP_Q = 82
AVIF_Q = 62
FALLBACK_EDGE = 1200   # ถ้าวัดขนาดที่แสดงจริงไม่ได้

# ชิ้นที่ fill ลงบน <path> จึงไม่มี width/height ให้อ่าน — ใส่ขนาดจาก figma-layout-spec.md
DISPLAY_OVERRIDE = {
    "image7_0_1": (290, 309),   # รูปในการ์ด image3 (ใบใหญ่สุด 289.8 x 309)
    "image8_0_1": (70, 34),     # เทปกาวบนการ์ด (69.2 x 33.7)
}


def pattern_to_image(defs):
    """pattern -> image id  (Figma เขียนได้ทั้งแบบ <use href> และแบบ <image> ซ้อนใน pattern)"""
    m = {}
    for p in defs.iter(S("pattern")):
        pid = p.get("id")
        for u in p.iter(S("use")):
            h = u.get(HREF) or u.get("href") or ""
            if h.startswith("#"):
                m[pid] = h[1:]
        if pid not in m:
            for im in p.iter(S("image")):
                if im.get("id"):
                    m[pid] = im.get("id")
    return m


def measure_usage(root, pat2img):
    """ไล่ดูว่า pattern แต่ละอันถูกใช้บนกล่องขนาดเท่าไหร่ เก็บอันที่ใหญ่ที่สุด"""
    sizes = {}
    for el in root.iter():
        for attr in ("fill", "stroke"):
            v = el.get(attr) or ""
            mm = re.match(r"url\(#(.+)\)$", v)
            if not mm:
                continue
            img = pat2img.get(mm.group(1))
            if not img:
                continue
            try:
                w, h = float(el.get("width")), float(el.get("height"))
            except (TypeError, ValueError):
                continue
            pw, ph = sizes.get(img, (0, 0))
            sizes[img] = (max(pw, w), max(ph, h))
    return sizes


def target_size(src_w, src_h, disp):
    """ปกรูปจะถูก 'cover' ลงในกล่อง → ตัวคูณคือด้านที่ต้องยืดมากกว่า"""
    if not disp:
        scale = min(1.0, FALLBACK_EDGE / max(src_w, src_h))
    else:
        dw, dh = disp
        scale = min(1.0, DPR * max(dw / src_w, dh / src_h))
    return max(1, round(src_w * scale)), max(1, round(src_h * scale))


def main(src, dest):
    dest = Path(dest)
    (dest / "layers").mkdir(parents=True, exist_ok=True)
    (dest / "web").mkdir(parents=True, exist_ok=True)

    tree, root = load(src)
    defs = None
    for child in list(root):
        if local(child.tag) == "defs":
            defs = child
    pat2img = pattern_to_image(defs) if defs is not None else {}
    disp = measure_usage(root, pat2img)
    for k, v in DISPLAY_OVERRIDE.items():
        disp.setdefault(k, v)

    rows, before_total, after_total = [], 0, 0
    print(f"{'image':<14}{'ต้นฉบับ':>16}{'แสดงจริง':>14}{'ย่อเหลือ':>14}{'PNG':>10}{'WebP':>9}{'AVIF':>9}")
    for el in root.iter(S("image")):
        href = el.get(HREF) or el.get("href") or ""
        if not href.startswith("data:"):
            continue
        iid = el.get("id")
        raw = base64.b64decode(href.partition(",")[2])
        im = Image.open(io.BytesIO(raw))
        im.load()
        sw, sh = im.size
        tw, th = target_size(sw, sh, disp.get(iid))
        small = im.resize((tw, th), Image.LANCZOS) if (tw, th) != (sw, sh) else im
        if small.mode not in ("RGB", "RGBA"):
            small = small.convert("RGBA" if "A" in small.mode else "RGB")

        sha = hashlib.sha1(raw).hexdigest()[:12]
        bw, ba = io.BytesIO(), io.BytesIO()
        small.save(bw, format="WEBP", quality=WEBP_Q, method=6)
        small.save(ba, format="AVIF", quality=AVIF_Q)
        (dest / "web" / f"{sha}.webp").write_bytes(bw.getvalue())
        (dest / "web" / f"{sha}.avif").write_bytes(ba.getvalue())

        # ฝัง WebP กลับเข้า svg แทนของเดิม เพื่อให้ไฟล์เลเยอร์ยังเปิดผ่าน <img> ได้ในตัวเอง
        el.set(HREF, "data:image/webp;base64," + base64.b64encode(bw.getvalue()).decode())

        d = disp.get(iid)
        rows.append({"image": iid, "sha": sha, "src": [sw, sh], "display": list(d) if d else None,
                     "out": [tw, th], "png": len(raw), "webp": bw.tell(), "avif": ba.tell()})
        before_total += len(raw)
        after_total += min(bw.tell(), ba.tell())
        print(f"{iid:<14}{f'{sw}x{sh}':>16}{(f'{d[0]:.0f}x{d[1]:.0f}' if d else '-'):>14}"
              f"{f'{tw}x{th}':>14}{len(raw)/1048576:9.2f}M{bw.tell()/1024:8.0f}K{ba.tell()/1024:8.0f}K")

    # แยกเลเยอร์จากต้นไม้ที่ฝังรูปเล็กแล้ว
    for child in list(root):
        if local(child.tag) == "defs":
            root.remove(child)
    defs_index = build_defs_index(defs) if defs is not None else {}
    frame = next(c for c in root if local(c.tag) == "g" and c.get("id"))

    layers, order = [], 0
    for child in list(frame):
        order += 1
        cid = child.get("id")
        fname = f"{order:02d}_{safe_name(cid) if cid else f'unnamed-{order:02d}'}.svg"
        make_layer_svg(root, child, defs_index, needed_defs(child, defs_index)).write(
            dest / "layers" / fname, encoding="utf-8", xml_declaration=False)
        layers.append({"order": order, "id": cid, "file": f"layers/{fname}",
                       "bytes": (dest / "layers" / fname).stat().st_size})

    (dest / "_manifest.json").write_text(json.dumps(
        {"source": str(src), "viewBox": root.get("viewBox"), "dpr": DPR,
         "images": rows, "layers": layers}, ensure_ascii=False, indent=2), encoding="utf-8")

    total_layers = sum(l["bytes"] for l in layers)
    print(f"\nรูป   {before_total/1048576:.1f} MB → WebP {sum(r['webp'] for r in rows)/1048576:.2f} MB"
          f" / AVIF {sum(r['avif'] for r in rows)/1048576:.2f} MB")
    print(f"เลเยอร์ {len(layers)} ไฟล์ รวม {total_layers/1048576:.1f} MB → {dest}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
