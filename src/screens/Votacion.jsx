import { useEffect, useRef, useState } from 'react';
import { collection } from 'firebase/firestore';
import { db, llamar, mensajeError } from '../lib/firebase.js';
import { useColl } from '../data/hooks.js';
import { ATTRS, quedanN } from '../lib/logica.js';
import { aFecha } from '../lib/fechas.js';
import { Avatar, Btn, Card, CardB, Fila, Icono, Meter, Pill, Vacio } from '../components/ui.jsx';
import { useSesion, nombreDe } from '../app/sesion.jsx';
import { useNav } from '../app/nav.jsx';

export default function Votacion() {
  const { uid, gid, partido: p, jugadores, esAdmin } = useSesion();
  const { ir } = useNav();
  const votos = useColl(collection(db, `grupos/${gid}/partidos/${p.id}/votos`), `${gid}/${p.id}`);
  const claveBorrador = `votoBorrador:${gid}:${p.id}:${uid}`;
  const leerBorrador = () => { try { return JSON.parse(localStorage.getItem(claveBorrador)) || {}; } catch (e) { return {}; } };
  const [notas, setNotas] = useState(() => leerBorrador().notas || {});
  const [mvp, setMvp] = useState(() => leerBorrador().mvp || null);
  const [paso, setPaso] = useState(() => leerBorrador().paso || 0);   // grupo de 3 compañeros
  const [sub, setSub] = useState(() => leerBorrador().sub || 0);      // atributo dentro del grupo
  const clavePaso = useRef('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [confirma, setConfirma] = useState(false);

  // Se guarda lo votado en el celular hasta enviarlo: si salís o recargás no perdés nada.
  useEffect(() => { try { localStorage.setItem(claveBorrador, JSON.stringify({ notas, mvp, paso, sub })); } catch (e) { /* sin almacenamiento */ } }, [notas, mvp, paso, sub]);
  // Al pasar a la pregunta siguiente se vuelve arriba.
  useEffect(() => { window.scrollTo(0, 0); }, [paso, sub]);

  if (p.estado !== 'votando') {
    return (
      <>
        <Vacio titulo="La votación todavía no se abrió" texto="Se abre cuando el admin finaliza el partido." />
        {esAdmin ? <Btn onClick={() => ir('partido', 'goles')}>Ir a cargar el resultado</Btn> : null}
      </>
    );
  }

  const insc = p.inscriptos || [];
  const jug = insc.filter(id => !id.startsWith('inv_') && !id.startsWith('l_'));
  const yaVotaron = (votos || []).map(v => v.id);
  const yoVote = yaVotaron.includes(uid) || enviado;
  const esParte = insc.includes(uid);
  const crudas = (p.asignaciones && p.asignaciones[uid]) || [];
  const formatoViejo = crudas.some(x => !x || !Array.isArray(x.j) || x.j.length !== 3);
  const ternas = formatoViejo ? [] : crudas;
  const cierra = p.fechaFin ? aFecha(p.fechaFin).getTime() + 24 * 3600e3 : 0;
  const horas = Math.max(0, Math.ceil((cierra - Date.now()) / 3600e3));
  const vencido = cierra && Date.now() > cierra;
  const puedeVotar = esParte && !yoVote && !vencido && !formatoViejo;
  // notas[t][atributo] = { mas, menos } | null ("no los vi") | undefined (sin responder)
  const enMvp = paso >= ternas.length;

  const elegir = (t, clave, v) => setNotas(n => ({ ...n, [t]: { ...(n[t] || {}), [clave]: v } }));
  const nAttr = ATTRS.length;
  const avanzar = (t, k) => { if (k < nAttr - 1) setSub(k + 1); else { setPaso(t + 1); setSub(0); } };
  const retroceder = () => { if (sub > 0) setSub(sub - 1); else if (paso > 0) { setPaso(paso - 1); setSub(nAttr - 1); } };
  // Toque sobre un compañero: primero el que MÁS, después el que MENOS; el que queda es el del medio.
  // Cuando quedan los dos elegidos se pasa solo a la pregunta siguiente.
  function tocar(t, k, id) {
    const clave = ATTRS[k].key;
    const v = (notas[t] && notas[t][clave]) || {};
    const act = { mas: v.mas || null, menos: v.menos || null };
    const estabaCompleto = !!(act.mas && act.menos);
    if (act.mas === id) act.mas = null;
    else if (act.menos === id) act.menos = null;
    else if (!act.mas) act.mas = id;
    else if (!act.menos) act.menos = id;
    else act.mas = id; // ya estaban los dos: tocar al del medio lo pasa a "más" y conserva el "menos"
    elegir(t, clave, act);
    if (act.mas && act.menos && !estabaCompleto) {
      const marca = `${t}-${k}-${Date.now()}`; clavePaso.current = marca;
      setTimeout(() => { if (clavePaso.current === marca) avanzar(t, k); }, 450);
    }
  }
  const noLosVi = (t, k) => { clavePaso.current = ''; elegir(t, ATTRS[k].key, null); avanzar(t, k); };
  const ningunoDelGrupo = t => { clavePaso.current = ''; setNotas(n => ({ ...n, [t]: Object.fromEntries(ATTRS.map(a => [a.key, null])) })); setPaso(t + 1); setSub(0); };

  async function enviar() {
    setError(''); setCargando(true);
    try { await llamar('votar', { gid, pid: p.id, notas, mvp }); try { localStorage.removeItem(claveBorrador); } catch (e) { /* nada */ } setEnviado(true); }
    catch (e) { setError(mensajeError(e)); }
    setCargando(false);
  }
  async function cerrar() {
    setError(''); setCargando(true);
    try { await llamar('cerrarVotacion', { gid, pid: p.id }); ir('stats'); }
    catch (e) { setError(mensajeError(e)); }
    setCargando(false);
  }

  const estado = (
    <Card>
      <div className="card-h"><h3 className="t">Quiénes votaron</h3><Pill t="info" className="num">{yaVotaron.length} de {jug.length}</Pill></div>
      <div style={{ padding: '10px 16px 0' }}><Meter claro pct={jug.length ? (yaVotaron.length / jug.length) * 100 : 0} />
        <p className="small" style={{ marginTop: 8 }}>{vencido ? 'Se terminó el plazo para votar.' : `${quedanN(horas)} h para votar. Los votos son anónimos.`}</p></div>
      <div style={{ paddingTop: 6 }}>
        {jug.map(id => (
          <div className="todo-r" key={id} style={{ minHeight: 48, paddingBlock: 6 }}>
            <Avatar nombre={nombreDe(id, jugadores, p)} foto={jugadores[id] && jugadores[id].foto} yo={id === uid} />
            <span className="grow" style={{ fontWeight: 550 }}>{nombreDe(id, jugadores, p)}</span>
            {yaVotaron.includes(id) ? <Pill t="ok">Votó</Pill> : <Pill>Pendiente</Pill>}
          </div>
        ))}
      </div>
    </Card>
  );

  const cierreAdmin = esAdmin ? (
    confirma ? (
      <div className="confirm"><b>¿Cerrar la votación y guardar resultados?</b>
        <span className="muted">{yaVotaron.length < jug.length ? `Todavía faltan ${jug.length - yaVotaron.length} votos que no se van a contar. ` : ''}Se actualizan estadísticas y niveles, y se avisa a todos.</span>
        <div className="row"><Btn onClick={() => setConfirma(false)}>Esperar</Btn><Btn v="pri" disabled={cargando} onClick={cerrar}>Cerrar ahora</Btn></div></div>
    ) : <Btn v="pri" onClick={() => setConfirma(true)}><Icono n="trophy" />Cerrar votación y guardar resultados</Btn>
  ) : null;

  if (yoVote) {
    return (
      <>
        <section className="kpi pitch"><div className="lb">Listo</div><div className="v">Gracias</div><div className="s" style={{ display: 'block', marginTop: 2 }}>Tus votos son anónimos. Cuando voten todos, el admin cierra y se actualizan las estadísticas.</div></section>
        {estado}{error ? <div className="error" role="alert">{error}</div> : null}{cierreAdmin}
      </>
    );
  }

  if (!puedeVotar) {
    const motivo = !esParte ? 'Solo votan quienes jugaron el partido.' : vencido ? 'Se terminó el plazo para votar.' : formatoViejo ? 'Esta votación se armó con un formato anterior. Pedile al admin que la vuelva a abrir.' : 'No se pudo armar tu votación.';
    return <>{<Vacio titulo="No podés votar este partido" texto={motivo} />}{estado}{error ? <div className="error" role="alert">{error}</div> : null}{cierreAdmin}</>;
  }

  const total = ternas.length * nAttr;
  const hechas = enMvp ? total : paso * nAttr + sub;

  if (enMvp) {
    const candidatos = insc.filter(id => id !== uid);
    const comparadas = ternas.reduce((n, _, t) => n + ATTRS.filter(a => notas[t] && notas[t][a.key]).length, 0);
    return (
      <>
        <Meter pct={100} />
        <div><h2 className="t">¿Quién fue el MVP?</h2><p className="lead" style={{ marginTop: 2 }}>{ternas.length ? 'Elegí al mejor del partido. Es obligatorio.' : 'Fueron pocos para comparar, así que solo elegí al MVP.'}</p></div>
        <Card>{candidatos.map(id => (
          <button className="todo-r" key={id} onClick={() => setMvp(id)} aria-pressed={mvp === id}>
            <Avatar nombre={nombreDe(id, jugadores, p)} foto={jugadores[id] && jugadores[id].foto} />
            <span className="grow" style={{ fontWeight: 550, textAlign: 'left' }}>{nombreDe(id, jugadores, p)}</span>
            {mvp === id ? <Pill t="warn"><Icono n="star" />MVP</Pill> : null}
          </button>
        ))}</Card>
        {ternas.length ? <p className="small" role="status">Resumen: respondiste {comparadas} de {total} comparaciones · MVP: {mvp ? nombreDe(mvp, jugadores, p) : 'sin elegir'}.</p> : null}
        {error ? <div className="error" role="alert">{error}</div> : null}
        <Btn v="pri" disabled={cargando || !mvp} onClick={enviar}>{cargando ? 'Enviando…' : 'Enviar votos'}</Btn>
        {ternas.length ? <Btn v="ghost" onClick={() => { setPaso(ternas.length - 1); setSub(nAttr - 1); }}>Volver</Btn> : null}
      </>
    );
  }

  const trio = ternas[paso].j;
  const a = ATTRS[sub];
  const v = notas[paso] && notas[paso][a.key];
  const salteada = v === null;
  const mas = v && v.mas, menos = v && v.menos;
  const completa = salteada || !!(mas && menos);
  const pregunta = salteada ? 'Marcaste que no los viste en este punto.' : !mas ? a.pMas : !menos ? a.pMenos : 'Listo. Tocá a otro si querés cambiarlo.';
  return (
    <>
      <div><div className="row sp"><span className="cap">Grupo {paso + 1} de {ternas.length} · {sub + 1} de {nAttr}</span><span className="small">{hechas} de {total}</span></div><Meter pct={(hechas / total) * 100} /></div>
      {paso === 0 && sub === 0 && !Object.keys(notas).length ? <p className="muted">Es anónimo. Vas a comparar a 3 compañeros por vez: tocá primero al mejor y después al peor, el que queda es el del medio.</p> : null}
      <h2 className="t" style={{ fontSize: 22 }}><span aria-hidden="true">{a.icon} </span>{a.label}</h2>
      <p className="lead" style={{ marginTop: -4 }} aria-live="polite">{pregunta}</p>
      <div className="terna grande" role="group" aria-label={`${a.label}: ${a.pMas}`}>
        {trio.map(id => {
          const r = id === mas ? 'mas' : id === menos ? 'menos' : mas && menos ? 'medio' : '';
          const etiqueta = r === 'mas' ? '▲ Más' : r === 'menos' ? '▼ Menos' : r === 'medio' ? 'Del medio' : '';
          return (
            <button key={id} type="button" className="tj" data-r={salteada ? '' : r} aria-pressed={!salteada && !!r} disabled={salteada} onClick={() => tocar(paso, sub, id)}>
              <Avatar nombre={nombreDe(id, jugadores, p)} foto={jugadores[id] && jugadores[id].foto} lg />
              <span className="nm">{nombreDe(id, jugadores, p)}</span>
              <span className="tag">{salteada ? '' : etiqueta}</span>
            </button>
          );
        })}
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="chip" aria-pressed={salteada} onClick={() => (salteada ? elegir(paso, a.key, undefined) : noLosVi(paso, sub))}>{salteada ? 'Deshacer "No los vi"' : 'No los vi'}</button>
        <button type="button" className="chip" onClick={() => ningunoDelGrupo(paso)}>No vi a ninguno de estos</button>
      </div>
      <Btn v="pri" disabled={!completa} onClick={() => { clavePaso.current = ''; avanzar(paso, sub); }}>{sub < nAttr - 1 ? 'Siguiente' : paso + 1 < ternas.length ? 'Siguiente grupo' : 'Elegir al MVP'}</Btn>
      {paso > 0 || sub > 0 ? <Btn v="ghost" onClick={() => { clavePaso.current = ''; retroceder(); }}>Volver</Btn> : null}
    </>
  );
}
