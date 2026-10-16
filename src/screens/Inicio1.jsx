import { useEffect, useState } from 'react';
import { EmailAuthProvider, linkWithCredential, sendEmailVerification } from 'firebase/auth';
import { auth, llamar, mensajeError } from '../lib/firebase.js';
import { crearPerfil } from '../data/acciones.js';
import { Btn, Campo, Card, CardB, Icono, Lockup, Marca, Fila } from '../components/ui.jsx';
import { activarPush, esAppInstalada, esIPhone, estadoPermiso } from '../lib/push.js';

// ---- Completar perfil (cuando entró con Google sin nombre o con un nombre vacío) ----
export function CompletarPerfil({ uid, sugerido = '' }) {
  const [nombre, setNombre] = useState(sugerido);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  async function guardar(e) {
    e.preventDefault();
    if (nombre.trim().length < 2) return setError('Poné cómo te llaman en el grupo.');
    setCargando(true);
    try { await crearPerfil(uid, { nombre }); } catch (err) { setError(mensajeError(err)); }
    setCargando(false);
  }
  return (
    <form className="scr" style={{ flex: 1 }} onSubmit={guardar}>
      <div className="bar-top"><Lockup /></div>
      <div><h2 className="t">¿Cómo te llaman?</h2><p className="lead" style={{ marginTop: 4 }}>Es el nombre que van a ver tus compañeros.</p></div>
      <Campo label="Nombre y apellido" id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="name" placeholder="Fede Pipkin" />
      {error ? <div className="error" role="alert">{error}</div> : null}
      <Btn type="submit" v="pri" disabled={cargando}>Continuar</Btn>
    </form>
  );
}

// ---- Recuperar el historial de la versión anterior (DNI + clave de siempre) ----
export function MigrarDni({ onListo, onOmitir }) {
  const [dni, setDni] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function vincular(e) {
    e.preventDefault();
    setError('');
    if (!dni.trim() || !clave) return setError('Completá tu DNI y tu clave de siempre.');
    setCargando(true);
    try { setExito(await llamar('vincularCuentaAnterior', { dni, clave })); }
    catch (err) { setError(mensajeError(err)); }
    setCargando(false);
  }

  if (exito) return (
    <div className="scr" style={{ flex: 1 }}>
      <div className="bar-top"><Lockup /></div>
      <div><h2 className="t">¡Listo, {exito.nombre.split(' ')[0]}!</h2><p className="lead" style={{ marginTop: 4 }}>Tu historial viene con vos: partidos, goles y MVP.</p></div>
      {exito.grupos.length ? <Card>{exito.grupos.map(g => <Fila key={g.id} icono="users" titulo={g.nombre} sub="Ya sos parte de este grupo" />)}</Card> : null}
      <Btn v="pri" onClick={onListo}>Continuar</Btn>
    </div>
  );

  return (
    <form className="scr" style={{ flex: 1 }} onSubmit={vincular}>
      <div className="bar-top"><Lockup /></div>
      <div><h2 className="t">Recuperá tu historial</h2><p className="lead" style={{ marginTop: 4 }}>Ingresá el DNI y la clave con la que jugabas antes. Es la última vez que los vas a necesitar.</p></div>
      <Card>
        <Fila icono="user" titulo="Con tu DNI y tu clave de siempre" sub="Confirmamos que esa cuenta es tuya" />
        <Fila icono="mail" titulo="Tu email queda como acceso nuevo" sub="Ya lo creaste en el paso anterior" />
        <Fila icono="check" titulo="Tus partidos y estadísticas se mantienen" sub="Nada se pierde" />
      </Card>
      <Campo label="Tu DNI" id="dni" inputMode="numeric" value={dni} onChange={e => setDni(e.target.value)} placeholder="38123456" autoComplete="off" />
      <Campo label="Tu clave de antes" id="clave-vieja" type="password" value={clave} onChange={e => setClave(e.target.value)} placeholder="••••••" autoComplete="off" />
      {error ? <div className="error" role="alert">{error}</div> : null}
      <Btn type="submit" v="pri" disabled={cargando}>{cargando ? 'Verificando…' : 'Recuperar mi historial'}</Btn>
      <Btn type="button" v="ghost" onClick={onOmitir}>No jugaba antes</Btn>
    </form>
  );
}

