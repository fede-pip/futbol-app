import { useState } from 'react';
import { guardarPrefs, marcarLeido, marcarTodosLeidos } from '../data/acciones.js';
import { haceCuanto } from '../lib/fechas.js';
import { CATEGORIA_AVISO, catalogoPorId } from '../lib/catalogo.js';
import { activarPush, esAppInstalada, esIPhone, estadoPermiso } from '../lib/push.js';
import { Btn, Card, CardB, Hint, Icono, Pill, Switch, Vacio } from '../components/ui.jsx';
import { useSesion } from '../app/sesion.jsx';
import { useNav } from '../app/nav.jsx';
import { BarraSuperior } from '../app/Shell.jsx';
import { mensajeError } from '../lib/firebase.js';

const ICONO = id => (catalogoPorId[id] && catalogoPorId[id].ic) || 'bell';
const DESTINO = { equipos: ['partido', 'equipos'], cambio_equipo: ['partido', 'equipos'], votaciones: ['partido', 'votar'], votos_pendientes: ['partido', 'votar'], votos_admin: ['partido', 'votar'], resultado: ['stats', ''], mvp: ['stats', ''], racha: ['stats', ''], posicion: ['stats', ''], resumen: ['stats', ''], nuevo_miembro: ['grupo', ''], bienvenida: ['inicio', ''] };

export function CentroAvisos() {
  const { uid, avisos, gid, elegirGrupo, priv } = useSesion();
  const { ir } = useNav();
  const sinLeer = avisos.filter(a => !a.leido).length;
  const sinPush = !(priv && priv.dispositivos && priv.dispositivos.length);

  function abrir(a) {
    if (!a.leido) marcarLeido(uid, a.id).catch(() => {});
    if (a.gid && a.gid !== gid) elegirGrupo(a.gid);
    const [ruta, param] = DESTINO[a.tipo] || ['partido', ''];
    ir(ruta, param);
  }

  return (
    <div className="scr">
      <BarraSuperior atras onAtras={() => ir('inicio')} />
      <div className="row sp"><h2 className="t">Avisos</h2><button className="chip" onClick={() => ir('misAvisos')}><Icono n="phone" style={{ width: 15, height: 15 }} /> Mis avisos</button></div>
      {sinPush && estadoPermiso() !== 'granted' ? <Hint icono="bell" accion={<button className="chip on" onClick={() => ir('misAvisos')}>Activar</button>}><b>Activá los avisos en tu celular</b><br />Así los recibís aunque no tengas la app abierta.</Hint> : null}
      {avisos.length === 0 ? <Vacio titulo="No hay avisos todavía" texto="Acá vas a ver todo lo que pasa en tu grupo." /> : (
        <>
          {sinLeer ? <button className="link" style={{ alignSelf: 'flex-end' }} onClick={() => marcarTodosLeidos(uid, avisos)}>Marcar todo como leído</button> : null}
          <Card>
            {avisos.map(a => (
              <button className="todo-r" key={a.id} onClick={() => abrir(a)} style={{ alignItems: 'flex-start' }}>
                <span className="ti"><Icono n={ICONO(a.tipo)} /></span>
                <div className="grow" style={{ textAlign: 'left' }}><b>{a.titulo}</b>{a.cuerpo ? <small style={{ whiteSpace: 'normal' }}>{a.cuerpo}</small> : null}<small>{haceCuanto(a.creadoEn)}</small></div>
                {!a.leido ? <Pill t="tint">Nuevo</Pill> : null}
              </button>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

const CATS = [
  ['partido', 'Partido y lugares', 'Partido nuevo, lugares que quedan, cupo completo, equipos.'],
  ['recordatorio', 'Recordatorios', 'Un día antes y dos horas antes de jugar.'],
  ['votar', 'Votación y resultados', 'Cuándo votar, el resultado final y el MVP.'],
  ['logros', 'Mis logros', 'Rachas y cambios en la tabla.'],
  ['grupo', 'Novedades del grupo', 'Gente nueva y resumen semanal.']
];

export function MisAvisos() {
  const { uid, priv } = useSesion();
  const { ir } = useNav();
  const prefs = (priv && priv.prefs) || {};
  const permiso = estadoPermiso();
  const activo = permiso === 'granted' && priv && priv.dispositivos && priv.dispositivos.length > 0;
  const [msg, setMsg] = useState('');
  const [cargando, setCargando] = useState(false);
  const cambiar = (k, v) => guardarPrefs(uid, { ...prefs, [k]: v }).catch(e => setMsg(mensajeError(e)));

  async function activar() {
    setCargando(true); setMsg('');
    const r = await activarPush(uid);
    setCargando(false);
    if (!r.ok) setMsg(r.motivo === 'denegado' ? 'Los avisos están bloqueados en el navegador. Activalos desde los permisos del sitio.' : 'No pudimos activarlos ahora. Probá de nuevo en un momento.');
  }

  return (
    <div className="scr">
      <BarraSuperior atras onAtras={() => ir('avisos')} />
      <div><h2 className="t">Mis avisos</h2><p className="lead" style={{ marginTop: 2 }}>Elegí qué querés recibir. Lo que apagues lo seguís viendo dentro de la app.</p></div>
      {activo
        ? <CardB className="row"><span className="ti" style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'var(--ok-bg)', color: 'var(--ok)', flex: 'none' }}><Icono n="phone" /></span><div className="grow"><b>Avisos activos en este celular</b><div className="muted">Los recibís aunque no tengas la app abierta.</div></div></CardB>
        : esIPhone() && !esAppInstalada()
          ? <Hint><b>Estás en iPhone.</b> Para recibir avisos tocá Compartir, elegí "Agregar a inicio" y abrí Me Anoto desde ese ícono.</Hint>
          : <Hint icono="bell" accion={<button className="chip on" disabled={cargando} onClick={activar}>{cargando ? '…' : 'Activar'}</button>}><b>Este celular no recibe avisos</b><br />Activalos para enterarte cuando hay partido.</Hint>}
      {msg ? <div className="error" role="alert">{msg}</div> : null}
      <Card>
        {CATS.map(([k, t, d]) => <div className="av-r" key={k}><div className="grow"><b>{t}</b><small>{d}</small></div><Switch on={prefs[k] !== false} label={t} onChange={v => cambiar(k, v)} /></div>)}
        <div className="av-r"><div className="grow"><b>Cambios y cancelaciones</b><small>Si se mueve o se cancela el partido. No se puede apagar.</small></div><Pill t="ok">Siempre activo</Pill></div>
      </Card>
      <Card><div className="av-r"><span className="ti"><Icono n="moon" /></span><div className="grow"><b>No molestar de noche</b><small>De 23:00 a 08:00 no suenan los avisos.</small></div><Switch on={prefs.silencio !== false} label="No molestar de noche" onChange={v => cambiar('silencio', v)} /></div></Card>
    </div>
  );
}
