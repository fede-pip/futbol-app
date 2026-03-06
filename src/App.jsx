import { useState, useEffect } from 'react';
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

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

const SUPER_ADMIN = "35270164";

const ATTRS = [
  { key:"velocidad",   label:"Velocidad",    icon:"⚡" },
  { key:"pases",       label:"Pases",         icon:"🎯" },
  { key:"definicion",  label:"Definición",    icon:"🥅" },
  { key:"amagues",     label:"Amagues",       icon:"🕺" },
  { key:"defensa",     label:"Defensa",       icon:"🛡️" },
  { key:"resistencia", label:"Resistencia",   icon:"💪" },
  { key:"arquero",     label:"Arquero",       icon:"🧤" },
];

const EVENTOS = [
  { key:"goles",     label:"Goles",    icon:"⚽" },
  { key:"amarillas", label:"Amarillas",icon:"🟨" },
  { key:"rojas",     label:"Rojas",    icon:"🟥" },
  { key:"patadas",   label:"Patadas",  icon:"👢" },
  { key:"burradas",  label:"Burradas", icon:"🤦" },
  { key:"canos",     label:"Caños",    icon:"🌀" },
];

const FORMATOS = [
  {label:"5 vs 5",total:10},{label:"6 vs 6",total:12},{label:"7 vs 7",total:14},
  {label:"8 vs 8",total:16},{label:"9 vs 9",total:18},{label:"10 vs 10",total:20},{label:"11 vs 11",total:22}
];

// ── Firebase refs ────────────────────────────────────────────────────────────
const rUser  = (dni) => doc(db, "app8_users", dni);
const rCom   = (id)  => doc(db, "app8_comunidades", id);
const rPart  = (id)  => doc(db, "app8_partidos", id);
const rVotos = (pid) => doc(db, "app8_votos", pid);

// ── Helpers ──────────────────────────────────────────────────────────────────
function hashPwd(p) {
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (Math.imul(31,h)+p.charCodeAt(i))|0;
  return h.toString(36);
}

function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

function calcProm(atributos) {
  if (!atributos) return 0;
  const vals = ATTRS.map(a => atributos[a.key]||0).filter(v=>v>0);
  if (!vals.length) return 0;
  return +(vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(2);
}

function balancear(lista) {
  const sorted = [...lista].sort((a,b)=>calcProm(b.atributos)-calcProm(a.atributos));
  const osc=[], bla=[];
  sorted.forEach((j,i)=>(i%2===0?osc:bla).push(j));
  return { oscuro:osc, blanco:bla };
}

// Asigna aleatoriamente 3 compañeros a votar para cada jugador
function asignarVotaciones(inscriptos) {
  const asignaciones = {};
  const jugadores = inscriptos.filter(id=>!id.startsWith("inv_"));
  jugadores.forEach(dni => {
    const otros = jugadores.filter(d=>d!==dni);
    const shuffled = [...otros].sort(()=>Math.random()-.5);
    asignaciones[dni] = shuffled.slice(0,Math.min(3,otros.length));
  });
  return asignaciones;
}

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:"#070d16", surface:"#0f1923", card:"#131f2e", border:"#1a2d42",
  text:"#d4dce8", muted:"#4a6a8a", accent:"#ffd166", green:"#06d6a0",
  red:"#ef476f", purple:"#7c5cbf", blue:"#457b9d",
};

// ── UI Components ────────────────────────────────────────────────────────────
function Av({ nombre, size=40, foto }) {
  const initials = (nombre||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const palette = ["#e63946","#f4a261","#2a9d8f","#457b9d","#6a4c93","#e76f51","#06d6a0","#ef476f"];
  const color = palette[(nombre||"?").charCodeAt(0)%palette.length];
  if (foto) return <img src={foto} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>{e.target.style.display="none"}} />;
  return <div style={{width:size,height:size,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:size*.36,color:"#fff",flexShrink:0}}>{initials}</div>;
}

function Btn({ children, onClick, v="primary", disabled, sm, style:ex={} }) {
  const map = {
    primary:{background:C.accent,color:"#0d1117"},
    danger:{background:C.red,color:"#fff"},
    green:{background:C.green,color:"#0d1117"},
    ghost:{background:C.card,color:C.muted,border:`1px solid ${C.border}`},
    purple:{background:C.purple,color:"#fff"},
    dark:{background:"#1a2d42",color:C.muted},
    blue:{background:C.blue,color:"#fff"},
  };
  return <button onClick={onClick} disabled={disabled} style={{
    ...(map[v]||map.primary), border:"none", borderRadius:sm?8:10,
    cursor:disabled?"not-allowed":"pointer", fontWeight:700, fontSize:sm?12:14,
    padding:sm?"6px 12px":"11px 18px", opacity:disabled?.5:1,
    transition:"all .15s", fontFamily:"inherit", ...ex
  }}>{children}</button>;
}

function Inp({ value, onChange, placeholder, type="text", onKeyDown, style:ex={} }) {
  return <input type={type} value={value||""} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
    style={{width:"100%",padding:"11px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:"#0a1520",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box",fontFamily:"inherit",...ex}} />;
}

function Card({ children, style:ex={}, accent }) {
  return <div style={{background:C.card,borderRadius:16,border:`1px solid ${accent||C.border}`,padding:16,marginBottom:14,...ex}}>{children}</div>;
}

function Lbl({ children }) {
  return <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:.6}}>{children}</div>;
}

function Msg({ children, ok }) {
  if (!children) return null;
  return <div style={{padding:"9px 13px",borderRadius:8,marginTop:8,fontSize:13,background:ok?C.green+"15":C.red+"15",color:ok?C.green:C.red,border:`1px solid ${ok?C.green+"30":C.red+"30"}`}}>{children}</div>;
}

function Tag({ children, color=C.accent }) {
  return <span style={{background:color+"20",color,border:`1px solid ${color}40`,borderRadius:5,padding:"1px 7px",fontSize:11,fontWeight:700}}>{children}</span>;
}

