import { describe, it, expect } from 'vitest';
import {
  hashPwdLegacy, deepReplace, parseHoras, cupoDeFormato, parseResultadoLegacy, resultadoJugador, puntosDe,
  agregarRacha, rachaGanadora, calcularMvps, ranking, esUid, varsPartido, fechaYHoraArg
} from '../functions/src/puro.js';

describe('hashPwdLegacy', () => {
  it('es determinista y coincide con el hash de la versión anterior', () => {
    expect(hashPwdLegacy('clave123')).toBe(hashPwdLegacy('clave123'));
    expect(hashPwdLegacy('a')).not.toBe(hashPwdLegacy('b'));
    expect(hashPwdLegacy('')).toBe('0');
  });
});

describe('deepReplace', () => {
  it('reemplaza valores y nombres de campo en todo el documento', () => {
    const d = { miembros: ['l_1', 'x'], eventos: { l_1: { goles: 2 } }, equipos: { oscuro: ['l_1'], blanco: ['y'] }, n: 5, t: null };
    expect(deepReplace(d, 'l_1', 'U9')).toEqual({ miembros: ['U9', 'x'], eventos: { U9: { goles: 2 } }, equipos: { oscuro: ['U9'], blanco: ['y'] }, n: 5, t: null });
  });
  it('no toca textos que solo contienen el ID', () => {
    expect(deepReplace({ nombre: 'l_1 Pérez' }, 'l_1', 'U9')).toEqual({ nombre: 'l_1 Pérez' });
  });
  it('no modifica objetos que no son planos (fechas)', () => {
    const f = new Date();
    expect(deepReplace({ f }, 'a', 'b').f).toBe(f);
  });
});

describe('parseos', () => {
  it('parseHoras', () => {
    expect(parseHoras('24 h antes')).toBe(24);
    expect(parseHoras('12 h y 3 h antes de cerrar')).toBe(12);
    expect(parseHoras('Al instante')).toBeNull();
  });
  it('cupoDeFormato', () => {
    expect(cupoDeFormato('6 vs 6')).toBe(12);
    expect(cupoDeFormato('11 vs 11')).toBe(22);
    expect(cupoDeFormato('')).toBe(0);
  });
  it('parseResultadoLegacy ubica los goles de cada equipo', () => {
    expect(parseResultadoLegacy('Oscuro gano 4-3')).toEqual({ golesO: 4, golesB: 3 });
    expect(parseResultadoLegacy('Blanco gano 5-2')).toEqual({ golesO: 2, golesB: 5 });
    expect(parseResultadoLegacy('Empate 2-2')).toEqual({ golesO: 2, golesB: 2 });
    expect(parseResultadoLegacy('')).toBeNull();
  });
});

describe('resultados y racha', () => {
  const eq = { oscuro: ['a', 'b'], blanco: ['c'] };
  it('resultadoJugador', () => {
    expect(resultadoJugador(eq, 'a', 3, 1)).toBe('ganado');
    expect(resultadoJugador(eq, 'c', 3, 1)).toBe('perdido');
    expect(resultadoJugador(eq, 'a', 2, 2)).toBe('empatado');
    expect(resultadoJugador(eq, 'z', 2, 0)).toBe('jugado');
    expect(resultadoJugador(null, 'a', 2, 0)).toBe('jugado');
  });
  it('puntos y racha', () => {
    expect(puntosDe('ganado')).toBe(3); expect(puntosDe('empatado')).toBe(1); expect(puntosDe('perdido')).toBe(0);
    let r = '';
    for (const x of ['ganado', 'ganado', 'empatado', 'ganado', 'ganado', 'ganado']) r = agregarRacha(r, x);
    expect(r).toBe('GGEGGG');
    expect(rachaGanadora(r)).toBe(3);
    expect(agregarRacha('GGGGGGGGGG', 'perdido')).toBe('GGGGGGGGGP');
  });
});

describe('calcularMvps', () => {
  it('gana el que más votos tiene', () => { expect(calcularMvps({ a: 3, b: 1 }, {})).toEqual(['a']); });
  it('desempata por goles', () => { expect(calcularMvps({ a: 2, b: 2 }, { a: 1, b: 3 })).toEqual(['b']); });
  it('MVP compartido si sigue el empate', () => { expect(calcularMvps({ a: 2, b: 2 }, { a: 1, b: 1 }).sort()).toEqual(['a', 'b']); });
  it('sin votos', () => { expect(calcularMvps({}, {})).toEqual([]); });
});

describe('ranking y ids', () => {
  it('ordena por puntos y luego por goles', () => {
    expect(ranking([{ id: 'a', puntos: 3, goles: 1 }, { id: 'b', puntos: 6, goles: 0 }, { id: 'c', puntos: 3, goles: 4 }])).toEqual({ b: 1, c: 2, a: 3 });
  });
  it('esUid distingue personas, invitados y perfiles pendientes', () => {
    expect(esUid('abcXYZ123')).toBe(true);
    expect(esUid('inv_ab12')).toBe(false);
    expect(esUid('l_30123456')).toBe(false);
    expect(esUid('')).toBe(false);
  });
});

describe('varsPartido', () => {
  it('arma las variables del partido', () => {
    const g = { nombre: 'Lunes', precioCancha: 4500, pozo: 0 };
    const p = { cupo: 12, inscriptos: new Array(10).fill('x'), lugar: 'Cancha', formato: '6 vs 6', listaEspera: ['a'], cena: ['b', 'c'], fechaHora: fechaYHoraArg('2026-10-19', '21:30') };
    const v = varsPartido(g, p);
    expect(v).toMatchObject({ comunidad: 'Lunes', restantes: '2', anotados: '10', en_espera: '1', cena: '2', hora: '21:30', dia: 'lunes', precio: '$4500', pozo: '' });
  });
});
