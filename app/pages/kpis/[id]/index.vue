<!-- pages/kpis/[id].vue -->
<script setup lang="ts">
import {
  Folder,
  FileText,
  FileSpreadsheet,
  Presentation,
  Eye,
  Download,
  Trash2,
  Upload,
  ChevronRight,
} from "@lucide/vue";
import Spinner from "~/components/ui/Spinner.vue";
import { useAccesoKpisIso } from '~/composables/useAccesoKpisIso'
import type { Archivo, NodoRuta, TipoArchivoDocumento } from '~/composables/useCarpetas'

const route = useRoute()
const carpetaId = computed(() => Number(route.params.id))

const { listarContenido, obtenerRuta } = useCarpetas()
const { subir, eliminar, obtenerUrl } = useArchivos()
const {
  puedeVerCarpeta,
  puedeAdjuntarEnCarpeta,
  puedeVerArchivo,
  puedeDescargarArchivo,
  puedeEliminarArchivo,
  esPdfIso,
} = useAccesoKpisIso()

const contenido = ref<Awaited<ReturnType<typeof listarContenido>> | null>(null)
// `ruta` es a la vez el breadcrumb y la cadena de ancestros que necesita
// useAccesoKpisIso para detectar Obsoleto heredado (ya incluye la carpeta
// actual como último elemento, igual que obtenerCadena() en el backend).
const ruta = ref<NodoRuta[]>([])
const cargando = ref(true)
const error = ref(false)
/**
 * 403 del backend: el usuario no tiene acceso a esta carpeta. Va separado de
 * `error` porque no es una falla de red ni una sesión vencida, y el mensaje
 * genérico ("revisá tu conexión") manda a investigar donde no hay nada.
 */
const denegado = ref(false)
const subiendo = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

async function cargar() {
  cargando.value = true
  error.value = false
  denegado.value = false
  try {
    const [c, r] = await Promise.all([
      listarContenido(carpetaId.value),
      obtenerRuta(carpetaId.value),
    ])
    contenido.value = c
    ruta.value = r
  } catch (e: any) {
    // sin esto, un 401 o el backend caído dejaban cargando en true para
    // siempre y la pantalla se quedaba en el esqueleto, sin explicación
    console.error('Error cargando la carpeta:', e)
    // Entrar por URL a una carpeta sin permiso da 403 en el guard, así que
    // nunca llega a haber `contenido` y el chequeo local de sinAcceso no
    // alcanza: hay que enterarse por el status.
    if (e?.response?.status === 403) {
      denegado.value = true
    } else {
      error.value = true
    }
    // el contenido de la carpeta anterior no debe sobrevivir a una carga fallida
    contenido.value = null
    ruta.value = []
  } finally {
    cargando.value = false
  }
}

watch(carpetaId, cargar, { immediate: true })

// --- Permisos derivados de la carpeta actual ---
// Dos caminos hasta el mismo cartel: el 403 del backend (deep-link, sin
// contenido) y el chequeo local sobre una carpeta que sí llegó.
const sinAcceso = computed(
  () =>
    denegado.value ||
    (contenido.value ? !puedeVerCarpeta(contenido.value.carpeta, ruta.value) : false),
)

const puedeSubirAqui = computed(() =>
  contenido.value ? puedeAdjuntarEnCarpeta(contenido.value.carpeta, ruta.value) : false
)

// La cadena de una subcarpeta es exactamente `ruta`: los ancestros de la
// carpeta actual más ella misma.
const subcarpetasVisibles = computed(() =>
  contenido.value?.subcarpetas.filter((c) => puedeVerCarpeta(c, ruta.value)) ?? []
)

/**
 * Defensa en profundidad: el backend ya debería no devolver estos archivos en
 * GET /carpetas/:id, pero si los devuelve no mostramos ni el nombre.
 */
const archivosVisibles = computed(() => {
  if (!contenido.value) return []
  const carpeta = contenido.value.carpeta
  return contenido.value.archivos.filter((a) => puedeVerArchivo(a, carpeta, ruta.value))
})

/** PDF y Word tienen visor propio; Excel y PowerPoint se descargan. */
function tieneVisor(archivo: Archivo) {
  return archivo.tipo === 'PDF' || archivo.tipo === 'WORD'
}

