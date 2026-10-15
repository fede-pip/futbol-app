import { useState } from 'react';
import { collection, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useColl } from '../data/hooks.js';
import { aFecha, diaCorto, mayus } from '../lib/fechas.js';
import { Avatar, Card, CardB, Hint, Icono, Pill, Vacio } from '../components/ui.jsx';
import { useSesion, nombreDe } from '../app/sesion.jsx';
import { BarraSuperior } from '../app/Shell.jsx';

const corto = n => { const p = (n || '').split(' ').filter(Boolean); return p.length > 1 ? `${p[0][0]}. ${p.slice(1).join(' ')}` : n; };

export default function Stats() {
  const { uid, gid, grupo, jugadores } = useSesion();
  const [vista, setVista] = useState('puntos');
  const cerrados = useColl(query(collection(db, `grupos/${gid}/partidos`), where('estado', '==', 'cerrado'), orderBy('fechaHora', 'desc'), limit(40)), gid);

  const filas = grupo.miembros.map(id => ({ id, ...(jugadores[id] || {}) })).filter(j => j.nombre);
  const valor = j => (vista === 'goles' ? (j.stats && j.stats.goles) || 0 : (j.stats && j.stats.puntos) || 0);
  const orden = [...filas].sort((a, b) => valor(b) - valor(a) || ((b.stats && b.stats.goles) || 0) - ((a.stats && a.stats.goles) || 0) || a.nombre.localeCompare(b.nombre));
  const hayDatos = filas.some(j => j.stats && j.stats.partidos > 0);
  const mvp = cerrados && cerrados[0] && cerrados[0].mvps && cerrados[0].mvps[0];

  return (
    <div className="scr">
      <BarraSuperior titulo="Estadísticas" />
      <div><div className="cap">{grupo.nombre}</div><h2 className="t" style={{ marginTop: 2 }}>Temporada</h2></div>
      <div className="seg" role="group" aria-label="Ver">
        {[['puntos', 'Puntos'], ['goles', 'Goles'], ['partidos', 'Partidos']].map(([k, t]) => <button key={k} aria-pressed={vista === k} onClick={() => setVista(k)} style={{ minHeight: 40 }}>{t}</button>)}
      </div>
      {mvp && vista !== 'partidos' ? (
        <CardB className="row"><span className="ti" style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--warn-bg)', color: 'var(--warn)', flex: 'none' }}><Icono n="star" /></span>
          <div className="grow"><b>MVP del último partido</b><div className="muted">{nombreDe(mvp, jugadores, cerrados[0])}</div></div></CardB>
      ) : null}

      {vista === 'partidos' ? (
        cerrados === undefined ? null : cerrados.length === 0 ? <Vacio titulo="Todavía no hay partidos jugados" texto="Cuando se cierre la votación del primero, aparece acá." /> : (
          cerrados.map(p => {
            const r = p.resultado || {};
            return (
              <Card key={p.id}>
                <CardB style={{ border: 0, boxShadow: 'none' }}>
                  <div className="row sp"><b>{mayus(diaCorto(aFecha(p.fechaHora)))}</b><span className="small">{p.lugar}</span></div>
                  <div className="row sp" style={{ marginTop: 10 }}><span className="pill eq-o">Oscuro</span><b className="num" style={{ fontSize: 24, letterSpacing: '-.03em' }}>{r.golesO ?? 0} – {r.golesB ?? 0}</b><span className="pill eq-b">Blanco</span></div>
                  {p.mvps && p.mvps.length ? <div className="row" style={{ marginTop: 10, justifyContent: 'center', gap: 8 }}><Pill t="warn"><Icono n="star" />MVP</Pill><span style={{ fontWeight: 550 }}>{p.mvps.map(id => nombreDe(id, jugadores, p)).join(' y ')}</span></div> : null}
                </CardB>
              </Card>
            );
          })
        )
      ) : !hayDatos ? (
        <Vacio titulo="Todavía no hay estadísticas" texto="Se arman con el primer partido que se cierre." />
      ) : (
        <>
          <Card>
            {orden.map((j, i) => (
              <div key={j.id} className={`rank ${j.id === uid ? 'me' : ''}`}>
                <span className="pos">{i + 1}</span>
                <Avatar nombre={j.nombre} foto={j.foto} yo={j.id === uid} />
                <span style={{ overflowWrap: 'anywhere', fontWeight: 550 }}>{corto(j.nombre)}{j.id === uid ? <> <Pill t="tint">Vos</Pill></> : null}</span>
                <div className="racha" aria-label="Últimos 5 partidos">{(j.racha || '').slice(-5).split('').map((c, k) => <b key={k} className={c}>{c}</b>)}</div>
                <b className="num" style={{ textAlign: 'right', fontWeight: 650 }}>{valor(j)}</b>
              </div>
            ))}
          </Card>
          <Hint><b>Cómo leer la racha.</b> <span className="racha" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><b className="G">G</b></span> ganó, <span className="racha" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><b className="E">E</b></span> empató y <span className="racha" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><b className="P">P</b></span> perdió. Ganar suma 3 puntos y empatar 1.</Hint>
        </>
      )}
    </div>
  );
}
