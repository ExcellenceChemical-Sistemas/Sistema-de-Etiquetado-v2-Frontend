# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Nuxt 4 admin SPA for "Sistema de Gestión Excellence Chemical" (repo folder name still says
"Etiquetado" for historical reasons — cosmetic only, the system covers more than labeling now):
manages fabricantes, productos, lotes (with COA upload), plantillas, usuarios/permisos, label
generation, a KPIs / Documentación ISO document module, and (planned) an order lead-time module.
It is the client for the NestJS backend that lives in the sibling repo `../backend` (own
`CLAUDE.md` there).

Code and domain language are Spanish — keep new identifiers, comments, toasts, and error
messages in Spanish to match.

## Commands

```bash
npm install              # postinstall runs "nuxt prepare"
npm run dev              # http://localhost:3001 (port is fixed in the script)
npm run build            # nuxt build → .output/
npm run preview          # also port 3001
npm run typecheck        # vue-tsc; must stay at 0 errors (CI runs it)
npm test                 # vitest run — pure logic only (utils, composables), Nuxt is NOT booted
```

There is **no lint** (no eslint). Verification is `npm run typecheck`, `npm test` and
`npm run build`; GitHub Actions (`.github/workflows/ci.yml`) runs all three on every push. Tests live
next to the code as `*.spec.ts` and only cover logic that doesn't need Nuxt: what a composable takes
from Nuxt's auto-imports (`useRuntimeConfig`, `useAuth`, `navigateTo`...) is replaced with
`vi.stubGlobal` in the test (see `composables/useApi.spec.ts`). Components are not tested.

The backend must be running for anything past `/login` to work.

## Environment

`.env` at repo root (git-ignored), mapped by `runtimeConfig.public` in `nuxt.config.ts`:

```env
NUXT_PUBLIC_API_BASE=http://localhost:3000/api   # note: includes the backend's /api prefix
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
```

`apiBase` already ends in `/api`, so every call in a composable is written without it
(`api.get('/productos')`). Read config only via `useRuntimeConfig().public`.

## KPIs / ISO

Before touching anything in the KPIs / Documentación ISO module, read
@contexto-fase3-kpis-iso.md — it is the source of truth for that module's decisions and open
questions. The 5-boolean permission redesign and the `esAdminKpis` role **are implemented** in
both repos (the old `LECTURA`/`ESCRITURA` + `VISUALIZACION`/`EDICION_TOTAL` levels are gone).
The context doc's own status notes can lag behind the code — when they disagree, trust the code.

## Architecture

**SPA, not SSR.** `ssr: false` in `nuxt.config.ts`. Both global middlewares open with
`if (import.meta.server) return`, and `window`/browser APIs are safe to use directly.

**Shared state is module-level refs, not Pinia.** Pinia is installed but unused. `useAuth`
(`session`) and `useUsuarioActual` (`usuarioActual`, `cargado`, `cargando`) declare their refs
*outside* the composable function, so every caller shares one instance. `useApi` and
`useSupabaseClient` are lazy module-level singletons for the same reason. Follow this pattern
rather than introducing a store.

**Auth.** Supabase Auth owns the session; the backend validates the same JWT. `useApi`'s axios
request interceptor calls `supabase.auth.getSession()` on every request and attaches
`Authorization: Bearer <access_token>`. `middleware/auth.global.ts` redirects to `/login`
unless the path is in `rutasPublicas` (`/login`, `/olvide-password`, `/restablecer-password`).
`useAuth` calls `useUsuarioActual.reset()` on logout and on any session user change, so a cached
`usuarioActual` does not survive a user switch. `useAuth().cambiarPassword` (Mi cuenta) re-checks the
current password with `signInWithPassword`, updates it, then signs out the other devices
(`scope: 'others'`); the new-password rule is `utils/password.ts` (shared with `/restablecer-password` and the create-user form
`Crearusuario.vue`; the backend mirrors it in `passwordNuevaSchema`, `usuario/dto/usuarios.dto.ts` — keep both in sync).

