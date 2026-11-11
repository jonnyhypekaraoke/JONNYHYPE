#!/usr/bin/env python3
"""Fail CI when a page points to a missing local website image/media asset."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
SITE_HOSTS = {"jonnyhype.it", "www.jonnyhype.it", "media.jonnyhype.it"}
IMAGE_ATTRS = {"src", "poster"}
IMAGE_TAGS = {"img", "source", "video"}
CSS_URL = re.compile(r"url\(\s*['\"]?([^'\"\)]+)['\"]?\s*\)", re.I)

class PageParser(HTMLParser):
    def __init__(self, page):
        super().__init__(convert_charrefs=True)
        self.page = page
        self.refs = []
        self.in_style = False

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag in IMAGE_TAGS:
            for key in IMAGE_ATTRS:
                if values.get(key):
                    self.refs.append(values[key])
            if values.get("srcset"):
                self.refs.extend(part.strip().split()[0] for part in values["srcset"].split(",") if part.strip())
        if tag == "link" and "icon" in values.get("rel", "").lower():
            if values.get("href"):
                self.refs.append(values["href"])
        if values.get("style"):
            self.refs.extend(CSS_URL.findall(values["style"]))
        if tag == "style":
            self.in_style = True

    def handle_endtag(self, tag):
        if tag == "style":
            self.in_style = False

    def handle_data(self, data):
        if self.in_style:
            self.refs.extend(CSS_URL.findall(data))

def local_asset_path(ref, page):
    ref = ref.strip()
    if not ref or ref.startswith(("#", "data:", "blob:", "javascript:")):
        return None
    parsed = urlparse(ref)
    if parsed.scheme in {"mailto", "tel"}:
        return None
    if parsed.scheme and parsed.scheme not in {"http", "https"}:
        return None
    if parsed.netloc and parsed.hostname not in SITE_HOSTS:
        return None
    path = unquote(parsed.path)
    if not path:
        return None
    if path.startswith("/"):
        return ROOT / path.lstrip("/")
    return (ROOT / page.parent / path).resolve()

missing = set()
checked = 0
for page in ROOT.rglob("*"):
    if not page.is_file() or page.suffix.lower() not in {".html", ".htm"}:
        continue
    if any(part in {".git", "node_modules"} for part in page.parts):
        continue
    try:
        parser = PageParser(page)
        parser.feed(page.read_text(encoding="utf-8", errors="replace"))
    except Exception as exc:
        print(f"Cannot parse {page.relative_to(ROOT)}: {exc}")
        sys.exit(2)
    for ref in parser.refs:
        target = local_asset_path(ref, page)
        if target is None:
            continue
        checked += 1
        try:
            target.relative_to(ROOT)
        except ValueError:
            missing.add((str(page.relative_to(ROOT)), ref, "path escapes repository"))
            continue
        if not target.is_file():
            missing.add((str(page.relative_to(ROOT)), ref, str(target.relative_to(ROOT))))

# Also inspect standalone stylesheets for CSS background images.
for css in ROOT.rglob("*.css"):
    if any(part in {".git", "node_modules"} for part in css.parts):
        continue
    data = css.read_text(encoding="utf-8", errors="replace")
    for ref in CSS_URL.findall(data):
        target = local_asset_path(ref, css)
        if target is None:
            continue
        checked += 1
        try:
            target.relative_to(ROOT)
        except ValueError:
            missing.add((str(css.relative_to(ROOT)), ref, "path escapes repository"))
            continue
        if not target.is_file():
            missing.add((str(css.relative_to(ROOT)), ref, str(target.relative_to(ROOT))))

print(f"Controllati {checked} riferimenti locali a immagini/media.")
if missing:
    print(f"ERRORE: {len(missing)} riferimenti a file mancanti o con maiuscole/minuscole errate:")
    for page, ref, target in sorted(missing):
        print(f" - {page}: {ref} -> {target}")
    sys.exit(1)
print("OK: tutti i file immagine/media locali referenziati esistono nel repository.")
