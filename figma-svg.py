#!/usr/bin/env python3
"""แกะ SVG ที่ export มาจาก Figma — สำรวจโครง / แยกเลเยอร์ / ดึงรูปที่ฝัง base64 ออกมา

ใช้กับไฟล์ใน images/main figma/ (เฟรม 1920 x 2879 และ 1920 x 3111)

    python figma-svg.py inspect "images/main figma/Frame 2.svg"
    python figma-svg.py split   "images/main figma/Frame 2.svg" images/figma/main
    python figma-svg.py patseam images/figma/main-web
"""
import base64
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
ET.register_namespace("", SVG_NS)
ET.register_namespace("xlink", XLINK_NS)

S = lambda t: f"{{{SVG_NS}}}{t}"
HREF = f"{{{XLINK_NS}}}href"
REF_RE = re.compile(r"url\(#([^)]+)\)")

# นามสกุลตาม mime ที่ Figma ฝังมา
MIME_EXT = {"image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp"}


def local(tag):
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def demojibake(s):
    """Figma เขียน id ที่เป็นภาษาไทยเป็น numeric reference ของ "ไบต์" UTF-8 (double-encoded)
    เช่น ฝ (U+0E1D = E0 B8 9D) กลายเป็น &#224;&#184;&#157; = "à¸"
    ตัวอักษร ASCII จะลอดผ่านโดยไม่เปลี่ยน ส่วนไทยที่ถูกต้องอยู่แล้วจะ encode latin-1 ไม่ผ่าน → คืนค่าเดิม
    (เนื้อความใน <text> ถูกต้องอยู่แล้ว มีแต่ attribute id ที่เพี้ยน)"""
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def repair_ids(root):
    n = 0
    for el in root.iter():
        v = el.get("id")
        if v:
            fixed = demojibake(v)
            if fixed != v:
                el.set("id", fixed)
                n += 1
    return n


def load(path):
    tree = ET.parse(path)
    root = tree.getroot()
    repair_ids(root)
    return tree, root


# ---------------------------------------------------------------- inspect

def walk_tree(node, depth=0, out=None, parent_id=None):
    """ไล่ทั้งต้นไม้ เก็บเฉพาะโหนดที่มี id (= เลเยอร์ที่ Figma ตั้งชื่อไว้)"""
    if out is None:
        out = []
    nid = node.get("id")
    here = parent_id
    if nid:
        out.append({
            "id": nid,
            "tag": local(node.tag),
            "depth": depth,
            "parent": parent_id,
            "children": 0,
        })
        here = nid
    for child in node:
        if local(child.tag) == "defs":
            continue
        walk_tree(child, depth + 1, out, here)
    if depth == 0:
        counts = {}
        for r in out:
            if r["parent"]:
                counts[r["parent"]] = counts.get(r["parent"], 0) + 1
        for r in out:
            r["children"] = counts.get(r["id"], 0)
    return out


def image_inventory(root):
    """หา <image> ที่ฝัง base64 ทั้งหมด พร้อมขนาดจริงหลังถอดรหัส"""
    items = []
    for el in root.iter(S("image")):
        href = el.get(HREF) or el.get("href") or ""
        if not href.startswith("data:"):
            items.append({"id": el.get("id"), "external": href, "bytes": 0})
            continue
        head, _, b64 = href.partition(",")
        mime = head[5:].split(";")[0]
        raw = base64.b64decode(b64)
        items.append({
            "id": el.get("id"),
            "mime": mime,
            "bytes": len(raw),
            "sha": hashlib.sha1(raw).hexdigest()[:12],
            "w": el.get("width"),
            "h": el.get("height"),
        })
    return items


