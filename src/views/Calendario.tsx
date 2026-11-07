import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Plus } from 'lucide-react';
import { materiaById, tipoInfo } from '../data/plan';
import { capitalizar, fechaLarga, hoyISO, itemHecho, rolItem, toISO } from '../lib/logic';
import { descargar } from '../lib/csv';
import { useStore } from '../store';
import type { Datos, Item } from '../types';
import { ItemRow, hueStyle } from '../components/ui';

const DOW = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const icsTxt = (s: string) => s.replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c);

function ics(d: Datos) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//tracker-tupad//ES', 'CALSCALE:GREGORIAN'];
  for (const i of d.items) {
    const rol = rolItem(d, i);
    if (!i.fecha || rol === 'innecesario') continue;
    const dt = i.fecha.replace(/-/g, '');
    const m = materiaById(i.materiaId);
    const extra = rol === 'opcional' ? ' (si hace falta)' : '';
    lines.push(
      'BEGIN:VEVENT',
      `UID:${i.id}@tracker-tupad`,
      `DTSTART;VALUE=DATE:${dt}`,
      `SUMMARY:${icsTxt(`${tipoInfo(i.tipo).emoji} ${m?.corto ?? ''} — ${i.titulo}${extra}`)}`,
      `DESCRIPTION:${icsTxt(i.descripcion ?? '')}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function Calendario({ onOpenItem }: { onOpenItem: (i: Partial<Item>) => void }) {
  const { datos } = useStore();
  const hoy = hoyISO();
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState(hoy);

  // Los recuperatorios que ya no hacen falta no ocupan lugar en el calendario.
  const visible = (i: Item) => rolItem(datos, i) !== 'innecesario';
  const porFecha = datos.items.reduce<Record<string, Item[]>>((acc, i) => {
    if (i.fecha && visible(i)) (acc[i.fecha] ??= []).push(i);
    return acc;
  }, {});
  const abren = datos.items.reduce<Record<string, Item[]>>((acc, i) => {
    if (i.desde && i.desde !== i.fecha && !itemHecho(i) && visible(i)) (acc[i.desde] ??= []).push(i);
    return acc;
  }, {});

  const inicio = new Date(mes);
  inicio.setDate(1 - ((mes.getDay() + 6) % 7));
  const dias = Array.from({ length: 42 }, (_, k) => { const d = new Date(inicio); d.setDate(inicio.getDate() + k); return d; });
  const titulo = capitalizar(new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(mes));
  const delDia = porFecha[sel] ?? [];
  const abrenDia = abren[sel] ?? [];
  const mover = (n: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1));

  return (
    <div className="fade-in">
      <div className="page-head">
        <div><h1>Calendario</h1><p className="muted">Todas tus fechas de entrega, parciales y coloquios. Los recuperatorios aparecen punteados.</p></div>
        <button className="btn" onClick={() => descargar('entregas-tupad.ics', ics(datos), 'text/calendar;charset=utf-8')} title="Importalo en Google Calendar">
          <Download size={16} /> Exportar a Google Calendar (.ics)
        </button>
      </div>
      <div className="grid g-cal">
        <div className="card">
          <div className="card-head">
            <h2>{titulo}</h2>
            <div className="row">
              <button className="btn sm ghost" onClick={() => { const d = new Date(); setMes(new Date(d.getFullYear(), d.getMonth(), 1)); setSel(hoy); }}>Hoy</button>
              <button className="icon-btn" onClick={() => mover(-1)} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
              <button className="icon-btn" onClick={() => mover(1)} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="cal">
            {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
            {dias.map((d) => {
              const iso = toISO(d);
              const evs = porFecha[iso] ?? [];
              const nAbren = abren[iso]?.length ?? 0;
              return (
                <button key={iso} onClick={() => setSel(iso)}
                  className={`cal-cell ${d.getMonth() !== mes.getMonth() ? 'out' : ''} ${iso === hoy ? 'today' : ''} ${iso === sel ? 'sel' : ''}`}>
                  <span className="n">{d.getDate()}</span>
                  <div className="cal-evs">
                    {evs.slice(0, 3).map((i) => (
                      <span key={i.id} className={`cal-ev ${itemHecho(i) ? 'done' : ''} ${rolItem(datos, i) === 'opcional' ? 'opt' : ''}`} style={hueStyle(materiaById(i.materiaId)?.hue ?? 0)}>
                        {materiaById(i.materiaId)?.corto} · {i.titulo}
                      </span>
                    ))}
                    {evs.length > 3 && <span className="tiny muted">+{evs.length - 3}</span>}
                    {nAbren > 0 && <span className="cal-abre" title="Ese día abre una entrega">↗ abre{nAbren > 1 ? ` ${nAbren}` : ''}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-head">
            <h3>{fechaLarga(sel)}</h3>
            <button className="btn sm" onClick={() => onOpenItem({ fecha: sel })}><Plus size={14} /> Agregar</button>
          </div>
          {delDia.length === 0 && abrenDia.length === 0 && <div className="empty small"><div className="big">☁️</div>Día libre.</div>}
          {delDia.map((i) => <ItemRow key={i.id} item={i} onOpen={onOpenItem} showFecha={false} />)}
          {abrenDia.length > 0 && (
            <div style={{ marginTop: delDia.length ? 14 : 0 }}>
              <div className="tiny muted" style={{ marginBottom: 6 }}>Abren este día</div>
              {abrenDia.map((i) => <ItemRow key={i.id} item={i} onOpen={onOpenItem} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
