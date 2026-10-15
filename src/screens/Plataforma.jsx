import { useState } from 'react';
import { esProduccion, llamar, mensajeError } from '../lib/firebase.js';
import { Btn, Card, CardB, Fila, Hint, Pill } from '../components/ui.jsx';
import { useSesion } from '../app/sesion.jsx';
import { useNav } from '../app/nav.jsx';
import { BarraSuperior } from '../app/Shell.jsx';

export const SUPER_EMAILS = ['fede@inmetricswetrust.com', 'hola@inmetricswetrust.com'];
export const esSuper = user => !!(user && user.emailVerified && SUPER_EMAILS.includes((user.email || '').toLowerCase()));

// Herramientas del dueño de la plataforma: pasar los datos de la versión anterior al modelo nuevo.
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
