import { useState } from 'react';
import { useStore } from '../store';
import type { Cuatrimestre } from '../types';
import { Modal, toast } from './ui';

export function CuatriForm({ onClose }: { onClose: () => void }) {
  const { datos, setCuatri } = useStore();
  const [c, setC] = useState<Cuatrimestre>(datos.cuatri ?? {});
  const set = (k: keyof Cuatrimestre, v: string) => setC((x) => ({ ...x, [k]: v || undefined }));

  return (
    <Modal title="Fechas del cuatrimestre" onClose={onClose}>
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); setCuatri(c); toast('Fechas guardadas ✓'); onClose(); }}>
        <label className="field full">
          <span>Nombre</span>
          <input className="input" value={c.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} placeholder="2º cuatrimestre 2026" />
        </label>
        <label className="field">
          <span>Empiezan las clases</span>
          <input className="input" type="date" value={c.inicio ?? ''} onChange={(e) => set('inicio', e.target.value)} />
        </label>
        <label className="field">
          <span>Termina la cursada</span>
          <input className="input" type="date" value={c.fin ?? ''} onChange={(e) => set('fin', e.target.value)} />
        </label>
        <label className="field">
          <span>Inscripción al próximo</span>
          <input className="input" type="date" value={c.inscripcion ?? ''} onChange={(e) => set('inscripcion', e.target.value)} />
        </label>
        <label className="field">
          <span>Arranca el próximo</span>
          <input className="input" type="date" value={c.proximo ?? ''} onChange={(e) => set('proximo', e.target.value)} />
        </label>
        <p className="tiny muted full">Si no cargás el fin, lo estimo con la última fecha de tus materias. Cuando falten 3 semanas o se acerque la inscripción, en Inicio te muestro qué materias podés cursar después.</p>
        <div className="full row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary">Guardar</button>
        </div>
      </form>
    </Modal>
  );
}
