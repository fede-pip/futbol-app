// Catálogo de avisos de App8. Es la única fuente de verdad: la app y las Cloud Functions
// usan este mismo archivo (functions/src/compartido/ lo recibe copiado con `npm run sync`).

export const AUD = {todos:['Todos',12], anot:['Anotados',10], noanot:['No anotados',2], espera:['Lista de espera',1], cena:['Se quedan a comer',6], novotaron:['Los que no votaron',2], admins:['Admins',2], persona:['Solo la persona involucrada',1]};
export const MUESTRA = {comunidad:'Fútbol de los Lunes', destinatario:'Fede', nombre:'Nico', dia:'lunes', fecha:'lunes 19 de octubre', hora:'21:30', lugar:'Cancha Palermo', formato:'6 vs 6', cupo:'12', anotados:'10', restantes:'2', faltan:'2', en_espera:'1', cena:'6', golesO:'4', golesB:'3', resultado:'Ganó Oscuro 4-3', mi_equipo:'Oscuro', mvp:'Nico Ferrari', votaron:'8', faltan_votar:'2', horas_restantes:'6', racha:'3', puntos:'31', posicion:'2', goles:'9', precio:'$4.500', pozo:'$18.000', atributo:'Definición', partidos:'2'};
export const VARS_DESC = {
  Partido:{fecha:'Fecha completa',dia:'Día de la semana',hora:'Hora',lugar:'Lugar',formato:'Formato (6 vs 6)',cupo:'Lugares en total',anotados:'Cuántos se anotaron',restantes:'Lugares libres',faltan:'Cuántos faltan para completar',en_espera:'Personas en lista de espera',cena:'Cuántos se quedan a comer'},
  Personas:{destinatario:'Nombre de quien lo recibe',nombre:'Nombre de quien hizo la acción',mi_equipo:'Equipo de quien lo recibe',comunidad:'Nombre del grupo'},
  Resultado:{golesO:'Goles de Oscuro',golesB:'Goles de Blanco',resultado:'Resultado en una frase',mvp:'Nombre del MVP'},
  Votación:{votaron:'Cuántos ya votaron',faltan_votar:'Cuántos faltan votar',horas_restantes:'Horas que quedan para votar'},
  Estadísticas:{racha:'Partidos seguidos ganando',puntos:'Puntos de la temporada',posicion:'Puesto en la tabla',goles:'Goles de la temporada',atributo:'Atributo que cambió',partidos:'Partidos jugados'},
  Plata:{precio:'Precio por persona',pozo:'Pozo acumulado'}
};
export const GRUPOS_AV = ['Antes del partido','Día del partido','Después del partido','Tu grupo'];

const T24 = ['48 h antes','24 h antes','12 h antes','2 h antes'];
const EVT = ['Al instante','Agrupar cada 30 min'];