def cmd_inspect(src):
    tree, root = load(src)
    frame = None
    for child in root:
        if local(child.tag) == "g" and child.get("id"):
            frame = child
            break
    rows = walk_tree(frame if frame is not None else root)
    imgs = image_inventory(root)

    print(f"file      : {src}")
    print(f"viewBox   : {root.get('viewBox')}  ({root.get('width')} x {root.get('height')})")
    print(f"frame id  : {frame.get('id') if frame is not None else '-'}")
    print(f"nodes(id) : {len(rows)}")
    print(f"images    : {len(imgs)}  รวม {sum(i['bytes'] for i in imgs)/1048576:.1f} MB")
    print()
    print("--- เลเยอร์ชั้นบนสุด ---")
    for r in rows:
        if r["depth"] <= 1:
            pad = "  " * (r["depth"] - 1) if r["depth"] else ""
            kids = f"  ({r['children']} ชิ้น)" if r["children"] else ""
            print(f"{pad}{r['tag']:<6} {r['id']}{kids}")
    print()
    print("--- รูปที่ฝังมา (เรียงจากใหญ่) ---")
    for i in sorted(imgs, key=lambda x: -x["bytes"])[:40]:
        print(f"  {i['bytes']/1048576:7.2f} MB  {i.get('mime','?'):<11} {i.get('w','?')}x{i.get('h','?'):<6} id={i.get('id')} sha={i.get('sha')}")

    depth_counts = {}
    for r in rows:
        depth_counts[r["depth"]] = depth_counts.get(r["depth"], 0) + 1
    print()
    print("--- จำนวนโหนดต่อชั้น ---")
    for d in sorted(depth_counts):
        print(f"  ชั้น {d}: {depth_counts[d]}")


# ---------------------------------------------------------------- split

def collect_refs(node, acc):
    """เก็บ id ที่ subtree นี้อ้างถึง — url(#x), href="#x", clip-path, fill, stroke, mask, filter"""
    for k, v in node.attrib.items():
        if not isinstance(v, str):
            continue
        for m in REF_RE.finditer(v):
            acc.add(m.group(1))
        if k in (HREF, "href") and v.startswith("#"):
            acc.add(v[1:])
    style = node.get("style") or ""
    for m in REF_RE.finditer(style):
        acc.add(m.group(1))
    for child in node:
        collect_refs(child, acc)


def build_defs_index(defs):
    return {el.get("id"): el for el in defs.iter() if el.get("id")}


def needed_defs(subtree, defs_index):
    """ไล่ ref แบบทอดต่อ — gradient ที่อ้าง gradient อื่น / pattern ที่อ้าง image"""
    want = set()
    collect_refs(subtree, want)
    seen = set()
    while want - seen:
        for rid in list(want - seen):
            seen.add(rid)
            el = defs_index.get(rid)
            if el is not None:
                collect_refs(el, want)
    return {r for r in seen if r in defs_index}


def make_layer_svg(root, subtree, defs_index, ids):
    """สร้าง svg ใบใหม่ที่ยัง viewBox เท่าเฟรมเดิม — วางทับกันแล้วตำแหน่งตรงเป๊ะ"""
    out = ET.Element(S("svg"), {
        "width": root.get("width"),
        "height": root.get("height"),
        "viewBox": root.get("viewBox"),
        "fill": "none",
    })
    if ids:
        defs = ET.SubElement(out, S("defs"))
        for rid in sorted(ids):
            defs.append(defs_index[rid])
    out.append(subtree)
    return ET.ElementTree(out)


def safe_name(name):
    return re.sub(r"[^0-9A-Za-z฀-๿._-]+", "-", name).strip("-") or "layer"


