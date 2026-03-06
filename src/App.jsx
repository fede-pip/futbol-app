import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBkdakeLAzmp7zGz99nPswuqjtELSAOe8s",
  authDomain: "futbol-app-5818a.firebaseapp.com",
  projectId: "futbol-app-5818a",
  storageBucket: "futbol-app-5818a.firebasestorage.app",
  messagingSenderId: "861046895576",
  appId: "1:861046895576:web:1e64b31f951194fbfaf8ad"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const SUPER_ADMIN_DNI = "35270164";

const REF = {
  jugadores: () => doc(db, "app8", "jugadores"),
  partido:   () => doc(db, "app8", "partidoActual"),
  admins:    () => doc(db, "app8", "admins"),
  votos:     () => doc(db, "app8", "votos"),
};

const FORMATOS = [
  { label: "5 vs 5",   total: 10 },
  { label: "6 vs 6",   total: 12 },
  { label: "7 vs 7",   total: 14 },
  { label: "8 vs 8",   total: 16 },
  { label: "9 vs 9",   total: 18 },
  { label: "10 vs 10", total: 20 },
  { label: "11 vs 11", total: 22 },
];

function calcularPromedio(j) {
  if (!j.partidos || j.partidos === 0) return 0;
  const base = j.puntajeTotal / j.partidos;
  const bonus = (j.goles || 0) * 0.1;
  return Math.min(10, +(base + bonus).toFixed(2));
}

function balancear(lista) {
  const sorted = [...lista].sort((a, b) => calcularPromedio(b) - calcularPromedio(a));
  const eq1 = [], eq2 = [];
  sorted.forEach((j, i) => (i % 2 === 0 ? eq1 : eq2).push(j));
  return { equipo1: eq1, equipo2: eq2 };
}

// ── UI Components ──────────────────────────────────────────────────────────

function Avatar({ nombre, size = 40 }) {
  const initials = nombre.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const palette = ["#e63946","#f4a261","#2a9d8f","#457b9d","#6a4c93","#e76f51","#06d6a0","#ef476f"];
  const color = palette[nombre.charCodeAt(0) % palette.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size * 0.36, color: "#fff", flexShrink: 0, letterSpacing: -0.5 }}>
      {initials}
    </div>
  );
}

function Badge({ score }) {
  const color = score >= 8 ? "#06d6a0" : score >= 5 ? "#ffd166" : "#ef476f";
  return (
    <span style={{ background: color + "20", color, border: `1px solid ${color}50`, borderRadius: 6, padding: "2px 9px", fontWeight: 800, fontSize: 13, fontFamily: "monospace" }}>
      {score.toFixed(1)}
    </span>
  );
}

function Tag({ children, color = "#ffd166" }) {
  return (
    <span style={{ background: color + "20", color, border: `1px solid ${color}40`, borderRadius: 5, padding: "1px 7px", fontSize: 11, fontWeight: 700, display: "inline-block" }}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, style: extra = {} }) {
  const variants = {
    primary: { background: "#ffd166", color: "#0d1117" },
    danger:  { background: "#ef476f", color: "#fff" },
    green:   { background: "#06d6a0", color: "#0d1117" },
    ghost:   { background: "#1c2433", color: "#8b9ab0" },
    admin:   { background: "#6a4c93", color: "#fff" },
    dark:    { background: "#131920", color: "#5a7a9a" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...variants[variant], borderRadius: 10, border: "none", cursor: disabled ? "not-allowed" : "pointer",
      fontWeight: 700, fontSize: 14, padding: "11px 18px", width: "100%", marginTop: 8,
      opacity: disabled ? 0.5 : 1, transition: "all .15s", fontFamily: "inherit", ...extra
    }}>{children}</button>
  );
}

function Input({ value, onChange, placeholder, type = "text", onKeyDown }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
      style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #1e2d40", background: "#0d1520", color: "#e2e8f0", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
  );
}