export const CAT_DEF = [
 {id:'partido_nuevo',g:0,ic:'cal',t:'Partido nuevo',cuandoTxt:'Al crear el partido',opts:['Al instante'],sel:0,quien:['todos'],titulo:'Hay partido el {dia} a las {hora}',cuerpo:'{lugar} · {formato}. ¡Anotate!',vars:['dia','hora','lugar','formato','cupo'],on:true},
 {id:'inscripcion',g:0,ic:'plus',t:'Alguien se anotó',opts:EVT,sel:1,quien:['todos'],titulo:'{nombre} se anotó',cuerpo:'Ya somos {anotados}. Quedan {restantes} lugares.',vars:['nombre','anotados','restantes','faltan'],on:true},
 {id:'pocos_lugares',g:0,ic:'bell',t:'Quedan pocos lugares',opts:['Cuando quedan 3 o menos','Cuando quedan 2 o menos'],sel:0,quien:['noanot'],titulo:'Quedan {restantes} lugares para el {dia}',cuerpo:'{nombre} se anotó. Sumate antes de que se llene.',vars:['restantes','nombre','dia','hora'],on:true},
 {id:'cupo_completo',g:0,ic:'check',t:'Cupo completo',opts:['Al instante'],sel:0,quien:['todos'],titulo:'Ya somos {cupo}. ¡Está completo!',cuerpo:'Si querés jugar, anotate en la lista de espera.',vars:['cupo','dia','hora'],on:true,nuevo:true},
 {id:'lista_espera',g:0,ic:'users',t:'Se liberó un lugar',opts:['Al instante'],sel:0,quien:['espera'],titulo:'Entraste al partido del {dia}',cuerpo:'Se bajó alguien y ahora jugás a las {hora} en {lugar}.',vars:['dia','hora','lugar','destinatario'],on:true,nuevo:true},
 {id:'recordatorio_24h',g:0,ic:'clock',t:'Recordatorio, un día antes',opts:T24,sel:1,quien:['anot'],titulo:'Mañana jugás a las {hora}',cuerpo:'{lugar}. Somos {anotados}. Si no podés, desanotate hoy.',vars:['hora','lugar','anotados','mi_equipo','destinatario'],on:true,nuevo:true},
 {id:'faltan_jugadores',g:0,ic:'bell',t:'Faltan jugadores',opts:T24,sel:1,quien:['noanot'],titulo:'Faltan {faltan} para completar',cuerpo:'Quedan {restantes} lugares el {dia}. ¿Te sumás?',vars:['faltan','restantes','dia','hora','lugar'],on:true,nuevo:true,aviso:'Solo sale si el partido no está completo.'},
 {id:'baja',g:0,ic:'minus',t:'Alguien se bajó',opts:['Si se baja con menos de 24 h','Siempre'],sel:0,quien:['admins'],titulo:'{nombre} se bajó',cuerpo:'Faltan {faltan} para completar el {dia}.',vars:['nombre','faltan','en_espera','dia'],on:true,nuevo:true},
 {id:'cambio_partido',g:0,ic:'pin',t:'Cambió el horario o el lugar',opts:['Al instante'],sel:0,quien:['anot'],titulo:'Cambió el partido del {dia}',cuerpo:'Ahora es a las {hora} en {lugar}.',vars:['dia','hora','lugar'],on:true,nuevo:true,critico:true},
 {id:'cancelado',g:0,ic:'shield',t:'Partido cancelado',opts:['Al instante'],sel:0,quien:['todos'],titulo:'Se canceló el partido del {dia}',cuerpo:'Avisamos cuando haya nueva fecha.',vars:['dia','fecha','comunidad'],on:true,nuevo:true,critico:true},
 {id:'equipos',g:1,ic:'users',t:'Equipos publicados',opts:['Al instante'],sel:0,quien:['anot'],titulo:'¡Ya están los equipos!',cuerpo:'Jugás en {mi_equipo}. Nos vemos a las {hora}.',vars:['mi_equipo','hora','lugar','destinatario'],on:true},
 {id:'cambio_equipo',g:1,ic:'refresh',t:'Te cambiaron de equipo',opts:['Al instante'],sel:0,quien:['persona'],titulo:'Cambió tu equipo',cuerpo:'Ahora jugás en {mi_equipo}.',vars:['mi_equipo','destinatario'],on:true,nuevo:true},
 {id:'recordatorio_2h',g:1,ic:'clock',t:'Ya casi, 2 horas antes',opts:['3 h antes','2 h antes','1 h antes'],sel:1,quien:['anot'],titulo:'Hoy a las {hora}',cuerpo:'{lugar}. Equipo: {mi_equipo}. ¡Llevá agua!',vars:['hora','lugar','mi_equipo'],on:true,nuevo:true},
 {id:'equipos_pendientes',g:1,ic:'users',t:'Equipos sin armar',opts:['4 h antes','3 h antes','2 h antes'],sel:1,quien:['admins'],titulo:'Faltan pocas horas y no hay equipos',cuerpo:'Hay {anotados} anotados para las {hora}. Armalos y publicalos.',vars:['anotados','hora'],on:true,nuevo:true},
 {id:'tercer_tiempo',g:1,ic:'food',t:'Tercer tiempo',opts:EVT,sel:1,quien:['cena'],titulo:'Tercer tiempo: somos {cena}',cuerpo:'{nombre} se sumó a comer después del partido.',vars:['cena','nombre','lugar'],on:true,nuevo:true},
 {id:'votaciones',g:2,ic:'vote',t:'Votación abierta',opts:['Al finalizar el partido'],sel:0,quien:['anot'],titulo:'Votá a tus compañeros',cuerpo:'Terminó {golesO} a {golesB}. Tenés {horas_restantes} h para votar.',vars:['golesO','golesB','horas_restantes','destinatario'],on:true},
 {id:'votos_pendientes',g:2,ic:'bell',t:'Todavía no votaste',opts:['12 h y 3 h antes de cerrar','Solo 3 h antes'],sel:0,quien:['novotaron'],titulo:'Te falta votar, {destinatario}',cuerpo:'Quedan {horas_restantes} h. Ya votaron {votaron} del grupo.',vars:['destinatario','horas_restantes','votaron','faltan_votar'],on:true,nuevo:true},
 {id:'votos_admin',g:2,ic:'check',t:'Votación lista para cerrar',opts:['Cuando votaron todos','Cuando vence el plazo'],sel:0,quien:['admins'],titulo:'Votaron {votaron} de {anotados}',cuerpo:'Faltan {faltan_votar}. ¿Cerrás la votación?',vars:['votaron','faltan_votar','anotados'],on:true,nuevo:true},
 {id:'resultado',g:2,ic:'chart',t:'Resultado final',opts:['Al cerrar la votación'],sel:0,quien:['anot'],titulo:'{resultado}',cuerpo:'Ya se actualizaron las estadísticas.',vars:['resultado','golesO','golesB','mvp'],on:true},
 {id:'mvp',g:2,ic:'star',t:'Sos el MVP',opts:['Al cerrar la votación'],sel:0,quien:['persona'],titulo:'¡Sos el MVP, {destinatario}!',cuerpo:'Tus compañeros te eligieron el mejor del {dia}.',vars:['destinatario','dia','goles'],on:true},
 {id:'racha',g:2,ic:'trophy',t:'Racha ganadora',opts:['A partir de 3','A partir de 5'],sel:0,quien:['persona'],titulo:'Llevás {racha} victorias seguidas',cuerpo:'Ya sumás {puntos} puntos en la temporada.',vars:['racha','puntos','posicion'],on:true,nuevo:true},
 {id:'posicion',g:2,ic:'chart',t:'Cambió tu posición',opts:['Al cerrar la votación'],sel:0,quien:['persona'],titulo:'Estás en el puesto {posicion}',cuerpo:'Tenés {puntos} puntos y {goles} goles.',vars:['posicion','puntos','goles'],on:true,nuevo:true},
 {id:'pago',g:2,ic:'info',t:'Recordatorio de cancha',opts:['Al día siguiente','A los 2 días'],sel:0,quien:['anot'],titulo:'Cancha: {precio} por persona',cuerpo:'Pozo acumulado: {pozo}.',vars:['precio','pozo'],on:false,nuevo:true,aviso:'Necesita registrar quién pagó. Llega en una etapa posterior.'},
 {id:'nuevo_miembro',g:3,ic:'user',t:'Se unió alguien al grupo',opts:['Al instante'],sel:0,quien:['admins'],titulo:'{nombre} se unió a {comunidad}',cuerpo:'Ya son {cupo} jugadores.',vars:['nombre','comunidad'],on:true,nuevo:true},
 {id:'bienvenida',g:3,ic:'mailbox',t:'Bienvenida al grupo',opts:['Al instante'],sel:0,quien:['persona'],titulo:'Bienvenido a {comunidad}, {destinatario}',cuerpo:'El próximo partido es el {dia} a las {hora}.',vars:['comunidad','destinatario','dia','hora'],on:true,nuevo:true},
 {id:'resumen',g:3,ic:'chart',t:'Resumen de la semana',opts:['Domingo 20:00','Lunes 9:00'],sel:0,quien:['todos'],titulo:'Tu semana en {comunidad}',cuerpo:'Jugaste {partidos} partidos, metiste {goles} goles y estás {posicion}.º.',vars:['comunidad','partidos','goles','posicion'],on:false,nuevo:true}
];

