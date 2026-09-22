# Sistema de Etiquetado v2 — Frontend

Aplicación web (panel administrativo) construida con **Nuxt 4** para Excellence Chemical S.A.C. Cubre dos módulos:

1. **Etiquetado** — fabricantes, productos (con ficha de seguridad y clasificación GHS), lotes (con carga de COA), plantillas, usuarios/permisos, impresión de etiquetas e historial de etiquetas generadas.
2. **KPIs / Documentación ISO** — árbol de carpetas y documentos con control de acceso granular, visor propio de PDF y de Word.

Es el cliente de la API NestJS que vive en el repo hermano `../backend`.

El código y el lenguaje del dominio están en español — los identificadores, comentarios, toasts y mensajes de error nuevos se escriben igual.

## Stack

- **Nuxt 4.5** (Vue 3.5, TypeScript 5.9) en modo **SPA** (`ssr: false`)
- **Supabase JS 2.112** para sesión/autenticación (login, recuperación de contraseña) — el backend valida el mismo JWT
- **Axios 1.19** (`useApi`) como cliente HTTP, con interceptor que agrega el token de Supabase a cada request
- **shadcn-nuxt 2.8** (componentes en `app/components/ui/`, sobre **Reka UI 2.10**) + **Tailwind CSS 4.3** (`@tailwindcss/vite`)
- **Zod 3.25** + **vee-validate 4.15** (`@vee-validate/zod`) — configurado para validar recién al enviar, no en cada blur
- **@tanstack/vue-query 5.101** para los módulos CRUD del etiquetado
- **pdfjs-dist 6.3** (visor de PDF propio) y **docx-preview 0.4** (visor de Word)
- **ExcelJS 4.4** para las exportaciones (`useCsvExport.ts` / `useXlsxExport`)
- `@lucide/vue` / `lucide-vue-next` para íconos, `vue-sonner` para toasts, `@vueuse/core` como utilidades composable
- Pinia está instalado pero **sin usar**: el estado compartido son `ref` a nivel de módulo (ver "Arquitectura")

## Estructura del proyecto

```
app/
├── app.vue
├── assets/css/tailwind.css
├── components/
│   ├── AppSidebar.vue / NavUser.vue / ModeToggle.vue
│   ├── ComboboxBuscador.vue / Searchcombobox.vue / LoteCombobox.vue
│   ├── admin/           # Crearusuario.vue, Editarpermisos.vue, Permisosgrid.vue,
│   │                    # Accesoskpisiso.vue (grid de accesos KPIs/ISO)
│   ├── documentos/      # VisorWord.vue (docx-preview)
│   ├── fabricantes/     # FabricanteForm.vue, FabricantesFiltroBar.vue
│   ├── lotes/           # LoteForm.vue, Lotesfiltrobar.vue, Vencimientobadge.vue
│   ├── mi-cuenta/       # AvatarUploader.vue
│   ├── pdf/             # VisorPdf.vue (pdfjs-dist)
│   ├── productos/       # ProductoForm.vue, ProductosFiltroBar.vue, NfpaBadge.vue
│   └── ui/              # librería shadcn-nuxt (Reka UI) + ProgressBar.vue, Spinner.vue
├── composables/
│   ├── useApi.ts / useAuth.ts / useUsuarioActual.ts / usePermiso.ts / useAvatar.ts
│   ├── useAccesoKpisIso.ts      # resuelve los 5 flags por carpeta (KPIs/ISO)
│   ├── useCarpetas.ts           # useCarpetas() + useArchivos()
│   ├── usePdfViewer.ts / useBloqueoDocumento.ts
│   ├── useFabricantes.ts / useFabricantesListado.ts
│   ├── useLotes.ts / useloteslistado.ts
│   ├── useProductos.ts / useProductosListado.ts
│   └── usePlantillas.ts / useEtiquetas.ts / useCsvExport.ts
├── layouts/
│   ├── default.vue      # shell con sidebar, para páginas autenticadas
│   └── auth.vue         # páginas públicas (login, recuperar contraseña)
├── lib/utils.ts
├── middleware/
│   ├── auth.global.ts       # sesión / rutas públicas
│   └── permisos.global.ts   # permiso por ruta (RUTA_PERMISO)
├── pages/
│   ├── index.vue / login.vue / mi-cuenta.vue
│   ├── generar-etiqueta.vue / historial.vue   # historial: etiquetas generadas, filtros y enlace al QR
│   ├── e/[token].vue                          # página pública del QR (sin login)
│   ├── fabricantes/index.vue · productos/index.vue · lotes/index.vue
│   ├── kpis/index.vue                       # raíces (KPIs-SGC / ISO-SGC)
│   ├── kpis/[id]/index.vue                  # contenido de una carpeta
│   ├── kpis/[id]/documento/[archivoId].vue  # visor de un documento
│   ├── olvide-password.vue / restablecer-password.vue
│   └── usuarios/index.vue, usuarios/[id].vue
├── plugins/               # vee-validate.ts, vue-query.ts
├── schemas/               # etiqueta, fabricante, lote, producto (Zod)
├── types/                 # fabricante, lote, plantilla, producto
└── utils/                 # supabase.client.ts, permisos.ts, fechavencimiento.ts
```

