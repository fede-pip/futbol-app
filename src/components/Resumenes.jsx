import { ATTRS, pl } from '../lib/logica.js';
import { nombreDe } from '../app/sesion.jsx';

const FLECHA = { 1: ['▲', 'mejoró', 'var(--ok)', 'var(--ok-bg)'], '-1': ['▼', 'bajó', 'var(--bad)', 'var(--bad-bg)'] };

// "Cómo te votaron": flechitas por atributo y el resultado general. Solo muestra el sentido del cambio, no los números.
export function ResumenVotacion({ cambios }) {
  if (!cambios) return null;
  const g = cambios.general || 0;
  const movidos = ATTRS.filter(a => (cambios.attrs || {})[a.key]);
  const total = ATTRS.filter(a => cambios.attrs && cambios.attrs[a.key] !== undefined).length;
  const frase = g > 0 ? 'En general mejoraste' : g < 0 ? 'En general bajaste' : 'En general quedaste igual';
  const [fl, , col, bg] = FLECHA[g] || ['=', '', 'var(--text-2)', 'var(--surface-3)'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="row" style={{ gap: 10 }}>
        <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: bg, color: col, fontWeight: 800 }}>{fl}</span>
        <div><b>{frase}</b><div className="small">Según lo que votaron tus compañeros en este partido.</div></div>
      </div>
      {movidos.length ? (
        <div className="chips">
          {movidos.map(a => { const d = cambios.attrs[a.key]; const [f, txt, c, b] = FLECHA[d]; return (
            <span key={a.key} className="chip" style={{ background: b, color: c, borderColor: 'transparent' }} aria-label={`${a.label} ${txt}`}>{a.icon} {a.label} {f}</span>
          ); })}
        </div>
      ) : <div className="small">Ningún atributo cambió.</div>}
      {movidos.length && movidos.length < total ? <div className="small">El resto de los atributos quedó igual.</div> : null}
    </div>
  );
}

// Detalle de un partido jugado: equipos con los goles de cada uno.
export function DetallePartido({ p, jugadores }) {
  const ev = p.eventos || {};
  const goles = id => (ev[id] && ev[id].goles) || 0;
  const enContra = id => (ev[id] && ev[id].enContra) || 0;
  const eq = p.equipos && ((p.equipos.oscuro || []).length || (p.equipos.blanco || []).length) ? p.equipos : null;
  const ids = eq ? [...(eq.oscuro || []), ...(eq.blanco || [])] : (p.inscriptos || []);
  const asignados = ids.reduce((s, id) => s + goles(id), 0);
  const r = p.resultado || {};
  const totalReal = (r.golesO || 0) + (r.golesB || 0) - ids.reduce((s, id) => s + enContra(id), 0); // los goles en contra suman al rival pero no a un goleador
  const fila = id => (
    <li key={id} className="row" style={{ gap: 6 }}>
      <span className="grow">{nombreDe(id, jugadores, p)}</span>
      {goles(id) ? <b className="num" aria-label={`${goles(id)} ${pl(goles(id), 'gol', 'goles')}`}>{'⚽'.repeat(Math.min(goles(id), 5))}{goles(id) > 5 ? ` ${goles(id)}` : ''}</b> : null}
      {enContra(id) ? <span className="small" title="Gol en contra">EC {enContra(id)}</span> : null}
    </li>
  );
  const col = (lista, nombre, cls, marcador) => (
    <div className={`team ${cls}`}>
      <h4>{nombre}<span>{marcador}</span></h4>
      <ul>{[...lista].sort((a, b) => goles(b) - goles(a)).map(fila)}</ul>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {eq ? <div className="teams">{col(eq.oscuro || [], 'Oscuro', 'o', r.golesO ?? 0)}{col(eq.blanco || [], 'Blanco', 'b', r.golesB ?? 0)}</div>
        : <ul className="lista-simple" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>{ids.map(fila)}</ul>}
      {asignados === 0 ? <div className="small">No se cargó quién metió los goles de este partido.</div>
        : r.golesO !== undefined && asignados !== totalReal ? <div className="small">Se cargaron {asignados} de {totalReal} {pl(totalReal, 'gol', 'goles')} del resultado.</div> : null}
    </div>
  );
}
