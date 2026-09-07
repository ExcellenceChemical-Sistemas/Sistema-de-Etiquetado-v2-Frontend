# Contexto — Fase 3: Módulo KPIs + Documentación ISO (estado de avance)

> Continúa a `contexto-fase3-kpis-iso.md` (especificación funcional original, ya aprobada por Alice). Este documento es el estado de **implementación**: qué está hecho, qué falta, y qué archivos hacen falta para seguir en otro chat si es necesario.
>
> **Actualizado tras una novena sesión de chat** — reemplaza a la versión anterior. La séptima sesión definió el rediseño del modelo de permisos (sección 1.1). La octava dejó 6 recomendaciones de arquitectura (sección 1.2), de las cuales ya se cerró el punto 1 (tablas separadas). Esta novena sesión cerró la **duda #1 de la sección 1.1** (regla dura de PDFs en ISO) y arrancó la conexión de este contexto a **Claude Code** (backend ya enlazado vía `CLAUDE.md`; falta el frontend). **Sigue sin escribirse código real de este rediseño** — todo lo de esta y las sesiones anteriores es diseño/decisión, no implementación. Todo lo marcado como "resuelto/confirmado funcionando" en secciones anteriores sigue vigente tal cual.

---

## 0. Dónde vive esto

- Empresa: Excellence Chemical S.A.C. (código de documento asociado: QA-FMT-06).
- Fase 3 del roadmap consolidado. Reemplaza la gestión manual en Google Drive por una app propia, con control real de permisos e impresión/descarga.
- Se implementa **sobre el mismo backend** del proyecto de etiquetado ("Sistema de Etiquetado v2"): NestJS + Prisma + Supabase, desplegado en Render. Mismo `schema.prisma`, mismo sistema de permisos granulares (`Usuario`, `Permiso`, enum `Recurso`) que se **extiende**, no se reemplaza.
- Frontend: Nuxt (mismo proyecto del etiquetado), autenticación vía Supabase Auth, `AppSidebar.vue` compartido.
- **Método de trabajo confirmado**: el asistente entrega el código completo (o el diff puntual) y el usuario copia y pega directamente en su repo. El asistente no ejecuta nada contra el backend real ni asume acceso a archivos que no se le suban/peguen explícitamente.
- **Nomenclatura confirmada**: la carpeta real del proyecto es `src/usuario/...` (singular).
- **Claude Code conectado (sesión 9)**: el repo de `backend` (`etiquetadov2/backend`) ya tiene este archivo en su raíz y un `CLAUDE.md` (generado con `/init`) que lo referencia vía `@contexto-fase3-kpis-iso.md`, confirmado leyendo bien el contenido. **Falta hacer lo mismo en el repo de `frontend`** (`etiquetadov2/frontend`): ya tiene el archivo copiado en la raíz, pero todavía no se corrió `/init` ni se enlazó desde su propio `CLAUDE.md`.
- **Patrón real de la vista de admin de usuarios**: `pages/usuarios/index.vue` lista usuarios y abre un dialog, `components/admin/Editarpermisos.vue`, que a su vez usa `components/admin/PermisosGrid.vue` + `utils/permisos.ts` y hace el `PATCH`. No existe (ni hace falta) un `pages/usuarios/[id].vue` como página propia.
- **Jerarquía de permisos (vigente hasta el rediseño de esta sesión)**: el Administrador (`esAdmin: true`) gestiona permisos de todos y ve/edita todo en KPIs/ISO automáticamente (bypass, incluida eliminación de PDFs de ISO). Esto va a convivir con el nuevo rol de Admin de KPIs (ver sección 1.1) una vez implementado.

---

## 1. Especificación funcional original (resumen — ya aprobada por Alice, sin cambios)

