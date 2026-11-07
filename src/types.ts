export type EstadoMateria =
  | 'pendiente'
  | 'cursando'
  | 'regular'
  | 'aprobada'
  | 'promocionada'
  | 'equivalencia';

export type Modalidad =
  | 'parciales'
  | 'tpi'
  | 'entregas'
  | 'coloquio'
  | 'final'
  | 'promocion';

export type TipoItem =
  | 'tp'
  | 'tpi'
  | 'entrega'
  | 'parcial'
  | 'recuperatorio'
  | 'coloquio'
  | 'final'
  | 'cuestionario'
  | 'otro';

export type EstadoItem = 'pendiente' | 'en_curso' | 'entregado' | 'aprobado' | 'desaprobado';

export interface Materia {
  id: number;
  nombre: string;
  corto: string;
  nivel: 1 | 2;
  cuatri: 1 | 2;
  cursar: number[];
  aprobar: number[];
  hue: number;
}

export interface MateriaProgreso {
  estado: EstadoMateria;
  nota?: number;
  modalidad: Modalidad[];
  periodo?: string;
  apuntes?: string;
  link?: string; // aula del campus
}

export interface Item {
  id: string;
  materiaId: number;
  tipo: TipoItem;
  titulo: string;
  fecha?: string; // YYYY-MM-DD · fecha límite / día del examen
  desde?: string; // YYYY-MM-DD · cuando abre (para ventanas "del 2 al 12/11")
  estado: EstadoItem;
  nota?: number;
  grupo?: string;
  descripcion?: string;
  link?: string;
  /** Solo hace falta si sale mal otra evaluación (típico de los recuperatorios). */
  opcional?: boolean;
  /** id de la evaluación que recupera. */
  recuperaA?: string;
}

export interface Cuatrimestre {
  nombre?: string; // "2º cuatrimestre 2026"
  inicio?: string;
  fin?: string;
  inscripcion?: string; // inscripción al próximo
  proximo?: string; // arranca el próximo
}

export interface Requisito {
  id: string;
  materiaId: number;
  texto: string;
  cumplido: boolean;
}

export interface Datos {
  version: 2;
  materias: Record<number, MateriaProgreso>;
  items: Item[];
  requisitos: Requisito[];
  cuatri?: Cuatrimestre;
}
