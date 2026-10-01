# Contexto — Módulo KPIs + Documentación ISO

> Versión condensada (2026-10-01): el historial sesión por sesión del diseño y la migración se
> borró a propósito — todo lo que describía ya está implementado y validado, así que ese
> relato ya no aporta nada y solo ocupaba contexto. Lo que queda abajo es el estado actual y lo
> genuinamente pendiente. Esta copia y la del frontend deben mantenerse iguales.

## Qué es

Empresa: Excellence Chemical S.A.C. Reemplaza la gestión manual en Google Drive de los
indicadores (KPIs) y la documentación del Sistema de Gestión de Calidad (ISO) por un módulo
propio dentro de este mismo sistema, con permisos reales por carpeta y descarga/impresión
controlada. Vive sobre el mismo backend/schema que el resto (`Carpeta`, `Archivo`,
`AccesoIndicador`, `AccesoISO`), no es un servicio aparte.

Estructura de carpetas por año (`KPIs-SGC/2026/...`): `INDICADORES` con 8 procesos (mensual,
trimestral o semestral según el proceso, cada período con subcarpetas RI = Reporte de Indicador
y DS = Data de Sustento) + `ISO-SGC-2026` (plana, PDF/Word/Excel/PowerPoint juntos, con una
subcarpeta `Obsoleto`). Los años siguientes se clonan con el mismo esquema.

## Modelo de permisos (implementado, backend + frontend)

Reemplazó niveles fijos (`LECTURA`/`ESCRITURA`) por **5 booleanos independientes** por recurso:
`puedeVer`, `puedeDescargar`, `puedeAdjuntar`, `puedeEditar`, `puedeEliminar`. Dos tablas
separadas a propósito (no un `AccesoDocumento` genérico): `AccesoIndicador` (por
`usuarioId` + `proceso`) y `AccesoISO` (por `usuarioId`, con un booleano extra
`gestionaObsoleto`). Se mantienen separadas porque ISO ya necesita columnas propias que
Indicadores no tiene y la spec es un catálogo cerrado — si aparece un tercer ámbito real se
generaliza recién ahí.

Rol `esAdminKpis` (booleano en `Usuario`): gestiona accesos de otros en KPIs/ISO exclusivamente
— **no da acceso propio al contenido**, igual que cualquier usuario necesita que le asignen sus
propios accesos. `esAdmin` general sí tiene bypass total de contenido y además puede gestionar
accesos.

Reglas duras (código, no solo UI — el backend las valida igual, nunca solo el frontend):
- Un PDF dentro de ISO **nunca** se puede eliminar salvo por `esAdmin`, aunque el usuario tenga
  `puedeEliminar=true` — son los documentos oficiales vigentes de calidad, a diferencia de
  Word/Excel que suelen ser borradores.
- Dentro de ISO, `puedeVer=true` alcanza para ver PDF; Word/Excel/PowerPoint exigen además
  `puedeEditar=true`.
- Ninguna acción de eliminar procede si `puedeVerArchivo()` da `false` para ese archivo (se
  chequea visibilidad antes que la regla dura de PDF y antes del flag `puedeEliminar`).
- `gestionaObsoleto` sigue siendo un único flag que acopla ver+editar la carpeta Obsoleto — no
  se desglosó en los 5 booleanos porque es de uso poco frecuente.
- `esAdminKpis` tiene su propia vista reducida de usuarios (`GET /usuarios/lista-basica`: id,
  nombre, avatar) en vez del `GET /usuarios` completo, que expone permisos de otros módulos.

Estado: **implementado y validado end-to-end en ambos repos** (unit tests + prueba manual por
HTTP de las reglas de arriba). El sidebar oculta "KPIs/ISO" si el usuario no tiene `puedeVer` en
ningún proceso ni en ISO; dentro de una carpeta cada botón se muestra/oculta por su flag.

## Datos de producción a tener en cuenta

Hay un PDF fixture de prueba subido a la raíz de ISO-SGC-2026 (`fixture-visor-iso.pdf`) que
sirve para validar el visor de PDF de ISO con un usuario que solo tiene `puedeVer` (sin
`puedeDescargar`) — **no borrarlo** sin antes confirmar que no se necesita más, porque hoy es el
único archivo que cubre esa rama de prueba.

## Pendiente (genuino, no implementado)

1. **Visor propio de Word/Excel/PowerPoint vs. solo descarga** — sigue sin confirmación de
   Alice. Bloquea cualquier trabajo de visor más allá del de PDF (que ya existe, fase 1).
2. **Fase 2 del visor de PDF**: bloquear clic derecho / Ctrl+P / Ctrl+S en el visor ya existente.
3. **Endpoint de transferencia/clonado de documentos al crear un año nuevo** (ej. 2027) — el
   seed del árbol de carpetas ya es idempotente y toma el año de una constante, así que está
   listo para reusarse, pero el endpoint de clonado en sí no está escrito.
4. **Naming exacto de las subcarpetas trimestrales/semestrales** — sigue como placeholder en el
   seed, pendiente de confirmar con Alice.

Ninguno de los 4 bloquea el uso normal del módulo (permisos, subir/ver/descargar/eliminar ya
funcionan) — son mejoras o decisiones de producto todavía abiertas.
