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

Se acepta `,` o `;` como separador (Excel en español usa `;`). La columna `materia` acepta
nombre completo, abreviatura (`prog 3`, `BD II`) o número del plan (`9`).

**Entregas** — `materia, tipo, titulo, fecha, estado, nota, grupo, descripcion, link`

- `tipo`: tp, tpi, entrega, parcial, recuperatorio, coloquio, final, cuestionario, otro
- `estado`: pendiente, en curso, entregado, aprobado, desaprobado
- `fecha`: `2026-11-20` o `20/11/2026` (o `20/11`, se asume el año actual)
- `grupo`: mismo texto en varias filas = un trabajo con varias entregas (se muestra con barra de etapas)

**Materias** — `materia, estado, nota, modalidad, periodo, requisitos`

- `estado`: pendiente, cursando, regular, aprobada, promocionada, equivalencia
- `modalidad` y `requisitos`: varios valores separados por `|`

Las plantillas se descargan desde la pantalla **Datos**.