function Spinner() {
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"70vh",gap:16}}>
    <div style={{width:44,height:44,border:`3px solid ${C.border}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin .7s linear infinite"}} />
    <div style={{color:C.muted,fontSize:14}}>Cargando App8...</div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
}

function Row({ children, style:ex={} }) {
  return <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 13px",borderRadius:12,background:"#0a1520",border:`1px solid ${C.border}`,marginBottom:8,...ex}}>{children}</div>;
}

// ── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loading,    setLoading]    = useState(true);
  const [user,       setUser]       = useState(null);
  const [pantalla,   setPantalla]   = useState("home");
  const [comunidades,setComunidades]= useState([]);
  const [comActiva,  setComActiva]  = useState(null);
  const [partidoAct, setPartidoAct] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("app8_v3_session");
    if (saved) { try { setUser(JSON.parse(saved)); } catch {} }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) { setComunidades([]); return; }
    loadComs();
    const t = setInterval(loadComs, 30000);
    return () => clearInterval(t);
  }, [user?.dni]);

  useEffect(() => {
    if (!comActiva?.partidoActivo) { setPartidoAct(null); return; }
    const unsub = onSnapshot(rPart(comActiva.partidoActivo), s => {
      setPartidoAct(s.exists() ? {id:s.id,...s.data()} : null);
    });
    return unsub;
  }, [comActiva?.partidoActivo]);

  async function loadComs() {
    if (!user) return;
    const snap = await getDocs(collection(db,"app8_comunidades"));
    const all = [];
    snap.forEach(d => {
      const c = {id:d.id,...d.data()};
      if ((c.miembros||[]).includes(user.dni)||c.creadorDni===user.dni) all.push(c);
    });
    setComunidades(all);
    if (comActiva) {
      const upd = all.find(c=>c.id===comActiva.id);
      if (upd) setComActiva(upd);
    }
  }

  function login(u) { setUser(u); localStorage.setItem("app8_v3_session", JSON.stringify(u)); }
  function logout()  { setUser(null); localStorage.removeItem("app8_v3_session"); setPantalla("home"); setComActiva(null); }

  async function reloadUser() {
    if (!user) return;
    const s = await getDoc(rUser(user.dni));
    if (s.exists()) { const u={...user,...s.data()}; setUser(u); localStorage.setItem("app8_v3_session",JSON.stringify(u)); }
  }

  if (loading) return <div style={{background:C.bg,minHeight:"100vh"}}><Spinner /></div>;

  const S = {
    app:    {minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif",maxWidth:480,margin:"0 auto",paddingBottom:90},
    header: {background:`linear-gradient(180deg,${C.surface} 0%,${C.bg} 100%)`,borderBottom:`1px solid ${C.border}`,padding:"16px 16px 12px",position:"sticky",top:0,zIndex:100},
    nav:    {display:"flex",overflowX:"auto",gap:4,padding:"10px 12px",background:"#0a1220",borderBottom:`1px solid ${C.border}`},
    navBtn: (a) => ({padding:"7px 13px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,whiteSpace:"nowrap",background:a?C.accent:C.card,color:a?"#0d1117":C.muted,fontFamily:"inherit",transition:"all .2s"}),
    sec:    {padding:16},
    sTitle: {fontSize:17,fontWeight:800,marginBottom:16,color:"#e8f0ff"},
  };

  if (!user) return <div style={S.app}><AppHeader user={null} logout={logout} S={S} /><AuthScreen onLogin={login} S={S} /></div>;

  const esAdminCom = comActiva && (comActiva.admins||[]).includes(user.dni);

  const tabs = comActiva ? [
    {id:"partido",  label:"📋 Partido"},
    {id:"equipos",  label:"⚖️ Equipos"},
    {id:"votar",    label:"🗳️ Votar"},
    {id:"historial",label:"📜 Historial"},
    {id:"stats",    label:"📊 Stats"},
    {id:"com",      label:"🏘️ Grupo"},
    {id:"perfil",   label:"👤 Perfil"},
  ] : [
    {id:"home",   label:"⚽ App8"},
    {id:"perfil", label:"👤 Perfil"},
    ...(user.dni===SUPER_ADMIN?[{id:"sadmin",label:"🔑 Super"}]:[]),
  ];

  return (
    <div style={S.app}>
      <AppHeader user={user} logout={logout} comActiva={comActiva} setComActiva={setComActiva} setPantalla={setPantalla} S={S} />
      <div style={S.nav}>
        {tabs.map(t=><button key={t.id} style={S.navBtn(pantalla===t.id)} onClick={()=>setPantalla(t.id)}>{t.label}</button>)}
      </div>

      {pantalla==="home"     && <PHome user={user} comunidades={comunidades} setComActiva={c=>{setComActiva(c);setPantalla("partido");}} reloadComs={loadComs} S={S} />}
      {pantalla==="perfil"   && <PPerfil user={user} reloadUser={reloadUser} esAdminCom={esAdminCom} comunidadActiva={comActiva} S={S} />}
      {pantalla==="sadmin"   && user.dni===SUPER_ADMIN && <PSuperAdmin S={S} />}
      {comActiva && pantalla==="partido"   && <PPartido comunidad={comActiva} partido={partidoAct} user={user} reloadComs={loadComs} setPantalla={setPantalla} S={S} />}
      {comActiva && pantalla==="equipos"   && <PEquipos comunidad={comActiva} partido={partidoAct} user={user} S={S} />}
      {comActiva && pantalla==="votar"     && <PVotar   comunidad={comActiva} partido={partidoAct} user={user} S={S} />}
      {comActiva && pantalla==="historial" && <PHistorial comunidad={comActiva} S={S} />}
      {comActiva && pantalla==="stats"     && <PStats   comunidad={comActiva} user={user} esAdmin={esAdminCom} S={S} />}
      {comActiva && pantalla==="com"       && <PComunidad comunidad={comActiva} user={user} reloadComs={loadComs} S={S} />}
    </div>
  );
}

// ── HEADER ────────────────────────────────────────────────────────────────────
function AppHeader({ user, logout, comActiva, setComActiva, setPantalla, S }) {
  return (
    <div style={S.header}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div onClick={()=>{if(setComActiva)setComActiva(null);if(setPantalla)setPantalla("home");}}
          style={{width:34,height:34,background:`linear-gradient(135deg,${C.accent},${C.red})`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer",flexShrink:0}}>⚽</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:19,fontWeight:900,color:"#fff",letterSpacing:-.5}}>
            App<span style={{color:C.accent}}>8</span>
            {comActiva && <span style={{fontSize:12,color:C.muted,fontWeight:500,marginLeft:8,overflow:"hidden",textOverflow:"ellipsis"}}>/ {comActiva.nombre}</span>}
          </div>
          {!comActiva && <div style={{fontSize:10,color:"#2a4a6a",letterSpacing:.5}}>🔥 RED DE FÚTBOL</div>}
        </div>
        {user && (
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <Av nombre={user.nombre} size={30} foto={user.foto} />
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#c0d0e0"}}>{user.apodo||user.nombre?.split(" ")[0]}</div>
              <button onClick={logout} style={{background:"none",border:"none",color:C.muted,fontSize:11,cursor:"pointer",padding:0}}>Salir</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
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
    if (u.passHash !== hashPwd(pass)) { setMsg("Contraseña incorrecta"); return; }
    onLogin({...u});
  }

  async function doRegister() {
    if (!nom||!dni||!pass||!pass2) { setMsg("Completá todos los campos"); return; }
    if (pass!==pass2) { setMsg("Las contraseñas no coinciden"); return; }
    if (pass.length<4) { setMsg("Mínimo 4 caracteres"); return; }
    setLoad(true);
    const snap = await getDoc(rUser(dni.trim()));
    if (snap.exists()) {
      // Si ya existe (fue pre-cargado por admin), actualizar con contraseña
      const existing = snap.data();
      const updated = { ...existing, nombre:nom.trim()||existing.nombre, passHash:hashPwd(pass), apodo:"", foto:"" };
      await setDoc(rUser(dni.trim()), updated, {merge:true});
      setLoad(false);
      onLogin(updated);
      return;
    }
    const nuevo = { nombre:nom.trim(), dni:dni.trim(), apodo:"", foto:"", passHash:hashPwd(pass), atributos:{}, atributosAnteriores:{}, goles:0, partidos:0, historial:[], creadoEn:Date.now() };
    await setDoc(rUser(dni.trim()), nuevo);
    setLoad(false);
    onLogin(nuevo);
  }

  return (
    <div style={S.sec}>
      <div style={{textAlign:"center",padding:"30px 0 24px"}}>
        <div style={{fontSize:60}}>⚽</div>
        <div style={{fontSize:26,fontWeight:900,color:"#fff",letterSpacing:-1,marginTop:8}}>App<span style={{color:C.accent}}>8</span></div>
        <div style={{color:C.muted,fontSize:13,marginTop:4}}>Tu red de fútbol</div>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {["login","register"].map(t=>(
          <button key={t} onClick={()=>{setTab(t);setMsg("");}} style={{flex:1,padding:10,borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:14,background:tab===t?C.accent:C.card,color:tab===t?"#0d1117":C.muted,fontFamily:"inherit"}}>
            {t==="login"?"Ingresar":"Registrarme"}
          </button>
        ))}
      </div>
      <Card>
        {tab==="register" && <>
          <Lbl>Nombre completo</Lbl>
          <Inp value={nom} onChange={e=>setNom(e.target.value)} placeholder="Ej: Juan Pérez" />
          <div style={{marginTop:10}} />
        </>}
        <Lbl>DNI</Lbl>
        <Inp value={dni} onChange={e=>setDni(e.target.value)} placeholder="Ej: 38123456" />
        <div style={{marginTop:10}} />
        <Lbl>Contraseña</Lbl>
        <Inp type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••" onKeyDown={e=>e.key==="Enter"&&tab==="login"&&doLogin()} />
        {tab==="register" && <>
          <div style={{marginTop:10}} />
          <Lbl>Repetir contraseña</Lbl>
          <Inp type="password" value={pass2} onChange={e=>setPass2(e.target.value)} placeholder="••••••" />
        </>}
        <Btn onClick={tab==="login"?doLogin:doRegister} disabled={load} style={{marginTop:12,display:"block",width:"100%"}}>
          {load?"Cargando...":tab==="login"?"Ingresar":"Crear cuenta"}
        </Btn>
        <Msg ok={false}>{msg}</Msg>
      </Card>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function PHome({ user, comunidades, setComActiva, reloadComs, S }) {
  const [showCrear, setShowCrear] = useState(false);
  const [nomCom,    setNomCom]    = useState("");
  const [msg,       setMsg]       = useState("");

  async function crear() {
    if (!nomCom.trim()) { setMsg("Poné un nombre"); return; }
    const id = uid();
    await setDoc(rCom(id), {nombre:nomCom.trim(),creadorDni:user.dni,admins:[user.dni],miembros:[user.dni],creadoEn:Date.now(),partidoActivo:null});
    setNomCom(""); setShowCrear(false);
    await reloadComs();
  }

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>Mis comunidades</div>
      {comunidades.length===0 && (
        <Card style={{textAlign:"center",padding:32}}>
          <div style={{fontSize:40,marginBottom:12}}>🏘️</div>
          <div style={{color:C.muted,fontSize:14}}>No pertenecés a ninguna comunidad todavía.</div>
          <div style={{color:C.muted,fontSize:12,marginTop:6}}>Creá una o pedile a alguien que te invite.</div>
        </Card>
      )}
      {comunidades.map(c=>(
        <div key={c.id} onClick={()=>setComActiva(c)}
          style={{display:"flex",alignItems:"center",gap:12,padding:14,borderRadius:14,background:C.card,border:`1px solid ${C.border}`,marginBottom:10,cursor:"pointer"}}>
          <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.purple},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏘️</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:15}}>{c.nombre}</div>
            <div style={{color:C.muted,fontSize:12,marginTop:2}}>{(c.miembros||[]).length} miembros</div>
          </div>
          {(c.admins||[]).includes(user.dni) && <Tag color={C.accent}>Admin</Tag>}
          <span style={{color:C.muted,fontSize:20}}>›</span>
        </div>
      ))}
      {!showCrear
        ? <Btn v="purple" onClick={()=>setShowCrear(true)} style={{display:"block",marginTop:8}}>+ Crear comunidad</Btn>
        : <Card accent={C.purple+"50"}>
            <div style={{fontWeight:800,marginBottom:12}}>🏘️ Nueva comunidad</div>
            <Lbl>Nombre</Lbl>
            <Inp value={nomCom} onChange={e=>setNomCom(e.target.value)} placeholder='Ej: Fútbol de los Lunes' onKeyDown={e=>e.key==="Enter"&&crear()} />
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <Btn v="purple" onClick={crear} style={{flex:1}}>Crear</Btn>
              <Btn v="ghost"  onClick={()=>setShowCrear(false)} style={{flex:1}}>Cancelar</Btn>
            </div>
            <Msg ok={false}>{msg}</Msg>
          </Card>
      }
    </div>
  );
}

// ── PERFIL ────────────────────────────────────────────────────────────────────
function PPerfil({ user, reloadUser, esAdminCom, comunidadActiva, S }) {
  const [nom,     setNom]     = useState(user.nombre||"");
  const [apodo,   setApodo]   = useState(user.apodo||"");
  const [foto,    setFoto]    = useState(user.foto||"");
  const [passOld, setPassOld] = useState("");
  const [passNew, setPassNew] = useState("");
  const [passNew2,setPassNew2]= useState("");
  const [msg,     setMsg]     = useState("");
  const [msgPass, setMsgPass] = useState("");
  const [load,    setLoad]    = useState(false);
  const [userData,setUserData]= useState(user);

  useEffect(()=>{
    const load = async () => {
      const s = await getDoc(rUser(user.dni));
      if (s.exists()) setUserData(s.data());
    };
    load();
  },[user.dni]);

  async function guardar() {
    setLoad(true);
    await setDoc(rUser(user.dni),{nombre:nom.trim(),apodo:apodo.trim(),foto:foto.trim()},{merge:true});
    await reloadUser();
    setLoad(false); setMsg("✓ Perfil actualizado"); setTimeout(()=>setMsg(""),2500);
  }

  async function cambiarPass() {
    if (!passOld||!passNew||!passNew2) { setMsgPass("Completá todos los campos"); return; }
    if (passNew!==passNew2) { setMsgPass("Las contraseñas no coinciden"); return; }
    if (passNew.length<4) { setMsgPass("Mínimo 4 caracteres"); return; }
    const snap = await getDoc(rUser(user.dni));
    if (snap.data().passHash!==hashPwd(passOld)) { setMsgPass("Contraseña actual incorrecta"); return; }
    await setDoc(rUser(user.dni),{passHash:hashPwd(passNew)},{merge:true});
    setPassOld(""); setPassNew(""); setPassNew2("");
    setMsgPass("✓ Contraseña cambiada"); setTimeout(()=>setMsgPass(""),2500);
  }

  const attrs = userData.atributos||{};
  const attrsAnt = userData.atributosAnteriores||{};

  const tendencia = (key) => {
    const actual = attrs[key]||0;
    const ant    = attrsAnt[key]||0;
    if (!actual && !ant) return null;
    if (actual > ant) return {icon:"↑",color:C.green};
    if (actual < ant) return {icon:"↓",color:C.red};
    return {icon:"—",color:C.muted};
  };

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>👤 Mi perfil</div>
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,padding:"12px 14px",background:"#0a1520",borderRadius:12}}>
          <Av nombre={nom||user.nombre} size={56} foto={foto} />
          <div>
            <div style={{fontWeight:800,fontSize:16}}>{nom||user.nombre}</div>
            {apodo && <div style={{color:C.accent,fontSize:13,fontWeight:600}}>"{apodo}"</div>}
            <div style={{color:C.muted,fontSize:12,marginTop:2}}>DNI: {user.dni}</div>
          </div>
        </div>
        <Lbl>Nombre</Lbl>
        <Inp value={nom} onChange={e=>setNom(e.target.value)} placeholder="Tu nombre" />
        <div style={{marginTop:10}} />
        <Lbl>Apodo (opcional)</Lbl>
        <Inp value={apodo} onChange={e=>setApodo(e.target.value)} placeholder='Ej: "El Flaco"' />
        <div style={{marginTop:10}} />
        <Lbl>URL de foto (opcional)</Lbl>
        <Inp value={foto} onChange={e=>setFoto(e.target.value)} placeholder="https://..." />
        <Btn onClick={guardar} disabled={load} style={{marginTop:12,display:"block",width:"100%"}}>{load?"Guardando...":"Guardar perfil"}</Btn>
        <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
      </Card>

      {/* Tendencia de atributos — visible para el jugador SIN números */}
      <Card>
        <div style={{fontWeight:800,marginBottom:4}}>📈 Mis atributos</div>
        <div style={{color:C.muted,fontSize:12,marginBottom:14}}>Tendencia respecto al partido anterior</div>
        {ATTRS.map(a => {
          const t = tendencia(a.key);
          return (
            <div key={a.key} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"#0a1520",borderRadius:10,marginBottom:6}}>
              <span style={{fontSize:18}}>{a.icon}</span>
              <div style={{flex:1,fontWeight:600,fontSize:14}}>{a.label}</div>
              {t ? (
                <span style={{fontSize:22,fontWeight:900,color:t.color,width:28,textAlign:"center"}}>{t.icon}</span>
              ) : (
                <span style={{fontSize:12,color:C.muted}}>Sin datos aún</span>
              )}
            </div>
          );
        })}
        <div style={{fontSize:11,color:C.muted,marginTop:8,textAlign:"center"}}>Los puntajes exactos son privados</div>
      </Card>

      {/* Puntajes visibles SOLO para admin de comunidad */}
      {esAdminCom && (
        <Card accent={C.accent+"40"}>
          <div style={{fontWeight:800,marginBottom:12}}>👑 Puntajes (Admin)</div>
          {ATTRS.map(a => (
            <div key={a.key} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"8px 12px",background:"#0a1520",borderRadius:10}}>
              <span style={{fontSize:16}}>{a.icon}</span>
              <div style={{flex:1,fontSize:13,fontWeight:600}}>{a.label}</div>
              <span style={{fontWeight:800,color:C.accent,fontSize:14}}>{(attrs[a.key]||0).toFixed(1)}</span>
            </div>
          ))}
          <div style={{marginTop:8,padding:"10px 12px",background:"#0a1520",borderRadius:10,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontWeight:700}}>📊 Promedio general</span>
            <span style={{fontWeight:900,color:C.accent,fontSize:16}}>{calcProm(attrs).toFixed(2)}</span>
          </div>
        </Card>
      )}

      <Card>
        <div style={{fontWeight:800,marginBottom:12}}>🔒 Cambiar contraseña</div>
        <Lbl>Contraseña actual</Lbl>
        <Inp type="password" value={passOld} onChange={e=>setPassOld(e.target.value)} placeholder="••••••" />
        <div style={{marginTop:10}} />
        <Lbl>Nueva contraseña</Lbl>
        <Inp type="password" value={passNew} onChange={e=>setPassNew(e.target.value)} placeholder="••••••" />
        <div style={{marginTop:10}} />
        <Lbl>Repetir nueva contraseña</Lbl>
        <Inp type="password" value={passNew2} onChange={e=>setPassNew2(e.target.value)} placeholder="••••••" />
        <Btn onClick={cambiarPass} v="ghost" style={{marginTop:12,display:"block",width:"100%"}}>Cambiar contraseña</Btn>
        <Msg ok={msgPass?.startsWith("✓")}>{msgPass}</Msg>
      </Card>

      <Card>
        <div style={{fontWeight:800,marginBottom:12}}>📊 Estadísticas</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[
            {icon:"🏟️",label:"Partidos",val:userData.partidos||0},
            {icon:"⚽",label:"Goles",val:userData.goles||0},
            {icon:"🥇",label:"MVPs",val:(userData.historial||[]).filter(h=>h.mvp).length},
          ].map(s=>(
            <div key={s.label} style={{background:"#0a1520",borderRadius:8,padding:"10px 6px",textAlign:"center"}}>
              <div style={{fontSize:16}}>{s.icon}</div>
              <div style={{fontSize:18,fontWeight:800,color:C.accent}}>{s.val}</div>
              <div style={{fontSize:10,color:C.muted}}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── COMUNIDAD ─────────────────────────────────────────────────────────────────
function PComunidad({ comunidad, user, reloadComs, S }) {
  const [dniInv,   setDniInv]   = useState("");
  const [puntajes, setPuntajes] = useState({});
  const [dniAdm,   setDniAdm]   = useState("");
  const [miembros, setMiembros] = useState([]);
  const [msgInv,   setMsgInv]   = useState("");
  const [msgAdm,   setMsgAdm]   = useState("");
  const [editPunt, setEditPunt] = useState(null);

  const esAdmin = (comunidad.admins||[]).includes(user.dni);

  useEffect(()=>{
    const load = async () => {
      const arr = [];
      for (const dni of comunidad.miembros||[]) {
        const s = await getDoc(rUser(dni));
        if (s.exists()) arr.push(s.data());
      }
      setMiembros(arr);
    };
    load();
  },[comunidad.id]);

  async function invitar() {
    const dni = dniInv.trim();
    if (!dni) return;
    const snap = await getDoc(rUser(dni));
    if (!snap.exists()) { setMsgInv("DNI no encontrado"); return; }
    if ((comunidad.miembros||[]).includes(dni)) { setMsgInv("Ya es miembro"); return; }
    // Asignar puntajes iniciales si se ingresaron
    const atrsIniciales = {};
    let tienePuntaje = false;
    ATTRS.forEach(a => {
      const v = parseFloat(puntajes[a.key]);
      if (v>0) { atrsIniciales[a.key]=v; tienePuntaje=true; }
    });
    if (tienePuntaje) {
      await setDoc(rUser(dni),{atributos:atrsIniciales,atributosAnteriores:atrsIniciales},{merge:true});
    }
    await setDoc(rCom(comunidad.id),{miembros:[...(comunidad.miembros||[]),dni]},{merge:true});
    setDniInv(""); setPuntajes({}); await reloadComs();
    setMsgInv(`✓ ${snap.data().nombre} invitado!`); setTimeout(()=>setMsgInv(""),2500);
  }

  async function guardarPuntajes(dni) {
    const atrs = {};
    ATTRS.forEach(a => { const v=parseFloat(editPunt?.puntajes?.[a.key]); if(v>0) atrs[a.key]=Math.min(10,Math.max(1,v)); });
    await setDoc(rUser(dni),{atributos:atrs,atributosAnteriores:atrs},{merge:true});
    setEditPunt(null);
    const arr=[];
    for (const d of comunidad.miembros||[]) { const s=await getDoc(rUser(d)); if(s.exists()) arr.push(s.data()); }
    setMiembros(arr);
  }

  async function darAdmin(dni) {
    if ((comunidad.admins||[]).includes(dni)) { setMsgAdm("Ya es admin"); return; }
    await setDoc(rCom(comunidad.id),{admins:[...(comunidad.admins||[]),dni]},{merge:true});
    await reloadComs(); setDniAdm(""); setMsgAdm("✓ Admin asignado"); setTimeout(()=>setMsgAdm(""),2000);
  }

  async function quitarAdmin(dni) {
    if (dni===comunidad.creadorDni) return;
    await setDoc(rCom(comunidad.id),{admins:(comunidad.admins||[]).filter(d=>d!==dni)},{merge:true});
    await reloadComs();
  }

  async function expulsar(dni) {
    if (!confirm("¿Expulsar a este miembro?")) return;
    await setDoc(rCom(comunidad.id),{miembros:(comunidad.miembros||[]).filter(d=>d!==dni),admins:(comunidad.admins||[]).filter(d=>d!==dni)},{merge:true});
    await reloadComs();
  }

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>🏘️ {comunidad.nombre}</div>
      <Card>
        <div style={{fontWeight:800,marginBottom:12}}>👥 Miembros ({miembros.length})</div>
        {miembros.map(m=>(
          <div key={m.dni}>
            <Row>
              <Av nombre={m.nombre} size={34} foto={m.foto} />
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14}}>{m.nombre}</div>
                {m.apodo && <div style={{color:C.accent,fontSize:11}}>"{m.apodo}"</div>}
              </div>
              {(comunidad.admins||[]).includes(m.dni) && <Tag color={C.accent}>Admin</Tag>}
              {m.dni===comunidad.creadorDni && <Tag color={C.purple}>Creador</Tag>}
              {esAdmin && <>
                <Btn sm v="dark" onClick={()=>setEditPunt({dni:m.dni,puntajes:{...m.atributos}})}>⚙️</Btn>
                {m.dni!==user.dni && m.dni!==comunidad.creadorDni &&
                  <button onClick={()=>expulsar(m.dni)} style={{background:C.red+"20",border:`1px solid ${C.red}40`,color:C.red,borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:700,marginLeft:4}}>✕</button>}
              </>}
            </Row>
            {/* Editor de puntajes inline */}
            {esAdmin && editPunt?.dni===m.dni && (
              <div style={{background:"#0a1520",borderRadius:12,padding:14,marginBottom:8,border:`1px solid ${C.accent}40`}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:C.accent}}>⚙️ Puntajes iniciales de {m.nombre}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {ATTRS.map(a=>(
                    <div key={a.key}>
                      <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{a.icon} {a.label}</div>
                      <input type="number" min="1" max="10" step="0.5"
                        value={editPunt.puntajes?.[a.key]||""}
                        onChange={e=>setEditPunt(p=>({...p,puntajes:{...p.puntajes,[a.key]:e.target.value}}))}
                        style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:"#131f2e",color:C.text,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}} />
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <Btn onClick={()=>guardarPuntajes(m.dni)} style={{flex:1}}>Guardar</Btn>
                  <Btn v="ghost" onClick={()=>setEditPunt(null)} style={{flex:1}}>Cancelar</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>

      {esAdmin && (
        <>
          <Card accent={C.green+"40"}>
            <div style={{fontWeight:800,marginBottom:10}}>➕ Invitar por DNI</div>
            <Lbl>DNI del jugador</Lbl>
            <Inp value={dniInv} onChange={e=>setDniInv(e.target.value)} placeholder="DNI" />
            <div style={{marginTop:10}} />
            <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:C.muted}}>Puntajes iniciales (opcional, 1-10)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              {ATTRS.map(a=>(
                <div key={a.key}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{a.icon} {a.label}</div>
                  <input type="number" min="1" max="10" step="0.5"
                    value={puntajes[a.key]||""}
                    onChange={e=>setPuntajes(p=>({...p,[a.key]:e.target.value}))}
                    style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:"#0a1520",color:C.text,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}} />
                </div>
              ))}
            </div>
            <Btn onClick={invitar} v="green" style={{display:"block",width:"100%"}}>Invitar</Btn>
            <Msg ok={msgInv?.startsWith("✓")}>{msgInv}</Msg>
          </Card>

          <Card accent={C.accent+"40"}>
            <div style={{fontWeight:800,marginBottom:10}}>👑 Dar admin</div>
            <Inp value={dniAdm} onChange={e=>setDniAdm(e.target.value)} placeholder="DNI del miembro" onKeyDown={e=>e.key==="Enter"&&darAdmin(dniAdm)} />
            <Btn onClick={()=>darAdmin(dniAdm)} style={{marginTop:8,display:"block",width:"100%"}}>Dar admin</Btn>
            {(comunidad.admins||[]).filter(d=>d!==comunidad.creadorDni).map(d=>{
              const m=miembros.find(x=>x.dni===d);
              return <div key={d} style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                <Tag color={C.accent}>{m?.nombre||d}</Tag>
                <button onClick={()=>quitarAdmin(d)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:12}}>✕ quitar</button>
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
function PPartido({ comunidad, partido, user, reloadComs, setPantalla, S }) {
  const [fecha,   setFecha]   = useState("");
  const [hora,    setHora]    = useState("");
  const [lugar,   setLugar]   = useState("");
  const [formato, setFormato] = useState("");
  const [nomInv,  setNomInv]  = useState("");
  const [msg,     setMsg]     = useState("");
  const [invMsg,  setInvMsg]  = useState("");
  const [jugData, setJugData] = useState({});

  const esAdmin  = (comunidad.admins||[]).includes(user.dni);
  const fmtObj   = FORMATOS.find(f=>f.label===partido?.formato);
  const cupo     = fmtObj?.total||0;
  const inscripos= partido?.inscriptos||[];
  const cupoLibre= cupo-inscripos.length;
  const yoAnotado= inscripos.includes(user.dni);

  useEffect(()=>{
    if(partido){setFecha(partido.fecha||"");setHora(partido.hora||"");setLugar(partido.lugar||"");setFormato(partido.formato||"");}
  },[partido?.id]);

  useEffect(()=>{
    const load=async()=>{
      if(!partido) return;
      const obj={};
      for(const id of inscripos){
        if(id.startsWith("inv_")){obj[id]=partido.invitados?.[id];continue;}
        const s=await getDoc(rUser(id));if(s.exists())obj[id]=s.data();
      }
      setJugData(obj);
    };
    if(partido) load();
  },[JSON.stringify(inscripos)]);

  async function crearPartido() {
    if(!fecha||!hora||!lugar||!formato){setMsg("Completá todos los campos");return;}
    const pid=uid();
    await setDoc(rPart(pid),{comunidadId:comunidad.id,fecha,hora,lugar,formato,inscriptos:[],invitados:{},goles:{},eventos:{},finalizado:false,equipos:null,notasAtributos:{},mvpConteo:{},votacionesAsignadas:{},creadoEn:Date.now()});
    await setDoc(rCom(comunidad.id),{partidoActivo:pid},{merge:true});
    await reloadComs();setMsg("✓ Partido creado!");setTimeout(()=>setMsg(""),2000);
  }

  async function anotarme() {
    if(cupoLibre<=0){setMsg("Partido completo");return;}
    await setDoc(rPart(partido.id),{inscriptos:[...inscripos,user.dni]},{merge:true});
  }
  async function desanotarme() {
    await setDoc(rPart(partido.id),{inscriptos:inscripos.filter(d=>d!==user.dni)},{merge:true});
  }
  async function borrarInscripto(id) {
    await setDoc(rPart(partido.id),{inscriptos:inscripos.filter(d=>d!==id)},{merge:true});
  }
  async function agregarInvitado() {
    if(!nomInv.trim()){setInvMsg("Poné un nombre");return;}
    const id=`inv_${uid()}`;
    const inv={...(partido.invitados||{}),[id]:{nombre:nomInv.trim(),esInvitado:true}};
    await setDoc(rPart(partido.id),{invitados:inv,inscriptos:[...inscripos,id]},{merge:true});
    setNomInv("");setInvMsg("✓ Invitado agregado!");setTimeout(()=>setInvMsg(""),2000);
  }
  async function actualizarEvento(id,key,delta) {
    const evs={...(partido.eventos||{})};
    if(!evs[id])evs[id]={};
    evs[id][key]=Math.max(0,(evs[id][key]||0)+delta);
    await setDoc(rPart(partido.id),{eventos:evs},{merge:true});
  }
  async function finalizarPartido() {
    if(inscripos.length<2){setMsg("Necesitás al menos 2 jugadores");return;}
    // Asignar votaciones aleatorias al finalizar
    const asignaciones=asignarVotaciones(inscripos);
    await setDoc(rPart(partido.id),{finalizado:true,fechaFin:new Date().toLocaleString("es-AR"),votacionesAsignadas:asignaciones},{merge:true});
    setPantalla("votar");
  }
  async function borrarPartido() {
    if(!confirm("¿Borrar el partido actual?")) return;
    if(partido) await deleteDoc(rPart(partido.id));
    await setDoc(rCom(comunidad.id),{partidoActivo:null},{merge:true});
    await reloadComs();
  }

  if(!partido) return (
    <div style={S.sec}>
      <div style={S.sTitle}>📋 Partido</div>
      {!esAdmin
        ? <Card style={{textAlign:"center",padding:32}}><div style={{fontSize:40,marginBottom:12}}>🗓️</div><div style={{color:C.muted}}>No hay partido creado aún.</div></Card>
        : <Card accent={C.purple+"40"}>
            <div style={{fontWeight:800,marginBottom:14}}>🗓️ Crear partido</div>
            <Lbl>Fecha</Lbl><Inp type="date" value={fecha} onChange={e=>setFecha(e.target.value)} />
            <div style={{marginTop:10}}/><Lbl>Hora</Lbl><Inp type="time" value={hora} onChange={e=>setHora(e.target.value)} />
            <div style={{marginTop:10}}/><Lbl>Lugar</Lbl><Inp value={lugar} onChange={e=>setLugar(e.target.value)} placeholder="Cancha..." />
            <div style={{marginTop:10}}/><Lbl>Formato</Lbl>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>
              {FORMATOS.map(f=><button key={f.label} onClick={()=>setFormato(f.label)} style={{padding:"7px 12px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:formato===f.label?C.accent:"#1c2433",color:formato===f.label?"#0d1117":C.muted,fontFamily:"inherit"}}>{f.label}</button>)}
            </div>
            <Btn onClick={crearPartido} v="purple" style={{marginTop:12,display:"block",width:"100%"}}>Crear partido</Btn>
            <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
          </Card>
      }
    </div>
  );

  if(partido.finalizado) return (
    <div style={S.sec}>
      <div style={S.sTitle}>📋 Partido</div>
      <Card style={{textAlign:"center"}} accent={C.green+"40"}>
        <div style={{fontSize:48,marginBottom:8}}>🏁</div>
        <div style={{fontWeight:800,fontSize:16,color:C.green}}>Partido finalizado</div>
        <div style={{color:C.muted,fontSize:13,marginTop:6}}>{partido.fechaFin}</div>
        <Btn onClick={()=>setPantalla("votar")} v="green" style={{marginTop:12,display:"block",width:"100%"}}>Ir a votar</Btn>
        {esAdmin && <Btn onClick={borrarPartido} v="danger" style={{marginTop:8,display:"block",width:"100%"}}>🗑️ Borrar partido</Btn>}
      </Card>
    </div>
  );

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>📋 Partido</div>
      <Card accent={C.accent+"30"}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          {[{icon:"📆",v:partido.fecha},{icon:"🕐",v:partido.hora},{icon:"📍",v:partido.lugar},{icon:"👥",v:partido.formato}].map((r,i)=>(
            <div key={i} style={{background:"#0a1520",borderRadius:8,padding:"8px 10px",fontSize:13,fontWeight:600}}>{r.icon} {r.v||"—"}</div>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:13,fontWeight:700,color:cupoLibre>0?C.green:C.red}}>{cupoLibre>0?`✅ ${cupoLibre} lugares`:"🚫 Completo"}</span>
          <span style={{fontSize:12,color:C.muted}}>{inscripos.length}/{cupo}</span>
        </div>
      </Card>

      <Card>
        {yoAnotado
          ? <><div style={{color:C.green,fontWeight:700,marginBottom:8}}>✅ Estás anotado</div><Btn v="ghost" onClick={desanotarme} style={{display:"block",width:"100%"}}>Desanotarme</Btn></>
          : <Btn onClick={anotarme} disabled={cupoLibre<=0} style={{display:"block",width:"100%"}}>{cupoLibre>0?"📝 Anotarme":"🚫 Sin lugares"}</Btn>}
        <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
      </Card>

      <Card>
        <div style={{fontWeight:800,marginBottom:12}}>👥 Inscriptos ({inscripos.length}/{cupo})</div>
        {inscripos.length===0
          ? <div style={{color:C.muted,textAlign:"center",padding:16}}>Nadie anotado aún</div>
          : inscripos.map((id,idx)=>{
              const j=jugData[id]; if(!j) return null;
              return (
                <Row key={id}>
                  <div style={{width:22,textAlign:"center",color:C.muted,fontWeight:700,fontSize:13}}>#{idx+1}</div>
                  <Av nombre={j.nombre} size={32} foto={j.foto} />
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13}}>{j.nombre}</div>
                    {j.apodo && <div style={{color:C.accent,fontSize:11}}>"{j.apodo}"</div>}
                    {j.esInvitado && <Tag color={C.purple}>Invitado</Tag>}
                  </div>
                  {esAdmin && <button onClick={()=>borrarInscripto(id)} style={{background:C.red+"20",border:`1px solid ${C.red}40`,color:C.red,borderRadius:7,padding:"3px 8px",cursor:"pointer",fontSize:11,fontWeight:700}}>✕</button>}
                </Row>
              );
            })
        }
      </Card>

      {esAdmin && (
        <>
          <Card accent={C.purple+"30"}>
            <div style={{fontWeight:800,marginBottom:8}}>👤 Agregar invitado</div>
            <Inp value={nomInv} onChange={e=>setNomInv(e.target.value)} placeholder='Ej: "Amigo de Juan"' onKeyDown={e=>e.key==="Enter"&&agregarInvitado()} />
            <Btn onClick={agregarInvitado} v="ghost" style={{marginTop:8,display:"block",width:"100%"}}>+ Agregar</Btn>
            <Msg ok={invMsg?.startsWith("✓")}>{invMsg}</Msg>
          </Card>

          {inscripos.length>0 && (
            <Card accent={C.blue+"40"}>
              <div style={{fontWeight:800,marginBottom:4}}>📝 Eventos del partido</div>
              <div style={{color:C.muted,fontSize:12,marginBottom:12}}>Cargá los eventos de cada jugador en tiempo real</div>
              {inscripos.map(id=>{
                const j=jugData[id]; if(!j) return null;
                const evs=(partido.eventos||{})[id]||{};
                return (
                  <div key={id} style={{marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <Av nombre={j.nombre} size={28} foto={j.foto} />
                      <div style={{fontWeight:700,fontSize:13}}>{j.nombre}</div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                      {EVENTOS.map(ev=>(
                        <div key={ev.key} style={{background:"#0a1520",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                          <div style={{fontSize:12,color:C.muted,marginBottom:4}}>{ev.icon} {ev.label}</div>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                            <button onClick={()=>actualizarEvento(id,ev.key,-1)} style={{width:24,height:24,borderRadius:6,border:"none",background:"#1c2433",color:C.muted,cursor:"pointer",fontWeight:700,fontSize:14}}>−</button>
                            <span style={{fontWeight:800,fontSize:14,color:C.accent,minWidth:16,textAlign:"center"}}>{evs[ev.key]||0}</span>
                            <button onClick={()=>actualizarEvento(id,ev.key,1)} style={{width:24,height:24,borderRadius:6,border:"none",background:C.green,color:"#0d1117",cursor:"pointer",fontWeight:700,fontSize:14}}>+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          <Btn onClick={finalizarPartido} v="danger" style={{display:"block",width:"100%"}}>🏁 Finalizar partido y abrir votaciones</Btn>
          <Btn onClick={borrarPartido} v="ghost" style={{display:"block",width:"100%",marginTop:8}}>🗑️ Borrar partido</Btn>
        </>
      )}
    </div>
  );
}

// ── EQUIPOS ───────────────────────────────────────────────────────────────────
function PEquipos({ comunidad, partido, user, S }) {
  const [jugData,   setJugData]   = useState({});
  const [eqOscuro,  setEqOscuro]  = useState([]);
  const [eqBlanco,  setEqBlanco]  = useState([]);
  const [generado,  setGenerado]  = useState(false);
  const [publicado, setPublicado] = useState(false);
  const [msg,       setMsg]       = useState("");

  const esAdmin   = (comunidad.admins||[]).includes(user.dni);
  const inscripos = partido?.inscriptos||[];

  useEffect(()=>{
    if(partido?.equipos){setEqOscuro(partido.equipos.oscuro||[]);setEqBlanco(partido.equipos.blanco||[]);setPublicado(partido.equipos.publicado||false);setGenerado(true);}
  },[partido?.id]);

  useEffect(()=>{
    const load=async()=>{
      if(!partido) return;
      const obj={};
      for(const id of inscripos){
        if(id.startsWith("inv_")){obj[id]={...partido.invitados?.[id],atributos:{}};continue;}
        const s=await getDoc(rUser(id));if(s.exists())obj[id]=s.data();
      }
      setJugData(obj);
    };
    if(partido) load();
  },[JSON.stringify(inscripos)]);

  function generar() {
    const lista=inscripos.map(id=>({id,...(jugData[id]||{nombre:"?"})})).filter(j=>j.nombre!=="?");
    const {oscuro,blanco}=balancear(lista);
    setEqOscuro(oscuro.map(j=>j.id));setEqBlanco(blanco.map(j=>j.id));setGenerado(true);setPublicado(false);
  }

  function mover(id,from) {
    if(from==="oscuro"){setEqOscuro(p=>p.filter(x=>x!==id));setEqBlanco(p=>[...p,id]);}
    else{setEqBlanco(p=>p.filter(x=>x!==id));setEqOscuro(p=>[...p,id]);}
  }

  async function publicar() {
    await setDoc(rPart(partido.id),{equipos:{oscuro:eqOscuro,blanco:eqBlanco,publicado:true}},{merge:true});
    setPublicado(true);setMsg("✓ Equipos publicados!");setTimeout(()=>setMsg(""),2000);
  }

  const sumaEq=(ids)=>ids.map(id=>jugData[id]).filter(Boolean).reduce((s,j)=>s+calcProm(j.atributos||{}),0);

  const renderEq=(ids,nombre,color)=>{
    const jug=ids.map(id=>({id,...(jugData[id]||{})})).filter(j=>j.nombre);
    const suma_=sumaEq(ids);
    return (
      <div style={{flex:1,background:`linear-gradient(135deg,${color}18,${C.card})`,border:`1px solid ${color}40`,borderRadius:16,padding:14}}>
        <div style={{color,fontWeight:800,fontSize:15,marginBottom:2}}>{nombre==="oscuro"?"🖤 Oscuro":"🤍 Blanco"}</div>
        <div style={{color:C.muted,fontSize:11,marginBottom:2}}>Total: <span style={{color,fontWeight:800,fontSize:14}}>{suma_.toFixed(1)}</span></div>
        <div style={{color:C.muted,fontSize:11,marginBottom:10}}>Prom: {jug.length>0?(suma_/jug.length).toFixed(1):"—"}</div>
        {jug.map(j=>(
          <div key={j.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"#0a1520",borderRadius:10,marginBottom:6}}>
            <Av nombre={j.nombre||"?"} size={26} foto={j.foto} />
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:12}}>{j.nombre||"?"}</div>
              <div style={{fontSize:10,color:C.muted}}>{calcProm(j.atributos||{}).toFixed(1)}</div>
            </div>
            {esAdmin && !publicado && (
              <button onClick={()=>mover(j.id,nombre)} style={{background:color+"25",border:`1px solid ${color}50`,color,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                →{nombre==="oscuro"?"B":"O"}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  if(!partido) return <div style={S.sec}><Card style={{textAlign:"center",color:C.muted,padding:32}}>No hay partido activo.</Card></div>;

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>⚖️ Equipos</div>
      {!generado && (
        <Card style={{textAlign:"center",padding:24}}>
          <div style={{fontSize:36,marginBottom:12}}>⚖️</div>
          <div style={{color:C.muted,fontSize:14,marginBottom:16}}>
            {esAdmin?"Generá los equipos balanceados por atributos. Luego podés modificarlos antes de publicar.":"El admin aún no generó los equipos."}
          </div>
          {esAdmin && inscripos.length>=2 && <Btn onClick={generar} style={{display:"inline-block",width:"auto"}}>⚖️ Generar equipos</Btn>}
        </Card>
      )}
      {generado && (
        <>
          {!publicado && esAdmin && <Card style={{background:"#0f1e10",border:`1px solid ${C.green}40`}}><div style={{fontSize:12,color:C.green}}>🔒 Solo vos podés ver esto. Publicá cuando estés listo.</div></Card>}
          {publicado && <Card style={{background:"#1a150a",border:`1px solid ${C.accent}40`}}><div style={{fontSize:12,color:C.accent}}>✅ Equipos publicados</div></Card>}
          {(publicado||esAdmin) && <div style={{display:"flex",gap:10,marginBottom:12}}>{renderEq(eqOscuro,"oscuro","#888")}{renderEq(eqBlanco,"blanco","#ccc")}</div>}
          {!publicado && esAdmin && <><Btn onClick={generar} v="ghost" style={{display:"block",width:"100%",marginBottom:8}}>🔄 Re-generar</Btn><Btn onClick={publicar} v="green" style={{display:"block",width:"100%"}}>✅ Publicar equipos</Btn></>}
          {publicado && esAdmin && <Btn onClick={()=>{setPublicado(false);setGenerado(false);}} v="ghost" style={{display:"block",width:"100%"}}>🔄 Re-hacer</Btn>}
          {!publicado && !esAdmin && <Card style={{textAlign:"center",color:C.muted,padding:24}}>⏳ El admin está preparando los equipos...</Card>}
          <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
        </>
      )}
    </div>
  );
}

// ── VOTAR ─────────────────────────────────────────────────────────────────────
function PVotar({ comunidad, partido, user, S }) {
  const [dniInput,  setDniInput]  = useState("");
  const [passInput, setPassInput] = useState("");
  const [votante,   setVotante]   = useState(null);
  const [asignados, setAsignados] = useState([]); // IDs a votar
  const [notasMap,  setNotasMap]  = useState({}); // { dni: { velocidad: 7, ... } }
  const [mvp,       setMvp]       = useState(null);
  const [votosSnap, setVotosSnap] = useState({});
  const [jugData,   setJugData]   = useState({});
  const [msg,       setMsg]       = useState("");
  const [busMsg,    setBusMsg]    = useState("");
  const [paso,      setPaso]      = useState(0); // índice del compañero actual

  useEffect(()=>{
    if(!partido) return;
    const unsub=onSnapshot(rVotos(partido.id),s=>setVotosSnap(s.exists()?s.data():{}));
    return unsub;
  },[partido?.id]);

  useEffect(()=>{
    const load=async()=>{
      if(!partido) return;
      const obj={};
      for(const id of partido.inscriptos||[]){
        if(id.startsWith("inv_")){obj[id]=partido.invitados?.[id]||{nombre:"Invitado"};continue;}
        const s=await getDoc(rUser(id));if(s.exists())obj[id]=s.data();
      }
      setJugData(obj);
    };
    load();
  },[partido?.id]);

  if(!partido?.finalizado) return (
    <div style={S.sec}>
      <Card style={{textAlign:"center",padding:32}}>
        <div style={{fontSize:40,marginBottom:12}}>⏳</div>
        <div style={{color:C.muted}}>Las votaciones abren cuando el admin finalice el partido.</div>
      </Card>
    </div>
  );

  const jugadores  = (partido.inscriptos||[]).filter(id=>!id.startsWith("inv_"));
  const yaVotaron  = Object.keys(votosSnap);
  const todosVotaron = yaVotaron.length>=jugadores.length && jugadores.length>0;

  async function buscar() {
    if(!dniInput||!passInput){setBusMsg("Completá DNI y contraseña");return;}
    const s=await getDoc(rUser(dniInput.trim()));
    if(!s.exists()){setBusMsg("DNI no encontrado");return;}
    if(s.data().passHash!==hashPwd(passInput)){setBusMsg("Contraseña incorrecta");return;}
    if(!jugadores.includes(dniInput.trim())){setBusMsg("No participaste en este partido");return;}
    if(yaVotaron.includes(dniInput.trim())){setBusMsg("Ya votaste ✓");return;}
    const mis_asignados=(partido.votacionesAsignadas||{})[dniInput.trim()]||[];
    if(mis_asignados.length===0){setBusMsg("No tenés compañeros asignados");return;}
    setVotante(s.data());
    setAsignados(mis_asignados);
    const init={};
    mis_asignados.forEach(id=>{init[id]={};ATTRS.forEach(a=>{init[id][a.key]=0;});});
    setNotasMap(init);
    setPaso(0);setBusMsg("");
  }

  async function enviar() {
    // Validar que todos los atributos de todos los asignados estén puntuados
    for(const id of asignados){
      for(const a of ATTRS){
        if(!notasMap[id]?.[a.key]){setMsg(`⚠️ Falta puntuar ${a.label} de ${jugData[id]?.nombre||id}`);return;}
      }
    }
    if(!mvp){setMsg("⚠️ Elegí el MVP");return;}

    // Marcar como votado (anónimo)
    await setDoc(rVotos(partido.id),{[votante.dni]:true},{merge:true});

    // Acumular notas de atributos en el partido
    const notasAc={...(partido.notasAtributos||{})};
    asignados.forEach(id=>{
      if(!notasAc[id])notasAc[id]={};
      ATTRS.forEach(a=>{
        if(!notasAc[id][a.key])notasAc[id][a.key]={suma:0,cant:0};
        notasAc[id][a.key].suma+=notasMap[id][a.key];
        notasAc[id][a.key].cant+=1;
      });
    });
    const mvpC={...(partido.mvpConteo||{}),[mvp]:((partido.mvpConteo||{})[mvp]||0)+1};
    await setDoc(rPart(partido.id),{notasAtributos:notasAc,mvpConteo:mvpC},{merge:true});

    setVotante(null);setDniInput("");setPassInput("");setMvp(null);setNotasMap({});
    setMsg("✓ Votos enviados (anónimos)!");setTimeout(()=>setMsg(""),3000);
  }

  async function cerrar() {
    const notasAc=partido.notasAtributos||{};
    const mvpC=partido.mvpConteo||{};
    const mvpId=Object.keys(mvpC).length?Object.keys(mvpC).reduce((a,b)=>mvpC[a]>mvpC[b]?a:b):null;

    for(const id of jugadores){
      const s=await getDoc(rUser(id));if(!s.exists())continue;
      const j=s.data();
      const attrsAnteriores={...j.atributos||{}};
      const nuevosAttrs={...j.atributos||{}};
      ATTRS.forEach(a=>{
        const n=notasAc[id]?.[a.key];
        if(n&&n.cant>0){
          const prom=n.suma/n.cant;
          const actual=nuevosAttrs[a.key]||0;
          // Nuevo valor = promedio ponderado entre actual y lo votado
          nuevosAttrs[a.key]=Math.min(10,Math.max(1,+(actual*0.7+prom*0.3).toFixed(2)));
        }
      });
      const evs=(partido.eventos||{})[id]||{};
      await setDoc(rUser(id),{
        atributos:nuevosAttrs, atributosAnteriores:attrsAnteriores,
        goles:j.goles+(evs.goles||0), partidos:(j.partidos||0)+1,
        historial:[...(j.historial||[]),{fecha:new Date().toLocaleDateString("es-AR"),mvp:id===mvpId,eventos:evs}]
      },{merge:true});
    }

    // Guardar historial del partido en la comunidad
    const partData={
      fecha:partido.fechaFin, lugar:partido.lugar, formato:partido.formato,
      equipos:partido.equipos||null, eventos:partido.eventos||{},
      mvp:mvpId, jugadores:jugadores,
      invitados:partido.invitados||{}
    };
    const comSnap=await getDoc(rCom(comunidad.id));
    const historial=[...(comSnap.data()?.historialPartidos||[]),partData];
    await setDoc(rCom(comunidad.id),{historialPartidos:historial,partidoActivo:null},{merge:true});
    await deleteDoc(rPart(partido.id));

    setMsg("✓ ¡Resultados guardados!");setTimeout(()=>setMsg(""),3000);
  }

  const compActual = asignados[paso];
  const jugActual  = jugActual_ => jugData[jugActual_];

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>🗳️ Votaciones</div>
      <Card accent={C.green+"40"}>
        <div style={{fontSize:13,color:C.green,fontWeight:700}}>🔒 Votaciones 100% anónimas</div>
        <div style={{color:C.muted,fontSize:12,marginTop:4}}>Votaron {yaVotaron.length} de {jugadores.length}</div>
        <div style={{marginTop:8,height:4,background:C.border,borderRadius:4}}>
          <div style={{width:`${(yaVotaron.length/Math.max(jugadores.length,1))*100}%`,height:"100%",background:C.green,borderRadius:4,transition:"width .4s"}} />
        </div>
      </Card>

      {!votante ? (
        <Card>
          <div style={{fontWeight:700,marginBottom:12}}>Ingresá para votar</div>
          <Lbl>Tu DNI</Lbl>
          <Inp value={dniInput} onChange={e=>setDniInput(e.target.value)} placeholder="DNI" />
          <div style={{marginTop:10}} />
          <Lbl>Tu contraseña</Lbl>
          <Inp type="password" value={passInput} onChange={e=>setPassInput(e.target.value)} placeholder="••••••" onKeyDown={e=>e.key==="Enter"&&buscar()} />
          <Btn onClick={buscar} style={{marginTop:10,display:"block",width:"100%"}}>Ingresar para votar</Btn>
          <Msg ok={false}>{busMsg}</Msg>
          <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
        </Card>
      ) : (
        <Card>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 12px",background:"#0a1520",borderRadius:10}}>
            <Av nombre={votante.nombre} size={34} foto={votante.foto} />
            <div>
              <div style={{fontWeight:800}}>{votante.nombre}</div>
              <div style={{color:C.muted,fontSize:12}}>Tus votos son anónimos ✓</div>
            </div>
          </div>

          {/* Indicador de progreso */}
          <div style={{display:"flex",gap:6,marginBottom:16}}>
            {asignados.map((id,i)=>(
              <div key={id} onClick={()=>setPaso(i)} style={{flex:1,height:6,borderRadius:4,background:i<=paso?C.accent:C.border,cursor:"pointer",transition:"background .2s"}} />
            ))}
          </div>
          <div style={{color:C.muted,fontSize:12,marginBottom:12,textAlign:"center"}}>Compañero {paso+1} de {asignados.length}</div>

          {compActual && jugData[compActual] && (
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"12px 14px",background:`linear-gradient(135deg,${C.purple}20,#0a1520)`,borderRadius:12,border:`1px solid ${C.purple}40`}}>
                <Av nombre={jugData[compActual].nombre} size={44} foto={jugData[compActual].foto} />
                <div>
                  <div style={{fontWeight:800,fontSize:16}}>{jugData[compActual].nombre}</div>
                  {jugData[compActual].apodo && <div style={{color:C.accent,fontSize:12}}>"{jugData[compActual].apodo}"</div>}
                  <div style={{color:C.muted,fontSize:12}}>¿Cómo jugó hoy?</div>
                </div>
              </div>

              <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:C.accent}}>Puntuá del 1 al 10 cada atributo</div>
              {ATTRS.map(a=>{
                const nota=notasMap[compActual]?.[a.key]||0;
                return (
                  <div key={a.key} style={{marginBottom:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span style={{fontSize:18}}>{a.icon}</span>
                      <div style={{flex:1,fontWeight:700,fontSize:14}}>{a.label}</div>
                      <span style={{color:C.accent,fontWeight:800,minWidth:30,textAlign:"right"}}>{nota||"—"}/10</span>
                    </div>
                    <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n=>(
                        <button key={n} onClick={()=>setNotasMap(p=>({...p,[compActual]:{...p[compActual],[a.key]:n}}))}
                          style={{width:28,height:28,borderRadius:6,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:n<=nota?C.accent:"#1c2433",color:n<=nota?"#0d1117":C.muted}}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div style={{display:"flex",gap:8,marginTop:16}}>
                {paso>0 && <Btn v="ghost" onClick={()=>setPaso(p=>p-1)} style={{flex:1}}>← Anterior</Btn>}
                {paso<asignados.length-1
                  ? <Btn onClick={()=>setPaso(p=>p+1)} style={{flex:1}}>Siguiente →</Btn>
                  : null
                }
              </div>
            </div>
          )}

          {/* MVP — solo aparece cuando puntuaste todos */}
          {paso===asignados.length-1 && (
            <>
              <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:C.accent}}>🥇 MVP del partido (de todos los inscriptos)</div>
                {(partido.inscriptos||[]).filter(id=>id!==votante.dni).map(id=>{
                  const j=jugData[id];if(!j)return null;
                  return (
                    <div key={id} onClick={()=>setMvp(id)}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,cursor:"pointer",marginBottom:6,border:`1px solid ${mvp===id?C.accent:C.border}`,background:mvp===id?"#1a150a":"#0a1520"}}>
                      <Av nombre={j.nombre} size={28} foto={j.foto} />
                      <div style={{flex:1,fontWeight:600,fontSize:13}}>{j.nombre}</div>
                      {mvp===id && <span style={{color:C.accent,fontSize:18}}>⭐</span>}
                    </div>
                  );
                })}
              </div>
              <Btn onClick={enviar} v="green" style={{marginTop:12,display:"block",width:"100%"}}>✅ Enviar todos mis votos</Btn>
              <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
            </>
          )}
        </Card>
      )}

      {todosVotaron && (
        <Btn onClick={cerrar} v="primary" style={{display:"block",width:"100%",marginTop:8}}>🏆 Cerrar votación y guardar resultados</Btn>
      )}
    </div>
  );
}