### Estructura de carpetas
```
KPIs-SGC
└── 2026
    ├── INDICADORES
    │   ├── 1. INDICADOR-COMERCIAL-MENSUAL       (1.ENERO...12.DICIEMBRE → RI + DS)
    │   ├── 2. INDICADOR-COMPRAS-MENSUAL
    │   ├── 3. INDICADOR-ALMACÉN Y DISTRIBUCIÓN-MENSUAL
    │   ├── 4. INDICADOR-CONTROL DE CALIDAD-MENSUAL
    │   ├── 5. INDICADOR-SGC-TRIMESTRAL          (1er...4to Trimestre → RI + DS)
    │   ├── 6. INDICADOR-DIRECCIÓN Y PLANEAMIENTO-TRIMESTRAL
    │   ├── 7. INDICADOR-RR.HH-SEMESTRAL         (1er/2do Semestre → RI + DS)
    │   └── 8. INDICADOR-SERVICIOS GENERALES-SEMESTRAL
    └── ISO-SGC-2026          ← plana, sin carpetas de proceso
        ├── (PDF, Word, Excel juntos)
        └── Obsoleto/
```
- RI = Reporte de Indicador (1-3 Word). DS = Data de Sustento (1-3 Excel).
- Años siguientes se clonan con el mismo esquema; el selector de transferencia (checkboxes) aplica solo a ISO por ahora, y crea copias independientes, no referencias.

### Pendiente de confirmar con Alice / decidir
- Naming exacto de subcarpetas trimestrales/semestrales (sigue placeholder en el seed).
- Si Word/Excel/PowerPoint necesitan visor en línea propio o alcanza con descarga restringida (hoy solo PDF tiene visor propio).

---

## 1.1 REDISEÑO DE PERMISOS — decidido esta sesión, PENDIENTE DE IMPLEMENTAR

Se reemplaza el modelo anterior de niveles fijos (`LECTURA`/`ESCRITURA`, `VISUALIZACION`/`EDICION_TOTAL`) por un modelo de **5 permisos booleanos independientes** más un rol de gestión nuevo.

### Rol nuevo: Admin de KPIs (`esAdminKpis`)
- Campo booleano nuevo en `Usuario`: `esAdminKpis`. Cualquier usuario puede tenerlo (no es una persona hardcodeada).
- Se encarga **exclusivamente** de gestionar accesos de KPIs y Documentación ISO — no toca permisos normales (Lotes, Productos, etc.), eso sigue siendo del Admin general.
- Es quien decide, por usuario: puede ver / descargar / adjuntar / editar / eliminar, tanto en cada proceso de Indicadores como en ISO.
- **Confirmado explícitamente**: la propia Admin de KPIs NO tiene bypass de contenido — para ver o hacer algo dentro de KPIs/ISO necesita que a ELLA MISMA también se le asignen accesos, igual que a cualquier otro usuario. `esAdminKpis` solo le da la capacidad de gestionar accesos de otros, no acceso propio automático.
- El Admin general (`esAdmin`) sigue con bypass total en contenido de KPIs/ISO (ya implementado y confirmado funcionando en sesión anterior) y además puede gestionar accesos igual que la Admin de KPIs (o incluso asignar/quitar el flag `esAdminKpis` a otros usuarios).

### Permisos granulares (reemplazan a los enums `TipoAccesoIndicador`/`TipoAccesoISO`)
Para cada proceso de Indicadores (`AccesoIndicador`) y para ISO en general (`AccesoISO`), 5 flags independientes:
- `puedeVer`
- `puedeDescargar`
- `puedeAdjuntar`
- `puedeEditar`
- `puedeEliminar`

Ejemplo dado por el usuario para ilustrar la granularidad esperada:
- Edin: `puedeVer=true` en Indicador Comercial, todo lo demás false ahí. En Indicador Calidad: `puedeVer=true` + `puedeEditar=true`.
- ISO: puede haber usuarios que solo vean los PDF (el resto de tipos no se especificó aún cómo se filtra dentro de ISO — ver "Dudas abiertas").

### Tipos de archivo adjuntables (ampliado esta sesión)
`TipoArchivoDocumento` pasa a incluir 4 valores (antes 3): `PDF`, `WORD`, `EXCEL`, `POWERPOINT`.

