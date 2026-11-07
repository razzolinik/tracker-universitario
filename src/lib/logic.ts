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

/**
 * Papel de una evaluación:
 * - normal: hay que hacerla.
 * - opcional: recuperatorio "por si acaso"; todavía no se sabe si hace falta.
 * - necesario: la evaluación que recupera salió desaprobada, así que ahora sí hay que rendirlo.
 * - innecesario: la evaluación que recupera ya está aprobada.
 */
export type Rol = 'normal' | 'opcional' | 'necesario' | 'innecesario';

export function rolItem(d: Datos, i: Item): Rol {
  if (!i.opcional) return 'normal';
  const o = i.recuperaA ? d.items.find((x) => x.id === i.recuperaA) : undefined;
  if (o?.estado === 'aprobado') return 'innecesario';
  if (o?.estado === 'desaprobado') return 'necesario';
  return 'opcional';
}

/** ¿Es obligatoria? (cuenta para el avance, atrasadas y avisos) */
export const cuenta = (d: Datos, i: Item) => {
  const r = rolItem(d, i);
  return r === 'normal' || r === 'necesario';
};

/**
 * ¿Vale la pena mostrarlo en "lo que viene"? Las obligatorias siempre; un recuperatorio opcional,
 * recién cuando ya pasó la evaluación que recupera y todavía no se sabe el resultado.
 */
export const enRadar = (d: Datos, i: Item) => {
  const r = rolItem(d, i);
  if (r === 'normal' || r === 'necesario') return true;
  if (r === 'innecesario') return false;
  const o = i.recuperaA ? d.items.find((x) => x.id === i.recuperaA) : undefined;
  return !o || !o.fecha || diasHasta(o.fecha) < 0;
};

/** Pendiente de hacer y que todavía puede hacer falta. */
export const porHacer = (d: Datos, i: Item) => !itemHecho(i) && i.estado !== 'desaprobado' && rolItem(d, i) !== 'innecesario';

export const recusDe = (d: Datos, i: Item) => d.items.filter((x) => x.recuperaA === i.id);

export const ordenFecha = (a: Item, b: Item) => ((a.fecha ?? '9999') < (b.fecha ?? '9999') ? -1 : (a.fecha ?? '9999') > (b.fecha ?? '9999') ? 1 : 0);

/** Ordena por fecha, con cada evaluación seguida de sus recuperatorios. */
export function ordenarConRecus(items: Item[]) {
  const ids = new Set(items.map((i) => i.id));
  const raiz = items.filter((i) => !i.recuperaA || !ids.has(i.recuperaA)).sort(ordenFecha);
  return raiz.flatMap((r) => [
    { item: r, sub: false },
    ...items.filter((i) => i.recuperaA === r.id).sort(ordenFecha).map((item) => ({ item, sub: true })),
  ]);
}

export function avanceMateria(d: Datos, materiaId: number) {
  const items = d.items.filter((i) => i.materiaId === materiaId).sort(ordenFecha);
  const reqs = d.requisitos.filter((r) => r.materiaId === materiaId);
  // Si una evaluación salió mal y tiene recuperatorio, la reemplaza el recuperatorio.
  const obligatorias = items.filter((i) => cuenta(d, i) && !(i.estado === 'desaprobado' && recusDe(d, i).length > 0));
  const itemsHechos = obligatorias.filter(itemHecho).length;
  const reqsOk = reqs.filter((r) => r.cumplido).length;
  const total = obligatorias.length + reqs.length;
  const pct = total ? Math.round(((itemsHechos + reqsOk) / total) * 100) : 0;
  const hoy = hoyISO();
  const pend = obligatorias.filter((i) => porHacer(d, i) && i.fecha);
  const proximo = pend.find((i) => i.fecha! >= hoy) ?? pend[pend.length - 1];
  return { items, obligatorias, reqs, itemsHechos, reqsOk, total, pct, proximo };
}

const PLURAL: Partial<Record<Item['tipo'], [string, string]>> = {
  parcial: ['parcial', 'parciales'], tp: ['TP', 'TPs'], tpi: ['TP integrador', 'TPs integradores'], entrega: ['entrega', 'entregas'],
  coloquio: ['coloquio', 'coloquios'], cuestionario: ['cuestionario', 'cuestionarios'], final: ['final', 'finales'],
};

/** "2 parciales · TP integrador · coloquio" a partir de lo cargado. */
export function resumenEvaluaciones(items: Item[]) {
  const n: Partial<Record<Item['tipo'], number>> = {};
  for (const i of items) if (!i.opcional && PLURAL[i.tipo]) n[i.tipo] = (n[i.tipo] ?? 0) + 1;
  return (Object.keys(PLURAL) as Item['tipo'][])
    .filter((t) => n[t])
    .map((t) => (n[t]! > 1 ? `${n[t]} ${PLURAL[t]![1]}` : PLURAL[t]![0]))
    .join(' · ');
}

/* ---------- Cuatrimestre ---------- */

export function cuatriInfo(d: Datos) {
  const c = d.cuatri ?? {};
  const fechas = d.items
    .filter((i) => prog(d, i.materiaId).estado === 'cursando' && i.fecha)
    .map((i) => i.fecha!)
    .sort();
  const fin = c.fin ?? fechas[fechas.length - 1];
  if (!fin && !c.inicio) return undefined;
  const hoy = hoyISO();
  const diasFin = fin ? diasHasta(fin) : undefined;
  let pct: number | undefined;
  let semana: number | undefined;
  let semanas: number | undefined;
  if (c.inicio && fin) {
    const total = Math.max(1, diasEntre(c.inicio, fin));
    const pasados = diasEntre(c.inicio, hoy);
    pct = Math.round(Math.min(100, Math.max(0, (pasados / total) * 100)));
    semanas = Math.ceil(total / 7);
    semana = Math.min(semanas, Math.max(0, Math.floor(pasados / 7) + 1));
  }
  return {
    ...c,
    fin,
    finEstimado: !c.fin && !!fin,
    diasFin,
    pct,
    semana,
    semanas,
    terminado: diasFin !== undefined && diasFin < 0,
    /** Últimas 3 semanas, o cerca de la inscripción: momento de mirar qué cursar después. */
    cierre: (diasFin !== undefined && diasFin <= 21) || (c.inscripcion !== undefined && diasHasta(c.inscripcion) <= 21),
  };
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

export const diasEntre = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
export const diasHasta = (fecha: string) => diasEntre(hoyISO(), fecha);

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

const fmtDow = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

export const fechaCorta = (s: string) => fmtCorto.format(parseISO(s)).replace('.', '');
export const fechaLarga = (s: string) => capitalizar(fmtLargo.format(parseISO(s)));
/** "vie" */
export const diaSemana = (s: string) => fmtDow.format(parseISO(s)).replace('.', '');
export const mesCorto = (s: string) => MESES[parseISO(s).getMonth()];
/** "2 → 12 nov" o "28 oct → 2 nov"; si no hay desde, solo la fecha. */
export function rangoFechas(desde: string | undefined, hasta: string) {
  if (!desde || desde === hasta) return fechaCorta(hasta);
  const a = parseISO(desde);
  const b = parseISO(hasta);
  return a.getMonth() === b.getMonth() ? `${a.getDate()} → ${fechaCorta(hasta)}` : `${fechaCorta(desde)} → ${fechaCorta(hasta)}`;
}
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