// ── HISTORIAL ─────────────────────────────────────────────────────────────────
function PHistorial({ comunidad, S }) {
  const [historial, setHistorial] = useState([]);
  const [jugData,   setJugData]   = useState({});
  const [expandido, setExpandido] = useState(null);

  useEffect(()=>{
    const load=async()=>{
      const s=await getDoc(rCom(comunidad.id));
      if(!s.exists()) return;
      const hist=[...(s.data().historialPartidos||[])].reverse();
      setHistorial(hist);
      const dnis=new Set();
      hist.forEach(p=>{(p.jugadores||[]).forEach(d=>dnis.add(d));});
      const obj={};
      for(const d of dnis){const s2=await getDoc(rUser(d));if(s2.exists())obj[d]=s2.data();}
      setJugData(obj);
    };
    load();
  },[comunidad.id]);

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>📜 Historial de partidos</div>
      {historial.length===0 && <Card style={{textAlign:"center",padding:32}}><div style={{fontSize:40,marginBottom:12}}>📜</div><div style={{color:C.muted}}>Todavía no hay partidos finalizados.</div></Card>}
      {historial.map((p,i)=>(
        <Card key={i} accent={expandido===i?C.accent+"40":undefined}>
          <div onClick={()=>setExpandido(expandido===i?null:i)} style={{cursor:"pointer"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:15}}>{p.fecha||"Sin fecha"}</div>
                <div style={{color:C.muted,fontSize:12,marginTop:2}}>📍 {p.lugar||"—"} · 👥 {p.formato||"—"}</div>
              </div>
              {p.mvp && jugData[p.mvp] && <Tag color={C.accent}>🥇 {jugData[p.mvp].nombre?.split(" ")[0]}</Tag>}
              <span style={{color:C.muted,fontSize:18}}>{expandido===i?"∧":"∨"}</span>
            </div>
          </div>

          {expandido===i && (
            <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
              {/* Equipos */}
              {p.equipos && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  {[{label:"🖤 Oscuro",ids:p.equipos.oscuro||[],color:"#888"},{label:"🤍 Blanco",ids:p.equipos.blanco||[],color:"#ccc"}].map(eq=>(
                    <div key={eq.label} style={{background:`linear-gradient(135deg,${eq.color}15,#0a1520)`,border:`1px solid ${eq.color}30`,borderRadius:12,padding:10}}>
                      <div style={{color:eq.color,fontWeight:800,fontSize:13,marginBottom:8}}>{eq.label}</div>
                      {eq.ids.map(id=>{
                        const j=jugData[id]||p.invitados?.[id];if(!j)return null;
                        const evs=(p.eventos||{})[id]||{};
                        return (
                          <div key={id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                            <Av nombre={j.nombre} size={22} foto={j.foto} />
                            <div style={{flex:1,fontSize:12,fontWeight:600}}>{j.nombre}</div>
                            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                              {EVENTOS.filter(e=>evs[e.key]>0).map(e=>(
                                <span key={e.key} style={{fontSize:10,background:C.card,borderRadius:4,padding:"1px 5px"}}>{e.icon}{evs[e.key]}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Eventos de jugadores sin equipo */}
              {!p.equipos && p.eventos && (
                <div style={{marginBottom:14}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:C.muted}}>Eventos</div>
                  {(p.jugadores||[]).map(id=>{
                    const j=jugData[id];if(!j)return null;
                    const evs=(p.eventos||{})[id]||{};
                    const tieneEvs=EVENTOS.some(e=>evs[e.key]>0);
                    if(!tieneEvs)return null;
                    return (
                      <div key={id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <Av nombre={j.nombre} size={26} foto={j.foto} />
                        <div style={{flex:1,fontSize:12,fontWeight:600}}>{j.nombre}</div>
                        <div style={{display:"flex",gap:4}}>
                          {EVENTOS.filter(e=>evs[e.key]>0).map(e=>(
                            <span key={e.key} style={{fontSize:11,background:C.card,borderRadius:5,padding:"2px 6px"}}>{e.icon}{evs[e.key]}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {p.mvp && jugData[p.mvp] && (
                <div style={{padding:"8px 12px",background:"#1a150a",border:`1px solid ${C.accent}40`,borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>🥇</span>
                  <span style={{fontWeight:700,fontSize:13}}>MVP: {jugData[p.mvp].nombre}</span>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function PStats({ comunidad, user, esAdmin, S }) {
  const [jugadores, setJugadores] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(()=>{
    const load=async()=>{
      const arr=[];
      for(const dni of comunidad.miembros||[]){
        const s=await getDoc(rUser(dni));if(s.exists())arr.push(s.data());
      }
      // Ordenar por cantidad de partidos (más activos primero), sin mostrar puntaje
      arr.sort((a,b)=>(b.partidos||0)-(a.partidos||0));
      setJugadores(arr);setLoading(false);
    };
    load();
  },[comunidad.id]);

  if(loading) return <div style={S.sec}><Spinner /></div>;

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>📊 Estadísticas</div>
      {jugadores.map((j,i)=>(
        <Card key={j.dni}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:900,color:i<3?C.accent:C.muted,width:24,textAlign:"center"}}>#{i+1}</div>
            <Av nombre={j.nombre} size={40} foto={j.foto} />
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:15}}>{j.nombre}</div>
              {j.apodo && <div style={{color:C.accent,fontSize:12}}>"{j.apodo}"</div>}
            </div>
          </div>

          {/* Stats públicas — SIN puntajes */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:10}}>
            {[
              {icon:"🏟️",label:"Partidos",val:j.partidos||0},
              {icon:"⚽",label:"Goles",   val:(j.historial||[]).reduce((s,h)=>s+(h.eventos?.goles||0),0)},
              {icon:"🥇",label:"MVPs",    val:(j.historial||[]).filter(h=>h.mvp).length},
            ].map(s=>(
              <div key={s.label} style={{background:"#0a1520",borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                <div style={{fontSize:14}}>{s.icon}</div>
                <div style={{fontSize:16,fontWeight:800,color:C.accent}}>{s.val}</div>
                <div style={{fontSize:10,color:C.muted}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Eventos acumulados */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
            {EVENTOS.filter(e=>e.key!=="goles").map(e=>{
              const total=(j.historial||[]).reduce((s,h)=>s+(h.eventos?.[e.key]||0),0);
              if(total===0) return null;
              return <span key={e.key} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"3px 8px",fontSize:12}}>{e.icon}{total} {e.label}</span>;
            })}
          </div>

          {/* Admin ve los puntajes de atributos */}
          {esAdmin && (
            <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
              <div style={{fontSize:11,color:C.accent,fontWeight:700,marginBottom:8}}>👑 Puntajes (Admin)</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {ATTRS.map(a=>(
                  <div key={a.key} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",background:"#0a1520",borderRadius:8}}>
                    <span style={{fontSize:14}}>{a.icon}</span>
                    <span style={{flex:1,fontSize:11,color:C.muted}}>{a.label}</span>
                    <span style={{fontWeight:800,color:C.accent,fontSize:13}}>{((j.atributos||{})[a.key]||0).toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <div style={{marginTop:6,padding:"6px 10px",background:"#0a1520",borderRadius:8,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,fontWeight:700}}>📊 Promedio</span>
                <span style={{fontWeight:900,color:C.accent,fontSize:14}}>{calcProm(j.atributos||{}).toFixed(2)}</span>
              </div>
            </div>
          )}

          {(j.historial||[]).length>0 && (
            <div style={{marginTop:10}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:6}}>ÚLTIMOS PARTIDOS</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {j.historial.slice(-5).map((h,idx)=>(
                  <div key={idx} style={{background:"#0a1520",borderRadius:7,padding:"3px 8px",fontSize:11,border:`1px solid ${C.border}`}}>
                    <span style={{color:C.muted}}>⚽{h.eventos?.goles||0}</span>
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

  useEffect(()=>{
    const load=async()=>{
      const snap=await getDocs(collection(db,"app8_users"));
      const arr=[];snap.forEach(d=>arr.push({id:d.id,...d.data()}));
      arr.sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||""));
      setUsuarios(arr);setLoading(false);
    };
    load();
  },[]);

  async function guardar() {
    await setDoc(rUser(editando.dni),{nombre:nom.trim(),apodo:apodo.trim()},{merge:true});
    setUsuarios(p=>p.map(u=>u.dni===editando.dni?{...u,nombre:nom.trim(),apodo:apodo.trim()}:u));
    setEditando(null);setMsg("✓ Guardado");setTimeout(()=>setMsg(""),2000);
  }

  if(loading) return <div style={S.sec}><Spinner /></div>;

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>🔑 Super Admin — {usuarios.length} usuarios</div>
      <Msg ok={true}>{msg}</Msg>
      {usuarios.map(u=>(
        <Card key={u.dni}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Av nombre={u.nombre||"?"} size={36} foto={u.foto} />
            <div style={{flex:1}}>
              <div style={{fontWeight:800}}>{u.nombre}</div>
              {u.apodo && <div style={{color:C.accent,fontSize:12}}>"{u.apodo}"</div>}
              <div style={{color:C.muted,fontSize:11}}>DNI: {u.dni} · {u.partidos||0} partidos</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:800,color:C.accent,fontSize:14}}>{calcProm(u.atributos||{}).toFixed(1)}</div>
              <div style={{fontSize:10,color:C.muted}}>prom</div>
            </div>
            <Btn sm v="ghost" onClick={()=>{setEditando(u);setNom(u.nombre||"");setApodo(u.apodo||"");}}>✏️</Btn>
          </div>
          {editando?.dni===u.dni && (
            <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
              <Lbl>Nombre</Lbl>
              <Inp value={nom} onChange={e=>setNom(e.target.value)} placeholder="Nombre" />
              <div style={{marginTop:8}} />
              <Lbl>Apodo</Lbl>
              <Inp value={apodo} onChange={e=>setApodo(e.target.value)} placeholder="Apodo" />
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <Btn onClick={guardar} style={{flex:1}}>Guardar</Btn>
                <Btn v="ghost" onClick={()=>setEditando(null)} style={{flex:1}}>Cancelar</Btn>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
