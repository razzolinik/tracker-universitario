import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Cuatrimestre, Datos, Item, MateriaProgreso, Requisito } from './types';
import { DEFAULT_PROGRESO, norm, toISO, uid } from './lib/logic';
import type { ImportResult } from './lib/csv';

const KEY = 'tupad-tracker-v2';

export const VACIO: Datos = { version: 2, materias: {}, items: [], requisitos: [] };

function cargar(): Datos {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return VACIO;
    const d = JSON.parse(raw);
    if (d?.version === 2) return { ...VACIO, ...d };
  } catch { /* storage bloqueado o JSON roto */ }
  return VACIO;
}

interface Store {
  datos: Datos;
  setMateria: (id: number, patch: Partial<MateriaProgreso>) => void;
  /** Crea o actualiza; devuelve el id. */
  upsertItem: (item: Omit<Item, 'id'> & { id?: string }) => string;
  borrarItem: (id: string) => void;
  addRequisito: (materiaId: number, texto: string) => void;
  toggleRequisito: (id: string) => void;
  borrarRequisito: (id: string) => void;
  aplicarImport: (r: ImportResult, modo: 'agregar' | 'reemplazar') => void;
  reemplazarTodo: (d: Datos) => void;
  setCuatri: (c: Cuatrimestre) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<Datos>(cargar);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(datos)); } catch { /* sin storage */ }
  }, [datos]);

  const setMateria = useCallback((id: number, patch: Partial<MateriaProgreso>) => {
    setDatos((d) => ({
      ...d,
      materias: { ...d.materias, [id]: { ...DEFAULT_PROGRESO, ...d.materias[id], ...patch } },
    }));
  }, []);

  const upsertItem = useCallback((item: Omit<Item, 'id'> & { id?: string }) => {
    const id = item.id ?? uid();
    setDatos((d) => {
      if (d.items.some((i) => i.id === id)) {
        return { ...d, items: d.items.map((i) => (i.id === id ? ({ ...i, ...item, id } as Item) : i)) };
      }
      return { ...d, items: [...d.items, { ...item, id } as Item] };
    });
    return id;
  }, []);

  const borrarItem = useCallback((id: string) => {
    // Los recuperatorios de esa evaluación quedan sueltos, no se borran.
    setDatos((d) => ({
      ...d,
      items: d.items.filter((i) => i.id !== id).map((i) => (i.recuperaA === id ? { ...i, recuperaA: undefined } : i)),
    }));
  }, []);

  const addRequisito = useCallback((materiaId: number, texto: string) => {
    setDatos((d) => ({ ...d, requisitos: [...d.requisitos, { id: uid(), materiaId, texto, cumplido: false }] }));
  }, []);

  const toggleRequisito = useCallback((id: string) => {
    setDatos((d) => ({
      ...d,
      requisitos: d.requisitos.map((r) => (r.id === id ? { ...r, cumplido: !r.cumplido } : r)),
    }));
  }, []);

  const borrarRequisito = useCallback((id: string) => {
    setDatos((d) => ({ ...d, requisitos: d.requisitos.filter((r) => r.id !== id) }));
  }, []);

  const setCuatri = useCallback((c: Cuatrimestre) => setDatos((d) => ({ ...d, cuatri: c })), []);

  const aplicarImport = useCallback((r: ImportResult, modo: 'agregar' | 'reemplazar') => {
    setDatos((d) => {
      const tocadas = new Set<number>([
        ...r.items.map((i) => i.materiaId),
        ...r.requisitos.map((x) => x.materiaId),
      ]);
      const materias = { ...d.materias };
      for (const [id, patch] of Object.entries(r.materias)) {
        materias[Number(id)] = { ...DEFAULT_PROGRESO, ...materias[Number(id)], ...patch };
      }
      // Al importar entregas de una materia, se marca como "cursando" si estaba pendiente
      for (const id of tocadas) {
        if (!materias[id] || materias[id].estado === 'pendiente') {
          materias[id] = { ...DEFAULT_PROGRESO, ...materias[id], estado: 'cursando' };
        }
      }
      let items: Item[];
      if (modo === 'reemplazar' && r.items.length > 0) {
        items = [...d.items.filter((i) => !tocadas.has(i.materiaId)), ...r.items];
      } else {
        // "agregar" no duplica: si ya existe una entrega con el mismo título en esa materia, se conserva la tuya,
        // y los recuperatorios nuevos que apuntaban a la del archivo pasan a apuntar a la tuya.
        const alias = new Map<string, string>();
        const nuevos = r.items.filter((n) => {
          const ya = d.items.find((i) => i.materiaId === n.materiaId && norm(i.titulo) === norm(n.titulo));
          if (ya) alias.set(n.id, ya.id);
          return !ya;
        });
        items = [...d.items, ...nuevos.map((n) => (n.recuperaA && alias.has(n.recuperaA) ? { ...n, recuperaA: alias.get(n.recuperaA) } : n))];
      }
      const reqMaterias = new Set(r.requisitos.map((x) => x.materiaId));
      const requisitos: Requisito[] =
        modo === 'reemplazar'
          ? [...d.requisitos.filter((x) => !reqMaterias.has(x.materiaId)), ...r.requisitos]
          : [...d.requisitos, ...r.requisitos.filter((n) => !d.requisitos.some((x) => x.materiaId === n.materiaId && norm(x.texto) === norm(n.texto)))];
      const cuatri = r.cuatri ? { ...d.cuatri, ...r.cuatri } : d.cuatri;
      return { ...d, materias, items, requisitos, cuatri };
    });
  }, []);

  const value = useMemo(
    () => ({
      datos, setMateria, upsertItem, borrarItem, addRequisito, toggleRequisito, borrarRequisito, aplicarImport, setCuatri,
      reemplazarTodo: setDatos,
    }),
    [datos, setMateria, upsertItem, borrarItem, addRequisito, toggleRequisito, borrarRequisito, aplicarImport, setCuatri],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
};

