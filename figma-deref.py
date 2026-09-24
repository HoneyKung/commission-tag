#!/usr/bin/env python3
"""ถอดรูป base64 ออกจากเลเยอร์ -web แล้วชี้ไปไฟล์ webp ข้างนอกแทน

ทำไมต้องทำ: animation-list ข้อ 8 บังคับว่าบางชิ้น (การ์ดรูป / เส้นทอง / ฟอร์ม)
ห้ามเป็นรูปนิ่ง ต้องฝังเป็น SVG สดในหน้า - แต่ถ้ายังฝัง base64 อยู่
ไฟล์ละ 170 KB เอามาฝัง 5 ไฟล์ก็บวม HTML ไปเกือบเมกะไบต์

ถอดออกแล้ว:
  - เลเยอร์เหลือ 5-15 KB ฝังลงหน้าได้สบาย
  - รูปกลายเป็นไฟล์แยก เบราว์เซอร์แคชได้ + สองซีนใช้รูปตัวเดียวกัน (sha เดียวกัน)
  - <image href> เป็นโหนดจริง JS สลับรูปในการ์ดได้ตามข้อ 3.3

    python figma-deref.py images/figma/main-web images/figma/lite/main ../img
    python figma-deref.py images/figma/menu-web images/figma/lite/menu ../img

หมายเหตุ: width/height ของ <image> เป็นหน่วย user-space ของ pattern
ไม่ใช่ขนาดพิกเซลจริง (ไฟล์ -web ย่อรูปแล้วแต่ไม่ได้แก้ค่าพวกนี้)
-> สลับ base64 เป็น URL ของไฟล์เดียวกันได้ตรงๆ ภาพไม่เพี้ยน

*** กับดักเรื่อง path ***
prefix ที่ใส่ต้องนับจาก "โฟลเดอร์ปลายทางของไฟล์ที่จะเอาไปใช้จริง" ไม่ใช่ที่นี่
เพราะไฟล์ในนี้เป็นแค่ตัวกลาง เดี๋ยว figma-svg.py pick จะคัดชิ้นย่อยไปไว้ที่
images/figma/parts/<หมวด>/ ซึ่งลึกจาก images/figma/ แค่ 2 ชั้น -> ต้องเป็น ../../img
(ตัวไฟล์ใน lite/<ซีน>/layers/ ลึก 3 ชั้น ถ้าเปิดตรงๆ จะหารูปไม่เจอ แต่ไม่เป็นไร
 เพราะหน้าเว็บไม่ได้เรียก lite/ โดยตรงเลย ใช้แต่ parts/ กับ main-web/ menu-web/)

*** อีกกับดัก: SVG ที่โหลดผ่าน <img> ดึงไฟล์ข้างนอกไม่ได้ ***
เบราว์เซอร์บล็อกทุก external resource ใน SVG ที่มาทาง <img>
-> ชิ้นไหนที่ถอดรูปออกมาแล้ว ต้อง "ฝังลงหน้า" เท่านั้น ใช้ <img class="ly"> ไม่ได้
   (เคยพลาดมาแล้ว: รูปสินค้า 3 ใบหายทั้งเซกชัน)
"""
import base64
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DATA_RE = re.compile(r'(xlink:href|href)="data:image/([a-z+]+);base64,([^"]+)"')
EXT = {"png": ".png", "jpeg": ".jpg", "webp": ".webp", "gif": ".gif"}


def main(src_dir, dest_dir, img_href_prefix):
    src, dest = Path(src_dir), Path(dest_dir)
    layers_out = dest / "layers"
    layers_out.mkdir(parents=True, exist_ok=True)
    img_out = (dest / img_href_prefix).resolve()
    img_out.mkdir(parents=True, exist_ok=True)

    saved = {}
    rows = []
    for f in sorted((src / "layers").glob("*.svg")):
        text = f.read_text(encoding="utf-8")
        before = len(text)
        hits = 0

        def swap(m):
            nonlocal hits
            attr, mime, b64 = m.group(1), m.group(2), m.group(3)
            raw = base64.b64decode(b64)
            sha = hashlib.sha1(raw).hexdigest()[:12]
            name = sha + EXT.get(mime, ".bin")
            if name not in saved:
                (img_out / name).write_bytes(raw)
                saved[name] = len(raw)
            hits += 1
            return f'{attr}="{img_href_prefix}/{name}"'

        text = DATA_RE.sub(swap, text)
        (layers_out / f.name).write_text(text, encoding="utf-8")
        rows.append({"file": f.name, "images": hits,
                     "before": before, "after": len(text)})
        flag = "*" if hits else " "
        print(f" {flag} {f.name:<52} {before/1024:8.1f} -> {len(text)/1024:7.1f} KB"
              f"{('  (' + str(hits) + ' rup)') if hits else ''}")

    # เอา _manifest.json ของเดิมติดไปด้วย จะได้ตามรอยกลับได้ว่ารูปไหนมาจากไหน
    if (src / "_manifest.json").exists():
        shutil.copy(src / "_manifest.json", dest / "_manifest-source.json")
    (dest / "_manifest.json").write_text(json.dumps({
        "source": str(src),
        "imgPrefix": img_href_prefix,
        "layers": rows,
        "images": saved,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    tot_b = sum(r["before"] for r in rows)
    tot_a = sum(r["after"] for r in rows)
    print(f"\n{len(rows)} layer  {tot_b/1048576:.2f} MB -> {tot_a/1024:.0f} KB"
          f"   ยกรูปออก {len(saved)} ไฟล์ {sum(saved.values())/1024:.0f} KB -> {img_out}")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2], sys.argv[3])
