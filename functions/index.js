// App8: Cloud Functions. Región según el proyecto (ver src/util.js).
export { crearGrupo, nuevoCodigo, unirsePorCodigo, vincularCuentaAnterior, buscarCuentaAnterior, vincularManual, ingresarConDni, enviarAvisoManual } from './src/grupos.js';
export { votar, cerrarVotacion } from './src/votacion.js';
export { alCrearPartido, alActualizarPartido } from './src/triggers.js';
export { programados, resumenSemanal } from './src/programados.js';
export { migrarDatosAnteriores } from './src/migracion.js';
export { tomarEnVivo, soltarEnVivo, registrarGol, deshacerGol } from './src/envivo.js';
export { enlaceDeAcceso, claveTemporalDni } from './src/soporte.js';