function Card({ children, style: extra = {}, accent }) {
  return (
    <div style={{ background: "#111b2b", borderRadius: 16, border: `1px solid ${accent || "#1e2d40"}`, padding: 16, marginBottom: 14, ...extra }}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 11, color: "#4a6a8a", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>{children}</div>;
}

function Msg({ children, ok }) {
  if (!children) return null;
  return (
    <div style={{ padding: "9px 13px", borderRadius: 8, marginTop: 8, fontSize: 13, background: ok ? "#06d6a015" : "#ef476f15", color: ok ? "#06d6a0" : "#ef476f", border: `1px solid ${ok ? "#06d6a030" : "#ef476f30"}` }}>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: 16 }}>
      <div style={{ width: 44, height: 44, border: "3px solid #1e2d40", borderTopColor: "#ffd166", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      <div style={{ color: "#4a6a8a", fontSize: 14 }}>Cargando App8...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const defaultPartido = { creado: false, fecha: "", hora: "", lugar: "", formato: null, inscriptos: [], goles: {}, finalizado: false, fechaFin: null, equipos: null };

// ── MAIN APP ───────────────────────────────────────────────────────────────

export default function App() {
  const [loading,    setLoading]    = useState(true);
  const [pantalla,   setPantalla]   = useState("inicio");
  const [jugadores,  setJugadores]  = useState({});
  const [partido,    setPartido]    = useState(defaultPartido);
  const [admins,     setAdmins]     = useState({ lista: [SUPER_ADMIN_DNI] });
  const [votos,      setVotos]      = useState({});

  // Sesión local
  const [sesioDni, setSesioDni]   = useState(localStorage.getItem("app8_dni") || "");
  const [sesioNom, setSesioNom]   = useState(localStorage.getItem("app8_nom") || "");

  useEffect(() => {
    const u1 = onSnapshot(REF.jugadores(), s => setJugadores(s.exists() ? s.data().lista || {} : {}));
    const u2 = onSnapshot(REF.partido(),   s => setPartido(s.exists() ? { ...defaultPartido, ...s.data() } : defaultPartido));
    const u3 = onSnapshot(REF.admins(),    s => { setAdmins(s.exists() ? s.data() : { lista: [SUPER_ADMIN_DNI] }); setLoading(false); });
    const u4 = onSnapshot(REF.votos(),     s => setVotos(s.exists() ? s.data() : {}));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const esAdmin = (admins.lista || []).includes(sesioDni) || sesioDni === SUPER_ADMIN_DNI;
  const esSuperAdmin = sesioDni === SUPER_ADMIN_DNI;

  async function save(ref, data) { await setDoc(ref, data, { merge: true }); }
  async function savePartido(p)  { await setDoc(REF.partido(), p); }
  async function saveJugadores(j){ await save(REF.jugadores(), { lista: j }); }

  const jugadoresArr = Object.values(jugadores).sort((a, b) => calcularPromedio(b) - calcularPromedio(a));
  const inscriptosObj = (partido.inscriptos || []).map(id => jugadores[id] || partido.invitados?.[id]).filter(Boolean);
  const formato = FORMATOS.find(f => f.label === partido.formato);
  const cupo = formato?.total || 0;
  const cupoLibre = cupo - (partido.inscriptos || []).length;

  function login(dni, nom) {
    setSesioDni(dni); setSesioNom(nom);
    localStorage.setItem("app8_dni", dni);
    localStorage.setItem("app8_nom", nom);
  }
  function logout() {
    setSesioDni(""); setSesioNom("");
    localStorage.removeItem("app8_dni");
    localStorage.removeItem("app8_nom");
    setPantalla("inicio");
  }

  const S = {
    app: { minHeight: "100vh", background: "#080e18", color: "#d4dce8", fontFamily: "'DM Sans','Segoe UI',sans-serif", maxWidth: 480, margin: "0 auto", paddingBottom: 90 },
    header: { background: "linear-gradient(180deg,#0d1520 0%,#080e18 100%)", borderBottom: "1px solid #111d2e", padding: "18px 18px 14px", position: "sticky", top: 0, zIndex: 100 },
    nav: { display: "flex", overflowX: "auto", gap: 4, padding: "10px 12px", background: "#0a1220", borderBottom: "1px solid #111d2e" },
    navBtn: (a) => ({ padding: "7px 13px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", background: a ? "#ffd166" : "#131d2d", color: a ? "#0d1117" : "#6a8aaa", fontFamily: "inherit", transition: "all .2s" }),
    sec: { padding: 16 },
    row: { display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 12, background: "#0d1520", border: "1px solid #1a2840", marginBottom: 8 },
    sTitle: { fontSize: 17, fontWeight: 800, marginBottom: 16, color: "#e8f0ff" },
  };

  if (loading) return <div style={S.app}><Spinner /></div>;

  // ── PANTALLAS ──

  const tabs = [
    { id: "inicio",    label: "⚽ App8" },
    { id: "partido",   label: "📋 Partido" },
    { id: "votar",     label: "🗳️ Votar" },
    { id: "equipos",   label: "⚖️ Equipos" },
    { id: "stats",     label: "📊 Stats" },
    ...(esAdmin ? [{ id: "admin", label: "👑 Admin" }] : []),
  ];

  return (
    <div style={S.app}>
      {/* HEADER */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#ffd166,#ef476f)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚽</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>App<span style={{ color: "#ffd166" }}>8</span></div>
            <div style={{ fontSize: 11, color: "#3a5a7a", letterSpacing: 0.5 }}>🔥 BASE DE DATOS COMPARTIDA</div>
          </div>
          {sesioNom ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {esAdmin && <Tag color="#ffd166">👑 Admin</Tag>}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#c0d0e0" }}>{sesioNom.split(" ")[0]}</div>
                <button onClick={logout} style={{ background: "none", border: "none", color: "#4a6a8a", fontSize: 11, cursor: "pointer", padding: 0 }}>Salir</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setPantalla("login")} style={{ background: "#ffd166", color: "#0d1117", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Ingresar</button>
          )}
        </div>
      </div>

      {/* NAV */}
      <div style={S.nav}>
        {tabs.map(t => (
          <button key={t.id} style={S.navBtn(pantalla === t.id)} onClick={() => setPantalla(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── LOGIN ── */}
      {pantalla === "login" && <PantallaLogin jugadores={jugadores} onLogin={login} onBack={() => setPantalla("inicio")} saveJugadores={saveJugadores} S={S} />}

      {/* ── INICIO ── */}
      {pantalla === "inicio" && <PantallaInicio jugadoresArr={jugadoresArr} partido={partido} formato={formato} cupoLibre={cupoLibre} setPantalla={setPantalla} sesioNom={sesioNom} S={S} />}

      {/* ── PARTIDO ── */}
      {pantalla === "partido" && (
        <PantallaPartido
          partido={partido} jugadores={jugadores} inscriptosObj={inscriptosObj}
          cupo={cupo} cupoLibre={cupoLibre} formato={formato}
          sesioDni={sesioDni} sesioNom={sesioNom} esAdmin={esAdmin}
          savePartido={savePartido} setPantalla={setPantalla} S={S}
        />
      )}

      {/* ── VOTAR ── */}
      {pantalla === "votar" && (
        <PantallaVotar
          partido={partido} jugadores={jugadores} inscriptosObj={inscriptosObj}
          sesioDni={sesioDni} votos={votos} savePartido={savePartido}
          saveVotos={async v => await setDoc(REF.votos(), v)}
          saveJugadores={saveJugadores} setPantalla={setPantalla} S={S}
        />
      )}

      {/* ── EQUIPOS ── */}
      {pantalla === "equipos" && (
        <PantallaEquipos jugadoresArr={jugadoresArr} partido={partido} savePartido={savePartido} S={S} />
      )}

      {/* ── STATS ── */}
      {pantalla === "stats" && <PantallaStats jugadoresArr={jugadoresArr} S={S} />}

      {/* ── ADMIN ── */}
      {pantalla === "admin" && esAdmin && (
        <PantallaAdmin
          jugadores={jugadores} admins={admins} partido={partido}
          sesioDni={sesioDni} esSuperAdmin={esSuperAdmin}
          saveJugadores={saveJugadores}
          saveAdmins={async a => await setDoc(REF.admins(), a)}
          savePartido={savePartido}
          saveVotos={async v => await setDoc(REF.votos(), v)}
          S={S}
        />
      )}
    </div>
  );
}

// ── PANTALLA LOGIN ──────────────────────────────────────────────────────────

function PantallaLogin({ jugadores, onLogin, onBack, saveJugadores, S }) {
  const [tab,  setTab]  = useState("login");
  const [dni,  setDni]  = useState("");
  const [nom,  setNom]  = useState("");
  const [msg,  setMsg]  = useState("");

  function doLogin() {
    const j = jugadores[dni.trim()];
    if (!j) { setMsg("DNI no encontrado. ¿Ya te registraste?"); return; }
    onLogin(dni.trim(), j.nombre);
    onBack();
  }

  async function doRegister() {
    if (!nom.trim() || !dni.trim()) { setMsg("Completá nombre y DNI"); return; }
    if (jugadores[dni.trim()]) { setMsg("Ese DNI ya existe"); return; }
    const nuevo = { nombre: nom.trim(), dni: dni.trim(), goles: 0, puntajeTotal: 0, partidos: 0, historial: [] };
    await saveJugadores({ ...jugadores, [dni.trim()]: nuevo });
    onLogin(dni.trim(), nom.trim());
    onBack();
  }

  return (
    <div style={S.sec}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {["login","register"].map(t => (
          <button key={t} onClick={() => { setTab(t); setMsg(""); }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: tab === t ? "#ffd166" : "#131d2d", color: tab === t ? "#0d1117" : "#6a8aaa", fontFamily: "inherit" }}>
            {t === "login" ? "Ingresar" : "Registrarme"}
          </button>
        ))}
      </div>
      <Card>
        {tab === "register" && (
          <>
            <Label>Nombre completo</Label>
            <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ej: Juan Pérez" />
            <div style={{ marginTop: 10 }} />
          </>
        )}
        <Label>Tu DNI</Label>
        <Input value={dni} onChange={e => setDni(e.target.value)} placeholder="Ej: 38123456" onKeyDown={e => e.key === "Enter" && (tab === "login" ? doLogin() : doRegister())} />
        <Btn onClick={tab === "login" ? doLogin : doRegister}>{tab === "login" ? "Ingresar" : "Crear cuenta"}</Btn>
        <Msg ok={false}>{msg}</Msg>
      </Card>
    </div>
  );
}

// ── PANTALLA INICIO ─────────────────────────────────────────────────────────

function PantallaInicio({ jugadoresArr, partido, formato, cupoLibre, setPantalla, sesioNom, S }) {
  return (
    <div style={S.sec}>
      <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>⚽</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -1 }}>App<span style={{ color: "#ffd166" }}>8</span></div>
        <div style={{ color: "#4a6a8a", fontSize: 14, marginTop: 6 }}>
          {sesioNom ? `Bienvenido, ${sesioNom.split(" ")[0]} 👋` : "Ingresá para participar"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Jugadores", value: jugadoresArr.length, icon: "👥" },
          { label: "Inscriptos", value: (partido.inscriptos || []).length, icon: "📋" },
          { label: "Formato", value: partido.creado ? (partido.formato || "—") : "Sin partido", icon: "⚽" },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: "center", padding: 12 }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: s.value.toString().length > 5 ? 11 : 18, fontWeight: 900, color: "#ffd166", marginTop: 2 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#4a6a8a", marginTop: 2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {partido.creado && (
        <Card accent="#ffd16640">
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10, color: "#ffd166" }}>📅 Próximo partido</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { icon: "📆", label: "Fecha", val: partido.fecha || "—" },
              { icon: "🕐", label: "Hora", val: partido.hora || "—" },
              { icon: "📍", label: "Lugar", val: partido.lugar || "—" },
              { icon: "👥", label: "Formato", val: partido.formato || "—" },
            ].map(r => (
              <div key={r.label} style={{ background: "#0d1520", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: "#4a6a8a", marginBottom: 2 }}>{r.icon} {r.label}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.val}</div>
              </div>
            ))}
          </div>
          {!partido.finalizado && (
            <div style={{ marginTop: 10, fontSize: 13, color: cupoLibre > 0 ? "#06d6a0" : "#ef476f", fontWeight: 700 }}>
              {cupoLibre > 0 ? `✅ ${cupoLibre} lugares disponibles` : "🚫 Partido completo"}
            </div>
          )}
          <Btn onClick={() => setPantalla("partido")} style={{ marginTop: 12 }}>Ver partido</Btn>
        </Card>
      )}

      {!sesioNom && (
        <Btn onClick={() => setPantalla("login")}>Ingresar / Registrarme</Btn>
      )}
    </div>
  );
}

