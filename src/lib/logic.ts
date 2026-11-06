import { PLAN, TFI } from '../data/plan';
import type { Datos, EstadoMateria, Item, Materia, MateriaProgreso } from '../types';

export const DEFAULT_PROGRESO: MateriaProgreso = { estado: 'pendiente', modalidad: [] };

export const prog = (d: Datos, id: number): MateriaProgreso => d.materias[id] ?? DEFAULT_PROGRESO;

const CURSADA: EstadoMateria[] = ['regular', 'aprobada', 'promocionada', 'equivalencia'];
const APROBADA: EstadoMateria[] = ['aprobada', 'promocionada', 'equivalencia'];

export const tieneCursada = (d: Datos, id: number) => CURSADA.includes(prog(d, id).estado);
export const tieneAprobada = (d: Datos, id: number) => APROBADA.includes(prog(d, id).estado);

export interface Disponibilidad {
  ok: boolean;
  faltaCursar: number[];
  faltaAprobar: number[];
}

export function disponibilidad(d: Datos, m: Pick<Materia, 'cursar' | 'aprobar'>): Disponibilidad {
  const faltaCursar = m.cursar.filter((id) => !tieneCursada(d, id));
  const faltaAprobar = m.aprobar.filter((id) => !tieneAprobada(d, id));
  return { ok: faltaCursar.length === 0 && faltaAprobar.length === 0, faltaCursar, faltaAprobar };
}

export const disponibilidadTFI = (d: Datos) => disponibilidad(d, TFI);

export function resumenCarrera(d: Datos) {
  const total = PLAN.length;
  const aprobadas = PLAN.filter((m) => tieneAprobada(d, m.id)).length;
  const regulares = PLAN.filter((m) => prog(d, m.id).estado === 'regular').length;
  const cursando = PLAN.filter((m) => prog(d, m.id).estado === 'cursando');
  const disponibles = PLAN.filter(
    (m) => prog(d, m.id).estado === 'pendiente' && disponibilidad(d, m).ok,
  );
  const conNota = PLAN.map((m) => prog(d, m.id)).filter(
    (p) => (p.estado === 'aprobada' || p.estado === 'promocionada') && typeof p.nota === 'number',
  );
  const promedio = conNota.length
    ? conNota.reduce((a, p) => a + (p.nota as number), 0) / conNota.length
    : undefined;
  return {
    total,
    aprobadas,
    regulares,
    cursando,
    disponibles,
    promedio,
    conNota: conNota.length,
    pct: Math.round((aprobadas / total) * 100),
    pctCursadas: Math.round(((aprobadas + regulares) / total) * 100),
  };
}

export const itemHecho = (i: Item) => i.estado === 'entregado' || i.estado === 'aprobado';

export function avanceMateria(d: Datos, materiaId: number) {
  const items = d.items.filter((i) => i.materiaId === materiaId);
  const reqs = d.requisitos.filter((r) => r.materiaId === materiaId);
  const itemsHechos = items.filter(itemHecho).length;
  const reqsOk = reqs.filter((r) => r.cumplido).length;
  const total = items.length + reqs.length;
  const pct = total ? Math.round(((itemsHechos + reqsOk) / total) * 100) : 0;
  const hoy = hoyISO();
  const pend = items
    .filter((i) => !itemHecho(i) && i.estado !== 'desaprobado' && i.fecha)
    .sort((a, b) => (a.fecha! < b.fecha! ? -1 : 1));
  const proximo = pend.find((i) => i.fecha! >= hoy) ?? pend[pend.length - 1];
  return { items, reqs, itemsHechos, reqsOk, total, pct, proximo };
}

/* ---------- Fechas ---------- */

export const hoyISO = () => toISO(new Date());

export function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function diasHasta(fecha: string) {
  const a = parseISO(hoyISO()).getTime();
  const b = parseISO(fecha).getTime();
  return Math.round((b - a) / 86400000);
}

export function textoRelativo(fecha: string) {
  const n = diasHasta(fecha);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  if (n < 0) return `hace ${-n} días`;
  if (n < 7) return `en ${n} días`;
  if (n < 14) return 'en 1 semana';
  return `en ${Math.round(n / 7)} semanas`;
}

export type Urgencia = 'vencida' | 'hoy' | 'pronto' | 'semana' | 'tranqui';

export function urgencia(i: Item): Urgencia | undefined {
  if (!i.fecha || itemHecho(i)) return undefined;
  const n = diasHasta(i.fecha);
  if (n < 0) return 'vencida';
  if (n === 0) return 'hoy';
  if (n <= 3) return 'pronto';
  if (n <= 7) return 'semana';
  return 'tranqui';
}

const fmtCorto = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const fmtLargo = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

export const fechaCorta = (s: string) => fmtCorto.format(parseISO(s)).replace('.', '');
export const fechaLarga = (s: string) => capitalizar(fmtLargo.format(parseISO(s)));
export const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Normaliza texto para comparar nombres de materias sin tildes ni mayúsculas. */
export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Busca una materia por número (#7, 7), nombre completo o abreviatura. */
export function buscarMateria(texto: string): Materia | undefined {
  const t = norm(texto.replace('#', ''));
  if (!t) return undefined;
  if (/^\d+$/.test(t)) return PLAN.find((m) => m.id === Number(t));
  const exact = PLAN.find((m) => norm(m.nombre) === t || norm(m.corto) === t);
  if (exact) return exact;
  // romanos/arábigos: "programacion 2" -> "programacion ii"
  const rom = t.replace(/\b1\b/g, 'i').replace(/\b2\b/g, 'ii').replace(/\b3\b/g, 'iii').replace(/\b4\b/g, 'iv');
  const q = rom.split(' ');
  // cada palabra es prefijo de la palabra correspondiente: "prog iii" -> "programacion iii", "bd ii" -> corto "BD II"
  const calza = (nombre: string) => {
    const w = norm(nombre).split(' ').filter((x) => x !== 'de' && x !== 'y' && x !== 'al');
    const qq = q.filter((x) => x !== 'de' && x !== 'y' && x !== 'al');
    return qq.length === w.length && qq.every((x, i) => w[i].startsWith(x));
  };
  return (
    PLAN.find((m) => norm(m.nombre) === rom || norm(m.corto) === rom) ??
    PLAN.find((m) => calza(m.nombre) || calza(m.corto)) ??
    PLAN.find((m) => norm(m.nombre).startsWith(rom))
  );
}
