import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, doc, setDoc, onSnapshot
} from 'firebase/firestore';

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

const JUGADORES_DOC  = () => doc(db, "futbol", "jugadores");
const PARTIDO_DOC    = () => doc(db, "futbol", "partidoActual");
const NOTIFS_DOC     = () => doc(db, "futbol", "notificaciones");

function calcularPromedio(j) {
  if (!j.partidos || j.partidos === 0) return 0;
  const base = j.puntajeTotal / j.partidos;
  const bonusGoles = (j.goles || 0) * 0.1;
  return Math.min(10, +(base + bonusGoles).toFixed(2));
}

function balancearEquipos(jugadoresSeleccionados) {
  const ordenados = [...jugadoresSeleccionados].sort(
    (a, b) => calcularPromedio(b) - calcularPromedio(a)
  );
  const eq1 = [], eq2 = [];
  ordenados.forEach((j, i) => { if (i % 2 === 0) eq1.push(j); else eq2.push(j); });
  return { equipo1: eq1, equipo2: eq2 };
}

function suma(eq) {
  return eq.reduce((s, j) => s + calcularPromedio(j), 0).toFixed(1);
}

function StarRating({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          width: 30, height: 30, borderRadius: 6, border: "none", cursor: "pointer",
          background: n <= value ? "#F5A623" : "#1e2a3a",
          color: n <= value ? "#000" : "#4a5568",
          fontWeight: 700, fontSize: 12, transition: "all .15s",
        }}>{n}</button>
      ))}
    </div>
  );
}

function Avatar({ nombre, size = 40 }) {
  const initials = nombre.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
  const colors = ["#E53E3E","#DD6B20","#D69E2E","#38A169","#319795","#3182CE","#805AD5","#D53F8C"];
  const color = colors[nombre.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size * 0.35, color: "#fff", flexShrink: 0,
    }}>{initials}</div>
  );
}