// ── PANTALLA PARTIDO ────────────────────────────────────────────────────────

function PantallaPartido({ partido, jugadores, inscriptosObj, cupo, cupoLibre, formato, sesioDni, sesioNom, esAdmin, savePartido, setPantalla, S }) {
  const [msg, setMsg] = useState("");
  const [golesDni, setGolesDni] = useState("");
  const [adminAuth, setAdminAuth] = useState(false);

  const yoInscripto = sesioDni && (partido.inscriptos || []).includes(sesioDni);

  async function anotarme() {
    if (!sesioDni) { setMsg("Tenés que ingresar primero"); return; }
    if (yoInscripto) { setMsg("Ya estás anotado ✓"); return; }
    if (cupoLibre <= 0) { setMsg("El partido está completo"); return; }
    await savePartido({ ...partido, inscriptos: [...(partido.inscriptos || []), sesioDni] });
    setMsg(`✓ ${sesioNom} anotado!`); setTimeout(() => setMsg(""), 2500);
  }

  async function desanotarme() {
    await savePartido({ ...partido, inscriptos: (partido.inscriptos || []).filter(d => d !== sesioDni) });
    setMsg("Te desanotaste"); setTimeout(() => setMsg(""), 2000);
  }

  async function actualizarGoles(id, delta) {
    const goles = { ...(partido.goles || {}) };
    goles[id] = Math.max(0, (goles[id] || 0) + delta);
    await savePartido({ ...partido, goles });
  }

  async function finalizarPartido() {
    if ((partido.inscriptos || []).length < 2) { setMsg("Necesitás al menos 2 jugadores"); return; }
    const fecha = new Date().toLocaleString("es-AR");
    await savePartido({ ...partido, finalizado: true, fechaFin: fecha });
    setPantalla("votar");
  }

  if (!partido.creado) {
    return (
      <div style={S.sec}>
        <div style={S.sTitle}>📋 Partido</div>
        <Card style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗓️</div>
          <div style={{ color: "#4a6a8a", fontSize: 14 }}>No hay ningún partido creado todavía.</div>
          {esAdmin && <Btn onClick={() => setPantalla("admin")} style={{ marginTop: 16 }} variant="admin">Crear partido (Admin)</Btn>}
        </Card>
      </div>
    );
  }

  if (partido.finalizado) {
    return (
      <div style={S.sec}>
        <div style={S.sTitle}>📋 Partido</div>
        <Card style={{ textAlign: "center" }} accent="#06d6a040">
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏁</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#06d6a0" }}>Partido finalizado</div>
          <div style={{ color: "#4a6a8a", fontSize: 13, marginTop: 6 }}>
            Votaron {Object.keys(partido.votosContados || {}).length} / {inscriptosObj.length}
          </div>
          <Btn onClick={() => setPantalla("votar")} variant="green" style={{ marginTop: 12 }}>Ir a votar</Btn>
        </Card>
      </div>
    );
  }

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>📋 Partido</div>

      {/* Info del partido */}
      <Card accent="#ffd16630">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[
            { icon: "📆", v: partido.fecha }, { icon: "🕐", v: partido.hora },
            { icon: "📍", v: partido.lugar }, { icon: "👥", v: partido.formato },
          ].map((r, i) => (
            <div key={i} style={{ background: "#0d1520", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontWeight: 600 }}>{r.icon} {r.v || "—"}</div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: cupoLibre > 0 ? "#06d6a0" : "#ef476f" }}>
            {cupoLibre > 0 ? `✅ ${cupoLibre} lugares disponibles` : "🚫 Completo"}
          </span>
          <span style={{ fontSize: 13, color: "#4a6a8a" }}>{(partido.inscriptos || []).length}/{cupo}</span>
        </div>
      </Card>

      {/* Anotarme */}
      {sesioDni && (
        <Card>
          {yoInscripto ? (
            <>
              <div style={{ color: "#06d6a0", fontWeight: 700, marginBottom: 8 }}>✅ Estás anotado al partido</div>
              <Btn onClick={desanotarme} variant="ghost">Desanotarme</Btn>
            </>
          ) : (
            <Btn onClick={anotarme} disabled={cupoLibre <= 0}>
              {cupoLibre > 0 ? "📝 Anotarme al partido" : "🚫 Sin lugares"}
            </Btn>
          )}
          <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
        </Card>
      )}

      {/* Lista inscriptos */}
      <Card>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>👥 Inscriptos ({inscriptosObj.length}/{cupo})</div>
        {inscriptosObj.length === 0
          ? <div style={{ color: "#4a6a8a", textAlign: "center", padding: 16, fontSize: 13 }}>Nadie anotado aún</div>
          : (partido.inscriptos || []).map((id, idx) => {
              const j = jugadores[id] || (partido.invitados || {})[id];
              if (!j) return null;
              const esInvitado = !(jugadores[id]);
              return (
                <div key={id} style={S.row}>
                  <div style={{ fontSize: 18, width: 28, textAlign: "center", color: "#4a6a8a", fontWeight: 700 }}>#{idx + 1}</div>
                  <Avatar nombre={j.nombre} size={34} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{j.nombre}</div>
                    {esInvitado && <Tag color="#6a4c93">Invitado</Tag>}
                  </div>
                  {!esInvitado && <Badge score={calcularPromedio(j)} />}
                </div>
              );
            })
        }
      </Card>

      {/* Goles (admin) */}
      {esAdmin && (partido.inscriptos || []).length > 0 && (
        <Card accent="#6a4c9340">
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>⚽ Goles (Admin)</div>
          <div style={{ color: "#5a7a9a", fontSize: 12, marginBottom: 12 }}>Cargá los goles y finalizá el partido cuando terminen.</div>
          {(partido.inscriptos || []).map(id => {
            const j = jugadores[id] || (partido.invitados || {})[id];
            if (!j) return null;
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Avatar nombre={j.nombre} size={30} />
                <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{j.nombre}</div>
                <button onClick={() => actualizarGoles(id, -1)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "#1c2433", color: "#fff", cursor: "pointer", fontWeight: 700 }}>−</button>
                <span style={{ width: 26, textAlign: "center", fontWeight: 800, fontSize: 16, color: "#ffd166" }}>{(partido.goles || {})[id] || 0}</span>
                <button onClick={() => actualizarGoles(id, 1)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "#06d6a0", color: "#0d1117", cursor: "pointer", fontWeight: 700 }}>+</button>
              </div>
            );
          })}
          <Btn onClick={finalizarPartido} variant="danger" style={{ marginTop: 8 }}>🏁 Finalizar partido</Btn>
        </Card>
      )}
    </div>
  );
}

