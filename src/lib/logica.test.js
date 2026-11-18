import { describe, it, expect } from 'vitest';
import {
  ATTRS, calcProm, calcPuntos, calcRacha, fmtNombre, balancear,
  asignarVotaciones, depurarInvitados, faltanN, quedanN, pl, horasRestantes, reemplazarVars, actualizarNiveles, paresDeTerna,
} from './logica.js';
import { arreglarPlural, llenar } from './catalogo.js';

const attrsTodos = n => Object.fromEntries(ATTRS.map(a => [a.key, n]));

describe('calcProm', () => {
  it('promedia solo los atributos cargados', () => {
    expect(calcProm({ velocidad: 4, pases: 6 })).toBe(5);
  });
  it('devuelve 0 sin atributos', () => {
    expect(calcProm(undefined)).toBe(0);
    expect(calcProm({})).toBe(0);
  });
  it('ignora atributos en 0', () => {
    expect(calcProm({ velocidad: 0, pases: 8 })).toBe(8);
  });
});

describe('calcPuntos', () => {
  it('3 por ganado, 1 por empatado, 0 por perdido o jugado', () => {
    const h = [
      { resultado: 'ganado' }, { resultado: 'ganado' },
      { resultado: 'empatado' }, { resultado: 'perdido' }, { resultado: 'jugado' },
    ];
    expect(calcPuntos(h)).toBe(7);
  });
  it('historial vacío o undefined', () => {
    expect(calcPuntos([])).toBe(0);
    expect(calcPuntos(undefined)).toBe(0);
  });
});

describe('calcRacha', () => {
  it('cuenta resultados iguales consecutivos desde el último', () => {
    const h = [{ resultado: 'perdido' }, { resultado: 'ganado' }, { resultado: 'ganado' }, { resultado: 'ganado' }];
    expect(calcRacha(h)).toEqual({ tipo: 'ganado', n: 3 });
  });
  it('ignora partidos sin resultado válido', () => {
    const h = [{ resultado: 'ganado' }, { resultado: 'jugado' }];
    expect(calcRacha(h)).toEqual({ tipo: 'ganado', n: 1 });
  });
  it('sin historial', () => {
    expect(calcRacha([])).toEqual({ tipo: null, n: 0 });
  });
});

describe('fmtNombre', () => {
  it('formato tabla: inicial + apellido', () => {
    expect(fmtNombre('Agustin Dal Maso', 'tabla')).toBe('A. Dal Maso');
    expect(fmtNombre('Federico Pipkin', 'tabla')).toBe('F. Pipkin');
  });
  it('nombre de una sola palabra y vacío', () => {
    expect(fmtNombre('Pelé', 'tabla')).toBe('Pelé');
    expect(fmtNombre('')).toBe('—');
  });
  it('completo por defecto', () => {
    expect(fmtNombre('Juan Pérez')).toBe('Juan Pérez');
  });
});

describe('balancear', () => {
  const jugadores = n => Array.from({ length: n }, (_, i) => ({
    id: 'j' + i, nombre: 'J' + i, atributos: attrsTodos(1 + (i % 10)),
  }));
  const suma = eq => eq.reduce((s, j) => s + calcProm(j.atributos), 0);

  it.each([2, 3, 6, 10, 12, 14, 22])('con %i jugadores reparte a todos sin repetir', n => {
    const lista = jugadores(n);
    const { oscuro, blanco } = balancear(lista);
    const ids = [...oscuro, ...blanco].map(j => j.id).sort();
    expect(ids).toEqual(lista.map(j => j.id).sort());
    expect(Math.abs(oscuro.length - blanco.length)).toBeLessThanOrEqual(1);
  });

  it('deja los equipos parejos en nivel', () => {
    const { oscuro, blanco } = balancear(jugadores(10));
    expect(Math.abs(suma(oscuro) - suma(blanco))).toBeLessThanOrEqual(1);
  });

  it('tolera jugadores sin atributos', () => {
    const lista = [{ id: 'a', nombre: 'A' }, { id: 'b', nombre: 'B' }, { id: 'c', nombre: 'C', atributos: attrsTodos(7) }, { id: 'd', nombre: 'D' }];
    const { oscuro, blanco } = balancear(lista);
    expect(oscuro.length + blanco.length).toBe(4);
  });
});

