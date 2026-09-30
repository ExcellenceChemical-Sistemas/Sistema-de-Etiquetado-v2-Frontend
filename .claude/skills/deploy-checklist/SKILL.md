---
name: deploy-checklist
description: Flujo estándar para llevar un cambio de código a producción en cualquiera de los tres repos de Excellence Chemical (backend NestJS/Render, frontend Nuxt/Cloudflare, agente-impresion). Usar cuando el usuario pide "commitear", "pushear", "desplegar" o "subir" un cambio, o cuando un cambio ya implementado está listo para salir. Dispara con "hacé el commit", "pusheá", "desplegá esto", "subilo a producción".
metadata:
  author: excellence-chemical
  version: "1.0"
---

# Checklist de despliegue

Procedimiento fijo para pasar un cambio de código local a producción, en cualquiera
de los tres repos (`Sistema-de-Etiquetado-v2-Backend`, `Sistema-de-Etiquetado-v2-Frontend`,
`agente-impresion`). El objetivo es no saltarse pasos por apuro y no pushear nunca sin
que el usuario lo haya confirmado explícitamente para ESE cambio puntual.

## Regla de oro (no negociable)

**Nunca hacer `git push` sin una confirmación explícita del usuario, para ese commit
específico.** Una confirmación anterior ("sí, pusheá" de un cambio previo) no vale para
el siguiente. Si el usuario pide "hacé el commit y pusheá" en el mismo mensaje, ambas
acciones ya están autorizadas — no hace falta preguntar de nuevo — pero si solo pidió
el commit, hay que parar y preguntar antes de pushear.

## Pasos

1. **Verificar en limpio antes de tocar git.**
   - Backend: `npm run build` (Nest) — debe compilar sin errores. Si el cambio toca
     lógica con tests existentes, correr también esos tests puntuales.
   - Frontend: `npm run build` (o `npm run generate` si el flujo de turno lo requiere,
     pero ver nota de Cloudflare abajo) — sin errores de tipos ni de build.
   - agente-impresion: verificar que compila/corre si aplica (Windows-only, algunas
     verificaciones solo se pueden confirmar corriéndolo en la máquina real).
   - Si falla la verificación, arreglar antes de seguir — no commitear código roto.

2. **Mostrar el diff resumido y pedir confirmación del commit.**
   - Explicar en una frase qué cambió y por qué.
   - Redactar el mensaje de commit en español, en el estilo ya usado en estos repos
     (línea de asunto corta y descriptiva, sin prefijos tipo "feat:"/"fix:").
   - Esperar un sí explícito antes de correr `git commit`.

3. **Pedir confirmación del push, por separado.**
   - Aunque el commit ya esté hecho, no asumir que el usuario quiere subirlo ya.
   - Preguntar algo como "¿pusheo?" y esperar confirmación explícita.
   - Nunca pushear directo a `main` si el repo usa ramas de feature para este tipo de
     cambio — pero en estos tres repos el flujo habitual es commitear directo a `main`
     salvo que el usuario indique lo contrario.

4. **Después del push, verificar que el despliegue automático levantó bien.**
   - Backend (Render): esperar el deploy y pegar `curl` al endpoint de salud
     (`GET /api/salud` o el que exponga el proyecto) confirmando `{"ok":true,"db":true}`
     o equivalente. Revisar logs de Render si el deploy falla.
   - Frontend (producción: `https://gestion.excellencechemical.workers.dev`): el push
     **no** despliega solo — hay que generar y subir a mano (ver nota de Cloudflare
     abajo). Después, confirmar que `/_nuxt/builds/latest.json` trae el `id`/`timestamp`
     del build recién generado (si sigue el viejo, el deploy no salió), abrir el sitio con
     el browser de este harness y revisar CORS con un `fetch` real a `/api/salud` desde
     ese origen (no confiar en mensajes de consola cacheados de una carga anterior).
   - agente-impresion: no tiene despliegue automático — los cambios se llevan a la
     máquina con la impresora manualmente; avisar al usuario que ese paso queda
     pendiente de su lado si el cambio afecta a ese repo.

5. **Reportar el resultado tal cual, sin adornar.**
   - Si el deploy quedó sano: decir explícitamente que se verificó (con el dato
     concreto, ej. el JSON de salud o la captura/lectura de la página).
   - Si algo falló o quedó pendiente de verificar manualmente (ej. agente-impresion,
     o algo que requiere que el usuario pruebe con su usuario real): decirlo así,
     no dar por sentado que funciona.

## Notas específicas de este workspace

- **CORS multi-origen durante migraciones**: el backend lee `FRONTEND_URLS` (variable
  en plural, separada por comas) además de `FRONTEND_URL` (singular, legado). Si hay
  dos frontends live a la vez (ej. Vercel + Cloudflare durante una migración), ambos
  orígenes tienen que estar en `FRONTEND_URLS` en Render — confirmar con el usuario si
  ya lo actualizó ahí, porque esa variable no la edito yo directamente.
- **Cloudflare Workers (frontend, producción)**: el Worker `gestion` es un sitio estático
  (SPA, `ssr:false`) sin script propio — ver `wrangler.jsonc`. **No hay build automático
  en Cloudflare al pushear**: se despliega a mano desde la máquina del usuario, que tiene
  `wrangler` autenticado:
  1. `npm run generate` (no `npm run build`: `build` no deja `index.html`/`200.html` en
     `.output/public`, que es lo que sirve el Worker).
  2. Verificar antes de subir: `.output/public/index.html` tiene
     `apiBase:"https://chemical-backend-fk8r.onrender.com/api"` (las `NUXT_PUBLIC_*` se
     hornean en build desde el `.env` local; si apunta a localhost, no desplegar).
  3. `npx wrangler deploy` desde la raíz del repo frontend.
  El "súbelo a producción" del usuario cubre este deploy junto con el push.
- **Vercel (frontend, legado)**: `excellencechemical.vercel.app` ya no es producción y su
  origen no está en `FRONTEND_URLS`, así que ahí el login falla por CORS. Un check verde de
  Vercel en GitHub **no** significa que producción se haya actualizado.
- **Secretos**: nunca leo ni escribo variables de entorno reales (Render, Cloudflare,
  `.env`) — solo indico al usuario qué valor cargar y dónde, y confirmo el resultado
  con verificación externa (curl, browser), nunca pidiéndole que me pegue el valor.
- **Base de datos compartida de producción**: si el cambio incluye una migración de
  Prisma, avisar antes y sugerir backup, igual que con cualquier otro cambio de schema.
