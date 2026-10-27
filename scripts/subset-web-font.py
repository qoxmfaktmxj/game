"""Pretendard 가변 축과 전체 문자 지원을 유지하며 전송 단위를 분할한다."""
from pathlib import Path
import hashlib
import json
from fontTools import subset
from fontTools.ttLib import TTFont

def unicode_ranges(points):
    spans = []
    for point in points:
        if spans and point == spans[-1][1] + 1:
            spans[-1][1] = point
        else:
            spans.append([point, point])
    return ",".join(f"U+{start:X}" if start == end else f"U+{start:X}-{end:X}" for start, end in spans)

root = Path(__file__).resolve().parent.parent
directory = root / "apps/web/public/fonts"
source = directory / "PretendardVariable.woff2"
output = directory / "subsets"
output.mkdir(exist_ok=True)
supported = set(TTFont(source).getBestCmap())
common = set(range(32, 127))
for folder in ["apps/web/components", "apps/web/app", "apps/web/lib", "packages/contracts/src", "packages/game-core/src"]:
    for path in (root / folder).rglob("*"):
        if path.suffix in {".tsx", ".ts", ".json"} and ".test." not in path.name and path.name != "web-assets.json":
            common.update(ord(char) for char in path.read_text(encoding="utf-8") if ord(char) >= 128)
common &= supported
remaining = sorted(supported - common)
groups = [sorted(common)] + [remaining[i:i+256] for i in range(0, len(remaining), 256)]
css, files, covered = [], [], set()
for index, codepoints in enumerate(groups):
    options = subset.Options()
    options.flavor = "woff2"
    font = subset.load_font(str(source), options)
    worker = subset.Subsetter(options=options)
    worker.populate(unicodes=codepoints)
    worker.subset(font)
    temporary = output / "subset.woff2"
    subset.save_font(font, str(temporary), options)
    data = temporary.read_bytes()
    name = f"pretendard-{index}-{hashlib.sha256(data).hexdigest()[:12]}.woff2"
    temporary.replace(output / name)
    files.append(name)
    covered.update(TTFont(output / name).getBestCmap())
    ranges = unicode_ranges(codepoints)
    css.append(f"@font-face {{\n  font-family: 'Pretendard';\n  font-style: normal;\n  font-weight: 100 900;\n  font-display: swap;\n  src: url('./subsets/{name}') format('woff2');\n  unicode-range: {ranges};\n}}")
assert covered == supported, "문자 범위 누락"
(directory / "fonts.css").write_text("\n".join(css) + "\n", encoding="utf-8")
(output / "manifest.json").write_text(json.dumps({"files": files, "codepoints": len(covered), "commonBytes": (output / files[0]).stat().st_size}, indent=2) + "\n", encoding="utf-8")
print(f"글꼴 {len(files)}개 구간, {len(covered)}개 문자 보존, 공통 구간 {(output / files[0]).stat().st_size:,} bytes")
