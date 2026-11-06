# mi carrera ✦ — tracker TUPaD UTN

Tracker personal de la Tecnicatura Universitaria en Programación a Distancia (UTN):
correlativas, materias en curso, requisitos de aprobación, entregas por etapas, coloquios y calendario.
Los datos se guardan en el navegador (localStorage). Desde **Datos** se hacen respaldos en JSON.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/ para subir a Vercel, Netlify, GitHub Pages…
```

## Pantallas

- **Inicio**: avance de la carrera, promedio, próxima entrega, atrasadas, lo que viene en 3 semanas y camino al TFI.
- **Cursada**: por materia, cómo se aprueba (parciales, TPI, entregas, coloquio, final, promoción), checklist de requisitos, entregas agrupadas por proyecto con barra de etapas y apuntes.
- **Calendario**: vista mensual + exportación `.ics` para Google Calendar.
- **Plan**: estado de las 17 materias, correlativas calculadas, TFI y notas finales. Por defecto oculta las aprobadas.
- **Datos**: importar CSV, exportar, respaldo/restauración.

## Formato CSV

Un solo archivo con todo. Cada fila es **una materia o una entrega**:
si la columna `titulo` está vacía, la fila carga el estado de la materia; si tiene título, es una entrega.
Se acepta `,` o `;` como separador (Excel en español usa `;`), las columnas pueden ir en cualquier orden
y las que no se usan pueden faltar.

```
materia,titulo,tipo,fecha,estado,nota,grupo,descripcion,modalidad,requisitos,periodo,apuntes,link
```

- `materia`: nombre completo, abreviatura (`prog 3`, `BD II`) o número del plan (`9`).

**Filas de materia** (sin `titulo`)

- `estado`: pendiente, cursando, regular, aprobada, promocionada, equivalencia
- `modalidad`: parciales, tpi, entregas, coloquio, final, promocion (varios separados por `|`)
- `requisitos`: varios separados por `|`

**Filas de entrega** (con `titulo`)

- `tipo`: tp, tpi, entrega, parcial, recuperatorio, coloquio, final, cuestionario, otro
- `estado`: pendiente, en curso, entregado, aprobado, desaprobado
- `fecha`: `2026-11-20` o `20/11/2026` (o `20/11`, se asume el año actual)
- `grupo`: mismo texto en varias filas = un trabajo con varias entregas (se muestra con barra de etapas)

La plantilla se descarga desde la pantalla **Datos**, y **Exportar** genera un archivo en este mismo formato.
