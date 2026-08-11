"""
Build self-hosted, subsetted woff2 faces for the Desserts of Joy menu.

For each face: download the upstream variable TTF from google/fonts, pin it to
the single weight the page uses, subset it to the glyphs the page renders,
and write woff2.
"""
import io, os, re, html, urllib.request, unicodedata
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.subset import Subsetter, Options

RAW = "https://raw.githubusercontent.com/google/fonts/main/"
OUT = r"E:\LETS COOK\Projects\Desserts Of Joyy\fonts"
PAGE = r"E:\LETS COOK\Projects\Desserts Of Joyy\index.html"

ASCII = "".join(chr(c) for c in range(0x20, 0x7F))
# punctuation + the rupee sign the page actually renders
EXTRAS = "\u00b7\u2013\u2014\u2018\u2019\u201c\u201d\u2026\u20b9"
BODY = ASCII + EXTRAS
# Caveat renders exactly one string on the page \u2014 the wordmark. Subsetting to
# those 10 characters costs 6 KB instead of 35 KB for the full alphabet, and
# this is the one font on the preload critical path. If the wordmark text ever
# changes, re-run this script.
SCRIPT = "".join(sorted(set("Desserts of Joy")))

FACES = [
    # (out name, repo path, axis pin, charset, style)
    ("caveat-700",     "ofl/caveat/Caveat[wght].ttf",                    700, SCRIPT, "normal"),
    ("cormorant-400",  "ofl/cormorantgaramond/CormorantGaramond[wght].ttf", 400, BODY, "normal"),
    ("cormorant-600",  "ofl/cormorantgaramond/CormorantGaramond[wght].ttf", 600, BODY, "normal"),
    ("ebgaramond-400", "ofl/ebgaramond/EBGaramond[wght].ttf",            400, BODY, "normal"),
    ("ebgaramond-400i","ofl/ebgaramond/EBGaramond-Italic[wght].ttf",     400, BODY, "italic"),
]

LICENSES = {
    "OFL-Caveat.txt": "ofl/caveat/OFL.txt",
    "OFL-CormorantGaramond.txt": "ofl/cormorantgaramond/OFL.txt",
    "OFL-EBGaramond.txt": "ofl/ebgaramond/OFL.txt",
}

# features to retain — tnum/lnum matter: the price column uses
# font-variant-numeric: tabular-nums lining-nums
FEATURES = ["kern", "liga", "clig", "calt", "ccmp", "locl",
            "mark", "mkmk", "rlig", "tnum", "lnum", "onum", "pnum"]


def fetch(path):
    url = RAW + urllib.request.quote(path)
    req = urllib.request.Request(url, headers={"User-Agent": "font-subset-script"})
    return urllib.request.urlopen(req, timeout=120).read()


def page_charset():
    src = open(PAGE, encoding="utf-8").read()
    src = re.sub(r"(?s)<!--.*?-->", " ", src)
    src = re.sub(r"(?s)<(script|style)\b.*?</\1>", " ", src)
    # attribute values that render as text
    shown = " ".join(re.findall(r'(?:aria-label|content|title)="([^"]*)"', src))
    src = re.sub(r"(?s)<[^>]+>", " ", src)
    text = html.unescape(src + " " + shown)
    return {c for c in text if c.strip() and unicodedata.category(c)[0] != "C"}


os.makedirs(OUT, exist_ok=True)
cache = {}
results = []

for name, path, wght, charset, style in FACES:
    if path not in cache:
        cache[path] = fetch(path)
    src = cache[path]
    font = TTFont(io.BytesIO(src))
    font = instancer.instantiateVariableFont(font, {"wght": wght}, inplace=False, optimize=True)

    opts = Options()
    opts.layout_features = FEATURES
    opts.name_IDs = ["*"]        # keep license / designer metadata in the file
    opts.name_legacy = True
    opts.notdef_outline = True
    opts.drop_tables = ["DSIG"]
    opts.flavor = "woff2"

    sub = Subsetter(options=opts)
    sub.populate(text=charset)
    sub.subset(font)

    dest = os.path.join(OUT, name + ".woff2")
    font.flavor = "woff2"
    font.save(dest)
    size = os.path.getsize(dest)
    results.append((name, size, len(src)))
    print("  %-18s %7d bytes   (from %8d upstream)" % (name, size, len(src)))

for fname, path in LICENSES.items():
    open(os.path.join(OUT, fname), "wb").write(fetch(path))
print("\n  licenses written:", ", ".join(LICENSES))

# ---- verify every character the page renders is covered ----
need = page_charset()
print("\n  page renders %d distinct characters" % len(need))
missing_any = False
for name, _, _ in results:
    f = TTFont(os.path.join(OUT, name + ".woff2"))
    have = set()
    for t in f["cmap"].tables:
        have |= {chr(c) for c in t.cmap}
    target = set(SCRIPT) if name.startswith("caveat") else need
    miss = (need & target) - have if name.startswith("caveat") else need - have
    if miss:
        missing_any = True
        print("  !! %-18s missing: %s" % (name, sorted(miss)))
    else:
        print("  ok %-18s covers its required set" % name)

print("\n  TOTAL woff2: %d bytes (%.1f KB)" % (sum(r[1] for r in results),
                                               sum(r[1] for r in results) / 1024))
print("  VERIFY:", "FAILED" if missing_any else "all required glyphs present")
