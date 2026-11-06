import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { ESTADOS_MATERIA, MODALIDADES, PLAN } from '../data/plan';
import { avanceMateria, fechaCorta, itemHecho, prog } from '../lib/logic';
import { useStore } from '../store';
import type { EstadoMateria, Item } from '../types';
import { ItemRow, Ring, hueStyle, toast } from '../components/ui';

interface Props {
  materiaId?: number;
  setMateriaId: (id: number) => void;
  onOpenItem: (i: Partial<Item>) => void;
  irA: (v: 'plan') => void;
}

const ordenFecha = (a: Item, b: Item) => (a.fecha ?? '9999') < (b.fecha ?? '9999') ? -1 : 1;

export function Cursada({ materiaId, setMateriaId, onOpenItem, irA }: Props) {
  const { datos } = useStore();
  const cursando = PLAN.filter((m) => prog(datos, m.id).estado === 'cursando');
  const actual = PLAN.find((m) => m.id === materiaId) ?? cursando[0];

  if (!actual) {
    return (
      <div className="fade-in">
        <div className="page-head"><div><h1>Cursada</h1><p className="muted">El detalle de cada materia que estás cursando.</p></div></div>
        <div className="card empty">
          <div className="big">📚</div>
          <p>No tenés materias marcadas como <b>cursando</b>.</p>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={() => irA('plan')}>Elegir materias en el plan</button>
        </div>
      </div>
    );
  }

  const lista = cursando.includes(actual) ? cursando : [...cursando, actual];

  return (
    <div className="fade-in">
      <div className="page-head">
        <div><h1>Cursada</h1><p className="muted">Requisitos, entregas y avance de cada materia.</p></div>
      </div>
      <div className="detail-layout">
        <div className="mat-list">
          {lista.map((m) => {
            const a = avanceMateria(datos, m.id);
            return (
              <button key={m.id} className={`mat-pick ${m.id === actual.id ? 'on' : ''}`} style={hueStyle(m.hue)} onClick={() => setMateriaId(m.id)}>
                <Ring pct={a.pct} size={40} stroke={4} color={`hsl(${m.hue} 55% 60%)`} label={<span style={{ fontSize: 10 }}>{a.pct}</span>} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.nombre}</div>
                  <div className="tiny muted">{a.itemsHechos}/{a.items.length} entregas · {a.reqsOk}/{a.reqs.length} req.</div>
                </div>
              </button>
            );
          })}
        </div>
        <Detalle key={actual.id} id={actual.id} onOpenItem={onOpenItem} />
      </div>
    </div>
  );
}

