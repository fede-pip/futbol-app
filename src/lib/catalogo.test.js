import { describe, it, expect } from 'vitest';
import { CAT_DEF, AUD, MUESTRA, VARS_DESC, llenar, categoriaDe, CATEGORIA_AVISO, catalogoPorId } from './catalogo.js';
import { titulo, faltan, haceCuanto, desdeFormulario, aInputFecha } from './fechas.js';

describe('catálogo de avisos', () => {
  it('cada aviso tiene lo necesario y usa solo destinatarios y datos que existen', () => {
    const todasLasVars = new Set(Object.values(VARS_DESC).flatMap(g => Object.keys(g)));
    for (const c of CAT_DEF) {
      expect(c.id, 'id').toBeTruthy();
      expect(c.opts.length, `${c.id} opciones`).toBeGreaterThan(0);
      for (const k of c.quien) expect(AUD[k], `${c.id}: destinatario ${k}`).toBeTruthy();
      const usadas = [...(c.titulo + c.cuerpo).matchAll(/\{(\w+)\}/g)].map(m => m[1]);
      for (const v of usadas) expect(todasLasVars.has(v), `${c.id}: variable {${v}}`).toBe(true);
      for (const v of c.vars) expect(todasLasVars.has(v), `${c.id}: vars {${v}}`).toBe(true);
    }
  });
  it('los ids son únicos', () => {
    expect(new Set(CAT_DEF.map(c => c.id)).size).toBe(CAT_DEF.length);
  });
  it('llenar reemplaza y, si falta un dato, lo deja vacío cuando se pide', () => {
    expect(llenar('Hola {destinatario}', { destinatario: 'Fede' })).toBe('Hola Fede');
    expect(llenar('Equipo {mi_equipo}.', {}, true)).toBe('Equipo .');
    expect(llenar('{hora}', MUESTRA)).toBe('21:30');
  });
  it('categorías: lo crítico no se puede silenciar', () => {
    expect(categoriaDe('cancelado')).toBeNull();
    expect(categoriaDe('cambio_partido')).toBeNull();
    expect(categoriaDe('votos_pendientes')).toBe('votar');
    for (const ids of Object.values(CATEGORIA_AVISO)) for (const id of ids) expect(catalogoPorId[id], id).toBeTruthy();
  });
});

describe('fechas', () => {
  it('titulo y formulario en hora de Argentina', () => {
    const d = desdeFormulario('2026-10-19', '21:30');
    expect(titulo(d)).toBe('Lunes 19, 21:30');
    expect(aInputFecha(d)).toBe('2026-10-19');
  });
  it('faltan y haceCuanto', () => {
    expect(faltan(new Date(Date.now() + 49 * 3600e3))).toBe('Faltan 2 días');
    expect(faltan(new Date(Date.now() - 1000))).toBe('Ya pasó');
    expect(haceCuanto(new Date(Date.now() - 5 * 60000))).toBe('Hace 5 min');
    expect(haceCuanto(new Date(Date.now() - 30 * 3600e3))).toBe('Ayer');
  });
});
