import { useEffect, useRef, useState } from 'react';
import { mensajeError } from '../lib/firebase.js';
import { deshacerGol, registrarGol, soltarEnVivo, tomarEnVivo } from '../data/acciones.js';
import { Btn, Card, CardB, Hint, Icono, Pill, useToast } from '../components/ui.jsx';
import { useSesion, nombreDe } from '../app/sesion.jsx';

// Modo en vivo (opcional): una persona va cargando los goles mientras se juega. Los demás ven el marcador al instante.
export default function EnVivo() {
  const { uid, gid, partido: p, jugadores, esAdmin } = useSesion();
  const toast = useToast();
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [enContra, setEnContra] = useState(false);
  const pantalla = useRef(null);

  const vivo = p.vivo || null;
  const soyCargador = !!vivo && vivo.uid === uid;
  const quien = vivo ? (vivo.uid === uid ? 'vos' : nombreDe(vivo.uid, jugadores, p)) : '';
  const eq = p.equipos && p.equipos.publicado ? p.equipos : null;
  const m = p.marcador || { oscuro: 0, blanco: 0 };
  const ev = p.eventos || {};

  // Mientras carga, que la pantalla no se apague.
  useEffect(() => {
    if (!soyCargador || !('wakeLock' in navigator)) return undefined;
    let activo = true;
    navigator.wakeLock.request('screen').then(l => { if (activo) pantalla.current = l; else l.release(); }).catch(() => {});
    return () => { activo = false; if (pantalla.current) { pantalla.current.release().catch(() => {}); pantalla.current = null; } };
  }, [soyCargador]);

  async function correr(fn, ok) {
    setError(''); setOcupado(true);
    try { const r = await fn(); if (ok) ok(r); } catch (e) { setError(mensajeError(e)); }
    setOcupado(false);
  }
  const gol = id => correr(() => registrarGol(gid, p.id, id, enContra), () => {
    if (navigator.vibrate) navigator.vibrate(25);
    toast(`${enContra ? 'Gol en contra de' : 'Gol de'} ${nombreDe(id, jugadores, p)}`);
    setEnContra(false);
  });

  const columna = (clave, titulo, cls) => (
    <div>
      <div className="row sp" style={{ marginBottom: 8 }}><span className={`pill ${cls}`}>{titulo}</span><b className="num" style={{ fontSize: 20 }}>{m[clave] || 0}</b></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(eq[clave] || []).map(id => {
          const n = (ev[id] && ev[id].goles) || 0, c = (ev[id] && ev[id].enContra) || 0;
          return (
            <button key={id} className="vivo-jug" disabled={ocupado} onClick={() => gol(id)} aria-label={`${enContra ? 'Gol en contra de' : 'Gol de'} ${nombreDe(id, jugadores, p)}`}>
              <span className="nom">{nombreDe(id, jugadores, p)}</span>
              {n || c ? <span className="cnt">{n ? `⚽ ${n}` : ''}{c ? ` EC ${c}` : ''}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <div className="row sp"><h2 className="t">Partido en vivo</h2><Pill t={vivo ? 'ok' : 'tint'}>{vivo ? 'En vivo' : 'Opcional'}</Pill></div>
      <Card className="score">
        <div className="side"><span className="pill eq-o">Oscuro</span><div className="n">{m.oscuro || 0}</div></div>
        <span style={{ fontSize: 18, color: 'var(--text-3)', fontWeight: 550 }}>a</span>
        <div className="side"><span className="pill eq-b">Blanco</span><div className="n">{m.blanco || 0}</div></div>
      </Card>

      {error ? <div className="error" role="alert">{error}</div> : null}

      {!eq ? (
        <Hint>Para cargar goles en vivo hay que publicar primero los equipos. Si preferís, podés cargar todo al final.</Hint>
      ) : soyCargador ? (
        <>
          <Hint icono="check">Estás cargando el partido. Tocá el nombre de quien metió el gol. Los demás lo ven al instante.</Hint>
          <div className="row" style={{ gap: 8 }}>
            <button className={`chip ${enContra ? 'on' : ''}`} aria-pressed={enContra} onClick={() => setEnContra(v => !v)}>Gol en contra</button>
            <span className="small">{enContra ? 'Tocá a quien lo hizo: suma al equipo rival.' : 'Activalo antes de tocar el nombre.'}</span>
          </div>
          <div className="grid2" style={{ alignItems: 'start' }}>{columna('oscuro', 'Oscuro', 'eq-o')}{columna('blanco', 'Blanco', 'eq-b')}</div>
          <div className="row" style={{ gap: 8 }}>
            <Btn disabled={ocupado} onClick={() => correr(() => deshacerGol(gid, p.id), r => toast(`Se deshizo el gol de ${nombreDe(r.jugadorId, jugadores, p)}`))}><Icono n="back" />Deshacer el último</Btn>
            <Btn disabled={ocupado} v="ghost" onClick={() => correr(() => soltarEnVivo(gid, p.id))}>Terminar de cargar</Btn>
          </div>
          <p className="small">Al terminar, el admin revisa el resultado en la pestaña Goles y finaliza el partido.</p>
        </>
      ) : vivo ? (
        <CardB>
          <b>Lo está cargando {quien}.</b>
          <p className="muted" style={{ marginTop: 4 }}>El marcador se actualiza solo. Si necesitás cargar vos, pedile que termine o, si es admin, tomá la carga.</p>
          {esAdmin ? <Btn style={{ marginTop: 12 }} disabled={ocupado} onClick={() => correr(() => tomarEnVivo(gid, p.id, true))}>Tomar la carga</Btn> : null}
          <div className="cap" style={{ marginTop: 14 }}>Goles</div>
          {[...(eq.oscuro || []), ...(eq.blanco || [])].filter(id => ev[id] && ev[id].goles).map(id => <div key={id} className="row sp" style={{ padding: '4px 0' }}><span>{nombreDe(id, jugadores, p)}</span><b className="num">{ev[id].goles}</b></div>)}
        </CardB>
      ) : (
        <CardB>
          <b>Nadie lo está cargando todavía.</b>
          <p className="muted" style={{ marginTop: 4 }}>Es opcional: si lo tomás, vas sumando cada gol con un toque y el resto lo ve en vivo. Si no, el admin carga todo al final.</p>
          <Btn v="pri" style={{ marginTop: 12 }} disabled={ocupado} onClick={() => correr(() => tomarEnVivo(gid, p.id))}>Cargar el partido en vivo</Btn>
        </CardB>
      )}
    </>
  );
}
