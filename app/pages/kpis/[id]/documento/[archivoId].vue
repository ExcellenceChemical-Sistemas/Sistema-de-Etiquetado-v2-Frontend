<!-- pages/kpis/[id]/documento/[archivoId].vue -->
<script setup lang="ts">
import { ArrowLeft } from "@lucide/vue";
import Spinner from "~/components/ui/Spinner.vue";
import VisorPdf from "~/components/pdf/VisorPdf.vue";
import VisorWord from "~/components/documentos/VisorWord.vue";
import { useAccesoKpisIso } from '~/composables/useAccesoKpisIso'
import type { Archivo, NodoRuta } from '~/composables/useCarpetas'

const route = useRoute()
const carpetaId = computed(() => Number(route.params.id))
const archivoId = computed(() => Number(route.params.archivoId))

const { listarContenido, obtenerRuta } = useCarpetas()
const { obtenerUrl } = useArchivos()
const { cargar: cargarUsuarioActual } = useUsuarioActual()
const { puedeVerArchivo, puedeDescargarArchivo, esPdfIso } = useAccesoKpisIso()

const contenido = ref<Awaited<ReturnType<typeof listarContenido>> | null>(null)
const archivo = ref<Archivo | null>(null)
// Cadena de ancestros: la necesita useAccesoKpisIso para resolver Obsoleto
// heredado igual que lo hace el backend. Acá no se dibuja breadcrumb, se pide
// solo para eso.
const ruta = ref<NodoRuta[]>([])
const url = ref<string | null>(null)
const cargando = ref(true)
const error = ref(false)
/**
 * 403 del backend: no hay acceso a esta carpeta/documento. Igual que en
 * pages/kpis/[id]/index.vue, va aparte de `error` porque no es red ni sesión
 * vencida y el mensaje genérico manda a investigar donde no hay nada.
 */
const denegado = ref(false)

const volverA = computed(() => `/kpis/${carpetaId.value}`)

async function cargar() {
  cargando.value = true
  error.value = false
  denegado.value = false
  url.value = null
  archivo.value = null
  ruta.value = []
  try {
    // el guard depende de usuarioActual, así que se pide en paralelo
    const [c, r] = await Promise.all([
      listarContenido(carpetaId.value),
      obtenerRuta(carpetaId.value),
      cargarUsuarioActual(),
    ])
    contenido.value = c
    ruta.value = r
    archivo.value = c.archivos.find((a) => a.id === archivoId.value) ?? null
  } catch (e: any) {
    // sin esto, un 401 o el backend caído dejaban cargando en true para
    // siempre y la pantalla se quedaba en el esqueleto, sin explicación
    console.error('Error cargando el documento:', e)
    // Entrar por URL a un documento sin permiso da 403 en el guard de la
    // carpeta, así que nunca llega a haber `archivo` y el chequeo local de
    // accesoOk no alcanza: hay que enterarse por el status.
    if (e?.response?.status === 403) {
      denegado.value = true
    } else {
      error.value = true
    }
    // nada de la carga anterior debe sobrevivir a una fallida
    contenido.value = null
    archivo.value = null
    ruta.value = []
    url.value = null
  } finally {
    cargando.value = false
  }
}

watch([carpetaId, archivoId], cargar, { immediate: true })

// --- Guard: el mismo puedeVerArchivo que filtra la tabla en la carpeta ---
// Sin `!denegado`, un 403 (que deja `archivo` en null) caía acá y mostraba
// "Documento no encontrado", porque esta card va antes que la de sin acceso.
const noEncontrado = computed(
  () => !cargando.value && !denegado.value && !archivo.value,
)

/** Tipos con visor propio en esta ruta. Excel y PowerPoint se descargan. */
const TIPOS_CON_VISOR = ['PDF', 'WORD'] as const

const esPdf = computed(() => archivo.value?.tipo === 'PDF')

const tipoNoSoportado = computed(
  () =>
    !!archivo.value &&
    !TIPOS_CON_VISOR.includes(archivo.value.tipo as (typeof TIPOS_CON_VISOR)[number]),
)

