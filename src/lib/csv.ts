import { PLAN, materiaById } from '../data/plan';
import type { Datos, EstadoItem, EstadoMateria, Item, Modalidad, Requisito, TipoItem } from '../types';
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
  recuperatorio: 'recuperatorio', recu: 'recuperatorio',
  coloquio: 'coloquio', defensa: 'coloquio', oral: 'coloquio',
  final: 'final', 'examen final': 'final',
  cuestionario: 'cuestionario', quiz: 'cuestionario', autoevaluacion: 'cuestionario',
  otro: 'otro',
};

const ESTADO_ITEM_ALIAS: Record<string, EstadoItem> = {
  pendiente: 'pendiente', '': 'pendiente', 'por hacer': 'pendiente', todo: 'pendiente',
  'en curso': 'en_curso', en_curso: 'en_curso', haciendo: 'en_curso', 'en progreso': 'en_curso',
  entregado: 'entregado', entregada: 'entregado', hecho: 'entregado', listo: 'entregado', enviado: 'entregado',
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
  tipo: 'entregas' | 'materias' | 'desconocido';
  items: Item[];
  materias: Record<number, Partial<Datos['materias'][number]>>;
  requisitos: Requisito[];
  errores: string[];
  filas: number;
}

const HEADER_ALIAS: Record<string, string> = {
  materia: 'materia', asignatura: 'materia', codigo: 'materia',
  tipo: 'tipo', titulo: 'titulo', nombre: 'titulo', actividad: 'titulo', consigna: 'titulo',
  fecha: 'fecha', vencimiento: 'fecha', 'fecha entrega': 'fecha', deadline: 'fecha', entrega: 'fecha',
  estado: 'estado', nota: 'nota', calificacion: 'nota',
  grupo: 'grupo', proyecto: 'grupo',
  descripcion: 'descripcion', detalle: 'descripcion', notas: 'descripcion',
  link: 'link', url: 'link', enlace: 'link',
  modalidad: 'modalidad', evaluacion: 'modalidad', periodo: 'periodo', cuatrimestre: 'periodo',
  requisitos: 'requisitos', condiciones: 'requisitos', apuntes: 'apuntes',
};

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
  res.tipo = col('titulo') >= 0 ? 'entregas' : 'materias';
  const get = (r: string[], name: string) => (col(name) >= 0 ? (r[col(name)] ?? '').trim() : '');

  rows.slice(1).forEach((r, idx) => {
    const fila = idx + 2;
    const mat = buscarMateria(get(r, 'materia'));
    if (!mat) {
      res.errores.push(`Fila ${fila}: no reconozco la materia "${get(r, 'materia')}".`);
      return;
    }
    res.filas++;
    if (res.tipo === 'entregas') {
      const titulo = get(r, 'titulo');
      if (!titulo) { res.errores.push(`Fila ${fila}: falta el título.`); return; }
      const fecha = parseFecha(get(r, 'fecha'));
      if (fecha === null) res.errores.push(`Fila ${fila}: fecha "${get(r, 'fecha')}" no válida (usá AAAA-MM-DD o DD/MM/AAAA). Se importa sin fecha.`);
      const tipoRaw = norm(get(r, 'tipo'));
      const estadoRaw = norm(get(r, 'estado'));
      res.items.push({
        id: uid(),
        materiaId: mat.id,
        tipo: TIPO_ALIAS[tipoRaw] ?? (tipoRaw ? 'otro' : 'tp'),
        titulo,
        fecha: fecha ?? undefined,
        estado: ESTADO_ITEM_ALIAS[estadoRaw] ?? 'pendiente',
        nota: parseNota(get(r, 'nota')),
        grupo: get(r, 'grupo') || undefined,
        descripcion: get(r, 'descripcion') || undefined,
        link: get(r, 'link') || undefined,
      });
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
      res.materias[mat.id] = { ...res.materias[mat.id], ...patch };
      get(r, 'requisitos')
        .split('|')
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((texto) => res.requisitos.push({ id: uid(), materiaId: mat.id, texto, cumplido: false }));
    }
  });
  return res;
}

/* ---------- Plantillas y exportación ---------- */

export const PLANTILLA_ENTREGAS = toCSV([
  ['materia', 'tipo', 'titulo', 'fecha', 'estado', 'nota', 'grupo', 'descripcion', 'link'],
  ['Programación III', 'entrega', 'Entrega 1 — Modelo de dominio', '2026-09-15', 'aprobado', '8', 'TPI Sistema de turnos', '', ''],
  ['Programación III', 'entrega', 'Entrega 2 — API REST', '2026-10-20', 'entregado', '', 'TPI Sistema de turnos', '', ''],
  ['Programación III', 'entrega', 'Entrega final + defensa', '2026-11-24', 'pendiente', '', 'TPI Sistema de turnos', 'Video de 10 min', ''],
  ['Base de Datos II', 'tpi', 'TP Integrador', '2026-11-18', 'en curso', '', '', 'Grupal', ''],
  ['Inglés II', 'coloquio', 'Coloquio oral', '2026-12-02', 'pendiente', '', '', '', ''],
]);

export const PLANTILLA_MATERIAS = toCSV([
  ['materia', 'estado', 'nota', 'modalidad', 'periodo', 'requisitos'],
  ['Programación I', 'aprobada', '9', '', '2025-C1', ''],
  ['Programación III', 'cursando', '', 'entregas|coloquio', '2026-C2', '80% de actividades entregadas|Aprobar las 3 entregas con 6+'],
  ['Base de Datos II', 'cursando', '', 'tpi', '2026-C2', 'TPI aprobado con 6+'],
  ['Inglés II', 'cursando', '', 'coloquio', '2026-C2', 'Cuestionarios completos'],
]);

export function exportarEntregas(d: Datos) {
  return toCSV([
    ['materia', 'tipo', 'titulo', 'fecha', 'estado', 'nota', 'grupo', 'descripcion', 'link'],
    ...d.items.map((i) => [
      materiaById(i.materiaId)?.nombre, i.tipo, i.titulo, i.fecha, i.estado, i.nota, i.grupo, i.descripcion, i.link,
    ]),
  ]);
}

export function exportarMaterias(d: Datos) {
  return toCSV([
    ['materia', 'estado', 'nota', 'modalidad', 'periodo', 'requisitos'],
    ...PLAN.map((m) => {
      const p = d.materias[m.id];
      const reqs = d.requisitos.filter((r) => r.materiaId === m.id).map((r) => r.texto).join('|');
      return [m.nombre, p?.estado ?? 'pendiente', p?.nota, p?.modalidad?.join('|'), p?.periodo, reqs];
    }),
  ]);
}

export function descargar(nombre: string, contenido: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + contenido], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
