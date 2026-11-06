import { AlertTriangle, CalendarClock, GraduationCap, Plus, Sparkles, Star, BookOpen } from 'lucide-react';
import { PLAN, labelModalidad, materiaById } from '../data/plan';
import {
  avanceMateria, diasHasta, disponibilidadTFI, fechaCorta, itemHecho, parseISO, prog, resumenCarrera, textoRelativo,
} from '../lib/logic';
import { datosEjemplo, useStore } from '../store';
import type { Item } from '../types';
import { Bar, ItemRow, MateriaChip, Ring, hueStyle, toast } from '../components/ui';

interface Props {
  onOpenItem: (i: Partial<Item>) => void;
  onOpenMateria: (id: number) => void;
  irA: (v: 'plan' | 'datos' | 'calendario') => void;
}

const saludo = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
};

export function Inicio({ onOpenItem, onOpenMateria, irA }: Props) {
  const { datos, reemplazarTodo } = useStore();
  const r = resumenCarrera(datos);
  const tfi = disponibilidadTFI(datos);
  const cursandoIds = new Set(r.cursando.map((m) => m.id));

  const pendientes = datos.items.filter((i) => !itemHecho(i) && i.estado !== 'desaprobado' && i.fecha);
  const vencidas = pendientes.filter((i) => diasHasta(i.fecha!) < 0).sort((a, b) => (a.fecha! < b.fecha! ? -1 : 1));
  const proximas = pendientes
    .filter((i) => diasHasta(i.fecha!) >= 0 && diasHasta(i.fecha!) <= 21)
    .sort((a, b) => (a.fecha! < b.fecha! ? -1 : 1));
  const proxima = proximas[0];
  const semana = proximas.filter((i) => diasHasta(i.fecha!) <= 7).length;

  const porDia = proximas.reduce<Record<string, Item[]>>((acc, i) => {
    (acc[i.fecha!] ??= []).push(i);
    return acc;
  }, {});

  const vacio = Object.keys(datos.materias).length === 0 && datos.items.length === 0;
  const tfiPct = Math.round(((r.aprobadas) / PLAN.length) * 100);

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="muted small">{new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</div>
          <h1>{saludo()} 🌿</h1>
          <p className="muted">
            {r.cursando.length
              ? <>Estás cursando <b>{r.cursando.length}</b> materias · <b>{semana}</b> {semana === 1 ? 'cosa' : 'cosas'} para esta semana.</>
              : 'Marcá qué estás cursando y cargá tus entregas para ver todo acá.'}
          </p>
        </div>
        <button className="btn primary" onClick={() => onOpenItem({})}><Plus size={16} /> Nueva entrega</button>
      </div>

      {vacio && (
        <div className="card fade-in" style={{ marginBottom: 20 }}>
          <div className="row wrap between">
            <div className="row" style={{ gap: 14 }}>
              <Sparkles size={28} color="var(--accent)" />
              <div>
                <h3>Empecemos</h3>
                <p className="muted small">Marcá tus materias en <b>Plan</b>, importá un CSV en <b>Datos</b>, o mirá cómo queda con datos de ejemplo.</p>
              </div>
            </div>
            <div className="row wrap">
              <button className="btn" onClick={() => irA('plan')}>Ir al plan</button>
              <button className="btn" onClick={() => irA('datos')}>Importar CSV</button>
              <button className="btn primary" onClick={() => { reemplazarTodo(datosEjemplo()); toast('Datos de ejemplo cargados'); }}>Ver ejemplo</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid g-stats">
        <div className="card stat">
          <div className="row between">
            <div>
              <div className="label"><GraduationCap size={15} /> Carrera</div>
              <div className="value">{r.pct}%</div>
            </div>
            <Ring pct={r.pct} size={58} label={<span className="tiny">{r.aprobadas}/{r.total}</span>} />
          </div>
          <div className="sub">{r.aprobadas} aprobadas · {r.regulares} regulares</div>
        </div>
        <div className="card stat">
          <div className="label"><Star size={15} /> Promedio</div>
          <div className="value">{r.promedio !== undefined ? r.promedio.toFixed(2) : '—'}</div>
          <div className="sub">{r.conNota} {r.conNota === 1 ? 'materia' : 'materias'} con nota</div>
        </div>
        <div className="card stat">
          <div className="label"><CalendarClock size={15} /> Próxima</div>
          <div className="value" style={{ fontSize: proxima ? 26 : 34 }}>{proxima ? textoRelativo(proxima.fecha!) : '—'}</div>
          <div className="sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {proxima ? `${materiaById(proxima.materiaId)?.corto} · ${proxima.titulo}` : 'Nada en las próximas 3 semanas'}
          </div>
        </div>
        <div className="card stat">
          <div className="label"><BookOpen size={15} /> Trabajo Final</div>
          <div className="value">{tfiPct}%</div>
          <div className="sub">{tfi.ok ? '¡Listo para el TFI! 🎉' : `Faltan ${tfi.faltaAprobar.length} por aprobar`}</div>
        </div>
      </div>

      {vencidas.length > 0 && (
        <div className="card section" style={{ borderColor: 'color-mix(in srgb, var(--danger) 45%, var(--border))' }}>
          <div className="card-head">
            <h3 className="row u-vencida"><AlertTriangle size={18} /> Atrasadas ({vencidas.length})</h3>
            <span className="muted tiny">Marcalas como entregadas o cambiales la fecha</span>
          </div>
          {vencidas.map((i) => <ItemRow key={i.id} item={i} onOpen={onOpenItem} />)}
        </div>
      )}

      <div className="grid g-2 section">
        <div className="card">
          <div className="card-head">
            <h2>Lo que viene</h2>
            <button className="btn ghost sm" onClick={() => irA('calendario')}>Ver calendario</button>
          </div>
          {proximas.length === 0 ? (
            <div className="empty"><div className="big">🍃</div>Nada en las próximas 3 semanas.</div>
          ) : (
            <div className="timeline">
              {Object.entries(porDia).map(([fecha, items]) => {
                const d = parseISO(fecha);
                return (
                  <div className="tl-day" key={fecha}>
                    <div className="tl-date">
                      <div className="d">{d.getDate()}</div>
                      <div className="m">{fechaCorta(fecha).split(' ')[1]}</div>
                      <div className="tiny muted">{textoRelativo(fecha)}</div>
                    </div>
                    <div>{items.map((i) => <ItemRow key={i.id} item={i} onOpen={onOpenItem} showFecha={false} />)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head"><h2>Cursando</h2></div>
            {r.cursando.length === 0 ? (
              <div className="empty small">No marcaste materias como “cursando” todavía.<br />
                <button className="btn sm" style={{ marginTop: 10 }} onClick={() => irA('plan')}>Ir al plan</button>
              </div>
            ) : (
              <div className="stack" style={{ gap: 14 }}>
                {r.cursando.map((m) => {
                  const a = avanceMateria(datos, m.id);
                  const p = prog(datos, m.id);
                  return (
                    <button key={m.id} className="row" style={{ ...hueStyle(m.hue), background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => onOpenMateria(m.id)}>
                      <Ring pct={a.pct} size={46} stroke={4} color={`hsl(${m.hue} 55% 60%)`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{m.nombre}</div>
                        <div className="tiny muted">
                          {p.modalidad.length ? p.modalidad.map(labelModalidad).join(' · ') : 'Sin modalidad cargada'}
                          {a.proximo && <> · próx. <span className="mono">{fechaCorta(a.proximo.fecha!)}</span></>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {r.disponibles.length > 0 && (
            <div className="card">
              <div className="card-head"><h3>Podés cursar</h3><span className="pill">{r.disponibles.length}</span></div>
              <div className="row wrap" style={{ gap: 6 }}>
                {r.disponibles.filter((m) => !cursandoIds.has(m.id)).map((m) => <MateriaChip key={m.id} id={m.id} corto={false} />)}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-head"><h3>Camino al TFI</h3><span className="muted tiny">{r.aprobadas}/{PLAN.length}</span></div>
            <Bar pct={tfiPct} />
            <p className="tiny muted" style={{ marginTop: 8 }}>
              {tfi.faltaCursar.length > 0 && <>Para inscribirte falta cursar: {tfi.faltaCursar.map((id) => materiaById(id)?.corto).join(', ')}.<br /></>}
              {tfi.faltaAprobar.length > 0 ? `Para presentarlo: aprobar ${tfi.faltaAprobar.length} materias más.` : 'Todas las materias aprobadas ✓'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
