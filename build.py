#!/usr/bin/env python3
"""Fusionne template.html + css/style.css + js/*.js en un index.html monolithique."""

from pathlib import Path

ROOT = Path(__file__).parent
JS_MODULES = [
    "firebase",
    "secteurs",
    "tournee",
    "carte",
    "historique",
    "gamification",
    "app",
]


def build():
    template = (ROOT / "template.html").read_text(encoding="utf-8")
    css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")
    js = "".join(
        (ROOT / "js" / f"{name}.js").read_text(encoding="utf-8")
        for name in JS_MODULES
    )

    output = template.replace("{{CSS}}", css).replace("{{JS}}", js)
    (ROOT / "index.html").write_text(output, encoding="utf-8")
    print(f"index.html généré ({len(output)} octets)")


if __name__ == "__main__":
    build()
