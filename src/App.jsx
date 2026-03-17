import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, getDocs, deleteDoc } from 'firebase/firestore';
const LOGO_IMG = "data:image/jpeg;base64,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";


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
  { key:"velocidad",   label:"Velocidad",   icon:"⚡", ej:"corrió" },
  { key:"pases",       label:"Pases",       icon:"🎯", ej:"pasó la pelota" },
  { key:"definicion",  label:"Definición",  icon:"🥅", ej:"definió" },
  { key:"amagues",     label:"Amagues",     icon:"🕺", ej:"gambeteó" },
  { key:"defensa",     label:"Defensa",     icon:"🛡️", ej:"defendió" },
  { key:"resistencia", label:"Resistencia", icon:"💪", ej:"aguantó físicamente" },
  { key:"arquero",     label:"Arquero",     icon:"🧤", ej:"atajó" },
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
function calcPuntos(historial) {
  // 3 pts ganado, 1 empate, 0 perdido — inferido del campo mvp/resultado del historial
  // Se guarda en historial como {resultado: "ganado"|"empatado"|"perdido"}
  return (historial||[]).reduce((s,h)=>{
    if(h.resultado==="ganado") return s+3;
    if(h.resultado==="empatado") return s+1;
    return s;
  },0);
}
function balancear(lista) {
  const s = [...lista].sort((a,b)=>calcProm(b.atributos)-calcProm(a.atributos));
  const o=[],b=[];
  s.forEach((j,i)=>(i%2===0?o:b).push(j));
  // Mezclar orden de display para no revelar ranking por puntaje
  const shuffle = arr => [...arr].sort(()=>Math.random()-.5);
  return {oscuro:shuffle(o), blanco:shuffle(b)};
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

function Spinner({ size=110, msg="Cargando..." }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:20,padding:40}}>
      <div style={{position:"relative",width:size+16,height:size+16}}>
        {/* Anillo giratorio */}
        <svg width={size+16} height={size+16} viewBox="0 0 126 126" style={{position:"absolute",top:0,left:0,animation:"ringspin 1.4s linear infinite"}}>
          <circle cx="63" cy="63" r="58" fill="none" stroke="#EEF0F8" strokeWidth="4"/>
          <circle cx="63" cy="63" r="58" fill="none" stroke="#3D5AFE" strokeWidth="4"
            strokeDasharray="80 284" strokeLinecap="round"/>
        </svg>
        {/* Logo centrado */}
        <div style={{position:"absolute",top:8,left:8,width:size,height:size,borderRadius:size*0.18,overflow:"hidden",boxShadow:"0 6px 24px rgba(61,90,254,0.3)"}}>
          <img src={LOGO_IMG} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="App8"/>
        </div>
      </div>
      <div style={{textAlign:"center"}}>
        <p style={{color:G.t2,fontSize:15,fontWeight:700,margin:0}}>{msg}</p>
        <p style={{color:G.t3,fontSize:12,marginTop:4}}>App8 · Fútbol de los Lunes</p>
      </div>
      <style>{`
        @keyframes ringspin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
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

  if(loading) return <><style>{globalCSS}</style><div style={{background:G.bg,minHeight:"100vh"}}><Spinner msg="Entrando al vestuario..." /></div></>;

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
          <div onClick={()=>{setComActiva(null);setPantalla("home");}} style={{width:36,height:36,borderRadius:12,overflow:"hidden",cursor:"pointer",flexShrink:0,boxShadow:G.sh2}}><img src={LOGO_IMG} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="App8" /></div>
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
        <div style={{width:140,height:140,borderRadius:36,overflow:"hidden",margin:"0 auto 20px",boxShadow:"0 12px 40px rgba(61,90,254,0.35)"}}>
          <img src={LOGO_IMG} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="App8" />
        </div>
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
  const [invitadosSueltos, setInvitadosSueltos] = useState([]);
  const [vincDni, setVincDni]   = useState({});
  const [msgVinc, setMsgVinc]   = useState("");

  const esAdmin=(comunidad.admins||[]).includes(user.dni);
  const esCreador=comunidad.creadorDni===user.dni;

  useEffect(()=>{loadMiembros(); if(esAdmin) cargarInvitadosSueltos();},[comunidad.id]);

  async function cargarInvitadosSueltos(){
    // Recopilar todos los inv_ únicos del historialPartidos de la comunidad
    const hist = comunidad.historialPartidos || [];
    const mapaInv = {};
    for(const p of hist){
      const invs = p.invitados || {};
      for(const [id, data] of Object.entries(invs)){
        if(id.startsWith("inv_") && !mapaInv[id]) mapaInv[id] = data;
      }
    }
    setInvitadosSueltos(Object.entries(mapaInv).map(([id,data])=>({id,...data})));
  }

  async function vincularInvitado(invId){
    const dni = (vincDni[invId]||"").trim();
    if(!dni){setMsgVinc("Ingresá el DNI");return;}

    // Verificar que el DNI existe en la app
    const userSnap = await getDoc(rUser(dni));
    if(!userSnap.exists()){setMsgVinc("❌ No existe un usuario con ese DNI");return;}
    const userReal = userSnap.data();

    // Recopilar historial acumulado del invitado desde historialPartidos
    const hist = comunidad.historialPartidos || [];
    const histInv = [];
    for(const p of hist){
      const jugadores = [
        ...(p.equipos?.oscuro||[]),
        ...(p.equipos?.blanco||[]),
      ];
      if(!jugadores.includes(invId)) continue;
      const evs = (p.eventos||{})[invId] || {};
      histInv.push({
        fecha: p.fecha || "",
        mvp: p.mvp === invId,
        resultado: p.resultadoJugadores?.[invId] || "jugado",
        eventos: { goles: evs.goles||0, amarillas: evs.amarillas||0 },
      });
    }

    // Fusionar historial en el usuario real
    const histReal = userReal.historial || [];
    const histFusionado = [...histReal, ...histInv];

    // Actualizar usuario real con historial fusionado y sumar partidos/goles
    const golesExtra = histInv.reduce((s,h)=>s+(h.eventos?.goles||0),0);
    await setDoc(rUser(dni), {
      historial: histFusionado,
      partidos: (userReal.partidos||0) + histInv.length,
      goles: (userReal.goles||0) + golesExtra,
    },{merge:true});

    // Reemplazar inv_ por DNI real en historialPartidos de la comunidad
    const histActualizado = hist.map(p => {
      const nuevoEquipos = {
        oscuro: (p.equipos?.oscuro||[]).map(id=>id===invId?dni:id),
        blanco: (p.equipos?.blanco||[]).map(id=>id===invId?dni:id),
        publicado: p.equipos?.publicado,
      };
      const nuevoEventos = {...(p.eventos||{})};
      if(nuevoEventos[invId]){nuevoEventos[dni]=nuevoEventos[invId];delete nuevoEventos[invId];}
      const nuevoInvitados = {...(p.invitados||{})};
      delete nuevoInvitados[invId];
      const nuevoMvp = p.mvp===invId ? dni : p.mvp;
      return {...p, equipos:nuevoEquipos, eventos:nuevoEventos, invitados:nuevoInvitados, mvp:nuevoMvp};
    });

    await setDoc(rCom(comunidad.id), {historialPartidos: histActualizado},{merge:true});

    // Si no es miembro aún, agregarlo
    if(!(comunidad.miembros||[]).includes(dni)){
      await setDoc(rCom(comunidad.id),{miembros:[...(comunidad.miembros||[]),dni]},{merge:true});
    }

    setMsgVinc(`✓ ${userReal.nombre} vinculado! Se transfirieron ${histInv.length} partido(s).`);
    setVincDni(p=>({...p,[invId]:""}));
    await loadComs();
    await cargarInvitadosSueltos();
    setTimeout(()=>setMsgVinc(""),4000);
  }

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

      {/* Vincular invitados a DNI — solo admin */}
      {esAdmin && invitadosSueltos.length > 0 && (
        <Card accent={G.primary+"20"}>
          <h3 style={{fontWeight:700,marginBottom:4}}>🔗 Vincular invitados a DNI</h3>
          <p style={{fontSize:12,color:G.t3,marginBottom:14}}>Si un invitado se registró en la app, podés vincular su historial a su DNI real para que no pierda partidos ni estadísticas.</p>
          {invitadosSueltos.map(inv=>(
            <div key={inv.id} style={{padding:"12px 0",borderBottom:"1px solid #EEF0F8"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <Av nom={inv.nombre||"?"} size={32} />
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{inv.nombre||"Invitado"}</div>
                  <div style={{fontSize:11,color:G.t3}}>Invitado sin DNI</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <input
                  placeholder="DNI del jugador registrado"
                  value={vincDni[inv.id]||""}
                  onChange={e=>setVincDni(p=>({...p,[inv.id]:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&vincularInvitado(inv.id)}
                  style={{flex:1,padding:"8px 12px",borderRadius:G.r1,border:"1.5px solid #DDE3F0",background:G.surf0,fontSize:14,fontFamily:"'Outfit',sans-serif"}}
                />
                <Btn sm onClick={()=>vincularInvitado(inv.id)} style={{whiteSpace:"nowrap"}}>Vincular</Btn>
              </div>
            </div>
          ))}
          <Msg ok={msgVinc?.startsWith("✓")} style={{marginTop:10}}>{msgVinc}</Msg>
        </Card>
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
      const nombre = j?.nombre || (id.startsWith("inv_") ? "Invitado" : "?");
      const inv = (j?.esInvitado || id.startsWith("inv_")) ? " (inv.)" : "";
      return `${i+1}. ${nombre}${inv}`;
    }).join("\n");

    const cena = partido.cena || [];
    const listaCena = cena.map((id,i) => {
      const j = jugData[id];
      const nombre = j?.nombre || id;
      return `${i+1}. ${nombre}`;
    }).join("\n");

    const APP_URL = window.location.origin;
    const lineas = [
      `*${comunidad?.nombre||"Futbol"}*`,
      `Fecha: ${partido.fecha||""} | Hora: ${partido.hora||""}`,
      `Lugar: ${partido.lugar||""}`,
      `Formato: ${partido.formato||""}`,
      "",
      `*Inscriptos (${inscripos?.length||0}):*`,
      lista || "Nadie anotado aun",
    ];

    if (cena.length > 0) {
      lineas.push("");
      lineas.push(`*Se quedan a comer (${cena.length}):*`);
      lineas.push(listaCena);
    }

    lineas.push("");
    lineas.push(`_Anotate en App8: ${APP_URL}_`);

    const textoFinal = lineas.join("\n");

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textoFinal).then(()=>{
        alert("Texto copiado al portapapeles!\nPega el mensaje en WhatsApp.");
        window.open("https://wa.me/", "_blank");
      });
    } else {
      window.open("https://wa.me/?text=" + encodeURIComponent(textoFinal), "_blank");
    }
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
  const [nomInv,setNomInv]=useState(""); const [nivelInv,setNivelInv]=useState(5); const [msg,setMsg]=useState(""); const [invMsg,setInvMsg]=useState("");
  const [invitadosHistorial,setInvitadosHistorial]=useState([]);

  // Cargar invitados previos del historial para el desplegable — excluir miembros actuales
  useEffect(()=>{
    const load = async () => {
      const hist = comunidad.historialPartidos || [];
      const mapa = {};
      hist.forEach(p=>Object.entries(p.invitados||{}).forEach(([id,data])=>{
        if(id.startsWith("inv_")&&data.nombre&&!mapa[data.nombre]) mapa[data.nombre]=data;
      }));
      // Cargar nombres de miembros actuales para filtrarlos (nombre completo y parcial)
      const nombresMiembros = new Set();
      for(const dni of comunidad.miembros||[]){
        const s = await getDoc(rUser(dni));
        if(s.exists()){
          const nom = s.data().nombre?.toLowerCase().trim() || "";
          nombresMiembros.add(nom);
          // También agregar primer nombre y primer apellido por separado
          const partes = nom.split(" ");
          if(partes[0]) nombresMiembros.add(partes[0]);
          if(partes[1]) nombresMiembros.add(partes[0]+" "+partes[1]);
        }
      }
      const lista = Object.entries(mapa)
        .map(([nombre,data])=>({nombre,...data}))
        .filter(inv=>{
          const n = inv.nombre?.toLowerCase().trim() || "";
          // Excluir si el nombre del invitado coincide exactamente con algún miembro
          // o si algún miembro empieza con ese nombre
          if(nombresMiembros.has(n)) return false;
          for(const nom of nombresMiembros){ if(nom.startsWith(n)||n.startsWith(nom)) return false; }
          return true;
        });
      setInvitadosHistorial(lista);
    };
    load();
  },[comunidad.id]);
  const [jugData,setJugData]=useState({});

  const esAdmin=(comunidad.admins||[]).includes(user.dni);
  const fmtObj=FORMATOS.find(f=>f.label===partido?.formato);
  const cupo=fmtObj?.total||0;
  const inscripos=partido?.inscriptos||[];
  const cupoLibre=cupo-inscripos.length;
  const yoAnotado=inscripos.includes(user.dni);

  useEffect(()=>{if(partido){setFecha(partido.fecha||"");setHora(partido.hora||"");setLugar(partido.lugar||"");setFormato(partido.formato||"");}},[partido?.id]);
  const [jugLoading,setJugLoading]=useState(false);
  useEffect(()=>{
    const load=async()=>{
      if(!partido)return;
      setJugLoading(true);
      const obj={};
      for(const id of inscripos){
        if(id.startsWith("inv_")){obj[id]=partido.invitados?.[id];continue;}
        const s=await getDoc(rUser(id));if(s.exists())obj[id]=s.data();
      }
      setJugData(obj);
      setJugLoading(false);
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
    // Construir atributos con el nivel elegido para el balanceo
    const nivel=Number(nivelInv)||5;
    const atributos=Object.fromEntries(ATTRS.map(a=>[a.key,nivel]));
    await setDoc(rPart(partido.id),{invitados:{...(partido.invitados||{}),[id]:{nombre:nomInv.trim(),esInvitado:true,atributos}},inscriptos:[...inscripos,id]},{merge:true});
    setNomInv("");setNivelInv(5);setInvMsg("✓ Invitado agregado");setTimeout(()=>setInvMsg(""),2000);
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

      {/* Quedarse a comer */}
      {(() => {
        const cena = partido.cena || [];
        const yoEnCena = cena.includes(user.dni);
        async function anotarCena() {
          await setDoc(rPart(partido.id),{cena:[...cena, user.dni]},{merge:true});
        }
        async function salirCena() {
          await setDoc(rPart(partido.id),{cena:cena.filter(d=>d!==user.dni)},{merge:true});
        }
        return (
          <Card accent={"#FF6D0030"}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:24}}>🍕</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15}}>¿Te quedás a comer?</div>
                <div style={{fontSize:12,color:G.t3}}>Abierto a todos, no hace falta jugar</div>
              </div>
              <Chip color={G.warn}>{cena.length} confirmados</Chip>
            </div>
            {yoEnCena
              ? <><div style={{color:G.warn,fontWeight:700,marginBottom:8,fontSize:14}}>🍕 ¡Te anotaste a comer!</div><Btn v="ghost" onClick={salirCena} full>Ya no me quedo</Btn></>
              : <Btn v="warn" onClick={anotarCena} full>Me quedo a comer</Btn>}
            {cena.length > 0 && (
              <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid #EEF0F8"}}>
                <div style={{fontSize:12,color:G.t3,marginBottom:8,fontWeight:600}}>Confirmados:</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {cena.map(id=>{
                    const j=jugData[id];
                    if(!j) return <Chip key={id} color={G.warn}>{id}</Chip>;
                    return <Chip key={id} color={G.warn}>{j.nombre?.split(" ")[0]}</Chip>;
                  })}
                </div>
              </div>
            )}
          </Card>
        );
      })()}

      {/* Lista */}
      <Card>
        <h3 style={{fontWeight:700,marginBottom:14}}>👥 Inscriptos ({inscripos.length}/{cupo})</h3>
        {jugLoading
          ? <div style={{padding:"20px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
              <div style={{animation:"bounce 1s ease-in-out infinite"}}>⚽</div>
              <p style={{color:G.t3,fontSize:13}}>Cargando inscriptos...</p>
            </div>
          : inscripos.length===0
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

            {/* Desplegable de invitados previos */}
            {invitadosHistorial.length > 0 && (
              <div style={{marginBottom:10}}>
                <label style={{fontSize:12,color:G.t3,fontWeight:600,display:"block",marginBottom:6}}>Invitado que ya vino antes</label>
                <select
                  onChange={e=>{
                    const sel = invitadosHistorial.find(x=>x.nombre===e.target.value);
                    if(sel){
                      setNomInv(sel.nombre);
                      // Pre-cargar nivel si tiene atributos guardados
                      const prom = sel.atributos ? calcProm(sel.atributos) : 5;
                      setNivelInv(prom||5);
                    } else {
                      setNomInv("");
                    }
                  }}
                  style={{width:"100%",padding:"10px 12px",borderRadius:G.r1,border:"1.5px solid #DDE3F0",background:G.surf0,fontSize:14,fontFamily:"'Outfit',sans-serif",color:G.t1,marginBottom:6}}
                >
                  <option value="">— Elegir invitado anterior —</option>
                  {invitadosHistorial.map(inv=>(
                    <option key={inv.nombre} value={inv.nombre}>{inv.nombre}</option>
                  ))}
                </select>
                <div style={{fontSize:11,color:G.t3,textAlign:"center",marginBottom:8}}>— o escribí un nombre nuevo —</div>
              </div>
            )}

            <Inp value={nomInv} onChange={e=>setNomInv(e.target.value)} placeholder='"Amigo de Juan"' onKeyDown={e=>e.key==="Enter"&&agregarInvitado()} />
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,color:G.t3,fontWeight:600,display:"block",marginBottom:6}}>Nivel del jugador (para balanceo de equipos)</label>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <input type="range" min={1} max={10} step={0.5} value={nivelInv} onChange={e=>setNivelInv(e.target.value)}
                  style={{flex:1,accentColor:G.primary}} />
                <div style={{minWidth:36,background:G.primary,color:"#fff",borderRadius:8,padding:"4px 8px",fontWeight:700,fontSize:14,textAlign:"center"}}>
                  {nivelInv}
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:G.t3,marginTop:2}}>
                <span>Principiante</span><span>Promedio</span><span>Crack</span>
              </div>
            </div>
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
        if(id.startsWith("inv_")){obj[id]={...partido.invitados?.[id]};continue;}
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

  const [votLoading,setVotLoading]=useState(true);

  useEffect(()=>{
    if(!partido)return;
    const unsub=onSnapshot(rVots(partido.id),s=>setVotosSnap(s.exists()?s.data():{}));
    return unsub;
  },[partido?.id]);

  useEffect(()=>{
    const load=async()=>{
      if(!partido)return;
      setVotLoading(true);
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
      setVotLoading(false);
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

  if(votLoading) return <div style={{padding:20}}><Spinner msg="Preparando las votaciones..." /></div>;
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

    // Guard: verificar que el partido sigue activo antes de proceder
    const partSnap = await getDoc(rPart(partido.id));
    if(!partSnap.exists()){setMsg("❌ El partido ya fue cerrado");return;}

    const notasAc=partido.notasAtributos||{};
    const mvpC=partido.mvpConteo||{};
    const mvpId=Object.keys(mvpC).length?Object.keys(mvpC).reduce((a,b)=>mvpC[a]>mvpC[b]?a:b):null;

    // Calcular resultado global
    let resultado="";
    let golesO=0, golesB=0;
    if(partido.equipos){
      golesO=(partido.equipos.oscuro||[]).reduce((s,id)=>s+((partido.eventos||{})[id]?.goles||0),0);
      golesB=(partido.equipos.blanco||[]).reduce((s,id)=>s+((partido.eventos||{})[id]?.goles||0),0);
      if(golesO>golesB) resultado=`Oscuro gano ${golesO}-${golesB}`;
      else if(golesB>golesO) resultado=`Blanco gano ${golesB}-${golesO}`;
      else resultado=`Empate ${golesO}-${golesB}`;
    }
    const getResJug=(id)=>{
      if(!partido.equipos) return "jugado";
      const enOscuro=(partido.equipos.oscuro||[]).includes(id);
      const enBlanco=(partido.equipos.blanco||[]).includes(id);
      if(!enOscuro&&!enBlanco) return "jugado";
      if(golesO===golesB) return "empatado";
      if((enOscuro&&golesO>golesB)||(enBlanco&&golesB>golesO)) return "ganado";
      return "perdido";
    };

    // Loop único: atributos + historial + resultado en una sola escritura por jugador
    for(const id of jugadores){
      const s=await getDoc(rUser(id));if(!s.exists())continue;
      const j=s.data();
      const attrsAnt={...j.atributos||{}};
      const nuevos={...j.atributos||{}};
      ATTRS.forEach(a=>{
        const n=notasAc[id]?.[a.key];
        if(n&&n.cant>0){
          const prom=n.suma/n.cant;
          const actual=nuevos[a.key]||5;
          const delta=Math.min(0.25,Math.max(-0.25,prom*0.25));
          nuevos[a.key]=Math.min(10,Math.max(1,+(actual+delta).toFixed(2)));
        }
      });
      const evs=(partido.eventos||{})[id]||{};
      const resJug=getResJug(id);
      const nuevaEntrada={fecha:new Date().toLocaleDateString("es-AR"),mvp:id===mvpId,resultado:resJug,eventos:{goles:evs.goles||0,amarillas:evs.amarillas||0}};
      await setDoc(rUser(id),{
        atributos:nuevos,
        atributosAnteriores:attrsAnt,
        goles:(j.goles||0)+(evs.goles||0),
        partidos:(j.partidos||0)+1,
        historial:[...(j.historial||[]),nuevaEntrada],
      },{merge:true});
    }

    // Guardar en historial de la comunidad — leer fresh y deduplicar por partidoId
    const comSnap=await getDoc(rCom(comunidad.id));
    const histExistente=comSnap.data()?.historialPartidos||[];
    // Evitar duplicados: no agregar si ya existe una entrada con este partidoId
    const yaExiste=histExistente.some(h=>h.partidoId===partido.id);
    if(!yaExiste){
      const nuevaEntradaHist={partidoId:partido.id,fecha:partido.fechaFin,lugar:partido.lugar,formato:partido.formato,equipos:partido.equipos||null,eventos:partido.eventos||{},mvp:mvpId,jugadores,invitados:partido.invitados||{},resultado};
      await setDoc(rCom(comunidad.id),{historialPartidos:[...histExistente,nuevaEntradaHist],partidoActivo:null},{merge:true});
    } else {
      await setDoc(rCom(comunidad.id),{partidoActivo:null},{merge:true});
    }

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
                Votá cómo jugó hoy comparado con su nivel habitual
              </p>
              {ATTRS.map(a=>{
                const voto=notas[compActual]?.[a.key]??null;
                const opts=[
                  {v:1,  icon:"👍", color:G.secondary, label:"Mejor"},
                  {v:0,  icon:"🟰", color:G.t3,        label:"Igual"},
                  {v:-1, icon:"👎", color:G.danger,     label:"Peor"},
                ];
                return (
                  <div key={a.key} style={{marginBottom:8,padding:"10px 14px",background:G.surf1,borderRadius:G.r2}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span style={{fontSize:18}}>{a.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:13}}>{a.label}</div>
                        <div style={{fontSize:11,color:G.t3}}>
                          {voto===null
                            ? `¿${a.ej} más, igual o menos que siempre?`
                            : voto===1  ? `👍 ${a.ej} más que siempre`
                            : voto===-1 ? `👎 ${a.ej} menos que siempre`
                            :             `🟰 ${a.ej} igual que siempre`}
                        </div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      {opts.map(o=>(
                        <button key={o.v} onClick={()=>setNotas(p=>({...p,[compActual]:{...p[compActual],[a.key]:o.v}}))}
                          style={{flex:1,padding:"8px 4px",borderRadius:G.r2,border:`2px solid ${voto===o.v?o.color:"#DDE3F0"}`,background:voto===o.v?o.color+"25":"transparent",cursor:"pointer",transition:"all .15s",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                          <span style={{fontSize:20}}>{o.icon}</span>
                          <span style={{fontSize:10,fontWeight:700,color:voto===o.v?o.color:G.t3}}>{o.label}</span>
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
  const [resultado,setResultado]=useState(""); const [loading,setLoading]=useState(true);

  useEffect(()=>{
    const load=async()=>{
      setLoading(true);
      const s=await getDoc(rCom(comunidad.id));if(!s.exists()){setLoading(false);return;}
      const h=[...(s.data().historialPartidos||[])].reverse();
      // Recopilar todos los DNIs: jugadores + mvp de cada partido
      const dnis=new Set();
      h.forEach(p=>{
        (p.jugadores||[]).forEach(d=>dnis.add(d));
        if(p.mvp&&!p.mvp.startsWith("inv_")) dnis.add(p.mvp);
      });
      const obj={};
      for(const d of dnis){const s2=await getDoc(rUser(d));if(s2.exists())obj[d]=s2.data();}
      // También agregar invitados de cada partido al jugData
      h.forEach(p=>Object.entries(p.invitados||{}).forEach(([id,data])=>{obj[id]=data;}));
      // Actualizar todo junto para evitar renders intermedios sin jugData
      setHistorial(h);
      setJugData(obj);
      setLoading(false);
    };
    load();
  },[comunidad.id]);

  if(loading) return <div style={{padding:20}}><Spinner msg="Cargando historial de partidos..." /></div>;

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
                <div style={{fontWeight:700,fontSize:15}}>{(()=>{const d=new Date(p.fecha);return isNaN(d)?p.fecha:d.toLocaleDateString("es-AR",{weekday:"short",day:"numeric",month:"short"});})()}</div>
                <div style={{color:G.t3,fontSize:12,marginTop:2}}>📍 {p.lugar||"—"} · {p.formato||"—"}</div>
                {p.resultado && <div style={{marginTop:4,fontSize:13,fontWeight:600,color:G.primary}}>🏆 {p.resultado}</div>}
              </div>
              {p.mvp && <Chip color={G.gold}>🥇 {(jugData[p.mvp]?.nombre || p.invitados?.[p.mvp]?.nombre || "MVP")?.split(" ")[0]}</Chip>}
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

              {p.mvp && (() => {
                const mvpData = jugData[p.mvp];
                const mvpNombre = mvpData?.nombre || p.invitados?.[p.mvp]?.nombre || p.mvp;
                return (
                  <div style={{padding:"10px 14px",background:G.gold+"15",borderRadius:G.r2,display:"flex",alignItems:"center",gap:8}}>
                    <Av nom={mvpNombre} foto={mvpData?.foto} size={32} />
                    <div>
                      <div style={{fontSize:11,color:G.t3,fontWeight:600}}>🥇 MVP del partido</div>
                      <div style={{fontWeight:700,fontSize:14}}>{mvpNombre}</div>
                    </div>
                  </div>
                );
              })()}
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
      // Miembros registrados
      for(const dni of comunidad.miembros||[]){const s=await getDoc(rUser(dni));if(s.exists())arr.push({...s.data(),_tipo:"registrado"});}

      // Invitados del historial — agrupar por nombre exacto
      const histPart = comunidad.historialPartidos || [];
      const invMap = {}; // nombre → {nombre, historial acumulado, goles, partidos}
      for(const p of histPart){
        const invs = p.invitados || {};
        for(const [id, data] of Object.entries(invs)){
          if(!id.startsWith("inv_")) continue;
          const nombre = data.nombre || id;
          if(!invMap[nombre]) invMap[nombre]={nombre,_tipo:"invitado",partidos:0,goles:0,historial:[]};
          // Acumular estadísticas desde eventos del partido
          const evs=(p.eventos||{})[id]||{};
          const enOscuro=(p.equipos?.oscuro||[]).includes(id);
          const enBlanco=(p.equipos?.blanco||[]).includes(id);
          let golesO=0,golesB=0;
          if(p.equipos){
            golesO=(p.equipos.oscuro||[]).reduce((s,x)=>s+((p.eventos||{})[x]?.goles||0),0);
            golesB=(p.equipos.blanco||[]).reduce((s,x)=>s+((p.eventos||{})[x]?.goles||0),0);
          }
          let res="jugado";
          if(golesO===golesB) res="empatado";
          else if((enOscuro&&golesO>golesB)||(enBlanco&&golesB>golesO)) res="ganado";
          else if(enOscuro||enBlanco) res="perdido";
          invMap[nombre].partidos++;
          invMap[nombre].goles+=(evs.goles||0);
          invMap[nombre].historial.push({
            fecha:p.fecha||"",
            mvp:p.mvp===id,
            resultado:res,
            eventos:{goles:evs.goles||0,amarillas:evs.amarillas||0},
          });
        }
      }
      for(const inv of Object.values(invMap)) arr.push(inv);

      arr.sort((a,b)=>{
        // 1. Puntos
        const pts = calcPuntos(b.historial) - calcPuntos(a.historial);
        if(pts!==0) return pts;
        // 2. MVPs
        const mvpA=(a.historial||[]).filter(h=>h.mvp).length;
        const mvpB=(b.historial||[]).filter(h=>h.mvp).length;
        if(mvpB!==mvpA) return mvpB-mvpA;
        // 3. Goles por partido (⚽/PJ)
        const pjA=a.partidos||0; const pjB=b.partidos||0;
        const golA=(a.historial||[]).reduce((s,h)=>s+(h.eventos?.goles||0),0);
        const golB=(b.historial||[]).reduce((s,h)=>s+(h.eventos?.goles||0),0);
        const gpjA=pjA>0?golA/pjA:0; const gpjB=pjB>0?golB/pjB:0;
        if(gpjB!==gpjA) return gpjB-gpjA;
        // 4. Goles totales
        if(golB!==golA) return golB-golA;
        // 5. Partidos ganados
        const ganA=(a.historial||[]).filter(h=>h.resultado==="ganado").length;
        const ganB=(b.historial||[]).filter(h=>h.resultado==="ganado").length;
        return ganB-ganA;
      });
      setJugadores(arr);setLoading(false);
    };
    load();
  },[comunidad.id]);

  if(loading) return <div style={{padding:20}}><Spinner msg="Calculando estadísticas..." /></div>;

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
                <th style={thStyle}>PJ</th>
                <th style={thStyle}>G</th>
                <th style={thStyle}>E</th>
                <th style={thStyle}>P</th>
                <th style={{...thStyle,color:G.primary}}>Pts</th>
                <th style={thStyle}>⚽</th>
                <th style={thStyle}>⚽/PJ</th>
                <th style={thStyle}>🥇</th>
              </tr>
            </thead>
            <tbody>
              {jugadores.map((j,i)=>{
                const partidos=j.partidos||0;
                const goles=(j.historial||[]).reduce((s,h)=>s+(h.eventos?.goles||0),0);
                const mvps=(j.historial||[]).filter(h=>h.mvp).length;
                const ganados=(j.historial||[]).filter(h=>h.resultado==="ganado").length;
                const empatados=(j.historial||[]).filter(h=>h.resultado==="empatado").length;
                const perdidos=(j.historial||[]).filter(h=>h.resultado==="perdido").length;
                const pts=calcPuntos(j.historial);
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
                          <div style={{fontWeight:700,fontSize:13,lineHeight:1.2}}>{j.nombre?.split(" ")[0]}</div>
                          {j.apodo && <div style={{color:G.primary,fontSize:10}}>"{j.apodo}"</div>}
                          {j._tipo==="invitado" && <div style={{color:G.warn,fontSize:10,fontWeight:600}}>invitado</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{...tdStyle,color:G.t2}}>{partidos||"—"}</td>
                    <td style={{...tdStyle,fontWeight:600,color:G.secondary}}>{ganados||"—"}</td>
                    <td style={{...tdStyle,color:G.t2}}>{empatados||"—"}</td>
                    <td style={{...tdStyle,color:G.danger}}>{perdidos||"—"}</td>
                    <td style={{...tdStyle,fontWeight:900,color:G.primary,fontSize:15}}>{pts}</td>
                    <td style={{...tdStyle,color:goles>0?G.secondary:G.t3}}>{goles||"—"}</td>
                    <td style={{...tdStyle,color:G.t2}}>{golPJ}</td>
                    <td style={{...tdStyle,color:mvps>0?G.gold:G.t3}}>{mvps||"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{padding:"8px 14px",background:G.surf1,fontSize:11,color:G.t3,textAlign:"center"}}>
          PJ Partidos · G Ganados · E Empatados · P Perdidos · Pts Puntos · ⚽ Goles · ⚽/PJ Goles por partido · 🥇 MVPs
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
                {l:"Puntos",v:calcPuntos(j.historial),i:"🏆",highlight:true},
                {l:"Ganados",v:(j.historial||[]).filter(h=>h.resultado==="ganado").length,i:"✅"},
                {l:"Empatados",v:(j.historial||[]).filter(h=>h.resultado==="empatado").length,i:"➡️"},
                {l:"Perdidos",v:(j.historial||[]).filter(h=>h.resultado==="perdido").length,i:"❌"},
                {l:"Goles totales",v:(j.historial||[]).reduce((s,h)=>s+(h.eventos?.goles||0),0),i:"⚽"},
                {l:"Goles por partido",v:j.partidos>0?((j.historial||[]).reduce((s,h)=>s+(h.eventos?.goles||0),0)/j.partidos).toFixed(1):"—",i:"📈"},
                {l:"MVPs",v:(j.historial||[]).filter(h=>h.mvp).length,i:"🥇"},
                {l:"Amarillas",v:(j.historial||[]).reduce((s,h)=>s+(h.eventos?.amarillas||0),0),i:"🟨"},
                {l:"Último partido",v:(j.historial||[]).slice(-1)[0]?.fecha||"—",i:"📅"},
              ].map(s=>(
                <div key={s.l} style={{background:s.highlight?G.primary+"15":G.surf1,borderRadius:G.r2,padding:"10px 12px",border:s.highlight?`1px solid ${G.primary}30`:"none"}}>
                  <div style={{fontSize:11,color:s.highlight?G.primary:G.t3,marginBottom:2}}>{s.i} {s.l}</div>
                  <div style={{fontWeight:800,fontSize:16,color:s.highlight?G.primary:G.t1}}>{s.v}</div>
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

  if(loading) return <div style={{padding:20}}><Spinner msg="Cargando panel de administración..." /></div>;

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
