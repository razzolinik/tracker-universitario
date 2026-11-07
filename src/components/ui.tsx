import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { materiaById, tipoInfo, labelEstadoItem } from '../data/plan';
import { diaSemana, diasHasta, fechaCorta, itemHecho, rangoFechas, rolItem, textoRelativo, urgencia, type Rol } from '../lib/logic';
import type { Item } from '../types';
import { useStore } from '../store';

export const hueStyle = (hue: number) => ({ '--h': hue } as CSSProperties);

export function Ring({ pct, size = 52, stroke = 5, color = 'var(--accent)', label }: { pct: number; size?: number; stroke?: number; color?: string; label?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, Math.max(0, pct))) / 100}
        />
      </svg>
      <span className="ring-label">{label ?? `${pct}%`}</span>
    </div>
  );
}

export function Bar({ pct, color }: { pct: number; color?: string }) {
  return <div className="bar"><i style={{ width: `${pct}%`, background: color }} /></div>;
}

export function MateriaChip({ id, corto = true }: { id: number; corto?: boolean }) {
  const m = materiaById(id);
  if (!m) return null;
  return <span className="chip" style={hueStyle(m.hue)}>{corto ? m.corto : m.nombre}</span>;
}

export function Modal({ onClose, children, title, wide, head }: { onClose: () => void; children: ReactNode; title: string; wide?: boolean; head?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <div className="card-head" style={{ alignItems: 'flex-start' }}>
          {head ?? <h2>{title}</h2>}
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Etiqueta para recuperatorios / evaluaciones opcionales. */
export function RolTag({ rol }: { rol: Rol }) {
  if (rol === 'opcional') return <span className="tag tag-opt">solo si hace falta</span>;
  if (rol === 'necesario') return <span className="tag tag-nec">hay que rendirlo</span>;
  if (rol === 'innecesario') return <span className="tag tag-ok">no hace falta ✓</span>;
  return null;
}

export function ItemRow({ item, onOpen, showMateria = true, showFecha = true }: { item: Item; onOpen: (i: Item) => void; showMateria?: boolean; showFecha?: boolean }) {
  const { datos, upsertItem } = useStore();
  const hecho = itemHecho(item);
  const rol = rolItem(datos, item);
  const opt = rol === 'opcional' || rol === 'innecesario';
  const u = opt ? undefined : urgencia(item);
  const abreEn = item.desde && !hecho && diasHasta(item.desde) > 0 ? item.desde : undefined;
  return (
    <div className={`item-row ${hecho ? 'done' : ''} ${opt ? 'opt' : ''}`} onClick={() => onOpen(item)}>
      <button
        className={`check ${hecho ? 'on' : ''}`}
        aria-label={hecho ? 'Marcar como pendiente' : 'Marcar como entregado'}
        onClick={(e) => {
          e.stopPropagation();
          upsertItem({ ...item, estado: hecho ? 'pendiente' : 'entregado' });
        }}
      >
        {hecho && <Check size={14} strokeWidth={3} />}
      </button>
      <span className="emoji">{tipoInfo(item.tipo).emoji}</span>
      <div className="grow">
        <div className="title">{item.titulo}</div>
        <div className="row wrap tiny" style={{ gap: 8, marginTop: 2 }}>
          {showMateria && <MateriaChip id={item.materiaId} />}
          {item.grupo && <span className="muted">{item.grupo}</span>}
          {item.estado !== 'pendiente' && <span className={`st-${item.estado}`}>{labelEstadoItem(item.estado)}{item.nota !== undefined ? ` · ${item.nota}` : ''}</span>}
          <RolTag rol={rol} />
          {abreEn && <span className="muted">abre {diaSemana(abreEn)} {fechaCorta(abreEn)}</span>}
        </div>
      </div>
      {showFecha && item.fecha && (
        <div style={{ textAlign: 'right', flex: 'none' }} className="tiny">
          <div className="mono">{item.desde ? rangoFechas(item.desde, item.fecha) : `${diaSemana(item.fecha)} ${fechaCorta(item.fecha)}`}</div>
          {u && <div className={`u-${u}`}>{textoRelativo(item.fecha)}</div>}
        </div>
      )}
    </div>
  );
}

/** Convierte URLs en links tocables. */
export function Linkify({ text }: { text: string }) {
  const partes = text.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <>
      {partes.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" className="link-break">{p.replace(/^https?:\/\/(www\.)?/, '')}</a>
        ) : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}

/** Apuntes: cada renglón es un punto; "Algo: texto" resalta lo que va antes de los dos puntos. */
export function Apuntes({ text }: { text: string }) {
  const lineas = text.split(/\n+/).map((l) => l.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean);
  return (
    <ul className="apuntes">
      {lineas.map((l, i) => {
        const m = l.match(/^([^:]{2,28}):\s+(.*)$/);
        return (
          <li key={i}>
            {m && !/^https?$/.test(m[1]) ? <><b>{m[1]}:</b> <Linkify text={m[2]} /></> : <Linkify text={l} />}
          </li>
        );
      })}
    </ul>
  );
}

let toastSet: ((s: string | null) => void) | null = null;
export const toast = (msg: string) => toastSet?.(msg);
export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { toastSet = setMsg; return () => { toastSet = null; }; }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return msg ? <div className="toast">{msg}</div> : null;
}