def cmd_split(src, dest):
    dest = Path(dest)
    (dest / "layers").mkdir(parents=True, exist_ok=True)
    (dest / "img").mkdir(parents=True, exist_ok=True)

    tree, root = load(src)

    # 1) ดึงรูปที่ฝัง base64 ออกมาเก็บแยก (ไว้ดูขนาด/บีบอัดทีหลัง)
    #    แต่ยัง "ไม่ถอดออกจาก svg" เพราะไฟล์เลเยอร์ต้องเปิดผ่าน <img> ได้ด้วยตัวเอง
    manifest_imgs = []
    for el in root.iter(S("image")):
        href = el.get(HREF) or el.get("href") or ""
        if not href.startswith("data:"):
            continue
        head, _, b64 = href.partition(",")
        mime = head[5:].split(";")[0]
        raw = base64.b64decode(b64)
        sha = hashlib.sha1(raw).hexdigest()[:12]
        fname = f"{sha}{MIME_EXT.get(mime, '.bin')}"
        fpath = dest / "img" / fname
        if not fpath.exists():
            fpath.write_bytes(raw)
        manifest_imgs.append({"node": el.get("id"), "file": f"img/{fname}", "bytes": len(raw), "mime": mime})

    # 2) แยก defs ออกมาทำดัชนี
    defs = None
    for child in list(root):
        if local(child.tag) == "defs":
            defs = child
            root.remove(child)
    defs_index = build_defs_index(defs) if defs is not None else {}

    # 3) หาโหนดเฟรม แล้วแยกลูกชั้นแรกออกเป็นไฟล์ละชิ้น
    frame = None
    for child in root:
        if local(child.tag) == "g" and child.get("id"):
            frame = child
            break
    if frame is None:
        print("!! ไม่เจอโหนดเฟรม", file=sys.stderr)
        return

    manifest_layers = []
    order = 0
    for child in list(frame):
        cid = child.get("id")
        order += 1
        name = safe_name(cid) if cid else f"unnamed-{order:02d}"
        fname = f"{order:02d}_{name}.svg"
        ids = needed_defs(child, defs_index)
        make_layer_svg(root, child, defs_index, ids).write(
            dest / "layers" / fname, encoding="utf-8", xml_declaration=False
        )
        manifest_layers.append({
            "order": order,
            "id": cid,
            "tag": local(child.tag),
            "file": f"layers/{fname}",
            "bytes": (dest / "layers" / fname).stat().st_size,
            "defs": len(ids),
        })
        print(f"  {order:02d}  {(dest / 'layers' / fname).stat().st_size/1024:9.1f} KB  {cid}")

    (dest / "_manifest.json").write_text(json.dumps({
        "source": str(src),
        "viewBox": root.get("viewBox"),
        "frame": frame.get("id"),
        "layers": manifest_layers,
        "images": manifest_imgs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nเขียน {len(manifest_layers)} เลเยอร์ + {len(manifest_imgs)} รูป → {dest}")


# ---------------------------------------------------------------- textpaths

def cmd_textpaths(plain_src, outline_src, dest):
    """ดึงเฉพาะ "ตัวหนังสือที่แปลงเป็น path แล้ว" ออกจากไฟล์ outline
    ใช้กับฟอนต์ที่ไม่มีบนเว็บ — ไม่ต้องแยกทั้งไฟล์ให้รูปซ้ำอีก 23 MB"""
    dest = Path(dest)
    dest.mkdir(parents=True, exist_ok=True)

    _, plain = load(plain_src)
    want = {}
    for el in plain.iter(S("text")):
        if el.get("id"):
            want[el.get("id")] = "".join(x.text or "" for x in el.iter())

    _, root = load(outline_src)
    defs = None
    for child in list(root):
        if local(child.tag) == "defs":
            defs = child
            root.remove(child)
    defs_index = build_defs_index(defs) if defs is not None else {}

    found, rows = 0, []
    for el in root.iter():
        rid = el.get("id")
        if rid not in want or local(el.tag) not in ("path", "g"):
            continue
        ids = needed_defs(el, defs_index)
        fname = f"{found + 1:02d}_{safe_name(rid)}.svg"
        make_layer_svg(root, el, defs_index, ids).write(
            dest / fname, encoding="utf-8", xml_declaration=False
        )
        rows.append({"id": rid, "text": want[rid], "file": fname,
                     "bytes": (dest / fname).stat().st_size})
        found += 1
        print(f"  {(dest / fname).stat().st_size/1024:8.1f} KB  {rid}")

    missing = [k for k in want if k not in {r['id'] for r in rows}]
    (dest / "_manifest.json").write_text(json.dumps(
        {"source": str(outline_src), "viewBox": root.get("viewBox"),
         "texts": rows, "missing": missing}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nได้ {found} / {len(want)} ตัวหนังสือ → {dest}")
    if missing:
        print("ไม่เจอ (น่าจะถูกยุบรวมกับกลุ่มอื่นตอน outline):")
        for m in missing:
            print("   -", m)


# ---------------------------------------------------------------- pick

def cmd_pick(src, dest, ids):
    """ดึงโหนดตาม id ที่ระบุออกมาเป็นไฟล์ละชิ้น (ใช้ได้ทั้งไฟล์ปกติและไฟล์ outline)
    ใช้กับกลุ่มที่มีฟอนต์ซึ่งไม่มีบนเว็บ — เอาเวอร์ชัน outline มาทั้งกลุ่มทีเดียว"""
    dest = Path(dest)
    dest.mkdir(parents=True, exist_ok=True)

    _, root = load(src)
    defs = None
    for child in list(root):
        if local(child.tag) == "defs":
            defs = child
            root.remove(child)
    defs_index = build_defs_index(defs) if defs is not None else {}

    index = {}
    for el in root.iter():
        rid = el.get("id")
        if rid and rid not in index:
            index[rid] = el

    rows = []
    for rid in ids:
        el = index.get(rid)
        if el is None:
            print(f"!! ไม่เจอ id: {rid}")
            continue
        need = needed_defs(el, defs_index)
        fname = f"{safe_name(rid)}.svg"
        make_layer_svg(root, el, defs_index, need).write(
            dest / fname, encoding="utf-8", xml_declaration=False
        )
        size = (dest / fname).stat().st_size
        rows.append({"id": rid, "file": fname, "bytes": size})
        print(f"  {size/1024:8.1f} KB  {rid}")

    mf = dest / "_manifest.json"
    old = json.loads(mf.read_text(encoding="utf-8")) if mf.exists() else {"picks": []}
    old.setdefault("picks", [])
    old["picks"] = [p for p in old["picks"] if p["id"] not in ids] + rows
    old["viewBox"] = root.get("viewBox")
    mf.write_text(json.dumps(old, ensure_ascii=False, indent=2), encoding="utf-8")


# ---------------------------------------------------------------- clean

CANVAS_BG = {"#e5e5e5", "#E5E5E5"}


def cmd_clean(srcdir, dest):
    """เก็บกวาดไฟล์เดี่ยวๆ (คลังดาว/เส้นดาวตกที่อยู่นอกเฟรม)
    - ลบ <rect fill="#E5E5E5"> ที่เป็นพื้นแคนวาสของ Figma ไม่ใช่ตัวงาน
    - ซ่อม id ที่เป็นภาษาไทย
    - คง viewBox ของตัวเอง เพราะเป็นชิ้นอิสระ เอาไปวางตรงไหนก็ได้"""
    srcdir, dest = Path(srcdir), Path(dest)
    dest.mkdir(parents=True, exist_ok=True)
    rows = []
    for f in sorted(srcdir.glob("*.svg")):
        tree, root = load(f)
        removed = 0
        for child in list(root):
            if local(child.tag) == "rect" and (child.get("fill") or "") in CANVAS_BG \
                    and child.get("id") is None:
                root.remove(child)
                removed += 1
        fills = sorted({el.get("fill") for el in root.iter()
                        if el.get("fill") and el.get("fill").startswith("#")})
        strokes = sorted({el.get("stroke") for el in root.iter() if el.get("stroke")})
        out = dest / f.name
        tree.write(out, encoding="utf-8", xml_declaration=False)
        rows.append({
            "file": f.name,
            "viewBox": root.get("viewBox"),
            "w": root.get("width"), "h": root.get("height"),
            "ids": [el.get("id") for el in root.iter() if el.get("id")],
            "fills": fills, "strokes": strokes,
            "bgRemoved": removed,
        })
        print(f"  {f.name:<20} {root.get('width')}x{root.get('height'):<6} "
              f"fill={','.join(fills) or '-':<28} stroke={','.join(strokes) or '-'}")
    (dest / "_manifest.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nเก็บกวาด {len(rows)} ไฟล์ → {dest}")


# ---------------------------------------------------------------- verify

def cmd_verify(folder):
    """เช็คว่าทุกไฟล์เลเยอร์อ้าง url(#id) ครบในตัวเอง ไม่มีอันไหนหลุด"""
    folder = Path(folder)
    files = sorted(folder.rglob("*.svg"))
    bad = 0
    for f in files:
        _, root = load(f)
        have = {el.get("id") for el in root.iter() if el.get("id")}
        want = set()
        collect_refs(root, want)
        missing = {w for w in want if w not in have}
        flag = "  " if not missing else "!!"
        if missing:
            bad += 1
            print(f"{flag} {f.name}: อ้างถึงแต่ไม่มีในไฟล์ → {sorted(missing)}")
    print(f"\nตรวจ {len(files)} ไฟล์ · มีปัญหา {bad} ไฟล์")


# ---------------------------------------------------------------- patseam

PAT_BLOCK = re.compile(r"<pattern([^>]*)>(.*?)</pattern>", re.S)
USE_TR = re.compile(r'(<use[^>]*?transform=")([^"]*)(")')
USE_NOTR = re.compile(r"<use(?![^>]*transform=)([^>]*?)(/?>)")
MATRIX = re.compile(r"matrix\(([^)]*)\)")


def num(v):
    return f"{v:.9g}"


def cmd_patseam(folder, margin=0.02):
    """กันเส้น 1px ที่ขอบรูป

    Figma ส่งรูปมาเป็น fill="url(#pattern)" โดย tile ของ pattern = กล่องของรูปพอดีเป๊ะ
    แต่ pattern ใน SVG คือลายที่ "ปูซ้ำไม่รู้จบ" เบราว์เซอร์จึงวาด tile หนึ่งใบเก็บไว้แล้วปูต่อ
    ตรงรอยต่อของ tile มันสุ่มสีแบบเฉลี่ยข้ามขอบ = ดูดสีจากขอบตรงข้ามของรูปมาผสม
    รูปที่ Figma ครอปจนเนื้อภาพชนขอบพอดี (ซึ่งเกือบทุกใบ) จึงมีเส้นบางๆ ของขอบตรงข้ามโผล่มา

    วิธีแก้: ขยาย tile ให้ใหญ่กว่ากล่องออกไปด้านละ margin แล้วบวกระยะเท่ากันคืนให้ตัวรูป
    รูปอยู่ที่เดิมเป๊ะทุกจุด (พิสูจน์: ค่าพิกเซลแถวข้างเคียงไม่เปลี่ยน) แต่รอยต่อของ tile
    ย้ายไปตกนอกกล่อง = ถูกตัดทิ้งไปเลย ไม่มีอะไรมาให้เห็น

    รันซ้ำได้ ไฟล์ที่แก้แล้วจะถูกข้าม (ดูจากว่ามี x=/y= ใน <pattern> หรือยัง)
    """
    m = float(margin)
    files = sorted(Path(folder).rglob("*.svg"))
    hit = done = 0

    def one(mo):
        nonlocal hit
        attrs, body = mo.group(1), mo.group(2)
        if 'patternContentUnits="objectBoundingBox"' not in attrs:
            return mo.group(0)
        if 'width="1"' not in attrs or 'height="1"' not in attrs:
            return mo.group(0)          # แก้ไปแล้ว หรือเป็นลายปูซ้ำจริงๆ
        hit += 1
        attrs = attrs.replace('width="1" height="1"',
                              f'x="{num(-m)}" y="{num(-m)}" '
                              f'width="{num(1 + 2 * m)}" height="{num(1 + 2 * m)}"')

        def shift(u):
            head, tr, tail = u.group(1), u.group(2), u.group(3)
            mm = MATRIX.search(tr)
            if mm:
                v = [float(x) for x in mm.group(1).replace(",", " ").split()]
                v[4] += m
                v[5] += m
                tr = tr[:mm.start()] + "matrix(" + " ".join(num(x) for x in v) + ")" + tr[mm.end():]
            else:
                tr = f"translate({num(m)} {num(m)}) " + tr
            return head + tr + tail

        body2, n = USE_TR.subn(shift, body, count=1)
        if not n:
            body2 = USE_NOTR.sub(
                lambda u: f'<use{u.group(1)} transform="translate({num(m)} {num(m)})"{u.group(2)}',
                body, count=1)
        return "<pattern" + attrs + ">" + body2 + "</pattern>"

    for f in files:
        t = f.read_text(encoding="utf-8")
        before = hit
        t2 = PAT_BLOCK.sub(one, t)
        if hit > before:
            f.write_text(t2, encoding="utf-8")
            done += 1
            print(f"  {hit - before} pattern  {f.as_posix()}")

    print()
    print(f"แก้ {hit} pattern ใน {done} ไฟล์ (จากทั้งหมด {len(files)} ไฟล์) · margin {m}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "inspect":
        cmd_inspect(sys.argv[2])
    elif cmd == "split":
        cmd_split(sys.argv[2], sys.argv[3])
    elif cmd == "textpaths":
        cmd_textpaths(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "pick":
        cmd_pick(sys.argv[2], sys.argv[3], sys.argv[4:])
    elif cmd == "clean":
        cmd_clean(sys.argv[2], sys.argv[3])
    elif cmd == "verify":
        cmd_verify(sys.argv[2])
    elif cmd == "patseam":
        cmd_patseam(sys.argv[2], *sys.argv[3:4])
    else:
        print(__doc__)
        sys.exit(1)
