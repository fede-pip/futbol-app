import { useState } from 'react';
import {
  createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, updateProfile
} from 'firebase/auth';
import { auth, llamar, mensajeError, proveedorGoogle } from '../lib/firebase.js';
import { crearPerfil } from '../data/acciones.js';
import { Btn, Campo, CampoClave, CardB, Icono, IconoGoogle, Marca } from '../components/ui.jsx';

const CLAVE_EMAIL = 'meanoto_email_ingreso';
const leerEmailGuardado = () => { try { const v = sessionStorage.getItem(CLAVE_EMAIL) || ''; sessionStorage.removeItem(CLAVE_EMAIL); return v; } catch (e) { return ''; } };
export const guardarEmailParaIngreso = v => { try { sessionStorage.setItem(CLAVE_EMAIL, v); } catch (e) { /* sin almacenamiento */ } };

// El ingreso con DNI y clave ya no existe: quien jugaba antes crea su cuenta y pide que lo unan a su historial.
function HistorialAnterior({ onAtras, onGoogle, onEmail, cargando }) {
  return (
    <div className="scr" style={{ flex: 1 }}>
      <div className="bar-top"><button type="button" className="back" onClick={onAtras}><Icono n="back" />Volver</button><Marca /></div>
      <div><h2 className="t">Si jugabas antes</h2><p className="lead" style={{ marginTop: 4 }}>Ya no se entra con el DNI. Tu historial no se pierde: se une a tu cuenta nueva en tres pasos.</p></div>
      <CardB style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}><b className="num" style={{ fontSize: 22 }}>1</b><div><b>Creá tu cuenta</b><div className="muted">Con Google o con tu email.</div></div></div>
        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}><b className="num" style={{ fontSize: 22 }}>2</b><div><b>Tocá "Ya jugaba antes"</b><div className="muted">Escribí tu DNI para pedir que te unan a tu jugador de antes.</div></div></div>
        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}><b className="num" style={{ fontSize: 22 }}>3</b><div><b>Un admin lo confirma</b><div className="muted">Te avisamos apenas esté: ahí aparecen tus partidos, goles y MVP.</div></div></div>
      </CardB>
      <Btn type="button" v="pri" onClick={onGoogle} disabled={cargando}><IconoGoogle />Seguir con Google</Btn>
      <Btn type="button" onClick={onEmail}><Icono n="mail" />Crear cuenta con email</Btn>
    </div>
  );
}

export default function Cuenta({ onAtras }) {
  const [guardado] = useState(leerEmailGuardado);
  const [vista, setVista] = useState(guardado ? 'email' : 'inicio'); // inicio | email | dni
  const [modo, setModo] = useState(guardado ? 'login' : 'registro');
  const [email, setEmail] = useState(guardado);
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
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
      if (clave !== clave2) return setError('Las dos contraseñas no son iguales. Revisalas con el botón Mostrar.');
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

  if (vista === 'dni') return <HistorialAnterior onAtras={() => setVista('inicio')} onGoogle={conGoogle} onEmail={() => { setVista('email'); setModo('registro'); }} cargando={cargando} />;
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
      <button type="button" className="choice" onClick={() => setVista('dni')}><span className="ti"><Icono n="refresh" /></span><div className="grow"><b>Jugaba antes en la versión anterior</b><span>Recuperá tu historial con tu cuenta nueva.</span></div><Icono n="chev" /></button>
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
      <CampoClave label={modo === 'registro' ? 'Elegí una contraseña' : 'Contraseña'} id="clave" value={clave} onChange={e => setClave(e.target.value)} placeholder={modo === 'registro' ? 'Al menos 8 caracteres' : 'Tu contraseña'} autoComplete={modo === 'registro' ? 'new-password' : 'current-password'} />
      {modo === 'registro' ? <CampoClave label="Repetí la contraseña" id="clave2" value={clave2} onChange={e => setClave2(e.target.value)} placeholder="La misma de arriba" autoComplete="new-password" /> : null}
      {error ? <div className="error" role="alert">{error}</div> : null}
      {aviso ? <div className="okmsg" role="status">{aviso}</div> : null}
      <Btn type="submit" v="pri" disabled={cargando}>{cargando ? 'Un momento…' : modo === 'registro' ? 'Crear cuenta' : 'Ingresar'}</Btn>
      {modo === 'login' ? (
        <>
          <button type="button" className="link" onClick={olvide}>Olvidé mi contraseña</button>
          <div className="sep">¿Entrabas de otra forma?</div>
          <div className="row" style={{ gap: 8 }}>
            <Btn type="button" onClick={conGoogle} disabled={cargando}><IconoGoogle />Google</Btn>
            <Btn type="button" onClick={() => setVista('dni')}><Icono n="refresh" />Jugaba antes</Btn>
          </div>
        </>
      ) : null}
    </form>
  );
}