## Arquitectura

**SPA, no SSR.** `ssr: false` en `nuxt.config.ts`; los dos middlewares globales abren con `if (import.meta.server) return` y las APIs del navegador se pueden usar directo.

**El estado compartido son `ref` a nivel de módulo.** `useAuth` (`session`) y `useUsuarioActual` (`usuarioActual`, `cargado`, `cargando`) declaran sus refs *fuera* de la función del composable, así que todos los que los llaman comparten una sola instancia. `useApi` y `useSupabaseClient` son singletons perezosos por lo mismo. No hay store de Pinia.

**Dos convenciones de fetching conviven.** Los módulos CRUD del etiquetado usan TanStack Query (un composable por entidad, query keys planas, `invalidateQueries` al mutar; 30s de `staleTime`, `retry: 1`). El módulo KPIs/ISO (`useCarpetas`, `useArchivos`) son funciones que devuelven promesas, disparadas desde `onMounted`/`watch` en la página, sin caché.

**Listados** (`use*Listado.ts`) son estado de vista puramente cliente sobre un array ya traído: búsqueda + filtros + paginación (`PAGE_SIZE = 10`), todo en memoria — no hay paginación de servidor.

**La generación de etiquetas es asíncrona.** `useGenerarEtiqueta` hace `POST /etiquetas/generar`, recibe un `trabajoId` en estado `PENDIENTE` y hace polling de `GET /etiquetas/trabajos/:id` cada 1.5s hasta 30s, hasta que el agente de impresión local reporta `IMPRESO` o `ERROR`.

## Autenticación

- `useAuth` centraliza la sesión de Supabase (login, logout, reset/actualización de contraseña).
- `middleware/auth.global.ts` redirige a `/login` si no hay sesión, salvo en las rutas públicas (`/login`, `/olvide-password`, `/restablecer-password`), y de `/login` a `/` si ya hay sesión.
- Cada request adjunta el `access_token` como `Bearer`.
- `useUsuarioActual.reset()` **está cableado** al ciclo de vida de la sesión: se llama al hacer login, al hacer logout y desde `onAuthStateChange` cuando cambia el `user.id` (cubre expiración de token o `signOut` desde otra pestaña). Usa un contador de época para descartar respuestas de `/usuarios/me` que llegan tarde, después de un reset — sin eso, los permisos del usuario anterior sobrevivían a un cambio de usuario.

## Permisos — dos sistemas en paralelo

No hay que confundirlos: son modelos distintos, con endpoints distintos.

### 1. Permisos CRUD (`Permiso`)

