import { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBkdakeLAzmp7zGz99nPswuqjtELSAOe8s",
  authDomain: "futbol-app-5818a.firebaseapp.com",
  projectId: "futbol-app-5818a",
  storageBucket: "futbol-app-5818a.firebasestorage.app",
  messagingSenderId: "861046895576",
  appId: "1:861046895576:web:1e64b31f951194fbfaf8ad"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const SUPER_ADMIN = "35270164";

// ── Firestore refs ──────────────────────────────────────────────────────────
const rUser       = (dni)  => doc(db, "app8_users", dni);
const rComunidad  = (id)   => doc(db, "app8_comunidades", id);
const rPartido    = (id)   => doc(db, "app8_partidos", id);
const rVotos      = (pid)  => doc(db, "app8_votos", pid);

// ── Helpers ─────────────────────────────────────────────────────────────────
function hashPassword(p) {
  let h = 0;
  for (let i = 0; i < p.length; i++) { h = (Math.imul(31, h) + p.charCodeAt(i)) | 0; }
  return h.toString(36);
}

function calcProm(j) {
  if (!j?.partidos) return 0;
  const base  = j.puntajeTotal / j.partidos;
  const bonus = (j.goles || 0) * 0.1;
  return Math.min(10, +(base + bonus).toFixed(2));
}

function balancear(lista) {
  const sorted = [...lista].sort((a,b) => calcProm(b) - calcProm(a));
  const eq1=[], eq2=[];
  sorted.forEach((j,i) => (i%2===0 ? eq1 : eq2).push(j));
  return { oscuro: eq1, blanco: eq2 };
}

function sumaEq(arr) { return arr.reduce((s,j) => s + calcProm(j), 0); }

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ── UI Components ───────────────────────────────────────────────────────────
const C = {
  bg:      "#070d16",
  surface: "#0f1923",
  card:    "#131f2e",
  border:  "#1a2d42",
  text:    "#d4dce8",
  muted:   "#4a6a8a",
  accent:  "#ffd166",
  green:   "#06d6a0",
  red:     "#ef476f",
  purple:  "#7c5cbf",
};

function Av({ nombre, size=40, foto }) {
  const initials = (nombre||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const palette  = ["#e63946","#f4a261","#2a9d8f","#457b9d","#6a4c93","#e76f51","#06d6a0","#ef476f"];
  const color    = palette[(nombre||"?").charCodeAt(0) % palette.length];
  if (foto) return <img src={foto} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />;
  return <div style={{ width:size, height:size, borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:size*.36, color:"#fff", flexShrink:0 }}>{initials}</div>;
}

function ScBadge({ score, size=13 }) {
  const color = score>=8 ? C.green : score>=5 ? C.accent : C.red;
  return <span style={{ background:color+"25", color, border:`1px solid ${color}45`, borderRadius:6, padding:"2px 8px", fontWeight:800, fontSize:size, fontFamily:"monospace" }}>{score.toFixed(1)}</span>;
}

function Btn({ children, onClick, v="primary", disabled, sm, style:ex={} }) {
  const map = { primary:{background:C.accent,color:"#0d1117"}, danger:{background:C.red,color:"#fff"}, green:{background:C.green,color:"#0d1117"}, ghost:{background:C.card,color:C.muted}, purple:{background:C.purple,color:"#fff"}, dark:{background:"#1a2d42",color:C.muted} };
  return <button onClick={onClick} disabled={disabled} style={{ ...(map[v]||map.primary), border:"none", borderRadius:sm?8:10, cursor:disabled?"not-allowed":"pointer", fontWeight:700, fontSize:sm?12:14, padding:sm?"6px 12px":"11px 18px", opacity:disabled?.5:1, transition:"all .15s", fontFamily:"inherit", ...ex }}>{children}</button>;
}

function Inp({ value, onChange, placeholder, type="text", onKeyDown, style:ex={} }) {
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown} style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1px solid ${C.border}`, background:"#0a1520", color:C.text, fontSize:15, outline:"none", boxSizing:"border-box", fontFamily:"inherit", ...ex }} />;
}

function Card({ children, style:ex={}, accent }) {
  return <div style={{ background:C.card, borderRadius:16, border:`1px solid ${accent||C.border}`, padding:16, marginBottom:14, ...ex }}>{children}</div>;
}

function Lbl({ children }) {
  return <div style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:.6 }}>{children}</div>;
}

function Msg({ children, ok }) {
  if (!children) return null;
  return <div style={{ padding:"9px 13px", borderRadius:8, marginTop:8, fontSize:13, background:ok?C.green+"15":C.red+"15", color:ok?C.green:C.red, border:`1px solid ${ok?C.green+"30":C.red+"30"}` }}>{children}</div>;
}

function Tag({ children, color=C.accent }) {
  return <span style={{ background:color+"20", color, border:`1px solid ${color}40`, borderRadius:5, padding:"1px 7px", fontSize:11, fontWeight:700 }}>{children}</span>;
}

function Spinner() {
  return <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"80vh", gap:16 }}>
    <div style={{ width:44, height:44, border:`3px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin .7s linear infinite" }} />
    <div style={{ color:C.muted, fontSize:14 }}>Cargando App8...</div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
}

function Modal({ children, onClose }) {
  return <div style={{ position:"fixed", inset:0, background:"#000000cc", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
    <div style={{ background:C.surface, borderRadius:20, border:`1px solid ${C.border}`, padding:20, width:"100%", maxWidth:440, maxHeight:"90vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
      {children}
    </div>
  </div>;
}

// ── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [loading,    setLoading]    = useState(true);
  const [user,       setUser]       = useState(null);   // jugador logueado
  const [pantalla,   setPantalla]   = useState("home");
  const [comunidades,setComunidades]= useState([]);
  const [comActiva,  setComActiva]  = useState(null);   // comunidad seleccionada
  const [partidoAct, setPartidoAct] = useState(null);   // partido activo

  // Cargar sesión guardada
  useEffect(() => {
    const saved = localStorage.getItem("app8_session");
    if (saved) {
      try { const u = JSON.parse(saved); setUser(u); }
      catch {}
    }
    setLoading(false);
  }, []);

  // Cargar comunidades del usuario
  useEffect(() => {
    if (!user) { setComunidades([]); return; }
    const loadComs = async () => {
      const all = [];
      const snap = await getDocs(collection(db, "app8_comunidades"));
      snap.forEach(d => {
        const c = { id: d.id, ...d.data() };
        if ((c.miembros||[]).includes(user.dni) || c.creadorDni === user.dni) all.push(c);
      });
      setComunidades(all);
    };
    loadComs();
    // re-check cada 30s
    const t = setInterval(loadComs, 30000);
    return () => clearInterval(t);
  }, [user]);

  // Escuchar partido activo de comunidad activa
  useEffect(() => {
    if (!comActiva?.partidoActivo) { setPartidoAct(null); return; }
    const unsub = onSnapshot(rPartido(comActiva.partidoActivo), s => {
      setPartidoAct(s.exists() ? { id: s.id, ...s.data() } : null);
    });
    return unsub;
  }, [comActiva?.partidoActivo]);

  function login(u) { setUser(u); localStorage.setItem("app8_session", JSON.stringify(u)); }
  function logout()  { setUser(null); localStorage.removeItem("app8_session"); setPantalla("home"); setComActiva(null); }

  async function reloadUser() {
    if (!user) return;
    const s = await getDoc(rUser(user.dni));
    if (s.exists()) { const u = { ...user, ...s.data() }; setUser(u); localStorage.setItem("app8_session", JSON.stringify(u)); }
  }

  async function reloadComunidades() {
    if (!user) return;
    const all = [];
    const snap = await getDocs(collection(db, "app8_comunidades"));
    snap.forEach(d => {
      const c = { id: d.id, ...d.data() };
      if ((c.miembros||[]).includes(user.dni) || c.creadorDni === user.dni) all.push(c);
    });
    setComunidades(all);
    if (comActiva) {
      const updated = all.find(c => c.id === comActiva.id);
      if (updated) setComActiva(updated);
    }
  }

  if (loading) return <div style={{ background:C.bg, minHeight:"100vh" }}><Spinner /></div>;

  const S = {
    app:    { minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'DM Sans','Segoe UI',sans-serif", maxWidth:480, margin:"0 auto", paddingBottom:90 },
    header: { background:`linear-gradient(180deg,${C.surface} 0%,${C.bg} 100%)`, borderBottom:`1px solid ${C.border}`, padding:"16px 16px 12px", position:"sticky", top:0, zIndex:100 },
    nav:    { display:"flex", overflowX:"auto", gap:4, padding:"10px 12px", background:"#0a1220", borderBottom:`1px solid ${C.border}` },
    navBtn: (a) => ({ padding:"7px 13px", borderRadius:20, border:"none", cursor:"pointer", fontWeight:700, fontSize:12, whiteSpace:"nowrap", background:a?C.accent:C.card, color:a?"#0d1117":C.muted, fontFamily:"inherit", transition:"all .2s" }),
    sec:    { padding:16 },
    sTitle: { fontSize:17, fontWeight:800, marginBottom:16, color:"#e8f0ff" },
    row:    { display:"flex", alignItems:"center", gap:12, padding:"11px 13px", borderRadius:12, background:"#0d1520", border:`1px solid ${C.border}`, marginBottom:8 },
  };

  const esAdmin = user?.dni === SUPER_ADMIN;

  // ── Pantallas sin comunidad ─────────────────────────────────────────────
  if (!user) return (
    <div style={S.app}>
      <Header user={null} logout={logout} S={S} />
      <AuthScreen onLogin={login} S={S} />
    </div>
  );

  const tabs = comActiva
    ? [
        { id:"partido",  label:"📋 Partido" },
        { id:"equipos",  label:"⚖️ Equipos" },
        { id:"votar",    label:"🗳️ Votar" },
        { id:"stats",    label:"📊 Stats" },
        { id:"com",      label:"🏘️ Comunidad" },
        { id:"perfil",   label:"👤 Mi perfil" },
      ]
    : [
        { id:"home",    label:"⚽ App8" },
        { id:"perfil",  label:"👤 Mi perfil" },
        ...(esAdmin ? [{ id:"sadmin", label:"🔑 Super Admin" }] : []),
      ];

  return (
    <div style={S.app}>
      <Header user={user} logout={logout} setPantalla={setPantalla} comActiva={comActiva} setComActiva={setComActiva} S={S} />
      <div style={S.nav}>
        {tabs.map(t => <button key={t.id} style={S.navBtn(pantalla===t.id)} onClick={()=>setPantalla(t.id)}>{t.label}</button>)}
      </div>

      {pantalla==="home"    && <PHome user={user} comunidades={comunidades} setComActiva={c=>{setComActiva(c);setPantalla("partido");}} setPantalla={setPantalla} reloadComunidades={reloadComunidades} S={S} />}
      {pantalla==="perfil"  && <PPerfil user={user} reloadUser={reloadUser} S={S} />}
      {pantalla==="sadmin"  && esAdmin && <PSuperAdmin S={S} />}

      {comActiva && pantalla==="partido"  && <PPartido comunidad={comActiva} partido={partidoAct} user={user} reloadCom={reloadComunidades} setPantalla={setPantalla} S={S} />}
      {comActiva && pantalla==="equipos"  && <PEquipos comunidad={comActiva} partido={partidoAct} user={user} S={S} />}
      {comActiva && pantalla==="votar"    && <PVotar   comunidad={comActiva} partido={partidoAct} user={user} S={S} />}
      {comActiva && pantalla==="stats"    && <PStats   comunidad={comActiva} S={S} />}
      {comActiva && pantalla==="com"      && <PComunidad comunidad={comActiva} user={user} reloadComunidades={reloadComunidades} setPantalla={setPantalla} S={S} />}
    </div>
  );
}

// ── HEADER ──────────────────────────────────────────────────────────────────
function Header({ user, logout, setPantalla, comActiva, setComActiva, S }) {
  return (
    <div style={S.header}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:34, height:34, background:`linear-gradient(135deg,${C.accent},${C.red})`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, cursor:"pointer" }}
          onClick={() => { if(setComActiva) setComActiva(null); if(setPantalla) setPantalla("home"); }}>⚽</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:19, fontWeight:900, color:"#fff", letterSpacing:-0.5 }}>App<span style={{ color:C.accent }}>8</span>
            {comActiva && <span style={{ fontSize:13, color:C.muted, fontWeight:500, marginLeft:8 }}>/ {comActiva.nombre}</span>}
          </div>
          {!comActiva && <div style={{ fontSize:10, color:"#2a4a6a", letterSpacing:.5 }}>🔥 RED DE FÚTBOL</div>}
        </div>
        {user && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Av nombre={user.nombre} size={30} foto={user.foto} />
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#c0d0e0" }}>{user.apodo || user.nombre.split(" ")[0]}</div>
              <button onClick={logout} style={{ background:"none", border:"none", color:C.muted, fontSize:11, cursor:"pointer", padding:0 }}>Salir</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AUTH ─────────────────────────────────────────────────────────────────────
function AuthScreen({ onLogin, S }) {
  const [tab,  setTab]  = useState("login");
  const [dni,  setDni]  = useState("");
  const [nom,  setNom]  = useState("");
  const [pass, setPass] = useState("");
  const [pass2,setPass2]= useState("");
  const [msg,  setMsg]  = useState("");
  const [load, setLoad] = useState(false);

  async function doLogin() {
    if (!dni||!pass) { setMsg("Completá todos los campos"); return; }
    setLoad(true);
    const snap = await getDoc(rUser(dni.trim()));
    setLoad(false);
    if (!snap.exists()) { setMsg("DNI no encontrado"); return; }
    const u = snap.data();
    if (u.passHash !== hashPassword(pass)) { setMsg("Contraseña incorrecta"); return; }
    onLogin({ ...u });
  }

  async function doRegister() {
    if (!nom||!dni||!pass||!pass2) { setMsg("Completá todos los campos"); return; }
    if (pass !== pass2) { setMsg("Las contraseñas no coinciden"); return; }
    if (pass.length < 4) { setMsg("La contraseña debe tener al menos 4 caracteres"); return; }
    setLoad(true);
    const snap = await getDoc(rUser(dni.trim()));
    if (snap.exists()) { setLoad(false); setMsg("Ese DNI ya está registrado"); return; }
    const nuevo = { nombre:nom.trim(), dni:dni.trim(), apodo:"", foto:"", passHash:hashPassword(pass), goles:0, puntajeTotal:0, partidos:0, historial:[], creadoEn: Date.now() };
    await setDoc(rUser(dni.trim()), nuevo);
    setLoad(false);
    onLogin(nuevo);
  }

  return (
    <div style={S.sec}>
      <div style={{ textAlign:"center", padding:"30px 0 24px" }}>
        <div style={{ fontSize:60 }}>⚽</div>
        <div style={{ fontSize:26, fontWeight:900, color:"#fff", letterSpacing:-1, marginTop:8 }}>App<span style={{ color:C.accent }}>8</span></div>
        <div style={{ color:C.muted, fontSize:13, marginTop:4 }}>Tu red de fútbol</div>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {["login","register"].map(t => <button key={t} onClick={()=>{setTab(t);setMsg("");}} style={{ flex:1, padding:10, borderRadius:10, border:"none", cursor:"pointer", fontWeight:700, fontSize:14, background:tab===t?C.accent:C.card, color:tab===t?"#0d1117":C.muted, fontFamily:"inherit" }}>{t==="login"?"Ingresar":"Registrarme"}</button>)}
      </div>
      <Card>
        {tab==="register" && <>
          <Lbl>Nombre completo</Lbl>
          <Inp value={nom} onChange={e=>setNom(e.target.value)} placeholder="Ej: Juan Pérez" />
          <div style={{ marginTop:10 }} />
        </>}
        <Lbl>DNI</Lbl>
        <Inp value={dni} onChange={e=>setDni(e.target.value)} placeholder="Ej: 38123456" />
        <div style={{ marginTop:10 }} />
        <Lbl>Contraseña</Lbl>
        <Inp type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Tu contraseña" onKeyDown={e=>e.key==="Enter"&&(tab==="login"?doLogin():null)} />
        {tab==="register" && <>
          <div style={{ marginTop:10 }} />
          <Lbl>Repetir contraseña</Lbl>
          <Inp type="password" value={pass2} onChange={e=>setPass2(e.target.value)} placeholder="Repetí la contraseña" />
        </>}
        <Btn onClick={tab==="login"?doLogin:doRegister} disabled={load} ex={{ marginTop:12, display:"block", width:"100%" }}>
          {load ? "Cargando..." : tab==="login" ? "Ingresar" : "Crear cuenta"}
        </Btn>
        <Msg ok={false}>{msg}</Msg>
      </Card>
    </div>
  );
}

// ── HOME ─────────────────────────────────────────────────────────────────────
function PHome({ user, comunidades, setComActiva, setPantalla, reloadComunidades, S }) {
  const [showCrear, setShowCrear] = useState(false);
  const [nomCom,    setNomCom]    = useState("");
  const [msg,       setMsg]       = useState("");

  async function crearComunidad() {
    if (!nomCom.trim()) { setMsg("Poné un nombre"); return; }
    const id = uid();
    await setDoc(rComunidad(id), { nombre:nomCom.trim(), creadorDni:user.dni, admins:[user.dni], miembros:[user.dni], creadoEn:Date.now(), partidoActivo:null });
    setNomCom(""); setShowCrear(false);
    await reloadComunidades();
  }

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>Mis comunidades</div>

      {comunidades.length === 0 && (
        <Card style={{ textAlign:"center", padding:32 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏘️</div>
          <div style={{ color:C.muted, fontSize:14 }}>No pertenecés a ninguna comunidad todavía.</div>
          <div style={{ color:C.muted, fontSize:13, marginTop:6 }}>Creá una o pedile a alguien que te invite.</div>
        </Card>
      )}

      {comunidades.map(c => {
        const esAdminCom = (c.admins||[]).includes(user.dni);
        return (
          <div key={c.id} onClick={()=>setComActiva(c)} style={{ ...S.row, cursor:"pointer", background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:14 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:`linear-gradient(135deg,${C.purple},${C.accent})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🏘️</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:15 }}>{c.nombre}</div>
              <div style={{ color:C.muted, fontSize:12, marginTop:2 }}>{(c.miembros||[]).length} miembros</div>
            </div>
            {esAdminCom && <Tag color={C.accent}>Admin</Tag>}
            <span style={{ color:C.muted, fontSize:18 }}>›</span>
          </div>
        );
      })}

      {!showCrear
        ? <Btn onClick={()=>setShowCrear(true)} v="purple" ex={{ marginTop:8, display:"block" }}>+ Crear comunidad</Btn>
        : <Card accent={C.purple+"50"}>
            <div style={{ fontWeight:800, marginBottom:12 }}>🏘️ Nueva comunidad</div>
            <Lbl>Nombre</Lbl>
            <Inp value={nomCom} onChange={e=>setNomCom(e.target.value)} placeholder='Ej: Fútbol de los Lunes' onKeyDown={e=>e.key==="Enter"&&crearComunidad()} />
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <Btn v="purple" onClick={crearComunidad} ex={{ flex:1 }}>Crear</Btn>
              <Btn v="ghost"  onClick={()=>setShowCrear(false)} ex={{ flex:1 }}>Cancelar</Btn>
            </div>
            <Msg ok={false}>{msg}</Msg>
          </Card>
      }
    </div>
  );
}

// ── PERFIL ───────────────────────────────────────────────────────────────────
function PPerfil({ user, reloadUser, S }) {
  const [nom,  setNom]  = useState(user.nombre);
  const [apodo,setApodo]= useState(user.apodo||"");
  const [foto, setFoto] = useState(user.foto||"");
  const [passOld,setPassOld]= useState("");
  const [passNew,setPassNew]= useState("");
  const [passNew2,setPassNew2]=useState("");
  const [msg,  setMsg]  = useState("");
  const [msgPass,setMsgPass]=useState("");
  const [load, setLoad] = useState(false);

  async function guardar() {
    setLoad(true);
    await setDoc(rUser(user.dni), { nombre:nom.trim(), apodo:apodo.trim(), foto:foto.trim() }, { merge:true });
    await reloadUser();
    setLoad(false); setMsg("✓ Perfil actualizado");
    setTimeout(()=>setMsg(""), 2500);
  }

  async function cambiarPass() {
    if (!passOld||!passNew||!passNew2) { setMsgPass("Completá todos los campos"); return; }
    if (passNew !== passNew2) { setMsgPass("Las contraseñas no coinciden"); return; }
    if (passNew.length < 4) { setMsgPass("Mínimo 4 caracteres"); return; }
    const snap = await getDoc(rUser(user.dni));
    const u = snap.data();
    if (u.passHash !== hashPassword(passOld)) { setMsgPass("Contraseña actual incorrecta"); return; }
    await setDoc(rUser(user.dni), { passHash: hashPassword(passNew) }, { merge:true });
    setPassOld(""); setPassNew(""); setPassNew2("");
    setMsgPass("✓ Contraseña cambiada");
    setTimeout(()=>setMsgPass(""), 2500);
  }

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>👤 Mi perfil</div>
      <Card>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16, padding:"12px 14px", background:"#0a1520", borderRadius:12 }}>
          <Av nombre={nom} size={56} foto={foto} />
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>{nom}</div>
            {apodo && <div style={{ color:C.accent, fontSize:13, fontWeight:600 }}>"{apodo}"</div>}
            <div style={{ color:C.muted, fontSize:12, marginTop:2 }}>DNI: {user.dni}</div>
          </div>
        </div>
        <Lbl>Nombre</Lbl>
        <Inp value={nom} onChange={e=>setNom(e.target.value)} placeholder="Tu nombre" />
        <div style={{ marginTop:10 }} />
        <Lbl>Apodo (opcional)</Lbl>
        <Inp value={apodo} onChange={e=>setApodo(e.target.value)} placeholder='Ej: "El Flaco"' />
        <div style={{ marginTop:10 }} />
        <Lbl>URL de foto (opcional)</Lbl>
        <Inp value={foto} onChange={e=>setFoto(e.target.value)} placeholder="https://..." />
        <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>Pegá el link de una imagen de internet o de Google Drive (compartida públicamente)</div>
        <Btn onClick={guardar} disabled={load} ex={{ marginTop:12, display:"block" }}>{load?"Guardando...":"Guardar perfil"}</Btn>
        <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
      </Card>

      <Card>
        <div style={{ fontWeight:800, marginBottom:12 }}>🔒 Cambiar contraseña</div>
        <Lbl>Contraseña actual</Lbl>
        <Inp type="password" value={passOld} onChange={e=>setPassOld(e.target.value)} placeholder="••••••" />
        <div style={{ marginTop:10 }} />
        <Lbl>Nueva contraseña</Lbl>
        <Inp type="password" value={passNew} onChange={e=>setPassNew(e.target.value)} placeholder="••••••" />
        <div style={{ marginTop:10 }} />
        <Lbl>Repetir nueva contraseña</Lbl>
        <Inp type="password" value={passNew2} onChange={e=>setPassNew2(e.target.value)} placeholder="••••••" />
        <Btn onClick={cambiarPass} v="ghost" ex={{ marginTop:12, display:"block" }}>Cambiar contraseña</Btn>
        <Msg ok={msgPass?.startsWith("✓")}>{msgPass}</Msg>
      </Card>

      <Card>
        <div style={{ fontWeight:800, marginBottom:12 }}>📊 Mis estadísticas</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
          {[
            { icon:"🏟️", label:"Partidos", val:user.partidos||0 },
            { icon:"⚽",  label:"Goles",    val:user.goles||0 },
            { icon:"⭐",  label:"Promedio", val:calcProm(user).toFixed(1) },
            { icon:"🥇",  label:"MVPs",     val:(user.historial||[]).filter(h=>h.mvp).length },
          ].map(s => (
            <div key={s.label} style={{ background:"#0a1520", borderRadius:8, padding:"8px 6px", textAlign:"center" }}>
              <div style={{ fontSize:14 }}>{s.icon}</div>
              <div style={{ fontSize:16, fontWeight:800, color:C.accent }}>{s.val}</div>
              <div style={{ fontSize:10, color:C.muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── COMUNIDAD ────────────────────────────────────────────────────────────────
function PComunidad({ comunidad, user, reloadComunidades, setPantalla, S }) {
  const [dniInvitar, setDniInvitar] = useState("");
  const [dniAdmin,   setDniAdmin]   = useState("");
  const [msgInv,     setMsgInv]     = useState("");
  const [msgAdm,     setMsgAdm]     = useState("");
  const [miembros,   setMiembros]   = useState([]);

  const esAdmin = (comunidad.admins||[]).includes(user.dni);

  useEffect(() => {
    const load = async () => {
      const arr = [];
      for (const dni of comunidad.miembros||[]) {
        const s = await getDoc(rUser(dni));
        if (s.exists()) arr.push(s.data());
      }
      setMiembros(arr);
    };
    load();
  }, [comunidad]);

  async function invitar() {
    const dni = dniInvitar.trim();
    if (!dni) return;
    const snap = await getDoc(rUser(dni));
    if (!snap.exists()) { setMsgInv("DNI no encontrado"); return; }
    if ((comunidad.miembros||[]).includes(dni)) { setMsgInv("Ya es miembro"); return; }
    await setDoc(rComunidad(comunidad.id), { miembros: [...(comunidad.miembros||[]), dni] }, { merge:true });
    setDniInvitar(""); await reloadComunidades();
    setMsgInv(`✓ ${snap.data().nombre} invitado!`); setTimeout(()=>setMsgInv(""), 2500);
  }

  async function darAdmin(dni) {
    if ((comunidad.admins||[]).includes(dni)) { setMsgAdm("Ya es admin"); return; }
    await setDoc(rComunidad(comunidad.id), { admins: [...(comunidad.admins||[]), dni] }, { merge:true });
    await reloadComunidades(); setDniAdmin("");
    setMsgAdm("✓ Admin asignado"); setTimeout(()=>setMsgAdm(""), 2500);
  }

  async function quitarAdmin(dni) {
    if (dni === comunidad.creadorDni) return;
    await setDoc(rComunidad(comunidad.id), { admins: (comunidad.admins||[]).filter(d=>d!==dni) }, { merge:true });
    await reloadComunidades();
  }

  async function expulsar(dni) {
    if (!confirm("¿Expulsar a este miembro?")) return;
    await setDoc(rComunidad(comunidad.id), { miembros:(comunidad.miembros||[]).filter(d=>d!==dni), admins:(comunidad.admins||[]).filter(d=>d!==dni) }, { merge:true });
    await reloadComunidades();
  }

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>🏘️ {comunidad.nombre}</div>

      <Card>
        <div style={{ fontWeight:800, marginBottom:12 }}>👥 Miembros ({miembros.length})</div>
        {miembros.map(m => (
          <div key={m.dni} style={S.row}>
            <Av nombre={m.nombre} size={34} foto={m.foto} />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>{m.nombre}</div>
              {m.apodo && <div style={{ color:C.accent, fontSize:11 }}>"{m.apodo}"</div>}
            </div>
            {(comunidad.admins||[]).includes(m.dni) && <Tag color={C.accent}>Admin</Tag>}
            {m.dni === comunidad.creadorDni && <Tag color={C.purple}>Creador</Tag>}
            {esAdmin && m.dni !== user.dni && m.dni !== comunidad.creadorDni && (
              <button onClick={()=>expulsar(m.dni)} style={{ background:C.red+"20", border:`1px solid ${C.red}40`, color:C.red, borderRadius:7, padding:"4px 8px", cursor:"pointer", fontSize:11, fontWeight:700 }}>✕</button>
            )}
          </div>
        ))}
      </Card>

      {esAdmin && (
        <>
          <Card accent={C.green+"40"}>
            <div style={{ fontWeight:800, marginBottom:10 }}>➕ Invitar por DNI</div>
            <Inp value={dniInvitar} onChange={e=>setDniInvitar(e.target.value)} placeholder="DNI del jugador" onKeyDown={e=>e.key==="Enter"&&invitar()} />
            <Btn onClick={invitar} v="green" ex={{ marginTop:8, display:"block" }}>Invitar</Btn>
            <Msg ok={msgInv?.startsWith("✓")}>{msgInv}</Msg>
          </Card>

          <Card accent={C.accent+"40"}>
            <div style={{ fontWeight:800, marginBottom:10 }}>👑 Dar permisos de admin</div>
            <Inp value={dniAdmin} onChange={e=>setDniAdmin(e.target.value)} placeholder="DNI del miembro" onKeyDown={e=>e.key==="Enter"&&darAdmin(dniAdmin)} />
            <Btn onClick={()=>darAdmin(dniAdmin)} v="primary" ex={{ marginTop:8, display:"block" }}>Dar admin</Btn>
            {(comunidad.admins||[]).filter(d=>d!==comunidad.creadorDni).map(d => {
              const m = miembros.find(x=>x.dni===d);
              return <div key={d} style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
                <Tag color={C.accent}>{m?.nombre||d}</Tag>
                <button onClick={()=>quitarAdmin(d)} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:12 }}>✕ quitar</button>
              </div>;
            })}
            <Msg ok={msgAdm?.startsWith("✓")}>{msgAdm}</Msg>
          </Card>
        </>
      )}
    </div>
  );
}

// ── PARTIDO ───────────────────────────────────────────────────────────────────
const FORMATOS = [
  {label:"5 vs 5",total:10},{label:"6 vs 6",total:12},{label:"7 vs 7",total:14},
  {label:"8 vs 8",total:16},{label:"9 vs 9",total:18},{label:"10 vs 10",total:20},{label:"11 vs 11",total:22}
];

function PPartido({ comunidad, partido, user, reloadCom, setPantalla, S }) {
  const [fecha,   setFecha]   = useState("");
  const [hora,    setHora]    = useState("");
  const [lugar,   setLugar]   = useState("");
  const [formato, setFormato] = useState("");
  const [msg,     setMsg]     = useState("");
  const [nomInv,  setNomInv]  = useState("");
  const [invMsg,  setInvMsg]  = useState("");

  const esAdmin   = (comunidad.admins||[]).includes(user.dni);
  const formato_  = FORMATOS.find(f=>f.label===partido?.formato);
  const cupo      = formato_?.total||0;
  const inscripos = partido?.inscriptos||[];
  const cupoLibre = cupo - inscripos.length;
  const yoAnotado = inscripos.includes(user.dni);

  useEffect(() => {
    if (partido) { setFecha(partido.fecha||""); setHora(partido.hora||""); setLugar(partido.lugar||""); setFormato(partido.formato||""); }
  }, [partido?.id]);

  async function crearPartido() {
    if (!fecha||!hora||!lugar||!formato) { setMsg("Completá todos los campos"); return; }
    const pid = uid();
    await setDoc(rPartido(pid), { comunidadId:comunidad.id, fecha, hora, lugar, formato, inscriptos:[], invitados:{}, goles:{}, finalizado:false, fechaFin:null, equipos:null, notasAcumuladas:{}, mvpConteo:{}, creadoEn:Date.now() });
    await setDoc(rComunidad(comunidad.id), { partidoActivo:pid }, { merge:true });
    await reloadCom(); setMsg("✓ Partido creado!"); setTimeout(()=>setMsg(""), 2000);
  }

  async function actualizarPartido() {
    if (!fecha||!hora||!lugar||!formato) { setMsg("Completá todos los campos"); return; }
    await setDoc(rPartido(partido.id), { fecha, hora, lugar, formato }, { merge:true });
    setMsg("✓ Actualizado"); setTimeout(()=>setMsg(""), 2000);
  }

  async function anotarme() {
    if (cupoLibre<=0) { setMsg("Partido completo"); return; }
    await setDoc(rPartido(partido.id), { inscriptos:[...inscripos, user.dni] }, { merge:true });
  }

  async function desanotarme() {
    await setDoc(rPartido(partido.id), { inscriptos:inscripos.filter(d=>d!==user.dni) }, { merge:true });
  }

  async function borrarInscripto(id) {
    await setDoc(rPartido(partido.id), { inscriptos:inscripos.filter(d=>d!==id) }, { merge:true });
  }

  async function agregarInvitado() {
    if (!nomInv.trim()) { setInvMsg("Poné un nombre"); return; }
    const id = `inv_${uid()}`;
    const inv = { ...(partido.invitados||{}), [id]:{ nombre:nomInv.trim(), esInvitado:true } };
    await setDoc(rPartido(partido.id), { invitados:inv, inscriptos:[...inscripos, id] }, { merge:true });
    setNomInv(""); setInvMsg("✓ Invitado agregado!"); setTimeout(()=>setInvMsg(""), 2000);
  }

  async function finalizarPartido() {
    if (inscripos.length < 2) { setMsg("Necesitás al menos 2 jugadores"); return; }
    await setDoc(rPartido(partido.id), { finalizado:true, fechaFin:new Date().toLocaleString("es-AR") }, { merge:true });
    setPantalla("votar");
  }

  async function resetearPartido() {
    if (!confirm("¿Borrar el partido actual?")) return;
    if (partido) await deleteDoc(rPartido(partido.id));
    await setDoc(rComunidad(comunidad.id), { partidoActivo:null }, { merge:true });
    await reloadCom();
  }

  // Render jugador row
  const [miembrosData, setMiembrosData] = useState({});
  useEffect(() => {
    const load = async () => {
      const obj = {};
      for (const id of inscripos) {
        if (id.startsWith("inv_")) { obj[id] = partido.invitados?.[id]; continue; }
        const s = await getDoc(rUser(id));
        if (s.exists()) obj[id] = s.data();
      }
      setMiembrosData(obj);
    };
    if (partido) load();
  }, [JSON.stringify(inscripos)]);

  if (!partido) return (
    <div style={S.sec}>
      <div style={S.sTitle}>📋 Partido</div>
      {!esAdmin
        ? <Card style={{ textAlign:"center", padding:32 }}><div style={{ fontSize:40, marginBottom:12 }}>🗓️</div><div style={{ color:C.muted }}>No hay partido creado aún. Esperá a que el admin cree uno.</div></Card>
        : <Card accent={C.purple+"40"}>
            <div style={{ fontWeight:800, marginBottom:14 }}>🗓️ Crear partido</div>
            <Lbl>Fecha</Lbl><Inp type="date" value={fecha} onChange={e=>setFecha(e.target.value)} />
            <div style={{ marginTop:10 }} /><Lbl>Hora</Lbl><Inp type="time" value={hora} onChange={e=>setHora(e.target.value)} />
            <div style={{ marginTop:10 }} /><Lbl>Lugar</Lbl><Inp value={lugar} onChange={e=>setLugar(e.target.value)} placeholder="Cancha..." />
            <div style={{ marginTop:10 }} /><Lbl>Formato</Lbl>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:4 }}>
              {FORMATOS.map(f=><button key={f.label} onClick={()=>setFormato(f.label)} style={{ padding:"7px 12px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:12, background:formato===f.label?C.accent:"#1c2433", color:formato===f.label?"#0d1117":C.muted, fontFamily:"inherit" }}>{f.label}</button>)}
            </div>
            <Btn onClick={crearPartido} v="purple" ex={{ marginTop:12, display:"block" }}>Crear partido</Btn>
            <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
          </Card>
      }
    </div>
  );

  if (partido.finalizado) return (
    <div style={S.sec}>
      <div style={S.sTitle}>📋 Partido</div>
      <Card style={{ textAlign:"center" }} accent={C.green+"40"}>
        <div style={{ fontSize:48, marginBottom:8 }}>🏁</div>
        <div style={{ fontWeight:800, fontSize:16, color:C.green }}>Partido finalizado</div>
        <Btn onClick={()=>setPantalla("votar")} v="green" ex={{ marginTop:12, display:"block" }}>Ir a votar</Btn>
        {esAdmin && <Btn onClick={resetearPartido} v="danger" ex={{ marginTop:8, display:"block" }}>🗑️ Borrar partido</Btn>}
      </Card>
    </div>
  );

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>📋 Partido</div>

      <Card accent={C.accent+"30"}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
          {[{icon:"📆",v:partido.fecha},{icon:"🕐",v:partido.hora},{icon:"📍",v:partido.lugar},{icon:"👥",v:partido.formato}].map((r,i)=>(
            <div key={i} style={{ background:"#0a1520", borderRadius:8, padding:"8px 10px", fontSize:13, fontWeight:600 }}>{r.icon} {r.v||"—"}</div>
          ))}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:13, fontWeight:700, color:cupoLibre>0?C.green:C.red }}>{cupoLibre>0?`✅ ${cupoLibre} lugares`:cupo>0?"🚫 Completo":""}</span>
          <span style={{ fontSize:12, color:C.muted }}>{inscripos.length}/{cupo}</span>
        </div>
      </Card>

      {/* Anotarme */}
      <Card>
        {yoAnotado
          ? <><div style={{ color:C.green, fontWeight:700, marginBottom:8 }}>✅ Estás anotado</div><Btn v="ghost" onClick={desanotarme} ex={{ display:"block" }}>Desanotarme</Btn></>
          : <Btn onClick={anotarme} disabled={cupoLibre<=0} ex={{ display:"block" }}>{cupoLibre>0?"📝 Anotarme":"🚫 Sin lugares"}</Btn>
        }
        <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
      </Card>

      {/* Lista */}
      <Card>
        <div style={{ fontWeight:800, marginBottom:12 }}>👥 Inscriptos ({inscripos.length}/{cupo})</div>
        {inscripos.length===0
          ? <div style={{ color:C.muted, textAlign:"center", padding:16 }}>Nadie anotado aún</div>
          : inscripos.map((id,idx)=>{
              const j = miembrosData[id];
              if (!j) return null;
              return (
                <div key={id} style={S.row}>
                  <div style={{ width:22, textAlign:"center", color:C.muted, fontWeight:700, fontSize:13 }}>#{idx+1}</div>
                  <Av nombre={j.nombre} size={32} foto={j.foto} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{j.nombre}</div>
                    {j.apodo && <div style={{ color:C.accent, fontSize:11 }}>"{j.apodo}"</div>}
                    {j.esInvitado && <Tag color={C.purple}>Invitado</Tag>}
                  </div>
                  {!j.esInvitado && <ScBadge score={calcProm(j)} />}
                  {esAdmin && <button onClick={()=>borrarInscripto(id)} style={{ background:C.red+"20", border:`1px solid ${C.red}40`, color:C.red, borderRadius:7, padding:"3px 8px", cursor:"pointer", fontSize:11, fontWeight:700, marginLeft:4 }}>✕</button>}
                </div>
              );
            })
        }
      </Card>

      {/* Admin tools */}
      {esAdmin && (
        <>
          <Card accent={C.purple+"30"}>
            <div style={{ fontWeight:800, marginBottom:8 }}>👤 Agregar invitado</div>
            <Inp value={nomInv} onChange={e=>setNomInv(e.target.value)} placeholder='Ej: "Amigo de Juan"' onKeyDown={e=>e.key==="Enter"&&agregarInvitado()} />
            <Btn onClick={agregarInvitado} v="ghost" ex={{ marginTop:8, display:"block" }}>+ Agregar invitado</Btn>
            <Msg ok={invMsg?.startsWith("✓")}>{invMsg}</Msg>
          </Card>

          <Card accent={C.purple+"30"}>
            <div style={{ fontWeight:800, marginBottom:8 }}>⚽ Editar partido</div>
            <Lbl>Fecha</Lbl><Inp type="date" value={fecha} onChange={e=>setFecha(e.target.value)} />
            <div style={{ marginTop:8 }} /><Lbl>Hora</Lbl><Inp type="time" value={hora} onChange={e=>setHora(e.target.value)} />
            <div style={{ marginTop:8 }} /><Lbl>Lugar</Lbl><Inp value={lugar} onChange={e=>setLugar(e.target.value)} placeholder="Cancha..." />
            <div style={{ marginTop:8 }} /><Lbl>Formato</Lbl>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:4 }}>
              {FORMATOS.map(f=><button key={f.label} onClick={()=>setFormato(f.label)} style={{ padding:"6px 10px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:11, background:formato===f.label?C.accent:"#1c2433", color:formato===f.label?"#0d1117":C.muted, fontFamily:"inherit" }}>{f.label}</button>)}
            </div>
            <Btn onClick={actualizarPartido} v="ghost" ex={{ marginTop:8, display:"block" }}>Actualizar</Btn>
          </Card>

          <Btn onClick={finalizarPartido} v="danger" ex={{ display:"block" }}>🏁 Finalizar partido y abrir votaciones</Btn>
          <Btn onClick={resetearPartido}  v="ghost"  ex={{ display:"block", marginTop:8 }}>🗑️ Borrar partido</Btn>
        </>
      )}
    </div>
  );
}

// ── EQUIPOS ───────────────────────────────────────────────────────────────────
function PEquipos({ comunidad, partido, user, S }) {
  const [jugadoresData, setJugadoresData] = useState({});
  const [eqOscuro,  setEqOscuro]  = useState([]);
  const [eqBlanco,  setEqBlanco]  = useState([]);
  const [generado,  setGenerado]  = useState(false);
  const [publicado, setPublicado] = useState(false);
  const [dragging,  setDragging]  = useState(null); // { id, from }
  const [msg,       setMsg]       = useState("");

  const esAdmin = (comunidad.admins||[]).includes(user.dni);
  const inscripos = partido?.inscriptos||[];

  useEffect(() => {
    if (partido?.equipos) {
      setEqOscuro(partido.equipos.oscuro||[]);
      setEqBlanco(partido.equipos.blanco||[]);
      setPublicado(partido.equipos.publicado||false);
      setGenerado(true);
    }
  }, [partido?.id]);

  useEffect(() => {
    const load = async () => {
      const obj = {};
      for (const id of inscripos) {
        if (id.startsWith("inv_")) { obj[id] = partido.invitados?.[id]||{ nombre:"Invitado", goles:0, puntajeTotal:0, partidos:0 }; continue; }
        const s = await getDoc(rUser(id));
        if (s.exists()) obj[id] = s.data();
      }
      setJugadoresData(obj);
    };
    if (partido) load();
  }, [JSON.stringify(inscripos)]);

  function generar() {
    const lista = inscripos.map(id=>({ id, ...(jugadoresData[id]||{}) })).filter(j=>j.nombre);
    const { oscuro, blanco } = balancear(lista);
    setEqOscuro(oscuro.map(j=>j.id));
    setEqBlanco(blanco.map(j=>j.id));
    setGenerado(true); setPublicado(false);
  }

  // Drag & Drop manual
  function mover(id, from) {
    if (from==="oscuro") { setEqOscuro(p=>p.filter(x=>x!==id)); setEqBlanco(p=>[...p,id]); }
    else                 { setEqBlanco(p=>p.filter(x=>x!==id)); setEqOscuro(p=>[...p,id]); }
  }

  async function publicar() {
    await setDoc(rPartido(partido.id), { equipos:{ oscuro:eqOscuro, blanco:eqBlanco, publicado:true } }, { merge:true });
    setPublicado(true); setMsg("✓ Equipos publicados!"); setTimeout(()=>setMsg(""), 2000);
  }

  const renderEquipo = (ids, nombre, color, from) => {
    const jug = ids.map(id=>({ id, ...(jugadoresData[id]||{}) }));
    const sum  = jug.reduce((s,j)=>s+calcProm(j),0);
    return (
      <div style={{ flex:1, background:`linear-gradient(135deg,${color}18,${C.card})`, border:`1px solid ${color}40`, borderRadius:16, padding:14 }}>
        <div style={{ color, fontWeight:800, fontSize:15, marginBottom:2 }}>{nombre==="oscuro"?"🖤 Oscuro":"🤍 Blanco"}</div>
        <div style={{ color:C.muted, fontSize:12, marginBottom:4 }}>Puntaje total: <span style={{ color, fontWeight:800, fontSize:14 }}>{sum.toFixed(1)}</span></div>
        <div style={{ color:C.muted, fontSize:11, marginBottom:10 }}>Promedio: {jug.length>0?(sum/jug.length).toFixed(1):"—"}/10</div>
        {jug.map(j=>(
          <div key={j.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:"#0a1520", borderRadius:10, marginBottom:6 }}>
            <Av nombre={j.nombre||"?"} size={28} foto={j.foto} />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:12 }}>{j.nombre||"?"}</div>
              <ScBadge score={calcProm(j)} size={11} />
            </div>
            {esAdmin && !publicado && (
              <button onClick={()=>mover(j.id, nombre)} style={{ background:color+"25", border:`1px solid ${color}50`, color, borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11, fontWeight:700 }}>
                → {nombre==="oscuro"?"Blanco":"Oscuro"}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (!partido) return <div style={S.sec}><Card style={{ textAlign:"center", color:C.muted, padding:32 }}>No hay partido activo.</Card></div>;

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>⚖️ Equipos</div>

      {!generado && !publicado && (
        <Card style={{ textAlign:"center", padding:24 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>⚖️</div>
          <div style={{ color:C.muted, fontSize:14, marginBottom:16 }}>
            {esAdmin ? "Generá los equipos balanceados automáticamente. Después podés modificarlos antes de publicar." : "El admin aún no generó los equipos."}
          </div>
          {esAdmin && inscripos.length>=2 && <Btn onClick={generar} ex={{ display:"inline-block", width:"auto" }}>⚖️ Generar equipos</Btn>}
        </Card>
      )}

      {generado && (
        <>
          {!publicado && esAdmin && (
            <Card style={{ background:"#0f1e10", border:`1px solid ${C.green}40` }}>
              <div style={{ fontSize:12, color:C.green }}>🔒 Modo edición — Solo vos podés ver esto. Hacé los cambios y publicá cuando estés listo.</div>
            </Card>
          )}
          {publicado && (
            <Card style={{ background:"#1a150a", border:`1px solid ${C.accent}40` }}>
              <div style={{ fontSize:12, color:C.accent }}>✅ Equipos publicados — Todos pueden verlos.</div>
            </Card>
          )}

          {(publicado || esAdmin) && (
            <div style={{ display:"flex", gap:10, marginBottom:12 }}>
              {renderEquipo(eqOscuro,"oscuro","#555",  "oscuro")}
              {renderEquipo(eqBlanco,"blanco","#aaa","blanco")}
            </div>
          )}

          {!publicado && esAdmin && (
            <>
              <Btn onClick={generar}  v="ghost" ex={{ display:"block", marginBottom:8 }}>🔄 Re-generar</Btn>
              <Btn onClick={publicar} v="green" ex={{ display:"block" }}>✅ Publicar equipos</Btn>
            </>
          )}
          {publicado && esAdmin && (
            <Btn onClick={()=>{setPublicado(false);setGenerado(false);}} v="ghost" ex={{ display:"block" }}>🔄 Re-hacer equipos</Btn>
          )}
          <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>

          {!publicado && !esAdmin && (
            <Card style={{ textAlign:"center", color:C.muted, padding:24 }}>⏳ El admin está preparando los equipos...</Card>
          )}
        </>
      )}
    </div>
  );
}

// ── VOTAR ─────────────────────────────────────────────────────────────────────
function PVotar({ comunidad, partido, user, S }) {
  const [votanteDni, setVotanteDni]  = useState("");
  const [passInput,  setPassInput]   = useState("");
  const [votante,    setVotante]     = useState(null);
  const [notas,      setNotas]       = useState({});
  const [mvp,        setMvp]         = useState(null);
  const [votosSnap,  setVotosSnap]   = useState({});
  const [jugData,    setJugData]     = useState({});
  const [msg,        setMsg]         = useState("");
  const [busMsg,     setBusMsg]      = useState("");

  useEffect(() => {
    if (!partido) return;
    const unsub = onSnapshot(rVotos(partido.id), s => setVotosSnap(s.exists()?s.data():{}));
    return unsub;
  }, [partido?.id]);

  useEffect(() => {
    const load = async () => {
      if (!partido) return;
      const obj = {};
      for (const id of partido.inscriptos||[]) {
        if (id.startsWith("inv_")) { obj[id]=partido.invitados?.[id]||{nombre:"Invitado"}; continue; }
        const s = await getDoc(rUser(id)); if(s.exists()) obj[id]=s.data();
      }
      setJugData(obj);
    };
    load();
  }, [partido?.id]);

  if (!partido?.finalizado) return (
    <div style={S.sec}>
      <Card style={{ textAlign:"center", padding:32 }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⏳</div>
        <div style={{ color:C.muted }}>Las votaciones abren cuando el admin finalice el partido.</div>
      </Card>
    </div>
  );

  const yaVotaron   = Object.keys(votosSnap);
  const jugadores   = (partido.inscriptos||[]).filter(id=>!id.startsWith("inv_"));
  const todosVotaron= yaVotaron.length >= jugadores.length && jugadores.length > 0;

  async function buscar() {
    const s = await getDoc(rUser(votanteDni.trim()));
    if (!s.exists()) { setBusMsg("DNI no encontrado"); return; }
    if (s.data().passHash !== hashPassword(passInput)) { setBusMsg("Contraseña incorrecta"); return; }
    if (!jugadores.includes(votanteDni.trim())) { setBusMsg("No participaste en este partido"); return; }
    if (yaVotaron.includes(votanteDni.trim())) { setBusMsg("Ya votaste ✓"); return; }
    setVotante(s.data()); setBusMsg("");
    const init = {};
    (partido.inscriptos||[]).filter(id=>id!==votanteDni.trim()).forEach(id=>{init[id]=0;});
    setNotas(init);
  }

  async function enviar() {
    if (Object.values(notas).some(v=>v===0)) { setMsg("⚠️ Puntuá a todos"); return; }
    if (!mvp) { setMsg("⚠️ Elegí el MVP"); return; }
    // Guardar que ya votó (anónimo: solo el hecho, no qué votó)
    await setDoc(rVotos(partido.id), { [votante.dni]: true }, { merge:true });
    // Acumular notas en partido (sin vincular al votante)
    const notasAc = { ...(partido.notasAcumuladas||{}) };
    const mvpC    = { ...(partido.mvpConteo||{}) };
    Object.entries(notas).forEach(([id,n]) => {
      if (!notasAc[id]) notasAc[id]={ suma:0, cant:0 };
      notasAc[id].suma += n; notasAc[id].cant += 1;
    });
    mvpC[mvp] = (mvpC[mvp]||0) + 1;
    await setDoc(rPartido(partido.id), { notasAcumuladas:notasAc, mvpConteo:mvpC }, { merge:true });
    setVotante(null); setVotanteDni(""); setPassInput(""); setMvp(null); setNotas({});
    setMsg("✓ Votos enviados (anónimos)!"); setTimeout(()=>setMsg(""),3000);
  }

  async function cerrar() {
    const notas_ = partido.notasAcumuladas||{};
    const mvpC   = partido.mvpConteo||{};
    const mvpId  = Object.keys(mvpC).length ? Object.keys(mvpC).reduce((a,b)=>mvpC[a]>mvpC[b]?a:b) : null;
    // Actualizar stats de jugadores
    for (const id of jugadores) {
      const s = await getDoc(rUser(id)); if(!s.exists()) continue;
      const j  = s.data();
      const n  = notas_[id];
      const prom = n&&n.cant>0 ? n.suma/n.cant : 5;
      const golesP = (partido.goles||{})[id]||0;
      await setDoc(rUser(id), {
        goles: j.goles + golesP,
        puntajeTotal: j.puntajeTotal + prom,
        partidos: j.partidos + 1,
        historial: [...(j.historial||[]), { fecha:new Date().toLocaleDateString("es-AR"), nota:+prom.toFixed(1), goles:golesP, mvp:id===mvpId }]
      }, { merge:true });
    }
    // Cerrar partido
    await setDoc(rPartido(partido.id), { cerrado:true }, { merge:true });
    await setDoc(rComunidad(comunidad.id), { partidoActivo:null }, { merge:true });
    setMsg("✓ Resultados guardados!"); setTimeout(()=>setMsg(""),3000);
  }

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>🗳️ Votaciones</div>
      <Card accent={C.green+"40"}>
        <div style={{ fontSize:13, color:C.green, fontWeight:700 }}>🔒 Votaciones 100% anónimas</div>
        <div style={{ color:C.muted, fontSize:12, marginTop:4 }}>Votaron {yaVotaron.length} de {jugadores.length}</div>
        <div style={{ marginTop:8, height:4, background:C.border, borderRadius:4 }}>
          <div style={{ width:`${(yaVotaron.length/Math.max(jugadores.length,1))*100}%`, height:"100%", background:C.green, borderRadius:4, transition:"width .4s" }} />
        </div>
      </Card>

      {!votante ? (
        <Card>
          <Lbl>Tu DNI</Lbl>
          <Inp value={votanteDni} onChange={e=>setVotanteDni(e.target.value)} placeholder="DNI" />
          <div style={{ marginTop:10 }} />
          <Lbl>Tu contraseña</Lbl>
          <Inp type="password" value={passInput} onChange={e=>setPassInput(e.target.value)} placeholder="••••••" onKeyDown={e=>e.key==="Enter"&&buscar()} />
          <Btn onClick={buscar} ex={{ marginTop:10, display:"block" }}>Ingresar para votar</Btn>
          <Msg ok={false}>{busMsg}</Msg>
          <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
        </Card>
      ) : (
        <Card>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, padding:"10px 12px", background:"#0a1520", borderRadius:10 }}>
            <Av nombre={votante.nombre} size={34} foto={votante.foto} />
            <div><div style={{ fontWeight:800 }}>{votante.nombre}</div><div style={{ color:C.muted, fontSize:12 }}>Tus votos son anónimos ✓</div></div>
          </div>

          <div style={{ fontWeight:700, fontSize:14, marginBottom:12, color:C.accent }}>⭐ Puntuá (1-10)</div>
          {(partido.inscriptos||[]).filter(id=>id!==votante.dni).map(id=>{
            const j = jugData[id]; if(!j) return null;
            const nota = notas[id]||0;
            return (
              <div key={id} style={{ marginBottom:14, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <Av nombre={j.nombre} size={28} foto={j.foto} />
                  <div style={{ flex:1, fontWeight:700 }}>{j.nombre}</div>
                  <span style={{ color:C.accent, fontWeight:800 }}>{nota||"—"}/10</span>
                </div>
                <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n=>(
                    <button key={n} onClick={()=>setNotas(p=>({...p,[id]:n}))} style={{ width:28, height:28, borderRadius:6, border:"none", cursor:"pointer", fontWeight:700, fontSize:12, background:n<=nota?C.accent:"#1c2433", color:n<=nota?"#0d1117":C.muted }}>{n}</button>
                  ))}
                </div>
              </div>
            );
          })}

          <div style={{ fontWeight:700, fontSize:14, marginBottom:10, color:C.accent, marginTop:4 }}>🥇 MVP del partido</div>
          {(partido.inscriptos||[]).filter(id=>id!==votante.dni).map(id=>{
            const j = jugData[id]; if(!j) return null;
            return <div key={id} onClick={()=>setMvp(id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:10, cursor:"pointer", marginBottom:6, border:`1px solid ${mvp===id?C.accent:C.border}`, background:mvp===id?"#1a150a":"#0a1520" }}>
              <Av nombre={j.nombre} size={28} foto={j.foto} />
              <div style={{ flex:1, fontWeight:600, fontSize:13 }}>{j.nombre}</div>
              {mvp===id && <span style={{ color:C.accent }}>⭐</span>}
            </div>;
          })}

          <Btn onClick={enviar} v="green" ex={{ marginTop:12, display:"block" }}>Enviar votos</Btn>
          <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
        </Card>
      )}

      {todosVotaron && <Btn onClick={cerrar} v="primary" ex={{ display:"block", marginTop:8 }}>✅ Cerrar votación y guardar resultados</Btn>}
    </div>
  );
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function PStats({ comunidad, S }) {
  const [jugadores, setJugadores] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      const arr = [];
      for (const dni of comunidad.miembros||[]) {
        const s = await getDoc(rUser(dni)); if(s.exists()) arr.push(s.data());
      }
      arr.sort((a,b)=>calcProm(b)-calcProm(a));
      setJugadores(arr); setLoading(false);
    };
    load();
  }, [comunidad.id]);

  if (loading) return <div style={S.sec}><Spinner /></div>;

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>📊 Estadísticas</div>
      {jugadores.map((j,i) => (
        <Card key={j.dni}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{ fontSize:15, fontWeight:900, color:i<3?C.accent:C.muted, width:24, textAlign:"center" }}>#{i+1}</div>
            <Av nombre={j.nombre} size={40} foto={j.foto} />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:15 }}>{j.nombre}</div>
              {j.apodo && <div style={{ color:C.accent, fontSize:12 }}>"{j.apodo}"</div>}
            </div>
            <ScBadge score={calcProm(j)} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
            {[
              { icon:"🏟️", label:"Partidos", val:j.partidos||0 },
              { icon:"⚽",  label:"Goles",    val:j.goles||0 },
              { icon:"⭐",  label:"Promedio", val:j.partidos>0?(j.puntajeTotal/j.partidos).toFixed(1):"—" },
              { icon:"🥇",  label:"MVPs",     val:(j.historial||[]).filter(h=>h.mvp).length },
            ].map(s=>(
              <div key={s.label} style={{ background:"#0a1520", borderRadius:8, padding:"8px 6px", textAlign:"center" }}>
                <div style={{ fontSize:13 }}>{s.icon}</div>
                <div style={{ fontSize:15, fontWeight:800, color:C.accent }}>{s.val}</div>
                <div style={{ fontSize:10, color:C.muted }}>{s.label}</div>
              </div>
            ))}
          </div>
          {(j.historial||[]).length>0 && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>ÚLTIMOS PARTIDOS</div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {j.historial.slice(-5).map((h,idx)=>(
                  <div key={idx} style={{ background:"#0a1520", borderRadius:7, padding:"3px 8px", fontSize:11, border:`1px solid ${C.border}` }}>
                    <span style={{ color:C.accent, fontWeight:700 }}>{h.nota}</span>
                    <span style={{ color:C.muted }}> ⚽{h.goles}</span>
                    {h.mvp && <span> 🥇</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ── SUPER ADMIN ───────────────────────────────────────────────────────────────
function PSuperAdmin({ S }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editando, setEditando] = useState(null);
  const [nom,      setNom]      = useState("");
  const [apodo,    setApodo]    = useState("");
  const [msg,      setMsg]      = useState("");

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db,"app8_users"));
      const arr = []; snap.forEach(d=>arr.push({ id:d.id, ...d.data() }));
      arr.sort((a,b)=>a.nombre?.localeCompare(b.nombre));
      setUsuarios(arr); setLoading(false);
    };
    load();
  }, []);

  async function guardar() {
    await setDoc(rUser(editando.dni), { nombre:nom.trim(), apodo:apodo.trim() }, { merge:true });
    setUsuarios(p=>p.map(u=>u.dni===editando.dni?{...u,nombre:nom.trim(),apodo:apodo.trim()}:u));
    setEditando(null); setMsg("✓ Guardado"); setTimeout(()=>setMsg(""),2000);
  }

  if (loading) return <div style={S.sec}><Spinner /></div>;

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>🔑 Super Admin — Todos los usuarios</div>
      <Msg ok={true}>{msg}</Msg>
      {usuarios.map(u => (
        <Card key={u.dni}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Av nombre={u.nombre} size={36} foto={u.foto} />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800 }}>{u.nombre}</div>
              {u.apodo && <div style={{ color:C.accent, fontSize:12 }}>"{u.apodo}"</div>}
              <div style={{ color:C.muted, fontSize:11 }}>DNI: {u.dni}</div>
            </div>
            <ScBadge score={calcProm(u)} />
            <Btn v="ghost" sm onClick={()=>{ setEditando(u); setNom(u.nombre); setApodo(u.apodo||""); }} ex={{ marginLeft:4 }}>✏️</Btn>
          </div>
          {editando?.dni===u.dni && (
            <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
              <Lbl>Nombre</Lbl>
              <Inp value={nom} onChange={e=>setNom(e.target.value)} placeholder="Nombre" />
              <div style={{ marginTop:8 }} />
              <Lbl>Apodo</Lbl>
              <Inp value={apodo} onChange={e=>setApodo(e.target.value)} placeholder="Apodo" />
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                <Btn onClick={guardar} ex={{ flex:1 }}>Guardar</Btn>
                <Btn v="ghost" onClick={()=>setEditando(null)} ex={{ flex:1 }}>Cancelar</Btn>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
