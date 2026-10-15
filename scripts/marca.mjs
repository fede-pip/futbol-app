// Genera la identidad visual de Me Anoto: SVG del logo y todos los íconos PNG.
// Uso: node scripts/marca.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
const T = JSON.parse(readFileSync('brand/tipografia-trazos.json', 'utf8'));

const V = { turf1: '#17a062', turf2: '#0f7a4a', turf3: '#0a4f31', turf4: '#073722', lima: '#8be05a', blanco: '#ffffff' };

// El tilde (anotarse) termina en una pelota: la marca es "me anoto" en un solo gesto.
const pent = (cx, cy, r) => [-90, -18, 54, 126, 198].map(a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]);
function glifo({ tilde = V.blanco, aro = V.blanco, pelota = V.lima, parche = V.turf4 }) {
  const bx = 388, by = 148, br = 58;
  const p = pent(bx, by, 21).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const costuras = pent(bx, by, 21).map(([x, y], i) => {
    const a = [-90, -18, 54, 126, 198][i] * Math.PI / 180;
    return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(bx + 50 * Math.cos(a)).toFixed(1)}" y2="${(by + 50 * Math.sin(a)).toFixed(1)}"/>`;
  }).join('');
  return `<g transform="translate(-20 15)">
    <path d="M146 276 L226 352 L352 196" fill="none" stroke="${tilde}" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${bx}" cy="${by}" r="${br + 6}" fill="${aro}"/>
    <circle cx="${bx}" cy="${by}" r="${br}" fill="${pelota}"/>
    <g stroke="${parche}" stroke-width="5" stroke-linecap="round">${costuras}</g>
    <polygon points="${p}" fill="${parche}" stroke="${parche}" stroke-width="3" stroke-linejoin="round"/>
  </g>`;
}

function cancha(rx) {
  const franjas = Array.from({ length: 8 }, (_, i) => `<rect x="${i * 64}" y="0" width="64" height="512" fill="${i % 2 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'}"/>`).join('');
  return `<defs>
    <linearGradient id="pasto" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${V.turf1}"/><stop offset=".38" stop-color="${V.turf2}"/><stop offset=".78" stop-color="${V.turf3}"/><stop offset="1" stop-color="${V.turf4}"/></linearGradient>
    <clipPath id="forma"><rect width="512" height="512" rx="${rx}"/></clipPath>
  </defs>
  <g clip-path="url(#forma)"><rect width="512" height="512" fill="url(#pasto)"/>${franjas}
    <circle cx="256" cy="256" r="236" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="6"/></g>`;
}

const svg = (cuerpo, vb = '0 0 512 512') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="Me Anoto">${cuerpo}</svg>\n`;
export const iconoCuadrado = svg(cancha(0) + glifo({}));
export const iconoRedondeado = svg(cancha(112) + glifo({}));
export const glifoSobreClaro = svg(glifo({ tilde: V.turf2, aro: V.blanco, pelota: V.lima, parche: V.turf4 }));
export const glifoSobreOscuro = svg(glifo({}));
const glifoMono = svg(glifo({ tilde: '#fff', aro: '#fff', pelota: 'none', parche: '#fff' }));

mkdirSync('brand', { recursive: true });
writeFileSync('brand/icono-cuadrado.svg', iconoCuadrado);
writeFileSync('brand/icono-redondeado.svg', iconoRedondeado);
writeFileSync('brand/glifo-sobre-claro.svg', glifoSobreClaro);
writeFileSync('brand/glifo-sobre-oscuro.svg', glifoSobreOscuro);
writeFileSync('public/favicon.svg', iconoRedondeado);

const png = (svgTxt, size, destino) => sharp(Buffer.from(svgTxt)).resize(size, size).png().toFile(destino);
const tamanios = [72, 96, 128, 144, 152, 192, 384, 512];
await Promise.all(tamanios.map(s => png(iconoCuadrado, s, `public/icons/icon-${s}x${s}.png`)));
await png(iconoCuadrado, 180, 'public/icons/apple-touch-icon.png');
await png(iconoRedondeado, 256, 'public/icons/notificacion-256.png');
// Ícono chico de Android para notificaciones: solo silueta blanca sobre transparente.
const silueta = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(-20 15)"><path d="M146 276 L226 352 L352 196" fill="none" stroke="#fff" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/><circle cx="388" cy="148" r="60" fill="#fff"/></g></svg>`;
await png(silueta, 96, 'public/icons/notificacion-insignia-96.png');
await png(iconoRedondeado, 1024, 'brand/icono-1024.png');

// ---- Logotipo y composiciones ----
const wm = T.marca.wordmark; // texto "me anoto" convertido a trazos (Bricolage Grotesque ExtraBold)
const interior = svgTxt => svgTxt.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const wordmarkSvg = color => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -700 ${wm.ancho + 40} 780" role="img" aria-label="me anoto"><path d="${wm.d}" fill="${color}"/></svg>\n`;
writeFileSync('brand/wordmark-oscuro.svg', wordmarkSvg(V.turf3));
writeFileSync('brand/wordmark-claro.svg', wordmarkSvg('#ffffff'));
const lockup = color => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1300 360" role="img" aria-label="Me Anoto">
  <g transform="translate(20 20) scale(0.625)">${interior(iconoRedondeado)}</g>
  <g transform="translate(400 250) scale(0.2)"><path d="${wm.d}" fill="${color}"/></g>
</svg>\n`;
writeFileSync('brand/lockup-oscuro.svg', lockup(V.turf3));
writeFileSync('brand/lockup-claro.svg', lockup('#ffffff'));

// Imagen para compartir el enlace (WhatsApp, redes): 1200x630.
const t = T.texto;
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="pasto" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${V.turf1}"/><stop offset=".4" stop-color="${V.turf2}"/><stop offset=".8" stop-color="${V.turf3}"/><stop offset="1" stop-color="${V.turf4}"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#pasto)"/>
  ${Array.from({ length: 10 }, (_, i) => `<rect x="${i * 120}" y="0" width="120" height="630" fill="${i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'}"/>`).join('')}
  <circle cx="935" cy="320" r="250" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="8"/>
  <line x1="935" y1="0" x2="935" y2="630" stroke="rgba(255,255,255,.12)" stroke-width="8"/>
  <g transform="translate(715 100) scale(0.86)">${interior(iconoRedondeado)}</g>
  <g transform="translate(80 300) scale(0.15)"><path d="${wm.d}" fill="#fff"/></g>
  <g transform="translate(86 405) scale(0.058)" fill="#c9f0dc"><path d="${t.l1.d}"/></g>
  <g transform="translate(86 470) scale(0.058)" fill="#c9f0dc"><path d="${t.l2.d}"/></g>
</svg>`;
await sharp(Buffer.from(og)).png().toFile('public/og-image.png');
await sharp(Buffer.from(og)).png().toFile('brand/og-image.png');
console.log('Marca generada');
