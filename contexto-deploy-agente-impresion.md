# Contexto — Deploy Backend + Agente de Impresión Local (Excellence Chemical)

> Plan de migración: separar el backend en (1) **Backend Central** en la nube, accesible por todas las laptops del equipo, y (2) **Agente de Impresión Local**, un programa aparte que corre solo en la laptop conectada a la Epson TM-C3500. Este documento es la planificación — todavía no se ha tocado código.

---

## ⚠️ Orden de trabajo acordado

Este plan se ejecuta en **dos fases separadas**, en este orden:

1. **Fase 1 — Separar el permiso de "Generar Etiqueta" de "Lotes"** (ver sección nueva más abajo). Se hace primero porque es independiente de la migración a la nube y resuelve un problema real de hoy: hoy quien puede crear/editar Lotes automáticamente puede generar e imprimir etiquetas, aunque no debería.
2. **Fase 2 — Separar el backend en Backend Central + Agente de Impresión Local** (todo lo descrito en el resto de este documento: cola de trabajos, deploy en Railway/Vercel, agente en la laptop de la Epson). Se hace después, sin perder nada de lo ya arreglado en sesiones anteriores (permisos granulares, recuperación de contraseña, checklist de seguridad, todos los fixes de DTOs, el detalle de Lotes, etc. — nada de eso se toca ni se revierte).

---

## Aclaración importante: `TrabajoImpresion` NO es un historial

La tabla `TrabajoImpresion` (Fase 2) **no es una funcionalidad de "Historial" para el usuario**. Es solo el buzón temporal por donde pasa la etiqueta camino a imprimirse — el mecanismo que le permite al agente local enterarse de que hay algo pendiente sin que el backend en la nube tenga que "tocarle la puerta" a esa laptop (cosa que no es posible, esa laptop no tiene una dirección alcanzable desde internet).

- No se expone como pantalla ni se promociona como feature.
- Se puede borrar apenas se confirma que un trabajo se imprimió (o dejarse unos días y limpiarse solo).
- El frontend de "Generar Etiqueta" **no cambia en cómo se usa** — mismos campos, mismo botón "Generar". Solo por dentro, en vez de recibir el PNG ya impreso al instante, muestra brevemente "imprimiendo..." y después "✅ listo" mientras consulta el estado del trabajo en el backend.

---

## Fase 1 — Separar "Generar Etiqueta" como su propio módulo de permisos

### Problema actual
"Generar Etiqueta" está gateado por `permisoLotes.puedeCrear` — el mismo permiso que crear/editar registros de Lote. Esto impide un caso real: un compañero que se encarga de **registrar lotes** (número, fechas, fabricante) pero que **no debería** poder generar/imprimir etiquetas (para no interrumpir por accidente al encargado de impresión ni retrasar su trabajo).

### Solución
Separar en dos permisos independientes:
- **Lotes** — crear/editar/ver registros de lote (sin cambios respecto a hoy).
- **Etiquetas** (nuevo recurso) — generar/imprimir etiquetas.

Confirmado que `PermisosGrid.vue` es genérico: recorre el array `RECURSOS` de `utils/permisos.ts` y dibuja automáticamente una fila con sus 4 checkboxes (ver/crear/editar/eliminar) por cada módulo — agregar un recurso nuevo no requiere tocar el componente del grid.

### Cambios concretos (Fase 1)
- **Backend — `schema.prisma`:** agregar `ETIQUETAS` al enum `Recurso` + migración.
- **Backend — `etiquetas.controller.ts` / guard:** el endpoint `POST /etiquetas/generar` debe validar `puedeCrear` sobre `ETIQUETAS`, no sobre `LOTES`.
- **Frontend — `utils/permisos.ts`:** agregar `ETIQUETAS` a `RECURSOS` y su label (ej. "Generar Etiquetas").
- **Frontend — `AppSidebar.vue`:** cambiar la condición de "Generar Etiqueta" de `permisoLotes.puedeCrear` a `permisoEtiquetas.puedeCrear`.
- **Frontend — `middleware/permisos.global.ts`:** actualizar la entrada de `/generar-etiqueta` para exigir `ETIQUETAS.puedeCrear` en vez de `LOTES.puedeCrear`.