`app/utils/permisos.ts` es la fuente de verdad: `RECURSOS` (`LOTES`, `PRODUCTOS`, `FABRICANTES`, `PLANTILLAS`, `COA`, `USUARIOS`, `ETIQUETAS`) × cuatro booleanos (`puedeVer` / `puedeCrear` / `puedeEditar` / `puedeEliminar`). Este archivo tiene que espejar el enum `Recurso` del backend (`usuarios.dto.ts`).

`usePermiso('RECURSO')` devuelve un objeto reactivo con el bypass de `esAdmin` ya incorporado.

**Habilitar una ruta nueva toca tres lugares:**

1. la tabla `RUTA_PERMISO` en `middleware/permisos.global.ts` (prefijo de ruta → recurso + nivel; lo que no está listado es libre),
2. el flag `visible:` del ítem de navegación en `components/AppSidebar.vue`,
3. `usePermiso` dentro de la página, para los botones de acción.

### 2. Accesos de KPIs / ISO

`useAccesoKpisIso()` resuelve, por carpeta, **5 flags independientes** (`puedeVer`, `puedeDescargar`, `puedeAdjuntar`, `puedeEditar`, `puedeEliminar`) a partir de `usuarioActual.accesosIndicador` (uno por `ProcesoIndicador`) y `usuarioActual.accesoIso`. Todo el composable se deriva de `accesosDeCarpeta(carpeta, cadena)`.

Reglas que espejan al backend (`AccesoDocumentosService`):

- **`esAdmin` tiene bypass total** sobre el contenido.
- **Nodos de KPIs sin `proceso`** (raíz, año, `INDICADORES`) se muestran solo como camino: `puedeVer` si el usuario ve *algún* proceso, nada más.
- **Rama `Obsoleto` de ISO** — `gestionaObsoleto` es todo o nada: da acceso total sobre esa rama, o ninguno. La detección mira **toda la cadena de ancestros** (`cadena.some(c => c.tipo === 'OBSOLETO')`), no solo la carpeta actual, porque una subcarpeta anidada dentro de Obsoleto sigue siendo Obsoleto aunque su propio `tipo` sea `null`.
- **Visibilidad por tipo en ISO** — `puedeVer` alcanza para el PDF (documento oficial aprobado); Word/Excel/PowerPoint piden además `puedeEditar` (son borrador de trabajo). La regla **no** se aplica en KPIs, donde los RI son Word y los DS son Excel.
- **Regla dura de PDFs de ISO** — nadie borra un PDF dentro de ISO, ni con `puedeEliminar=true`, salvo `esAdmin`. Es documentación de auditoría.
- **`esPdfIso(archivo, carpeta)`** (`modulo === 'ISO' && tipo === 'PDF'`) gobierna las dos excepciones opuestas del PDF de ISO: le da paso libre a la signed URL — que alimenta el visor propio, no una descarga — y a la vez le prohíbe el borrado. El `modulo` sale de la **carpeta contenedora**, no del archivo (`Archivo` no lo trae), igual que el backend con `archivo.carpeta.modulo`. Ojo: `tipo === 'PDF'` a secas no alcanza; un PDF dentro de una carpeta KPIS no está exento, y usar la condición corta hacía que el frontend ofreciera un botón que terminaba en 403.

La cadena de ancestros que reciben estos helpers es la ruta del breadcrumb tal cual la devuelve `GET /carpetas/:id/ruta` (ya incluye a la propia carpeta).

### Rol `esAdminKpis`

Gestiona los accesos de KPIs/ISO de otros usuarios sin ser admin general. `middleware/permisos.global.ts` lo deja entrar a `/usuarios` aunque no tenga el permiso `USUARIOS` (`RUTAS_ADMIN_KPIS`), y `AppSidebar.vue` le muestra ese ítem. **No implica acceso propio al contenido**: para ver algo dentro de KPIs/ISO necesita que le asignen sus propios accesos, igual que a cualquiera.

### Panel de administración

`pages/usuarios/index.vue` lista usuarios y abre el diálogo `components/admin/Editarpermisos.vue`, que combina `Permisosgrid.vue` (los 4 booleanos × recurso) y `Accesoskpisiso.vue` (los 5 booleanos × proceso + ISO + `gestionaObsoleto`), y hace el `PATCH`.

