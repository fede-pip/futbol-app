import { useState } from 'react';
import {
  createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithCustomToken, signInWithEmailAndPassword, signInWithPopup, updateProfile
} from 'firebase/auth';
import { auth, llamar, mensajeError, proveedorGoogle } from '../lib/firebase.js';
import { crearPerfil } from '../data/acciones.js';
import { Btn, Campo, CardB, Icono, IconoGoogle, Marca } from '../components/ui.jsx';

const CLAVE_EMAIL = 'meanoto_email_ingreso';
const leerEmailGuardado = () => { try { const v = sessionStorage.getItem(CLAVE_EMAIL) || ''; sessionStorage.removeItem(CLAVE_EMAIL); return v; } catch (e) { return ''; } };
export const guardarEmailParaIngreso = v => { try { sessionStorage.setItem(CLAVE_EMAIL, v); } catch (e) { /* sin almacenamiento */ } };

function IngresoDni({ onAtras, onEmail }) {
  const [dni, setDni] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  async function entrar(e) {
    e.preventDefault(); setError('');
    if (!dni.trim() || !clave) return setError('Completá tu DNI y tu clave de siempre.');
    setCargando(true);
    try { const r = await llamar('ingresarConDni', { dni, clave }); await signInWithCustomToken(auth, r.token); }
    catch (err) { setError(mensajeError(err)); }
    setCargando(false);
  }
  return (
    <form className="scr" style={{ flex: 1 }} onSubmit={entrar} noValidate>
      <div className="bar-top"><button type="button" className="back" onClick={onAtras}><Icono n="back" />Volver</button><Marca /></div>
      <div><h2 className="t">Entrá con tu DNI</h2><p className="lead" style={{ marginTop: 4 }}>Usá el DNI y la clave con la que jugabas antes. Es la última vez: en el próximo paso elegís un email para entrar de ahora en adelante.</p></div>
      <Campo label="Tu DNI" id="dni-ing" inputMode="numeric" value={dni} onChange={e => setDni(e.target.value)} placeholder="38123456" autoComplete="off" />
      <Campo label="Tu clave de antes" id="clave-ing" type="password" value={clave} onChange={e => setClave(e.target.value)} placeholder="••••••" autoComplete="off" />
      {error ? <div className="error" role="alert">{error}</div> : null}
      <Btn type="submit" v="pri" disabled={cargando}>{cargando ? 'Verificando…' : 'Entrar'}</Btn>
      <div className="sep">¿Algo no sale?</div>
      <CardB style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div><b>No me acuerdo de mi clave</b><p className="muted" style={{ marginTop: 2 }}>Pedile al admin de tu grupo una clave temporal. Te la manda por WhatsApp y con ella entrás igual que acá.</p></div>
        <div><b>Ya elegí un email antes</b><p className="muted" style={{ marginTop: 2 }}>Entonces el DNI ya no sirve: entrá con ese email.</p></div>
        <Btn type="button" onClick={onEmail}><Icono n="mail" />Entrar con mi email</Btn>
      </CardB>
    </form>
  );
}