Con esto, en la pantalla de Usuarios se podrá configurar, por ejemplo:
- Compañero de registro de lotes: **Lotes** (ver/crear/editar) ✅, **Etiquetas** ❌ → no le aparece "Generar Etiqueta" en el sidebar, y si entra por URL directa es redirigido (mismo comportamiento ya construido, aplicado a un módulo separado).
- Encargado de impresión: **Etiquetas → Crear** ✅, y en **Lotes** puede tener solo `puedeVer` si no necesita registrar lotes él mismo.

---

## Fase 2 — Backend Central + Agente de Impresión Local

### Por qué se necesita esto

El backend actual (`src.zip`) mezcla dos responsabilidades en un mismo proceso:

1. **Datos de negocio** (Lotes, Productos, Fabricantes, Usuarios, Plantillas, Auth) — no dependen del sistema operativo, se pueden desplegar en cualquier servidor Linux en la nube.
2. **Impresión física** (`impresion.service.ts`) — ejecuta `powershell.exe` y un script `.ps1` que le habla directo al driver de Windows de la Epson. Esto **solo puede correr en esa laptop Windows específica**, conectada a esa impresora.

Como hoy están en el mismo proceso, el backend completo queda "atado" a esa laptop — nadie más podría usar el sistema desde otra red. La solución es separar ambas responsabilidades y comunicarlas por una **cola de trabajos de impresión**.

---

## Arquitectura objetivo

```
[Laptop de cualquier compañero] ──HTTPS──> [Backend Central en la nube]
                                                 │
                                                 │ genera imagen PNG,
                                                 │ crea TrabajoImpresion
                                                 │ (estado: PENDIENTE)
                                                 ▼
                                          [Base de datos + Storage]
                                                 ▲
                                                 │ pregunta "¿hay pendientes?"
                                                 │ cada pocos segundos
                                                 │ (conexión saliente,
                                                 │  no requiere IP fija
                                                 │  ni puertos abiertos)
                                                 │
                                     [Agente de Impresión Local]
                                     (laptop Windows + Epson TM-C3500)
```

- **Nadie más que el agente local ejecuta PowerShell.** El backend central nunca vuelve a tocar la impresora directamente.
- El agente **pregunta** (poll), no **recibe llamadas** — así no necesita exponerse a internet, ni tunel, ni IP fija. Si la laptop de impresión está apagada, los trabajos simplemente esperan en la cola.
- Varios compañeros pueden generar etiquetas al mismo tiempo desde distintas laptops: cada generación crea **un trabajo independiente**; el agente los procesa uno por uno, en orden, y la propia Epson (vía el spooler de Windows) encola físicamente sin mezclarlos.

---

## Tecnologías a usar

| Pieza | Tecnología | Por qué |
|---|---|---|
| Backend Central | **NestJS + Prisma** (el que ya tienes) | Se mantiene igual, solo se le agregan/quitan piezas puntuales. |
| Hosting Backend Central | **Railway** (o Render/Fly como alternativa) | Corre procesos Node persistentes en Linux; no necesita disco persistente (COAs y templates ya van a Supabase Storage / repo). |
| Base de datos | **Supabase Postgres** (el que ya usas) | Sin cambios. |
| Storage de imágenes de etiqueta pendientes | **Supabase Storage** (nuevo bucket, ej. `trabajos-impresion`) | Mismo patrón que ya usas para `coaUrl`, evita guardar binarios pesados en Postgres. |
| **Agente de Impresión Local** | **Node.js + TypeScript, standalone (sin NestJS)** | Es un programa chiquito: solo pregunta, descarga, ejecuta PowerShell y reporta. NestJS sería peso muerto para algo tan simple — un script plano es más fácil de instalar y mantener en una laptop de oficina. Se reusa casi tal cual la lógica de `impresion.service.ts`. |
| Cómo se mantiene corriendo el agente | **`node-windows`** (paquete npm) para instalarlo como **servicio de Windows** | Arranca solo si la laptop se reinicia, sin dejar una terminal abierta. Alternativa: `pm2` + `pm2-windows-startup`. |
| Impresión física | **PowerShell + `imprimir-etiqueta.ps1`** (el que ya tienes) | Sin cambios en la lógica de impresión en sí, solo cambia quién lo ejecuta y desde dónde. |

