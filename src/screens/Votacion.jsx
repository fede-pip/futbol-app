import { useEffect, useState } from 'react';
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
  const [paso, setPaso] = useState(() => { try { return (JSON.parse(localStorage.getItem(`votoBorrador:${gid}:${p.id}:${uid}`)) || {}).paso || 0; } catch (e) { return 0; } });
  const claveBorrador = `votoBorrador:${gid}:${p.id}:${uid}`;
  const leerBorrador = () => { try { return JSON.parse(localStorage.getItem(claveBorrador)) || {}; } catch (e) { return {}; } };
  const [notas, setNotas] = useState(() => leerBorrador().notas || {});
  const [mvp, setMvp] = useState(() => leerBorrador().mvp || null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [confirma, setConfirma] = useState(false);

  // Se guarda lo votado en el celular hasta enviarlo: si salís o recargás no perdés nada.
  useEffect(() => { try { localStorage.setItem(claveBorrador, JSON.stringify({ notas, mvp, paso })); } catch (e) { /* sin almacenamiento */ } }, [notas, mvp, paso]);
  // Al pasar al grupo siguiente se vuelve arriba para ver los nombres nuevos.
  useEffect(() => { window.scrollTo(0, 0); }, [paso]);

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
  const completa = t => ATTRS.every(a => { const v = notas[t] && notas[t][a.key]; return v === null || (v && v.mas && v.menos); });
  const enMvp = paso >= ternas.length;

  const elegir = (t, clave, v) => setNotas(n => ({ ...n, [t]: { ...(n[t] || {}), [clave]: v } }));
  // Toque sobre un compañero: primero el que MÁS, después el que MENOS; el que queda es el intermedio.
  function tocar(t, clave, id) {
    const v = (notas[t] && notas[t][clave]) || {};
    const act = { mas: v.mas || null, menos: v.menos || null };
    if (act.mas === id) act.mas = null;
    else if (act.menos === id) act.menos = null;
    else if (!act.mas) act.mas = id;
    else if (!act.menos) act.menos = id;
    else act.mas = id; // ya estaban los dos: tocar al del medio lo pasa a "más" y conserva el "menos"
    elegir(t, clave, act);
  }

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

  if (enMvp) {
    const candidatos = insc.filter(id => id !== uid);
    return (
      <>
        <div className="prog" style={{ gridTemplateColumns: `repeat(${ternas.length + 1},1fr)` }}>{[...ternas, 'mvp'].map((_, i) => <i key={i} className="on" />)}</div>
        <div><h2 className="t">¿Quién fue el MVP?</h2><p className="lead" style={{ marginTop: 2 }}>{ternas.length ? 'Elegí a uno de tus compañeros.' : 'Fueron pocos para comparar, así que solo elegí al MVP.'}</p></div>
        <Card>{candidatos.map(id => (
          <button className="todo-r" key={id} onClick={() => setMvp(id)} aria-pressed={mvp === id}>
            <Avatar nombre={nombreDe(id, jugadores, p)} foto={jugadores[id] && jugadores[id].foto} />
            <span className="grow" style={{ fontWeight: 550, textAlign: 'left' }}>{nombreDe(id, jugadores, p)}</span>
            {mvp === id ? <Pill t="warn"><Icono n="star" />MVP</Pill> : null}
          </button>
        ))}</Card>
        {error ? <div className="error" role="alert">{error}</div> : null}
        <Btn v="pri" disabled={!mvp || cargando} onClick={enviar}>{cargando ? 'Enviando…' : 'Enviar votos'}</Btn>
        {paso > 0 ? <Btn v="ghost" onClick={() => setPaso(paso - 1)}>Volver</Btn> : null}
      </>
    );
  }

  const trio = ternas[paso].j;
  return (
    <>
      <div className="prog" style={{ gridTemplateColumns: `repeat(${ternas.length + 1},1fr)` }}>{[...ternas, 'mvp'].map((_, i) => <i key={i} className={i <= paso ? 'on' : ''} />)}</div>
      <div><div className="cap">Grupo {paso + 1} de {ternas.length}</div>
        <h2 className="t" style={{ fontSize: 22 }}>Compará a estos tres</h2>
        <p className="muted" style={{ marginTop: 2 }}>Es anónimo. En cada punto tocá primero al mejor y después al peor: el que queda es el del medio. Si no los viste jugar, tocá "No los vi".</p></div>
      {ATTRS.map(a => {
        const v = notas[paso] && notas[paso][a.key];
        const salteada = v === null;
        const mas = v && v.mas, menos = v && v.menos;
        const pregunta = salteada ? 'No los viste en este punto' : !mas ? a.pMas : !menos ? a.pMenos : 'Listo. Tocá a otro si querés cambiarlo';
        return (
          <CardB key={a.key} style={{ padding: '12px 14px' }}>
            <div className="row sp" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
              <div><b style={{ fontWeight: 600 }}><span aria-hidden="true">{a.icon} </span>{a.label}</b><div className="small" style={{ marginTop: 2 }} aria-live="polite">{pregunta}</div></div>
              <button type="button" className="chip" aria-pressed={salteada} onClick={() => elegir(paso, a.key, salteada ? undefined : null)}>No los vi</button>
            </div>
            {salteada ? null : (
              <div className="terna" role="group" aria-label={`${a.label}: ${a.pMas}`}>{trio.map(id => {
                const r = id === mas ? 'mas' : id === menos ? 'menos' : mas && menos ? 'medio' : '';
                const etiqueta = r === 'mas' ? '▲ Más' : r === 'menos' ? '▼ Menos' : r === 'medio' ? 'Del medio' : '';
                return (
                  <button key={id} type="button" className="tj" data-r={r} aria-pressed={!!r} onClick={() => tocar(paso, a.key, id)}>
                    <Avatar nombre={nombreDe(id, jugadores, p)} foto={jugadores[id] && jugadores[id].foto} />
                    <span className="nm">{nombreDe(id, jugadores, p)}</span>
                    <span className="tag">{etiqueta}</span>
                  </button>
                );
              })}</div>
            )}
          </CardB>
        );
      })}
      {completa(paso) ? null : <p className="small" role="status" style={{ textAlign: 'center' }}>Te falta: {ATTRS.filter(a => { const v = notas[paso] && notas[paso][a.key]; return !(v === null || (v && v.mas && v.menos)); }).map(a => a.label).join(', ')}</p>}
      <Btn v="pri" disabled={!completa(paso)} onClick={() => setPaso(paso + 1)}>{paso + 1 < ternas.length ? 'Siguiente grupo' : 'Elegir al MVP'}</Btn>
      {paso > 0 ? <Btn v="ghost" onClick={() => setPaso(paso - 1)}>Volver</Btn> : null}
    </>
  );
}