El diálogo trae los accesos de KPIs/ISO con `GET /usuarios/:id/accesos-kpis-iso` cuando se abre, y **no habilita el botón de guardar hasta que esa respuesta llegó**: guardar con el estado en blanco borraría los accesos del usuario, porque el backend hace `deleteMany` + `createMany`. Si el fetch falla, se muestra una tarjeta de aviso y el guardado queda bloqueado.

El grid se indexa **por `proceso`, nunca por el `id` de la fila** de Prisma: esos ids cambian en cada guardado.

## Fichas de seguridad y pictogramas GHS

- En el formulario de producto, al elegir la **ficha de seguridad (PDF)** se llama a `POST /productos/analizar-ficha` (`useAnalizarFicha`) y se rellenan pictogramas, palabra de advertencia y frases H/P como **propuesta** (aviso ámbar "revísalos"). Si la ficha dice que el producto no es peligroso se avisa; si es un PDF escaneado, o no se encuentra nada, los pictogramas se marcan a mano.
- Los 9 pictogramas oficiales de la ONU están en `public/ghs/GHS01.png`–`GHS09.png`; `utils/ghs.ts` tiene sus nombres y descripciones y `components/etiquetas/PictogramaGhs.vue` los dibuja.
- Se ven en la **página pública del QR** (`pages/e/[token].vue`), no en la etiqueta impresa.
- En `/productos`, la columna **GHS** marca "N pictogramas" (verde) o "Incompleto" (ámbar, `utils/ghs.ts` → `estadoGhs()`) cuando el producto tiene frases H o palabra de advertencia pero ningún pictograma marcado; un aviso arriba de la tabla cuenta cuántos productos están así. El mismo aviso aparece dentro del formulario al editar ese producto.

## Historial y lotes

- `/historial` lista las etiquetas generadas (búsqueda, filtro por estado, paginación, abrir/copiar el enlace del QR, y una columna **Escaneos** con el contador y la fecha del último). Requiere `ETIQUETAS:puedeVer`.
- En `/lotes` el botón de eliminar borra el lote con su historial, salvo que tenga un QR vigente (menos de 2 años): en ese caso el backend responde 409 y se muestra su mensaje.

## Alertas de impresión y vista previa

- `components/etiquetas/AlertasImpresion.vue`, montado en `layouts/default.vue`, consulta cada 15s `GET /etiquetas/agente/estado` (`useEstadoImpresion`) y muestra un banner + toast cuando el agente de impresión no responde, la impresora tiene un problema (papel, tinta, tapa abierta...) o hay etiquetas esperando demasiado. Solo lo ven quienes tienen `ETIQUETAS:puedeVer` o `puedeCrear`.
- En `/generar-etiqueta`, el botón **Vista previa** (`useVistaPrevia`) pide al agente que dibuje la etiqueta con los datos del formulario, sin imprimirla ni crear ningún trabajo; se muestra en un diálogo con scroll.

## Visores de documentos

- **PDF** — `composables/usePdfViewer.ts` + `components/pdf/VisorPdf.vue`, con `pdfjs-dist` y el worker importado como URL de Vite (`pdfjs-dist/build/pdf.worker.min.mjs?url`). Cancela el `renderTask` en vuelo antes de cada re-render y se traga `RenderingCancelledException`.
- **Word** — `components/documentos/VisorWord.vue` con `docx-preview`.
- **`useBloqueoDocumento`** — compartido por los dos visores: bloquea `Ctrl/Cmd+P`, `Ctrl/Cmd+S` y el menú contextual mientras hay un documento abierto. Es un **disuasivo, no una protección**: DevTools, una captura de pantalla y la URL firmada de Supabase visible en la pestaña Network siguen disponibles.

## Manejo de errores de acceso

