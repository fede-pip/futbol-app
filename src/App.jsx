import { useState, useEffect, useRef } from 'react';
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
  { key:"velocidad",   label:"Velocidad",   icon:"⚡" },
  { key:"pases",       label:"Pases",        icon:"🎯" },
  { key:"definicion",  label:"Definición",   icon:"🥅" },
  { key:"amagues",     label:"Amagues",      icon:"🕺" },
  { key:"defensa",     label:"Defensa",      icon:"🛡️" },
  { key:"resistencia", label:"Resistencia",  icon:"💪" },
  { key:"arquero",     label:"Arquero",      icon:"🧤" },
];

const FORMATOS = [
  {label:"5 vs 5",total:10},{label:"6 vs 6",total:12},{label:"7 vs 7",total:14},
  {label:"8 vs 8",total:16},{label:"9 vs 9",total:18},{label:"10 vs 10",total:20},{label:"11 vs 11",total:22}
];

// ── helpers ──────────────────────────────────────────────────────────────────
function hashPwd(p) {
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (Math.imul(31,h)+p.charCodeAt(i))|0;
  return h.toString(36);
}
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function calcProm(attrs) {
  if (!attrs) return 0;
  const v = ATTRS.map(a=>attrs[a.key]||0).filter(x=>x>0);
  return v.length ? +(v.reduce((s,x)=>s+x,0)/v.length).toFixed(2) : 0;
}
function balancear(lista) {
  const s = [...lista].sort((a,b)=>calcProm(b.atributos)-calcProm(a.atributos));
  const o=[],b=[];
  s.forEach((j,i)=>(i%2===0?o:b).push(j));
  return {oscuro:o,blanco:b};
}
function asignarVotaciones(inscriptos) {
  const jugadores = inscriptos.filter(id=>!id.startsWith("inv_"));
  const asig = {};
  jugadores.forEach(dni => {
    const otros = jugadores.filter(d=>d!==dni);
    asig[dni] = [...otros].sort(()=>Math.random()-.5).slice(0,Math.min(3,otros.length));
  });
  return asig;
}
function horasRestantes(fechaFin) {
  if (!fechaFin) return null;
  const fin = new Date(fechaFin).getTime() + 24*60*60*1000;
  const diff = fin - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000*60*60));
}

// ── Firestore refs ────────────────────────────────────────────────────────────
const rUser = dni  => doc(db,"app8_users",dni);
const rCom  = id   => doc(db,"app8_comunidades",id);
const rPart = id   => doc(db,"app8_partidos",id);
const rVots = pid  => doc(db,"app8_votos",pid);

// ── Design System ─────────────────────────────────────────────────────────────
// Material You / Google Modern — light & airy with strong accents
const G = {
  // Superficies
  bg:       "#F6F8FC",
  surf0:    "#FFFFFF",
  surf1:    "#F0F4FF",
  surf2:    "#E8EEFF",
  // Texto
  t1:       "#1A1C2E",
  t2:       "#44475A",
  t3:       "#8B90A7",
  // Accents
  primary:  "#3D5AFE",   // indigo vivo
  secondary:"#00C2A8",   // teal
  warn:     "#FF6D00",   // naranja
  danger:   "#E53935",   // rojo
  gold:     "#FFB300",   // amarillo
  // Sombras
  sh1:      "0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06)",
  sh2:      "0 4px 12px rgba(0,0,0,.10), 0 2px 4px rgba(0,0,0,.06)",
  sh3:      "0 8px 24px rgba(0,0,0,.12)",
  // Radii
  r1:8, r2:14, r3:20, r4:28,
};

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
  body { font-family:'Outfit',sans-serif; background:${G.bg}; color:${G.t1}; }
  input,button,textarea { font-family:'Outfit',sans-serif; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:#CBD2E0; border-radius:4px; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to{transform:rotate(360deg)} }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
  .fade-up { animation: fadeUp .3s ease both; }
`;

// ── UI primitives ─────────────────────────────────────────────────────────────
// Convierte links de Google Drive a URL directa de imagen
function fixImgUrl(url) {
  if (!url) return "";
  // https://drive.google.com/file/d/FILE_ID/view...
  const m = url.match(/\/file\/d\/([^/]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400`;
  // https://drive.google.com/open?id=FILE_ID
  const m2 = url.match(/[?&]id=([^&]+)/);
  if (m2) return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w400`;
  return url;
}

function Av({ nom, foto, size=40 }) {
  const palette = ["#3D5AFE","#00C2A8","#FF6D00","#E53935","#8B4FD8","#0097A7","#F4511E"];
  const color   = palette[(nom||"?").charCodeAt(0)%palette.length];
  const init    = (nom||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  if (foto) return <img src={fixImgUrl(foto)} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:"2px solid #fff",boxShadow:G.sh1}} onError={e=>e.target.style.display="none"} />;
  return <div style={{width:size,height:size,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*.38,color:"#fff",flexShrink:0,border:"2px solid #fff",boxShadow:G.sh1,letterSpacing:-.5}}>{init}</div>;
}

function Chip({ children, color=G.primary, bg, onClick }) {
  return <span onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:99,background:bg||color+"18",color,fontSize:12,fontWeight:600,cursor:onClick?"pointer":"default",userSelect:"none",border:`1px solid ${color}25`}}>{children}</span>;
}

function Btn({ children, onClick, v="primary", disabled, sm, full, style:ex={} }) {
  const styles = {
    primary: { bg:G.primary,     color:"#fff",   shadow:G.sh2 },
    secondary:{ bg:G.secondary,  color:"#fff",   shadow:G.sh2 },
    danger:  { bg:G.danger,      color:"#fff",   shadow:G.sh1 },
    warn:    { bg:G.warn,        color:"#fff",   shadow:G.sh1 },
    ghost:   { bg:"transparent", color:G.t2,     shadow:"none", border:`1.5px solid #DDE3F0` },
    soft:    { bg:G.surf2,       color:G.primary,shadow:"none" },
    text:    { bg:"transparent", color:G.primary,shadow:"none" },
  };
  const s = styles[v]||styles.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background:s.bg, color:s.color, border:s.border||"none",
      borderRadius:sm?G.r1:G.r2, boxShadow:disabled?"none":s.shadow,
      fontWeight:600, fontSize:sm?12:14, padding:sm?"6px 14px":"12px 20px",
      cursor:disabled?"not-allowed":"pointer", opacity:disabled?.45:1,
      transition:"all .18s cubic-bezier(.4,0,.2,1)",
      width:full?"100%":undefined, display:"block",
      ...ex
    }}>{children}</button>
  );
}

function Inp({ value, onChange, placeholder, type="text", onKeyDown, label, style:ex={} }) {
  return (
    <div style={{marginBottom:12}}>
      {label && <div style={{fontSize:12,fontWeight:600,color:G.t3,marginBottom:5,letterSpacing:.3}}>{label}</div>}
      <input type={type} value={value||""} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
        style={{width:"100%",padding:"12px 16px",borderRadius:G.r2,border:"1.5px solid #DDE3F0",background:G.surf0,color:G.t1,fontSize:15,outline:"none",transition:"border .2s",boxShadow:"inset 0 1px 3px rgba(0,0,0,.04)",...ex}}
        onFocus={e=>e.target.style.borderColor=G.primary}
        onBlur={e=>e.target.style.borderColor="#DDE3F0"}
      />
    </div>
  );
}

function Card({ children, style:ex={}, accent, onClick, className="" }) {
  return (
    <div className={className} onClick={onClick} style={{
      background:G.surf0, borderRadius:G.r3, boxShadow:G.sh1,
      border:`1px solid ${accent||"#EEF0F8"}`,
      padding:18, marginBottom:14,
      cursor:onClick?"pointer":"default",
      transition:"box-shadow .2s,transform .15s",
      ...ex
    }}>{children}</div>
  );
}

function Section({ children, style:ex={} }) {
  return <div style={{padding:"16px 16px 0",marginBottom:8,...ex}}>{children}</div>;
}

function STitle({ children, sub }) {
  return (
    <div style={{marginBottom:18}}>
      <h2 style={{fontSize:20,fontWeight:800,color:G.t1,letterSpacing:-.4}}>{children}</h2>
      {sub && <p style={{fontSize:13,color:G.t3,marginTop:3}}>{sub}</p>}
    </div>
  );
}

function Msg({ children, ok, warn }) {
  if (!children) return null;
  const color = ok ? G.secondary : warn ? G.warn : G.danger;
  return (
    <div style={{padding:"10px 14px",borderRadius:G.r2,marginTop:10,fontSize:13,fontWeight:500,
      background:color+"12",color,border:`1px solid ${color}30`,display:"flex",alignItems:"center",gap:8}}>
      <span>{ok?"✓":warn?"⚠":"✗"}</span> {children}
    </div>
  );
}

function Divider() { return <div style={{height:1,background:"#EEF0F8",margin:"12px 0"}} />; }

function Spinner({ size=40 }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"70vh",gap:16}}>
      <div style={{width:size,height:size,border:`3px solid ${G.surf2}`,borderTopColor:G.primary,borderRadius:"50%",animation:"spin .7s linear infinite"}} />
      <p style={{color:G.t3,fontSize:14,fontWeight:500}}>Cargando App8...</p>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <div onClick={()=>onChange(!checked)} style={{width:46,height:26,borderRadius:13,background:checked?G.primary:"#CBD2E0",position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:checked?23:3,width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:G.sh1,transition:"left .2s"}} />
    </div>
  );
}

