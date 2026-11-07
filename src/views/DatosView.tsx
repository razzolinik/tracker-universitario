import { useRef, useState } from 'react';
import { Download, FileUp, RotateCcw, Upload, FileJson, ClipboardPaste } from 'lucide-react';
import { materiaById, tipoInfo } from '../data/plan';
import {
  COLUMNAS, PLANTILLA, descargar, exportarTodo, importarCSV, type ImportResult,
} from '../lib/csv';
import { fechaCorta, hoyISO, rangoFechas } from '../lib/logic';
import { VACIO, datosEjemplo, useStore } from '../store';
import { MateriaChip, toast } from '../components/ui';

const EJEMPLO_PEGAR = [
  'materia,titulo,tipo,fecha,estado,recupera',
  'Programación III,Parcial 2,parcial,2026-11-12,pendiente,',
  'Programación III,Recuperatorio Parcial 2,recuperatorio,2026-11-26,pendiente,Parcial 2',
].join('\n');

export function DatosView() {
  const { datos, aplicarImport, reemplazarTodo } = useStore();
  const [res, setRes] = useState<ImportResult | null>(null);
  const [modo, setModo] = useState<'agregar' | 'reemplazar'>('agregar');
  const [over, setOver] = useState(false);
  const [pegado, setPegado] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  const leer = async (f: File) => {
    const text = await f.text();
    if (f.name.toLowerCase().endsWith('.json')) return restaurar(text);
    setRes(importarCSV(text));
  };

  const restaurar = (text: string) => {
    try {
      const d = JSON.parse(text.replace(/^﻿/, ''));
      if (d?.version !== 2) throw new Error();
      reemplazarTodo({ ...VACIO, ...d });
      toast('Respaldo restaurado ✓');
    } catch {
      toast('Ese archivo no es un respaldo válido');
    }
  };

  const confirmar = () => {
    if (!res) return;
    aplicarImport(res, modo);
    toast(`Importado: ${res.filas} filas ✓`);
    setRes(null);
    setPegado('');
  };

  return (
    <div className="fade-in">
      <div className="page-head">
        <div><h1>Datos</h1><p className="muted">Importá desde CSV (Excel / Google Sheets), exportá y hacé respaldos.</p></div>
      </div>

      <div className="grid g-2">
        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head"><h2>Importar CSV</h2></div>
            <div
              className={`drop ${over ? 'over' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) leer(f); }}
            >
              <FileUp size={30} color="var(--accent)" />
              <p style={{ marginTop: 8, fontWeight: 600 }}>Arrastrá un .csv acá o hacé clic</p>
              <p className="tiny muted">Un solo archivo con materias, evaluaciones y fechas del cuatrimestre. Acepta coma o punto y coma.</p>
              <input ref={fileRef} type="file" accept=".csv,.txt,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) leer(f); e.target.value = ''; }} />
            </div>
            <details style={{ marginTop: 12 }}>
              <summary className="small" style={{ cursor: 'pointer' }}><ClipboardPaste size={14} style={{ verticalAlign: -2 }} /> O pegá el texto directamente</summary>
              <textarea className="textarea" style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12 }} value={pegado} onChange={(e) => setPegado(e.target.value)}
                placeholder={EJEMPLO_PEGAR} />
              <button className="btn sm" style={{ marginTop: 8 }} disabled={!pegado.trim()} onClick={() => setRes(importarCSV(pegado))}>Previsualizar</button>
            </details>
          </div>

          {res && (
            <div className="card fade-in">
              <div className="card-head">
                <h3>Vista previa · {Object.keys(res.materias).length} materias · {res.items.length} evaluaciones</h3>
                <span className="pill">{res.filas} filas</span>
              </div>
              {res.errores.length > 0 && (
                <div className="err-list" style={{ marginBottom: 12 }}>{res.errores.map((e, i) => <div key={i}>⚠ {e}</div>)}</div>
              )}
              {res.cuatri && (
                <p className="small" style={{ marginBottom: 10 }}>
                  🗓️ <b>{res.cuatri.nombre ?? 'Cuatrimestre'}</b>
                  {res.cuatri.inicio && <> · empieza {fechaCorta(res.cuatri.inicio)}</>}
                  {res.cuatri.fin && <> · termina {fechaCorta(res.cuatri.fin)}</>}
                  {res.cuatri.inscripcion && <> · inscripción {fechaCorta(res.cuatri.inscripcion)}</>}
                </p>
              )}
              {res.items.length > 0 && (
                <div className="tbl-wrap" style={{ maxHeight: 280, overflow: 'auto' }}>
                  <table className="tbl">
                    <thead><tr><th>Materia</th><th>Qué</th><th>Fecha</th><th>Grupo</th></tr></thead>
                    <tbody>
                      {res.items.map((i) => (
                        <tr key={i.id}>
                          <td><MateriaChip id={i.materiaId} /></td>
                          <td>{tipoInfo(i.tipo).emoji} {i.titulo}{i.opcional && <span className="tag tag-opt" style={{ marginLeft: 6 }}>opcional</span>}</td>
                          <td className="mono" style={{ whiteSpace: 'nowrap' }}>{i.fecha ? rangoFechas(i.desde, i.fecha) : '—'}</td>
                          <td className="muted">{i.grupo ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {Object.keys(res.materias).length > 0 && (
                <div className="tbl-wrap" style={{ maxHeight: 280, overflow: 'auto' }}>
                  <table className="tbl">
                    <thead><tr><th>Materia</th><th>Estado</th><th>Nota</th><th>Cond.</th></tr></thead>
                    <tbody>
                      {Object.entries(res.materias).map(([id, p]) => (
                        <tr key={id}>
                          <td>{materiaById(Number(id))?.nombre}</td>
                          <td>{p.estado ?? '—'}</td>
                          <td>{p.nota ?? ''}</td>
                          <td>{res.requisitos.filter((r) => r.materiaId === Number(id)).length || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {res.filas > 0 && (
                <div className="row between wrap" style={{ marginTop: 14 }}>
                  <div>
                    <div className="seg">
                      <button className={modo === 'agregar' ? 'on' : ''} onClick={() => setModo('agregar')}>Agregar</button>
                      <button className={modo === 'reemplazar' ? 'on' : ''} onClick={() => setModo('reemplazar')}>Reemplazar esas materias</button>
                    </div>
                    <p className="tiny muted" style={{ marginTop: 4 }}>
                      {modo === 'agregar' ? 'Suma las filas nuevas y saltea las que ya tenés (mismo título en la misma materia).' : 'Borra las evaluaciones y condiciones actuales de las materias del archivo y deja las del CSV.'}
                    </p>
                  </div>
                  <div className="row">
                    <button className="btn ghost" onClick={() => setRes(null)}>Cancelar</button>
                    <button className="btn primary" onClick={confirmar}><Upload size={16} /> Importar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="card">
            <div className="card-head"><h2>Formato</h2></div>
            <p className="small muted" style={{ marginBottom: 10 }}>
              Un solo archivo con todo. Las columnas pueden ir en cualquier orden y las que no uses pueden faltar.
            </p>
            <pre className="code">{COLUMNAS.join(',')}</pre>
            <div className="formato">
              <div><b>Materia</b> (fila sin <code>titulo</code>): <code>estado</code> pendiente · cursando · regular · aprobada · promocionada · equivalencia; <code>nota</code> final; <code>requisitos</code> separados por <code>|</code>; <code>apuntes</code>; <code>link</code> del aula.</div>
              <div><b>Evaluación</b> (fila con <code>titulo</code>): <code>tipo</code> parcial · tp · tpi · entrega · cuestionario · coloquio · recuperatorio · final · otro; <code>estado</code> pendiente · en curso · entregado · aprobado · desaprobado; <code>desde</code> + <code>fecha</code> para ventanas (abre el 2, cierra el 12); <code>grupo</code> para las etapas de un mismo trabajo.</div>
              <div><b>Recuperatorios</b>: con <code>tipo</code> recuperatorio ya son opcionales. En <code>recupera</code> va el título de la evaluación (“Parcial 2”): si sale aprobada, el recuperatorio deja de aparecer en los avisos; si sale desaprobada, pasa a ser obligatorio. Poné <code>opcional</code> = no para que cuente siempre.</div>
              <div><b>Cuatrimestre</b>: <code>materia</code> = cuatrimestre, <code>titulo</code> = inicio · fin · inscripcion · proximo, con su <code>fecha</code>. El nombre va en <code>periodo</code>.</div>
              <div><code>materia</code> acepta el nombre (“Programación III”, “prog 3”), la abreviatura (“BD II”) o el número del plan (“9”). Fechas: 2026-11-20, 20/11/2026 o 20/11.</div>
            </div>
            <div className="row wrap" style={{ marginTop: 14 }}>
              <button className="btn sm" onClick={() => descargar('plantilla-tracker.csv', PLANTILLA)}><Download size={14} /> Descargar plantilla</button>
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head"><h2>Exportar</h2></div>
            <div className="stack">
              <button className="btn" onClick={() => descargar(`tracker-${hoyISO()}.csv`, exportarTodo(datos))}><Download size={16} /> Todo en un CSV · {datos.items.length} evaluaciones</button>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Respaldo</h2></div>
            <p className="small muted" style={{ marginBottom: 12 }}>Tus datos viven solo en este navegador. Bajá un respaldo de vez en cuando, o para pasarlos a otra compu.</p>
            <div className="stack">
              <button className="btn" onClick={() => descargar(`tracker-respaldo-${hoyISO()}.json`, JSON.stringify(datos, null, 2), 'application/json')}><FileJson size={16} /> Descargar respaldo</button>
              <button className="btn" onClick={() => jsonRef.current?.click()}><Upload size={16} /> Restaurar respaldo</button>
              <input ref={jsonRef} type="file" accept=".json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) restaurar(await f.text()); e.target.value = ''; }} />
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Empezar de nuevo</h2></div>
            <div className="stack">
              <button className="btn" onClick={() => { if (confirm('¿Reemplazar todo con datos de ejemplo?')) { reemplazarTodo(datosEjemplo()); toast('Datos de ejemplo cargados'); } }}>✨ Cargar datos de ejemplo</button>
              <button className="btn danger" onClick={() => { if (confirm('¿Borrar todos tus datos? Bajate un respaldo antes si querés.')) { reemplazarTodo(VACIO); toast('Todo limpio'); } }}><RotateCcw size={16} /> Borrar todo</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