### Regla de UI confirmada
- Si un usuario no tiene `puedeVer` en ningún proceso de Indicadores ni en ISO → el ítem "KPIs / ISO" del sidebar se oculta por completo.
- Dentro de una carpeta, cada botón (Ver / Descargar / Adjuntar / Eliminar) se muestra u oculta individualmente según el flag correspondiente para esa carpeta.

### Cambios de schema propuestos (redactados, AÚN NO APLICADOS por el usuario — falta correr la migración)

```prisma
model Usuario {
  id                Int       @id @default(autoincrement())
  supabaseUserId    String    @unique
  nombre            String
  esAdmin           Boolean   @default(false)
  esAdminKpis       Boolean   @default(false) // gestiona accesos de KPIs/ISO de otros; no implica acceso propio automático
  avatarUrl         String?
  permisos          Permiso[]
  createdAt         DateTime  @default(now())
  trabajosImpresion TrabajoImpresion[]
  archivosSubidos   Archivo[]
  accesosIndicador  AccesoIndicador[]
  accesoIso         AccesoISO?
}

// TipoAccesoIndicador y TipoAccesoISO quedan obsoletos, se eliminan del schema

model AccesoIndicador {
  id             Int              @id @default(autoincrement())
  usuarioId      Int
  usuario        Usuario          @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  proceso        ProcesoIndicador
  puedeVer       Boolean          @default(false)
  puedeDescargar Boolean          @default(false)
  puedeAdjuntar  Boolean          @default(false)
  puedeEditar    Boolean          @default(false)
  puedeEliminar  Boolean          @default(false)

  @@unique([usuarioId, proceso])
  @@map("accesos_indicador")
}

model AccesoISO {
  id               Int      @id @default(autoincrement())
  usuarioId        Int      @unique
  usuario          Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  puedeVer         Boolean  @default(false)
  puedeDescargar   Boolean  @default(false)
  puedeAdjuntar    Boolean  @default(false)
  puedeEditar      Boolean  @default(false)
  puedeEliminar    Boolean  @default(false)
  gestionaObsoleto Boolean  @default(false) // ver+editar la carpeta Obsoleto (antes hardcodeado "solo Alice")

  @@map("accesos_iso")
}

enum TipoArchivoDocumento {
  PDF
  WORD
  EXCEL
  POWERPOINT
}
```

⚠️ Esto implica una migración real (`npx prisma migrate dev --name accesos_kpis_iso_granulares`) que el usuario debe correr en su entorno — no se ha corrido todavía.

### ✅ Punto 1 — DECIDIDO (sesión 9): se mantiene la regla dura para PDFs de ISO
Con el modelo granular, `puedeEliminar=true` en `AccesoISO` **no alcanza** para borrar un archivo tipo PDF dentro de ISO. Es una regla fija en código, sin excepción, salvo para `esAdmin` (que ya tiene bypass total). Motivo: los PDF de ISO son la versión oficial/vigente de los documentos de calidad (procedimientos, instructivos, formatos ya aprobados), a diferencia de Word/Excel que suelen ser borradores de trabajo — borrar uno por error de un click en el panel de admin es un riesgo real (documentación de auditoría), no un archivo cualquiera. Es la misma lógica que ya se aplicó con `esAdminKpis` sin bypass propio (sección 1.1): no confiar ciegamente en quien administra accesos para acciones irreversibles.

No hace falta un flag nuevo en el schema. Se implementa como una condición explícita en el guard/service, antes de aplicar el flag `puedeEliminar`:
```ts
puedeEliminar(usuario, archivo, carpeta) {
  if (usuario.esAdmin) return true;
  if (carpeta.modulo === 'ISO' && archivo.tipo === 'PDF') return false; // regla dura, sin excepción
  return accesoIso.puedeEliminar; // o accesoIndicador según corresponda
}
```
Esta misma condición tiene que existir **también en el backend** (no solo ocultar el botón en frontend), siguiendo la regla de disciplina de la sección 1.2, punto 2.