/* ---------- Datos de ejemplo (fechas relativas a hoy) ---------- */

export function datosEjemplo(): Datos {
  const d = (n: number) => {
    const x = new Date();
    x.setDate(x.getDate() + n);
    return toISO(x);
  };
  const aprob = (nota: number): MateriaProgreso => ({ estado: 'aprobada', nota, modalidad: [] });
  const it = (materiaId: number, tipo: Item['tipo'], titulo: string, dias: number, estado: Item['estado'], extra: Partial<Item> = {}): Item =>
    ({ id: uid(), materiaId, tipo, titulo, fecha: d(dias), estado, ...extra });
  const rq = (materiaId: number, texto: string, cumplido: boolean): Requisito => ({ id: uid(), materiaId, texto, cumplido });
  const p1 = it(11, 'parcial', 'Parcial 1', -30, 'aprobado', { nota: 7 });
  const p2 = it(11, 'parcial', 'Parcial 2', 7, 'pendiente');
  return {
    version: 2,
    cuatri: { nombre: 'Cuatrimestre de ejemplo', inicio: d(-90), fin: d(30) },
    materias: {
      1: aprob(9), 2: aprob(8), 3: aprob(7), 8: aprob(9), 4: aprob(10),
      5: aprob(8), 6: { estado: 'regular', modalidad: ['final'] }, 7: aprob(9),
      9: { estado: 'cursando', modalidad: ['entregas', 'coloquio'], periodo: '2026-C2' },
      10: { estado: 'cursando', modalidad: ['tpi'], periodo: '2026-C2' },
      11: { estado: 'cursando', modalidad: ['parciales', 'promocion'], periodo: '2026-C2' },
      12: { estado: 'cursando', modalidad: ['coloquio'], periodo: '2026-C2' },
    },
    items: [
      it(9, 'entrega', 'Entrega 1 — Modelo de dominio', -45, 'aprobado', { grupo: 'TPI Sistema de turnos', nota: 8 }),
      it(9, 'entrega', 'Entrega 2 — API REST', -12, 'entregado', { grupo: 'TPI Sistema de turnos' }),
      it(9, 'entrega', 'Entrega 3 — Front + tests', 4, 'en_curso', { grupo: 'TPI Sistema de turnos', desde: d(-6) }),
      it(9, 'coloquio', 'Defensa del TPI', 20, 'pendiente', { grupo: 'TPI Sistema de turnos' }),
      it(9, 'tp', 'TP 6 — Patrones de diseño', 1, 'pendiente'),
      it(10, 'tp', 'TP 3 — Procedimientos almacenados', -20, 'aprobado', { nota: 9 }),
      it(10, 'tpi', 'TP Integrador — Base de datos de e-commerce', 11, 'en_curso', { descripcion: 'Grupal, entregar script + DER' }),
      p1,
      it(11, 'recuperatorio', 'Recuperatorio Parcial 1', -23, 'pendiente', { opcional: true, recuperaA: p1.id }),
      p2,
      it(11, 'recuperatorio', 'Recuperatorio Parcial 2', 14, 'pendiente', { opcional: true, recuperaA: p2.id }),
      it(12, 'cuestionario', 'Cuestionario Unidad 4', -2, 'pendiente'),
      it(12, 'coloquio', 'Coloquio oral', 26, 'pendiente'),
    ],
    requisitos: [
      rq(9, '80% de actividades entregadas', true),
      rq(10, 'Asistir a 2 clases sincrónicas', true),
      rq(11, 'Parciales con 7+ para promocionar', false),
    ],
  };
}
