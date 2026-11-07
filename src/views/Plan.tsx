import { useState } from 'react';
import { Lock, Unlock, CheckCircle2, ChevronRight } from 'lucide-react';
import { PLAN, TFI, labelEstadoMateria, materiaById } from '../data/plan';
import { disponibilidad, disponibilidadTFI, prog, resumenCarrera, tieneAprobada, tieneCursada } from '../lib/logic';
import { useStore } from '../store';
import type { Materia } from '../types';
import { Bar, MateriaChip, Ring, hueStyle } from '../components/ui';

type Filtro = 'todas' | 'disponibles' | 'cursando' | 'faltan' | 'aprobadas';

export function Plan({ onFicha }: { onFicha: (id: number) => void }) {
  const { datos } = useStore();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const r = resumenCarrera(datos);
  const tfi = disponibilidadTFI(datos);

  const pasa = (m: Materia) => {
    const p = prog(datos, m.id);
    switch (filtro) {
      case 'disponibles': return p.estado === 'pendiente' && disponibilidad(datos, m).ok;
      case 'cursando': return p.estado === 'cursando';
      case 'faltan': return !tieneAprobada(datos, m.id);
      case 'aprobadas': return tieneAprobada(datos, m.id);
      default: return true;
    }
  };

  const aprobadas = PLAN.filter((m) => tieneAprobada(datos, m.id));
  const conNota = aprobadas.filter((m) => prog(datos, m.id).estado !== 'equivalencia');
  const equiv = aprobadas.filter((m) => prog(datos, m.id).estado === 'equivalencia');
  const faltanTFI = tfi.faltaAprobar.length;
  const cursadasTFI = TFI.cursar.filter((id) => tieneCursada(datos, id)).length;

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1>Plan de estudios</h1>
          <p className="muted">Tocá una materia para cambiar su estado, su nota o cargarle evaluaciones.</p>
        </div>
      </div>

      <div className="grid g-2">
        <div className="card tfi-card">
          <div className="row" style={{ gap: 18, alignItems: 'center' }}>
            <Ring pct={r.pct} size={96} stroke={8} label={<span className="serif" style={{ fontSize: 22 }}>{r.pct}%</span>} />
            <div style={{ minWidth: 0 }}>
              <div className="tiny muted">Trabajo Final Integrador</div>
              <h2>{tfi.ok ? '¡Ya podés presentarlo! 🎉' : faltanTFI === 1 ? 'Te falta 1 materia' : `Te faltan ${faltanTFI} materias`}</h2>
              <p className="small muted" style={{ marginTop: 4 }}>
                {r.aprobadas} de {r.total} aprobadas · {r.cursando.length} cursando ahora
              </p>
            </div>
          </div>
          <div className="stack" style={{ marginTop: 16, gap: 12 }}>
            <div>
              <div className="row between small"><span>Para inscribirte: cursadas obligatorias</span><span className="muted">{cursadasTFI}/{TFI.cursar.length}</span></div>
              <Bar pct={(cursadasTFI / TFI.cursar.length) * 100} />
              {tfi.faltaCursar.length > 0 && (
                <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>{tfi.faltaCursar.map((id) => <MateriaChip key={id} id={id} />)}</div>
              )}
            </div>
            <div>
              <div className="row between small"><span>Para presentarlo: todas aprobadas</span><span className="muted">{TFI.aprobar.length - faltanTFI}/{TFI.aprobar.length}</span></div>
              <Bar pct={((TFI.aprobar.length - faltanTFI) / TFI.aprobar.length) * 100} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Notas finales</h2>
            <div style={{ textAlign: 'right' }}>
              <div className="serif" style={{ fontSize: 26, lineHeight: 1 }}>{r.promedio?.toFixed(2) ?? '—'}</div>
              <div className="tiny muted">promedio</div>
            </div>
          </div>
          {aprobadas.length === 0 ? <p className="muted small">Cuando apruebes materias, sus notas aparecen acá.</p> : (
            <div className="stack" style={{ gap: 8 }}>
              {conNota.map((m) => {
                const n = prog(datos, m.id).nota;
                return (
                  <button key={m.id} className="nota-row" style={hueStyle(m.hue)} onClick={() => onFicha(m.id)}>
                    <span className="dot" />
                    <span className="grow">{m.nombre}</span>
                    <span className="nota-bar"><i style={{ width: `${((n ?? 0) / 10) * 100}%` }} /></span>
                    <b className="mono" style={{ width: 28, textAlign: 'right' }}>{n ?? '—'}</b>
                  </button>
                );
              })}
              {equiv.length > 0 && (
                <div className="tiny muted" style={{ marginTop: 4 }}>
                  Por equivalencia (no cuentan para el promedio): {equiv.map((m) => m.corto).join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="row between wrap section" style={{ gap: 12 }}>
        <span className="small"><b>{r.aprobadas}</b> aprobadas · <b>{r.regulares}</b> regulares · <b>{r.cursando.length}</b> cursando · <b>{r.total - r.aprobadas - r.regulares - r.cursando.length}</b> sin empezar</span>
        <div className="seg">
          {([['todas', 'Todas'], ['faltan', 'Me faltan'], ['disponibles', 'Disponibles'], ['cursando', 'Cursando'], ['aprobadas', 'Aprobadas']] as [Filtro, string][]).map(([v, l]) => (
            <button key={v} className={filtro === v ? 'on' : ''} onClick={() => setFiltro(v)}>{l}</button>
          ))}
        </div>
      </div>

      {[1, 2].map((nivel) => {
        const cols = [1, 2].map((c) => PLAN.filter((m) => m.nivel === nivel && m.cuatri === c && pasa(m)));
        if (!cols[0].length && !cols[1].length) return null;
        return (
          <div key={nivel} className="plan-level">
            <h2 style={{ marginBottom: 12 }}>Nivel {nivel}</h2>
            <div className="plan-cols">
              {cols.map((ms, idx) => (
                <div key={idx} className="plan-col">
                  <h3>{idx + 1}º cuatrimestre</h3>
                  {ms.length === 0 && <p className="muted small">Nada por acá con este filtro ✓</p>}
                  {ms.map((m) => <PlanCard key={m.id} m={m} onOpen={onFicha} />)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlanCard({ m, onOpen }: { m: Materia; onOpen: (id: number) => void }) {
  const { datos } = useStore();
  const p = prog(datos, m.id);
  const disp = disponibilidad(datos, m);
  const aprobada = tieneAprobada(datos, m.id);
  const nombres = (ids: number[]) => ids.map((id) => materiaById(id)?.corto).join(', ');

  return (
    <button className={`plan-card ${!disp.ok && p.estado === 'pendiente' ? 'locked' : ''} ${aprobada ? 'aprobada' : ''} ${p.estado === 'cursando' ? 'cursando' : ''}`}
      style={hueStyle(m.hue)} onClick={() => onOpen(m.id)}>
      <span className="dot" />
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="plan-nombre">{m.nombre}</span>
        <span className="tiny plan-sub">
          {aprobada ? (
            <span className="row" style={{ gap: 4, color: 'var(--ok)' }}><CheckCircle2 size={13} /> {p.estado === 'equivalencia' ? 'Por equivalencia' : labelEstadoMateria(p.estado)}{p.periodo ? ` · ${p.periodo}` : ''}</span>
          ) : p.estado === 'cursando' ? (
            <span style={{ color: 'var(--accent)' }}>Cursando ahora</span>
          ) : p.estado === 'regular' ? (
            <span style={{ color: 'var(--warn)' }}>Regular · falta rendir el final</span>
          ) : disp.ok ? (
            <span className="row" style={{ gap: 4, color: 'var(--accent)' }}><Unlock size={12} /> Podés cursarla</span>
          ) : (
            <span className="row muted" style={{ gap: 4, alignItems: 'flex-start' }}>
              <Lock size={12} style={{ marginTop: 3, flex: 'none' }} />
              <span>
                {disp.faltaCursar.length > 0 && <>Cursar {nombres(disp.faltaCursar)}. </>}
                {disp.faltaAprobar.length > 0 && <>Aprobar {nombres(disp.faltaAprobar)}.</>}
              </span>
            </span>
          )}
        </span>
      </span>
      {(p.estado === 'aprobada' || p.estado === 'promocionada') && <span className="nota-badge">{p.nota ?? '—'}</span>}
      <ChevronRight size={16} className="muted" style={{ flex: 'none' }} />
    </button>
  );
}