// ── PANTALLA VOTAR ──────────────────────────────────────────────────────────

function PantallaVotar({ partido, jugadores, inscriptosObj, sesioDni, votos, savePartido, saveVotos, saveJugadores, setPantalla, S }) {
  const [dni,           setDni]           = useState(sesioDni || "");
  const [votante,       setVotante]       = useState(null);
  const [notasTemp,     setNotasTemp]     = useState({});
  const [mvpPartido,    setMvpPartido]    = useState(null);
  const [msg,           setMsg]           = useState("");
  const [buscarMsg,     setBuscarMsg]     = useState("");

  // Quiénes ya enviaron votos (solo IDs, anónimo)
  const yaVotaron = Object.keys(votos);
  const totalInscriptos = (partido.inscriptos || []).length;

  function buscar() {
    const j = jugadores[dni.trim()];
    if (!j) { setBuscarMsg("DNI no encontrado"); return; }
    const esInvitado = !(partido.inscriptos || []).includes(dni.trim()) && Object.keys(partido.invitados || {}).includes(dni.trim());
    if (esInvitado) { setBuscarMsg("Los invitados no pueden votar"); return; }
    if (!(partido.inscriptos || []).includes(dni.trim())) { setBuscarMsg("No participaste en este partido"); return; }
    if (yaVotaron.includes(dni.trim())) { setBuscarMsg("Ya votaste ✓"); return; }
    setVotante(j); setBuscarMsg("");
    const init = {};
    (partido.inscriptos || []).filter(id => id !== dni.trim()).forEach(id => { init[id] = 0; });
    // invitados también reciben votos
    Object.keys(partido.invitados || {}).filter(id => id !== dni.trim()).forEach(id => { init[id] = 0; });
    setNotasTemp(init);
  }

  async function enviarVotos() {
    const sinNota = Object.values(notasTemp).some(v => v === 0);
    if (sinNota) { setMsg("⚠️ Puntuá a todos los jugadores"); return; }
    if (!mvpPartido) { setMsg("⚠️ Elegí el MVP del partido"); return; }

    // Guardar votos anónimamente — solo se guarda que "alguien" votó con id anonimizado
    const anonId = `voto_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const nuevosVotos = { ...votos, [votante.dni]: { registrado: true } };
    await saveVotos(nuevosVotos);

    // Guardar las notas en una colección interna del partido (sin vincular al DNI)
    const notasActuales = partido.notasAcumuladas || {};
    Object.entries(notasTemp).forEach(([id, nota]) => {
      if (!notasActuales[id]) notasActuales[id] = { suma: 0, cant: 0 };
      notasActuales[id].suma += nota;
      notasActuales[id].cant += 1;
    });
    // Contar MVP
    const mvpConteo = { ...(partido.mvpConteo || {}), [mvpPartido]: ((partido.mvpConteo || {})[mvpPartido] || 0) + 1 };
    await savePartido({ ...partido, notasAcumuladas: notasActuales, mvpConteo });

    setVotante(null); setDni(""); setMsg("✓ Votos enviados anónimamente");
    setTimeout(() => setMsg(""), 2500);
  }

  async function cerrarVotacion() {
    const notas = partido.notasAcumuladas || {};
    const mvpConteo = partido.mvpConteo || {};
    const mvpId = Object.keys(mvpConteo).length ? Object.keys(mvpConteo).reduce((a, b) => mvpConteo[a] > mvpConteo[b] ? a : b) : null;

    const jugActualizados = { ...jugadores };
    (partido.inscriptos || []).forEach(id => {
      const j = jugadores[id];
      if (!j) return; // invitados no acumulan stats
      const n = notas[id];
      const promedio = n && n.cant > 0 ? n.suma / n.cant : 5;
      const golesPartido = (partido.goles || {})[id] || 0;
      jugActualizados[id] = {
        ...j,
        goles: j.goles + golesPartido,
        puntajeTotal: j.puntajeTotal + promedio,
        partidos: j.partidos + 1,
        historial: [...(j.historial || []), {
          fecha: new Date().toLocaleDateString("es-AR"),
          nota: +promedio.toFixed(1),
          goles: golesPartido,
          mvp: id === mvpId,
        }],
      };
    });

    await saveJugadores(jugActualizados);
    await savePartido({ ...defaultPartido, historialPartidos: [...(partido.historialPartidos || []), { fecha: partido.fechaFin, formato: partido.formato }] });
    await saveVotos({});
    setPantalla("stats");
  }

  if (!partido.finalizado) {
    return (
      <div style={S.sec}>
        <div style={S.sTitle}>🗳️ Votaciones</div>
        <Card style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <div style={{ color: "#4a6a8a" }}>Las votaciones abren cuando el admin finalice el partido.</div>
        </Card>
      </div>
    );
  }

  const votantesIds = (partido.inscriptos || []).filter(id => jugadores[id]); // solo jugadores registrados pueden votar
  const votosRecibidos = yaVotaron.length;
  const todosVotaron = votosRecibidos >= votantesIds.length;

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>🗳️ Votaciones</div>

      <Card accent="#06d6a030">
        <div style={{ fontSize: 13, color: "#06d6a0", fontWeight: 700 }}>
          🔒 Votaciones 100% anónimas — nadie puede ver tu voto
        </div>
        <div style={{ color: "#4a6a8a", fontSize: 12, marginTop: 4 }}>
          Votaron {votosRecibidos} de {votantesIds.length} jugadores
        </div>
        <div style={{ marginTop: 8, height: 4, background: "#1c2433", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${(votosRecibidos / Math.max(votantesIds.length, 1)) * 100}%`, height: "100%", background: "#06d6a0", borderRadius: 4, transition: "width .4s" }} />
        </div>
      </Card>

      {!votante ? (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Ingresá para votar</div>
          <Label>Tu DNI</Label>
          <Input value={dni} onChange={e => setDni(e.target.value)} placeholder="Ingresá tu DNI" onKeyDown={e => e.key === "Enter" && buscar()} />
          <Btn onClick={buscar}>Ingresar</Btn>
          <Msg ok={false}>{buscarMsg}</Msg>
          <Msg ok={true}>{msg}</Msg>
        </Card>
      ) : (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 12px", background: "#0d1520", borderRadius: 10 }}>
            <Avatar nombre={votante.nombre} size={36} />
            <div>
              <div style={{ fontWeight: 800 }}>{votante.nombre}</div>
              <div style={{ color: "#4a6a8a", fontSize: 12 }}>Tus votos son anónimos ✓</div>
            </div>
          </div>

          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#ffd166" }}>⭐ Puntuá a cada jugador (1-10)</div>
          {[...(partido.inscriptos || []), ...Object.keys(partido.invitados || {})].filter(id => id !== votante.dni).map(id => {
            const j = jugadores[id] || (partido.invitados || {})[id];
            if (!j) return null;
            const nota = notasTemp[id] || 0;
            return (
              <div key={id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #1a2840" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Avatar nombre={j.nombre} size={28} />
                  <div style={{ flex: 1, fontWeight: 700 }}>{j.nombre}</div>
                  <span style={{ color: "#ffd166", fontWeight: 800 }}>{nota || "—"}/10</span>
                </div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => setNotasTemp(p => ({ ...p, [id]: n }))} style={{ width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: n <= nota ? "#ffd166" : "#1c2433", color: n <= nota ? "#0d1117" : "#4a6a8a" }}>{n}</button>
                  ))}
                </div>
              </div>
            );
          })}

          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: "#ffd166", marginTop: 4 }}>🥇 MVP del partido</div>
          {[...(partido.inscriptos || []), ...Object.keys(partido.invitados || {})].filter(id => id !== votante.dni).map(id => {
            const j = jugadores[id] || (partido.invitados || {})[id];
            if (!j) return null;
            return (
              <div key={id} onClick={() => setMvpPartido(id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 6, border: `1px solid ${mvpPartido === id ? "#ffd166" : "#1a2840"}`, background: mvpPartido === id ? "#1a150a" : "#0d1520" }}>
                <Avatar nombre={j.nombre} size={28} />
                <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{j.nombre}</div>
                {mvpPartido === id && <span style={{ color: "#ffd166", fontSize: 18 }}>⭐</span>}
              </div>
            );
          })}

          <Btn onClick={enviarVotos} variant="green" style={{ marginTop: 12 }}>Enviar votos (anónimo)</Btn>
          <Msg ok={msg?.startsWith("✓")}>{msg}</Msg>
        </Card>
      )}

      {todosVotaron && (
        <Btn onClick={cerrarVotacion} variant="primary">✅ Todos votaron — Guardar resultados</Btn>
      )}
    </div>
  );
}

