import { PLAN } from '../data/plan';
import type { Cuatrimestre, Datos, EstadoItem, EstadoMateria, Item, Modalidad, Requisito, TipoItem } from '../types';
import { buscarMateria, norm, uid } from './logic';

/* ---------- Parser CSV (soporta comillas, ; o , y saltos de línea en celdas) ---------- */

export function parseCSV(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/)[0] ?? '';
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (q) {
      if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const esc = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCSV = (rows: unknown[][]) => rows.map((r) => r.map(esc).join(',')).join('\n');

/* ---------- Normalizadores ---------- */

const TIPO_ALIAS: Record<string, TipoItem> = {
  tp: 'tp', 'trabajo practico': 'tp', practico: 'tp', actividad: 'tp',
  tpi: 'tpi', integrador: 'tpi', 'tp integrador': 'tpi', 'trabajo integrador': 'tpi', 'trabajo practico integrador': 'tpi', proyecto: 'tpi',
  entrega: 'entrega', hito: 'entrega', avance: 'entrega',
  parcial: 'parcial', examen: 'parcial', evaluacion: 'parcial',
  recuperatorio: 'recuperatorio', recu: 'recuperatorio', recuperacion: 'recuperatorio',
  coloquio: 'coloquio', defensa: 'coloquio', oral: 'coloquio',
  final: 'final', 'examen final': 'final', globalizador: 'final',
  cuestionario: 'cuestionario', quiz: 'cuestionario', autoevaluacion: 'cuestionario',
  otro: 'otro',
};

const ESTADO_ITEM_ALIAS: Record<string, EstadoItem> = {
  pendiente: 'pendiente', '': 'pendiente', 'por hacer': 'pendiente', todo: 'pendiente',
  'en curso': 'en_curso', en_curso: 'en_curso', haciendo: 'en_curso', 'en progreso': 'en_curso',
  entregado: 'entregado', entregada: 'entregado', hecho: 'entregado', listo: 'entregado', enviado: 'entregado', rendido: 'entregado',
  aprobado: 'aprobado', aprobada: 'aprobado', ok: 'aprobado',
  desaprobado: 'desaprobado', desaprobada: 'desaprobado', 'no aprobado': 'desaprobado',
};

const ESTADO_MAT_ALIAS: Record<string, EstadoMateria> = {
  pendiente: 'pendiente', '': 'pendiente', 'no cursada': 'pendiente',
  cursando: 'cursando', 'en curso': 'cursando', actual: 'cursando',
  regular: 'regular', cursada: 'regular', regularizada: 'regular',
  aprobada: 'aprobada', aprobado: 'aprobada', final: 'aprobada',
  promocionada: 'promocionada', promocion: 'promocionada', promocionado: 'promocionada',
  equivalencia: 'equivalencia', equivalente: 'equivalencia',
};

const MOD_ALIAS: Record<string, Modalidad> = {
  parciales: 'parciales', parcial: 'parciales',
  tpi: 'tpi', integrador: 'tpi', 'tp integrador': 'tpi', 'trabajo integrador': 'tpi',
  entregas: 'entregas', entrega: 'entregas', 'varias entregas': 'entregas',
  coloquio: 'coloquio', defensa: 'coloquio',
  final: 'final', 'examen final': 'final',
  promocion: 'promocion', promocionable: 'promocion',
};

export function parseFecha(s: string, anioBase = new Date().getFullYear()): string | undefined | null {
  const t = s.trim();
  if (!t) return undefined;
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (m) {
    let y = m[3] ? Number(m[3]) : anioBase;
    if (y < 100) y += 2000;
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null; // formato no reconocido
}

const parseNota = (s: string) => {
  const t = s.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

/* ---------- Importación ---------- */

export interface ImportResult {
  tipo: 'entregas' | 'materias' | 'mixto' | 'desconocido';
  items: Item[];
  materias: Record<number, Partial<Datos['materias'][number]>>;
  requisitos: Requisito[];
  cuatri?: Cuatrimestre;
  errores: string[];
  filas: number;
}

const HEADER_ALIAS: Record<string, string> = {
  materia: 'materia', asignatura: 'materia', codigo: 'materia',
  tipo: 'tipo', titulo: 'titulo', nombre: 'titulo', actividad: 'titulo', consigna: 'titulo',
  fecha: 'fecha', vencimiento: 'fecha', 'fecha entrega': 'fecha', deadline: 'fecha', entrega: 'fecha', hasta: 'fecha', cierra: 'fecha', cierre: 'fecha',
  desde: 'desde', abre: 'desde', apertura: 'desde',
  estado: 'estado', nota: 'nota', calificacion: 'nota',
  recupera: 'recupera', 'recupera a': 'recupera',
  opcional: 'opcional',
  grupo: 'grupo', proyecto: 'grupo',
  descripcion: 'descripcion', detalle: 'descripcion', notas: 'descripcion',
  link: 'link', url: 'link', enlace: 'link', campus: 'link',
  modalidad: 'modalidad', evaluacion: 'modalidad', periodo: 'periodo', cuatrimestre: 'periodo',
  requisitos: 'requisitos', condiciones: 'requisitos', apuntes: 'apuntes',
};

const CUATRI_MATERIA = ['cuatrimestre', 'calendario', 'periodo', 'calendario academico'];
const CUATRI_CAMPO: Record<string, keyof Cuatrimestre> = {
  inicio: 'inicio', 'inicio de clases': 'inicio', arranque: 'inicio', comienzo: 'inicio', 'inicio de cursada': 'inicio',
  fin: 'fin', cierre: 'fin', 'fin de cursada': 'fin', 'fin de clases': 'fin', 'cierre de cursada': 'fin',
  inscripcion: 'inscripcion', 'inscripcion al proximo': 'inscripcion', inscripciones: 'inscripcion',
  proximo: 'proximo', 'proximo cuatrimestre': 'proximo', 'inicio del proximo': 'proximo', 'arranca el proximo': 'proximo',
};

const SI = new Set(['si', 's', 'true', '1', 'x', 'yes']);
const NO = new Set(['no', 'n', 'false', '0']);

/** Busca la evaluación que recupera un recuperatorio, dentro de la misma materia. */
function vincularRecu(recu: Item, texto: string, todos: Item[]): Item | undefined {
  const cands = todos.filter((i) => i !== recu && i.materiaId === recu.materiaId && i.tipo !== 'recuperatorio');
  const t = norm(texto);
  if (t) {
    return cands.find((c) => norm(c.titulo) === t) ?? cands.find((c) => norm(c.titulo).includes(t) || t.includes(norm(c.titulo)));
  }
  // Sin columna "recupera": se deduce del título ("Recuperatorio Parcial 2" → "Parcial 2").
  const propio = norm(recu.titulo).replace(/\b(recuperatorio|recu|recuperacion)\b/g, '').replace(/\s+/g, ' ').trim();
  if (!propio) return undefined;
  const contenidos = cands.filter((c) => propio.includes(norm(c.titulo))).sort((a, b) => b.titulo.length - a.titulo.length);
  return contenidos[0] ?? cands.find((c) => norm(c.titulo).includes(propio));
}

export function importarCSV(text: string): ImportResult {
  const rows = parseCSV(text);
  const res: ImportResult = { tipo: 'desconocido', items: [], materias: {}, requisitos: [], errores: [], filas: 0 };
  if (rows.length < 2) {
    res.errores.push('El archivo no tiene filas de datos (necesita encabezado + al menos una fila).');
    return res;
  }
  const header = rows[0].map((h) => HEADER_ALIAS[norm(h)] ?? norm(h));
  const col = (name: string) => header.indexOf(name);
  if (col('materia') < 0) {
    res.errores.push('Falta la columna "materia".');
    return res;
  }
  const get = (r: string[], name: string) => (col(name) >= 0 ? (r[col(name)] ?? '').trim() : '');
  const recuTexto = new Map<Item, string>();

  // Cada fila se interpreta sola: si tiene título es una entrega; si no, es el estado de la materia.
  // Así un único CSV puede traer materias y entregas mezcladas.
  rows.slice(1).forEach((r, idx) => {
    const fila = idx + 2;
    const titulo = get(r, 'titulo');

    // Fechas del cuatrimestre: materia = "cuatrimestre", titulo = inicio / fin / inscripcion / proximo
    if (CUATRI_MATERIA.includes(norm(get(r, 'materia')))) {
      const campo = CUATRI_CAMPO[norm(titulo)];
      const fecha = parseFecha(get(r, 'fecha'));
      if (!campo && !get(r, 'periodo')) {
        res.errores.push(`Fila ${fila}: para el cuatrimestre el título tiene que ser inicio, fin, inscripcion o proximo.`);
        return;
      }
      if (campo && !fecha) {
        res.errores.push(`Fila ${fila}: falta la fecha de "${titulo}" (o no es válida).`);
        return;
      }
      res.cuatri ??= {};
      if (campo && fecha) res.cuatri[campo] = fecha;
      if (get(r, 'periodo')) res.cuatri.nombre = get(r, 'periodo');
      res.filas++;
      return;
    }

    const mat = buscarMateria(get(r, 'materia'));
    if (!mat) {
      res.errores.push(`Fila ${fila}: no reconozco la materia "${get(r, 'materia')}".`);
      return;
    }
    if (!titulo && (get(r, 'tipo') || get(r, 'fecha'))) {
      res.errores.push(`Fila ${fila}: tiene tipo o fecha pero le falta el título.`);
      return;
    }
    res.filas++;
    if (titulo) {
      const fecha = parseFecha(get(r, 'fecha'));
      if (fecha === null) res.errores.push(`Fila ${fila}: fecha "${get(r, 'fecha')}" no válida (usá AAAA-MM-DD o DD/MM/AAAA). Se importa sin fecha.`);
      const desde = parseFecha(get(r, 'desde'));
      if (desde === null) res.errores.push(`Fila ${fila}: fecha de apertura "${get(r, 'desde')}" no válida.`);
      const tipoRaw = norm(get(r, 'tipo'));
      const estadoRaw = norm(get(r, 'estado'));
      const tipo: TipoItem = TIPO_ALIAS[tipoRaw] ?? (tipoRaw ? 'otro' : 'tp');
      const opc = norm(get(r, 'opcional'));
      const recupera = get(r, 'recupera');
      const item: Item = {
        id: uid(),
        materiaId: mat.id,
        tipo,
        titulo,
        fecha: fecha ?? undefined,
        desde: desde ?? undefined,
        estado: ESTADO_ITEM_ALIAS[estadoRaw] ?? 'pendiente',
        nota: parseNota(get(r, 'nota')),
        grupo: get(r, 'grupo') || undefined,
        descripcion: get(r, 'descripcion') || undefined,
        link: get(r, 'link') || undefined,
        // Los recuperatorios son opcionales salvo que el CSV diga lo contrario.
        opcional: SI.has(opc) ? true : NO.has(opc) ? undefined : tipo === 'recuperatorio' || !!recupera ? true : undefined,
      };
      res.items.push(item);
      if (tipo === 'recuperatorio' || recupera) recuTexto.set(item, recupera);
    } else {
      const patch: Partial<Datos['materias'][number]> = {};
      const est = get(r, 'estado');
      if (est) {
        const e = ESTADO_MAT_ALIAS[norm(est)];
        if (e) patch.estado = e; else res.errores.push(`Fila ${fila}: estado "${est}" no reconocido.`);
      }
      const nota = parseNota(get(r, 'nota'));
      if (nota !== undefined) patch.nota = nota;
      const mod = get(r, 'modalidad');
      if (mod) {
        patch.modalidad = mod
          .split(/[|/+]/)
          .map((x) => MOD_ALIAS[norm(x)])
          .filter((x): x is Modalidad => !!x);
      }
      if (get(r, 'periodo')) patch.periodo = get(r, 'periodo');
      if (get(r, 'apuntes')) patch.apuntes = get(r, 'apuntes');
      if (get(r, 'link')) patch.link = get(r, 'link');
      res.materias[mat.id] = { ...res.materias[mat.id], ...patch };
      get(r, 'requisitos')
        .split('|')
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((texto) => res.requisitos.push({ id: uid(), materiaId: mat.id, texto, cumplido: false }));
    }
  });

  for (const [recu, texto] of recuTexto) {
    const orig = vincularRecu(recu, texto, res.items);
    if (orig) recu.recuperaA = orig.id;
    else if (texto) res.errores.push(`"${recu.titulo}": no encontré la evaluación "${texto}" en el archivo. Queda como recuperatorio suelto.`);
  }

  const hayMaterias = Object.keys(res.materias).length > 0;
  res.tipo = res.items.length && hayMaterias ? 'mixto' : res.items.length ? 'entregas' : hayMaterias ? 'materias' : 'desconocido';
  return res;
}

/* ---------- Plantillas y exportación ---------- */

export const COLUMNAS = [
  'materia', 'titulo', 'tipo', 'desde', 'fecha', 'estado', 'nota', 'recupera', 'opcional',
  'grupo', 'descripcion', 'modalidad', 'requisitos', 'periodo', 'apuntes', 'link',
] as const;

type Fila = Partial<Record<(typeof COLUMNAS)[number], unknown>>;
const fila = (f: Fila) => COLUMNAS.map((c) => f[c]);

/** Plantilla única: filas sin título = estado de la materia; filas con título = entregas. */
export const PLANTILLA = toCSV([
  [...COLUMNAS],
  fila({ materia: 'cuatrimestre', titulo: 'inicio', fecha: '2026-08-10', periodo: '2º cuatrimestre 2026' }),
  fila({ materia: 'cuatrimestre', titulo: 'fin', fecha: '2026-12-05' }),
  fila({ materia: 'cuatrimestre', titulo: 'inscripcion', fecha: '2027-02-20' }),
  fila({ materia: 'Programación I', estado: 'aprobada', nota: 9, periodo: '2025-C1' }),
  fila({ materia: 'Inglés I', estado: 'equivalencia' }),
  fila({ materia: 'Programación III', estado: 'cursando', modalidad: 'parciales|tpi', requisitos: 'Entrega de código aprobada para rendir el cuestionario', periodo: '2026-C2', apuntes: 'Consultas los martes', link: 'https://campus.ejemplo/curso/82' }),
  fila({ materia: 'Programación III', titulo: 'Parcial 1', tipo: 'parcial', fecha: '2026-09-19', estado: 'aprobado', nota: 8 }),
  fila({ materia: 'Programación III', titulo: 'Recuperatorio Parcial 1', tipo: 'recuperatorio', fecha: '2026-09-26', recupera: 'Parcial 1' }),
  fila({ materia: 'Programación III', titulo: 'Parcial 2', tipo: 'parcial', desde: '2026-11-02', fecha: '2026-11-12' }),
  fila({ materia: 'Programación III', titulo: 'Recuperatorio Parcial 2', tipo: 'recuperatorio', desde: '2026-11-16', fecha: '2026-11-26', recupera: 'Parcial 2' }),
  fila({ materia: 'Programación III', titulo: 'TP Integrador', tipo: 'tpi', desde: '2026-11-16', fecha: '2026-11-21', grupo: 'TPI', descripcion: 'Un .zip con el video' }),
]);

/** Exporta todo en el mismo formato único que acepta la importación. */
export function exportarTodo(d: Datos) {
  const filas: unknown[][] = [[...COLUMNAS]];
  const c = d.cuatri ?? {};
  const campos: (keyof Cuatrimestre)[] = ['inicio', 'fin', 'inscripcion', 'proximo'];
  let conNombre = false;
  for (const k of campos) {
    if (!c[k]) continue;
    filas.push(fila({ materia: 'cuatrimestre', titulo: k, fecha: c[k], periodo: conNombre ? '' : c.nombre }));
    conNombre = true;
  }
  for (const m of PLAN) {
    const p = d.materias[m.id];
    const reqs = d.requisitos.filter((r) => r.materiaId === m.id).map((r) => r.texto).join('|');
    if (p && p.estado !== 'pendiente') {
      filas.push(fila({ materia: m.nombre, estado: p.estado, nota: p.nota, modalidad: p.modalidad.join('|'), requisitos: reqs, periodo: p.periodo, apuntes: p.apuntes, link: p.link }));
    }
    for (const i of d.items.filter((x) => x.materiaId === m.id)) {
      const orig = i.recuperaA ? d.items.find((x) => x.id === i.recuperaA) : undefined;
      filas.push(fila({
        materia: m.nombre, titulo: i.titulo, tipo: i.tipo, desde: i.desde, fecha: i.fecha, estado: i.estado, nota: i.nota,
        recupera: orig?.titulo, opcional: i.opcional ? 'si' : i.tipo === 'recuperatorio' ? 'no' : '',
        grupo: i.grupo, descripcion: i.descripcion, link: i.link,
      }));
    }
  }
  return toCSV(filas);
}

export function descargar(nombre: string, contenido: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + contenido], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
