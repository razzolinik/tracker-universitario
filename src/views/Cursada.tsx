import { Fragment, useState } from 'react';
import { Check, ExternalLink, Pencil, Plus } from 'lucide-react';
import { PLAN, labelEstadoItem, labelEstadoMateria, tipoInfo } from '../data/plan';
import {
  avanceMateria, capitalizar, diaSemana, diasHasta, fechaCorta, hoyISO, itemHecho, ordenFecha, parseISO, prog,
  recusDe, resumenEvaluaciones, rolItem, textoRelativo, urgencia,
} from '../lib/logic';
import { useStore } from '../store';
import type { Datos, Item } from '../types';
import { Apuntes, Bar, Ring, RolTag, hueStyle } from '../components/ui';

interface Props {
  materiaId?: number;
  setMateriaId: (id: number) => void;
  onOpenItem: (i: Partial<Item>) => void;
  onFicha: (id: number, tab?: 'eval' | 'aprobar' | 'apuntes') => void;
  irA: (v: 'plan') => void;
}

export function Cursada({ materiaId, setMateriaId, onOpenItem, onFicha, irA }: Props) {
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
        <div><h1>Cursada</h1><p className="muted">Fechas, avance y apuntes de cada materia.</p></div>
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
                  <div className="tiny muted">
                    {a.proximo ? <>Próx.: {diaSemana(a.proximo.fecha!)} {fechaCorta(a.proximo.fecha!)}</> : `${a.itemsHechos}/${a.obligatorias.length} listas`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <Detalle key={actual.id} id={actual.id} onOpenItem={onOpenItem} onFicha={onFicha} />
      </div>
    </div>
  );
}

