import { useState } from 'react';
import { Check, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { ESTADOS_ITEM, ESTADOS_MATERIA, MODALIDADES, TIPOS_ITEM, materiaById, tipoInfo } from '../data/plan';
import { avanceMateria, ordenFecha, ordenarConRecus, prog, resumenEvaluaciones, rolItem } from '../lib/logic';
import { useStore } from '../store';
import type { Item, TipoItem } from '../types';
import { Modal, Ring, RolTag, hueStyle, toast } from './ui';

type Tab = 'eval' | 'aprobar' | 'apuntes';

const RAPIDOS: TipoItem[] = ['parcial', 'tp', 'tpi', 'entrega', 'cuestionario', 'coloquio', 'recuperatorio', 'final'];
const RECUPERABLES: TipoItem[] = ['parcial', 'tp', 'tpi', 'entrega', 'cuestionario', 'coloquio', 'final', 'otro'];

const BASE: Record<TipoItem, string> = {
  parcial: 'Parcial', tp: 'TP', tpi: 'TP Integrador', entrega: 'Entrega', cuestionario: 'Cuestionario',
  coloquio: 'Coloquio', recuperatorio: 'Recuperatorio', final: 'Final', otro: 'Actividad',
};
const NUMERADOS: TipoItem[] = ['parcial', 'tp', 'entrega', 'cuestionario', 'coloquio'];

export function MateriaModal({ id, tabInicial, onClose }: { id: number; tabInicial?: Tab; onClose: () => void }) {
  const { datos, setMateria, upsertItem, addRequisito, toggleRequisito, borrarRequisito } = useStore();
  const m = materiaById(id)!;
  const p = prog(datos, id);
  const a = avanceMateria(datos, id);
  const enCurso = p.estado === 'cursando' || p.estado === 'regular';
  const [tab, setTab] = useState<Tab>(tabInicial ?? (enCurso || a.items.length ? 'eval' : 'apuntes'));
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevoReq, setNuevoReq] = useState('');

  const lista = ordenarConRecus(a.items);
  const conNota = p.estado === 'aprobada' || p.estado === 'promocionada';

  const agregar = (tipo: TipoItem) => {
    // "Parcial 3" si ya hay "Parcial 1" y "Parcial 2 — …"; si no hay ninguno numerado, arranca en 1.
    const re = new RegExp(`^${BASE[tipo]} (\\d+)\\b`, 'i');
    const max = Math.max(0, ...a.items.map((i) => Number(i.titulo.match(re)?.[1] ?? 0)));
    const yaHay = a.items.some((i) => i.tipo === tipo || i.titulo.toLowerCase().startsWith(BASE[tipo].toLowerCase()));
    let titulo = NUMERADOS.includes(tipo) || (yaHay && max) ? `${BASE[tipo]} ${max + 1}` : yaHay ? `${BASE[tipo]} 2` : BASE[tipo];
    const extra: Partial<Item> = {};
    if (tipo === 'recuperatorio') {
      // Se engancha a la última evaluación que todavía no tiene recuperatorio.
      const sinRecu = a.items
        .filter((i) => RECUPERABLES.includes(i.tipo) && !a.items.some((r) => r.recuperaA === i.id))
        .sort(ordenFecha);
      const prefer = sinRecu.filter((i) => i.estado === 'desaprobado');
      const obj = prefer[prefer.length - 1] ?? sinRecu[sinRecu.length - 1];
      extra.opcional = true;
      if (obj) { extra.recuperaA = obj.id; titulo = `Recuperatorio ${obj.titulo}`; }
    }
    const nuevo = upsertItem({ materiaId: id, tipo, titulo, estado: 'pendiente', ...extra });
    if (p.estado === 'pendiente') setMateria(id, { estado: 'cursando' });
    setAbierto(nuevo);
  };

  const head = (
    <div className="row" style={{ gap: 14, ...hueStyle(m.hue) }}>
      <Ring pct={a.pct} size={54} stroke={5} color={`hsl(${m.hue} 55% 60%)`} />
      <div style={{ minWidth: 0 }}>
        <div className="tiny muted">#{m.id} · Nivel {m.nivel} · {m.cuatri}º cuatrimestre del plan</div>
        <h2>{m.nombre}</h2>
      </div>
    </div>
  );

  return (
    <Modal title={m.nombre} onClose={onClose} wide head={head}>
      <div className="ficha-estado" style={hueStyle(m.hue)}>
        <div className="field">
          <span>Estado</span>
          <div className="seg seg-estado">
            {ESTADOS_MATERIA.map((e) => (
              <button key={e.value} className={p.estado === e.value ? 'on' : ''} onClick={() => setMateria(id, { estado: e.value })}>{e.label}</button>
            ))}
          </div>
        </div>
        <div className="row wrap" style={{ gap: 12 }}>
          {conNota && (
            <label className="field">
              <span>Nota final</span>
              <input className="input nota-input" type="number" min="1" max="10" step="0.5" placeholder="—" value={p.nota ?? ''}
                onChange={(e) => setMateria(id, { nota: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </label>
          )}
          <label className="field">
            <span>Cuándo</span>
            <input className="input" style={{ width: 120 }} placeholder="2026-C2" value={p.periodo ?? ''} onChange={(e) => setMateria(id, { periodo: e.target.value || undefined })} />
          </label>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'eval'} className={tab === 'eval' ? 'on' : ''} onClick={() => setTab('eval')}>Evaluaciones <span className="tiny muted">{a.items.length}</span></button>
        <button role="tab" aria-selected={tab === 'aprobar'} className={tab === 'aprobar' ? 'on' : ''} onClick={() => setTab('aprobar')}>Cómo se aprueba</button>
        <button role="tab" aria-selected={tab === 'apuntes'} className={tab === 'apuntes' ? 'on' : ''} onClick={() => setTab('apuntes')}>Apuntes</button>
      </div>

      {tab === 'eval' && (
        <div className="fade-in">
          <div className="quick-add">
            {RAPIDOS.map((t) => (
              <button key={t} className="pill toggle" onClick={() => agregar(t)}>
                <Plus size={12} /> {tipoInfo(t).emoji} {tipoInfo(t).label}
              </button>
            ))}
          </div>
          {lista.length === 0 ? (
            <div className="empty small">
              <div className="big">🗂️</div>
              Tocá un botón de arriba para cargar el primer parcial, TP o entrega.<br />
              Después le ponés la fecha y el estado ahí mismo.
            </div>
          ) : (
            <div className="evals">
              {lista.map(({ item, sub }) => (
                <EvalRow key={item.id} item={item} sub={sub} abierto={abierto === item.id}
                  onToggle={() => setAbierto(abierto === item.id ? null : item.id)} candidatos={a.items.filter((x) => x.id !== item.id && x.tipo !== 'recuperatorio')} />
              ))}
            </div>
          )}
          <p className="tiny muted" style={{ marginTop: 10 }}>
            Los recuperatorios son <b>opcionales</b>: solo se vuelven obligatorios si la evaluación que recuperan sale desaprobada.
          </p>
        </div>
      )}

      {tab === 'aprobar' && (
        <div className="fade-in stack" style={{ gap: 18 }}>
          <div>
            <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>Lo que ya cargaste cuenta solo</div>
            <p className="small muted">{resumenEvaluaciones(a.items) || 'Todavía no hay evaluaciones cargadas.'}</p>
          </div>
          <div>
            <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Formato de la materia <span className="tiny muted">(opcional)</span></div>
            <div className="row wrap" style={{ gap: 6 }}>
              {MODALIDADES.map((mod) => {
                const on = p.modalidad.includes(mod.value);
                return (
                  <button key={mod.value} title={mod.hint} className={`pill toggle ${on ? 'on' : ''}`}
                    onClick={() => setMateria(id, { modalidad: on ? p.modalidad.filter((x) => x !== mod.value) : [...p.modalidad, mod.value] })}>
                    {on && <Check size={12} />} {mod.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>Condiciones extra</div>
            <p className="tiny muted" style={{ marginBottom: 8 }}>Lo que no es una evaluación: asistencia, nota mínima para promocionar, tener una entrega aprobada para rendir…</p>
            {a.reqs.map((r) => (
              <div key={r.id} className={`req ${r.cumplido ? 'done' : ''}`}>
                <button className={`check ${r.cumplido ? 'on' : ''}`} onClick={() => toggleRequisito(r.id)} aria-label="Cumplido">
                  {r.cumplido && <Check size={14} strokeWidth={3} />}
                </button>
                <span className="grow">{r.texto}</span>
                <button className="icon-btn" style={{ opacity: 1 }} onClick={() => borrarRequisito(r.id)} aria-label="Quitar"><X size={14} /></button>
              </div>
            ))}
            <form className="row" style={{ marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); if (nuevoReq.trim()) { addRequisito(id, nuevoReq.trim()); setNuevoReq(''); } }}>
              <input className="input" value={nuevoReq} onChange={(e) => setNuevoReq(e.target.value)} placeholder="Ej: 7 o más en los parciales para promocionar" />
              <button className="btn" type="submit" aria-label="Agregar condición"><Plus size={16} /></button>
            </form>
          </div>
        </div>
      )}

      {tab === 'apuntes' && (
        <div className="fade-in stack" style={{ gap: 14 }}>
          <label className="field">
            <span>Aula del campus</span>
            <input className="input" type="url" value={p.link ?? ''} onChange={(e) => setMateria(id, { link: e.target.value || undefined })} placeholder="https://tup.sied.utn.edu.ar/course/view.php?id=…" />
          </label>
          <label className="field">
            <span>Apuntes</span>
            <textarea className="textarea" style={{ minHeight: 200 }} value={p.apuntes ?? ''} onChange={(e) => setMateria(id, { apuntes: e.target.value || undefined })}
              placeholder={'Un renglón por idea, por ejemplo:\nTutora: Ana Pérez\nConsultas: martes 19 h\nNotas sobre 100'} />
          </label>
          <p className="tiny muted">Cada renglón se muestra como un punto. Si empieza con “Algo:”, esa parte queda en negrita. Los links se pueden tocar.</p>
        </div>
      )}

      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
        <button className="btn primary" onClick={() => { toast('Guardado ✓'); onClose(); }}>Listo</button>
      </div>
    </Modal>
  );
}

function EvalRow({ item, sub, abierto, onToggle, candidatos }: { item: Item; sub: boolean; abierto: boolean; onToggle: () => void; candidatos: Item[] }) {
  const { datos, upsertItem, borrarItem } = useStore();
  const [borrar, setBorrar] = useState(false);
  const set = (patch: Partial<Item>) => upsertItem({ ...item, ...patch });
  const rol = rolItem(datos, item);
  const orig = item.recuperaA ? datos.items.find((x) => x.id === item.recuperaA) : undefined;
  const grupos = [...new Set(datos.items.filter((i) => i.materiaId === item.materiaId && i.grupo).map((i) => i.grupo!))];
  const esRecu = item.tipo === 'recuperatorio' || item.opcional || !!item.recuperaA;

  return (
    <div className={`eval ${sub ? 'sub' : ''} ${abierto ? 'open' : ''} ${rol === 'innecesario' ? 'skip' : ''}`}>
      <div className="eval-main">
        <span className="emoji" style={{ gridArea: 'emo' }} title={tipoInfo(item.tipo).label}>{tipoInfo(item.tipo).emoji}</span>
        <input className="input eval-tit" aria-label="Título" value={item.titulo} onChange={(e) => set({ titulo: e.target.value })}
          onBlur={() => !item.titulo.trim() && set({ titulo: tipoInfo(item.tipo).label })} />
        <input className="input eval-fec" aria-label="Fecha" type="date" value={item.fecha ?? ''} onChange={(e) => set({ fecha: e.target.value || undefined })} />
        <select className="select eval-est" aria-label="Estado" value={item.estado} onChange={(e) => set({ estado: e.target.value as Item['estado'] })}>
          {ESTADOS_ITEM.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input className="input eval-not" aria-label="Nota" type="number" step="any" min="0" max="100" placeholder="Nota" value={item.nota ?? ''}
          onChange={(e) => set({ nota: e.target.value === '' ? undefined : Number(e.target.value) })} />
        <button className="icon-btn eval-exp" onClick={onToggle} aria-label="Más opciones" aria-expanded={abierto}><ChevronDown size={16} style={{ transform: abierto ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} /></button>
        <button className="icon-btn eval-del" onClick={() => setBorrar(true)} aria-label="Borrar"><Trash2 size={15} /></button>
      </div>

      {(esRecu || item.desde || item.grupo) && (
        <div className="eval-meta tiny">
          {esRecu && <RolTag rol={rol} />}
          {orig && <span className="muted">recupera “{orig.titulo}”</span>}
          {item.desde && <span className="muted">abre el {item.desde.split('-').reverse().slice(0, 2).join('/')}</span>}
          {item.grupo && <span className="muted">· {item.grupo}</span>}
        </div>
      )}

      {borrar && (
        <div className="eval-confirm small">
          <span>¿Borrar “{item.titulo}”?</span>
          <div className="row">
            <button className="btn sm ghost" onClick={() => setBorrar(false)}>No</button>
            <button className="btn sm danger" onClick={() => { borrarItem(item.id); toast('Borrado'); }}><Trash2 size={14} /> Sí, borrar</button>
          </div>
        </div>
      )}

      {abierto && (
        <div className="eval-more form-grid">
          <label className="field">
            <span>Tipo</span>
            <select className="select" value={item.tipo} onChange={(e) => {
              const tipo = e.target.value as TipoItem;
              set({ tipo, opcional: tipo === 'recuperatorio' ? true : item.opcional });
            }}>
              {TIPOS_ITEM.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Abre <span className="tiny">(si tiene ventana de entrega)</span></span>
            <input className="input" type="date" value={item.desde ?? ''} onChange={(e) => set({ desde: e.target.value || undefined })} />
          </label>
          {esRecu && (
            <label className="field">
              <span>Recupera a</span>
              <select className="select" value={item.recuperaA ?? ''} onChange={(e) => set({ recuperaA: e.target.value || undefined })}>
                <option value="">— ninguna —</option>
                {candidatos.map((c) => <option key={c.id} value={c.id}>{tipoInfo(c.tipo).emoji} {c.titulo}</option>)}
              </select>
            </label>
          )}
          <label className="field" style={{ justifyContent: 'flex-end' }}>
            <span className="row" style={{ gap: 8, color: 'var(--text)', cursor: 'pointer', padding: '9px 0' }}>
              <input type="checkbox" checked={!!item.opcional} onChange={(e) => set({ opcional: e.target.checked || undefined })} />
              Opcional (solo si hace falta)
            </span>
          </label>
          <label className="field">
            <span>Trabajo / grupo <span className="tiny">(para entregas en etapas)</span></span>
            <input className="input" list={`grupos-${item.id}`} value={item.grupo ?? ''} onChange={(e) => set({ grupo: e.target.value || undefined })} placeholder="Ej: TPI" />
            <datalist id={`grupos-${item.id}`}>{grupos.map((g) => <option key={g} value={g} />)}</datalist>
          </label>
          <label className="field">
            <span>Link</span>
            <input className="input" type="url" value={item.link ?? ''} onChange={(e) => set({ link: e.target.value || undefined })} placeholder="Consigna, campus…" />
          </label>
          <label className="field full">
            <span>Detalle</span>
            <textarea className="textarea" style={{ minHeight: 64 }} value={item.descripcion ?? ''} onChange={(e) => set({ descripcion: e.target.value || undefined })} placeholder="Horario, formato de entrega, si es grupal…" />
          </label>
        </div>
      )}
    </div>
  );
}
