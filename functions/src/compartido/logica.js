// Lógica pura de App8 (sin React ni Firebase): fácil de testear.

export const ATTRS = [
  { key:"velocidad",   label:"Velocidad",   icon:"⚡", ej:"corrió" },
  { key:"pases",       label:"Pases",       icon:"🎯", ej:"pasó la pelota" },
  { key:"definicion",  label:"Definición",  icon:"🥅", ej:"definió" },
  { key:"amagues",     label:"Amagues",     icon:"🕺", ej:"gambeteó" },
  { key:"defensa",     label:"Defensa",     icon:"🛡️", ej:"defendió" },
  { key:"resistencia", label:"Resistencia", icon:"💪", ej:"aguantó físicamente" },
  { key:"arquero",     label:"Arquero",     icon:"🧤", ej:"atajó" },
];

export const FORMATOS = [
  {label:"5 vs 5",total:10},{label:"6 vs 6",total:12},{label:"7 vs 7",total:14},
  {label:"8 vs 8",total:16},{label:"9 vs 9",total:18},{label:"10 vs 10",total:20},{label:"11 vs 11",total:22}
];

export function calcProm(attrs) {
  if (!attrs) return 0;
  const v = ATTRS.map(a=>attrs[a.key]||0).filter(x=>x>0);
  return v.length ? +(v.reduce((s,x)=>s+x,0)/v.length).toFixed(2) : 0;
}
export function calcPuntos(historial) {
  // 3 pts ganado, 1 empate, 0 perdido — inferido del campo mvp/resultado del historial
  // Se guarda en historial como {resultado: "ganado"|"empatado"|"perdido"}
  return (historial||[]).reduce((s,h)=>{
    if(h.resultado==="ganado") return s+3;
    if(h.resultado==="empatado") return s+1;
    return s;
  },0);
}

export function calcRacha(historial) {
  const hist = (historial||[]).filter(h => ["ganado","empatado","perdido"].includes(h.resultado));
  if (hist.length === 0) return { tipo: null, n: 0 };
  const ultimo = hist[hist.length - 1].resultado;
  let n = 0;
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].resultado === ultimo) n++;
    else break;
  }
  return { tipo: ultimo, n };
}

// Formatea nombre: "Apellido, N." para tabla, nombre completo para resto
export function fmtNombre(nombre, modo="completo") {
  if(!nombre) return "—";
  const partes = nombre.trim().split(" ").filter(Boolean);
  if(partes.length === 1) return partes[0];
  if(modo === "tabla") {
    // Inicial del primer nombre + apellido completo (todo menos la primera palabra)
    // Ej: "Agustin Dal Maso" → "A. Dal Maso"
    // Ej: "Federico Pipkin" → "F. Pipkin"
    const inicial = partes[0][0].toUpperCase();
    const apellido = partes.slice(1).join(" ");
    return `${inicial}. ${apellido}`;
  }
  return nombre; // completo
}
export function balancear(lista) {
  const n = lista.length;
  const mitad = Math.floor(n/2);
  const shuffle = arr => [...arr].sort(()=>Math.random()-.5);

  if(n <= 2) {
    const s=[...lista].sort((a,b)=>calcProm(b.atributos)-calcProm(a.atributos));
    return {oscuro:shuffle([s[0]]), blanco:shuffle(s.slice(1))};
  }

  // Para grupos pequeños (≤14): buscar la combinación óptima por fuerza bruta parcial
  // Para grupos grandes: usar algoritmo greedy mejorado
  const prom = j => calcProm(j.atributos||{});
  const sumEquipo = eq => eq.reduce((s,j)=>s+prom(j),0);

  let mejorO=[], mejorB=[], mejorDiff=Infinity;

  if(n <= 12) {
    // Greedy con múltiples iteraciones aleatorias — encuentra combinación muy cercana al óptimo
    const intentos = 200;
    for(let t=0; t<intentos; t++){
      const shuffled = [...lista].sort(()=>Math.random()-.5);
      const o=shuffled.slice(0,mitad), b=shuffled.slice(mitad);
      const diff=Math.abs(sumEquipo(o)-sumEquipo(b));
      if(diff<mejorDiff){
        mejorDiff=diff;
        mejorO=[...o];
        mejorB=[...b];
      }
    }
    // Refinamiento: intentar swaps para mejorar
    let mejorado=true;
    while(mejorado){
      mejorado=false;
      for(let i=0;i<mejorO.length;i++){
        for(let j=0;j<mejorB.length;j++){
          // Probar swap
          const newO=[...mejorO]; const newB=[...mejorB];
          [newO[i],newB[j]]=[newB[j],newO[i]];
          const diff=Math.abs(sumEquipo(newO)-sumEquipo(newB));
          if(diff<mejorDiff-0.001){
            mejorDiff=diff;
            mejorO=newO; mejorB=newB;
            mejorado=true;
          }
        }
      }
    }
  } else {
    // Greedy para grupos grandes: ordenar y distribuir en serpenteo con swaps
    const s=[...lista].sort((a,b)=>prom(b.atributos)-prom(a.atributos));
    s.forEach((j,i)=>(i%2===0?mejorO:mejorB).push(j));
    // Refinamiento con swaps
    let mejorado=true;
    mejorDiff=Math.abs(sumEquipo(mejorO)-sumEquipo(mejorB));
    while(mejorado){
      mejorado=false;
      for(let i=0;i<mejorO.length;i++){
        for(let j=0;j<mejorB.length;j++){
          const newO=[...mejorO]; const newB=[...mejorB];
          [newO[i],newB[j]]=[newB[j],newO[i]];
          const diff=Math.abs(sumEquipo(newO)-sumEquipo(newB));
          if(diff<mejorDiff-0.001){
            mejorDiff=diff;
            mejorO=newO; mejorB=newB;
            mejorado=true;
          }
        }
      }
    }
  }

  // Mezclar display para no revelar ranking
  return {oscuro:shuffle(mejorO), blanco:shuffle(mejorB)};
}
// Reparte "ternas": cada votante recibe `cuantas` grupos de 3 compañeros (sin repetirse entre sí
// si alcanza la gente) y, en cada atributo, ordena a los tres: el que más, el del medio y el que menos.
// Se reparte parejo para que todos aparezcan en una cantidad parecida de ternas.
// Devuelve { uid: [{ j:[a,b,c] }, ...] } (Firestore no admite arreglos anidados).
export function asignarVotaciones(inscriptos, cuantas = 2) {
  const jugadores = inscriptos.filter(id => !id.startsWith('inv_'));
  const asig = {};
  const veces = Object.fromEntries(jugadores.map(id => [id, 0]));
  [...jugadores].sort(() => Math.random() - .5).forEach(votante => {
    const otros = jugadores.filter(d => d !== votante);
    if (otros.length < 3) { asig[votante] = []; return; }
    const usados = new Set();
    const ternas = [];
    for (let t = 0; t < cuantas; t++) {
      const libres = otros.filter(d => !usados.has(d));
      const base = libres.length >= 3 ? libres : otros;
      const orden = [...base].sort((x, y) => (veces[x] - veces[y]) || (Math.random() - .5));
      const terna = orden.slice(0, 3);
      terna.forEach(d => { usados.add(d); veces[d] += 1; });
      ternas.push({ j: terna });
    }
    asig[votante] = ternas;
  });
  return asig;
}
export function horasRestantes(fechaFin) {
  if (!fechaFin) return null;
  const fin = new Date(fechaFin).getTime() + 24*60*60*1000;
  const diff = fin - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000*60*60));
}

