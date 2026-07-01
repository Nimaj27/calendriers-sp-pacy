#!/usr/bin/env python3
"""
build.py — Script de build pour Tournée Calendriers SP Pacy
Fusionne tous les modules JS/CSS en un seul index.html
Usage : python3 build.py
"""
import re, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()

def clean_module(code):
    """Retire les imports/exports ES modules (tout sera inline)"""
    code = re.sub(r"import \{[^}]+\} from ['\"][^'\"]+['\"];?\n?", '', code)
    code = re.sub(r'^export (async function|function|const)', r'\1', code, flags=re.MULTILINE)
    return code

css          = read('css/style.css')
firebase     = read('js/firebase.js')
secteurs     = read('js/secteurs.js')
tournee      = read('js/tournee.js')
carte        = read('js/carte.js')
historique   = read('js/historique.js')
gamification = read('js/gamification.js')
app          = read('js/app.js')

firebase_clean      = re.sub(r'\nexport \{[^}]+\};', '', firebase)
secteurs_clean      = clean_module(secteurs)
tournee_clean       = clean_module(tournee)
carte_clean         = carte
historique_clean    = clean_module(historique)
gamification_clean  = clean_module(gamification)
app_clean           = re.sub(r"import \{[^}]+\} from ['\"][^'\"]+['\"];?\n?", '', app)

html = f'''<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#CC1D1D">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Calendriers SP">
  <title>Tournée Calendriers — SP Pacy</title>
  <link rel="manifest" href="./manifest.json">
  <style>{css}</style>
</head>
<body>
  <div id="main"></div>
  <div id="toasts" aria-live="polite"></div>
  <script type="module">
{firebase_clean}
{secteurs_clean}
{tournee_clean}
{carte_clean}
{historique_clean}
{gamification_clean}
{app_clean}
  </script>
  <script>
    if ('serviceWorker' in navigator) {{
      window.addEventListener('load', () => {{
        navigator.serviceWorker.register('./sw.js').catch(()=>{{}});
      }});
    }}
  </script>
</body>
</html>'''

out = os.path.join(ROOT, 'index.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)

size = len(html)
print(f"✅ index.html généré — {size:,} chars ({size//1024} Ko)")
