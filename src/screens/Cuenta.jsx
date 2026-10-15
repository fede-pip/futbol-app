import { useState } from 'react';
import {
  createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, updateProfile
} from 'firebase/auth';
import { auth, mensajeError, proveedorGoogle } from '../lib/firebase.js';
import { crearPerfil } from '../data/acciones.js';
import { Btn, Campo, Icono, IconoGoogle, Marca } from '../components/ui.jsx';

export default function Cuenta({ onAtras, onMigrar, migrando }) {
  const [modo, setModo] = useState(migrando ? 'registro' : 'registro');
  const [email, setEmail] = useState('');
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
    try { await sendPasswordResetEmail(auth, email.trim()); setAviso('Te mandamos un email para elegir una contraseña nueva.'); }
    catch (e) { setError(mensajeError(e)); }
  }

  return (
    <form className="scr" style={{ flex: 1 }} onSubmit={enviar} noValidate>
      <div className="bar-top">
        <button type="button" className="back" onClick={onAtras}><Icono n="back" />Volver</button>
        <Marca />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2 className="t">{modo === 'registro' ? 'Creá tu cuenta' : 'Ingresá a tu cuenta'}</h2>
        <p className="lead">{migrando ? 'Primero creá tu cuenta nueva. Después recuperamos tu historial con tu DNI.' : 'Con tu email vas a poder recuperar el acceso si cambiás de celular.'}</p>
      </div>
      <Btn type="button" onClick={conGoogle} disabled={cargando}><IconoGoogle />Seguir con Google</Btn>
      <div className="sep">o con tu email</div>
      {modo === 'registro' ? <Campo label="Cómo te llaman en el grupo" id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Fede Pipkin" autoComplete="name" /> : null}
      <Campo label="Email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vos@ejemplo.com" autoComplete="email" />
      <Campo label="Contraseña" id="clave" type="password" value={clave} onChange={e => setClave(e.target.value)} placeholder="Al menos 8 caracteres" autoComplete={modo === 'registro' ? 'new-password' : 'current-password'} />
      {error ? <div className="error" role="alert">{error}</div> : null}
      {aviso ? <div className="okmsg" role="status">{aviso}</div> : null}
      <Btn type="submit" v="pri" disabled={cargando}>{cargando ? 'Un momento…' : modo === 'registro' ? 'Crear cuenta' : 'Ingresar'}</Btn>
      {modo === 'login' ? <button type="button" className="link" onClick={olvide}>Olvidé mi contraseña</button> : null}
      <button type="button" className="link" onClick={() => { setModo(modo === 'registro' ? 'login' : 'registro'); setError(''); setAviso(''); }}>
        {modo === 'registro' ? 'Ya tengo cuenta' : 'No tengo cuenta, quiero crear una'}
      </button>
      {!migrando && modo === 'registro' ? <Btn type="button" v="ghost" onClick={onMigrar}>Ya jugaba en App8 con mi DNI</Btn> : null}
    </form>
  );
}