Las páginas de KPIs distinguen un **403** del resto de los errores: un 403 activa la tarjeta "Sin acceso" (y limpia el estado derivado), mientras que un error de red o un 500 dejan el mensaje genérico. Aplica tanto a `kpis/[id]/index.vue` como al visor `kpis/[id]/documento/[archivoId].vue`.

El chequeo de permisos en el frontend **solo oculta botones**; el backend valida lo mismo. El manejo del 403 se mantiene como red de seguridad aunque el botón ya no se muestre.

## Formularios

`app/schemas/*.schema.ts` (Zod) + vee-validate vía `@vee-validate/zod`. `plugins/vee-validate.ts` desactiva a propósito la validación en blur/change/input/model: los campos validan al hacer `handleSubmit` y recién ahí revalidan al cambiar. No re-activarlo por formulario.

## Variables de entorno

`.env` en la raíz (git-ignored), mapeado por `runtimeConfig.public` en `nuxt.config.ts`:

```env
NUXT_PUBLIC_API_BASE=http://localhost:3000/api   # incluye el prefijo /api del backend
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
```

`apiBase` ya termina en `/api`, así que las llamadas en los composables se escriben sin él (`api.get('/productos')`). La config se lee solo por `useRuntimeConfig().public`.

## Instalación y ejecución

```bash
# instalar dependencias (postinstall corre "nuxt prepare")
npm install

# desarrollo — puerto 3001 fijo
npm run dev

# verificación de tipos (vue-tsc)
npm run typecheck

# build de producción
npm run build

# previsualizar el build — también en el puerto 3001
npm run preview
```

El backend tiene que estar corriendo para que funcione cualquier cosa más allá de `/login`.

**No hay linter ni test runner instalados** (no hay eslint, ni vitest/jest). `npm run typecheck` y `npm run build` son la única verificación mecánica disponible.

## Convenciones de UI

- shadcn-nuxt (estilo new-york, base neutral, variables CSS) genera dentro de `app/components/ui/`; la config está en `components.json`. Nuxt auto-importa componentes, así que las primitivas de `ui/` se usan sin import explícito, mientras que los componentes de feature y los composables se importan con `~/` o `@/`.
- Los íconos vienen de **los dos** paquetes, `@lucide/vue` y `lucide-vue-next`, según el archivo — mirar los vecinos antes de agregar un import.
- Toasts con `vue-sonner`. `write-sonner.ps1` en la raíz es un script de un solo uso que reescribe `app/components/ui/sonner/Sonner.vue` (fija el set de íconos a `@lucide/vue-next`) — hay que volver a correrlo si una regeneración de shadcn pisa ese archivo.
- Layouts: `default.vue` (shell con sidebar, implícito) y `auth.vue`, elegido con `definePageMeta({ layout: 'auth' })` en las tres páginas públicas.
- `cn()` de `lib/utils.ts` para el merge de clases.

## Notas

- El frontend corre fijo en el puerto **3001**; el backend habilita CORS para `http://localhost:3000` y `http://localhost:3001`.
- **La forma de las respuestas es inconsistente**: la mayoría de los endpoints devuelven el payload directo (`const { data } = await api.get<Producto[]>(...)`), pero `/usuarios/me` viene envuelto — `useUsuarioActual` lee `data.data`. Conviene verificar en el backend antes de asumir.
- La vista "Mi cuenta" (`pages/mi-cuenta.vue`, composable `useAvatar`) permite subir/cambiar la foto de perfil.
- El recurso `COA` es configurable en el grid de admin pero todavía no lo consume ninguna pantalla; los botones de COA en `LoteForm.vue` se gatean con el recurso `LOTES`.
- `contexto-fase3-kpis-iso.md` en la raíz es el documento de diseño del módulo KPIs/ISO. Está **parcialmente desactualizado**: describe el rediseño de permisos como "decidido pero no implementado", cuando en realidad ya está implementado en backend y frontend. Sirve para entender el *porqué* de las reglas, no como estado de avance.
- `4000/` en la raíz es un directorio suelto creado por un comando mal tipeado (contiene solo un `node_modules` vacío) — no es parte del build.