export const PLANTILLAS = [
  {n:'Faltan jugadores',t:'Faltan {faltan} para el {dia}',c:'Quedan {restantes} lugares. ¿Te sumás?',aud:['noanot']},
  {n:'Se suspende',t:'Se suspende el partido del {dia}',c:'Avisamos cuando haya nueva fecha.',aud:['todos']},
  {n:'Cambió el lugar',t:'Cambió la cancha',c:'Ahora jugamos en {lugar} a las {hora}.',aud:['anot']},
  {n:'Cena confirmada',t:'Tercer tiempo confirmado',c:'Somos {cena} para comer después del partido.',aud:['cena']},
  {n:'Recordar votar',t:'Te falta votar',c:'Quedan {horas_restantes} h. Faltan votar {faltan_votar}.',aud:['novotaron']}
];

// Reemplaza {variables}. Si falta un dato se deja la llave vacía (nunca "{nombre}" a la vista).
export const llenar = (t, vars = MUESTRA, vacio = false) =>
  (t || '').replace(/\{(\w+)\}/g, (m, k) => vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : (vacio ? '' : m));

export const catalogoPorId = Object.fromEntries(CAT_DEF.map(c => [c.id, c]));
export const quienTxt = a => a.map(k => AUD[k][0]).join(' y ').toLowerCase().replace(/^./, c => c.toUpperCase());

// Categorías que cada persona puede silenciar en "Mis avisos". Lo que no figura acá
// (cambios, cancelaciones y avisos de admin) no se puede apagar.
export const CATEGORIA_AVISO = {
  partido: ['partido_nuevo', 'inscripcion', 'pocos_lugares', 'cupo_completo', 'lista_espera', 'faltan_jugadores', 'tercer_tiempo', 'equipos', 'cambio_equipo'],
  recordatorio: ['recordatorio_24h', 'recordatorio_2h'],
  votar: ['votaciones', 'votos_pendientes', 'resultado'],
  logros: ['mvp', 'racha', 'posicion'],
  grupo: ['nuevo_miembro', 'bienvenida', 'resumen', 'pago']
};
export const categoriaDe = tipo => Object.keys(CATEGORIA_AVISO).find(k => CATEGORIA_AVISO[k].includes(tipo)) || null;
