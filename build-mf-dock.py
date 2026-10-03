#!/usr/bin/env python3
"""Build shared menu markup from the Figma SVG sources using template markers."""
import importlib.util
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("figma_page", ROOT / "figma-page.py")
figma_page = importlib.util.module_from_spec(spec)
spec.loader.exec_module(figma_page)
MARKER = re.compile(r"<!--@\s*(\S+?)\s*@notext\s*-->")


def inline_prefixed(rel_path, tag):
    svg = figma_page.inline(ROOT / rel_path, tag, notext=True)
    old_ids = re.findall(r'\bid="([^"]+)"', svg)
    replacements = {
        old: "mfDockSvg" + tag + "_" + re.sub(r"[^0-9A-Za-z]+", "_", old).strip("_")
        for old in old_ids
    }
    for old, new in replacements.items():
        svg = svg.replace('id="' + old + '"', 'id="' + new + '"')
        svg = svg.replace("url(#" + old + ")", "url(#" + new + ")")
        svg = svg.replace('href="#' + old + '"', 'href="#' + new + '"')
        svg = svg.replace('xlink:href="#' + old + '"', 'xlink:href="#' + new + '"')
    return svg


def main():
    template = (ROOT / "mf-dock.template.html").read_text(encoding="utf-8")
    count = 0

    def replace(match):
        nonlocal count
        count += 1
        rel_path = match.group(1)
        if not (ROOT / rel_path).is_file():
            raise FileNotFoundError(rel_path)
        return inline_prefixed(rel_path, f"{count:02d}")

    markup = MARKER.sub(replace, template)
    if count != 9:
        raise ValueError(f"Expected 9 SVG markers, found {count}")
    (ROOT / "mf-dock.html").write_text(markup, encoding="utf-8")
    print(f"Built mf-dock.html from {count} Figma SVG markers")


if __name__ == "__main__":
    main()
