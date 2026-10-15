import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth, mensajeError } from '../lib/firebase.js';
import { guardarPerfil } from '../data/acciones.js';
import { ATTRS } from '../lib/logica.js';
import { Avatar, Btn, Campo, Card, CardB, Fila, Icono, Pill, useToast } from '../components/ui.jsx';
import { useSesion } from '../app/sesion.jsx';
import { useNav } from '../app/nav.jsx';
import { esSuper } from './Plataforma.jsx';
import { BarraSuperior } from '../app/Shell.jsx';

export default function Perfil() {
  const { user, uid, perfil, priv, grupos, jugadores, gid } = useSesion();
  const { ir } = useNav();
  const toast = useToast();
  const [nombre, setNombre] = useState(perfil.nombre || '');
  const [apodo, setApodo] = useState(perfil.apodo || '');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const yo = jugadores[uid];
  const tend = yo && yo.stats && yo.stats.partidos > 0 ? yo.tendencia || {} : null;

  async function guardar(e) {
    e.preventDefault(); setError('');
    if (nombre.trim().length < 2) return setError('El nombre es muy corto.');
    setCargando(true);
    try { await guardarPerfil(uid, { nombre, apodo, foto: perfil.foto || '' }, (grupos || []).map(g => g.id)); toast('Perfil actualizado'); }
    catch (err) { setError(mensajeError(err)); }
    setCargando(false);
  }

  return (
    <div className="scr">
      <BarraSuperior atras onAtras={() => ir('grupo')} />
      <div className="row"><Avatar nombre={perfil.nombre} foto={perfil.foto} yo lg /><div><h2 className="t" style={{ fontSize: 22 }}>{perfil.nombre}</h2><div className="muted">{user.email}</div></div></div>
      <form className="card card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={guardar}>
        <Campo label="Nombre" id="pf-nombre" value={nombre} onChange={e => setNombre(e.target.value)} maxLength={80} />
        <Campo label="Apodo (opcional)" id="pf-apodo" value={apodo} onChange={e => setApodo(e.target.value)} placeholder="El Flaco" maxLength={30} />
        {error ? <div className="error" role="alert">{error}</div> : null}
        <Btn type="submit" v="pri" disabled={cargando}>Guardar</Btn>
      </form>

      {yo && yo.stats ? (
        <Card>
          <div className="card-h"><h3 className="t">Mis números</h3></div>
          <div className="grid2" style={{ padding: 16 }}>
            {[['Partidos', yo.stats.partidos], ['Goles', yo.stats.goles], ['MVP', yo.stats.mvps], ['Puntos', yo.stats.puntos]].map(([l, v]) => <div key={l} className="mini" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}><span className="cap">{l}</span><b className="num" style={{ fontSize: 24, letterSpacing: '-.03em' }}>{v}</b></div>)}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="card-h"><h3 className="t">Cómo vengo jugando</h3></div>
        <div style={{ padding: 16 }}>
          {tend ? (
            <div className="grid2">{ATTRS.map(a => { const t = tend[a.key] || 0; return (
              <div key={a.key} className="mini"><span className="grow" style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</span>
                <b style={{ fontSize: 18, color: t > 0 ? 'var(--ok)' : t < 0 ? 'var(--bad)' : 'var(--text-3)' }} aria-label={t > 0 ? 'Mejoró' : t < 0 ? 'Bajó' : 'Igual'}>{t > 0 ? '↑' : t < 0 ? '↓' : '—'}</b></div>
            ); })}</div>
          ) : <p className="muted">Después de tu primer partido ves cómo cambia cada atributo. Los puntajes exactos son privados.</p>}
        </div>
      </Card>

      {priv && !priv.legacyDni ? <Card><Fila icono="refresh" titulo="Recuperar mi historial anterior" sub="Si jugabas con tu DNI antes de la versión nueva" onClick={() => ir('migrar')} derecha={<Icono n="chev" />} /></Card> : null}
      <Card><Fila icono="bell" titulo="Mis avisos" sub="Qué querés recibir en el celular" onClick={() => ir('misAvisos')} derecha={<Icono n="chev" />} /></Card>
      {esSuper(user) ? <Card><Fila icono="shield" titulo="Plataforma" sub="Migración de la versión anterior" onClick={() => ir('plataforma')} derecha={<Icono n="chev" />} /></Card> : null}
      <Btn onClick={() => signOut(auth)}><Icono n="logout" />Cerrar sesión</Btn>
    </div>
  );
}
