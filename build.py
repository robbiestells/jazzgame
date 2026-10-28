"""Build Noche Azul into self-contained pages.

Inlines the Bravura font (base64) and all JS sources into src/head.html.

Outputs:
  index.html            the 3D demo (full HTML document, GitHub Pages ready). Loads three.js from a CDN
                        and falls back to the 2D club automatically if the CDN is blocked.
  noche-azul-2d.html    2D-only build, no network needed
  noche-azul.html       body-only 2D fragment (for publishing as a Claude artifact)
  noche-azul-3d.html    body-only 3D fragment (for publishing as a Claude artifact)
"""
import base64
import os

ROOT = os.path.dirname(os.path.abspath(__file__))


def read(*parts, mode='r'):
    with open(os.path.join(ROOT, *parts), mode) as f:
        return f.read()


def write(name, text):
    with open(os.path.join(ROOT, name), 'w') as f:
        f.write(text)


b64 = base64.b64encode(read('assets', 'Bravura.woff2', mode='rb')).decode()
head = read('src', 'head.html').replace('/*BRAVURA_B64*/', b64)
lst = read('src', 'lstage.js')
ORDER = ['rig.js', 'rigs.js', 'stage.js', 'voices.js', 'audio.js', 'art.js', 'game.js']
js = ''
for name in ORDER:
    code = read('src', name)
    if name == 'game.js':   # the layered 2D stage lives inside game.js's closure
        code = code.replace("const $ = id => document.getElementById(id);\n", "const $ = id => document.getElementById(id);\n" + lst, 1)
    js += code + '\n'

IMPORTMAP = ('<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",'
             '"three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>\n')
WANT3D = '<script>window.__want3d=1;setTimeout(function(){if(!(window.Club3D&&window.Club3D.ok))window.__no3d=1},15000)</script>\n'
frag2d = head + '\n<script>\n' + js + '</script>\n'
frag3d = (head.replace('<title>Noche Azul</title>', '<title>Noche Azul Demo</title>') + '\n' + IMPORTMAP + WANT3D
          + '<script>\n' + js + '</script>\n<script type="module">\n' + read('src', 'club3d.js') + '\n</script>\n')


def doc(f):
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + f + '</body></html>')


write('noche-azul.html', frag2d)
write('noche-azul-3d.html', frag3d)
write('noche-azul-2d.html', doc(frag2d))
write('index.html', doc(frag3d))
print(f'built index.html ({len(frag3d):,} bytes), noche-azul-2d.html ({len(frag2d):,} bytes)')
