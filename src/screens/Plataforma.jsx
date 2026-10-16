import { useState } from 'react';
import { esProduccion, llamar, mensajeError } from '../lib/firebase.js';
import { Btn, Card, CardB, Fila, Hint, Pill, useToast } from '../components/ui.jsx';
import { useSesion } from '../app/sesion.jsx';
import { useNav } from '../app/nav.jsx';
import { BarraSuperior } from '../app/Shell.jsx';

export const SUPER_EMAILS = ['fede@inmetricswetrust.com', 'hola@inmetricswetrust.com'];
export const esSuper = user => !!(user && user.emailVerified && SUPER_EMAILS.includes((user.email || '').toLowerCase()));

// Herramientas del dueño de la plataforma: pasar los datos de la versión anterior al modelo nuevo.
function AyudaAcceso() {
  const { jugadores } = useSesion();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const norm = t => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const lista = Object.entries(jugadores || {}).filter(([id, j]) => !id.startsWith('l_') && j.nombre && (!q.trim() || norm(j.nombre + ' ' + (j.apodo || '')).includes(norm(q)))).slice(0, 8);
  async function generar(id, nombre) {
    setError(''); setRes(null); setCargando(true);
    try { const r = await llamar('enlaceDeAcceso', { uid: id }); setRes({ ...r, nombre }); } catch (e) { setError(mensajeError(e)); }
    setCargando(false);
  }
  const mensaje = r => `Hola ${r.nombre.split(' ')[0]}! Entrá a este enlace para elegir una contraseña nueva en Me Anoto (es solo para vos): ${r.enlace}`;
  return (
    <CardB style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 className="t">Ayudar a alguien a entrar</h3>
      <p className="muted">Buscá a la persona y generá un enlace para que elija una contraseña nueva, sin esperar el mail. Mandáselo solo a ella por WhatsApp.</p>
      <div className="field"><label htmlFor="ayuda-q">Nombre</label><input id="ayuda-q" value={q} onChange={e => { setQ(e.target.value); setRes(null); }} placeholder="Nico" autoComplete="off" /></div>
      {q.trim() ? lista.map(([id, j]) => <Fila key={id} icono="user" titulo={j.nombre} sub={j.apodo || ''} onClick={() => generar(id, j.nombre)} derecha={<Pill t="tint">Generar enlace</Pill>} />) : null}
      {cargando ? <p className="small">Generando…</p> : null}
      {error ? <div className="error" role="alert">{error}</div> : null}
      {res ? (
        <div className="confirm">
          <b>Enlace para {res.nombre}</b>
          <span className="muted">{res.email}{res.soloGoogle ? ' · Entra con Google: puede usar "Seguir con Google" sin contraseña.' : ''}</span>
          <div className="row" style={{ gap: 8 }}>
            <Btn onClick={async () => { try { await navigator.clipboard.writeText(res.enlace); toast('Enlace copiado'); } catch (e) { toast('No se pudo copiar'); } }}>Copiar</Btn>
            <Btn v="pri" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(mensaje(res))}`, '_blank', 'noopener')}>WhatsApp</Btn>
          </div>
        </div>
      ) : null}
    </CardB>
  );
}

export default function Plataforma() {
  const { user } = useSesion();
  const { ir } = useNav();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [confirma, setConfirma] = useState(false);

  async function correr(datos) {
    setError(''); setCargando(true);
    try { setR(await llamar('migrarDatosAnteriores', datos)); } catch (e) { setError(mensajeError(e)); }
    setCargando(false); setConfirma(false);
  }
  if (!esSuper(user)) return <div className="scr"><BarraSuperior atras onAtras={() => ir('perfil')} /><div className="lista-vacia">No tenés acceso a esta sección.</div></div>;

  return (
    <div className="scr">
      <BarraSuperior atras onAtras={() => ir('inicio')} />
      <div><h2 className="t">Plataforma</h2><p className="lead" style={{ marginTop: 2 }}>Datos de la versión anterior · {esProduccion ? 'PRODUCCIÓN' : 'pruebas'}</p></div>
      <AyudaAcceso />
      <Hint>Primero mirá qué se migraría. Migrar crea los grupos nuevos con cada jugador como perfil pendiente; no borra nada de lo anterior y no pisa grupos ya migrados.</Hint>
      <Btn disabled={cargando} onClick={() => correr({ dryRun: true })}>{cargando ? 'Mirando…' : 'Ver qué se migraría'}</Btn>
      {!esProduccion ? <Btn disabled={cargando} onClick={() => correr({ dryRun: true, sembrar: true, forzar: true })}>Sembrar datos anteriores de prueba</Btn> : null}
      {r ? (
        <Card>
          <div className="card-h"><h3 className="t">{r.dryRun ? 'Resultado de la simulación' : 'Migración hecha'}</h3><Pill t="tint">{r.usuariosAnteriores} usuarios</Pill></div>
          <div style={{ paddingTop: 6 }}>
            {r.grupos.map(g => <Fila key={g.id} icono="users" titulo={g.nombre || g.id} sub={g.estado === 'ya migrado' ? 'Ya estaba migrado' : `${g.jugadores} jugadores · ${g.partidosHistoricos} partidos${g.partidoActivo ? ' · con partido abierto' : ''}`} derecha={<Pill t={g.estado === 'migrado' ? 'ok' : ''}>{g.estado}</Pill>} />)}
            {r.grupos.length === 0 ? <div className="lista-vacia">No hay grupos en la versión anterior.</div> : null}
          </div>
        </Card>
      ) : null}
      {r && r.dryRun && r.grupos.some(g => g.estado === 'listo para migrar') ? (
        confirma ? (
          <div className="confirm"><b>¿Migrar ahora?</b><span className="muted">Se crean los grupos nuevos en {esProduccion ? 'producción' : 'pruebas'}. Lo anterior queda intacto.</span>
            <div className="row"><Btn onClick={() => setConfirma(false)}>Cancelar</Btn><Btn v="pri" disabled={cargando} onClick={() => correr({ dryRun: false })}>Migrar</Btn></div></div>
        ) : <Btn v="pri" onClick={() => setConfirma(true)}>Migrar los datos</Btn>
      ) : null}
      {error ? <div className="error" role="alert">{error}</div> : null}
    </div>
  );
}