### ✅ Punto 2 — DECIDIDO (sesión 9): "solo ver PDFs" en ISO no es un flag nuevo
`puedeVer=true` en `AccesoISO` alcanza para ver los PDF de esa carpeta. Para ver además Word/Excel/PowerPoint hace falta `puedeEditar=true`. No se agrega un 6º flag (`puedeVerSoloPdf`) — es una condición en el mismo check de visibilidad por tipo de archivo, simétrica a la regla dura de PDFs del punto 1: el PDF es el documento oficial ya aprobado (para todos los que tienen acceso), Word/Excel son el borrador de trabajo (solo para quien lo edita).

```ts
puedeVerArchivo(usuario, archivo, accesoIso) {
  if (usuario.esAdmin) return true;
  if (!accesoIso.puedeVer) return false;
  if (archivo.tipo === 'PDF') return true;
  return accesoIso.puedeEditar; // Word/Excel/PowerPoint solo si además edita
}
```

### ✅ Punto 3 — DECIDIDO (sesión 9): `Obsoleto` se deja como está
`gestionaObsoleto` sigue acoplando ver+editar en un solo flag booleano, **no se desglosa** en los 5 permisos del resto de ISO. Es una carpeta de archivo histórico, de uso poco frecuente — no hay caso de negocio real hoy que necesite separar "puede ver lo obsoleto" de "puede gestionarlo". Desglosarlo sería agregar complejidad para un caso sin necesidad real (mismo criterio de la sección 1.2, punto 3: no crear flags de más para casos especiales).

### ✅ Punto 4 — DECIDIDO (sesión 9): `esAdminKpis` tiene una vista reducida de usuarios, no el `GET /usuarios` completo
Se crea un endpoint propio, ej. `GET /usuarios/lista-basica` (protegido por `esAdmin || esAdminKpis`), que devuelve solo lo mínimo para asignar accesos: `id`, `nombre`, `avatarUrl`. El `GET /usuarios` completo (que expone también permisos de otros módulos como Lotes/Productos) sigue exclusivo de `EsAdminGuard` (`esAdmin` únicamente). Motivo: es el mismo principio de acceso mínimo con el que se definió el rol desde el inicio — la Admin de KPIs se encarga *exclusivamente* de KPIs/ISO, no tiene por qué ver permisos de otros módulos.

---

## 1.2 SEGUNDA RONDA DE FEEDBACK — recomendaciones de arquitectura (sesión 8, NADA IMPLEMENTADO)

En esta sesión se revisó el diseño de la sección 1.1 con ojo crítico "de arquitectura general", no de la spec funcional. Son 6 recomendaciones, ninguna aplicada todavía. Ordenadas de mayor a menor impacto:

### ✅ Punto 1 — DECIDIDO esta sesión: se mantienen tablas separadas
Se evaluó unificar `AccesoIndicador` + `AccesoISO` en una tabla genérica `AccesoDocumento` (campo `ambito: String`) vs. mantenerlas separadas como en la sección 1.1. **Decisión: tablas separadas**, por estas razones:
- La spec funcional (sección 1, ya aprobada por Alice) es un catálogo cerrado (8 procesos + ISO); no hay un tercer ámbito real en el roadmap que justifique generalizar ahora.
- ISO ya necesita columnas propias que Indicadores no tiene (`gestionaObsoleto`, y probablemente algo para filtrar por tipo de archivo — ver dudas abiertas #2 y #3 de la sección 1.1). Con una tabla genérica esas columnas quedarían sueltas en las filas de `"INDICADOR:*"`, o igual terminaría apareciendo una segunda tabla para lo específico de ISO.
- `proceso: ProcesoIndicador` (enum) da validación a nivel de base de datos; con `ambito: String` esa validación pasa a vivir en la aplicación (riesgo de typos en seed/frontend).
- El schema de tablas separadas ya está escrito en la sección 1.1 — no hay trabajo repetido, es la decisión final.
- Si en el futuro aparece de verdad un tercer módulo con la misma forma (5 booleanos por recurso), ahí sí conviene extraer el patrón común — en ese momento va a ser un refactor chico, no una reescritura, porque `AccesoIndicador`/`AccesoISO` ya comparten la misma forma de columnas.

El schema de la sección 1.1 (`AccesoIndicador` + `AccesoISO` separados) queda **confirmado como definitivo**, no como propuesta.

### 🟡 Impacto mediano — no cambian el schema, pero si no se deciden ahora se resuelven mal después
2. **Ningún permiso se declara solo en frontend.** Regla general: si `useAccesoKpisIso.ts` oculta un botón por un flag, el controller/guard equivalente en backend tiene que validar el mismo flag antes de tocar la BD, siempre — aunque sea "solo para ocultar un botón". Ya pasó con `esPdfIso` (frontend oculta, backend todavía no valida igual — ver sección 3, pendiente `GET /archivos/:id/url`). No es tabla ni endpoint nuevo, es disciplina a aplicar en cada guard que se escriba de ahora en más.
3. **No convertir cada caso especial en un flag booleano suelto.** `gestionaObsoleto` (sección 1.1) ya es una excepción hardcodeada dentro de `AccesoISO`. Si después aparece "en tal carpeta solo Excel para tal usuario", eso NO debería ser un flag más, sino una tabla de overrides puntuales (`usuarioId + carpetaId + permiso`), separada, solo si hace falta. No bloquea nada ahora, es una regla para el futuro.
4. **Cerrar de una vez la duda del visor de Word/Excel/PowerPoint** (ya estaba abierta en 1.1 y desde el inicio en "Pendiente de confirmar con Alice"). Es la única de las 6 que si se demora sí frena el resto del diseño, porque define si hace falta un "visor propio" tipo el de PDF o si esos 3 tipos solo se descargan.

### 🟢 Impacto pequeño / solo UX — no tocan el modelo de datos
5. **Presets en el frontend** ("Solo lectura" / "Editor" / "Gestor total") que marcan los 5 flags de golpe, dejando los checkboxes individuales como "modo avanzado". Es puramente UI sobre `Accesoskpisiso.vue`, no cambia schema ni DTO. Pensado para que la Admin de KPIs no tenga que marcar los 5×8 checkboxes uno por uno.

### ⚪ Fuera de alcance de esta fase — a futuro, no ahora
6. **Unificar todo esto con el sistema de `Permiso` normal** (Lotes, Productos, etc.), ya que conceptualmente son lo mismo (recurso + acciones booleanas). Dejaría un solo guard/service/grid reutilizable para cualquier módulo futuro. Es la recomendación de **mayor impacto de las 6**, pero también la de mayor alcance (toca módulos fuera de KPIs/ISO). Se sugiere NO mezclarla con el cierre de esta fase; evaluarla después como su propio proyecto.

### ¿Son cambios grandes? — respuesta directa
- De las 6, solo el punto 1 (ya **decidido**: tablas separadas) y el punto 6 (unificar con `Permiso` general) eran cambios grandes de schema/arquitectura. El 6 es el más grande de los dos, es opcional, y se recomienda dejarlo fuera de esta fase.
- Los puntos 2, 3 y 5 NO son cambios de arquitectura: son reglas de disciplina (2 y 3) o de UI (5) — se pueden aplicar sin rehacer nada de lo ya diseñado en 1.1.
- El punto 4 no es grande técnicamente, pero es el único que bloquea seguir — sigue sin respuesta de Alice.

### ✅ Punto 5 — DECIDIDO (sesión 9): presets de UI se dejan para después
No se implementan en esta primera vuelta. Es pura UI sobre `Accesoskpisiso.vue`, no bloquea nada del modelo de datos ni del backend. Se prioriza tener el grid de 5×8 checkboxes funcionando primero y observar cómo lo usa la Admin de KPIs en la práctica, para armar los presets ("Solo lectura"/"Editor"/"Gestor total") en base a combinaciones de uso real, en vez de adivinarlas ahora.

---

## ✅ TODAS LAS DUDAS ABIERTAS CERRADAS (sesión 9)

Con esto, las 4 dudas de la sección 1.1 y la de presets de la sección 1.2 quedaron todas decididas. El diseño del rediseño de permisos está completo — **lo único que falta es implementarlo**: migración de Prisma, guard/service en backend, y grid/composable en frontend (ver sección 5, checklist actualizado).

---

## 2. Modelo de datos (vigente hasta la migración pendiente)

Migración `kpis_iso_module` aplicada con éxito. Modelos `Carpeta`, `Archivo`, `AccesoIndicador`, `AccesoISO` (estos 2 últimos con los enums viejos `TipoAccesoIndicador`/`TipoAccesoISO`, ver sección 1.1 para el reemplazo pendiente).

Campos relevantes confirmados en `schema.prisma`:
- `Carpeta`: `id`, `nombre`, `carpetaPadreId`, `modulo` (`KPIS`|`ISO`), `tipo` (`TipoCarpeta?`: `ANIO`|`PROCESO`|`PERIODO`|`RI`|`DS`|`OBSOLETO`), `proceso` (`ProcesoIndicador?`, denormalizado en cada nodo del subárbol de un proceso).
- `Archivo`: `id`, `carpetaId`, `nombre`, `tipo` (`PDF`|`WORD`|`EXCEL`, pendiente sumar `POWERPOINT`), `storagePath`, `subidoPorId`, `fechaSubida`.

---

## 3. Backend

### Resuelto y confirmado funcionando (sigue vigente)
- `CarpetasModule`, `SupabaseStorageService`, `AccesoDocumentosService` end-to-end.
- `PATCH /usuarios/:id/accesos-kpis-iso` (guards `SupabaseAuthGuard`+`EsAdminGuard`) — **este guard va a necesitar cambiar** para aceptar también `esAdminKpis`, no solo `esAdmin` (pendiente, sección 1.1).
- `common/guards/supabase-auth.guard.ts` corregido esta sesión anterior: ya incluye `permisos`, `accesosIndicador`, `accesoIso` en el `findUnique`. **Cuando se migre el modelo granular, este guard sigue funcionando igual** (el `include` no cambia, solo cambian los campos internos de esos modelos).

### Pendiente de implementar (nuevo, esta sesión)
- Migración de schema (ver sección 1.1).
- Nuevo guard (ej. `EsAdminKpisGuard` o modificar `EsAdminGuard` para aceptar `esAdmin || esAdminKpis`) — aplicarlo en `PATCH /usuarios/:id/accesos-kpis-iso` y decidir si también en `GET /usuarios` (duda #4 de la sección 1.1).
- Actualizar `actualizar-accesos-kpis-iso.dto.ts` para los 5 booleanos por proceso/ISO en vez del enum `tipoAcceso`.
- Actualizar `usuarios.service.ts` (`actualizarAccesosKpisIso`) al nuevo shape.
- `GET /archivos/:id/url` con flag `esPdfIso` — ahora ya puede implementarse con la regla dura definitiva del punto 1 (sección 1.1): bloquear eliminación de PDF en ISO salvo `esAdmin`.
- Nuevo endpoint `GET /usuarios/lista-basica` (`id`, `nombre`, `avatarUrl`), protegido por `esAdmin || esAdminKpis` (duda #4 cerrada).
- Check de visibilidad por tipo de archivo en ISO (duda #2 cerrada): `puedeVer` alcanza para PDF, hace falta `puedeEditar` para Word/Excel/PowerPoint.

---

## 4. Frontend

### Resuelto y confirmado funcionando (sigue vigente)
- `composables/useCarpetas.ts` (+ `useArchivos()`), `pages/kpis/index.vue`, `pages/kpis/[id].vue` con control de permisos vía `composables/useAccesoKpisIso.ts` (creado sesión anterior).
- Visor de PDF propio (`usePdfViewer.ts` + `VisorPdf.vue`) fase 1, integrado en `pages/kpis/[id].vue`.
- Panel de accesos actual: `Editarpermisos.vue` + `Accesoskpisiso.vue` + `utils/permisos.ts`, con niveles enum (a reemplazar).

### Pendiente de implementar (nuevo, esta sesión)
- `utils/permisos.ts`: reemplazar `AccesosKpisIsoState` (basado en `NivelAccesoIndicador`/`NivelAccesoISO`) por un estado con los 5 booleanos por proceso y para ISO.
- `Accesoskpisiso.vue`: rehacer el grid para mostrar checkboxes de los 5 permisos por proceso + los 5 de ISO (+ `gestionaObsoleto`), en vez de selects de nivel.
- `Editarpermisos.vue`: decidir si el bloque de KPIs/ISO se separa en su propia sección/tab visible también para `esAdminKpis` (que no es `esAdmin` general y hoy no tiene acceso a esta página en absoluto, según el middleware).
- `composables/useAccesoKpisIso.ts`: reescribir para leer los 5 flags en vez de comparar contra `'ESCRITURA'`/`'EDICION_TOTAL'`.
- `AppSidebar.vue`: condicionar el ítem "KPIs / ISO" a `puedeVer` (en cualquier proceso o en ISO) en vez de `esAdmin` — sigue pendiente de antes, ahora con el modelo nuevo.
- Middleware de rutas (`auth.global.ts` o `permisos.global.ts`, sin confirmar cuál): permitir entrada de `esAdminKpis` a la gestión de accesos KPIs/ISO sin ser `esAdmin` general.

---

## 5. Qué falta (orden sugerido, actualizado)

1. ✅ ~~Cerrar las 5 dudas abiertas~~ — cerradas todas en la sesión 9. El diseño está completo, ya se puede migrar y codear.
2. Migración de Prisma con el modelo granular de la sección 1.1 (`AccesoIndicador`/`AccesoISO` separados, ya definitivo) + `esAdminKpis` + `POWERPOINT`.
3. Backend: nuevo guard, DTO y service actualizados, incluyendo la regla dura de PDFs (punto 1) y el check de visibilidad por tipo de archivo (punto 2).
4. Backend: nuevo endpoint `GET /usuarios/lista-basica` para `esAdminKpis` (punto 4).
5. Frontend: `utils/permisos.ts`, `Accesoskpisiso.vue`, `Editarpermisos.vue`, `useAccesoKpisIso.ts`.
6. `AppSidebar.vue` con visibilidad real basada en `puedeVer`.
7. Middleware de rutas actualizado para `esAdminKpis`.
8. Flag `esPdfIso` en `GET /archivos/:id/url` (backend), aplicando la regla dura ya cerrada.
9. Fase 2 del visor de PDF (bloquear clic derecho/Ctrl+P/Ctrl+S).
10. Correr/reemplazar `accesos-kpis-iso.seed.ts` con el nuevo shape.
11. Endpoint de transferencia de documentos al clonar año + clonado de año 2027.
12. Confirmar con Alice naming de subcarpetas y decisión sobre visor de Word/Excel/PowerPoint (única pregunta externa que sigue sin responder — no bloquea el rediseño de permisos, sí el módulo de visor).
13. Conectar el contexto en el repo de **frontend** con Claude Code (ya está en backend — ver sección 0).

---

## 6. Archivos que hacen falta si se retoma esto en otro chat

Para avanzar con el rediseño (prioridad ahora), pedidos y aún no recibidos:
1. `common/guards/es-admin.guard.ts`
2. `components/admin/Editarpermisos.vue` completo
3. `AppSidebar.vue`
4. El middleware que protege `/usuarios` (`auth.global.ts` o `permisos.global.ts`, confirmar cuál es)
5. `usuarios.service.ts` — método `actualizarAccesosKpisIso` actual
6. `actualizar-accesos-kpis-iso.dto.ts` actual

Ya no hacen falta (ya compartidos y con contenido conocido): `schema.prisma` (modelos Carpeta/Archivo/AccesoIndicador/AccesoISO/Usuario), `useCarpetas.ts`, `usePermiso.ts`, `utils/permisos.ts` (versión vieja, antes del rediseño), `usuarios.controller.ts`, `supabase-auth.guard.ts` (ya corregido), `pages/kpis/[id].vue` (ya con permisos integrados), `composables/useAccesoKpisIso.ts` (versión vieja, antes del rediseño).
