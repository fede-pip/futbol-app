import { describe, it, expect } from 'vitest';
import {
  ATTRS, calcProm, calcPuntos, calcRacha, fmtNombre, balancear,
  asignarVotaciones, depurarInvitados, horasRestantes, reemplazarVars, nuevoAtributo,
} from './logica.js';

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
  it('cada jugador vota hasta 3 compañeros, nunca a sí mismo ni a invitados', () => {
    const asig = asignarVotaciones(['1', '2', '3', '4', '5', 'inv_x']);
    expect(Object.keys(asig).sort()).toEqual(['1', '2', '3', '4', '5']);
    for (const [dni, votados] of Object.entries(asig)) {
      expect(votados.length).toBe(3);
      expect(votados).not.toContain(dni);
      expect(votados.some(v => v.startsWith('inv_'))).toBe(false);
      expect(new Set(votados).size).toBe(votados.length);
    }
  });
  it('con pocos jugadores asigna menos de 3', () => {
    const asig = asignarVotaciones(['1', '2']);
    expect(asig['1']).toEqual(['2']);
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

describe('nuevoAtributo', () => {
  it('todos votan "mejor": sube 0.25', () => {
    expect(nuevoAtributo(6, 5, 5)).toBe(6.25);
  });
  it('todos votan "peor": baja 0.25', () => {
    expect(nuevoAtributo(6, -5, 5)).toBe(5.75);
  });
  it('mayoría "igual": cambio chico', () => {
    expect(nuevoAtributo(6, 1, 4)).toBe(6.06);
  });
  it('respeta el rango 1 a 10', () => {
    expect(nuevoAtributo(10, 3, 3)).toBe(10);
    expect(nuevoAtributo(1, -3, 3)).toBe(1);
  });
  it('sin votos no cambia', () => {
    expect(nuevoAtributo(7, 0, 0)).toBe(7);
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
