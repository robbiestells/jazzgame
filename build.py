"""Build Noche Azul into a single self-contained page.

Inlines the Bravura music font (base64) and the three JS sources into src/head.html.

Outputs:
  index.html       full HTML document - open it directly or serve it with GitHub Pages
  noche-azul.html  body-only fragment, used when publishing as a Claude artifact
"""
import base64
import os

ROOT = os.path.dirname(os.path.abspath(__file__))


def read(*parts, mode='r'):
    with open(os.path.join(ROOT, *parts), mode) as f:
        return f.read()


b64 = base64.b64encode(read('assets', 'Bravura.woff2', mode='rb')).decode()
head = read('src', 'head.html').replace('/*BRAVURA_B64*/', b64)
js = ''.join(read('src', name) + '\n' for name in ['audio.js', 'art.js', 'game.js'])
frag = head + '\n<script>\n' + js + '</script>\n'

with open(os.path.join(ROOT, 'noche-azul.html'), 'w') as f:
    f.write(frag)
with open(os.path.join(ROOT, 'index.html'), 'w') as f:
    f.write('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'
            + frag + '</body></html>')
os.makedirs(os.path.join(ROOT, 'shots'), exist_ok=True)
print(f'built index.html ({len(frag):,} bytes)')