function NumPad({ value, onChange, max=99 }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <button onClick={()=>onChange(Math.max(0,(value||0)-1))} style={{width:32,height:32,borderRadius:8,border:`1.5px solid #DDE3F0`,background:G.surf0,cursor:"pointer",fontWeight:700,fontSize:18,color:G.t2,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
      <span style={{minWidth:28,textAlign:"center",fontWeight:700,fontSize:16,color:G.t1}}>{value||0}</span>
      <button onClick={()=>onChange(Math.min(max,(value||0)+1))} style={{width:32,height:32,borderRadius:8,border:"none",background:G.primary,cursor:"pointer",fontWeight:700,fontSize:18,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [loading,    setLoading]    = useState(true);
  const [user,       setUser]       = useState(null);
  const [pantalla,   setPantalla]   = useState("home");
  const [coms,       setComs]       = useState([]);
  const [comActiva,  setComActiva]  = useState(null);
  const [partido,    setPartido]    = useState(null);

  useEffect(()=>{
    const s = localStorage.getItem("app8_v4_session");
    if(s) { try{ setUser(JSON.parse(s)); }catch{} }
    setLoading(false);
  },[]);

  useEffect(()=>{ if(user) loadComs(); },[user?.dni]);

  useEffect(()=>{
    if(!comActiva?.partidoActivo){ setPartido(null); return; }
    return onSnapshot(rPart(comActiva.partidoActivo), s=>setPartido(s.exists()?{id:s.id,...s.data()}:null));
  },[comActiva?.partidoActivo]);

  async function loadComs() {
    if(!user) return;
    const snap = await getDocs(collection(db,"app8_comunidades"));
    const all = [];
    snap.forEach(d=>{ const c={id:d.id,...d.data()}; if((c.miembros||[]).includes(user.dni)||c.creadorDni===user.dni) all.push(c); });
    setComs(all);
    if(comActiva){ const u=all.find(c=>c.id===comActiva.id); if(u) setComActiva(u); }
  }

  function login(u) { setUser(u); localStorage.setItem("app8_v4_session",JSON.stringify(u)); }
  function logout()  { setUser(null); localStorage.removeItem("app8_v4_session"); setPantalla("home"); setComActiva(null); }
  async function reloadUser() {
    if(!user) return;
    const s = await getDoc(rUser(user.dni));
    if(s.exists()){ const u={...user,...s.data()}; setUser(u); localStorage.setItem("app8_v4_session",JSON.stringify(u)); }
  }

  if(loading) return <><style>{globalCSS}</style><div style={{background:G.bg,minHeight:"100vh"}}><Spinner /></div></>;

  const esAdminCom = comActiva && (comActiva.admins||[]).includes(user?.dni);

  const tabsCom = [
    {id:"partido",  label:"Partido",   icon:"📋"},
    {id:"equipos",  label:"Equipos",   icon:"⚖️"},
    {id:"votar",    label:"Votar",     icon:"🗳️"},
    {id:"historial",label:"Historial", icon:"📜"},
    {id:"stats",    label:"Stats",     icon:"📊"},
    {id:"com",      label:"Grupo",     icon:"🏘️"},
  ];
  const tabsHome = [
    {id:"home",   label:"Inicio", icon:"⚽"},
    {id:"perfil", label:"Perfil", icon:"👤"},
    ...(user?.dni===SUPER_ADMIN?[{id:"sadmin",label:"Super",icon:"🔑"}]:[]),
  ];
  const tabs = comActiva ? tabsCom : tabsHome;

  return (
    <>
      <style>{globalCSS}</style>
      <div style={{minHeight:"100vh",background:G.bg,maxWidth:480,margin:"0 auto",paddingBottom:80,fontFamily:"'Outfit',sans-serif"}}>

        {/* TOP BAR */}
        <div style={{background:G.surf0,boxShadow:G.sh1,padding:"14px 18px",position:"sticky",top:0,zIndex:100,display:"flex",alignItems:"center",gap:12}}>
          <div onClick={()=>{setComActiva(null);setPantalla("home");}} style={{width:36,height:36,borderRadius:12,background:`linear-gradient(135deg,${G.primary},#7C4DFF)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer",flexShrink:0,boxShadow:G.sh2}}>⚽</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:18,letterSpacing:-.5,color:G.t1}}>
              App<span style={{color:G.primary}}>8</span>
              {comActiva && <span style={{fontSize:13,color:G.t3,fontWeight:500,marginLeft:8}}>· {comActiva.nombre}</span>}
            </div>
          </div>
          {user && <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div onClick={()=>setPantalla("perfil")} style={{cursor:"pointer"}}>
              <Av nom={user.nombre} foto={user.foto} size={34} />
            </div>
            <button onClick={logout} style={{background:"none",border:"none",color:G.t3,fontSize:12,cursor:"pointer",fontWeight:600}}>Salir</button>
          </div>}
          {!user && <Btn onClick={()=>setPantalla("auth")} sm>Ingresar</Btn>}
        </div>

        {/* CONTENT */}
        <div className="fade-up" style={{paddingBottom:16}}>
          {!user && <AuthScreen onLogin={login} />}
          {user && pantalla==="home"     && <PHome user={user} coms={coms} setComActiva={c=>{setComActiva(c);setPantalla("partido");}} loadComs={loadComs} />}
          {user && pantalla==="perfil"   && <PPerfil user={user} reloadUser={reloadUser} esAdminCom={esAdminCom} comActiva={comActiva} />}
          {user && pantalla==="sadmin" && user.dni===SUPER_ADMIN && <PSuperAdmin />}
          {user && comActiva && pantalla==="partido"   && <PPartido comunidad={comActiva} partido={partido} user={user} loadComs={loadComs} setPantalla={setPantalla} />}
          {user && comActiva && pantalla==="equipos"   && <PEquipos comunidad={comActiva} partido={partido} user={user} />}
          {user && comActiva && pantalla==="votar"     && <PVotar   comunidad={comActiva} partido={partido} user={user} />}
          {user && comActiva && pantalla==="historial" && <PHistorial comunidad={comActiva} esAdmin={esAdminCom} />}
          {user && comActiva && pantalla==="stats"     && <PStats   comunidad={comActiva} user={user} esAdmin={esAdminCom} />}
          {user && comActiva && pantalla==="com"       && <PComunidad comunidad={comActiva} user={user} loadComs={loadComs} setPantalla={setPantalla} />}
        </div>

        {/* BOTTOM NAV */}
        {user && (
          <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:G.surf0,borderTop:"1px solid #EEF0F8",display:"flex",zIndex:100,boxShadow:"0 -4px 20px rgba(0,0,0,.06)"}}>
            {tabs.map(t=>{
              const active = pantalla===t.id;
              return (
                <button key={t.id} onClick={()=>setPantalla(t.id)} style={{flex:1,padding:"10px 4px 12px",border:"none",background:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <span style={{fontSize:18}}>{t.icon}</span>
                  <span style={{fontSize:10,fontWeight:active?700:500,color:active?G.primary:G.t3}}>{t.label}</span>
                  {active && <div style={{width:20,height:3,borderRadius:2,background:G.primary,marginTop:-2}} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [tab,  setTab]  = useState("login");
  const [dni,  setDni]  = useState(""); const [nom,setNom]=useState("");
  const [p1,   setP1]   = useState(""); const [p2, setP2] =useState("");
  const [msg,  setMsg]  = useState(""); const [load,setLoad]=useState(false);

  async function doLogin() {
    if(!dni||!p1){setMsg("Completá todos los campos");return;}
    setLoad(true);
    const snap=await getDoc(rUser(dni.trim()));
    setLoad(false);
    if(!snap.exists()){setMsg("DNI no encontrado");return;}
    const u=snap.data();
    if(u.passHash!==hashPwd(p1)){setMsg("Contraseña incorrecta");return;}
    onLogin({...u});
  }

  async function doRegister() {
    if(!nom||!dni||!p1||!p2){setMsg("Completá todos los campos");return;}
    if(p1!==p2){setMsg("Las contraseñas no coinciden");return;}
    if(p1.length<4){setMsg("Mínimo 4 caracteres");return;}
    setLoad(true);
    const snap=await getDoc(rUser(dni.trim()));
    if(snap.exists()){
      const upd={...snap.data(),passHash:hashPwd(p1)};
      await setDoc(rUser(dni.trim()),upd,{merge:true});
      setLoad(false);onLogin(upd);return;
    }
    const n={nombre:nom.trim(),dni:dni.trim(),apodo:"",foto:"",passHash:hashPwd(p1),atributos:{},atributosAnteriores:{},goles:0,partidos:0,historial:[],creadoEn:Date.now()};
    await setDoc(rUser(dni.trim()),n);
    setLoad(false);onLogin(n);
  }

  return (
    <div style={{padding:20}}>
      <div style={{textAlign:"center",padding:"32px 0 28px"}}>
        <div style={{width:72,height:72,borderRadius:24,background:`linear-gradient(135deg,${G.primary},#7C4DFF)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 16px",boxShadow:G.sh3}}>⚽</div>
        <h1 style={{fontSize:28,fontWeight:900,letterSpacing:-1,color:G.t1}}>App<span style={{color:G.primary}}>8</span></h1>
        <p style={{color:G.t3,fontSize:14,marginTop:4}}>Tu red de fútbol</p>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:20,background:G.surf1,borderRadius:G.r3,padding:4}}>
        {["login","register"].map(t=>(
          <button key={t} onClick={()=>{setTab(t);setMsg("");}} style={{flex:1,padding:"10px",borderRadius:G.r2,border:"none",cursor:"pointer",fontWeight:700,fontSize:14,background:tab===t?G.surf0:"transparent",color:tab===t?G.primary:G.t3,boxShadow:tab===t?G.sh1:"none",transition:"all .2s"}}>
            {t==="login"?"Ingresar":"Registrarme"}
          </button>
        ))}
      </div>
      <Card>
        {tab==="register" && <Inp label="Nombre completo" value={nom} onChange={e=>setNom(e.target.value)} placeholder="Juan Pérez" />}
        <Inp label="DNI" value={dni} onChange={e=>setDni(e.target.value)} placeholder="38123456" />
        <Inp label="Contraseña" type="password" value={p1} onChange={e=>setP1(e.target.value)} placeholder="••••••" onKeyDown={e=>e.key==="Enter"&&tab==="login"&&doLogin()} />
        {tab==="register" && <Inp label="Repetir contraseña" type="password" value={p2} onChange={e=>setP2(e.target.value)} placeholder="••••••" />}
        <Btn onClick={tab==="login"?doLogin:doRegister} disabled={load} full style={{marginTop:4}}>{load?"Cargando...":tab==="login"?"Ingresar →":"Crear cuenta"}</Btn>
        <Msg ok={false}>{msg}</Msg>
      </Card>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function PHome({ user, coms, setComActiva, loadComs }) {
  const [showNew, setShowNew] = useState(false);
  const [nomCom,  setNomCom]  = useState("");
  const [fotoCom, setFotoCom] = useState("");
  const [msg,     setMsg]     = useState("");

  async function crear() {
    if(!nomCom.trim()){setMsg("Poné un nombre");return;}
    const id=uid();
    await setDoc(rCom(id),{nombre:nomCom.trim(),foto:fotoCom.trim(),creadorDni:user.dni,admins:[user.dni],miembros:[user.dni],creadoEn:Date.now(),partidoActivo:null,historialPartidos:[],precioCancha:0,pozoAcumulado:0});
    setNomCom("");setFotoCom("");setShowNew(false);
    await loadComs();
  }

  return (
    <div style={{padding:20}}>
      <div style={{marginBottom:20,paddingTop:8}}>
        <h2 style={{fontSize:22,fontWeight:800,letterSpacing:-.5}}>Hola, {user.apodo||user.nombre.split(" ")[0]} 👋</h2>
        <p style={{color:G.t3,fontSize:14,marginTop:2}}>Tus comunidades de fútbol</p>
      </div>

      {coms.length===0 && (
        <Card style={{textAlign:"center",padding:32,background:G.surf1}}>
          <div style={{fontSize:48,marginBottom:12}}>🏘️</div>
          <p style={{fontWeight:700,marginBottom:6}}>Sin comunidades aún</p>
          <p style={{color:G.t3,fontSize:13}}>Creá una o pedile a alguien que te invite.</p>
        </Card>
      )}

      {coms.map(c=>{
        const esAdm=(c.admins||[]).includes(user.dni);
        return (
          <Card key={c.id} onClick={()=>setComActiva(c)} style={{cursor:"pointer",padding:0,overflow:"hidden"}}
            accent={G.primary+"20"}>
            {c.foto && <img src={fixImgUrl(c.foto)} style={{width:"100%",height:120,objectFit:"cover"}} onError={e=>e.target.style.display="none"} />}
            {!c.foto && <div style={{height:80,background:`linear-gradient(135deg,${G.primary}22,${G.secondary}22)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>🏘️</div>}
            <div style={{padding:"14px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:16}}>{c.nombre}</div>
                  <div style={{color:G.t3,fontSize:12,marginTop:2}}>{(c.miembros||[]).length} miembros</div>
                </div>
                {esAdm && <Chip color={G.primary}>Admin</Chip>}
                <span style={{color:G.t3,fontSize:20,fontWeight:300}}>›</span>
              </div>
              {(c.precioCancha>0||c.pozoAcumulado>0) && (
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  {c.precioCancha>0 && <Chip color={G.warn}>💰 ${c.precioCancha}/persona</Chip>}
                  {c.pozoAcumulado>0 && <Chip color={G.secondary}>🏆 Pozo: ${c.pozoAcumulado}</Chip>}
                </div>
              )}
            </div>
          </Card>
        );
      })}

      {!showNew
        ? <Btn onClick={()=>setShowNew(true)} v="soft" full style={{marginTop:4}}>+ Crear comunidad</Btn>
        : <Card accent={G.primary+"30"}>
            <h3 style={{fontWeight:700,marginBottom:14,color:G.primary}}>🏘️ Nueva comunidad</h3>
            <Inp label="Nombre" value={nomCom} onChange={e=>setNomCom(e.target.value)} placeholder='Ej: Fútbol de los Lunes' onKeyDown={e=>e.key==="Enter"&&crear()} />
            <Inp label="URL de foto de portada (opcional)" value={fotoCom} onChange={e=>setFotoCom(e.target.value)} placeholder="https://..." />
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <Btn onClick={crear} full>Crear</Btn>
              <Btn v="ghost" onClick={()=>setShowNew(false)} full>Cancelar</Btn>
            </div>
            <Msg ok={false}>{msg}</Msg>
          </Card>
      }
    </div>
  );
}

// ── PERFIL ────────────────────────────────────────────────────────────────────
function PPerfil({ user, reloadUser, esAdminCom, comActiva }) {
  const [nom,setNom]=useState(user.nombre||""); const [apodo,setApodo]=useState(user.apodo||"");
  const [foto,setFoto]=useState(user.foto||""); const [msg,setMsg]=useState("");
  const [p0,setP0]=useState(""); const [p1,setP1]=useState(""); const [p2,setP2]=useState(""); const [msgP,setMsgP]=useState("");
  const [ud,setUd]=useState(user);

  useEffect(()=>{getDoc(rUser(user.dni)).then(s=>{if(s.exists())setUd(s.data());});},[user.dni]);

  async function guardar(){
    await setDoc(rUser(user.dni),{nombre:nom.trim(),apodo:apodo.trim(),foto:foto.trim()},{merge:true});
    await reloadUser();setMsg("Perfil actualizado");setTimeout(()=>setMsg(""),2500);
  }
  async function cambiarPass(){
    if(!p0||!p1||!p2){setMsgP("Completá todos los campos");return;}
    if(p1!==p2){setMsgP("No coinciden");return;}
    if(p1.length<4){setMsgP("Mínimo 4 caracteres");return;}
    const s=await getDoc(rUser(user.dni));
    if(s.data().passHash!==hashPwd(p0)){setMsgP("Contraseña actual incorrecta");return;}
    await setDoc(rUser(user.dni),{passHash:hashPwd(p1)},{merge:true});
    setP0("");setP1("");setP2("");setMsgP("Contraseña cambiada");setTimeout(()=>setMsgP(""),2500);
  }

  const attrs=ud.atributos||{};
  const attrsAnt=ud.atributosAnteriores||{};
  // Solo mostrar tendencia si ya hubo al menos un partido (historial tiene entradas)
  const tuvoPartidos = (ud.partidos||0) > 0;
  const tend=key=>{ 
    if(!tuvoPartidos) return null;
    const a=attrs[key]||0,b=attrsAnt[key]||0; 
    if(!a&&!b)return null; 
    if(a>b)return{icon:"↑",c:G.secondary}; 
    if(a<b)return{icon:"↓",c:G.danger}; 
    return{icon:"—",c:G.t3}; 
  };

  return (
    <div style={{padding:20}}>
      <STitle>Mi perfil</STitle>
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
          <Av nom={nom||user.nombre} foto={foto} size={60} />
          <div>
            <div style={{fontWeight:800,fontSize:17}}>{nom||user.nombre}</div>
            {apodo && <div style={{color:G.primary,fontSize:13,fontWeight:600}}>"{apodo}"</div>}
            <div style={{color:G.t3,fontSize:12}}>DNI {user.dni}</div>
          </div>
        </div>
        <Inp label="Nombre" value={nom} onChange={e=>setNom(e.target.value)} />
        <Inp label="Apodo (opcional)" value={apodo} onChange={e=>setApodo(e.target.value)} placeholder='"El Flaco"' />
        <Inp label="URL de foto" value={foto} onChange={e=>setFoto(e.target.value)} placeholder="https://..." />
        <p style={{fontSize:11,color:G.t3,marginBottom:12}}>Pegá el link de una imagen de internet (compartida públicamente)</p>
        <Btn onClick={guardar} full>Guardar perfil</Btn>
        <Msg ok={!!msg}>{msg}</Msg>
      </Card>

      <Card>
        <h3 style={{fontWeight:700,marginBottom:14}}>📈 Mis atributos</h3>
        <p style={{fontSize:13,color:G.t3,marginBottom:14}}>Tendencia respecto al partido anterior</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {ATTRS.map(a=>{
            const t=tend(a.key);
            return (
              <div key={a.key} style={{background:G.surf1,borderRadius:G.r2,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{a.icon}</span>
                <div style={{flex:1,fontSize:13,fontWeight:600,color:G.t2}}>{a.label}</div>
                {t ? <span style={{fontSize:20,fontWeight:900,color:t.c}}>{t.icon}</span>
                   : <span style={{fontSize:11,color:G.t3}}>—</span>}
              </div>
            );
          })}
        </div>
        <p style={{fontSize:11,color:G.t3,marginTop:12,textAlign:"center"}}>Los puntajes exactos son privados</p>
      </Card>

      {esAdminCom && (
        <Card accent={G.gold+"40"}>
          <h3 style={{fontWeight:700,marginBottom:12,color:G.warn}}>👑 Puntajes reales (Admin)</h3>
          {ATTRS.map(a=>(
            <div key={a.key} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:G.surf1,borderRadius:G.r1,marginBottom:6}}>
              <span>{a.icon}</span>
              <span style={{flex:1,fontSize:13,fontWeight:500}}>{a.label}</span>
              <span style={{fontWeight:800,color:G.primary,fontSize:14}}>{(attrs[a.key]||0).toFixed(1)}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:G.primary+"12",borderRadius:G.r1,marginTop:4}}>
            <span style={{fontWeight:700}}>Promedio general</span>
            <span style={{fontWeight:900,color:G.primary,fontSize:16}}>{calcProm(attrs).toFixed(2)}</span>
          </div>
        </Card>
      )}

      <Card>
        <h3 style={{fontWeight:700,marginBottom:14}}>📊 Estadísticas</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[{i:"🏟️",l:"Partidos",v:ud.partidos||0},{i:"⚽",l:"Goles",v:(ud.historial||[]).reduce((s,h)=>s+(h.eventos?.goles||0),0)},{i:"🥇",l:"MVPs",v:(ud.historial||[]).filter(h=>h.mvp).length}].map(s=>(
            <div key={s.l} style={{background:G.surf1,borderRadius:G.r2,padding:"14px 10px",textAlign:"center"}}>
              <div style={{fontSize:20}}>{s.i}</div>
              <div style={{fontSize:20,fontWeight:800,color:G.primary,marginTop:4}}>{s.v}</div>
              <div style={{fontSize:11,color:G.t3,marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{fontWeight:700,marginBottom:14}}>🔒 Cambiar contraseña</h3>
        <Inp label="Contraseña actual" type="password" value={p0} onChange={e=>setP0(e.target.value)} placeholder="••••••" />
        <Inp label="Nueva contraseña" type="password" value={p1} onChange={e=>setP1(e.target.value)} placeholder="••••••" />
        <Inp label="Repetir nueva" type="password" value={p2} onChange={e=>setP2(e.target.value)} placeholder="••••••" />
        <Btn v="ghost" onClick={cambiarPass} full>Cambiar contraseña</Btn>
        <Msg ok={msgP==="Contraseña cambiada"}>{msgP}</Msg>
      </Card>
    </div>
  );
}

// ── COMUNIDAD ─────────────────────────────────────────────────────────────────
function PComunidad({ comunidad, user, loadComs, setPantalla }) {
  const [miembros, setMiembros] = useState([]);
  const [dniInv,   setDniInv]   = useState("");
  const [puntajes, setPuntajes] = useState({});
  const [dniAdm,   setDniAdm]   = useState("");
  const [msgInv,   setMsgInv]   = useState("");
  const [msgAdm,   setMsgAdm]   = useState("");
  const [editPunt, setEditPunt] = useState(null);
  const [editCom,  setEditCom]  = useState(false);
  const [nomEdit,  setNomEdit]  = useState(comunidad.nombre);
  const [fotoEdit, setFotoEdit] = useState(comunidad.foto||"");
  const [precio,   setPrecio]   = useState(comunidad.precioCancha||0);
  const [pozo,     setPozo]     = useState(comunidad.pozoAcumulado||0);
  const [msgCom,   setMsgCom]   = useState("");

  const esAdmin=(comunidad.admins||[]).includes(user.dni);
  const esCreador=comunidad.creadorDni===user.dni;

  useEffect(()=>{loadMiembros();},[comunidad.id]);

  async function loadMiembros(){
    const arr=[];
    for(const dni of comunidad.miembros||[]){const s=await getDoc(rUser(dni));if(s.exists())arr.push(s.data());}
    setMiembros(arr);
  }

  async function invitar(){
    const dni=dniInv.trim();if(!dni)return;
    const snap=await getDoc(rUser(dni));
    if(!snap.exists()){setMsgInv("DNI no encontrado");return;}
    if((comunidad.miembros||[]).includes(dni)){setMsgInv("Ya es miembro");return;}
    const atrs={};let tiene=false;
    ATTRS.forEach(a=>{const v=parseFloat(puntajes[a.key]);if(v>0){atrs[a.key]=v;tiene=true;}});
    if(tiene) await setDoc(rUser(dni),{atributos:atrs,atributosAnteriores:atrs},{merge:true});
    await setDoc(rCom(comunidad.id),{miembros:[...(comunidad.miembros||[]),dni]},{merge:true});
    setDniInv("");setPuntajes({});await loadComs();await loadMiembros();
    setMsgInv(`✓ ${snap.data().nombre} invitado!`);setTimeout(()=>setMsgInv(""),2500);
  }

  async function salirDelGrupo(){
    if(!confirm("¿Seguro que querés salir del grupo?"))return;
    await setDoc(rCom(comunidad.id),{miembros:(comunidad.miembros||[]).filter(d=>d!==user.dni),admins:(comunidad.admins||[]).filter(d=>d!==user.dni)},{merge:true});
    await loadComs();setPantalla("home");
  }

  async function eliminarGrupo(){
    if(!confirm("¿Eliminar el grupo permanentemente? Esta acción no se puede deshacer."))return;
    if(comunidad.partidoActivo) await deleteDoc(rPart(comunidad.partidoActivo));
    await deleteDoc(rCom(comunidad.id));
    await loadComs();setPantalla("home");
  }

  async function guardarConfigCom(){
    await setDoc(rCom(comunidad.id),{nombre:nomEdit.trim(),foto:fotoEdit.trim(),precioCancha:Number(precio)||0,pozoAcumulado:Number(pozo)||0},{merge:true});
    await loadComs();setEditCom(false);setMsgCom("✓ Guardado");setTimeout(()=>setMsgCom(""),2000);
  }

  async function guardarPuntajes(dni){
    const atrs={};
    ATTRS.forEach(a=>{const v=parseFloat(editPunt?.puntajes?.[a.key]);if(v>0)atrs[a.key]=Math.min(10,Math.max(1,v));});
    await setDoc(rUser(dni),{atributos:atrs,atributosAnteriores:atrs},{merge:true});
    setEditPunt(null);await loadMiembros();
  }

  async function darAdmin(dni){
    if((comunidad.admins||[]).includes(dni)){setMsgAdm("Ya es admin");return;}
    await setDoc(rCom(comunidad.id),{admins:[...(comunidad.admins||[]),dni]},{merge:true});
    await loadComs();setDniAdm("");setMsgAdm("✓ Admin asignado");setTimeout(()=>setMsgAdm(""),2000);
  }
  async function quitarAdmin(dni){
    if(dni===comunidad.creadorDni)return;
    await setDoc(rCom(comunidad.id),{admins:(comunidad.admins||[]).filter(d=>d!==dni)},{merge:true});
    await loadComs();
  }
  async function expulsar(dni){
    if(!confirm("¿Expulsar a este miembro?"))return;
    await setDoc(rCom(comunidad.id),{miembros:(comunidad.miembros||[]).filter(d=>d!==dni),admins:(comunidad.admins||[]).filter(d=>d!==dni)},{merge:true});
    await loadComs();await loadMiembros();
  }

  return (
    <div style={{padding:20}}>
      <STitle>{comunidad.nombre}</STitle>

      {/* Config admin */}
      {esAdmin && (
        <Card>
          {!editCom ? (
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <h3 style={{fontWeight:700}}>⚙️ Configuración del grupo</h3>
                <Btn sm v="soft" onClick={()=>setEditCom(true)}>Editar</Btn>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {comunidad.precioCancha>0 && <Chip color={G.warn}>💰 ${comunidad.precioCancha}/persona</Chip>}
                {comunidad.pozoAcumulado>0 && <Chip color={G.secondary}>🏆 Pozo: ${comunidad.pozoAcumulado}</Chip>}
              </div>
            </>
          ):(
            <>
              <h3 style={{fontWeight:700,marginBottom:14}}>⚙️ Editar grupo</h3>
              <Inp label="Nombre" value={nomEdit} onChange={e=>setNomEdit(e.target.value)} />
              <Inp label="URL foto de portada" value={fotoEdit} onChange={e=>setFotoEdit(e.target.value)} placeholder="https://..." />
              <Inp label="💰 Precio por persona ($)" type="number" value={precio} onChange={e=>setPrecio(e.target.value)} />
              <Inp label="🏆 Pozo acumulado ($)" type="number" value={pozo} onChange={e=>setPozo(e.target.value)} />
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={guardarConfigCom} full>Guardar</Btn>
                <Btn v="ghost" onClick={()=>setEditCom(false)} full>Cancelar</Btn>
              </div>
              <Msg ok={!!msgCom}>{msgCom}</Msg>
            </>
          )}
        </Card>
      )}

      {/* Miembros */}
      <Card>
        <h3 style={{fontWeight:700,marginBottom:14}}>👥 Miembros ({miembros.length})</h3>
        {miembros.map(m=>(
          <div key={m.dni}>
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #EEF0F8"}}>
              <Av nom={m.nombre} foto={m.foto} size={38} />
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14}}>{m.nombre}</div>
                {m.apodo && <div style={{color:G.primary,fontSize:12}}>"{m.apodo}"</div>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                {(comunidad.admins||[]).includes(m.dni) && <Chip color={G.gold}>Admin</Chip>}
                {m.dni===comunidad.creadorDni && <Chip color={G.primary}>Creador</Chip>}
                {esAdmin && <button onClick={()=>setEditPunt({dni:m.dni,puntajes:{...m.atributos}})} style={{background:G.surf1,border:"none",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:12,fontWeight:600,color:G.primary}}>⚙️</button>}
                {esAdmin && m.dni!==user.dni && m.dni!==comunidad.creadorDni && <button onClick={()=>expulsar(m.dni)} style={{background:G.danger+"15",border:"none",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:12,fontWeight:600,color:G.danger}}>✕</button>}
              </div>
            </div>
            {esAdmin && editPunt?.dni===m.dni && (
              <div style={{background:G.surf1,borderRadius:G.r2,padding:14,margin:"8px 0",border:`1px solid ${G.primary}25`}}>
                <p style={{fontWeight:700,fontSize:13,marginBottom:10,color:G.primary}}>Puntajes de {m.nombre}</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {ATTRS.map(a=>(
                    <div key={a.key}>
                      <div style={{fontSize:11,color:G.t3,marginBottom:4}}>{a.icon} {a.label}</div>
                      <input type="number" min="1" max="10" step="0.5" value={editPunt.puntajes?.[a.key]||""} onChange={e=>setEditPunt(p=>({...p,puntajes:{...p.puntajes,[a.key]:e.target.value}}))}
                        style={{width:"100%",padding:"8px 10px",borderRadius:G.r1,border:"1.5px solid #DDE3F0",background:G.surf0,color:G.t1,fontSize:14,fontFamily:"'Outfit',sans-serif"}} />
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <Btn onClick={()=>guardarPuntajes(m.dni)} full>Guardar</Btn>
                  <Btn v="ghost" onClick={()=>setEditPunt(null)} full>Cancelar</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>

      {esAdmin && (
        <>
          <Card accent={G.secondary+"30"}>
            <h3 style={{fontWeight:700,marginBottom:12}}>➕ Invitar jugador</h3>
            <Inp label="DNI del jugador" value={dniInv} onChange={e=>setDniInv(e.target.value)} placeholder="12345678" onKeyDown={e=>e.key==="Enter"&&invitar()} />
            <p style={{fontSize:12,color:G.t3,marginBottom:10}}>Puntajes iniciales (1-10, opcional)</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              {ATTRS.map(a=>(
                <div key={a.key}>
                  <div style={{fontSize:11,color:G.t3,marginBottom:4}}>{a.icon} {a.label}</div>
                  <input type="number" min="1" max="10" step="0.5" value={puntajes[a.key]||""} onChange={e=>setPuntajes(p=>({...p,[a.key]:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:G.r1,border:"1.5px solid #DDE3F0",background:G.surf0,fontSize:14,fontFamily:"'Outfit',sans-serif"}} />
                </div>
              ))}
            </div>
            <Btn v="secondary" onClick={invitar} full>Invitar</Btn>
            <Msg ok={msgInv?.startsWith("✓")}>{msgInv}</Msg>
          </Card>

          <Card accent={G.gold+"30"}>
            <h3 style={{fontWeight:700,marginBottom:12}}>👑 Gestionar admins</h3>
            <Inp label="DNI del miembro" value={dniAdm} onChange={e=>setDniAdm(e.target.value)} placeholder="DNI" onKeyDown={e=>e.key==="Enter"&&darAdmin(dniAdm)} />
            <Btn onClick={()=>darAdmin(dniAdm)} full>Dar admin</Btn>
            {(comunidad.admins||[]).filter(d=>d!==comunidad.creadorDni).map(d=>{
              const m=miembros.find(x=>x.dni===d);
              return <div key={d} style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                <Chip color={G.gold}>{m?.nombre||d}</Chip>
                <button onClick={()=>quitarAdmin(d)} style={{background:"none",border:"none",color:G.danger,cursor:"pointer",fontSize:12,fontWeight:600}}>✕ quitar</button>
              </div>;
            })}
            <Msg ok={msgAdm?.startsWith("✓")}>{msgAdm}</Msg>
          </Card>
        </>
      )}

      <Divider />
      {/* Salir del grupo */}
      {!esCreador && (
        <Btn v="ghost" onClick={salirDelGrupo} full style={{marginBottom:10}}>Salir del grupo</Btn>
      )}
      {/* Eliminar grupo — solo creador */}
      {esCreador && (
        <Btn v="danger" onClick={eliminarGrupo} full>🗑️ Eliminar grupo permanentemente</Btn>
      )}
    </div>
  );
}

// ── LUGAR AUTOCOMPLETE (Google Places) ───────────────────────────────────────
function LugarAutocomplete({ onSelect }) {
  const [sugs, setSugs] = useState([]);
  const [query, setQuery] = useState("");
  const timer = useRef(null);

  function buscar(q) {
    setQuery(q);
    if (!q || q.length < 3) { setSugs([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=4&countrycodes=ar&addressdetails=1`, {headers:{"Accept-Language":"es"}});
        const data = await r.json();
        setSugs(data.map(d=>({label:d.display_name, short: d.name||d.display_name.split(",")[0]})));
      } catch { setSugs([]); }
    }, 400);
  }

  if (sugs.length === 0) return null;
  return (
    <div style={{background:G.surf0,border:"1.5px solid #DDE3F0",borderRadius:G.r1,marginTop:4,boxShadow:G.sh2,zIndex:50,position:"relative"}}>
      {sugs.map((s,i)=>(
        <div key={i} onClick={()=>{onSelect(s.label);setSugs([]);}}
          style={{padding:"10px 14px",fontSize:13,cursor:"pointer",borderBottom:i<sugs.length-1?"1px solid #EEF0F8":"none",color:G.t2,lineHeight:1.4}}
          onMouseEnter={e=>e.target.style.background=G.surf1}
          onMouseLeave={e=>e.target.style.background="transparent"}>
          📍 {s.label}
        </div>
      ))}
    </div>
  );
}

// ── CALENDAR LINKS ────────────────────────────────────────────────────────────
function ShareWhatsApp({ partido, comunidad, jugData, inscripos }) {
  if (!partido) return null;
  function compartir() {
    const lista = (inscripos||[]).map((id,i) => {
      const j = jugData[id];
      if (!j) return null;
      return `${i+1}. ${j.nombre||"Invitado"}${j.esInvitado?" (inv.)":""}`;
    }).filter(Boolean).join("\n");
    const texto =
      `⚽ *${comunidad?.nombre||"Fútbol"}*\n` +
      `📆 ${partido.fecha||""} 🕐 ${partido.hora||""}\n` +
      `📍 ${partido.lugar||""}\n` +
      `👥 Formato: ${partido.formato||""}\n` +
      `\n*Inscriptos (${inscripos?.length||0}):*\n${lista||"Nadie anotado aún"}\n` +
      `\n_Anotate en App8_ 📲`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  }
  return (
    <div style={{marginTop:10}}>
      <div style={{fontSize:11,color:G.t3,fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Compartir</div>
      <button onClick={compartir} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:"#25D36620",border:"1.5px solid #25D36640",borderRadius:G.r2,cursor:"pointer",color:"#128C7E",fontWeight:700,fontSize:14,width:"100%",justifyContent:"center"}}>
        <span style={{fontSize:20}}>💬</span> Compartir inscriptos por WhatsApp
      </button>
    </div>
  );
}

function CalendarLinks({ partido, comunidad }) {
  if (!partido) return null;
  const fecha = partido.fecha || "";
  const hora  = partido.hora  || "00:00";
  const title = `⚽ Partido - ${comunidad?.nombre||"Fútbol"}`;
  const det   = `Formato: ${partido.formato}\nLugar: ${partido.lugar}`;
  const loc   = partido.lugar || "";

  // Formato YYYYMMDDTHHmm00 para Google/Outlook
  const dt  = fecha.replace(/-/g,"") + "T" + hora.replace(":","") + "00";
  const dtE = fecha.replace(/-/g,"") + "T" + (()=>{ const [h,m]=hora.split(":"); return String(parseInt(h)+1).padStart(2,"0")+m; })() + "00";

  const google  = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dt}/${dtE}&details=${encodeURIComponent(det)}&location=${encodeURIComponent(loc)}`;
  const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${fecha}T${hora}:00&enddt=${fecha}T${(()=>{ const [h,m]=hora.split(":"); return String(parseInt(h)+2).padStart(2,"0")+":"+m; })()}:00&body=${encodeURIComponent(det)}&location=${encodeURIComponent(loc)}`;
  const ics     = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${dt}%0ADTEND:${dtE}%0ASUMMARY:${encodeURIComponent(title)}%0ALOCATION:${encodeURIComponent(loc)}%0ADESCRIPTION:${encodeURIComponent(det)}%0AEND:VEVENT%0AEND:VCALENDAR`;

  const cals = [
    { label:"Google",  icon:"🗓️", href:google,  target:"_blank" },
    { label:"Outlook", icon:"📧", href:outlook, target:"_blank" },
    { label:"iCal",    icon:"🍎", href:ics,     target:"_self",  download:"partido.ics" },
  ];

  return (
    <div style={{marginTop:10}}>
      <div style={{fontSize:11,color:G.t3,fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Agregar al calendario</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {cals.map(c=>(
          <a key={c.label} href={c.href} target={c.target} download={c.download}
            style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:G.surf1,borderRadius:G.r2,textDecoration:"none",color:G.t2,fontWeight:600,fontSize:13,border:"1px solid #EEF0F8",boxShadow:G.sh1}}>
            {c.icon} {c.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// ── PARTIDO ───────────────────────────────────────────────────────────────────
function PPartido({ comunidad, partido, user, loadComs, setPantalla }) {
  const [fecha,setFecha]=useState(""); const [hora,setHora]=useState(""); const [lugar,setLugar]=useState(""); const [formato,setFormato]=useState("");
  const [nomInv,setNomInv]=useState(""); const [msg,setMsg]=useState(""); const [invMsg,setInvMsg]=useState("");
  const [jugData,setJugData]=useState({});

  const esAdmin=(comunidad.admins||[]).includes(user.dni);
  const fmtObj=FORMATOS.find(f=>f.label===partido?.formato);
  const cupo=fmtObj?.total||0;
  const inscripos=partido?.inscriptos||[];
  const cupoLibre=cupo-inscripos.length;
  const yoAnotado=inscripos.includes(user.dni);

  useEffect(()=>{if(partido){setFecha(partido.fecha||"");setHora(partido.hora||"");setLugar(partido.lugar||"");setFormato(partido.formato||"");}},[partido?.id]);
  useEffect(()=>{
    const load=async()=>{
      if(!partido)return;
      const obj={};
      for(const id of inscripos){
        if(id.startsWith("inv_")){obj[id]=partido.invitados?.[id];continue;}
        const s=await getDoc(rUser(id));if(s.exists())obj[id]=s.data();
      }
      setJugData(obj);
    };
    if(partido)load();
  },[JSON.stringify(inscripos)]);

  async function crearPartido(){
    if(!fecha||!hora||!lugar||!formato){setMsg("Completá todos los campos");return;}
    const pid=uid();
    await setDoc(rPart(pid),{comunidadId:comunidad.id,fecha,hora,lugar,formato,inscriptos:[],invitados:{},eventos:{},finalizado:false,equipos:null,notasAtributos:{},mvpConteo:{},votacionesAsignadas:{},creadoEn:Date.now()});
    await setDoc(rCom(comunidad.id),{partidoActivo:pid},{merge:true});
    await loadComs();setMsg("✓ Partido creado!");setTimeout(()=>setMsg(""),2000);
  }

  async function anotarme(){
    if(cupoLibre<=0){setMsg("Partido completo");return;}
    await setDoc(rPart(partido.id),{inscriptos:[...inscripos,user.dni]},{merge:true});
  }
  async function desanotarme(){ await setDoc(rPart(partido.id),{inscriptos:inscripos.filter(d=>d!==user.dni)},{merge:true}); }
  async function borrarInscripto(id){ await setDoc(rPart(partido.id),{inscriptos:inscripos.filter(d=>d!==id)},{merge:true}); }
  async function agregarInvitado(){
    if(!nomInv.trim()){setInvMsg("Poné un nombre");return;}
    const id=`inv_${uid()}`;
    await setDoc(rPart(partido.id),{invitados:{...(partido.invitados||{}),[id]:{nombre:nomInv.trim(),esInvitado:true}},inscriptos:[...inscripos,id]},{merge:true});
    setNomInv("");setInvMsg("✓ Invitado agregado");setTimeout(()=>setInvMsg(""),2000);
  }
  async function actualizarEvento(id,key,delta){
    const evs={...(partido.eventos||{})};
    if(!evs[id])evs[id]={};
    evs[id][key]=Math.max(0,(evs[id][key]||0)+delta);
    await setDoc(rPart(partido.id),{eventos:evs},{merge:true});
  }
  async function finalizarPartido(){
    if(inscripos.length<2){setMsg("Mínimo 2 jugadores");return;}
    const asig=asignarVotaciones(inscripos);
    await setDoc(rPart(partido.id),{finalizado:true,fechaFin:new Date().toISOString(),votacionesAsignadas:asig},{merge:true});
    setPantalla("votar");
  }
  async function borrarPartido(){
    if(!confirm("¿Borrar el partido?"))return;
    if(partido)await deleteDoc(rPart(partido.id));
    await setDoc(rCom(comunidad.id),{partidoActivo:null},{merge:true});
    await loadComs();
  }

  if(!partido) return (
    <div style={{padding:20}}>
      <STitle>Partido</STitle>
      {!esAdmin
        ? <Card style={{textAlign:"center",padding:32,background:G.surf1}}><div style={{fontSize:48,marginBottom:12}}>🗓️</div><p style={{color:G.t3}}>El admin aún no creó un partido.</p></Card>
        : <Card accent={G.primary+"30"}>
            <h3 style={{fontWeight:700,marginBottom:16,color:G.primary}}>🗓️ Crear partido</h3>
            <Inp label="Fecha" type="date" value={fecha} onChange={e=>setFecha(e.target.value)} />
            <Inp label="Hora" type="time" value={hora} onChange={e=>setHora(e.target.value)} />
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:G.t3,marginBottom:5,letterSpacing:.3}}>Lugar</div>
              <input id="lugar-input" type="text" value={lugar} onChange={e=>setLugar(e.target.value)} placeholder="Escribí la dirección o nombre de la cancha..."
                style={{width:"100%",padding:"12px 16px",borderRadius:G.r2,border:"1.5px solid #DDE3F0",background:G.surf0,color:G.t1,fontSize:15,outline:"none",boxSizing:"border-box",fontFamily:"'Outfit',sans-serif"}}
                onFocus={e=>e.target.style.borderColor=G.primary} onBlur={e=>e.target.style.borderColor="#DDE3F0"} />
              <LugarAutocomplete onSelect={setLugar} />
            </div>
            <p style={{fontSize:12,color:G.t3,marginBottom:8}}>Formato</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
              {FORMATOS.map(f=><button key={f.label} onClick={()=>setFormato(f.label)} style={{padding:"7px 14px",borderRadius:99,border:`1.5px solid ${formato===f.label?G.primary:"#DDE3F0"}`,background:formato===f.label?G.primary+"15":"transparent",color:formato===f.label?G.primary:G.t2,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>{f.label}</button>)}
            </div>
            <Btn onClick={crearPartido} full>Crear partido</Btn>
            <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
          </Card>
      }
    </div>
  );

  if(partido.finalizado) return (
    <div style={{padding:20}}>
      <STitle>Partido</STitle>
      <Card style={{textAlign:"center",padding:32}} accent={G.secondary+"40"}>
        <div style={{fontSize:56,marginBottom:12}}>🏁</div>
        <p style={{fontWeight:800,fontSize:18,color:G.secondary}}>Partido finalizado</p>
        {partido.fechaFin && (
          <div style={{marginTop:8}}>
            {horasRestantes(partido.fechaFin)>0
              ? <Chip color={G.warn}>⏳ {horasRestantes(partido.fechaFin)}h para votar</Chip>
              : <Chip color={G.t3}>Tiempo de votación vencido</Chip>}
          </div>
        )}
        <Btn v="secondary" onClick={()=>setPantalla("votar")} full style={{marginTop:16}}>Ir a votar</Btn>
        {esAdmin && <Btn v="ghost" onClick={borrarPartido} full style={{marginTop:8}}>🗑️ Borrar partido</Btn>}
      </Card>
    </div>
  );

  return (
    <div style={{padding:20}}>
      <STitle>Partido</STitle>

      {/* Info */}
      <Card accent={G.primary+"25"}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          {[{i:"📆",v:partido.fecha},{i:"🕐",v:partido.hora},{i:"📍",v:partido.lugar},{i:"👥",v:partido.formato}].map((r,i)=>(
            <div key={i} style={{background:G.surf1,borderRadius:G.r1,padding:"10px 12px",fontSize:14,fontWeight:600}}>{r.i} {r.v||"—"}</div>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <Chip color={cupoLibre>0?G.secondary:G.danger}>{cupoLibre>0?`✅ ${cupoLibre} lugares libres`:"🚫 Completo"}</Chip>
          <span style={{fontSize:13,color:G.t3,fontWeight:600}}>{inscripos.length}/{cupo} inscriptos</span>
        </div>
        <CalendarLinks partido={partido} comunidad={comunidad} />
        <ShareWhatsApp partido={partido} comunidad={comunidad} jugData={jugData} inscripos={inscripos} />
      </Card>

      {/* Precio/Pozo */}
      {(comunidad.precioCancha>0||comunidad.pozoAcumulado>0) && (
        <Card style={{background:G.warn+"10",border:`1px solid ${G.warn}30`}}>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            {comunidad.precioCancha>0 && <div style={{flex:1,textAlign:"center"}}><div style={{fontSize:13,color:G.t3}}>Precio por persona</div><div style={{fontSize:20,fontWeight:800,color:G.warn}}>${comunidad.precioCancha}</div></div>}
            {comunidad.pozoAcumulado>0 && <div style={{flex:1,textAlign:"center"}}><div style={{fontSize:13,color:G.t3}}>🏆 Pozo acumulado</div><div style={{fontSize:20,fontWeight:800,color:G.secondary}}>${comunidad.pozoAcumulado}</div></div>}
          </div>
        </Card>
      )}

      {/* Anotarme */}
      <Card>
        {yoAnotado
          ? <><div style={{color:G.secondary,fontWeight:700,marginBottom:10,fontSize:15}}>✅ Estás anotado al partido</div><Btn v="ghost" onClick={desanotarme} full>Desanotarme</Btn></>
          : <Btn onClick={anotarme} disabled={cupoLibre<=0} full>{cupoLibre>0?"📝 Anotarme":"🚫 Sin lugares"}</Btn>}
        <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
      </Card>

      {/* Lista */}
      <Card>
        <h3 style={{fontWeight:700,marginBottom:14}}>👥 Inscriptos ({inscripos.length}/{cupo})</h3>
        {inscripos.length===0
          ? <p style={{color:G.t3,textAlign:"center",padding:16}}>Nadie anotado aún</p>
          : inscripos.map((id,idx)=>{
              const j=jugData[id];if(!j)return null;
              return (
                <div key={id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #EEF0F8"}}>
                  <span style={{color:G.t3,fontWeight:700,fontSize:13,width:22}}>#{idx+1}</span>
                  <Av nom={j.nombre} foto={j.foto} size={36} />
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14}}>{j.nombre}</div>
                    {j.apodo && <div style={{color:G.primary,fontSize:12}}>"{j.apodo}"</div>}
                    {j.esInvitado && <Chip color={G.warn}>Invitado</Chip>}
                  </div>
                  {esAdmin && <button onClick={()=>borrarInscripto(id)} style={{background:G.danger+"15",border:"none",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:12,fontWeight:600,color:G.danger}}>✕</button>}
                </div>
              );
            })
        }
      </Card>

      {/* Admin tools */}
      {esAdmin && (
        <>
          <Card>
            <h3 style={{fontWeight:700,marginBottom:12}}>👤 Agregar invitado</h3>
            <Inp value={nomInv} onChange={e=>setNomInv(e.target.value)} placeholder='"Amigo de Juan"' onKeyDown={e=>e.key==="Enter"&&agregarInvitado()} />
            <Btn v="soft" onClick={agregarInvitado} full>+ Agregar invitado</Btn>
            <Msg ok={invMsg?.startsWith("✓")}>{invMsg}</Msg>
          </Card>

          {inscripos.length>0 && (
            <Card>
              <h3 style={{fontWeight:700,marginBottom:4}}>⚽ Goles y sanciones</h3>
              <p style={{color:G.t3,fontSize:12,marginBottom:14}}>Solo se guardan goles y amarillas en el historial</p>
              {inscripos.map(id=>{
                const j=jugData[id];if(!j)return null;
                const evs=(partido.eventos||{})[id]||{};
                return (
                  <div key={id} style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid #EEF0F8"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <Av nom={j.nombre} foto={j.foto} size={30} />
                      <span style={{fontWeight:700,fontSize:13}}>{j.nombre}</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[{key:"goles",label:"⚽ Goles"},{key:"amarillas",label:"🟨 Amarillas"}].map(ev=>(
                        <div key={ev.key} style={{background:G.surf1,borderRadius:G.r1,padding:"10px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <span style={{fontSize:13,fontWeight:600,color:G.t2}}>{ev.label}</span>
                          <NumPad value={evs[ev.key]||0} onChange={v=>actualizarEvento(id,ev.key,v-(evs[ev.key]||0))} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          <Btn v="danger" onClick={finalizarPartido} full>🏁 Finalizar partido y abrir votaciones</Btn>
          <Btn v="ghost"  onClick={borrarPartido}    full style={{marginTop:8}}>🗑️ Borrar partido</Btn>
        </>
      )}
    </div>
  );
}

// ── EQUIPOS ───────────────────────────────────────────────────────────────────
function PEquipos({ comunidad, partido, user }) {
  const [jugData,setJugData]=useState({});
  const [eqO,setEqO]=useState([]); const [eqB,setEqB]=useState([]);
  const [generado,setGenerado]=useState(false); const [publicado,setPublicado]=useState(false);
  const [msg,setMsg]=useState("");

  const esAdmin=(comunidad.admins||[]).includes(user.dni);
  const inscripos=partido?.inscriptos||[];

  useEffect(()=>{
    if(partido?.equipos){setEqO(partido.equipos.oscuro||[]);setEqB(partido.equipos.blanco||[]);setPublicado(partido.equipos.publicado||false);setGenerado(true);}
  },[partido?.id]);

  useEffect(()=>{
    const load=async()=>{
      if(!partido)return;
      const obj={};
      for(const id of inscripos){
        if(id.startsWith("inv_")){obj[id]={...partido.invitados?.[id],atributos:{}};continue;}
        const s=await getDoc(rUser(id));if(s.exists())obj[id]=s.data();
      }
      setJugData(obj);
    };
    if(partido)load();
  },[JSON.stringify(inscripos)]);

  function generar(){
    const lista=inscripos.map(id=>({id,...(jugData[id]||{nombre:"?"})})).filter(j=>j.nombre!=="?");
    const {oscuro,blanco}=balancear(lista);
    setEqO(oscuro.map(j=>j.id));setEqB(blanco.map(j=>j.id));setGenerado(true);setPublicado(false);
  }
  function mover(id,from){
    if(from==="o"){setEqO(p=>p.filter(x=>x!==id));setEqB(p=>[...p,id]);}
    else{setEqB(p=>p.filter(x=>x!==id));setEqO(p=>[...p,id]);}
  }
  async function publicar(){
    await setDoc(rPart(partido.id),{equipos:{oscuro:eqO,blanco:eqB,publicado:true}},{merge:true});
    setPublicado(true);setMsg("✓ Equipos publicados");setTimeout(()=>setMsg(""),2000);
  }

  const sumaEq=ids=>ids.map(id=>calcProm((jugData[id]||{}).atributos||{})).reduce((s,v)=>s+v,0);

  const EqCol=({ids,nom,color})=>{
    const jug=ids.map(id=>({id,...(jugData[id]||{})})).filter(j=>j.nombre);
    const suma=sumaEq(ids);
    return (
      <div style={{flex:1,background:`linear-gradient(160deg,${color}12 0%,${G.surf0} 100%)`,border:`1.5px solid ${color}40`,borderRadius:G.r3,padding:16}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:2,color}}>{nom==="o"?"🖤 Oscuro":"🤍 Blanco"}</div>
        {esAdmin && <div style={{fontSize:12,color:G.t3,marginBottom:4}}>Total: <b style={{color}}>{suma.toFixed(1)}</b></div>}
        {esAdmin && <div style={{fontSize:12,color:G.t3,marginBottom:12}}>Prom: {jug.length?(suma/jug.length).toFixed(1):"—"}</div>}
        {!esAdmin && <div style={{marginBottom:12}}/>}
        {jug.map(j=>(
          <div key={j.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:G.surf0,borderRadius:G.r1,marginBottom:6,boxShadow:G.sh1}}>
            <Av nom={j.nombre||"?"} foto={j.foto} size={28} />
            <div style={{flex:1,fontSize:12,fontWeight:600,lineHeight:1.3}}>
              <div>{j.nombre||"?"}</div>
              {esAdmin && <div style={{color:G.t3,fontSize:11}}>{calcProm(j.atributos||{}).toFixed(1)} pts</div>}
            </div>
            {esAdmin && !publicado && <button onClick={()=>mover(j.id,nom)} style={{background:color+"20",border:`1px solid ${color}50`,color,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontWeight:700}}>→</button>}
          </div>
        ))}
      </div>
    );
  };

  if(!partido) return <div style={{padding:20}}><Card style={{textAlign:"center",padding:32,background:G.surf1}}><p style={{color:G.t3}}>No hay partido activo.</p></Card></div>;

  return (
    <div style={{padding:20}}>
      <STitle>Equipos</STitle>
      {!generado && (
        <Card style={{textAlign:"center",padding:32,background:G.surf1}}>
          <div style={{fontSize:48,marginBottom:12}}>⚖️</div>
          <p style={{color:G.t3,marginBottom:16}}>{esAdmin?"Generá los equipos balanceados por atributos.":"El admin aún no generó los equipos."}</p>
          {esAdmin && inscripos.length>=2 && <Btn onClick={generar} style={{display:"inline-block",width:"auto"}}>⚖️ Generar equipos</Btn>}
        </Card>
      )}
      {generado && (
        <>
          {!publicado && esAdmin && <div style={{background:G.secondary+"15",borderRadius:G.r2,padding:"10px 14px",marginBottom:12,fontSize:13,color:G.secondary,fontWeight:600}}>🔒 Solo vos ves esto. Publicá cuando estés listo.</div>}
          {publicado && <div style={{background:G.primary+"12",borderRadius:G.r2,padding:"10px 14px",marginBottom:12,fontSize:13,color:G.primary,fontWeight:600}}>✅ Equipos publicados para todos</div>}
          {(publicado||esAdmin) && <div style={{display:"flex",gap:10,marginBottom:14}}><EqCol ids={eqO} nom="o" color="#555" /><EqCol ids={eqB} nom="b" color="#888" /></div>}
          {!publicado && esAdmin && <><Btn v="ghost" onClick={generar} full style={{marginBottom:8}}>🔄 Re-generar</Btn><Btn v="secondary" onClick={publicar} full>✅ Publicar equipos</Btn></>}
          {publicado && esAdmin && <Btn v="ghost" onClick={()=>{setPublicado(false);setGenerado(false);}} full>🔄 Re-hacer equipos</Btn>}
          {!publicado && !esAdmin && <Card style={{textAlign:"center",color:G.t3,padding:24}}>⏳ El admin está preparando los equipos...</Card>}
          <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
        </>
      )}
    </div>
  );
}

// ── VOTAR ─────────────────────────────────────────────────────────────────────
function PVotar({ comunidad, partido, user }) {
  const [asignados,setAsignados]=useState([]); const [notas,setNotas]=useState({});
  const [mvp,setMvp]=useState(null); const [paso,setPaso]=useState(0);
  const [votosSnap,setVotosSnap]=useState({}); const [jugData,setJugData]=useState({});
  const [msg,setMsg]=useState(""); const [enviado,setEnviado]=useState(false);

  useEffect(()=>{
    if(!partido)return;
    const unsub=onSnapshot(rVots(partido.id),s=>setVotosSnap(s.exists()?s.data():{}));
    return unsub;
  },[partido?.id]);

  useEffect(()=>{
    const load=async()=>{
      if(!partido)return;
      const obj={};
      for(const id of partido.inscriptos||[]){
        if(id.startsWith("inv_")){obj[id]=partido.invitados?.[id]||{nombre:"Invitado"};continue;}
        const s=await getDoc(rUser(id));if(s.exists())obj[id]=s.data();
      }
      setJugData(obj);
      // Auto-login: el jugador ya está logueado
      const misAsig=(partido.votacionesAsignadas||{})[user.dni]||[];
      setAsignados(misAsig);
      const init={};
      misAsig.forEach(id=>{init[id]={};ATTRS.forEach(a=>{init[id][a.key]=null;});});
      setNotas(init);
    };
    load();
  },[partido?.id]);

  const jugadores=(partido?.inscriptos||[]).filter(id=>!id.startsWith("inv_"));
  const yaVotaron=Object.keys(votosSnap);
  const yoVote=yaVotaron.includes(user.dni);
  const todosVotaron=yaVotaron.length>=jugadores.length&&jugadores.length>0;
  const horas=partido?.fechaFin?horasRestantes(partido.fechaFin):null;
  const tiempoVencido=horas!==null&&horas<=0;
  const esAdmin=(comunidad.admins||[]).includes(user.dni);

  if(!partido?.finalizado) return (
    <div style={{padding:20}}>
      <Card style={{textAlign:"center",padding:32,background:G.surf1}}>
        <div style={{fontSize:48,marginBottom:12}}>⏳</div>
        <p style={{color:G.t3}}>Las votaciones abren cuando el admin finalice el partido.</p>
      </Card>
    </div>
  );

  async function enviar(){
    for(const id of asignados){ for(const a of ATTRS){ if(notas[id]?.[a.key]===undefined||notas[id]?.[a.key]===null){setMsg(`Votá ${a.label} de ${jugData[id]?.nombre||id}`);return;} } }
    if(!mvp){setMsg("Elegí el MVP");return;}
    await setDoc(rVots(partido.id),{[user.dni]:true},{merge:true});
    const notasAc={...(partido.notasAtributos||{})};
    asignados.forEach(id=>{
      if(!notasAc[id])notasAc[id]={};
      ATTRS.forEach(a=>{
        if(!notasAc[id][a.key])notasAc[id][a.key]={suma:0,cant:0};
        notasAc[id][a.key].suma+=notas[id][a.key];
        notasAc[id][a.key].cant+=1;
      });
    });
    const mvpC={...(partido.mvpConteo||{}),[mvp]:((partido.mvpConteo||{})[mvp]||0)+1};
    await setDoc(rPart(partido.id),{notasAtributos:notasAc,mvpConteo:mvpC},{merge:true});
    setEnviado(true);setMsg("✓ Votos enviados anónimamente");
  }

  async function cerrarVotacion(){
    if(!confirm("¿Cerrar la votación y guardar resultados?"))return;
    const notasAc=partido.notasAtributos||{};
    const mvpC=partido.mvpConteo||{};
    const mvpId=Object.keys(mvpC).length?Object.keys(mvpC).reduce((a,b)=>mvpC[a]>mvpC[b]?a:b):null;
    for(const id of jugadores){
      const s=await getDoc(rUser(id));if(!s.exists())continue;
      const j=s.data();
      const attrsAnt={...j.atributos||{}};
      const nuevos={...j.atributos||{}};
      ATTRS.forEach(a=>{
        const n=notasAc[id]?.[a.key];
        if(n&&n.cant>0){
          // prom es entre -1 y 1 (promedio de votos -1/0/+1)
          const prom=n.suma/n.cant;
          const actual=nuevos[a.key]||5;
          // delta máximo ±0.25, escalado por el promedio de votos
          const delta = Math.min(0.25, Math.max(-0.25, prom * 0.25));
          nuevos[a.key]=Math.min(10,Math.max(1,+(actual+delta).toFixed(2)));
        }
      });
      const evs=(partido.eventos||{})[id]||{};
      await setDoc(rUser(id),{atributos:nuevos,atributosAnteriores:attrsAnt,goles:j.goles+(evs.goles||0),partidos:(j.partidos||0)+1,historial:[...(j.historial||[]),{fecha:new Date().toLocaleDateString("es-AR"),mvp:id===mvpId,eventos:{goles:evs.goles||0,amarillas:evs.amarillas||0}}]},{merge:true});
    }
    // Resultado automático desde goles por equipo
    let resultado="";
    if(partido.equipos){
      const golesO=(partido.equipos.oscuro||[]).reduce((s,id)=>s+((partido.eventos||{})[id]?.goles||0),0);
      const golesB=(partido.equipos.blanco||[]).reduce((s,id)=>s+((partido.eventos||{})[id]?.goles||0),0);
      if(golesO>golesB) resultado=`🖤 Oscuro ganó ${golesO}-${golesB}`;
      else if(golesB>golesO) resultado=`🤍 Blanco ganó ${golesB}-${golesO}`;
      else resultado=`Empate ${golesO}-${golesB}`;
    }
    const comSnap=await getDoc(rCom(comunidad.id));
    const hist=[...(comSnap.data()?.historialPartidos||[]),{fecha:partido.fechaFin,lugar:partido.lugar,formato:partido.formato,equipos:partido.equipos||null,eventos:partido.eventos||{},mvp:mvpId,jugadores,invitados:partido.invitados||{},resultado}];
    await setDoc(rCom(comunidad.id),{historialPartidos:hist,partidoActivo:null},{merge:true});
    await deleteDoc(rPart(partido.id));
    setMsg("✓ ¡Resultados guardados!");
  }

  const puedeVotar=asignados.length>0&&!yoVote&&!tiempoVencido&&jugadores.includes(user.dni);
  const compActual=asignados[paso];

  return (
    <div style={{padding:20}}>
      <STitle>Votaciones</STitle>

      {/* Barra progreso */}
      <Card accent={G.secondary+"40"}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontWeight:700,fontSize:14,color:G.secondary}}>🔒 Votaciones anónimas</span>
          <span style={{fontSize:13,color:G.t3}}>{yaVotaron.length}/{jugadores.length} votaron</span>
        </div>
        <div style={{height:6,background:G.surf2,borderRadius:4}}>
          <div style={{width:`${(yaVotaron.length/Math.max(jugadores.length,1))*100}%`,height:"100%",background:G.secondary,borderRadius:4,transition:"width .5s"}} />
        </div>
        {horas!==null && (
          <div style={{marginTop:8,fontSize:12,fontWeight:600,color:tiempoVencido?G.danger:G.warn}}>
            {tiempoVencido?"⏰ Tiempo de votación vencido":`⏳ ${horas}h restantes para votar`}
          </div>
        )}
      </Card>

      {yoVote || enviado ? (
        <Card style={{textAlign:"center",padding:24,background:G.secondary+"10"}}>
          <div style={{fontSize:48,marginBottom:8}}>✅</div>
          <p style={{fontWeight:700,color:G.secondary}}>Ya enviaste tus votos</p>
          <p style={{color:G.t3,fontSize:13,marginTop:4}}>Gracias por participar</p>
        </Card>
      ) : !jugadores.includes(user.dni) ? (
        <Card style={{textAlign:"center",padding:24,background:G.surf1}}>
          <p style={{color:G.t3}}>Solo los jugadores del partido pueden votar.</p>
        </Card>
      ) : tiempoVencido ? (
        <Card style={{textAlign:"center",padding:24}}><p style={{color:G.danger,fontWeight:700}}>⏰ El tiempo de votación venció.</p></Card>
      ) : asignados.length===0 ? (
        <Card style={{textAlign:"center",padding:24,background:G.surf1}}><p style={{color:G.t3}}>No tenés compañeros asignados para votar.</p></Card>
      ) : (
        <Card>
          {/* Progress dots */}
          <div style={{display:"flex",gap:6,marginBottom:16}}>
            {asignados.map((_,i)=>(
              <div key={i} onClick={()=>setPaso(i)} style={{flex:1,height:5,borderRadius:3,background:i<=paso?G.primary:G.surf2,cursor:"pointer",transition:"background .2s"}} />
            ))}
          </div>
          <p style={{fontSize:12,color:G.t3,textAlign:"center",marginBottom:14}}>Compañero {paso+1} de {asignados.length}</p>

          {compActual && jugData[compActual] && (
            <>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18,padding:"14px 16px",background:G.surf1,borderRadius:G.r2}}>
                <Av nom={jugData[compActual].nombre} foto={jugData[compActual].foto} size={48} />
                <div>
                  <div style={{fontWeight:800,fontSize:17}}>{jugData[compActual].nombre}</div>
                  {jugData[compActual].apodo && <div style={{color:G.primary,fontSize:13}}>"{jugData[compActual].apodo}"</div>}
                  <div style={{color:G.t3,fontSize:12,marginTop:2}}>¿Cómo jugó hoy?</div>
                </div>
              </div>

              <p style={{fontSize:11,color:G.t3,marginBottom:12,textAlign:"center",background:G.surf1,borderRadius:G.r1,padding:"8px 12px"}}>
                👍 Mejor que siempre &nbsp;·&nbsp; ➡️ Como siempre &nbsp;·&nbsp; 👎 Menos que siempre
              </p>
              {ATTRS.map(a=>{
                const voto=notas[compActual]?.[a.key]??null;
                const opts=[{v:1,icon:"👍",color:G.secondary},{v:0,icon:"➡️",color:G.t3},{v:-1,icon:"👎",color:G.danger}];
                return (
                  <div key={a.key} style={{marginBottom:8,padding:"10px 14px",background:G.surf1,borderRadius:G.r2,display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:18}}>{a.icon}</span>
                    <span style={{flex:1,fontWeight:700,fontSize:13}}>{a.label}</span>
                    <div style={{display:"flex",gap:6}}>
                      {opts.map(o=>(
                        <button key={o.v} onClick={()=>setNotas(p=>({...p,[compActual]:{...p[compActual],[a.key]:o.v}}))}
                          style={{width:42,height:42,borderRadius:G.r2,border:`2px solid ${voto===o.v?o.color:"#DDE3F0"}`,background:voto===o.v?o.color+"25":"transparent",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                          {o.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div style={{display:"flex",gap:8,marginTop:16}}>
                {paso>0 && <Btn v="ghost" onClick={()=>setPaso(p=>p-1)} full>← Anterior</Btn>}
                {paso<asignados.length-1 && <Btn onClick={()=>setPaso(p=>p+1)} full>Siguiente →</Btn>}
              </div>
            </>
          )}

          {paso===asignados.length-1 && (
            <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid #EEF0F8"}}>
              <h3 style={{fontWeight:700,marginBottom:12}}>🥇 MVP del partido</h3>
              {(partido.inscriptos||[]).filter(id=>id!==user.dni).map(id=>{
                const j=jugData[id];if(!j)return null;
                return (
                  <div key={id} onClick={()=>setMvp(id)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:G.r2,cursor:"pointer",marginBottom:6,border:`1.5px solid ${mvp===id?G.gold:"#EEF0F8"}`,background:mvp===id?G.gold+"12":G.surf0,transition:"all .15s"}}>
                    <Av nom={j.nombre} foto={j.foto} size={30} />
                    <span style={{flex:1,fontWeight:600,fontSize:13}}>{j.nombre}</span>
                    {mvp===id && <span style={{color:G.gold,fontSize:18}}>⭐</span>}
                  </div>
                );
              })}
              <Btn v="secondary" onClick={enviar} full style={{marginTop:12}}>✅ Enviar votos</Btn>
              <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
            </div>
          )}
        </Card>
      )}

      {/* Cerrar votación — solo admin */}
      {/* Panel quién votó / falta — visible para todos */}
      <Card>
        <h3 style={{fontWeight:700,marginBottom:12,fontSize:14}}>📋 Estado de votaciones</h3>
        {jugadores.map(id=>{
          const j=jugData[id]; if(!j) return null;
          const voto=yaVotaron.includes(id);
          return (
            <div key={id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #EEF0F8"}}>
              <Av nom={j.nombre} foto={j.foto} size={30} />
              <span style={{flex:1,fontSize:13,fontWeight:600}}>{j.nombre}</span>
              {voto
                ? <Chip color={G.secondary}>✅ Votó</Chip>
                : <Chip color={G.t3}>⏳ Pendiente</Chip>}
            </div>
          );
        })}
      </Card>

      {esAdmin && partido.finalizado && (
        <Btn v="warn" onClick={cerrarVotacion} full style={{marginTop:8}}>🏆 Cerrar votación y guardar resultados</Btn>
      )}
    </div>
  );
}

// ── HISTORIAL ─────────────────────────────────────────────────────────────────
function PHistorial({ comunidad, esAdmin }) {
  const [historial,setHistorial]=useState([]); const [jugData,setJugData]=useState({});
  const [expandido,setExpandido]=useState(null); const [editando,setEditando]=useState(null);
  const [resultado,setResultado]=useState("");

  useEffect(()=>{
    const load=async()=>{
      const s=await getDoc(rCom(comunidad.id));if(!s.exists())return;
      const h=[...(s.data().historialPartidos||[])].reverse();
      setHistorial(h);
      const dnis=new Set();h.forEach(p=>(p.jugadores||[]).forEach(d=>dnis.add(d)));
      const obj={};for(const d of dnis){const s2=await getDoc(rUser(d));if(s2.exists())obj[d]=s2.data();}
      setJugData(obj);
    };
    load();
  },[comunidad.id]);

  async function guardarResultado(idx){
    const comSnap=await getDoc(rCom(comunidad.id));
    const hist=[...(comSnap.data()?.historialPartidos||[])];
    // idx es índice en historial invertido
    const realIdx=hist.length-1-idx;
    hist[realIdx]={...hist[realIdx],resultado};
    await setDoc(rCom(comunidad.id),{historialPartidos:hist},{merge:true});
    setHistorial(prev=>prev.map((p,i)=>i===idx?{...p,resultado}:p));
    setEditando(null);
  }

  return (
    <div style={{padding:20}}>
      <STitle>Historial</STitle>
      {historial.length===0 && <Card style={{textAlign:"center",padding:32,background:G.surf1}}><div style={{fontSize:48,marginBottom:12}}>📜</div><p style={{color:G.t3}}>Todavía no hay partidos finalizados.</p></Card>}
      {historial.map((p,i)=>(
        <Card key={i} accent={expandido===i?G.primary+"30":undefined}>
          <div onClick={()=>setExpandido(expandido===i?null:i)} style={{cursor:"pointer"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15}}>{new Date(p.fecha).toLocaleDateString("es-AR",{weekday:"short",day:"numeric",month:"short"})}</div>
                <div style={{color:G.t3,fontSize:12,marginTop:2}}>📍 {p.lugar||"—"} · {p.formato||"—"}</div>
                {p.resultado && <div style={{marginTop:4,fontSize:13,fontWeight:600,color:G.primary}}>🏆 {p.resultado}</div>}
              </div>
              {p.mvp && jugData[p.mvp] && <Chip color={G.gold}>🥇 {jugData[p.mvp].nombre?.split(" ")[0]}</Chip>}
              <span style={{color:G.t3,fontSize:18}}>{expandido===i?"∧":"∨"}</span>
            </div>
          </div>
          {expandido===i && (
            <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #EEF0F8"}}>
              {/* Resultado editable */}
              {/* Resultado — solo admin puede editar */}
              {esAdmin && (editando===i ? (
                <div style={{marginBottom:14}}>
                  <Inp label="Resultado del partido" value={resultado} onChange={e=>setResultado(e.target.value)} placeholder='Ej: "Oscuro ganó 4-2"' />
                  <div style={{display:"flex",gap:8}}>
                    <Btn onClick={()=>guardarResultado(i)} full>Guardar</Btn>
                    <Btn v="ghost" onClick={()=>setEditando(null)} full>Cancelar</Btn>
                  </div>
                </div>
              ):(
                <button onClick={()=>{setEditando(i);setResultado(p.resultado||"");}} style={{background:G.surf1,border:"none",borderRadius:G.r1,padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:600,color:G.primary,marginBottom:12,width:"100%",textAlign:"left"}}>
                  ✏️ {p.resultado?"Editar resultado":"+ Editar resultado"}
                </button>
              ))}

              {/* Equipos */}
              {p.equipos && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  {[{label:"🖤 Oscuro",ids:p.equipos.oscuro||[],c:"#555"},{label:"🤍 Blanco",ids:p.equipos.blanco||[],c:"#888"}].map(eq=>(
                    <div key={eq.label} style={{background:G.surf1,borderRadius:G.r2,padding:12}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:eq.c}}>{eq.label}</div>
                      {eq.ids.map(id=>{
                        const j=jugData[id]||p.invitados?.[id];if(!j)return null;
                        const evs=(p.eventos||{})[id]||{};
                        return (
                          <div key={id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                            <Av nom={j.nombre} foto={j.foto} size={24} />
                            <div style={{flex:1,fontSize:12,fontWeight:600}}>{j.nombre}</div>
                            <div style={{display:"flex",gap:4}}>
                              {evs.goles>0 && <span style={{fontSize:11,background:"#EEF0F8",borderRadius:4,padding:"1px 5px"}}>⚽{evs.goles}</span>}
                              {evs.amarillas>0 && <span style={{fontSize:11,background:"#FFF9E0",borderRadius:4,padding:"1px 5px"}}>🟨{evs.amarillas}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {p.mvp && jugData[p.mvp] && (
                <div style={{padding:"10px 14px",background:G.gold+"15",borderRadius:G.r2,display:"flex",alignItems:"center",gap:8}}>
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
function PStats({ comunidad, user, esAdmin }) {
  const [jugadores,setJugadores]=useState([]); const [loading,setLoading]=useState(true);
  const [expandido,setExpandido]=useState(null);

  useEffect(()=>{
    const load=async()=>{
      const arr=[];
      for(const dni of comunidad.miembros||[]){const s=await getDoc(rUser(dni));if(s.exists())arr.push(s.data());}
      arr.sort((a,b)=>(b.partidos||0)-(a.partidos||0));
      setJugadores(arr);setLoading(false);
    };
    load();
  },[comunidad.id]);

  if(loading) return <div style={{padding:20}}><Spinner /></div>;

  const thStyle={padding:"10px 8px",fontWeight:700,fontSize:11,color:G.t3,textAlign:"center",borderBottom:`2px solid ${G.surf2}`,whiteSpace:"nowrap"};
  const tdStyle={padding:"10px 8px",fontSize:13,textAlign:"center",borderBottom:`1px solid ${G.surf2}`};

  return (
    <div style={{padding:20}}>
      <STitle>Estadísticas</STitle>

      {/* TABLA PRINCIPAL */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:340}}>
            <thead style={{background:G.surf1}}>
              <tr>
                <th style={{...thStyle,textAlign:"left",paddingLeft:14}}>#</th>
                <th style={{...thStyle,textAlign:"left"}}>Jugador</th>
                <th style={thStyle}>🏟️</th>
                <th style={thStyle}>⚽</th>
                <th style={thStyle}>⚽/PJ</th>
                <th style={thStyle}>🥇</th>
                <th style={thStyle}>🟨</th>
              </tr>
            </thead>
            <tbody>
              {jugadores.map((j,i)=>{
                const partidos=j.partidos||0;
                const goles=(j.historial||[]).reduce((s,h)=>s+(h.eventos?.goles||0),0);
                const mvps=(j.historial||[]).filter(h=>h.mvp).length;
                const amarillas=(j.historial||[]).reduce((s,h)=>s+(h.eventos?.amarillas||0),0);
                const golPJ=partidos>0?(goles/partidos).toFixed(1):"—";
                return (
                  <tr key={j.dni} onClick={()=>setExpandido(expandido===j.dni?null:j.dni)}
                    style={{cursor:"pointer",background:expandido===j.dni?G.primary+"08":"transparent",transition:"background .15s"}}>
                    <td style={{...tdStyle,textAlign:"left",paddingLeft:14}}>
                      <span style={{fontWeight:900,color:i<3?G.gold:G.t3,fontSize:12}}>#{i+1}</span>
                    </td>
                    <td style={{...tdStyle,textAlign:"left"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <Av nom={j.nombre} foto={j.foto} size={28} />
                        <div>
                          <div style={{fontWeight:700,fontSize:13,lineHeight:1.2}}>{j.nombre.split(" ")[0]}</div>
                          {j.apodo && <div style={{color:G.primary,fontSize:10}}>"{j.apodo}"</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{...tdStyle,fontWeight:700,color:G.t1}}>{partidos}</td>
                    <td style={{...tdStyle,fontWeight:700,color:goles>0?G.secondary:G.t3}}>{goles}</td>
                    <td style={{...tdStyle,color:G.t2}}>{golPJ}</td>
                    <td style={{...tdStyle,fontWeight:700,color:mvps>0?G.gold:G.t3}}>{mvps||"—"}</td>
                    <td style={{...tdStyle,color:amarillas>0?G.warn:G.t3}}>{amarillas||"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{padding:"8px 14px",background:G.surf1,fontSize:11,color:G.t3,textAlign:"center"}}>
          🏟️ Partidos · ⚽ Goles · ⚽/PJ Goles por partido · 🥇 MVPs · 🟨 Amarillas
        </div>
      </Card>

      {/* DETALLE EXPANDIBLE */}
      {expandido && (()=>{
        const j=jugadores.find(x=>x.dni===expandido);
        if(!j)return null;
        return (
          <Card accent={G.primary+"30"}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <Av nom={j.nombre} foto={j.foto} size={44} />
              <div>
                <div style={{fontWeight:800,fontSize:16}}>{j.nombre}</div>
                {j.apodo && <div style={{color:G.primary,fontSize:12}}>"{j.apodo}"</div>}
              </div>
            </div>

            {/* Stats detalladas */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {[
                {l:"Partidos jugados",v:j.partidos||0,i:"🏟️"},
                {l:"Goles totales",v:(j.historial||[]).reduce((s,h)=>s+(h.eventos?.goles||0),0),i:"⚽"},
                {l:"Goles por partido",v:j.partidos>0?((j.historial||[]).reduce((s,h)=>s+(h.eventos?.goles||0),0)/j.partidos).toFixed(1):"—",i:"📈"},
                {l:"MVPs",v:(j.historial||[]).filter(h=>h.mvp).length,i:"🥇"},
                {l:"Amarillas",v:(j.historial||[]).reduce((s,h)=>s+(h.eventos?.amarillas||0),0),i:"🟨"},
                {l:"Último partido",v:(j.historial||[]).slice(-1)[0]?.fecha||"—",i:"📅"},
              ].map(s=>(
                <div key={s.l} style={{background:G.surf1,borderRadius:G.r2,padding:"10px 12px"}}>
                  <div style={{fontSize:11,color:G.t3,marginBottom:2}}>{s.i} {s.l}</div>
                  <div style={{fontWeight:800,fontSize:16,color:G.primary}}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Admin: atributos */}
            {esAdmin && (
              <>
                <div style={{fontSize:11,color:G.warn,fontWeight:700,marginBottom:8}}>👑 PUNTAJES (Admin)</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {ATTRS.map(a=>(
                    <div key={a.key} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:G.surf1,borderRadius:G.r1}}>
                      <span>{a.icon}</span>
                      <span style={{flex:1,fontSize:11,color:G.t2}}>{a.label}</span>
                      <span style={{fontWeight:800,color:G.primary,fontSize:13}}>{((j.atributos||{})[a.key]||0).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:G.primary+"12",borderRadius:G.r1,marginTop:8}}>
                  <span style={{fontWeight:700,fontSize:12}}>Promedio general</span>
                  <span style={{fontWeight:900,color:G.primary}}>{calcProm(j.atributos||{}).toFixed(2)}</span>
                </div>
              </>
            )}
          </Card>
        );
      })()}
    </div>
  );
}

// ── SUPER ADMIN ───────────────────────────────────────────────────────────────
function PSuperAdmin() {
  const [usuarios,setUsuarios]=useState([]); const [loading,setLoading]=useState(true);
  const [editando,setEditando]=useState(null); const [nom,setNom]=useState(""); const [apodo,setApodo]=useState(""); const [msg,setMsg]=useState("");

  useEffect(()=>{
    const load=async()=>{
      const snap=await getDocs(collection(db,"app8_users"));
      const arr=[];snap.forEach(d=>arr.push({id:d.id,...d.data()}));
      arr.sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||""));
      setUsuarios(arr);setLoading(false);
    };
    load();
  },[]);

  async function guardar(){
    await setDoc(rUser(editando.dni),{nombre:nom.trim(),apodo:apodo.trim()},{merge:true});
    setUsuarios(p=>p.map(u=>u.dni===editando.dni?{...u,nombre:nom.trim(),apodo:apodo.trim()}:u));
    setEditando(null);setMsg("✓ Guardado");setTimeout(()=>setMsg(""),2000);
  }

  if(loading) return <div style={{padding:20}}><Spinner /></div>;

  return (
    <div style={{padding:20}}>
      <STitle sub={`${usuarios.length} usuarios`}>🔑 Super Admin</STitle>
      <Msg ok={true}>{msg}</Msg>
      {usuarios.map(u=>(
        <Card key={u.dni}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Av nom={u.nombre||"?"} foto={u.foto} size={38} />
            <div style={{flex:1}}>
              <div style={{fontWeight:700}}>{u.nombre}</div>
              {u.apodo&&<div style={{color:G.primary,fontSize:12}}>"{u.apodo}"</div>}
              <div style={{color:G.t3,fontSize:11}}>DNI: {u.dni} · {u.partidos||0} partidos</div>
            </div>
            <div style={{textAlign:"right",marginRight:8}}>
              <div style={{fontWeight:800,color:G.primary,fontSize:14}}>{calcProm(u.atributos||{}).toFixed(1)}</div>
              <div style={{fontSize:10,color:G.t3}}>prom</div>
            </div>
            <Btn sm v="soft" onClick={()=>{setEditando(u);setNom(u.nombre||"");setApodo(u.apodo||"");}}>✏️</Btn>
          </div>
          {editando?.dni===u.dni&&(
            <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #EEF0F8"}}>
              <Inp label="Nombre" value={nom} onChange={e=>setNom(e.target.value)} />
              <Inp label="Apodo" value={apodo} onChange={e=>setApodo(e.target.value)} />
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={guardar} full>Guardar</Btn>
                <Btn v="ghost" onClick={()=>setEditando(null)} full>Cancelar</Btn>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