export default function Cuenta({ onAtras }) {
  const [guardado] = useState(leerEmailGuardado);
  const [vista, setVista] = useState(guardado ? 'email' : 'inicio'); // inicio | email | dni
  const [modo, setModo] = useState(guardado ? 'login' : 'registro');
  const [email, setEmail] = useState(guardado);
  const [clave, setClave] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);

  async function conGoogle() {
    setError(''); setCargando(true);
    try {
      const r = await signInWithPopup(auth, proveedorGoogle);
      // El perfil se completa solo en App (usa el nombre de Google si hace falta).
      if (r.user.displayName) sessionStorage.setItem('app8_nombre_google', r.user.displayName);
    } catch (e) { setError(mensajeError(e)); }
    setCargando(false);
  }

  async function enviar(ev) {
    ev.preventDefault();
    setError(''); setAviso('');
    if (!email.trim() || !clave) return setError('Completá tu email y tu contraseña.');
    if (modo === 'registro') {
      if (nombre.trim().length < 2) return setError('Poné cómo te llaman en el grupo.');
      if (clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    }
    setCargando(true);
    try {
      if (modo === 'registro') {
        const r = await createUserWithEmailAndPassword(auth, email.trim(), clave);
        await updateProfile(r.user, { displayName: nombre.trim() });
        await crearPerfil(r.user.uid, { nombre });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), clave);
      }
    } catch (e) { setError(mensajeError(e)); }
    setCargando(false);
  }

  async function olvide() {
    setError(''); setAviso('');
    if (!email.trim()) return setError('Escribí tu email y tocá de nuevo.');
    try { await sendPasswordResetEmail(auth, email.trim()); setAviso(`Si ${email.trim()} tiene una cuenta, te mandamos un email para elegir una contraseña nueva. Puede tardar unos minutos: revisá también Spam o Promociones. Si entrabas con Google, tocá "Seguir con Google": no usás contraseña.`); }
    catch (e) { setError(mensajeError(e)); }
  }

  if (vista === 'dni') return <IngresoDni onAtras={() => setVista('inicio')} onEmail={() => { setVista('email'); setModo('login'); }} />;
  const cambiarModo = m => { setModo(m); setError(''); setAviso(''); };

  if (vista === 'inicio') return (
    <div className="scr" style={{ flex: 1 }}>
      <div className="bar-top">
        <button type="button" className="back" onClick={onAtras}><Icono n="back" />Volver</button>
        <Marca />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2 className="t">Entrá a Me Anoto</h2>
        <p className="lead">Elegí cómo querés entrar.</p>
      </div>
      {error ? <div className="error" role="alert">{error}</div> : null}
      <Btn type="button" onClick={conGoogle} disabled={cargando}><IconoGoogle />Seguir con Google</Btn>
      <button type="button" className="choice" onClick={() => setVista('email')}><span className="ti"><Icono n="mail" /></span><div className="grow"><b>Con mi email y contraseña</b><span>Para entrar si ya tenés cuenta, o crearla si sos nuevo.</span></div><Icono n="chev" /></button>
      <button type="button" className="choice" onClick={() => setVista('dni')}><span className="ti"><Icono n="refresh" /></span><div className="grow"><b>Jugaba antes con mi DNI</b><span>Con tu DNI y tu clave de siempre. Después elegís un email.</span></div><Icono n="chev" /></button>
    </div>
  );

  return (
    <form className="scr" style={{ flex: 1 }} onSubmit={enviar} noValidate>
      <div className="bar-top">
        <button type="button" className="back" onClick={() => { setVista('inicio'); setError(''); setAviso(''); }}><Icono n="back" />Volver</button>
        <Marca />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2 className="t">{modo === 'registro' ? 'Creá tu cuenta' : 'Entrá con tu email'}</h2>
        <p className="lead">{modo === 'registro' ? 'Es para quienes juegan por primera vez en Me Anoto.' : 'Con el email y la contraseña que elegiste.'}</p>
      </div>
      <div className="seg" role="group" aria-label="Tipo de ingreso">
        <button type="button" aria-pressed={modo === 'login'} onClick={() => cambiarModo('login')} style={{ minHeight: 40 }}>Ya tengo cuenta</button>
        <button type="button" aria-pressed={modo === 'registro'} onClick={() => cambiarModo('registro')} style={{ minHeight: 40 }}>Soy nuevo</button>
      </div>
      {modo === 'registro' ? <Campo label="Cómo te llaman en el grupo" id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Fede Pipkin" autoComplete="name" /> : null}
      <Campo label="Email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vos@ejemplo.com" autoComplete="email" />
      <Campo label="Contraseña" id="clave" type="password" value={clave} onChange={e => setClave(e.target.value)} placeholder={modo === 'registro' ? 'Al menos 8 caracteres' : 'Tu contraseña'} autoComplete={modo === 'registro' ? 'new-password' : 'current-password'} />
      {error ? <div className="error" role="alert">{error}</div> : null}
      {aviso ? <div className="okmsg" role="status">{aviso}</div> : null}
      <Btn type="submit" v="pri" disabled={cargando}>{cargando ? 'Un momento…' : modo === 'registro' ? 'Crear cuenta' : 'Ingresar'}</Btn>
      {modo === 'login' ? (
        <>
          <button type="button" className="link" onClick={olvide}>Olvidé mi contraseña</button>
          <div className="sep">¿Entrabas de otra forma?</div>
          <div className="row" style={{ gap: 8 }}>
            <Btn type="button" onClick={conGoogle} disabled={cargando}><IconoGoogle />Google</Btn>
            <Btn type="button" onClick={() => setVista('dni')}><Icono n="refresh" />Con mi DNI</Btn>
          </div>
        </>
      ) : null}
    </form>
  );
}