function Detalle({ id, onOpenItem }: { id: number; onOpenItem: (i: Partial<Item>) => void }) {
  const { datos, setMateria, addRequisito, toggleRequisito, borrarRequisito } = useStore();
  const m = PLAN.find((x) => x.id === id)!;
  const p = prog(datos, id);
  const a = avanceMateria(datos, id);
  const [nuevoReq, setNuevoReq] = useState('');
  const [apuntes, setApuntes] = useState(p.apuntes ?? '');

  const grupos = [...new Set(a.items.filter((i) => i.grupo).map((i) => i.grupo!))];
  const sueltos = a.items.filter((i) => !i.grupo).sort(ordenFecha);

  const cambiarEstado = (estado: EstadoMateria) => {
    setMateria(id, { estado });
    if (estado !== 'cursando') toast(`${m.corto} → ${ESTADOS_MATERIA.find((e) => e.value === estado)?.label}`);
  };

  return (
    <div className="stack" style={{ gap: 16, ...hueStyle(m.hue) }}>
      <div className="card mat-card" style={{ cursor: 'default' }}>
        <div className="row between wrap" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 16 }}>
            <Ring pct={a.pct} size={72} stroke={6} color={`hsl(${m.hue} 55% 60%)`} />
            <div>
              <div className="tiny muted">#{m.id} · Nivel {m.nivel} · {m.cuatri}º cuatrimestre {p.periodo ? `· ${p.periodo}` : ''}</div>
              <h2>{m.nombre}</h2>
              <div className="tiny muted">{a.itemsHechos} de {a.items.length} entregas hechas · {a.reqsOk} de {a.reqs.length} requisitos cumplidos</div>
            </div>
          </div>
          <div className="row wrap">
            <select className="select" style={{ width: 'auto' }} value={p.estado} onChange={(e) => cambiarEstado(e.target.value as EstadoMateria)}>
              {ESTADOS_MATERIA.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
            {(p.estado === 'aprobada' || p.estado === 'promocionada') && (
              <input className="input nota-input" type="number" min="1" max="10" step="0.5" placeholder="Nota" value={p.nota ?? ''}
                onChange={(e) => setMateria(id, { nota: e.target.value === '' ? undefined : Number(e.target.value) })} />
            )}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="tiny muted" style={{ marginBottom: 6 }}>¿Cómo se aprueba? (tocá para marcar)</div>
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
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="card">
          <div className="card-head"><h3>Requisitos de aprobación</h3><span className="pill">{a.reqsOk}/{a.reqs.length}</span></div>
          {a.reqs.length === 0 && <p className="muted small" style={{ marginBottom: 8 }}>Anotá las condiciones: % de asistencia, notas mínimas, entregas obligatorias…</p>}
          {a.reqs.map((r) => (
            <div key={r.id} className={`req ${r.cumplido ? 'done' : ''}`}>
              <button className={`check ${r.cumplido ? 'on' : ''}`} onClick={() => toggleRequisito(r.id)} aria-label="Cumplido">
                {r.cumplido && <Check size={14} strokeWidth={3} />}
              </button>
              <span className="grow">{r.texto}</span>
              <button className="icon-btn" onClick={() => borrarRequisito(r.id)} aria-label="Quitar"><X size={14} /></button>
            </div>
          ))}
          <form className="row" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); if (nuevoReq.trim()) { addRequisito(id, nuevoReq.trim()); setNuevoReq(''); } }}>
            <input className="input" value={nuevoReq} onChange={(e) => setNuevoReq(e.target.value)} placeholder="Ej: Aprobar 2 parciales con 6+" />
            <button className="btn" type="submit" aria-label="Agregar requisito"><Plus size={16} /></button>
          </form>
        </div>

        <div className="card">
          <div className="card-head"><h3>Apuntes</h3></div>
          <textarea className="textarea" style={{ minHeight: 150 }} value={apuntes} onChange={(e) => setApuntes(e.target.value)}
            onBlur={() => apuntes !== (p.apuntes ?? '') && setMateria(id, { apuntes })}
            placeholder="Horarios de consulta, nombre del profe, links del campus, cosas para no olvidar…" />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Entregas y evaluaciones</h3>
          <button className="btn sm primary" onClick={() => onOpenItem({ materiaId: id })}><Plus size={14} /> Agregar</button>
        </div>
        {a.items.length === 0 && <div className="empty small">Todavía no cargaste entregas para esta materia.</div>}

        <div className="stack">
          {grupos.map((g) => {
            const its = a.items.filter((i) => i.grupo === g).sort(ordenFecha);
            const hechos = its.filter(itemHecho).length;
            const primeroPend = its.findIndex((i) => !itemHecho(i));
            return (
              <div key={g} className="group-box">
                <div className="row between">
                  <div style={{ fontWeight: 600 }}>🧩 {g}</div>
                  <span className="tiny muted">{hechos}/{its.length} etapas</span>
                </div>
                <div className="stepper">
                  {its.map((i, idx) => <i key={i.id} title={`${i.titulo}${i.fecha ? ' · ' + fechaCorta(i.fecha) : ''}`} className={itemHecho(i) ? 'done' : idx === primeroPend ? 'cur' : ''} />)}
                </div>
                {its.map((i) => <ItemRow key={i.id} item={i} onOpen={onOpenItem} showMateria={false} />)}
                <button className="btn ghost sm" style={{ marginTop: 6 }} onClick={() => onOpenItem({ materiaId: id, grupo: g, tipo: 'entrega' })}><Plus size={14} /> Etapa</button>
              </div>
            );
          })}
          {sueltos.length > 0 && <div>{sueltos.map((i) => <ItemRow key={i.id} item={i} onOpen={onOpenItem} showMateria={false} />)}</div>}
        </div>
      </div>
    </div>
  );
}
