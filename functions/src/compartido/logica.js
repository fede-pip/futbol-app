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
export function asignarVotaciones(inscriptos) {
  const jugadores = inscriptos.filter(id=>!id.startsWith("inv_"));
  const asig = {};
  jugadores.forEach(dni => {
    const otros = jugadores.filter(d=>d!==dni);
    asig[dni] = [...otros].sort(()=>Math.random()-.5).slice(0,Math.min(3,otros.length));
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

// Nuevo valor de un atributo tras la votación de un partido.
// Cada voto es -1 / 0 / +1; el cambio máximo por partido es ±0.25 y el valor queda entre 1 y 10.
export function nuevoAtributo(actual, suma, cant) {
  if (!cant) return actual;
  const prom = suma / cant;
  const delta = Math.min(0.25, Math.max(-0.25, prom * 0.25));
  return Math.min(10, Math.max(1, +((actual || 5) + delta).toFixed(2)));
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
