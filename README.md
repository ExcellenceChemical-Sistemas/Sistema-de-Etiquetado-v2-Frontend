# Sistema de Etiquetado v2 — Frontend

Aplicación web (panel administrativo) construida con **Nuxt** para el Sistema de Etiquetado de productos fraccionados. Permite gestionar fabricantes, productos, lotes, usuarios/permisos y generar etiquetas, consumiendo la API del backend NestJS.

## Stack

- **Nuxt 4.5.2** (Vue 3.5, TypeScript 5.9.3)
- **Supabase JS 2.112.4** para sesión/autenticación (login, recuperación de contraseña) — el backend valida el mismo token
- **Axios 1.19** (`useApi`) como cliente HTTP hacia el backend, con interceptor que agrega el JWT de Supabase a cada request
- **shadcn-nuxt 2.8.2** (componentes en `components/ui/`, sobre **Reka UI 2.10.4**) + **Tailwind CSS 4.3.3** (`@tailwindcss/vite`)
- **Pinia 4.0.3** (`@pinia/nuxt`) para estado global
- **Zod 3.25.76** + **vee-validate 4.15.1** (`@vee-validate/zod`) para validación de formularios (configurado para validar recién al enviar, no en cada blur)
- **@tanstack/vue-query 5.101.4** (plugin `vue-query`) para manejo de datos/caché de las llamadas a la API
- **ExcelJS 4.4.0** para las exportaciones a Excel (`useCsvExport.ts` / `useXlsxExport`)
- `@lucide/vue` / `lucide-vue-next` para íconos, `vue-sonner` para toasts, `@vueuse/core` (`@vueuse/nuxt`) como utilidades composable
- Esquemas de validación por entidad en `app/schemas/` (etiqueta, fabricante, lote, producto)

## Estructura del proyecto

```
app/
├── app.vue
├── assets/css/tailwind.css
├── components/
│   ├── AppSidebar.vue / NavUser.vue / ModeToggle.vue
│   ├── ComboboxBuscador.vue / Searchcombobox.vue / LoteCombobox.vue
│   ├── admin/           # Crearusuario.vue, Editarpermisos.vue, Permisosgrid.vue
│   ├── fabricantes/     # FabricanteForm.vue, FabricantesFiltroBar.vue
│   ├── lotes/                # LoteForm.vue, Lotesfiltrobar.vue, Vencimientobadge.vue
│   ├── mi-cuenta/         # AvatarUploader.vue
│   ├── productos/       # ProductoForm.vue, ProductosFiltroBar.vue, NfpaBadge.vue
│   └── ui/                    # librería shadcn-nuxt (Reka UI)
│       ├── ProgressBar.vue, Spinner.vue
│       ├── avatar/, badge/, button/, card/, checkbox/, dialog/
│       ├── dropdown-menu/, input/, label/, pagination/, scroll-area/
│       ├── select/, separator/, sheet/, sidebar/, skeleton/, sonner/
│       ├── table/, tooltip/
├── composables/
│   ├── useApi.ts / useAuth.ts / usePermiso.ts / useAvatar.ts / useCsvExport.ts
│   ├── useFabricantes.ts / useFabricantesListado.ts
│   ├── useLotes.ts / useloteslistado.ts
│   ├── useProductos.ts / useProductosListado.ts
│   ├── usePlantillas.ts / useEtiquetas.ts
│   └── useUsuarioActual.ts
├── layouts/
│   ├── default.vue      # con sidebar, para páginas autenticadas
│   └── auth.vue             # páginas públicas (login, recuperar contraseña)
├── lib/utils.ts
├── middleware/
│   ├── auth.global.ts       # protección de rutas
│   └── permisos.global.ts   # permisos por ruta
├── pages/
│   ├── index.vue / login.vue / mi-cuenta.vue
│   ├── generar-etiqueta.vue / historial.vue
│   ├── fabricantes/index.vue
│   ├── lotes/index.vue
│   ├── productos/index.vue
│   ├── olvide-password.vue / restablecer-password.vue
│   └── usuarios/index.vue, usuarios/[id].vue
├── plugins/
│   ├── vee-validate.ts
│   └── vue-query.ts
├── schemas/              # etiqueta.schema.ts, fabricante.schema.ts, lote.schema.ts, producto.schema.ts
├── types/                  # fabricante.ts, lote.ts, plantilla.ts, producto.ts
└── utils/
    ├── supabase.client.ts
    ├── permisos.ts
    └── fechavencimiento.ts
```

## Autenticación y permisos

- `useAuth` centraliza la sesión de Supabase (login, logout, reset/actualización de contraseña) mediante un `ref` compartido.
- `middleware/auth.global.ts` redirige a `/login` si no hay sesión (excepto en rutas públicas: `/login`, `/olvide-password`, `/restablecer-password`), y de `/login` a `/` si ya hay sesión.
- `middleware/permisos.global.ts` aplica las restricciones de acceso por rol/permiso definidas en `utils/permisos.ts`, en línea con el sistema de permisos granulares del backend.
- Cada request al backend (`useApi`) adjunta automáticamente el `access_token` de la sesión de Supabase como `Bearer` token.

## Variables de entorno

El proyecto usa `useRuntimeConfig().public`, así que las variables se definen como `NUXT_PUBLIC_*` en `.env` (mapeo por convención de Nuxt):

```env
NUXT_PUBLIC_API_BASE=http://localhost:3000     # URL base del backend NestJS
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
```

> Nota: confirma en `nuxt.config.ts` (no incluido aún) que `runtimeConfig.public` mapea estas mismas claves (`apiBase`, `supabaseUrl`, `supabaseAnonKey`); no se pudo verificar el nombre exacto porque ese archivo todavía no se compartió.

## Instalación y ejecución

```bash
# instalar dependencias (postinstall corre "nuxt prepare" automáticamente)
npm install

# desarrollo — corre en el puerto 3001 (nuxt dev --port 3001)
npm run dev

# build de producción
npm run build

# generar sitio estático (si aplica)
npm run generate

# previsualizar el build — también en el puerto 3001
npm run preview
```

## Notas

- El frontend corre fijo en el puerto **3001** (`--port 3001` en `dev` y `preview`); el backend tiene CORS habilitado justamente para `http://localhost:3000` y `http://localhost:3001`.
- La vista "Mi cuenta" (`pages/mi-cuenta.vue`, composable `useAvatar`) permite subir/cambiar la foto de perfil.
- `usePermiso` expone helpers para mostrar/ocultar acciones de UI según el permiso del usuario sobre cada recurso (fabricantes, productos, lotes, plantillas).