// ---- Cuenta sin email (entró con DNI): a partir de ahora se entra con un email ----
export function AgregarEmail({ nombre, onListo }) {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  async function guardar(e) {
    e.preventDefault(); setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Ese email no parece válido.');
    if (clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    setCargando(true);
    try {
      await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email.trim(), clave));
      sendEmailVerification(auth.currentUser).catch(() => {});
      onListo();
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' || err.code === 'auth/credential-already-in-use'
        ? 'Ese email ya tiene una cuenta. Usá otro, o ingresá con ese email y recuperá tu historial desde tu perfil.' : mensajeError(err));
    }
    setCargando(false);
  }
  return (
    <form className="scr" style={{ flex: 1 }} onSubmit={guardar} noValidate>
      <div className="bar-top"><Lockup /></div>
      <div><h2 className="t">Hola{nombre ? `, ${nombre.split(' ')[0]}` : ''}</h2>
        <p className="lead" style={{ marginTop: 4 }}>A partir de ahora entrás con tu email, ya no con el DNI. Con ese email también vas a poder recuperar tu contraseña si la olvidás.</p></div>
      <Card><Fila icono="mail" titulo="Elegí un email que uses de verdad" sub="Te mandamos un mensaje para confirmarlo" /><Fila icono="key" titulo="Y una contraseña nueva" sub="Reemplaza a la clave de antes" /></Card>
      <Campo label="Tu email" id="nuevo-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vos@ejemplo.com" autoComplete="email" />
      <Campo label="Contraseña nueva" id="nueva-clave" type="password" value={clave} onChange={e => setClave(e.target.value)} placeholder="Al menos 8 caracteres" autoComplete="new-password" />
      {error ? <div className="error" role="alert">{error}</div> : null}
      <Btn type="submit" v="pri" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar y continuar'}</Btn>
    </form>
  );
}

// ---- Primera vez: ¿ya jugabas en la versión anterior? ----
export function PreguntaAnterior({ onListo, onDni }) {
  const [hallada, setHallada] = useState(undefined); // undefined: buscando
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  useEffect(() => { llamar('buscarCuentaAnterior').then(setHallada).catch(() => setHallada({ encontrada: false })); }, []);

  async function confirmar() {
    setError(''); setCargando(true);
    try { await llamar('vincularCuentaAnterior', { confirmarGoogle: true }); onListo(); }
    catch (e) { setError(mensajeError(e)); }
    setCargando(false);
  }

  if (hallada === undefined) return <div className="scr" style={{ flex: 1 }}><div className="splash"><Marca px={64} /></div></div>;

  if (hallada.encontrada) return (
    <div className="scr" style={{ flex: 1 }}>
      <div className="bar-top"><Lockup /></div>
      <div><h2 className="t">Encontramos tu cuenta</h2><p className="lead" style={{ marginTop: 4 }}>Ya jugabas en App8 y tu Google estaba vinculado.</p></div>
      <Card><Fila icono="user" titulo={hallada.nombre} sub={`DNI ${hallada.dniParcial}`} /></Card>
      {error ? <div className="error" role="alert">{error}</div> : null}
      <Btn v="pri" disabled={cargando} onClick={confirmar}>{cargando ? 'Recuperando…' : 'Sí, soy yo: recuperar mi historial'}</Btn>
      <Btn v="ghost" onClick={onListo}>No soy esa persona</Btn>
    </div>
  );

  return (
    <div className="scr" style={{ flex: 1 }}>
      <div className="bar-top"><Lockup /></div>
      <div><h2 className="t">¿Ya jugabas en App8?</h2><p className="lead" style={{ marginTop: 4 }}>Si jugabas antes con tu DNI, recuperá tus partidos, goles y MVP. Si sos nuevo, seguí.</p></div>
      <button className="choice" onClick={onDni}><span className="ti"><Icono n="refresh" /></span><div className="grow"><b>Sí, jugaba con mi DNI</b><span>Ponés tu DNI y tu clave de antes y recuperás todo.</span></div><Icono n="chev" /></button>
      <button className="choice" onClick={onListo}><span className="ti"><Icono n="plus" /></span><div className="grow"><b>No, soy nuevo</b><span>Seguimos con tu cuenta nueva.</span></div><Icono n="chev" /></button>
    </div>
  );
}

