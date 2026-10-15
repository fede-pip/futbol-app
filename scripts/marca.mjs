// Genera la identidad visual de Me Anoto: el sello ANOTADO, el logotipo y todos los íconos PNG.
// Los textos salen de brand/tipografia-trazos.json (Graduate convertida a trazos con scripts/trazos.py).
// Uso: node scripts/marca.mjs
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
const T = JSON.parse(readFileSync('brand/tipografia-trazos.json', 'utf8'));

const V = { turf1: '#17a062', turf2: '#0f7a4a', turf3: '#0a4f31', turf4: '#073722', noche: '#0b3d27', lima: '#c9f25b', blanco: '#ffffff' };

// ---- El sello: aro con ANOTADO arriba, ME ANOTO abajo (los dos se leen derechos) y el +1 al centro ----
function arco(texto, { arriba, k, radio, sep }) {
  const g = Object.fromEntries(T.anillo.map(x => [x.ch, x]));
  const letras = [...texto];
  const largo = letras.reduce((s, c) => s + g[c].adv * k, 0) + sep * (letras.length - 1);
  let pos = -largo / 2;
  return letras.map(c => {
    const w = g[c].adv * k, centro = pos + w / 2;
    pos += w + sep;
    if (!g[c].d) return '';
    // arriba: de izquierda a derecha por encima (-90°); abajo: de izquierda a derecha por debajo (90°).
    const fi = (arriba ? -Math.PI / 2 : Math.PI / 2) + (arriba ? 1 : -1) * centro / radio;
    const x = 256 + radio * Math.cos(fi), y = 256 + radio * Math.sin(fi);
    const giro = arriba ? fi * 180 / Math.PI + 90 : fi * 180 / Math.PI - 90;
    return `<path transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${giro.toFixed(2)}) translate(${(-w / 2).toFixed(2)} 0) scale(${k})" d="${g[c].d}"/>`;
  }).join('');
}
function sello({ color = V.lima, anillo = true } = {}) {
  const k = 0.56, cap = T.altoMayuscula * k;
  const textos = arco('ANOTADO', { arriba: true, k, radio: 160, sep: 16 }) + arco('ME ANOTO', { arriba: false, k, radio: 160 + cap, sep: 16 });
  const puntos = [[256 - 178, 256], [256 + 178, 256]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('');
  const m = T.mas1, kc = 1.5;
  const centro = `<g transform="translate(${(256 - m.ancho * kc / 2).toFixed(2)} ${(256 + T.altoMayuscula * kc / 2).toFixed(2)}) scale(${kc})">${m.svg}</g>`;
  return `<g fill="${color}" stroke="none">
    <circle cx="256" cy="256" r="236" fill="none" stroke="${color}" stroke-width="14"/>
    <circle cx="256" cy="256" r="210" fill="none" stroke="${color}" stroke-width="4"/>
    ${anillo ? textos + puntos : ''}
    <circle cx="256" cy="256" r="${anillo ? 124 : 160}" fill="none" stroke="${color}" stroke-width="${anillo ? 8 : 14}"/>
    ${anillo ? centro : centro.replace('scale(1.5)', 'scale(1.9)').replace(/translate\([^)]*\)/, `translate(${(256 - m.ancho * 1.9 / 2).toFixed(2)} ${(256 + T.altoMayuscula * 1.9 / 2).toFixed(2)})`)}
  </g>`;
}

function cancha(rx) {
  const franjas = Array.from({ length: 8 }, (_, i) => `<rect x="${i * 64}" y="0" width="64" height="512" fill="${i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'}"/>`).join('');
  return `<defs>
    <linearGradient id="pasto" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${V.turf1}"/><stop offset=".38" stop-color="${V.turf2}"/><stop offset=".78" stop-color="${V.turf3}"/><stop offset="1" stop-color="${V.turf4}"/></linearGradient>
    <clipPath id="forma"><rect width="512" height="512" rx="${rx}"/></clipPath>
  </defs>
  <g clip-path="url(#forma)"><rect width="512" height="512" fill="url(#pasto)"/>${franjas}</g>`;
}
const inclinado = cuerpo => `<g transform="translate(46 46) scale(.82) rotate(-12 256 256)">${cuerpo}</g>`;
const svg = (cuerpo, vb = '0 0 512 512', etiqueta = 'Me Anoto') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${etiqueta}">${cuerpo}</svg>\n`;
const iconoCuadrado = svg(cancha(0) + inclinado(sello()));
const iconoRedondeado = svg(cancha(112) + inclinado(sello()));

mkdirSync('brand', { recursive: true });
for (const f of ['glifo-sobre-claro', 'glifo-sobre-oscuro']) writeFileSync(`brand/${f}.svg`, '');
import { unlinkSync } from 'node:fs';
for (const f of ['glifo-sobre-claro', 'glifo-sobre-oscuro']) unlinkSync(`brand/${f}.svg`);
writeFileSync('brand/icono-cuadrado.svg', iconoCuadrado);
writeFileSync('brand/icono-redondeado.svg', iconoRedondeado);
writeFileSync('brand/sello-lima.svg', svg(sello(), '0 0 512 512', 'Sello ANOTADO'));
writeFileSync('brand/sello-verde.svg', svg(sello({ color: V.turf2 }), '0 0 512 512', 'Sello ANOTADO'));
writeFileSync('public/favicon.svg', iconoRedondeado);
writeFileSync('public/sello.svg', svg(sello(), '0 0 512 512', 'Sello ANOTADO'));

const png = (txt, size, destino) => sharp(Buffer.from(txt)).resize(size, size).png().toFile(destino);
await Promise.all([72, 96, 128, 144, 152, 192, 384, 512].map(s => png(iconoCuadrado, s, `public/icons/icon-${s}x${s}.png`)));
await png(iconoCuadrado, 180, 'public/icons/apple-touch-icon.png');
await png(iconoRedondeado, 256, 'public/icons/notificacion-256.png');
// Ícono chico de Android para notificaciones: silueta blanca sobre transparente (sin letras, no se leerían).
await png(svg(sello({ color: '#fff', anillo: false })), 96, 'public/icons/notificacion-insignia-96.png');
await png(iconoRedondeado, 1024, 'brand/icono-1024.png');

// ---- Logotipo y composiciones ----
const wm = T.wordmark; // "ME ANOTO" en Graduate, tamaño 100
const wordmarkSvg = color => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -90 ${wm.ancho + 20} 110" role="img" aria-label="Me Anoto"><g fill="${color}">${wm.svg}</g></svg>\n`;
writeFileSync('brand/wordmark-oscuro.svg', wordmarkSvg(V.turf4));
writeFileSync('brand/wordmark-claro.svg', wordmarkSvg('#ffffff'));
const interior = txt => txt.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const lockup = color => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 360" role="img" aria-label="Me Anoto">
  <g transform="translate(20 20) scale(0.625)">${interior(iconoRedondeado)}</g>
  <g transform="translate(400 215) scale(1.1)" fill="${color}">${wm.svg}</g>
</svg>\n`;
writeFileSync('brand/lockup-oscuro.svg', lockup(V.turf4));
writeFileSync('brand/lockup-claro.svg', lockup('#ffffff'));

// Imagen para compartir el enlace (WhatsApp, redes): 1200x630, con el sello en tinta.
const tinta = `<filter id="tinta" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -9 5.6" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`;
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="pasto" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${V.turf1}"/><stop offset=".4" stop-color="${V.turf2}"/><stop offset=".8" stop-color="${V.turf3}"/><stop offset="1" stop-color="${V.turf4}"/></linearGradient>${tinta}</defs>
  <rect width="1200" height="630" fill="url(#pasto)"/>
  ${Array.from({ length: 10 }, (_, i) => `<rect x="${i * 120}" y="0" width="120" height="630" fill="${i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'}"/>`).join('')}
  <g transform="translate(680 70) scale(.95) rotate(-10 256 256)" filter="url(#tinta)">${sello()}</g>
  <g transform="translate(80 300) scale(.72)" fill="#fff">${wm.svg}</g>
  <rect x="80" y="330" width="410" height="8" fill="${V.lima}"/>
  <g transform="translate(80 400) scale(.25)" fill="${V.lima}">${T.lema.svg}</g>
</svg>`;
await sharp(Buffer.from(og)).png().toFile('public/og-image.png');
await sharp(Buffer.from(og)).png().toFile('brand/og-image.png');
console.log('Marca generada');
