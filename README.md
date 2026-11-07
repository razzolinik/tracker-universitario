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

- **Inicio**: avance de la carrera, promedio, próxima entrega, atrasadas, lo que viene en 3 semanas, fechas del cuatrimestre y camino al TFI. Las materias que podés cursar después aparecen recién cuando faltan 3 semanas para el cierre o se acerca la inscripción.
- **Cursada**: por materia, cronograma ordenado por fecha (con marca de hoy y lo ya hecho plegado), cómo vas, notas parciales, condiciones y apuntes.
- **Ventana de materia** (botón *Editar materia* o tocando una materia en el Plan): estado, nota final, y evaluaciones que se agregan con un toque (+ Parcial, + TP, + Recuperatorio…), se editan en la misma fila y se borran con confirmación.
- **Calendario**: vista mensual + exportación `.ics` para Google Calendar.
- **Plan**: Trabajo Final y notas finales arriba; debajo las 17 materias con sus correlativas.
- **Datos**: importar CSV, exportar, respaldo/restauración.

## Recuperatorios

Son opcionales: no cuentan para el avance ni aparecen como atrasados. Si se vinculan a la evaluación que recuperan,
desaparecen cuando esa evaluación sale aprobada y pasan a ser obligatorios si sale desaprobada.

## Formato CSV

Un solo archivo con todo. Se acepta `,` o `;` como separador (Excel en español usa `;`), las columnas pueden ir
en cualquier orden y las que no se usan pueden faltar.

```
materia,titulo,tipo,desde,fecha,estado,nota,recupera,opcional,grupo,descripcion,modalidad,requisitos,periodo,apuntes,link
```

- `materia`: nombre completo, abreviatura (`prog 3`, `BD II`) o número del plan (`9`).

**Filas de materia** (sin `titulo`)

- `estado`: pendiente, cursando, regular, aprobada, promocionada, equivalencia
- `nota`: nota final · `requisitos`: condiciones extra separadas por `|` · `apuntes`: un renglón por idea · `link`: aula del campus
- `modalidad` (opcional): parciales, tpi, entregas, coloquio, final, promocion (varios separados por `|`)

**Filas de evaluación** (con `titulo`)

- `tipo`: parcial, tp, tpi, entrega, cuestionario, coloquio, recuperatorio, final, otro
- `estado`: pendiente, en curso, entregado, aprobado, desaprobado
- `fecha`: límite o día del examen (`2026-11-20`, `20/11/2026` o `20/11`) · `desde`: cuándo abre, para ventanas de entrega
- `recupera`: título de la evaluación que recupera (`Parcial 2`) · `opcional`: `no` para que un recuperatorio cuente siempre
- `grupo`: mismo texto en varias filas = un trabajo con varias entregas (se muestra con barra de etapas)

**Filas del cuatrimestre**

- `materia` = `cuatrimestre`, `titulo` = `inicio`, `fin`, `inscripcion` o `proximo`, con su `fecha`. El nombre va en `periodo`.

La plantilla se descarga desde la pantalla **Datos**, y **Exportar** genera un archivo en este mismo formato.
