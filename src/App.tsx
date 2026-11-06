import { useEffect, useState } from 'react';
import { CalendarDays, Database, Home, LayoutGrid, NotebookPen } from 'lucide-react';
import { Inicio } from './views/Inicio';
import { Cursada } from './views/Cursada';
import { Calendario } from './views/Calendario';
import { Plan } from './views/Plan';
import { DatosView } from './views/DatosView';
import { ItemForm, type ItemDraft } from './components/ItemForm';
import { Toaster } from './components/ui';
import { useStore } from './store';
import { diasHasta, itemHecho } from './lib/logic';

type Vista = 'inicio' | 'cursada' | 'calendario' | 'plan' | 'datos';

const TEMAS = [
  { id: 'bosque', nombre: 'Bosque', a: '#1a241f', b: '#9fd4b3' },
  { id: 'medianoche', nombre: 'Medianoche', a: '#1b1b2b', b: '#c3b5ff' },
  { id: 'crema', nombre: 'Crema', a: '#fffcf7', b: '#c0714f' },
  { id: 'salvia', nombre: 'Salvia', a: '#fbfdfa', b: '#4f8a68' },
  { id: 'lavanda', nombre: 'Lavanda', a: '#fdfcff', b: '#7d62c4' },
];

function ThemePicker({ tema, setTema }: { tema: string; setTema: (t: string) => void }) {
  return (
    <div className="themes" role="radiogroup" aria-label="Tema">
      {TEMAS.map((t) => (
        <button key={t.id} className={`swatch ${tema === t.id ? 'on' : ''}`} title={t.nombre} aria-label={t.nombre} role="radio" aria-checked={tema === t.id} onClick={() => setTema(t.id)}>
          <span style={{ background: `linear-gradient(135deg, ${t.a} 50%, ${t.b} 50%)` }} />
        </button>
      ))}
    </div>
  );
}

const leerVista = (): Vista => {
  const h = location.hash.slice(1) as Vista;
  return ['inicio', 'cursada', 'calendario', 'plan', 'datos'].includes(h) ? h : 'inicio';
};

export default function App() {
  const { datos } = useStore();
  const [vista, setVista] = useState<Vista>(leerVista);
  const [materiaSel, setMateriaSel] = useState<number>();
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [tema, setTema] = useState(() => document.documentElement.dataset.theme ?? 'bosque');
  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try { localStorage.setItem('tupad-theme', tema); } catch { /* sin storage */ }
  }, [tema]);

  useEffect(() => {
    const f = () => setVista(leerVista());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  const irA = (v: Vista) => {
    location.hash = v;
    setVista(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const abrirMateria = (id: number) => { setMateriaSel(id); irA('cursada'); };

  const urgentes = datos.items.filter((i) => !itemHecho(i) && i.estado !== 'desaprobado' && i.fecha && diasHasta(i.fecha) <= 3).length;
  const nav: { v: Vista; label: string; icon: typeof Home; badge?: number }[] = [
    { v: 'inicio', label: 'Inicio', icon: Home, badge: urgentes || undefined },
    { v: 'cursada', label: 'Cursada', icon: NotebookPen },
    { v: 'calendario', label: 'Calendario', icon: CalendarDays },
    { v: 'plan', label: 'Plan', icon: LayoutGrid },
    { v: 'datos', label: 'Datos', icon: Database },
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="tiny">TUPaD · UTN</div>
          <div className="serif">mi carrera ✦</div>
        </div>
        {nav.map(({ v, label, icon: Icon, badge }) => (
          <button key={v} className={`nav-btn ${vista === v ? 'active' : ''}`} onClick={() => irA(v)}>
            <Icon size={18} /> {label} {badge ? <span className="badge" title="Entregas en los próximos 3 días o atrasadas">{badge}</span> : null}
          </button>
        ))}
        <div className="sidebar-foot">
          <div className="tiny muted">Tema</div>
          <ThemePicker tema={tema} setTema={setTema} />
          <div className="tiny muted">Tus datos viven solo en este navegador 🌿</div>
        </div>
      </aside>

      <main className="main">
        <div className="mobile-only row between" style={{ marginBottom: 16 }}>
          <div className="serif" style={{ fontSize: 20, fontStyle: 'italic', fontWeight: 400 }}>mi carrera ✦</div>
          <ThemePicker tema={tema} setTema={setTema} />
        </div>
        {vista === 'inicio' && <Inicio onOpenItem={setDraft} onOpenMateria={abrirMateria} irA={irA} />}
        {vista === 'cursada' && <Cursada materiaId={materiaSel} setMateriaId={setMateriaSel} onOpenItem={setDraft} irA={irA} />}
        {vista === 'calendario' && <Calendario onOpenItem={setDraft} />}
        {vista === 'plan' && <Plan onOpenMateria={abrirMateria} />}
        {vista === 'datos' && <DatosView />}
      </main>

      <nav className="tabbar">
        {nav.map(({ v, label, icon: Icon }) => (
          <button key={v} className={vista === v ? 'active' : ''} onClick={() => irA(v)}>
            <Icon size={20} /> {label}
          </button>
        ))}
      </nav>

      {draft && <ItemForm inicial={draft} onClose={() => setDraft(null)} />}
      <Toaster />
    </div>
  );
}
