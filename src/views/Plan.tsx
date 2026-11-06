import { useState } from 'react';
import { Lock, Unlock, CheckCircle2 } from 'lucide-react';
import { ESTADOS_MATERIA, PLAN, TFI, materiaById } from '../data/plan';
import { disponibilidad, disponibilidadTFI, prog, resumenCarrera, tieneAprobada } from '../lib/logic';
import { useStore } from '../store';
import type { EstadoMateria, Materia } from '../types';
import { Bar, hueStyle } from '../components/ui';

type Filtro = 'todas' | 'disponibles' | 'cursando' | 'faltan' | 'aprobadas';
const CORTO: Record<EstadoMateria, string> = {
  pendiente: '—', cursando: 'Cursando', regular: 'Regular', aprobada: 'Aprobada', promocionada: 'Promo', equivalencia: 'Equiv.',
};

export function Plan({ onOpenMateria }: { onOpenMateria: (id: number) => void }) {
  const { datos } = useStore();
  const [filtro, setFiltro] = useState<Filtro>('faltan');
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

  const aprobadasConNota = PLAN.filter((m) => tieneAprobada(datos, m.id));

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1>Plan de estudios</h1>
          <p className="muted">Marcá el estado de cada materia. Las correlativas se calculan solas.</p>
        </div>
        <div className="seg">
          {([['faltan', 'Me faltan'], ['disponibles', 'Disponibles'], ['cursando', 'Cursando'], ['aprobadas', 'Aprobadas'], ['todas', 'Todas']] as [Filtro, string][]).map(([v, l]) => (
            <button key={v} className={filtro === v ? 'on' : ''} onClick={() => setFiltro(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="row between wrap" style={{ marginBottom: 10 }}>
          <span><b>{r.aprobadas}</b> aprobadas · <b>{r.regulares}</b> regulares · <b>{r.cursando.length}</b> cursando · <b>{r.total - r.aprobadas - r.regulares - r.cursando.length}</b> sin empezar</span>
          <span className="serif" style={{ fontSize: 22 }}>{r.pct}%</span>
        </div>
        <Bar pct={r.pct} />
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
                  {ms.map((m) => <PlanCard key={m.id} m={m} onOpen={onOpenMateria} />)}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="grid g-2 section">
        <div className="card">
          <div className="card-head"><h2>Trabajo Final Integrador</h2><span className="pill">{tfi.ok ? 'Habilitado 🎉' : 'En camino'}</span></div>
          <div className="stack">
            <div>
              <div className="row between small"><span>Cursadas requeridas</span><span className="muted">{TFI.cursar.length - tfi.faltaCursar.length}/{TFI.cursar.length}</span></div>
              <Bar pct={((TFI.cursar.length - tfi.faltaCursar.length) / TFI.cursar.length) * 100} />
              {tfi.faltaCursar.length > 0 && <p className="tiny muted" style={{ marginTop: 6 }}>Falta cursar: {tfi.faltaCursar.map((id) => materiaById(id)?.nombre).join(', ')}</p>}
            </div>
            <div>
              <div className="row between small"><span>Aprobadas requeridas</span><span className="muted">{TFI.aprobar.length - tfi.faltaAprobar.length}/{TFI.aprobar.length}</span></div>
              <Bar pct={((TFI.aprobar.length - tfi.faltaAprobar.length) / TFI.aprobar.length) * 100} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Notas finales</h2><span className="serif" style={{ fontSize: 22 }}>{r.promedio?.toFixed(2) ?? '—'}</span></div>
          {aprobadasConNota.length === 0 ? <p className="muted small">Cuando apruebes materias, sus notas aparecen acá.</p> : (
            <div className="tbl-wrap">
              <table className="tbl">
                <tbody>
                  {aprobadasConNota.map((m) => {
                    const p = prog(datos, m.id);
                    return (
                      <tr key={m.id}>
                        <td><span className="dot" style={{ ...hueStyle(m.hue), display: 'inline-block', marginRight: 8 }} />{m.nombre}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>{p.estado === 'equivalencia' ? <span className="muted tiny">equiv.</span> : p.nota ?? <span className="muted">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="tiny muted" style={{ marginTop: 8 }}>Las equivalencias no cuentan para el promedio.</p>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ m, onOpen }: { m: Materia; onOpen: (id: number) => void }) {
  const { datos, setMateria } = useStore();
  const p = prog(datos, m.id);
  const disp = disponibilidad(datos, m);
  const aprobada = tieneAprobada(datos, m.id);
  const nombres = (ids: number[]) => ids.map((id) => materiaById(id)?.corto).join(', ');

  return (
    <div className={`plan-card ${!disp.ok && p.estado === 'pendiente' ? 'locked' : ''} ${aprobada ? 'aprobada' : ''}`} style={hueStyle(m.hue)}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="row tiny muted" style={{ gap: 6 }}><span className="dot" />#{m.id}</div>
          <button onClick={() => p.estado === 'cursando' && onOpen(m.id)}
            style={{ background: 'none', border: 0, padding: 0, fontWeight: 600, fontSize: 15, textAlign: 'left', cursor: p.estado === 'cursando' ? 'pointer' : 'default' }}>
            {m.nombre}
          </button>
          <div className="tiny" style={{ marginTop: 2 }}>
            {aprobada ? (
              <span className="row" style={{ gap: 4, color: 'var(--ok)' }}><CheckCircle2 size={13} /> {p.estado === 'equivalencia' ? 'Por equivalencia' : `Aprobada${p.nota ? ` con ${p.nota}` : ''}`}</span>
            ) : p.estado === 'cursando' ? (
              <span style={{ color: 'var(--accent)' }}>Cursando ahora · tocá el nombre para ver el detalle</span>
            ) : p.estado === 'regular' ? (
              <span style={{ color: 'var(--warn)' }}>Regular · falta rendir final</span>
            ) : disp.ok ? (
              <span className="row" style={{ gap: 4, color: 'var(--accent)' }}><Unlock size={12} /> Podés cursarla</span>
            ) : (
              <span className="row muted" style={{ gap: 4, alignItems: 'flex-start' }}>
                <Lock size={12} style={{ marginTop: 3, flex: 'none' }} />
                <span>
                  {disp.faltaCursar.length > 0 && <>Cursar: {nombres(disp.faltaCursar)}. </>}
                  {disp.faltaAprobar.length > 0 && <>Aprobar: {nombres(disp.faltaAprobar)}.</>}
                </span>
              </span>
            )}
          </div>
        </div>
        {(p.estado === 'aprobada' || p.estado === 'promocionada') && (
          <input className="input nota-input" type="number" min="1" max="10" step="0.5" placeholder="Nota" aria-label="Nota final"
            value={p.nota ?? ''} onChange={(e) => setMateria(m.id, { nota: e.target.value === '' ? undefined : Number(e.target.value) })} />
        )}
      </div>
      <div className="seg" style={{ marginTop: 10 }}>
        {ESTADOS_MATERIA.map((e) => (
          <button key={e.value} className={p.estado === e.value ? 'on' : ''} title={e.label}
            onClick={() => setMateria(m.id, { estado: e.value })}>
            {CORTO[e.value]}
          </button>
        ))}
      </div>
    </div>
  );
}