// ── PANTALLA EQUIPOS ────────────────────────────────────────────────────────

function PantallaEquipos({ jugadoresArr, partido, savePartido, S }) {
  const [sel, setSel] = useState([]);
  const [eqs, setEqs] = useState(null);

  function toggle(dni) { setSel(s => s.includes(dni) ? s.filter(d => d !== dni) : [...s, dni]); }

  async function generar() {
    if (sel.length < 4) { alert("Seleccioná al menos 4 jugadores"); return; }
    const jug = sel.map(dni => jugadoresArr.find(j => j.dni === dni)).filter(Boolean);
    const eq = balancear(jug);
    setEqs(eq);
    await savePartido({ ...partido, equipos: { equipo1: eq.equipo1.map(j => j.dni), equipo2: eq.equipo2.map(j => j.dni) } });
  }

  const sumaEq = (arr) => arr.reduce((s, j) => s + calcularPromedio(j), 0).toFixed(1);

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>⚖️ Armar Equipos</div>
      {!eqs ? (
        <>
          <Card style={{ background: "#0d1520", marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: "#4a6a8a" }}>Seleccioná los jugadores y la app balanceará los equipos según su puntaje.</div>
          </Card>
          <div style={{ color: "#ffd166", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Seleccionados: {sel.length}</div>
          {jugadoresArr.map(j => {
            const s = sel.includes(j.dni);
            return (
              <div key={j.dni} onClick={() => toggle(j.dni)} style={{ ...S.row, cursor: "pointer", border: `1px solid ${s ? "#ffd166" : "#1a2840"}`, background: s ? "#131a0a" : "#0d1520" }}>
                <Avatar nombre={j.nombre} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{j.nombre}</div>
                  <div style={{ color: "#4a6a8a", fontSize: 12 }}>⚽ {j.goles} · {j.partidos} partidos</div>
                </div>
                <Badge score={calcularPromedio(j)} />
                {s && <span style={{ color: "#ffd166" }}>✓</span>}
              </div>
            );
          })}
          <Btn onClick={generar}>⚖️ Generar equipos balanceados</Btn>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            {[
              { label: "Equipo A", color: "#457b9d", jug: eqs.equipo1 },
              { label: "Equipo B", color: "#e63946", jug: eqs.equipo2 },
            ].map(eq => (
              <div key={eq.label} style={{ flex: 1, background: `linear-gradient(135deg,${eq.color}15,#111b2b)`, border: `1px solid ${eq.color}40`, borderRadius: 16, padding: 14 }}>
                <div style={{ color: eq.color, fontWeight: 800, fontSize: 15 }}>{eq.label}</div>
                <div style={{ color: "#4a6a8a", fontSize: 11, marginBottom: 10 }}>Score: {sumaEq(eq.jug)}</div>
                {eq.jug.map(j => (
                  <div key={j.dni} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Avatar nombre={j.nombre} size={26} />
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{j.nombre}</div>
                    <Badge score={calcularPromedio(j)} />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <Btn onClick={() => { setEqs(null); setSel([]); }} variant="ghost">🔄 Re-armar</Btn>
        </>
      )}
    </div>
  );
}

// ── PANTALLA STATS ──────────────────────────────────────────────────────────

function PantallaStats({ jugadoresArr, S }) {
  return (
    <div style={S.sec}>
      <div style={S.sTitle}>📊 Estadísticas</div>
      {jugadoresArr.length === 0 && <div style={{ color: "#4a6a8a", textAlign: "center", padding: 32 }}>No hay jugadores aún.</div>}
      {jugadoresArr.map((j, i) => (
        <Card key={j.dni}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: i < 3 ? "#ffd166" : "#3a5a7a", width: 24, textAlign: "center" }}>#{i+1}</div>
            <Avatar nombre={j.nombre} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{j.nombre}</div>
              <div style={{ color: "#4a6a8a", fontSize: 12 }}>DNI: {j.dni}</div>
            </div>
            <Badge score={calcularPromedio(j)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            {[
              { icon: "🏟️", label: "Partidos", val: j.partidos },
              { icon: "⚽", label: "Goles", val: j.goles },
              { icon: "⭐", label: "Promedio", val: j.partidos > 0 ? (j.puntajeTotal/j.partidos).toFixed(1) : "—" },
              { icon: "🥇", label: "MVPs", val: (j.historial||[]).filter(h=>h.mvp).length },
            ].map(s => (
              <div key={s.label} style={{ background: "#0d1520", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 13 }}>{s.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#ffd166" }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "#4a6a8a" }}>{s.label}</div>
              </div>
            ))}
          </div>
          {j.historial && j.historial.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "#4a6a8a", marginBottom: 6 }}>ÚLTIMOS PARTIDOS</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {j.historial.slice(-5).map((h, idx) => (
                  <div key={idx} style={{ background: "#0d1520", borderRadius: 7, padding: "3px 8px", fontSize: 11, border: "1px solid #1a2840" }}>
                    <span style={{ color: "#ffd166", fontWeight: 700 }}>{h.nota}</span>
                    <span style={{ color: "#4a6a8a" }}> ⚽{h.goles}</span>
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

// ── PANTALLA ADMIN ──────────────────────────────────────────────────────────

function PantallaAdmin({ jugadores, admins, partido, sesioDni, esSuperAdmin, saveJugadores, saveAdmins, savePartido, saveVotos, S }) {
  const [tab, setTab]         = useState("partido");
  const [dniAdmin, setDniAdmin] = useState("");
  const [adminMsg, setAdminMsg] = useState("");

  // Crear partido
  const [fecha,   setFecha]   = useState(partido.fecha || "");
  const [hora,    setHora]    = useState(partido.hora || "");
  const [lugar,   setLugar]   = useState(partido.lugar || "");
  const [formato, setFormato] = useState(partido.formato || "");
  const [pMsg,    setPMsg]    = useState("");

  // Invitado
  const [nomInv,  setNomInv]  = useState("");
  const [invMsg,  setInvMsg]  = useState("");

  async function crearPartido() {
    if (!fecha || !hora || !lugar || !formato) { setPMsg("Completá todos los campos"); return; }
    await savePartido({ ...defaultPartido, creado: true, fecha, hora, lugar, formato });
    await saveVotos({});
    setPMsg("✓ Partido creado!");
    setTimeout(() => setPMsg(""), 2500);
  }

  async function resetearPartido() {
    if (!confirm("¿Seguro que querés borrar el partido actual?")) return;
    await savePartido(defaultPartido);
    await saveVotos({});
  }

  async function borrarInscripto(id) {
    await savePartido({ ...partido, inscriptos: (partido.inscriptos || []).filter(d => d !== id) });
  }

  async function agregarInvitado() {
    if (!nomInv.trim()) { setInvMsg("Ingresá un nombre"); return; }
    const id = `inv_${Date.now()}`;
    const invitados = { ...(partido.invitados || {}), [id]: { nombre: nomInv.trim(), es_invitado: true } };
    const inscriptos = [...(partido.inscriptos || []), id];
    await savePartido({ ...partido, invitados, inscriptos });
    setNomInv(""); setInvMsg("✓ Invitado agregado!"); setTimeout(() => setInvMsg(""), 2000);
  }

  async function darAdmin(dni) {
    const j = jugadores[dni.trim()];
    if (!j) { setAdminMsg("DNI no encontrado"); return; }
    if ((admins.lista || []).includes(dni.trim())) { setAdminMsg("Ya es admin"); return; }
    await saveAdmins({ lista: [...(admins.lista || []), dni.trim()] });
    setDniAdmin(""); setAdminMsg(`✓ ${j.nombre} es admin`); setTimeout(() => setAdminMsg(""), 2500);
  }

  async function quitarAdmin(dni) {
    if (dni === SUPER_ADMIN_DNI) { setAdminMsg("No podés quitarte a vos mismo"); return; }
    await saveAdmins({ lista: (admins.lista || []).filter(d => d !== dni) });
  }

  const inscriptosObj = (partido.inscriptos || []).map(id => ({ id, jugador: jugadores[id] || (partido.invitados || {})[id] })).filter(x => x.jugador);
  const formato_ = FORMATOS.find(f => f.label === partido.formato);
  const cupo = formato_?.total || 0;
  const cupoLibre = cupo - (partido.inscriptos || []).length;

  return (
    <div style={S.sec}>
      <div style={S.sTitle}>👑 Panel Admin</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
        {["partido","inscriptos","admins"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: tab === t ? "#6a4c93" : "#131d2d", color: tab === t ? "#fff" : "#6a8aaa", whiteSpace: "nowrap", fontFamily: "inherit" }}>
            {t === "partido" ? "🗓️ Partido" : t === "inscriptos" ? "👥 Inscriptos" : "👑 Admins"}
          </button>
        ))}
      </div>

      {/* ─ CREAR PARTIDO ─ */}
      {tab === "partido" && (
        <>
          <Card accent="#6a4c9340">
            <div style={{ fontWeight: 800, marginBottom: 14 }}>{partido.creado ? "✏️ Editar partido" : "🗓️ Crear nuevo partido"}</div>
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            <div style={{ marginTop: 10 }} />
            <Label>Hora</Label>
            <Input type="time" value={hora} onChange={e => setHora(e.target.value)} />
            <div style={{ marginTop: 10 }} />
            <Label>Lugar</Label>
            <Input value={lugar} onChange={e => setLugar(e.target.value)} placeholder="Ej: Cancha de Palermo" />
            <div style={{ marginTop: 10 }} />
            <Label>Formato</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              {FORMATOS.map(f => (
                <button key={f.label} onClick={() => setFormato(f.label)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: formato === f.label ? "#ffd166" : "#1c2433", color: formato === f.label ? "#0d1117" : "#6a8aaa", fontFamily: "inherit" }}>
                  {f.label}
                </button>
              ))}
            </div>
            <Btn onClick={crearPartido} variant="admin" style={{ marginTop: 12 }}>{partido.creado ? "Actualizar partido" : "Crear partido"}</Btn>
            {partido.creado && <Btn onClick={resetearPartido} variant="danger">🗑️ Borrar partido</Btn>}
            <Msg ok={pMsg?.startsWith("✓")}>{pMsg}</Msg>
          </Card>
        </>
      )}

      {/* ─ INSCRIPTOS ─ */}
      {tab === "inscriptos" && (
        <>
          <Card>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>👤 Agregar invitado</div>
            <div style={{ color: "#4a6a8a", fontSize: 12, marginBottom: 10 }}>Para jugadores sin DNI (ej: "Amigo de Juan")</div>
            <Input value={nomInv} onChange={e => setNomInv(e.target.value)} placeholder='Ej: Amigo de Juan' onKeyDown={e => e.key === "Enter" && agregarInvitado()} />
            <Btn onClick={agregarInvitado} variant="ghost">+ Agregar invitado</Btn>
            <Msg ok={invMsg?.startsWith("✓")}>{invMsg}</Msg>
          </Card>

          <Card>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>👥 Inscriptos ({inscriptosObj.length}/{cupo})</div>
            <div style={{ color: cupoLibre > 0 ? "#06d6a0" : "#ef476f", fontSize: 12, marginBottom: 12 }}>
              {cupoLibre > 0 ? `${cupoLibre} lugares disponibles` : "Partido completo"}
            </div>
            {inscriptosObj.length === 0
              ? <div style={{ color: "#4a6a8a", textAlign: "center", padding: 16 }}>Sin inscriptos</div>
              : inscriptosObj.map(({ id, jugador }, idx) => (
                <div key={id} style={S.row}>
                  <div style={{ fontSize: 14, color: "#4a6a8a", width: 20, textAlign: "center" }}>#{idx+1}</div>
                  <Avatar nombre={jugador.nombre} size={30} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{jugador.nombre}</div>
                    {jugador.es_invitado && <Tag color="#6a4c93">Invitado</Tag>}
                  </div>
                  <button onClick={() => borrarInscripto(id)} style={{ background: "#ef476f20", border: "1px solid #ef476f40", color: "#ef476f", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>Borrar</button>
                </div>
              ))
            }
          </Card>
        </>
      )}

      {/* ─ ADMINS ─ */}
      {tab === "admins" && esSuperAdmin && (
        <Card accent="#6a4c9340">
          <div style={{ fontWeight: 800, marginBottom: 12 }}>👑 Gestionar admins</div>
          <Label>DNI del nuevo admin</Label>
          <Input value={dniAdmin} onChange={e => setDniAdmin(e.target.value)} placeholder="DNI del jugador" onKeyDown={e => e.key === "Enter" && darAdmin(dniAdmin)} />
          <Btn onClick={() => darAdmin(dniAdmin)} variant="admin">Dar permisos de admin</Btn>
          <Msg ok={adminMsg?.startsWith("✓")}>{adminMsg}</Msg>

          <div style={{ marginTop: 16, fontWeight: 700, marginBottom: 10 }}>Admins actuales:</div>
          {(admins.lista || []).map(dni => {
            const j = jugadores[dni];
            return (
              <div key={dni} style={S.row}>
                <Avatar nombre={j ? j.nombre : dni} size={30} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{j ? j.nombre : "DNI: " + dni}</div>
                  {dni === SUPER_ADMIN_DNI && <Tag color="#ffd166">Super Admin</Tag>}
                </div>
                {dni !== SUPER_ADMIN_DNI && (
                  <button onClick={() => quitarAdmin(dni)} style={{ background: "#ef476f20", border: "1px solid #ef476f40", color: "#ef476f", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Quitar</button>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {tab === "admins" && !esSuperAdmin && (
        <Card style={{ textAlign: "center", color: "#4a6a8a" }}>Solo el super admin puede gestionar admins.</Card>
      )}
    </div>
  );
}

const defaultPartido2 = { creado: false, fecha: "", hora: "", lugar: "", formato: null, inscriptos: [], goles: {}, finalizado: false, fechaFin: null, equipos: null, invitados: {}, notasAcumuladas: {}, mvpConteo: {}, votosContados: {} };
Object.assign(defaultPartido, defaultPartido2);