**Second factor (TOTP).** `useMfa` talks to `supabase.auth.mfa` directly; `components/mi-cuenta/DosPasos.vue` (Mi cuenta)
enrolls/removes it and `pages/verificar-mfa.vue` asks for the code. `auth.global.ts` sends a session that has the factor
but is still `aal1` to `/verificar-mfa` (navigation convenience only — the backend is what enforces it). `useApi`'s response
interceptor handles the backend's 403 codes `MFA_REQUERIDO` (→ `/verificar-mfa`) and `MFA_ENROLAR` (→ `/mi-cuenta?mfa=obligatorio`).
Pure logic (levels, code normalisation, error messages) is in `utils/mfa.ts`.

**Web Push.** `composables/usePushNotifications.ts` + `public/sw.js` (minimal, push-only — no
offline caching, on purpose, so an old SW never serves a stale build). The VAPID public key is
fetched from the backend (`GET /notificaciones/push/clave-publica`), never baked into the
frontend build, so there's one single source of truth for the key pair. Opt-in button lives in
`pages/mensajeria/index.vue` ("Activar notificaciones push"); the backend sends pushes for the
same alerts already shown in the campana (see backend `CLAUDE.md`, `PushService`) — this is a
delivery channel on top of `Notificacion`, not a replacement.

**Session stays in sync.** `plugins/refrescar-permisos.client.ts` re-fetches `/usuarios/me` when the tab
regains focus and every 5 min (`useUsuarioActual().refrescar()`); on a change it toasts and, if the current
route is no longer allowed, sends the user home. `useApi`'s response interceptor signs the user out on a 403
with `code: 'CUENTA_DESACTIVADA'` (deactivated account). Composables like `useProductos/useLotes/
useFabricantesQuery` take `{ enabled }` so a page can skip queries the user can't see (no useless 403s).

**Account admin (`pages/usuarios`).** `Editarpermisos.vue` also lets a general admin deactivate/reactivate
(`PATCH /usuarios/:id/activo`, reversible, no confirm) or delete (`DELETE /usuarios/:id`, 409 if the user has
history) an account; `Historialusuarios.vue` shows the audit log (`GET /usuarios/auditoria`). Deactivate is the
answer whenever delete answers 409.

**Two parallel permission systems.** Do not conflate them:

1. *CRUD permisos* — `utils/permisos.ts` holds `RECURSOS`
   (`LOTES`, `PRODUCTOS`, `FABRICANTES`, `PLANTILLAS`, `USUARIOS`, `ETIQUETAS`, `PEDIDOS`,
   `COTIZACIONES`, `CLIENTES`, `REGISTRO_LIMPIEZA`) × four booleans
   (`puedeVer`/`puedeCrear`/`puedeEditar`/`puedeEliminar`).
   This file must mirror the backend's Zod enum in `usuarios.dto.ts`; adding a recurso there means
   adding it here. There is no `COA` resource: COA upload is controlled by `LOTES.puedeEditar`.
   `PEDIDOS`, `COTIZACIONES`, and `CLIENTES` used to all share `PEDIDOS` but were split into their own
   resources — different people are responsible for each in practice. `REGISTRO_LIMPIEZA` has no
   backend data of its own (see `pages/registro-limpieza/index.vue` — it links to an external Google
   Form and reads a published Sheet CSV directly from the browser): `puedeVer` gates the screen,
   `puedeCrear` the "Nuevo registro" button; `puedeEditar`/`puedeEliminar` exist for consistency with
   the grid but nothing reads them yet.
   `usePermiso('RECURSO')` returns a reactive object with `esAdmin` bypass baked in.
   Some screens fill their selectors from another resource's list, so they need that "Ver" too:
   Generar Etiqueta needs `PLANTILLAS` and `LOTES` (`puedeVer`); the lote form needs `PRODUCTOS` and
   `FABRICANTES`; Nueva Cotización and Nuevo Pedido both need `CLIENTES` `puedeVer`+`puedeCrear` (the
   client combobox and its "create new client" link read/write `/clientes`).
   `Permisosgrid.vue` auto-ticks them through its `DEPENDENCIAS` table (most entries only need
   `puedeVer` on the dependency, but the `CLIENTES` ones tick `puedeCrear` too), and each screen
   shows a "no tenés permiso" message on a 403 instead of an empty selector. New dependency → add a row.