// ---- Crear un grupo o unirse con un código ----
export function GrupoElegir({ onListo, uid, superAdmin, onAnterior }) {
  const [modo, setModo] = useState(null); // 'crear' | 'unirse'
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function crear(e) {
    e.preventDefault(); setError('');
    if (nombre.trim().length < 2) return setError('Poné un nombre para el grupo.');
    setCargando(true);
    try { const r = await llamar('crearGrupo', { nombre }); onListo(r.gid); }
    catch (err) { setError(mensajeError(err)); }
    setCargando(false);
  }
  async function unirse(e) {
    e.preventDefault(); setError('');
    if (codigo.trim().length < 5) return setError('Escribí el código completo.');
    setCargando(true);
    try { const r = await llamar('unirsePorCodigo', { codigo }); onListo(r.gid); }
    catch (err) { setError(mensajeError(err)); }
    setCargando(false);
  }

  return (
    <div className="scr" style={{ flex: 1 }}>
      <div className="bar-top"><Lockup /></div>
      <div><h2 className="t">¿Con quién jugás?</h2><p className="lead" style={{ marginTop: 4 }}>Un grupo es la gente con la que armás el partido todas las semanas.</p></div>
      {modo === null ? (
        <>
          <button className="choice" onClick={() => setModo('crear')}><span className="ti"><Icono n="plus" /></span><div className="grow"><b>Crear un grupo</b><span>Sos el admin y después compartís un código por WhatsApp.</span></div><Icono n="chev" /></button>
          <button className="choice" onClick={() => setModo('unirse')}><span className="ti"><Icono n="key" /></span><div className="grow"><b>Unirme con un código</b><span>Te lo pasa quien armó el grupo.</span></div><Icono n="chev" /></button>
          {onAnterior ? <button className="choice" onClick={onAnterior}><span className="ti"><Icono n="clock" /></span><div className="grow"><b>Ya jugaba antes</b><span>Recuperá tu historial con tu DNI y tu clave de siempre.</span></div><Icono n="chev" /></button> : null}
          {superAdmin ? <button className="link" onClick={() => { location.hash = '#/plataforma'; }}>Herramientas de la plataforma</button> : null}
        </>
      ) : modo === 'crear' ? (
        <form onSubmit={crear} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Campo label="Nombre del grupo" id="gnombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Fútbol de los Lunes" maxLength={60} />
          {error ? <div className="error" role="alert">{error}</div> : null}
          <Btn type="submit" v="pri" disabled={cargando}>{cargando ? 'Creando…' : 'Crear grupo'}</Btn>
          <Btn type="button" v="ghost" onClick={() => { setModo(null); setError(''); }}>Volver</Btn>
        </form>
      ) : (
        <form onSubmit={unirse} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Campo label="Código del grupo" id="codigo" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="ABC-1234" autoCapitalize="characters" autoComplete="off" style={{ fontSize: 20, letterSpacing: '.08em', fontWeight: 650 }} />
          {error ? <div className="error" role="alert">{error}</div> : null}
          <Btn type="submit" v="pri" disabled={cargando}>{cargando ? 'Uniéndome…' : 'Unirme al grupo'}</Btn>
          <Btn type="button" v="ghost" onClick={() => { setModo(null); setError(''); }}>Volver</Btn>
        </form>
      )}
    </div>
  );
}

// ---- Pedir permiso de avisos, en contexto ----
export function PermisoAvisos({ uid, onListo }) {
  const [estado, setEstado] = useState('');
  const [cargando, setCargando] = useState(false);
  const iphoneSinInstalar = esIPhone() && !esAppInstalada();

  async function activar() {
    setCargando(true);
    const r = await activarPush(uid);
    setCargando(false);
    if (r.ok) return onListo();
    setEstado(r.motivo === 'denegado' ? 'denegado' : 'otro');
  }

  return (
    <div className="scr" style={{ flex: 1 }}>
      <div className="bar-top"><Lockup /></div>
      <div className="art">
        {[['Se armó el partido del lunes', 'Ahora'], ['Quedan 2 lugares, anotate', 'Hace 5 min'], ['Ya están los equipos', 'Hace 2 h']].map(n => (
          <div className="mini" key={n[0]}><Marca px={28} /><div className="grow"><b style={{ fontSize: 13.5 }}>{n[0]}</b><div className="small">{n[1]}</div></div></div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2 className="t">Enterate cuando hay partido</h2>
        <p className="lead">Te avisamos solo de lo que importa: partido nuevo, lugares que se liberan y equipos armados.</p>
      </div>
      {iphoneSinInstalar ? (
        <div className="hint"><span className="hi"><Icono n="info" /></span><div><b>Estás en iPhone.</b> Para recibir avisos tocá Compartir y elegí "Agregar a inicio". Después abrí Me Anoto desde ese ícono y activalos acá.</div></div>
      ) : (
        <Btn v="pri" onClick={activar} disabled={cargando}>{cargando ? 'Activando…' : 'Activar avisos'}</Btn>
      )}
      {estado === 'denegado' ? <div className="error">El navegador tiene los avisos bloqueados. Activalos desde los permisos del sitio y volvé a probar.</div> : null}
      {estado === 'otro' ? <div className="error">No pudimos activarlos ahora. Podés intentarlo después desde Mis avisos.</div> : null}
      <Btn v="ghost" onClick={onListo}>Ahora no, los veo en la app</Btn>
    </div>
  );
}