function ScoreBadge({ score }) {
  const color = score >= 8 ? "#48BB78" : score >= 5 ? "#F5A623" : "#FC8181";
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 8, padding: "2px 10px", fontWeight: 700, fontSize: 13,
    }}>{score.toFixed(1)}</span>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        border: "4px solid #1e3a5f", borderTopColor: "#F5A623",
        animation: "spin 0.8s linear infinite",
      }} />
      <div style={{ color: "#5a7a99", fontSize: 14 }}>Conectando con la base de datos...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function NotifBanner({ notifs, onDismiss }) {
  const noLeidas = (notifs || []).filter(n => !n.leida);
  if (noLeidas.length === 0) return null;
  return (
    <div style={{
      background: "linear-gradient(135deg,#1a3a10 0%,#0d2a08 100%)",
      border: "1px solid #38A169", borderRadius: 12, padding: "14px 16px", margin: "0 16px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 22 }}>🔔</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: "#68D391", fontSize: 14, marginBottom: 4 }}>¡Hay votaciones pendientes!</div>
          {noLeidas.map((n, i) => <div key={i} style={{ color: "#a0c4a0", fontSize: 13, marginBottom: 2 }}>{n.texto}</div>)}
        </div>
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#68D391", fontSize: 18, cursor: "pointer", padding: 0 }}>✕</button>
      </div>
    </div>
  );
}

const defaultPartido = { inscriptos: [], adminDni: null, goles: {}, finalizado: false, fechaFin: null, votos: {}, equipos: null };

export default function App() {
  const [cargando,   setCargando]   = useState(true);
  const [pantalla,   setPantalla]   = useState("inicio");
  const [jugadores,  setJugadores]  = useState({});
  const [partido,    setPartido]    = useState(defaultPartido);
  const [notifs,     setNotifs]     = useState([]);
  const [equipos,    setEquipos]    = useState(null);

  useEffect(() => {
    const unsubJ = onSnapshot(JUGADORES_DOC(), snap => {
      setJugadores(snap.exists() ? (snap.data().lista || {}) : {});
      setCargando(false);
    }, () => setCargando(false));
    const unsubP = onSnapshot(PARTIDO_DOC(), snap => {
      setPartido(snap.exists() ? { ...defaultPartido, ...snap.data() } : defaultPartido);
    });
    const unsubN = onSnapshot(NOTIFS_DOC(), snap => {
      setNotifs(snap.exists() ? (snap.data().lista || []) : []);
    });
    return () => { unsubJ(); unsubP(); unsubN(); };
  }, []);

  const ir = (p) => setPantalla(p);
  const inscriptosObj  = (partido.inscriptos || []).map(dni => jugadores[dni]).filter(Boolean);
  const adminObj       = jugadores[partido.adminDni];
  const equipoActualA  = ((partido.equipos?.equipo1) || []).map(dni => jugadores[dni]).filter(Boolean);
  const equipoActualB  = ((partido.equipos?.equipo2) || []).map(dni => jugadores[dni]).filter(Boolean);
  const notifsNoLeidas = notifs.filter(n => !n.leida);

  async function guardarJugadores(nuevos) { await setDoc(JUGADORES_DOC(), { lista: nuevos }); }
  async function guardarPartido(nuevo)    { await setDoc(PARTIDO_DOC(), nuevo); }
  async function guardarNotifs(nuevas)    { await setDoc(NOTIFS_DOC(), { lista: nuevas }); }

  const [formNombre, setFormNombre] = useState("");
  const [formDni,    setFormDni]    = useState("");
  const [formMsg,    setFormMsg]    = useState("");

  async function registrarJugador() {
    if (!formNombre.trim() || !formDni.trim()) { setFormMsg("Completá nombre y DNI"); return; }
    if (jugadores[formDni.trim()]) { setFormMsg("Ese DNI ya existe"); return; }
    const nuevo = { nombre: formNombre.trim(), dni: formDni.trim(), goles: 0, puntajeTotal: 0, partidos: 0, historial: [] };
    await guardarJugadores({ ...jugadores, [formDni.trim()]: nuevo });
    setFormNombre(""); setFormDni(""); setFormMsg("✓ Jugador registrado!");
    setTimeout(() => setFormMsg(""), 2500);
  }

  const [dniLogin,  setDniLogin]  = useState("");
  const [loginMsg,  setLoginMsg]  = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [dniAdmin,  setDniAdmin]  = useState("");
  const [adminMsg,  setAdminMsg]  = useState("");

  async function inscribirsePartido() {
    const jugador = jugadores[dniLogin.trim()];
    if (!jugador) { setLoginMsg("DNI no encontrado. ¿Ya te registraste?"); return; }
    if ((partido.inscriptos || []).includes(dniLogin.trim())) { setLoginMsg("Ya estás anotado ✓"); return; }
    await guardarPartido({ ...partido, inscriptos: [...(partido.inscriptos || []), dniLogin.trim()] });
    setDniLogin(""); setLoginMsg(`✓ ${jugador.nombre} anotado!`);
    setTimeout(() => setLoginMsg(""), 2500);
  }

  async function asignarAdmin() {
    const jugador = jugadores[dniAdmin.trim()];
    if (!jugador) { setAdminMsg("DNI no encontrado"); return; }
    if (!(partido.inscriptos || []).includes(dniAdmin.trim())) { setAdminMsg("Ese jugador no está anotado"); return; }
    await guardarPartido({ ...partido, adminDni: dniAdmin.trim() });
    setDniAdmin(""); setAdminMode(false); setAdminMsg(`✓ Admin: ${jugador.nombre}`);
    setTimeout(() => setAdminMsg(""), 2500);
  }

  const [dniAdminGoles, setDniAdminGoles] = useState("");
  const [adminAuth,     setAdminAuth]     = useState(false);
  const [adminAuthMsg,  setAdminAuthMsg]  = useState("");

  function autenticarAdmin() {
    if (dniAdminGoles.trim() === partido.adminDni) { setAdminAuth(true); setAdminAuthMsg(""); }
    else setAdminAuthMsg("DNI incorrecto. Solo el admin puede cargar goles.");
  }

  async function actualizarGoles(dni, delta) {
    const actual = (partido.goles || {})[dni] || 0;
    await guardarPartido({ ...partido, goles: { ...(partido.goles || {}), [dni]: Math.max(0, actual + delta) } });
  }

  async function finalizarPartido() {
    if (inscriptosObj.length < 2) { alert("Necesitás al menos 2 jugadores"); return; }
    const fecha = new Date().toLocaleString("es-AR");
    const notif = { texto: `El admin finalizó el partido del ${fecha}. ¡Entrá a votar a tus compañeros!`, leida: false, fecha };
    await guardarNotifs([...notifs, notif]);
    await guardarPartido({ ...partido, finalizado: true, fechaFin: fecha });
    setAdminAuth(false);
    ir("votar");
  }

  const [dniVotante,     setDniVotante]     = useState("");
  const [votanteBuscado, setVotanteBuscado] = useState(null);
  const [votosTemp,      setVotosTemp]      = useState({ notas: {}, mvpEquipoA: null, mvpEquipoB: null, mvpPartido: null });
  const [votarMsg,       setVotarMsg]       = useState("");
  const [votarBuscarMsg, setVotarBuscarMsg] = useState("");

  function buscarVotante() {
    const j = jugadores[dniVotante.trim()];
    if (!j) { setVotarBuscarMsg("DNI no encontrado"); return; }
    if (!(partido.inscriptos || []).includes(dniVotante.trim())) { setVotarBuscarMsg("No participaste en este partido"); return; }
    if ((partido.votos || {})[dniVotante.trim()]) { setVotarBuscarMsg("Ya votaste en este partido ✓"); return; }
    setVotanteBuscado(j); setVotarBuscarMsg("");
    const initNotas = {};
    (partido.inscriptos || []).filter(d => d !== dniVotante.trim()).forEach(d => { initNotas[d] = 0; });
    setVotosTemp({ notas: initNotas, mvpEquipoA: null, mvpEquipoB: null, mvpPartido: null });
  }

  async function enviarVotos() {
    const sinNota = Object.values(votosTemp.notas).some(v => v === 0);
    if (sinNota) { setVotarMsg("⚠️ Puntuá a todos los jugadores (1-10)"); return; }
    if (!votosTemp.mvpPartido) { setVotarMsg("⚠️ Elegí el mejor jugador del partido"); return; }
    if (equipoActualA.length > 0 && !votosTemp.mvpEquipoA) { setVotarMsg("⚠️ Elegí el mejor del Equipo A"); return; }
    if (equipoActualB.length > 0 && !votosTemp.mvpEquipoB) { setVotarMsg("⚠️ Elegí el mejor del Equipo B"); return; }
    await guardarPartido({ ...partido, votos: { ...(partido.votos || {}), [votanteBuscado.dni]: votosTemp } });
    setVotanteBuscado(null); setDniVotante("");
    setVotosTemp({ notas: {}, mvpEquipoA: null, mvpEquipoB: null, mvpPartido: null });
    setVotarMsg("✓ ¡Votos enviados!"); setTimeout(() => setVotarMsg(""), 2500);
  }

  async function cerrarVotacion() {
    const votos = partido.votos || {};
    const goles = partido.goles || {};
    const mvpPC = {}, mvpAC = {}, mvpBC = {};
    Object.values(votos).forEach(v => {
      if (v.mvpPartido) mvpPC[v.mvpPartido] = (mvpPC[v.mvpPartido] || 0) + 1;
      if (v.mvpEquipoA) mvpAC[v.mvpEquipoA] = (mvpAC[v.mvpEquipoA] || 0) + 1;
      if (v.mvpEquipoB) mvpBC[v.mvpEquipoB] = (mvpBC[v.mvpEquipoB] || 0) + 1;
    });
    const maxKey = (obj) => Object.keys(obj).length ? Object.keys(obj).reduce((a,b) => obj[a]>obj[b]?a:b) : null;
    const mvpPartido = maxKey(mvpPC), mvpA = maxKey(mvpAC), mvpB = maxKey(mvpBC);
    const jugadoresActualizados = { ...jugadores };
    (partido.inscriptos || []).forEach(dni => {
      const j = jugadores[dni]; if (!j) return;
      let totalVotos = 0, cantVotos = 0;
      Object.values(votos).forEach(v => {
        if (v.notas && v.notas[dni] !== undefined) { totalVotos += v.notas[dni]; cantVotos++; }
      });
      const promedioVotos = cantVotos > 0 ? totalVotos / cantVotos : 5;
      const golesPartido  = goles[dni] || 0;
      jugadoresActualizados[dni] = {
        ...j, goles: j.goles + golesPartido,
        puntajeTotal: j.puntajeTotal + promedioVotos, partidos: j.partidos + 1,
        historial: [...(j.historial || []), {
          fecha: new Date().toLocaleDateString("es-AR"),
          nota: +promedioVotos.toFixed(1), goles: golesPartido,
          mvpPartido: dni === mvpPartido, mvpEquipo: dni === mvpA || dni === mvpB,
        }],
      };
    });
    await guardarJugadores(jugadoresActualizados);
    await guardarPartido(defaultPartido);
    await guardarNotifs(notifs.map(n => ({ ...n, leida: true })));
    setEquipos(null); ir("historial");
  }

  const [seleccionados, setSeleccionados] = useState([]);
  function toggleSeleccion(dni) {
    setSeleccionados(s => s.includes(dni) ? s.filter(d => d !== dni) : [...s, dni]);
  }
  async function generarEquipos() {
    if (seleccionados.length < 4) { alert("Seleccioná al menos 4 jugadores"); return; }
    const jug = seleccionados.map(dni => jugadores[dni]).filter(Boolean);
    const eq  = balancearEquipos(jug);
    setEquipos(eq);
    await guardarPartido({ ...partido, equipos: { equipo1: eq.equipo1.map(j=>j.dni), equipo2: eq.equipo2.map(j=>j.dni) } });
  }
  async function marcarNotifsLeidas() {
    await guardarNotifs(notifs.map(n => ({ ...n, leida: true })));
  }

  const S = {
    app:    { minHeight: "100vh", background: "#0a0f1a", color: "#e2e8f0", fontFamily: "'Barlow','Segoe UI',sans-serif", maxWidth: 480, margin: "0 auto", paddingBottom: 80 },
    header: { background: "linear-gradient(135deg,#0d1b2e 0%,#132035 100%)", borderBottom: "1px solid #1e3a5f", padding: "20px 20px 16px", position: "sticky", top: 0, zIndex: 100 },
    logo:   { fontSize: 22, fontWeight: 900, letterSpacing: 1, color: "#fff" },
    accent: { color: "#F5A623" },
    nav:    { display: "flex", gap: 4, padding: "10px 12px", background: "#0d1520", borderBottom: "1px solid #1a2a3a", overflowX: "auto" },
    navBtn: (a) => ({ padding: "7px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap", background: a ? "#F5A623" : "#1a2a3a", color: a ? "#000" : "#8a9bb0", transition: "all .2s" }),
    section:{ padding: "16px 16px" },
    card:   { background: "#111b2b", borderRadius: 16, border: "1px solid #1e3a5f", padding: 16, marginBottom: 14 },
    input:  { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #1e3a5f", background: "#0d1520", color: "#e2e8f0", fontSize: 15, outline: "none", boxSizing: "border-box" },
    btn:    (v="primary") => ({ padding: "12px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: v==="primary"?"#F5A623":v==="danger"?"#E53E3E":v==="green"?"#38A169":v==="admin"?"#805AD5":"#1e3a5f", color: v==="primary"?"#000":"#fff", width: "100%", marginTop: 8 }),
    label:  { fontSize: 12, color: "#5a7a99", fontWeight: 600, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: .5 },
    msg:    (ok) => ({ padding: "10px 14px", borderRadius: 8, marginTop: 8, fontSize: 13, background: ok?"#1a3a2a":"#3a1a1a", color: ok?"#68D391":"#FC8181", border: `1px solid ${ok?"#276749":"#742a2a"}` }),
    sTitle: { fontSize: 18, fontWeight: 800, marginBottom: 16, color: "#fff" },
    pRow:   { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "#0d1520", border: "1px solid #1e3a5f", marginBottom: 8 },
    tCard:  (c) => ({ background: `linear-gradient(135deg,${c}15 0%,#111b2b 100%)`, border: `1px solid ${c}40`, borderRadius: 16, padding: 16, flex: 1 }),
    adminBadge: { background: "#805AD522", color: "#B794F4", border: "1px solid #805AD544", borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 700, display: "inline-block" },
  };

  const jugadoresArr = Object.values(jugadores).sort((a,b) => calcularPromedio(b) - calcularPromedio(a));
  if (cargando) return <div style={S.app}><Spinner /></div>;

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>⚽</span>
          <div style={{ flex: 1 }}>
            <div style={S.logo}>FÚTBOL<span style={S.accent}>APP</span></div>
            <div style={{ fontSize: 11, color: "#4a6a8a", letterSpacing: 1 }}>BASE DE DATOS COMPARTIDA 🔥</div>
          </div>
          {notifsNoLeidas.length > 0 && (
            <div style={{ background: "#E53E3E", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>
              {notifsNoLeidas.length}
            </div>
          )}
        </div>
      </div>
      <div style={S.nav}>
        {[
          { id: "inicio", label: "🏠 Inicio" },
          { id: "partido", label: "📋 Partido" },
          { id: "votar", label: `🗳️ Votar${notifsNoLeidas.length > 0 ? " 🔴" : ""}` },
          { id: "armarEquipos", label: "⚖️ Equipos" },
          { id: "historial", label: "📊 Stats" },
        ].map(tab => (
          <button key={tab.id} style={S.navBtn(pantalla === tab.id)} onClick={() => ir(tab.id)}>{tab.label}</button>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <NotifBanner notifs={notifs} onDismiss={marcarNotifsLeidas} />
      </div>

      {pantalla === "inicio" && (
        <div style={S.section}>
          <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
            <div style={{ fontSize: 56 }}>⚽</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: "10px 0 6px" }}>Bienvenido a <span style={S.accent}>FútbolApp</span></h1>
            <p style={{ color: "#5a7a99", fontSize: 14, lineHeight: 1.6 }}>Todos los datos se guardan en la nube<br/>y se comparten entre todos los jugadores.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Jugadores", value: jugadoresArr.length, icon: "👥" },
              { label: "Anotados",  value: (partido.inscriptos || []).length, icon: "📋" },
              { label: "Votaron",   value: Object.keys(partido.votos || {}).length, icon: "🗳️" },
            ].map(stat => (
              <div key={stat.label} style={{ ...S.card, textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 22 }}>{stat.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#F5A623" }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: "#5a7a99" }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={S.sTitle}>Registrar nuevo jugador</div>
            <label style={S.label}>Nombre completo</label>
            <input style={{ ...S.input, marginBottom: 10 }} placeholder="Ej: Juan Pérez" value={formNombre} onChange={e => setFormNombre(e.target.value)} />
            <label style={S.label}>DNI (tu ID en la app)</label>
            <input style={S.input} placeholder="Ej: 38123456" value={formDni} onChange={e => setFormDni(e.target.value)} onKeyDown={e => e.key === "Enter" && registrarJugador()} />
            <button style={S.btn()} onClick={registrarJugador}>Registrarme</button>
            {formMsg && <div style={S.msg(formMsg.startsWith("✓"))}>{formMsg}</div>}
          </div>
        </div>
      )}

      {pantalla === "partido" && (
        <div style={S.section}>
          <div style={S.sTitle}>📋 Partido</div>
          {!partido.finalizado ? (
            <>
              <div style={S.card}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📝 Anotarme</div>
                <label style={S.label}>Tu DNI</label>
                <input style={S.input} placeholder="Ingresá tu DNI" value={dniLogin} onChange={e => setDniLogin(e.target.value)} onKeyDown={e => e.key === "Enter" && inscribirsePartido()} />
                <button style={S.btn()} onClick={inscribirsePartido}>Anotarme al partido</button>
                {loginMsg && <div style={S.msg(loginMsg.startsWith("✓"))}>{loginMsg}</div>}
              </div>
              <div style={{ ...S.card, border: "1px solid #805AD544" }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🔑 Admin del partido</div>
                {adminObj ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                    <Avatar nombre={adminObj.nombre} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>{adminObj.nombre}</div>
                      <div style={S.adminBadge}>👑 ADMIN</div>
                    </div>
                    <button onClick={() => { setAdminMode(true); guardarPartido({ ...partido, adminDni: null }); }} style={{ background: "#1e3a5f", border: "none", color: "#8a9bb0", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Cambiar</button>
                  </div>
                ) : (
                  <>
                    <div style={{ color: "#5a7a99", fontSize: 13, marginBottom: 10 }}>El admin es el único que puede cargar goles y finalizar el partido.</div>
                    {!adminMode ? (
                      <button style={S.btn("admin")} onClick={() => setAdminMode(true)}>👑 Designar admin</button>
                    ) : (
                      <>
                        <label style={S.label}>DNI del admin</label>
                        <input style={S.input} placeholder="DNI del jugador admin" value={dniAdmin} onChange={e => setDniAdmin(e.target.value)} />
                        <button style={S.btn("admin")} onClick={asignarAdmin}>Confirmar admin</button>
                        {adminMsg && <div style={S.msg(false)}>{adminMsg}</div>}
                      </>
                    )}
                  </>
                )}
                {adminMsg && adminObj && <div style={S.msg(true)}>{adminMsg}</div>}
              </div>
              <div style={S.card}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>👥 Inscriptos ({inscriptosObj.length})</div>
                {inscriptosObj.length === 0
                  ? <div style={{ color: "#5a7a99", fontSize: 13, textAlign: "center", padding: 16 }}>Nadie anotado aún</div>
                  : inscriptosObj.map(j => (
                    <div key={j.dni} style={S.pRow}>
                      <Avatar nombre={j.nombre} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{j.nombre}</div>
                        <div style={{ color: "#5a7a99", fontSize: 12 }}>DNI: {j.dni}</div>
                      </div>
                      {j.dni === partido.adminDni && <span style={S.adminBadge}>👑</span>}
                      <ScoreBadge score={calcularPromedio(j)} />
                    </div>
                  ))
                }
              </div>
              {inscriptosObj.length > 0 && partido.adminDni && (
                <div style={{ ...S.card, border: "1px solid #805AD544" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>⚽ Cargar goles</div>
                  <div style={{ color: "#5a7a99", fontSize: 12, marginBottom: 12 }}>Solo el admin puede cargar goles y finalizar el partido.</div>
                  {!adminAuth ? (
                    <>
                      <label style={S.label}>Verificar — DNI del admin</label>
                      <input style={S.input} placeholder="Ingresá el DNI del admin" value={dniAdminGoles} onChange={e => setDniAdminGoles(e.target.value)} />
                      <button style={S.btn("admin")} onClick={autenticarAdmin}>Ingresar como admin</button>
                      {adminAuthMsg && <div style={S.msg(false)}>{adminAuthMsg}</div>}
                    </>
                  ) : (
                    <>
                      <div style={{ ...S.msg(true), marginBottom: 12 }}>✓ Sesión admin — {adminObj?.nombre}</div>
                      {inscriptosObj.map(j => (
                        <div key={j.dni} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <Avatar nombre={j.nombre} size={32} />
                          <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{j.nombre}</div>
                          <button onClick={() => actualizarGoles(j.dni, -1)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "#1e3a5f", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>−</button>
                          <span style={{ width: 28, textAlign: "center", fontWeight: 800, fontSize: 18, color: "#F5A623" }}>{(partido.goles || {})[j.dni] || 0}</span>
                          <button onClick={() => actualizarGoles(j.dni, 1)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "#38A169", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>+</button>
                        </div>
                      ))}
                      <button style={{ ...S.btn("danger"), marginTop: 16 }} onClick={finalizarPartido}>🏁 Finalizar partido</button>
                    </>
                  )}
                </div>
              )}
              {inscriptosObj.length > 0 && !partido.adminDni && (
                <div style={{ ...S.card, background: "#1a1a2a", textAlign: "center", color: "#5a7a99", fontSize: 13 }}>⚠️ Designá un admin para cargar goles y finalizar el partido.</div>
              )}
            </>
          ) : (
            <div style={{ ...S.card, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🏁</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Partido finalizado</div>
              <div style={{ color: "#5a7a99", fontSize: 13, marginTop: 6 }}>Votos: {Object.keys(partido.votos || {}).length} / {inscriptosObj.length}</div>
              <button style={S.btn("green")} onClick={() => ir("votar")}>Ir a votar</button>
              {Object.keys(partido.votos || {}).length === inscriptosObj.length && inscriptosObj.length > 0 && (
                <button style={S.btn("danger")} onClick={cerrarVotacion}>✅ Cerrar votación y guardar resultados</button>
              )}
            </div>
          )}
        </div>
      )}

      {pantalla === "votar" && (
        <div style={S.section}>
          <div style={S.sTitle}>🗳️ Votar</div>
          {!partido.finalizado ? (
            <div style={{ ...S.card, textAlign: "center", color: "#5a7a99" }}>El partido no ha finalizado. El admin debe finalizarlo primero.</div>
          ) : (
            <>
              <div style={{ ...S.card, background: "#0d1e10", border: "1px solid #276749" }}>
                <div style={{ fontSize: 13, color: "#68D391" }}>✅ Votaron {Object.keys(partido.votos || {}).length} / {inscriptosObj.length} jugadores</div>
                {partido.fechaFin && <div style={{ color: "#4a8a5a", fontSize: 12, marginTop: 4 }}>Partido del {partido.fechaFin}</div>}
              </div>
              {!votanteBuscado ? (
                <div style={S.card}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Ingresar para votar</div>
                  <label style={S.label}>Tu DNI</label>
                  <input style={S.input} placeholder="Ingresá tu DNI" value={dniVotante} onChange={e => setDniVotante(e.target.value)} />
                  <button style={S.btn()} onClick={buscarVotante}>Ingresar</button>
                  {votarBuscarMsg && <div style={S.msg(false)}>{votarBuscarMsg}</div>}
                  {votarMsg && <div style={S.msg(true)}>{votarMsg}</div>}
                </div>
              ) : (
                <div style={S.card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <Avatar nombre={votanteBuscado.nombre} />
                    <div>
                      <div style={{ fontWeight: 800 }}>{votanteBuscado.nombre}</div>
                      <div style={{ color: "#5a7a99", fontSize: 12 }}>Votando a sus compañeros</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#F5A623" }}>⭐ Puntuá a cada jugador (1-10)</div>
                  {inscriptosObj.filter(j => j.dni !== votanteBuscado.dni).map(j => (
                    <div key={j.dni} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #1e3a5f" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Avatar nombre={j.nombre} size={30} />
                        <div style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{j.nombre}</div>
                        <div style={{ color: "#F5A623", fontWeight: 800 }}>{votosTemp.notas[j.dni] || "—"}/10</div>
                      </div>
                      <StarRating value={votosTemp.notas[j.dni] || 0} onChange={v => setVotosTemp(prev => ({ ...prev, notas: { ...prev.notas, [j.dni]: v } }))} />
                    </div>
                  ))}
                  {equipoActualA.length > 0 && (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: "#3182CE", marginTop: 8 }}>🏆 Mejor jugador — Equipo A</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                        {equipoActualA.filter(j => j.dni !== votanteBuscado.dni).map(j => (
                          <div key={j.dni} onClick={() => setVotosTemp(p => ({ ...p, mvpEquipoA: j.dni }))}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${votosTemp.mvpEquipoA === j.dni ? "#3182CE" : "#1e3a5f"}`, background: votosTemp.mvpEquipoA === j.dni ? "#0a1e3a" : "#0d1520", transition: "all .15s" }}>
                            <Avatar nombre={j.nombre} size={30} />
                            <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{j.nombre}</div>
                            {votosTemp.mvpEquipoA === j.dni && <span style={{ color: "#3182CE" }}>✓</span>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {equipoActualB.length > 0 && (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: "#E53E3E" }}>🏆 Mejor jugador — Equipo B</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                        {equipoActualB.filter(j => j.dni !== votanteBuscado.dni).map(j => (
                          <div key={j.dni} onClick={() => setVotosTemp(p => ({ ...p, mvpEquipoB: j.dni }))}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${votosTemp.mvpEquipoB === j.dni ? "#E53E3E" : "#1e3a5f"}`, background: votosTemp.mvpEquipoB === j.dni ? "#3a0a0a" : "#0d1520", transition: "all .15s" }}>
                            <Avatar nombre={j.nombre} size={30} />
                            <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{j.nombre}</div>
                            {votosTemp.mvpEquipoB === j.dni && <span style={{ color: "#E53E3E" }}>✓</span>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: "#F5A623" }}>🥇 Mejor jugador del partido</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                    {inscriptosObj.filter(j => j.dni !== votanteBuscado.dni).map(j => (
                      <div key={j.dni} onClick={() => setVotosTemp(p => ({ ...p, mvpPartido: j.dni }))}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${votosTemp.mvpPartido === j.dni ? "#F5A623" : "#1e3a5f"}`, background: votosTemp.mvpPartido === j.dni ? "#1a150a" : "#0d1520", transition: "all .15s" }}>
                        <Avatar nombre={j.nombre} size={30} />
                        <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{j.nombre}</div>
                        {votosTemp.mvpPartido === j.dni && <span style={{ color: "#F5A623", fontSize: 18 }}>⭐</span>}
                      </div>
                    ))}
                  </div>
                  <button style={S.btn("green")} onClick={enviarVotos}>Enviar todos los votos</button>
                  {votarMsg && <div style={S.msg(votarMsg.startsWith("✓"))}>{votarMsg}</div>}
                </div>
              )}
              {Object.keys(partido.votos || {}).length === inscriptosObj.length && inscriptosObj.length > 0 && (
                <button style={S.btn("danger")} onClick={cerrarVotacion}>✅ Todos votaron — Cerrar y guardar resultados</button>
              )}
            </>
          )}
        </div>
      )}

      {pantalla === "armarEquipos" && (
        <div style={S.section}>
          <div style={S.sTitle}>⚖️ Armar Equipos</div>
          {!equipos ? (
            <>
              <div style={{ ...S.card, background: "#0d1520", marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: "#5a7a99" }}>Seleccioná los jugadores y la app armará los equipos de forma pareja según sus puntajes.</div>
              </div>
              <div style={{ marginBottom: 12, color: "#F5A623", fontWeight: 700, fontSize: 13 }}>Seleccionados: {seleccionados.length}</div>
              {jugadoresArr.length === 0 && <div style={{ color: "#5a7a99", textAlign: "center", padding: 24 }}>No hay jugadores registrados.</div>}
              {jugadoresArr.map(j => {
                const sel = seleccionados.includes(j.dni);
                return (
                  <div key={j.dni} onClick={() => toggleSeleccion(j.dni)} style={{ ...S.pRow, cursor: "pointer", border: sel ? "1px solid #F5A623" : "1px solid #1e3a5f", background: sel ? "#1a2a0a" : "#0d1520", transition: "all .15s" }}>
                    <Avatar nombre={j.nombre} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{j.nombre}</div>
                      <div style={{ color: "#5a7a99", fontSize: 12 }}>⚽ {j.goles} goles · {j.partidos} partidos</div>
                    </div>
                    <ScoreBadge score={calcularPromedio(j)} />
                    {sel && <span style={{ color: "#F5A623", fontSize: 18 }}>✓</span>}
                  </div>
                );
              })}
              <button style={S.btn()} onClick={generarEquipos}>⚖️ Generar equipos balanceados</button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                {[
                  { label: "Equipo A", color: "#3182CE", jugadores: equipos.equipo1 },
                  { label: "Equipo B", color: "#E53E3E", jugadores: equipos.equipo2 },
                ].map(eq => (
                  <div key={eq.label} style={S.tCard(eq.color)}>
                    <div style={{ color: eq.color, fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{eq.label}</div>
                    <div style={{ color: "#5a7a99", fontSize: 12, marginBottom: 12 }}>Score: <span style={{ color: eq.color, fontWeight: 700 }}>{suma(eq.jugadores)}</span></div>
                    {eq.jugadores.map(j => (
                      <div key={j.dni} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Avatar nombre={j.nombre} size={28} />
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{j.nombre}</div>
                        <ScoreBadge score={calcularPromedio(j)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <button style={S.btn("secondary")} onClick={() => { setEquipos(null); setSeleccionados([]); }}>🔄 Re-armar</button>
            </>
          )}
        </div>
      )}

      {pantalla === "historial" && (
        <div style={S.section}>
          <div style={S.sTitle}>📊 Estadísticas</div>
          {jugadoresArr.length === 0 && <div style={{ color: "#5a7a99", textAlign: "center", padding: 32 }}>No hay jugadores registrados.</div>}
          {jugadoresArr.map((j, i) => (
            <div key={j.dni} style={S.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: i < 3 ? "#F5A623" : "#4a6a8a", width: 24, textAlign: "center" }}>#{i+1}</div>
                <Avatar nombre={j.nombre} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{j.nombre}</div>
                  <div style={{ color: "#5a7a99", fontSize: 12 }}>DNI: {j.dni}</div>
                </div>
                <ScoreBadge score={calcularPromedio(j)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Partidos", value: j.partidos, icon: "🏟️" },
                  { label: "Goles", value: j.goles, icon: "⚽" },
                  { label: "Prom.", value: j.partidos > 0 ? (j.puntajeTotal/j.partidos).toFixed(1) : "—", icon: "⭐" },
                  { label: "MVPs", value: (j.historial||[]).filter(h=>h.mvpPartido).length, icon: "🥇" },
                ].map(stat => (
                  <div key={stat.label} style={{ background: "#0d1520", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: 14 }}>{stat.icon}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#F5A623" }}>{stat.value}</div>
                    <div style={{ fontSize: 10, color: "#5a7a99" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              {j.historial && j.historial.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: "#5a7a99", marginBottom: 6 }}>ÚLTIMOS PARTIDOS</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {j.historial.slice(-5).map((h, idx) => (
                      <div key={idx} style={{ background: "#0d1520", borderRadius: 8, padding: "4px 8px", fontSize: 12, border: "1px solid #1e3a5f" }}>
                        <span style={{ color: "#F5A623", fontWeight: 700 }}>{h.nota}</span>
                        <span style={{ color: "#5a7a99" }}> · ⚽{h.goles}</span>
                        {h.mvpPartido && <span style={{ marginLeft: 4 }}>🥇</span>}
                        {h.mvpEquipo && !h.mvpPartido && <span style={{ marginLeft: 2 }}>🏆</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