2. *KPIs/ISO accesos* — `useAccesoKpisIso()` resolves per-folder access from
   `usuarioActual.accesosIndicador` (per `ProcesoIndicador`) and `accesoIso`, each with five
   booleans (`puedeVer`/`puedeDescargar`/`puedeAdjuntar`/`puedeEditar`/`puedeEliminar`; ISO adds
   `gestionaObsoleto`). Hardcoded rules mirror the backend: the Obsoleto branch is all-or-nothing
   via `gestionaObsoleto`, in ISO Word/Excel/PowerPoint need `puedeEditar` on top of `puedeVer`,
   and a non-admin can never delete an ISO PDF.

Gating a new route means touching **three** places: the `RUTA_PERMISO` table in
`utils/rutasPermisos.ts` (shared by the middleware and the live refresh) (route prefix → recurso + nivel; unlisted routes are free),
the `visible:` flag on the nav item in `components/AppSidebar.vue`, and `usePermiso` inside the
page for the action buttons.

**Data fetching — two conventions coexist.** The original CRUD modules use TanStack Query:
one composable per entity (`useProductos`/`useCreateProducto`/`useUpdateProducto`), flat query
keys (`['productos']`), and `invalidateQueries` on mutation success; defaults are 30s
`staleTime` / `retry: 1` (`plugins/vue-query.ts`). The newer KPIs/ISO module
(`useCarpetas`, `useArchivos`) is plain promise-returning functions driven by
`onMounted`/`watch` in the page — no caching. Match whichever the surrounding module uses.

**Listing composables** (`use*Listado.ts`) are pure client-side view state over an already
fetched array: search + filters + pagination (`PAGE_SIZE = 10`), with watchers that reset to
page 1 on filter change and clamp an out-of-range page. Everything is filtered in memory —
there is no server-side pagination.

**Forms.** `schemas/*.schema.ts` (Zod) + vee-validate via `@vee-validate/zod`.
`plugins/vee-validate.ts` disables blur/change/input/model validation on purpose: fields only
validate on `handleSubmit`, then revalidate on change. Don't re-enable it per-form.

**Label generation is asynchronous.** `useGenerarEtiqueta` POSTs `/etiquetas/generar`, gets a
`trabajoId` back immediately (state `PENDIENTE`), then polls `GET /etiquetas/trabajos/:id`
every 1.5s up to 30s until the local print agent reports `IMPRESO` or `ERROR`.

**Response shape is inconsistent.** Most endpoints return the payload directly
(`const { data } = await api.get<Producto[]>(...)`), but `/usuarios/me` is wrapped —
`useUsuarioActual` reads `data.data`. Check the backend before assuming.

**Cotizaciones (`pages/cotizaciones/`) — marcar vs. corregir.** `requerimientoEn`,
`cotizacionEnviadaEn`, `pedidoAprobadoEn`, `avisoAlmacenEn` all follow the backend's audit policy
(see backend `CLAUDE.md`): the first mark always uses server time, so `CotizacionForm.vue` doesn't
even ask for `requerimientoEn` anymore, and `CotizacionFechaDialog.vue`/`CotizacionEnviarDialog.vue`
only show an editable date + a required `motivo` textarea when `esCorreccion` (the field already
has a value) — otherwise it's a static "se va a registrar con la hora actual" message. The "Corregir
…" menu items in `pages/cotizaciones/index.vue` are gated by `esAdmin`, matching the backend's
`ForbiddenException` for non-admins. Each `Cotizacion` carries `alertas` (integrity flags —
feriado/ausencia/carga tardía, shown as warnings, never hidden) and `historial` (immutable audit
trail) from the backend — both are rendered in the detail dialog and (for alerts) as a banner in
`pages/cotizaciones/indicadores.vue`. `pages/ausencias/index.vue` is an admin-only registry feeding
the ausencia check.

**PDF viewing** uses `pdfjs-dist` with the worker imported as a Vite URL
(`pdfjs-dist/build/pdf.worker.min.mjs?url`) — see `composables/usePdfViewer.ts`, rendered by
`components/pdf/VisorPdf.vue`. It cancels the in-flight `renderTask` before each re-render and
swallows `RenderingCancelledException`.