---

## Cambios en el Backend Central (NestJS)

### Nuevo en Prisma (`schema.prisma`)

```prisma
enum EstadoTrabajoImpresion {
  PENDIENTE
  IMPRESO
  ERROR
}

model TrabajoImpresion {
  id              Int                    @id @default(autoincrement())
  loteId          Int
  lote            Lote                   @relation(fields: [loteId], references: [id])
  plantillaId     Int
  plantilla       Plantilla              @relation(fields: [plantillaId], references: [id])
  pesoBruto       Float
  unidadBruto     String
  cantidadNeta    Float
  unidadNeta      String
  proforma        String
  imagenPath      String                 // path en Supabase Storage, bucket trabajos-impresion
  estado          EstadoTrabajoImpresion @default(PENDIENTE)
  mensajeError    String?
  creadoPorId     Int
  creadoPor       Usuario                @relation(fields: [creadoPorId], references: [id])
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt

  @@map("trabajos_impresion")
}
```
*(nombres de campos sujetos a ajuste fino cuando se implemente — esto es la forma general)*

### Archivos que se **modifican**

- `src/etiquetas/etiquetas.controller.ts` — `POST /etiquetas/generar` deja de imprimir directo; genera la imagen, la sube a Storage, crea el `TrabajoImpresion` en `PENDIENTE`, y responde con el `id` del trabajo (no ya con el PNG final impreso). Se agregan 2 endpoints nuevos:
  - `GET /etiquetas/trabajos/pendientes` — usado solo por el agente (autenticado con un token de máquina, no con el login normal de usuario).
  - `PATCH /etiquetas/trabajos/:id/estado` — el agente reporta `IMPRESO` o `ERROR` (+ mensaje si falló).
  - `GET /etiquetas/trabajos/:id` — usado por el frontend para consultar el estado y mostrarle al usuario "enviado a impresión... ✅ impreso" en vez de solo darle el PNG.
- `src/etiquetas/etiquetas.service.ts` — ya no llama a `ImpresionService.imprimir()`; en su lugar sube la imagen a Storage y crea la fila en la tabla nueva.
- `src/etiquetas/etiquetas.module.ts` — se quita `ImpresionService` de los providers; se agrega el nuevo servicio de trabajos (`TrabajosImpresionService` o se amplía `EtiquetasService`).
- `src/config/etiqueta.config.ts` — se queda solo con lo que es de **generación de imagen** (`ETIQUETA_LABEL_CONFIG`, `ETIQUETA_EMPRESA_CONFIG`, `ETIQUETA_FUENTE_CONFIG`). El bloque `IMPRESORA_CONFIG` (nombre de impresora, tamaño de papel) **se quita de aquí** — ya no aplica en la nube, se traspasa al agente.
- `main.ts` — actualizar `app.enableCors({ origin: [...] })` para incluir el dominio real de Vercel del frontend (hallazgo de la sesión anterior, sigue pendiente).

### Archivos que se **traspasan** (se mueven del backend central al proyecto del agente local, no se quedan en ninguno de los dos lados a medias)

- `src/etiquetas/impresion.service.ts` → se lleva su lógica (el `execFile('powershell.exe', ...)`) al agente local, adaptada a script plano sin decoradores de NestJS.
- `src/assets/scripts/imprimir-etiqueta.ps1` → se mueve físicamente a la carpeta del agente local. No tiene sentido que viva en el repo del backend en la nube: ese entorno nunca va a poder ejecutarlo.
- `IMPRESORA_CONFIG` de `src/config/etiqueta.config.ts` → sus dos valores (`EPSON_PRINTER_NAME`, `EPSON_PAPER_SIZE`) pasan a ser variables de entorno del agente local, no del backend central.

### Archivos que se **eliminan** del backend central (una vez traspasado lo anterior)

- `src/etiquetas/impresion.service.ts` (borrar del repo del backend central después de trasladar su lógica al agente).
- `src/assets/scripts/` completa (la carpeta queda vacía en el backend central si solo tenía el `.ps1`).