describe('asignarVotaciones', () => {
  it('cada jugador recibe 2 ternas de compañeros: sin sí mismo, sin invitados, sin repetidos', () => {
    const asig = asignarVotaciones(['1', '2', '3', '4', '5', '6', '7', '8', 'inv_x']);
    expect(Object.keys(asig).sort()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    for (const [id, ternas] of Object.entries(asig)) {
      expect(ternas.length).toBe(2);
      const todos = ternas.flatMap(t => t.j);
      for (const t of ternas) { expect(t.j.length).toBe(3); expect(new Set(t.j).size).toBe(3); }
      expect(todos).not.toContain(id);
      expect(todos.some(v => v.startsWith('inv_'))).toBe(false);
      expect(new Set(todos).size).toBe(6); // las dos ternas no se pisan
    }
  });
  it('reparte parejo: todos aparecen en una cantidad parecida de ternas', () => {
    const ids = Array.from({ length: 10 }, (_, i) => String(i));
    const asig = asignarVotaciones(ids);
    const veces = Object.fromEntries(ids.map(i => [i, 0]));
    Object.values(asig).flatMap(t => t.flatMap(x => x.j)).forEach(i => { veces[i] += 1; });
    const v = Object.values(veces);
    expect(Math.max(...v) - Math.min(...v)).toBeLessThanOrEqual(2);
  });
  it('con 4 jugadores hay una sola terna (la segunda sería idéntica)', () => {
    const asig = asignarVotaciones(['1', '2', '3', '4']);
    for (const t of Object.values(asig)) expect(t.length).toBe(1);
  });
  it('los perfiles sin vincular (l_) no votan, pero sí pueden ser comparados', () => {
    const asig = asignarVotaciones(['1', '2', '3', '4', 'l_5']);
    expect(asig['l_5']).toBeUndefined();
    expect(Object.values(asig).flatMap(t => t.flatMap(x => x.j))).toContain('l_5');
  });
  it('con menos de 4 jugadores no hay ternas', () => {
    expect(asignarVotaciones(['1', '2', '3'])).toEqual({ 1: [], 2: [], 3: [] });
  });
});

describe('horasRestantes', () => {
  it('null sin fecha', () => {
    expect(horasRestantes(null)).toBeNull();
  });
  it('0 si pasaron más de 24 h', () => {
    const hace2dias = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    expect(horasRestantes(hace2dias)).toBe(0);
  });
  it('alrededor de 24 h si recién terminó', () => {
    const horas = horasRestantes(new Date().toISOString());
    expect(horas).toBeGreaterThanOrEqual(23);
    expect(horas).toBeLessThanOrEqual(24);
  });
});

describe('reemplazarVars', () => {
  it('reemplaza variables', () => {
    expect(reemplazarVars('{nombre} en {lugar}', { nombre: 'Fede', lugar: 'Cancha 5' })).toBe('Fede en Cancha 5');
  });
  it('plural de "lugar"', () => {
    expect(reemplazarVars('Queda{es} {restantes}', { restantes: '1' })).toBe('Queda 1');
    expect(reemplazarVars('Quedan{es} {restantes}', { restantes: '3' })).toBe('Quedanes 3');
  });
  it('variable inexistente queda vacía y texto vacío no rompe', () => {
    expect(reemplazarVars('Hola {x}', { x: undefined })).toBe('Hola ');
    expect(reemplazarVars(undefined, {})).toBe('');
  });
});

describe('actualizarNiveles (votación comparativa)', () => {
  it('paresDeTerna: más>medio, más>menos, medio>menos', () => {
    expect(paresDeTerna({ mas: 'a', medio: 'b', menos: 'c' })).toEqual([{ g: 'a', p: 'b' }, { g: 'a', p: 'c' }, { g: 'b', p: 'c' }]);
  });
  it('el que gana sube y el que pierde baja', () => {
    const n = actualizarNiveles({ a: 5, b: 5 }, [{ g: 'a', p: 'b' }]);
    expect(n.a).toBeGreaterThan(5); expect(n.b).toBeLessThan(5);
  });
  it('es suma cero: el promedio del grupo no se mueve (no hay inflación)', () => {
    const act = { a: 7, b: 5, c: 3, d: 6 };
    const pares = [{ g: 'a', p: 'b' }, { g: 'c', p: 'a' }, { g: 'd', p: 'c' }, { g: 'b', p: 'd' }, { g: 'a', p: 'c' }];
    const n = actualizarNiveles(act, pares);
    const dif = Object.keys(n).reduce((s, k) => s + (n[k] - act[k]), 0);
    expect(Math.abs(dif)).toBeLessThan(0.05);
  });
  it('ganarle a un fuerte vale más que ganarle a uno flojo', () => {
    const fuerte = actualizarNiveles({ a: 5, b: 8 }, [{ g: 'a', p: 'b' }]).a - 5;
    const flojo = actualizarNiveles({ a: 5, b: 2 }, [{ g: 'a', p: 'b' }]).a - 5;
    expect(fuerte).toBeGreaterThan(flojo * 2);
  });
  it('el mejor que sigue ganando casi no sube: ya no llega a 10 por inercia', () => {
    let r = { top: 8, otro: 5 };
    for (let i = 0; i < 20; i++) r = { ...r, ...actualizarNiveles(r, [{ g: 'top', p: 'otro' }]) };
    expect(r.top).toBeLessThan(9.5);
  });
  it('respeta el rango 1 a 10 y no toca a quien no tuvo comparaciones', () => {
    const n = actualizarNiveles({ a: 10, b: 1, c: 5 }, [{ g: 'b', p: 'a' }]);
    expect(n.a).toBeGreaterThanOrEqual(1); expect(n.b).toBeLessThanOrEqual(10);
    expect(n.c).toBeUndefined();
  });
});

describe('singular y plural en los textos', () => {
  it('con 1 usa el singular, con otros números deja el plural', () => {
    expect(arreglarPlural('Quedan 1 lugares')).toBe('Queda 1 lugar');
    expect(arreglarPlural('Quedan 3 lugares')).toBe('Quedan 3 lugares');
    expect(arreglarPlural('Faltan 1 para completar')).toBe('Falta 1 para completar');
    expect(arreglarPlural('Quedan 1 h para votar')).toBe('Queda 1 h para votar');
    expect(arreglarPlural('Ya somos 1.')).toBe('Ya hay 1.');
    expect(arreglarPlural('Votaron 1 de 12')).toBe('Votó 1 de 12');
    expect(arreglarPlural('Llevás 1 victorias seguidas')).toBe('Llevás 1 victoria seguida');
  });
  it('no toca los números que terminan en 1 ni los que empiezan con 1', () => {
    expect(arreglarPlural('Quedan 11 lugares')).toBe('Quedan 11 lugares');
    expect(arreglarPlural('Faltan 10 goles')).toBe('Faltan 10 goles');
    expect(arreglarPlural('Tenés 21 puntos')).toBe('Tenés 21 puntos');
  });
  it('llenar() aplica la corrección después de completar las variables', () => {
    expect(llenar('Quedan {restantes} lugares el {dia}.', { restantes: 1, dia: 'lunes' })).toBe('Queda 1 lugar el lunes.');
    expect(llenar('Faltan {faltan} para completar', { faltan: 2 })).toBe('Faltan 2 para completar');
  });
  it('si todavía no hay equipo, el aviso no queda con "Equipo: ."', () => {
    expect(llenar('{lugar}. Equipo: {mi_equipo}. ¡Llevá agua!', { lugar: 'Cancha 5', mi_equipo: '' }, true)).toBe('Cancha 5. ¡Llevá agua!');
    expect(llenar('{lugar}. Equipo: {mi_equipo}. ¡Llevá agua!', { lugar: 'Cancha 5', mi_equipo: 'Oscuro' }, true)).toBe('Cancha 5. Equipo: Oscuro. ¡Llevá agua!');
  });
  it('los ayudantes de las pantallas', () => {
    expect(faltanN(1)).toBe('Falta 1'); expect(faltanN(4)).toBe('Faltan 4');
    expect(quedanN(1)).toBe('Queda 1'); expect(quedanN(0)).toBe('Quedan 0');
    expect(pl(1, 'gol', 'goles')).toBe('gol'); expect(pl(2, 'gol', 'goles')).toBe('goles');
  });
});

describe('depurarInvitados', () => {
  const nombres = ['Nico Ferrari', 'Juani'];
  it('conserva uno por nombre y saca a los que ya son del grupo', () => {
    const r = depurarInvitados([
      { id: 'a', nombre: 'Pablo Díaz' }, { id: 'b', nombre: 'pablo diaz ' }, { id: 'c', nombre: 'Nico Ferrari' },
      { id: 'd', nombre: 'Juani' }, { id: 'e', nombre: 'Agus' }
    ], nombres);
    expect(r.utiles.map(x => x.nombre)).toEqual(['Agus', 'Pablo Díaz']);
    expect(r.sobrantes.map(x => x.id).sort()).toEqual(['b', 'c', 'd']);
  });
  it('lista vacía o sin nombres no rompe', () => {
    expect(depurarInvitados([], [])).toEqual({ utiles: [], sobrantes: [] });
    expect(depurarInvitados(undefined, undefined)).toEqual({ utiles: [], sobrantes: [] });
  });
});
