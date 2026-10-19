import { useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { db, mensajeError } from '../lib/firebase.js';
import { aMapa, useColl } from '../data/hooks.js';
import { borrarEquipos, guardarEquipos } from '../data/acciones.js';
import { ATTRS, balancear, calcProm } from '../lib/logica.js';
import { aFecha, titulo as tituloFecha } from '../lib/fechas.js';
import { Btn, Card, CardB, Icono, Meter, Pill, Vacio } from '../components/ui.jsx';
import { useSesion, nombreDe } from '../app/sesion.jsx';

const corto = n => { const p = (n || '').split(' ').filter(Boolean); return p.length > 1 ? `${p[0][0]}. ${p.slice(1).join(' ')}` : n; };

export default function Equipos() {
  const { gid, partido: p, jugadores, esAdmin } = useSesion();
  const niveles = aMapa(useColl(esAdmin ? collection(db, `grupos/${gid}/niveles`) : null, esAdmin ? gid : 'no'));
  const [borrador, setBorrador] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const publicado = !!(p.equipos && p.equipos.publicado);
  const equipos = borrador || (p.equipos ? { oscuro: p.equipos.oscuro || [], blanco: p.equipos.blanco || [] } : null);
  const insc = p.inscriptos || [];

  // Nivel de cada persona (solo lo ve el admin). Sin puntajes cargados se asume 5.
  const nivelDe = id => {
    if (id.startsWith('inv_')) return Number((p.invitados && p.invitados[id] && p.invitados[id].nivel) || 5);
    const at = niveles[id] && niveles[id].atributos;
    const v = at && Object.keys(at).length ? calcProm(at) : 5;
    return v || 5;
  };
  const suma = ids => ids.reduce((s, id) => s + nivelDe(id), 0);
  const tieneNivel = id => id.startsWith('inv_') || !!(niveles[id] && niveles[id].atributos && calcProm(niveles[id].atributos) > 0);
  const num = n => Number(n).toFixed(1).replace('.', ',');
  const sinNivel = insc.filter(id => !tieneNivel(id));

  function generar() {
    const lista = insc.map(id => ({ id, atributos: Object.fromEntries(ATTRS.map(a => [a.key, nivelDe(id)])) }));
    const { oscuro, blanco } = balancear(lista);
    setBorrador({ oscuro: oscuro.map(j => j.id), blanco: blanco.map(j => j.id) });
  }
  function mover(id, desde) {
    const o = [...equipos.oscuro], b = [...equipos.blanco];
    if (desde === 'o') { o.splice(o.indexOf(id), 1); b.push(id); } else { b.splice(b.indexOf(id), 1); o.push(id); }
    setBorrador({ oscuro: o, blanco: b });
  }
  async function ejecutar(fn) { setError(''); setCargando(true); try { await fn(); } catch (e) { setError(mensajeError(e)); } setCargando(false); }

  if (!equipos && !esAdmin) return <Vacio titulo="Todavía no hay equipos" texto="Cuando el admin los arme y los publique los ves acá." />;
  if (!equipos) return (
    <Vacio titulo="Equipos sin armar" texto={insc.length >= 2 ? 'Se arman equilibrados según el nivel de cada jugador.' : 'Hacen falta al menos 2 anotados.'}>
      {insc.length >= 2 ? <Btn v="pri" onClick={generar}>Armar equipos</Btn> : null}
    </Vacio>
  );

  const Col = ({ ids, clave, nombre, cls }) => (
    <div className={`team ${cls}`}>
      <h4>{nombre}<span>{ids.length}</span></h4>
      {esAdmin ? <div className="small" style={{ margin: '-2px 0 6px', fontWeight: 600 }}>Promedio {num(suma(ids) / (ids.length || 1))} · Suma {num(suma(ids))}</div> : null}
      <ul>
        {(esAdmin ? [...ids].sort((a, b) => nivelDe(b) - nivelDe(a)) : ids).map(id => (
          <li key={id} className="row" style={{ gap: 6 }}>
            <span className="grow">{corto(nombreDe(id, jugadores, p))}</span>
            {esAdmin ? <span className="num" title={tieneNivel(id) ? 'Nivel' : 'Sin nivel cargado: se asume 5'} style={{ fontSize: 13, fontWeight: 650, color: tieneNivel(id) ? 'inherit' : 'var(--warn)', opacity: tieneNivel(id) ? .85 : 1 }}>{num(nivelDe(id))}{tieneNivel(id) ? '' : '*'}</span> : null}
            {esAdmin && !publicado ? <button className="chip sm" style={{ minHeight: 30 }} onClick={() => mover(id, clave)} aria-label={`Pasar a ${nombreDe(id, jugadores, p)} al otro equipo`}><Icono n="arrow" style={{ width: 14, height: 14 }} /></button> : null}
          </li>
        ))}
      </ul>
    </div>
  );

  const dif = Math.abs(suma(equipos.oscuro) / (equipos.oscuro.length || 1) - suma(equipos.blanco) / (equipos.blanco.length || 1));
  const parejo = dif < 0.5;
  const d = aFecha(p.fechaHora);
  const texto = [`⚽ ${tituloFecha(d)}`, '', 'Oscuro', ...equipos.oscuro.map((id, i) => `${i + 1}. ${nombreDe(id, jugadores, p)}`), '', 'Blanco', ...equipos.blanco.map((id, i) => `${i + 1}. ${nombreDe(id, jugadores, p)}`)].join('\n');

  return (
    <>
      <div><h2 className="t">{publicado ? '¡Ya están los equipos!' : 'Equipos (borrador)'}</h2>
        <p className="lead" style={{ marginTop: 2 }}>{publicado ? 'Nos vemos en la cancha.' : 'Solo vos los ves. Publicalos cuando estén listos.'}</p></div>
      {esAdmin && sinNivel.length ? (
        <div className="hint" role="status"><span className="hi"><Icono n="info" /></span><div className="grow"><b>{sinNivel.length === 1 ? '1 jugador no tiene nivel cargado' : `${sinNivel.length} jugadores no tienen nivel cargado`}.</b> Para esos se asume 5 (aparecen con *), y el armado pierde precisión. Cargalo en Grupo, tocando al jugador y eligiendo "Cambiar nivel".<div className="small" style={{ marginTop: 4 }}>{sinNivel.map(id => nombreDe(id, jugadores, p)).join(', ')}</div></div></div>
      ) : null}
      <div className="teams"><Col ids={equipos.oscuro} clave="o" nombre="Oscuro" cls="o" /><Col ids={equipos.blanco} clave="b" nombre="Blanco" cls="b" /></div>
      {esAdmin ? (
        <CardB>
          <div className="row sp"><h3 className="t">Qué tan parejo quedó</h3><Pill t="tint"><Icono n="shield" />Solo admin</Pill></div>
          <div className="row sp" style={{ margin: '12px 0 8px' }}><b className="num" style={{ fontSize: 28, letterSpacing: '-.035em' }}>{dif.toFixed(1).replace('.', ',')}</b><Pill t={parejo ? 'ok' : 'warn'}>{parejo ? 'Muy parejo' : 'Podría mejorar'}</Pill></div>
          <Meter claro pct={Math.max(0, 100 - dif * 40)} />
          <p className="small" style={{ marginTop: 8 }}>Diferencia entre el promedio de Oscuro ({num(suma(equipos.oscuro) / (equipos.oscuro.length || 1))}) y el de Blanco ({num(suma(equipos.blanco) / (equipos.blanco.length || 1))}). Los jugadores no ven los niveles.</p>
        </CardB>
      ) : null}
      {error ? <div className="error" role="alert">{error}</div> : null}
      {esAdmin && !publicado ? (
        <>
          <Btn onClick={generar}><Icono n="refresh" />Volver a armar</Btn>
          <Btn v="pri" disabled={cargando} onClick={() => ejecutar(async () => { await guardarEquipos(gid, p, equipos.oscuro, equipos.blanco, true); setBorrador(null); })}>Publicar equipos</Btn>
        </>
      ) : null}
      {esAdmin && publicado ? <Btn v="ghost" disabled={cargando} onClick={() => ejecutar(async () => { await borrarEquipos(gid, p); setBorrador(null); })}>Rehacer los equipos</Btn> : null}
      {publicado || esAdmin ? <Btn onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')}><Icono n="share" />Compartir por WhatsApp</Btn> : null}
    </>
  );
}
