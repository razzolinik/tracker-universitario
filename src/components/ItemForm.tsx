import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ESTADOS_ITEM, PLAN, TIPOS_ITEM, tipoInfo } from '../data/plan';
import { prog } from '../lib/logic';
import { useStore } from '../store';
import type { Item } from '../types';
import { Modal, toast } from './ui';

export type ItemDraft = Partial<Item> & { materiaId?: number };

export function ItemForm({ inicial, onClose }: { inicial: ItemDraft; onClose: () => void }) {
  const { datos, upsertItem, borrarItem } = useStore();
  const cursando = PLAN.filter((m) => prog(datos, m.id).estado === 'cursando');
  const base = cursando.length ? cursando : PLAN;
  const extra = PLAN.find((m) => m.id === inicial.materiaId && !base.includes(m));
  const opciones = extra ? [...base, extra] : base;
  const [f, setF] = useState<ItemDraft>({
    tipo: 'tp',
    estado: 'pendiente',
    materiaId: inicial.materiaId ?? opciones[0]?.id,
    ...inicial,
  });
  const set = <K extends keyof Item>(k: K, v: Item[K] | undefined) => setF((x) => ({ ...x, [k]: v }));
  const grupos = [...new Set(datos.items.filter((i) => i.materiaId === f.materiaId && i.grupo).map((i) => i.grupo!))];
  const candidatos = datos.items.filter((i) => i.materiaId === f.materiaId && i.id !== f.id && i.tipo !== 'recuperatorio');
  const esRecu = f.tipo === 'recuperatorio' || f.opcional || !!f.recuperaA;

  const guardar = () => {
    if (!f.titulo?.trim() || !f.materiaId) return;
    upsertItem({ ...(f as Item), titulo: f.titulo.trim(), grupo: f.grupo?.trim() || undefined });
    toast(f.id ? 'Cambios guardados' : 'Agregado ✨');
    onClose();
  };

  return (
    <Modal title={f.id ? 'Editar' : 'Nueva entrega / evaluación'} onClose={onClose}>
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        <label className="field full">
          <span>Título</span>
          <input className="input" autoFocus value={f.titulo ?? ''} onChange={(e) => set('titulo', e.target.value)} placeholder="Ej: Entrega 2 — API REST" required />
        </label>
        <label className="field">
          <span>Materia</span>
          <select className="select" value={f.materiaId} onChange={(e) => set('materiaId', Number(e.target.value))}>
            {opciones.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Tipo</span>
          <select className="select" value={f.tipo} onChange={(e) => {
            const tipo = e.target.value as Item['tipo'];
            setF((x) => ({ ...x, tipo, opcional: tipo === 'recuperatorio' ? true : x.opcional }));
          }}>
            {TIPOS_ITEM.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Fecha <span className="tiny">(límite o día del examen)</span></span>
          <input className="input" type="date" value={f.fecha ?? ''} onChange={(e) => set('fecha', e.target.value || undefined)} />
        </label>
        <label className="field">
          <span>Abre <span className="tiny">(si tiene ventana)</span></span>
          <input className="input" type="date" value={f.desde ?? ''} onChange={(e) => set('desde', e.target.value || undefined)} />
        </label>
        <label className="field">
          <span>Estado</span>
          <select className="select" value={f.estado} onChange={(e) => set('estado', e.target.value as Item['estado'])}>
            {ESTADOS_ITEM.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        {esRecu && (
          <label className="field">
            <span>Recupera a</span>
            <select className="select" value={f.recuperaA ?? ''} onChange={(e) => set('recuperaA', e.target.value || undefined)}>
              <option value="">— ninguna —</option>
              {candidatos.map((c) => <option key={c.id} value={c.id}>{tipoInfo(c.tipo).emoji} {c.titulo}</option>)}
            </select>
          </label>
        )}
        <label className="field" style={{ justifyContent: 'flex-end' }}>
          <span className="row" style={{ gap: 8, color: 'var(--text)', cursor: 'pointer', padding: '9px 0' }}>
            <input type="checkbox" checked={!!f.opcional} onChange={(e) => set('opcional', e.target.checked || undefined)} />
            Opcional (solo si hace falta)
          </span>
        </label>
        <label className="field">
          <span>Grupo / proyecto <span className="tiny">(para entregas en etapas)</span></span>
          <input className="input" list="grupos" value={f.grupo ?? ''} onChange={(e) => set('grupo', e.target.value)} placeholder="Ej: TPI Sistema de turnos" />
          <datalist id="grupos">{grupos.map((g) => <option key={g} value={g} />)}</datalist>
        </label>
        <label className="field">
          <span>Nota</span>
          <input className="input" type="number" step="any" min="0" max="100" placeholder="0–10 o 0–100" value={f.nota ?? ''} onChange={(e) => set('nota', e.target.value === '' ? undefined : Number(e.target.value))} />
        </label>
        <label className="field full">
          <span>Detalle</span>
          <textarea className="textarea" value={f.descripcion ?? ''} onChange={(e) => set('descripcion', e.target.value || undefined)} placeholder="Consigna, si es grupal, formato de entrega…" />
        </label>
        <label className="field full">
          <span>Link</span>
          <input className="input" type="url" value={f.link ?? ''} onChange={(e) => set('link', e.target.value || undefined)} placeholder="Campus, repo, enunciado…" />
        </label>
        <div className="full row between" style={{ marginTop: 6 }}>
          {f.id ? (
            <button type="button" className="btn ghost danger" onClick={() => { borrarItem(f.id!); toast('Eliminado'); onClose(); }}>
              <Trash2 size={16} /> Eliminar
            </button>
          ) : <span />}
          <div className="row">
            <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn primary">Guardar</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