const accesoOk = computed(() => {
  if (!contenido.value || !archivo.value || tipoNoSoportado.value) return false
  const carpeta = contenido.value.carpeta
  if (!puedeVerArchivo(archivo.value, carpeta, ruta.value)) return false
  // Ver un Word implica bajarle los bytes al navegador, así que exige lo mismo
  // que la tabla en la carpeta: puedeDescargar. El PDF va por el visor propio.
  return esPdfIso(archivo.value, carpeta) || puedeDescargarArchivo(archivo.value, carpeta, ruta.value)
})

// Dos caminos hasta el mismo cartel: el 403 del backend (deep-link, sin
// archivo) y el chequeo local sobre un archivo que sí llegó.
const sinAcceso = computed(
  () =>
    denegado.value ||
    (!cargando.value &&
      !!archivo.value &&
      !tipoNoSoportado.value &&
      !accesoOk.value),
)

/**
 * La URL firmada se pide recién cuando el guard da OK — entrar por URL sin
 * acceso no llega ni a generarla. Va en un watch y no dentro de cargar()
 * porque usuarioActual puede resolver después, y ahí el acceso pasa de false
 * a true sin que cambien los params.
 */
watch(
  accesoOk,
  async (ok) => {
    if (!ok || url.value) return
    try {
      url.value = await obtenerUrl(archivoId.value)
    } catch (e: any) {
      // mismo motivo que en cargar(): si esto falla sin atajar, el visor se
      // queda con el spinner puesto y sin manera de reintentar
      console.error('Error obteniendo la URL del documento:', e)
      // El backend revalida el archivo por su cuenta (regla por tipo en ISO,
      // regla dura de PDFs): si él dice 403, es falta de permiso, no red.
      if (e?.response?.status === 403) {
        denegado.value = true
      } else {
        error.value = true
      }
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 p-4 lg:p-6">
    <div class="flex shrink-0 items-center gap-3">
      <Button variant="ghost" size="icon" title="Volver" as-child>
        <NuxtLink :to="volverA">
          <ArrowLeft class="h-4 w-4" />
        </NuxtLink>
      </Button>
      <h1 class="truncate pr-8 text-lg font-semibold">
        {{ archivo?.nombre ?? "Documento" }}
      </h1>
    </div>

    <Separator class="shrink-0" />

    <div v-if="cargando" class="flex flex-1 items-center justify-center">
      <Spinner class="h-6 w-6" />
    </div>

    <Card
      v-else-if="error"
      class="shrink-0 border-destructive/40 bg-destructive/5"
    >
      <CardHeader>
        <CardTitle class="text-base text-destructive">
          No se pudo cargar el documento
        </CardTitle>
        <CardDescription>
          Revisá tu conexión y volvé a intentar. Si el problema sigue, puede que
          tu sesión haya expirado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" @click="cargar()">
          Reintentar
        </Button>
      </CardContent>
    </Card>

    <Card
      v-else-if="noEncontrado"
      class="shrink-0 border-destructive/40 bg-destructive/5"
    >
      <CardHeader>
        <CardTitle class="text-base text-destructive">
          Documento no encontrado
        </CardTitle>
        <CardDescription>
          El documento no existe o fue eliminado de esta carpeta.
        </CardDescription>
      </CardHeader>
    </Card>

    <Card v-else-if="tipoNoSoportado" class="shrink-0">
      <CardHeader>
        <CardTitle class="text-base">Este documento no se ve acá</CardTitle>
        <CardDescription>
          El visor en línea es para PDF y Word. Excel y PowerPoint se descargan
          desde la carpeta.
        </CardDescription>
      </CardHeader>
    </Card>

    <Card
      v-else-if="sinAcceso"
      class="shrink-0 border-destructive/40 bg-destructive/5"
    >
      <CardHeader>
        <CardTitle class="text-base text-destructive">Sin acceso</CardTitle>
        <CardDescription>
          No tienes acceso a este documento. Si creés que es un error, pedile al
          administrador que revise tus accesos de KPIs / ISO.
        </CardDescription>
      </CardHeader>
    </Card>

    <div
      v-else
      class="min-h-0 flex-1 overflow-hidden rounded-md border border-border"
    >
      <div
        v-if="!url"
        class="flex h-full items-center justify-center"
      >
        <Spinner class="h-6 w-6" />
      </div>
      <VisorPdf v-else-if="esPdf" :url="url" />
      <VisorWord v-else :url="url" />
    </div>
  </div>
</template>
