#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把整個 VMH-EcoMap 網站打包成「一個 HTML 檔」。

用途：GitHub 網頁上傳資料夾常常失敗（尤其手機、平板或某些瀏覽器）。
單檔版只要上傳一個檔案就能上線，功能與一般版完全相同。

用法：
    python3 tools/build_single_file.py
    → 產出 dist/VMH-EcoMap.html

作法：把 CSS、五支 JS 與 data/*.json 全部內嵌進 HTML。
JS 原本是 ES modules，這裡照相依順序串接並移除 import／export，
再補上 app.js 需要的 views 命名空間。
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 相依順序：後面的會用到前面的
JS_ORDER = ["store.js", "ui.js", "views.js", "search.js", "app.js"]

# app.js 以 `import * as views` 取用，串接後要自己組出這個命名空間
VIEW_NAMES = [
    "dashboard", "blueprint", "capabilities", "capability",
    "opportunities", "opportunity", "partners", "partner",
    "gates", "roadmap", "workpackage", "gaps", "risks", "kpis",
    "pipeline", "portfolio", "history", "about", "notFound",
]

DATA_FILES = [
    "meta", "capabilities", "partners", "gates", "workpackages", "risks",
    "kpis", "opportunities", "pipeline", "cap-opp", "sources", "decisions",
    "versions", "portfolio",
]


def strip_module_syntax(source: str) -> str:
    """移除 import 敘述與 export 關鍵字，讓多支模組可以串在同一個作用域。"""
    # import { a, b } from './x.js';  /  import * as views from './views.js';
    source = re.sub(
        r"^\s*import\s+(?:[\w*\s{},]+\s+from\s+)?['\"][^'\"]+['\"]\s*;?\s*$",
        "",
        source,
        flags=re.MULTILINE,
    )
    # export const / export function / export async function …
    source = re.sub(r"^(\s*)export\s+(?=(?:default\s+)?(?:const|let|var|function|async|class)\b)",
                    r"\1", source, flags=re.MULTILINE)
    return source


def main():
    assets = ROOT / "assets"
    css = (assets / "css" / "vmh.css").read_text(encoding="utf-8")

    parts = []
    for name in JS_ORDER:
        code = (assets / "js" / name).read_text(encoding="utf-8")
        parts.append(f"/* ===== {name} ===== */\n{strip_module_syntax(code)}")
        if name == "views.js":
            ns = ", ".join(VIEW_NAMES)
            parts.append(f"/* app.js 以命名空間取用各視圖 */\nconst views = {{ {ns} }};")

    js = "\n\n".join(parts)

    data = {}
    for name in DATA_FILES:
        path = ROOT / "data" / f"{name}.json"
        if not path.exists():
            sys.exit(f"缺少 data/{name}.json，請先執行 tools/xlsx_to_json.py")
        data[name] = json.loads(path.read_text(encoding="utf-8"))

    # </script> 出現在 JSON 字串裡會提前關閉 script 標籤
    data_json = json.dumps(data, ensure_ascii=False, separators=(",", ":")) \
                    .replace("</", "<\\/")

    meta = data["meta"]
    template = (ROOT / "index.html").read_text(encoding="utf-8")

    # 拿掉外部 CSS/JS 連結，換成內嵌
    html = template.replace(
        '<link rel="stylesheet" href="assets/css/vmh.css">',
        f"<style>\n{css}\n</style>",
    ).replace(
        '<script type="module" src="assets/js/app.js"></script>',
        f'<script>window.__VMH_DATA__ = {data_json};</script>\n'
        f"<script>\n{js}\n</script>",
    )

    if "window.__VMH_DATA__" not in html or "<style>" not in html:
        sys.exit("index.html 的結構與預期不符，請確認 CSS/JS 標籤是否被改過")

    out_dir = ROOT / "dist"
    out_dir.mkdir(exist_ok=True)
    out = out_dir / "VMH-EcoMap.html"
    out.write_text(html, encoding="utf-8")

    print(f"產出：dist/{out.name}")
    print(f"      {out.stat().st_size / 1024:.0f} KB，單一檔案，不需要伺服器")
    print(f"      主工具 v{meta.get('toolVersion')}｜資料產出 {meta.get('generatedAt')}")


if __name__ == "__main__":
    main()
