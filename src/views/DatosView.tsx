import { useRef, useState } from 'react';
import { Download, FileUp, RotateCcw, Upload, FileJson, ClipboardPaste } from 'lucide-react';
import { materiaById, tipoInfo } from '../data/plan';
import {
  PLANTILLA_ENTREGAS, PLANTILLA_MATERIAS, descargar, exportarEntregas, exportarMaterias, importarCSV, type ImportResult,
} from '../lib/csv';
import { fechaCorta, hoyISO } from '../lib/logic';
import { VACIO, datosEjemplo, useStore } from '../store';
import { MateriaChip, toast } from '../components/ui';

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
    toast(`Importado: ${res.items.length || Object.keys(res.materias).length} filas ✓`);
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
              <p className="tiny muted">Detecto solo si es de entregas o de materias. Acepta coma o punto y coma.</p>
              <input ref={fileRef} type="file" accept=".csv,.txt,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) leer(f); e.target.value = ''; }} />
            </div>
            <details style={{ marginTop: 12 }}>
              <summary className="small" style={{ cursor: 'pointer' }}><ClipboardPaste size={14} style={{ verticalAlign: -2 }} /> O pegá el texto directamente</summary>
              <textarea className="textarea" style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12 }} value={pegado} onChange={(e) => setPegado(e.target.value)}
                placeholder={'materia,tipo,titulo,fecha,estado\nProgramación III,entrega,Entrega 1,2026-11-20,pendiente'} />
              <button className="btn sm" style={{ marginTop: 8 }} disabled={!pegado.trim()} onClick={() => setRes(importarCSV(pegado))}>Previsualizar</button>
            </details>
          </div>

          {res && (
            <div className="card fade-in">
              <div className="card-head">
                <h3>Vista previa · {res.tipo === 'entregas' ? 'Entregas' : res.tipo === 'materias' ? 'Materias' : '¿?'}</h3>
                <span className="pill">{res.filas} filas</span>
              </div>
              {res.errores.length > 0 && (
                <div className="err-list" style={{ marginBottom: 12 }}>{res.errores.map((e, i) => <div key={i}>⚠ {e}</div>)}</div>
              )}
              {res.tipo === 'entregas' && (
                <div className="tbl-wrap" style={{ maxHeight: 280, overflow: 'auto' }}>
                  <table className="tbl">
                    <thead><tr><th>Materia</th><th>Qué</th><th>Fecha</th><th>Grupo</th></tr></thead>
                    <tbody>
                      {res.items.map((i) => (
                        <tr key={i.id}>
                          <td><MateriaChip id={i.materiaId} /></td>
                          <td>{tipoInfo(i.tipo).emoji} {i.titulo}</td>
                          <td className="mono">{i.fecha ? fechaCorta(i.fecha) : '—'}</td>
                          <td className="muted">{i.grupo ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {res.tipo === 'materias' && (
                <div className="tbl-wrap" style={{ maxHeight: 280, overflow: 'auto' }}>
                  <table className="tbl">
                    <thead><tr><th>Materia</th><th>Estado</th><th>Nota</th><th>Modalidad</th><th>Req.</th></tr></thead>
                    <tbody>
                      {Object.entries(res.materias).map(([id, p]) => (
                        <tr key={id}>
                          <td>{materiaById(Number(id))?.nombre}</td>
                          <td>{p.estado ?? '—'}</td>
                          <td>{p.nota ?? ''}</td>
                          <td className="muted">{p.modalidad?.join(', ')}</td>
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
                      {modo === 'agregar' ? 'Suma las filas nuevas y saltea las que ya tenés (mismo título en la misma materia).' : 'Borra las entregas/requisitos actuales de las materias del archivo y deja las del CSV.'}
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
              Dos tipos de archivo. La columna <b>materia</b> acepta el nombre (“Programación III”, “prog 3”), la abreviatura (“BD II”) o el número (“9”).
            </p>
            <h3 style={{ fontSize: 15, marginBottom: 6 }}>📦 Entregas</h3>
            <pre className="code">{`materia, tipo, titulo, fecha, estado, nota, grupo, descripcion, link`}</pre>
            <p className="tiny muted" style={{ margin: '6px 0 12px' }}>
              <b>tipo</b>: tp · tpi · entrega · parcial · recuperatorio · coloquio · final · cuestionario · otro<br />
              <b>estado</b>: pendiente · en curso · entregado · aprobado · desaprobado<br />
              <b>fecha</b>: 2026-11-20 o 20/11/2026 · <b>grupo</b>: mismo nombre para las etapas de un trabajo con varias entregas
            </p>
            <h3 style={{ fontSize: 15, marginBottom: 6 }}>📚 Materias</h3>
            <pre className="code">{`materia, estado, nota, modalidad, periodo, requisitos`}</pre>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              <b>estado</b>: pendiente · cursando · regular · aprobada · promocionada · equivalencia<br />
              <b>modalidad</b> y <b>requisitos</b>: varios separados por <code>|</code> — ej. <code>entregas|coloquio</code>
            </p>
            <div className="row wrap" style={{ marginTop: 14 }}>
              <button className="btn sm" onClick={() => descargar('plantilla-entregas.csv', PLANTILLA_ENTREGAS)}><Download size={14} /> Plantilla entregas</button>
              <button className="btn sm" onClick={() => descargar('plantilla-materias.csv', PLANTILLA_MATERIAS)}><Download size={14} /> Plantilla materias</button>
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head"><h2>Exportar</h2></div>
            <div className="stack">
              <button className="btn" onClick={() => descargar(`entregas-${hoyISO()}.csv`, exportarEntregas(datos))}><Download size={16} /> Entregas (.csv) · {datos.items.length}</button>
              <button className="btn" onClick={() => descargar(`materias-${hoyISO()}.csv`, exportarMaterias(datos))}><Download size={16} /> Materias (.csv)</button>
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
