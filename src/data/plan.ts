import type { EstadoItem, EstadoMateria, Materia, Modalidad, TipoItem } from '../types';

// Plan de estudios — Tecnicatura Universitaria en Programación a Distancia (UTN)
export const PLAN: Materia[] = [
  { id: 1, nombre: 'Programación I', corto: 'Prog I', nivel: 1, cuatri: 1, cursar: [], aprobar: [], hue: 152 },
  { id: 2, nombre: 'Arquitectura y Sistemas Operativos', corto: 'AySO', nivel: 1, cuatri: 1, cursar: [], aprobar: [], hue: 200 },
  { id: 3, nombre: 'Matemática', corto: 'Mate', nivel: 1, cuatri: 1, cursar: [], aprobar: [], hue: 32 },
  { id: 8, nombre: 'Organización Empresarial', corto: 'Org. Emp.', nivel: 1, cuatri: 1, cursar: [], aprobar: [], hue: 280 },
  { id: 4, nombre: 'Inglés I', corto: 'Inglés I', nivel: 1, cuatri: 2, cursar: [], aprobar: [], hue: 345 },
  { id: 5, nombre: 'Programación II', corto: 'Prog II', nivel: 1, cuatri: 2, cursar: [1, 2], aprobar: [], hue: 165 },
  { id: 6, nombre: 'Probabilidad y Estadística', corto: 'PyE', nivel: 1, cuatri: 2, cursar: [3], aprobar: [], hue: 48 },
  { id: 7, nombre: 'Base de Datos I', corto: 'BD I', nivel: 1, cuatri: 2, cursar: [1, 3], aprobar: [], hue: 215 },
  { id: 9, nombre: 'Programación III', corto: 'Prog III', nivel: 2, cuatri: 1, cursar: [5, 7], aprobar: [1], hue: 140 },
  { id: 10, nombre: 'Base de Datos II', corto: 'BD II', nivel: 2, cuatri: 1, cursar: [7], aprobar: [1], hue: 228 },
  { id: 11, nombre: 'Metodología de Sistemas I', corto: 'Metodo I', nivel: 2, cuatri: 1, cursar: [5, 7], aprobar: [1, 8], hue: 300 },
  { id: 12, nombre: 'Inglés II', corto: 'Inglés II', nivel: 2, cuatri: 1, cursar: [4], aprobar: [], hue: 0 },
  { id: 13, nombre: 'Programación IV', corto: 'Prog IV', nivel: 2, cuatri: 2, cursar: [9, 10, 11], aprobar: [5, 7], hue: 178 },
  { id: 14, nombre: 'Metodología de Sistemas II', corto: 'Metodo II', nivel: 2, cuatri: 2, cursar: [11], aprobar: [8], hue: 315 },
  { id: 15, nombre: 'Introducción al Análisis de Datos', corto: 'Análisis Datos', nivel: 2, cuatri: 2, cursar: [10], aprobar: [6, 7], hue: 60 },
  { id: 16, nombre: 'Legislación', corto: 'Legislación', nivel: 2, cuatri: 2, cursar: [7], aprobar: [8], hue: 20 },
  { id: 17, nombre: 'Gestión de Desarrollo de Software', corto: 'Gestión DS', nivel: 2, cuatri: 2, cursar: [9, 10], aprobar: [5, 7], hue: 260 },
];

export const TFI = {
  cursar: [4, 9, 10, 11, 12],
  aprobar: PLAN.map((m) => m.id),
};

export const materiaById = (id: number) => PLAN.find((m) => m.id === id);

export const ESTADOS_MATERIA: { value: EstadoMateria; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'cursando', label: 'Cursando' },
  { value: 'regular', label: 'Regular' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'promocionada', label: 'Promocionada' },
  { value: 'equivalencia', label: 'Equivalencia' },
];

export const MODALIDADES: { value: Modalidad; label: string; hint: string }[] = [
  { value: 'parciales', label: 'Parciales', hint: 'Exámenes parciales con recuperatorio' },
  { value: 'tpi', label: 'TP Integrador', hint: 'Un trabajo integrador final' },
  { value: 'entregas', label: 'Entregas', hint: 'Trabajo con varias entregas parciales' },
  { value: 'coloquio', label: 'Coloquio', hint: 'Defensa oral' },
  { value: 'final', label: 'Final', hint: 'Examen final' },
  { value: 'promocion', label: 'Promocionable', hint: 'Se puede promocionar sin final' },
];

export const TIPOS_ITEM: { value: TipoItem; label: string; emoji: string }[] = [
  { value: 'tp', label: 'Trabajo práctico', emoji: '📝' },
  { value: 'tpi', label: 'TP Integrador', emoji: '🧩' },
  { value: 'entrega', label: 'Entrega', emoji: '📦' },
  { value: 'parcial', label: 'Parcial', emoji: '📄' },
  { value: 'recuperatorio', label: 'Recuperatorio', emoji: '🔁' },
  { value: 'coloquio', label: 'Coloquio', emoji: '🎙️' },
  { value: 'final', label: 'Final', emoji: '🎓' },
  { value: 'cuestionario', label: 'Cuestionario', emoji: '🧠' },
  { value: 'otro', label: 'Otro', emoji: '✦' },
];

export const ESTADOS_ITEM: { value: EstadoItem; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'desaprobado', label: 'Desaprobado' },
];

export const tipoInfo = (t: TipoItem) => TIPOS_ITEM.find((x) => x.value === t) ?? TIPOS_ITEM[TIPOS_ITEM.length - 1];
export const labelEstadoItem = (e: EstadoItem) => ESTADOS_ITEM.find((x) => x.value === e)?.label ?? e;
export const labelEstadoMateria = (e: EstadoMateria) => ESTADOS_MATERIA.find((x) => x.value === e)?.label ?? e;
export const labelModalidad = (m: Modalidad) => MODALIDADES.find((x) => x.value === m)?.label ?? m;
