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
```

There is **no lint, no typecheck, and no test runner** installed (no eslint, no vue-tsc, no
vitest/jest). `npm run build` is the only mechanical verification available — don't tell the
user to run `npm test` or `npm run lint`.

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
@contexto-fase3-kpis-iso.md — it is the source of truth for that module's decisions, its
granular access model, and its open questions. Much of what it describes (notably the
`esAdminKpis` role and the 5-boolean permission redesign) is **decided but not implemented**;
the code currently on disk still uses the older `LECTURA`/`ESCRITURA` +
`VISUALIZACION`/`EDICION_TOTAL` levels. Check the doc before assuming either model.

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
Note `useUsuarioActual.reset()` exists but is not wired to logout — a cached `usuarioActual`
can survive a user switch.

**Two parallel permission systems.** Do not conflate them:

1. *CRUD permisos* — `utils/permisos.ts` holds `RECURSOS`
   (`LOTES`, `PRODUCTOS`, `FABRICANTES`, `PLANTILLAS`, `COA`, `USUARIOS`, `ETIQUETAS`) × four
   booleans (`puedeVer`/`puedeCrear`/`puedeEditar`/`puedeEliminar`). This file must mirror the
   backend's `Recurso` enum (`usuarios.dto.ts`); adding a recurso there means adding it here.
   `usePermiso('RECURSO')` returns a reactive object with `esAdmin` bypass baked in.
2. *KPIs/ISO accesos* — `useAccesoKpisIso()` resolves per-folder access from
   `usuarioActual.accesosIndicador` (per `ProcesoIndicador`) and `accesoIso`. Hardcoded rules
   mirror the backend: ISO `tipo === 'OBSOLETO'` folders need `EDICION_TOTAL`, and a non-admin
   can never delete an ISO PDF.

Gating a new route means touching **three** places: the `RUTA_PERMISO` table in
`middleware/permisos.global.ts` (route prefix → recurso + nivel; unlisted routes are free),
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

**PDF viewing** uses `pdfjs-dist` with the worker imported as a Vite URL
(`pdfjs-dist/build/pdf.worker.min.mjs?url`) — see `composables/usePdfViewer.ts`, rendered by
`components/pdf/VisorPdf.vue`. It cancels the in-flight `renderTask` before each re-render and
swallows `RenderingCancelledException`.

**Excel export** is `useXlsxExport` in `composables/useCsvExport.ts` (ExcelJS, despite the
filename): generic `XlsxColumn<T>[]` with a `key` that may be a field name or an accessor
function, optional `colorFill` per cell, styled header/zebra rows, and a `requestAnimationFrame`
progress animation surfaced through `components/ui/ProgressBar.vue`.

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

## Repo hygiene

`4000/` at the repo root is a stray directory created by a mistyped command (it contains only
an empty `node_modules`) — it is not part of the build; leave it alone unless asked to clean up.
