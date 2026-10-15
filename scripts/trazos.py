# Convierte texto de Graduate (OFL) a trazos SVG para no depender de la fuente al generar la marca.
# Uso: python3 scripts/trazos.py   (necesita fonttools)
import json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

f = TTFont('brand/fuentes/Graduate-Regular.ttf')
gs, cmap, upm = f.getGlyphSet(), f.getBestCmap(), f['head'].unitsPerEm

def glifo(ch, size):
    n = cmap[ord(ch)]; s = size / upm
    p = SVGPathPen(gs, ntos=lambda v: f'{v:.2f}'); gs[n].draw(TransformPen(p, (s, 0, 0, -s, 0, 0)))
    b = BoundsPen(gs); gs[n].draw(b)
    return {'d': p.getCommands(), 'adv': gs[n].width * s, 'alto': (b.bounds[3] if b.bounds else 0) * s}

def linea(texto, size, espacio=0):
    x, partes = 0, []
    for ch in texto:
        g = glifo(ch, size)
        if g['d']: partes.append((x, g['d']))
        x += g['adv'] + espacio
    d = ''.join(f'<path transform="translate({px:.2f} 0)" d="{pd}"/>' for px, pd in partes)
    return {'svg': d, 'ancho': x - espacio}

salida = {
    'wordmark': linea('ME ANOTO', 100, 6),
    'mas1': linea('+1', 100, 0),
    'lema': linea('EL PARTIDO DE TODAS LAS SEMANAS', 100, 8),
    'anotadoRect': linea('ANOTADO', 100, 6),
    'altoMayuscula': glifo('M', 100)['alto'],
    'anillo': [{'ch': c, **glifo(c, 100)} for c in 'ANOTDME ']
}
json.dump(salida, open('brand/tipografia-trazos.json', 'w'), ensure_ascii=False)
print('ok', salida['altoMayuscula'], salida['wordmark']['ancho'])
