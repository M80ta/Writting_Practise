"""Rebuild the browser cmap metadata. Requires fontTools only during maintenance."""
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import hashlib
import json
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
path = root / "fonts" / "BpmfZihiKaiStd-Regular.ttf"
font = TTFont(path)
table = next(table for table in font["cmap"].tables if table.format == 14)
coverage = [chr(cp) for cp, _ in table.uvsDict[0xE01E0]]
variants = {}
for selector, entries in table.uvsDict.items():
    if selector == 0xE01E0:
        continue
    for cp, _ in entries:
        variants.setdefault(chr(cp), []).append(selector - 0xE01E0)
data = {
    "family": "Bpmf Zihi KaiStd Regular", "release": "v1.500",
    "fontVersion": font["name"].getDebugName(5),
    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    "supported": "".join(coverage), "alternatives": variants,
}
script = (
    "// Font cmap metadata derived from ButTaiwan/bpmfvs v1.500; no font outlines modified.\n"
    "// See fonts/LICENSE-ZihiKaiStd.txt, LICENSE-2.0.txt and BpmfZihiKaiStd-NOTICE.txt.\n"
    "(function(root){const data=" + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    + ';if(typeof module==="object"&&module.exports)module.exports=data;else root.LetterLinesZhuyin=data;})(globalThis);\n'
)
(root / "zhuyin-data.js").write_text(script, encoding="utf-8", newline="\n")
print(f"Generated {len(coverage)} characters and {len(variants)} alternate-reading entries.")