export function reemplazarVars(texto, vars) {
  let t = texto||"";
  Object.entries(vars).forEach(([k,v])=>{ t=t.replace(new RegExp(`{${k}}`,"g"),v||""); });
  // {es} para plural de "lugar"
  t = t.replace(/{es}/g, (vars.restantes===1||vars.restantes==="1")?"":"es");
  return t;
}

// Valor máximo/mínimo de un atributo y cuánto pesa cada comparación.
export const NIVEL_MIN = 1, NIVEL_MAX = 10, K_COMPARACION = 0.06, ESCALA_ELO = 2;

// Cada voto es una terna ordenada: { mas, medio, menos }. Se convierte en 3 comparaciones.
export function paresDeTerna({ mas, medio, menos }) {
  return [{ g: mas, p: medio }, { g: mas, p: menos }, { g: medio, p: menos }];
}

// Actualiza el nivel de UN atributo comparando jugadores entre sí (estilo Elo).
// `actuales`: { id: nivel }, `pares`: [{ g: ganador, p: perdedor }].
// Ganarle a alguien más fuerte suma mucho; ganarle a alguien más débil casi nada. Cada comparación
// suma lo mismo que resta, así que el promedio del grupo no se mueve y nadie "se infla" hasta 10.
export function actualizarNiveles(actuales, pares) {
  const delta = {};
  for (const { g, p } of pares) {
    const rg = actuales[g] || 5, rp = actuales[p] || 5;
    const esperado = 1 / (1 + Math.exp(-(rg - rp) / ESCALA_ELO));
    const d = K_COMPARACION * (1 - esperado) * 2;
    delta[g] = (delta[g] || 0) + d;
    delta[p] = (delta[p] || 0) - d;
  }
  const nuevos = {};
  for (const id of Object.keys(delta)) {
    const base = actuales[id] || 5;
    nuevos[id] = Math.min(NIVEL_MAX, Math.max(NIVEL_MIN, +(base + delta[id]).toFixed(2)));
  }
  return nuevos;
}

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ---- Invitados guardados: sin duplicados y sin quienes ya son del grupo ----
const sinTildes = s => (s || '').toLowerCase().trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '');
// registrados: [{id, nombre, nivel}]; nombresDelGrupo: nombres y apodos de los jugadores del grupo.
// Devuelve { utiles, sobrantes }: se conserva uno por nombre, el resto (y quienes ya juegan en el grupo) sobra.
export function depurarInvitados(registrados, nombresDelGrupo) {
  const miembros = new Set((nombresDelGrupo || []).map(sinTildes).filter(Boolean));
  const vistos = new Set(), utiles = [], sobrantes = [];
  const orden = [...(registrados || [])].sort((a, b) => sinTildes(a.nombre).localeCompare(sinTildes(b.nombre)) || String(a.id).localeCompare(String(b.id)));
  for (const r of orden) {
    const k = sinTildes(r.nombre);
    if (!k || miembros.has(k) || vistos.has(k)) { sobrantes.push(r); continue; }
    vistos.add(k); utiles.push(r);
  }
  return { utiles, sobrantes };
}

// Singular o plural según la cantidad: pl(1, 'lugar', 'lugares') -> 'lugar'.
export const pl = (n, uno, varios) => (Number(n) === 1 ? uno : varios);
// "Falta 1" / "Faltan 3" y "Queda 1" / "Quedan 3".
export const faltanN = n => `${pl(n, 'Falta', 'Faltan')} ${n}`;
export const quedanN = n => `${pl(n, 'Queda', 'Quedan')} ${n}`;