**Excel export** is `useXlsxExport` in `composables/useCsvExport.ts` (ExcelJS, despite the
filename): generic `XlsxColumn<T>[]` with a `key` that may be a field name or an accessor
function, optional `colorFill` per cell, styled header/zebra rows, and a `requestAnimationFrame`
progress animation surfaced through `components/ui/ProgressBar.vue`.

**PDF export** (the three `pages/*/indicadores.vue` dashboards — `cotizaciones`, `pedidos`,
`historial`) is `usePdfExport` (`composables/usePdfExport.ts`, same animated-progress pattern as
the Excel export above) driving `construirReportePdf` (`utils/reportePdf.ts`, jsPDF +
`jspdf-autotable`): a cover with KPIs/filters, one section per `SeccionReporte` (banner + KPI
table + chart images + optional data table), then one landscape page per `HojaReporte` detail
table, reusing the same `Reporte`/`SeccionReporte`/`HojaReporte` shapes each page already builds
for the Excel export (`utils/reporteIndicadores.ts`) — only the renderer differs. **jsPDF +
jspdf-autotable are ~930KB minified**, so every page imports `reportePdf.ts` with a dynamic
`await import("~/utils/reportePdf")` inside the export handler, never as a static top-level
import — that keeps the dashboard's own chunk light and only pulls jsPDF in when the user
actually clicks "Exportar PDF". Keep new PDF-export call sites lazy the same way.

## UI conventions

- shadcn-nuxt (new-york style, neutral base, CSS variables) generates into
  `app/components/ui/`; config in `components.json`. Nuxt auto-imports components, so `ui/`
  primitives are usually used without an explicit import while feature components and
  composables are imported explicitly with `~/` or `@/`.
- Icons come from **both** `@lucide/vue` and `lucide-vue-next` depending on the file; check the
  neighbours before adding an import.
- Toasts: `vue-sonner`. `write-sonner.ps1` at repo root is a one-off script that overwrites
  `app/components/ui/sonner/Sonner.vue` (it pins the icon set to `@lucide/vue-next`) — re-run it
  if a shadcn regeneration clobbers that file.
- Layouts: `default.vue` (sidebar shell, implicit) and `auth.vue`, opted into with
  `definePageMeta({ layout: 'auth' })` on the three public pages.
- `cn()` from `lib/utils.ts` for class merging.
- Scrolling: use shadcn's `ScrollArea` (needs a definite height from its ancestors — `min-h-0`
  on flex/grid items). Where it can't work (dialogs that hug short content and only cap at a
  `max-h`), use native overflow plus the `.scroll-tema` class from `tailwind.css`. `ui/table`
  keeps native horizontal scroll (themed) so sticky headers keep working.
- A `ScrollArea` inside a `DialogContent` (a grid) needs `min-w-0`; Reka's inner wrapper also
  carries an inline `min-width: fit-content`, which `Crearusuario.vue` overrides so long text
  wraps instead of pushing the form wider than the dialog.

## Legal pages, consent and accessibility

Public legal pages `/privacidad`, `/seguridad`, `/cookies` (layout `legal.vue`, `PieLegal.vue` footer in every
layout) are listed in `rutasPublicas` in `auth.global.ts`. Their text describes what the system really does
(Ley 29733, Peru) — **update them whenever data collection, providers or storage change** (a new analytics tool
needs consent first). Company data (RUC, domicilio, correo de privacidad) lives in `app/config/empresa.ts`; empty
fields are simply not shown, so fill them in before relying on the pages. The client form records the
authorization to use contact data (`Cliente.autorizaContactoEn`, required in the schema when celular/correo is
filled). No cookies are set and no third-party assets are loaded (fonts are NOT fetched from Google); keep it so.
Icon-only buttons need `aria-label`, search inputs/selects without a visible label need `aria-label`, and text
colors must keep >= 4.5:1 (`--muted-foreground` was darkened for this; avoid `text-muted-foreground/NN` on text).