function Detalle({ id, onOpenItem, onFicha }: { id: number; onOpenItem: (i: Partial<Item>) => void; onFicha: Props['onFicha'] }) {
  const { datos, toggleRequisito } = useStore();
  const m = PLAN.find((x) => x.id === id)!;
  const p = prog(datos, id);
  const a = avanceMateria(datos, id);
  const notas = a.items.filter((i) => i.nota !== undefined && i.tipo !== 'recuperatorio');
  const grupos = [...new Set(a.items.filter((i) => i.grupo).map((i) => i.grupo!))];
  const resumen = resumenEvaluaciones(a.items);

  return (
    <div className="stack" style={{ gap: 16, ...hueStyle(m.hue) }}>
      <div className="card mat-card" style={{ cursor: 'default' }}>
        <div className="row between wrap" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 16, minWidth: 0 }}>
            <Ring pct={a.pct} size={72} stroke={6} color={`hsl(${m.hue} 55% 60%)`} />
            <div style={{ minWidth: 0 }}>
              <div className="tiny muted">#{m.id} · Nivel {m.nivel}{p.periodo ? ` · ${p.periodo}` : ''}</div>
              <h2>{m.nombre}</h2>
              <div className="row wrap tiny" style={{ gap: 8, marginTop: 4 }}>
                <span className="chip">{labelEstadoMateria(p.estado)}</span>
                {resumen && <span className="muted">{resumen}</span>}
              </div>
            </div>
          </div>
          <div className="row wrap">
            {p.link && <a className="btn" href={p.link} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Campus</a>}
            <button className="btn primary" onClick={() => onFicha(id)}><Pencil size={15} /> Editar materia</button>
          </div>
        </div>
        {a.proximo && (
          <div className="proximo">
            <span className="tiny muted">Lo próximo</span>
            <span><b>{a.proximo.titulo}</b> · {diaSemana(a.proximo.fecha!)} {fechaCorta(a.proximo.fecha!)} <span className={`u-${urgencia(a.proximo) ?? 'tranqui'}`}>({textoRelativo(a.proximo.fecha!)})</span></span>
          </div>
        )}
      </div>

      <div className="grid g-2">
        <div className="card">
          <div className="card-head">
            <h3>Cronograma</h3>
            <button className="btn sm" onClick={() => onFicha(id, 'eval')}><Plus size={14} /> Cargar</button>
          </div>
          <Cronograma datos={datos} items={a.items} onOpen={onOpenItem} vacio={() => onFicha(id, 'eval')} />
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head"><h3>Cómo vas</h3><span className="pill">{a.itemsHechos + a.reqsOk}/{a.total}</span></div>
            <Bar pct={a.pct} color={`hsl(${m.hue} 55% 60%)`} />
            <p className="tiny muted" style={{ marginTop: 6 }}>
              {a.total ? `${a.itemsHechos} de ${a.obligatorias.length} evaluaciones listas${a.reqs.length ? ` · ${a.reqsOk} de ${a.reqs.length} condiciones` : ''}. Los recuperatorios no cuentan salvo que hagan falta.` : 'Cargá las evaluaciones para ver tu avance.'}
            </p>

            {notas.length > 0 && (
              <div className="notas">
                {notas.map((i) => (
                  <span key={i.id} className={`nota-chip st-${i.estado}`} title={i.titulo}>
                    <span className="muted">{i.titulo.length > 22 ? i.titulo.slice(0, 21) + '…' : i.titulo}</span> <b>{i.nota}</b>
                  </span>
                ))}
              </div>
            )}

            {grupos.map((g) => {
              const its = a.items.filter((i) => i.grupo === g && !i.opcional).sort(ordenFecha);
              const hechos = its.filter(itemHecho).length;
              const cur = its.findIndex((i) => !itemHecho(i));
              return (
                <div key={g} style={{ marginTop: 14 }}>
                  <div className="row between small"><span>🧩 {g}</span><span className="muted tiny">{hechos}/{its.length} etapas</span></div>
                  <div className="stepper">
                    {its.map((i, idx) => <i key={i.id} title={i.titulo} className={itemHecho(i) ? 'done' : idx === cur ? 'cur' : ''} />)}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 14 }}>
              <div className="row between" style={{ marginBottom: 4 }}>
                <span className="small" style={{ fontWeight: 600 }}>Condiciones</span>
                <button className="btn ghost sm" onClick={() => onFicha(id, 'aprobar')}><Pencil size={13} /> Editar</button>
              </div>
              {a.reqs.length === 0 ? (
                <p className="tiny muted">Sin condiciones extra. Agregá las que pida la cátedra (asistencia, nota mínima…).</p>
              ) : a.reqs.map((r) => (
                <button key={r.id} className={`cond ${r.cumplido ? 'done' : ''}`} onClick={() => toggleRequisito(r.id)}>
                  <span className={`check ${r.cumplido ? 'on' : ''}`}>{r.cumplido && <Check size={13} strokeWidth={3} />}</span>
                  <span>{r.texto}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Apuntes</h3>
              <button className="btn ghost sm" onClick={() => onFicha(id, 'apuntes')}><Pencil size={13} /> Editar</button>
            </div>
            {p.apuntes ? <Apuntes text={p.apuntes} /> : <p className="tiny muted">Tutora, horarios de consulta, cómo se entrega, lo que no te querés olvidar…</p>}
            {p.link && <a className="small row" style={{ gap: 6, marginTop: 10 }} href={p.link} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir el aula del campus</a>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Lista cronológica por mes, con una marca de "hoy". Los recuperatorios van debajo de lo que recuperan. */
function Cronograma({ datos, items, onOpen, vacio }: { datos: Datos; items: Item[]; onOpen: (i: Item) => void; vacio: () => void }) {
  const hoy = hoyISO();
  const [verTodo, setVerTodo] = useState(false);
  // Un recuperatorio que ya hace falta se muestra como una fecha más; los demás van debajo de su evaluación.
  const visibles = items
    .filter((i) => !(i.recuperaA && items.some((x) => x.id === i.recuperaA) && rolItem(datos, i) !== 'necesario'))
    .sort(ordenFecha);
  // Lo que ya pasó y está hecho se esconde para que arriba quede lo que viene.
  const viejo = (i: Item) => !!i.fecha && i.fecha < hoy && (itemHecho(i) || i.estado === 'desaprobado');
  const ocultos = visibles.filter(viejo).length;
  const mostrar = verTodo ? visibles : visibles.filter((i) => !viejo(i));
  if (!visibles.length) {
    return <div className="empty small"><div className="big">🗓️</div>No hay fechas cargadas.<br /><button className="btn sm" style={{ marginTop: 10 }} onClick={vacio}>Cargar evaluaciones</button></div>;
  }
  let mes = '';
  let hoyPuesto = false;
  return (
    <div className="crono-list">
      {ocultos > 0 && (
        <button className="btn ghost sm" style={{ alignSelf: 'flex-start', marginBottom: 6 }} onClick={() => setVerTodo(!verTodo)}>
          {verTodo ? 'Ocultar lo anterior' : `Ver lo anterior (${ocultos} ya ${ocultos === 1 ? 'hecha' : 'hechas'})`}
        </button>
      )}
      {mostrar.map((i) => {
        const m = i.fecha ? capitalizar(new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(parseISO(i.fecha))) : 'Sin fecha';
        const cabecera = m !== mes ? m : null;
        mes = m;
        const marcaHoy = !hoyPuesto && i.fecha && i.fecha >= hoy;
        if (marcaHoy) hoyPuesto = true;
        return (
          <Fragment key={i.id}>
            {cabecera && <div className="crono-mes">{cabecera}</div>}
            {marcaHoy && <div className="crono-hoy"><span>hoy · {fechaCorta(hoy)}</span></div>}
            <CronoItem datos={datos} item={i} onOpen={onOpen} />
          </Fragment>
        );
      })}
      {!hoyPuesto && <div className="crono-hoy"><span>hoy · {fechaCorta(hoy)}</span></div>}
    </div>
  );
}

function CronoItem({ datos, item, onOpen }: { datos: Datos; item: Item; onOpen: (i: Item) => void }) {
  const { upsertItem } = useStore();
  const hecho = itemHecho(item);
  const pasado = !!item.fecha && diasHasta(item.fecha) < 0;
  const u = urgencia(item);
  const recus = recusDe(datos, item).filter((r) => rolItem(datos, r) !== 'necesario');
  const abreEn = item.desde && !hecho && diasHasta(item.desde) > 0;
  return (
    <div className={`crono ${hecho ? 'done' : ''} ${pasado ? 'past' : ''}`}>
      <div className="crono-date">
        {item.fecha ? <><span className="dow">{diaSemana(item.fecha)}</span><span className="d">{parseISO(item.fecha).getDate()}</span></> : <span className="dow">—</span>}
      </div>
      <div className="crono-body" onClick={() => onOpen(item)}>
        <div className="crono-tit">{tipoInfo(item.tipo).emoji} {item.titulo}</div>
        <div className="row wrap tiny" style={{ gap: 8 }}>
          <span className="muted">{tipoInfo(item.tipo).label}</span>
          {item.grupo && <span className="muted">· {item.grupo}</span>}
          {item.estado !== 'pendiente' && <span className={`st-${item.estado}`}>{labelEstadoItem(item.estado)}{item.nota !== undefined ? ` · ${item.nota}` : ''}</span>}
          {item.desde && <span className="muted">{abreEn ? 'abre' : 'abrió'} el {fechaCorta(item.desde)}</span>}
          {u && u !== 'tranqui' && <span className={`u-${u}`}>{textoRelativo(item.fecha!)}</span>}
          <RolTag rol={rolItem(datos, item)} />
        </div>
        {recus.map((r) => (
          <div key={r.id} className={`crono-recu tiny ${rolItem(datos, r) === 'innecesario' ? 'skip' : ''}`} onClick={(e) => { e.stopPropagation(); onOpen(r); }}>
            🔁 <span>{r.titulo}</span>
            {r.fecha && <span className="mono">{r.desde ? `${fechaCorta(r.desde)} → ` : ''}{fechaCorta(r.fecha)}</span>}
            <RolTag rol={rolItem(datos, r)} />
          </div>
        ))}
      </div>
      <button className={`check ${hecho ? 'on' : ''}`} aria-label={hecho ? 'Marcar como pendiente' : 'Marcar como entregado'}
        onClick={() => upsertItem({ ...item, estado: hecho ? 'pendiente' : 'entregado' })}>
        {hecho && <Check size={14} strokeWidth={3} />}
      </button>
    </div>
  );
}
