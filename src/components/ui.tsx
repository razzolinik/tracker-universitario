import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { materiaById, tipoInfo, labelEstadoItem } from '../data/plan';
import { fechaCorta, itemHecho, textoRelativo, urgencia } from '../lib/logic';
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

export function Modal({ onClose, children, title }: { onClose: () => void; children: ReactNode; title: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="card-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ItemRow({ item, onOpen, showMateria = true, showFecha = true }: { item: Item; onOpen: (i: Item) => void; showMateria?: boolean; showFecha?: boolean }) {
  const { upsertItem } = useStore();
  const hecho = itemHecho(item);
  const u = urgencia(item);
  return (
    <div className={`item-row ${hecho ? 'done' : ''}`} onClick={() => onOpen(item)}>
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
          {item.grupo && showMateria && <span className="muted">{item.grupo}</span>}
          <span className={`st-${item.estado}`}>{labelEstadoItem(item.estado)}{item.nota !== undefined ? ` · ${item.nota}` : ''}</span>
        </div>
      </div>
      {showFecha && item.fecha && (
        <div style={{ textAlign: 'right' }} className="tiny">
          <div className="mono">{fechaCorta(item.fecha)}</div>
          {u && <div className={`u-${u}`}>{textoRelativo(item.fecha)}</div>}
        </div>
      )}
    </div>
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