### Archivos que **no cambian**

- `src/etiquetas/etiqueta-generator.service.ts` (genera el PNG, no toca la impresora — se queda en el backend central tal cual).
- Todo lo de Lotes, Productos, Fabricantes, Usuarios, Plantillas, Permisos, Auth — sin cambios de código, solo el deploy en sí.
- `src/prisma/prisma.service.ts`, `src/infrastructure/supabase/*`, `src/storage/*` — sin cambios.

---

## Proyecto nuevo: Agente de Impresión Local

Carpeta/repo **separado**, chico, standalone en Node + TypeScript. Vive solo en la laptop de la Epson.

**Estructura propuesta:**
```
agente-impresion/
├── src/
│   ├── index.ts          # loop principal: pregunta, descarga, imprime, reporta
│   ├── imprimir.ts        # lógica adaptada de impresion.service.ts (execFile PowerShell)
│   ├── cliente-backend.ts # llamadas HTTP al backend central (con el token de agente)
│   └── config.ts          # lee variables de entorno
├── scripts/
│   └── imprimir-etiqueta.ps1   # el mismo que ya tienes, movido aquí
├── .env                    # BACKEND_URL, AGENT_TOKEN, EPSON_PRINTER_NAME, EPSON_PAPER_SIZE, POLL_INTERVAL_MS
├── package.json
└── tsconfig.json
```

**Variables de entorno del agente:**
- `BACKEND_URL` — URL del backend central en Railway.
- `AGENT_TOKEN` — secreto compartido, para que el backend sepa que la petición viene del agente y no de cualquiera.
- `EPSON_PRINTER_NAME`, `EPSON_PAPER_SIZE` — igual que ya tienes hoy.
- `POLL_INTERVAL_MS` — cada cuánto pregunta por pendientes (sugerido: 2000-3000 ms).

---

## Cambios en el Frontend (Nuxt)

- Página `generar-etiqueta.vue`: en vez de recibir el PNG y darse por terminado, mostrar estado del trabajo (`PENDIENTE` → `IMPRESO`/`ERROR`), consultando `GET /etiquetas/trabajos/:id` cada par de segundos hasta que cambie de estado.
- (Opcional, backlog) `historial.vue`: podría mostrar también el estado de cada trabajo de impresión.
- Deploy en Vercel: sin cambios de código más allá de la variable de entorno que apunta a la URL del backend central en Railway.

---

## Checklist de trabajo (orden sugerido)

**Fase 1 — Permiso de Etiquetas separado de Lotes**
1. Migración de Prisma: agregar `ETIQUETAS` al enum `Recurso`.
2. Backend: `POST /etiquetas/generar` valida `puedeCrear` sobre `ETIQUETAS`.
3. Frontend: `utils/permisos.ts`, `AppSidebar.vue`, `middleware/permisos.global.ts` actualizados.
4. Probar: usuario con Lotes✅/Etiquetas❌ no ve "Generar Etiqueta"; usuario con Etiquetas✅ sí.

**Fase 2 — Backend Central + Agente de Impresión Local**
1. Backend Central: aplicar migración de Prisma (`TrabajoImpresion`), implementar los cambios de `etiquetas.*`, quitar `ImpresionService`.
2. Crear bucket `trabajos-impresion` en Supabase Storage.
3. Deploy del Backend Central en Railway, con las env vars (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AGENT_TOKEN`, CORS actualizado).
4. Deploy del Frontend en Vercel, apuntando al backend en Railway.
5. Armar el proyecto del Agente de Impresión Local, instalarlo como servicio de Windows en la laptop de la Epson, con su `.env`.
6. Prueba de punta a punta: generar etiqueta desde una laptop distinta a la de impresión, confirmar que imprime.

---

## Pendiente de decidir contigo antes de implementar

- Nombre exacto del bucket de Storage y tiempo de retención de las imágenes de trabajos ya impresos (¿se borran después de X días, o se dejan como historial?).
- Si el `AGENT_TOKEN` se rota manualmente o se automatiza.
- Si quieres que el Historial muestre también el estado de impresión de cada etiqueta generada.