/**
 * Excel y PowerPoint solo se pueden abrir descargándolos, así que ahí "ver" y
 * "descargar" son la misma acción y hacen falta los dos flags. El Word ahora
 * tiene visor, pero igual le baja los bytes al navegador, así que mantiene el
 * requisito de puedeDescargar. Solo el PDF queda exento.
 */
function puedeAbrirArchivo(archivo: Archivo) {
  if (!contenido.value) return false
  const carpeta = contenido.value.carpeta
  if (!puedeVerArchivo(archivo, carpeta, ruta.value)) return false
  return esPdfIso(archivo, carpeta) || puedeDescargarArchivo(archivo, carpeta, ruta.value)
}

const vacia = computed(
  () => !subcarpetasVisibles.value.length && !archivosVisibles.value.length,
)

// --- Presentación de archivos ---
const TIPO_LABEL: Record<TipoArchivoDocumento, string> = {
  PDF: 'PDF',
  WORD: 'Word',
  EXCEL: 'Excel',
  POWERPOINT: 'PowerPoint',
}

const TIPO_ICONO = {
  PDF: FileText,
  WORD: FileText,
  EXCEL: FileSpreadsheet,
  POWERPOINT: Presentation,
}

function formatFecha(fecha?: string | null): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

async function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  subiendo.value = true
  try {
    await subir(carpetaId.value, file)
    await cargar()
  } finally {
    subiendo.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function verArchivo(archivo: Archivo) {
  if (!contenido.value) return
  const carpeta = contenido.value.carpeta
  if (!puedeVerArchivo(archivo, carpeta, ruta.value)) return

  // Excel y PowerPoint: descarga directa, sin cambios.
  if (!tieneVisor(archivo)) {
    if (!puedeDescargarArchivo(archivo, carpeta, ruta.value)) return
    const url = await obtenerUrl(archivo.id)
    window.open(url, '_blank')
    return
  }

  // Acá solo llegan PDF y Word. Solo el PDF de ISO está exento: su signed URL
  // alimenta el visor propio. Todo lo demás (el Word de cualquier módulo, y el
  // PDF que vive en una carpeta KPIS) le baja los bytes al navegador igual que
  // una descarga, así que exige puedeDescargar — mismo criterio que el backend.
  if (!esPdfIso(archivo, carpeta) && !puedeDescargarArchivo(archivo, carpeta, ruta.value)) return

  // PDF y Word: visor propio en pantalla completa, sin controles nativos de
  // imprimir/descargar. La ruta revalida el acceso por su cuenta.
  navigateTo(`/kpis/${carpetaId.value}/documento/${archivo.id}`)
}

async function eliminarArchivo(archivoId: number) {
  if (!confirm('¿Eliminar este documento?')) return
  await eliminar(archivoId)
  await cargar()
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <!-- Breadcrumb -->
    <nav
      class="flex shrink-0 flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
    >
      <NuxtLink to="/kpis" class="hover:text-foreground hover:underline">
        Raíz
      </NuxtLink>
      <template v-for="(paso, i) in ruta" :key="paso.id">
        <ChevronRight class="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        <NuxtLink
          :to="`/kpis/${paso.id}`"
          class="hover:underline"
          :class="
            i === ruta.length - 1
              ? 'text-foreground font-medium'
              : 'hover:text-foreground'
          "
        >
          {{ paso.nombre }}
        </NuxtLink>
      </template>
    </nav>

    <Separator class="shrink-0" />

    <!-- Cargando -->
    <div v-if="cargando" class="space-y-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <Card v-for="n in 3" :key="n">
          <CardHeader>
            <div class="flex items-center gap-3">
              <Skeleton class="h-8 w-8 rounded-md" />
              <Skeleton class="h-4 w-32" />
            </div>
          </CardHeader>
        </Card>
      </div>
      <div class="rounded-md border border-border">
        <Table>
          <TableBody>
            <TableRow v-for="n in 3" :key="n">
              <TableCell><Skeleton class="h-4 w-64" /></TableCell>
              <TableCell><Skeleton class="h-4 w-20" /></TableCell>
              <TableCell><Skeleton class="h-4 w-24" /></TableCell>
              <TableCell class="text-right">
                <Skeleton class="ml-auto h-4 w-12" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <!-- Error de carga -->
    <Card
      v-else-if="error"
      class="shrink-0 border-destructive/40 bg-destructive/5"
    >
      <CardHeader>
        <CardTitle class="text-base text-destructive">
          No se pudo cargar la carpeta
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

    <!-- Sin acceso -->
    <Card v-else-if="sinAcceso" class="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle class="text-base text-destructive">Sin acceso</CardTitle>
        <CardDescription>
          No tienes acceso a esta carpeta. Si creés que es un error, pedile al
          administrador que revise tus accesos de KPIs / ISO.
        </CardDescription>
      </CardHeader>
    </Card>

    <template v-else-if="contenido">
      <!-- Subir documento: solo si puede adjuntar en esta carpeta -->
      <Card v-if="puedeSubirAqui" class="shrink-0">
        <CardHeader class="pb-3">
          <CardTitle class="flex items-center gap-2 text-base">
            <Upload class="h-4 w-4 text-muted-foreground" />
            Subir documento
          </CardTitle>
          <CardDescription>
            PDF, Word, Excel o PowerPoint.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-3">
            <input
              ref="fileInput"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              :disabled="subiendo"
              class="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted disabled:opacity-50"
              @change="onFileSelected"
            />
            <span
              v-if="subiendo"
              class="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <Spinner class="h-3.5 w-3.5" />
              Subiendo…
            </span>
          </div>
        </CardContent>
      </Card>

      <!-- Carpeta vacía -->
      <Card v-if="vacia" class="shrink-0">
        <CardHeader>
          <CardDescription>Carpeta vacía.</CardDescription>
        </CardHeader>
      </Card>

      <!-- Subcarpetas -->
      <div
        v-if="subcarpetasVisibles.length"
        class="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
      >
        <NuxtLink
          v-for="sub in subcarpetasVisibles"
          :key="sub.id"
          :to="`/kpis/${sub.id}`"
          class="group"
        >
          <Card
            class="h-full transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <CardHeader class="py-4">
              <div class="flex items-center gap-3">
                <div class="shrink-0 rounded-md bg-primary/10 p-1.5">
                  <Folder class="h-4 w-4 text-primary" />
                </div>
                <CardTitle class="truncate text-sm font-medium">
                  {{ sub.nombre }}
                </CardTitle>
              </div>
            </CardHeader>
          </Card>
        </NuxtLink>
      </div>

      <!-- Archivos -->
      <div
        v-if="archivosVisibles.length"
        class="min-h-0 flex-1 overflow-auto rounded-md border border-border"
      >
        <Table>
          <TableHeader class="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead class="w-32">Tipo</TableHead>
              <TableHead class="w-32">Subido</TableHead>
              <TableHead class="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="archivo in archivosVisibles" :key="archivo.id">
              <TableCell>
                <div class="flex items-center gap-2">
                  <component
                    :is="TIPO_ICONO[archivo.tipo]"
                    class="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                  <span class="truncate">{{ archivo.nombre }}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{{ TIPO_LABEL[archivo.tipo] }}</Badge>
              </TableCell>
              <TableCell class="text-muted-foreground">
                {{ formatFecha(archivo.fechaSubida) }}
              </TableCell>
              <TableCell class="text-right">
                <Button
                  v-if="puedeAbrirArchivo(archivo)"
                  variant="ghost"
                  size="icon"
                  :title="tieneVisor(archivo) ? 'Ver' : 'Descargar'"
                  @click="verArchivo(archivo)"
                >
                  <Eye v-if="tieneVisor(archivo)" class="h-4 w-4" />
                  <Download v-else class="h-4 w-4" />
                </Button>
                <Button
                  v-if="puedeEliminarArchivo(archivo, contenido.carpeta, ruta)"
                  variant="ghost"
                  size="icon"
                  title="Eliminar"
                  class="text-destructive hover:text-destructive"
                  @click="eliminarArchivo(archivo.id)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
                <span
                  v-if="
                    !puedeAbrirArchivo(archivo) &&
                    !puedeEliminarArchivo(archivo, contenido.carpeta, ruta)
                  "
                  class="text-xs text-muted-foreground"
                >
                  —
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </template>
  </div>
</template>
