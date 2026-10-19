import { pl } from '../lib/logica.js';
import { useState } from 'react';
import { mensajeError } from '../lib/firebase.js';
import { finalizarPartido, guardarEvento, guardarMarcador } from '../data/acciones.js';
import { Avatar, Btn, Card, Icono, Meter, Pill } from '../components/ui.jsx';
import { useSesion, nombreDe } from '../app/sesion.jsx';
import { useNav } from '../app/nav.jsx';

export default function Goles() {
  const { gid, partido: p, jugadores } = useSesion();
  const { ir } = useNav();
  const [error, setError] = useState('');
  const [confirma, setConfirma] = useState(false);
  const [cargando, setCargando] = useState(false);

  const oscuro = p.marcador ? p.marcador.oscuro : 0, blanco = p.marcador ? p.marcador.blanco : 0;
  const total = oscuro + blanco;
  const ev = p.eventos || {};
  const insc = p.inscriptos || [];
  const asignados = insc.reduce((s, id) => s + ((ev[id] && ev[id].goles) || 0), 0);
  const falta = total - asignados;

  const run = async fn => { setError(''); try { await fn(); } catch (e) { setError(mensajeError(e)); } };
  const marcador = (lado, d) => run(() => guardarMarcador(gid, p, Math.max(0, oscuro + (lado === 'o' ? d : 0)), Math.max(0, blanco + (lado === 'b' ? d : 0))));
  const gol = (id, d) => run(() => guardarEvento(gid, p, id, 'goles', ((ev[id] && ev[id].goles) || 0) + d));

  async function finalizar() {
    setCargando(true);
    await run(async () => { await finalizarPartido(gid, p); ir('partido', 'votar'); });
    setCargando(false);
  }

  const fila = id => (
    <div className="todo-r" key={id} style={{ minHeight: 52, paddingBlock: 8 }}>
      <Avatar nombre={nombreDe(id, jugadores, p)} foto={jugadores[id] && jugadores[id].foto} />
      <span className="grow" style={{ fontWeight: 550 }}>{nombreDe(id, jugadores, p)}</span>
      <div className="stepper">
        <button className="round" onClick={() => gol(id, -1)} aria-label={`Quitar gol a ${nombreDe(id, jugadores, p)}`}><Icono n="minus" /></button>
        <span className="v">{(ev[id] && ev[id].goles) || 0}</span>
        <button className="round pl" onClick={() => gol(id, 1)} aria-label={`Sumar gol a ${nombreDe(id, jugadores, p)}`}><Icono n="plus" /></button>
      </div>
    </div>
  );

  const eq = p.equipos;
  return (
    <>
      <div className="row sp"><h2 className="t">Resultado</h2><Pill t="tint"><Icono n="shield" />Solo admin</Pill></div>
      <Card className="score">
        {[['o', 'Oscuro', oscuro, 'eq-o'], ['b', 'Blanco', blanco, 'eq-b']].map(([k, nom, v, cls], i) => (
          <div key={k} style={{ display: 'contents' }}>
            {i === 1 ? <span style={{ fontSize: 18, color: 'var(--text-3)', fontWeight: 550 }}>a</span> : null}
            <div className="side"><span className={`pill ${cls}`}>{nom}</span><div className="n">{v}</div>
              <div className="stepper"><button className="round" onClick={() => marcador(k, -1)} aria-label={`Quitar gol a ${nom}`}><Icono n="minus" /></button>
                <button className="round pl" onClick={() => marcador(k, 1)} aria-label={`Sumar gol a ${nom}`}><Icono n="plus" /></button></div></div>
          </div>
        ))}
      </Card>
      <Card>
        <div className="card-h"><h3 className="t">Quién metió los goles</h3><span className={`pill ${falta === 0 ? 'ok' : 'warn'} num`}>{asignados} de {total}</span></div>
        <div style={{ padding: '10px 16px 0' }}><Meter claro pct={total ? (asignados / total) * 100 : 0} color={falta === 0 ? 'var(--ok)' : undefined} />
          <p className="small" style={{ marginTop: 8 }} role="status">{falta === 0 ? 'Coincide con el resultado.' : falta > 0 ? `${pl(falta, 'Falta', 'Faltan')} asignar ${falta} ${pl(falta, 'gol', 'goles')}.` : `${pl(-falta, 'Sobra', 'Sobran')} ${-falta} ${pl(-falta, 'gol', 'goles')} respecto del resultado.`}</p></div>
        <div style={{ paddingTop: 8 }}>
          {eq && eq.publicado ? (
            <>
              <div className="cap" style={{ padding: '6px 16px' }}>Oscuro</div>{(eq.oscuro || []).map(fila)}
              <div className="cap" style={{ padding: '10px 16px 6px', borderTop: '1px solid var(--line)' }}>Blanco</div>{(eq.blanco || []).map(fila)}
            </>
          ) : insc.map(fila)}
        </div>
      </Card>
      {error ? <div className="error" role="alert">{error}</div> : null}
      {confirma ? (
        <div className="confirm"><b>Los goles no coinciden con el resultado</b><span className="muted">El resultado oficial va a ser {oscuro} a {blanco}. ¿Finalizar igual y abrir la votación?</span>
          <div className="row"><Btn onClick={() => setConfirma(false)}>Revisar</Btn><Btn v="pri" disabled={cargando} onClick={finalizar}>Finalizar igual</Btn></div></div>
      ) : (
        <Btn v="pri" disabled={cargando || insc.length < 2} onClick={() => (falta === 0 ? finalizar() : setConfirma(true))}>Finalizar partido y abrir la votación</Btn>
      )}
      <p className="small">Al finalizar, los jugadores reciben un aviso y tienen 24 horas para votar.</p>
    </>
  );
}
