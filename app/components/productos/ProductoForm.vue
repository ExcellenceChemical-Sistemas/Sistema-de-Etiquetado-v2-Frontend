<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { productoSchema, type ProductoFormValues } from '~/schemas/producto.schema'
import {
  useCreateProducto,
  useUpdateProducto,
  useUploadFichaSeguridad,
  useAnalizarFicha,
} from '~/composables/useProductos'
import { usePermiso } from '~/composables/usePermiso'
import { toast } from 'vue-sonner'
import { FileText, X, Upload, Eye } from '@lucide/vue'
import type { Producto } from '~/types/producto'
import { PICTOGRAMAS_GHS } from '~/utils/ghs'
import PictogramaGhs from '~/components/etiquetas/PictogramaGhs.vue'

const props = defineProps<{ producto?: Producto | null }>()
const emit = defineEmits<{ success: [] }>()

const isEditing = !!props.producto
const permiso = usePermiso('PRODUCTOS')

const { handleSubmit, defineField, errors, isSubmitting } = useForm<ProductoFormValues>({
  validationSchema: toTypedSchema(productoSchema),
  initialValues: {
    nombre: props.producto?.nombre ?? '',
    nfpaSalud: props.producto?.nfpaSalud ?? undefined,
    nfpaInflamabilidad: props.producto?.nfpaInflamabilidad ?? undefined,
    nfpaReactividad: props.producto?.nfpaReactividad ?? undefined,
    densidad: props.producto?.densidad ?? undefined,
    pictogramasGhs: props.producto?.pictogramasGhs ?? [],
    palabraAdvertencia: props.producto?.palabraAdvertencia ?? null,
    frasesH: props.producto?.frasesH ?? [],
    frasesP: props.producto?.frasesP ?? [],
  },
})

const [nombre, nombreAttrs] = defineField('nombre')
const [nfpaSalud, nfpaSaludAttrs] = defineField('nfpaSalud')
const [nfpaInflamabilidad, nfpaInflamabilidadAttrs] = defineField('nfpaInflamabilidad')
const [nfpaReactividad, nfpaReactividadAttrs] = defineField('nfpaReactividad')
const [densidad, densidadAttrs] = defineField('densidad')
const [pictogramasGhs] = defineField('pictogramasGhs')
const [palabraAdvertencia] = defineField('palabraAdvertencia')
const [frasesH] = defineField('frasesH')
const [frasesP] = defineField('frasesP')

// Los textareas trabajan con texto (una frase por línea); el form guarda arreglos.
const textoFrasesH = computed({
  get: () => (frasesH.value ?? []).join('\n'),
  set: (v: string) => { frasesH.value = v.split('\n').map((l) => l.trim()).filter(Boolean) },
})
const textoFrasesP = computed({
  get: () => (frasesP.value ?? []).join('\n'),
  set: (v: string) => { frasesP.value = v.split('\n').map((l) => l.trim()).filter(Boolean) },
})

function alternarPictograma(codigo: string) {
  const actuales = pictogramasGhs.value ?? []
  pictogramasGhs.value = actuales.includes(codigo)
    ? actuales.filter((c) => c !== codigo)
    : [...actuales, codigo]
}

const nombreInputRef = ref<{ $el: HTMLInputElement } | null>(null)
onMounted(() => {
  nombreInputRef.value?.$el?.focus()
})

const { mutateAsync: crear } = useCreateProducto()
const { mutateAsync: actualizar } = useUpdateProducto()

// --- Ficha de seguridad (opcional) ---
const TAMANO_MAXIMO_FICHA = 10 * 1024 * 1024 // 10MB, igual que el límite del backend

const fichaFile = ref<File | null>(null)
const fichaActual = ref(props.producto?.fichaSeguridadUrl ?? null)

function onFichaChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0] ?? null
  // Validación de cortesía: el backend valida lo mismo, esto solo da el error al toque.
  if (file && file.type !== 'application/pdf') {
    toast.error('La ficha de seguridad debe ser un archivo PDF')
    target.value = ''
    fichaFile.value = null
    return
  }
  if (file && file.size > TAMANO_MAXIMO_FICHA) {
    toast.error('La ficha de seguridad no puede superar los 10MB')
    target.value = ''
    fichaFile.value = null
    return
  }
  fichaFile.value = file
  if (file) leerClasificacion(file)
}

// Al elegir una FDS se lee su sección 2 y se rellena la clasificación GHS como
// propuesta: la persona la revisa y corrige antes de guardar el producto.
const { mutateAsync: analizarFicha, isPending: leyendoFicha } = useAnalizarFicha()
const clasificacionLeida = ref(false)
// La sección GHS se muestra si el producto ya tiene datos, cuando la FDS los propone,
// o si la persona decide marcarlos a mano.
const mostrarGhs = ref(
  !!(
    props.producto?.pictogramasGhs?.length ||
    props.producto?.palabraAdvertencia ||
    props.producto?.frasesH?.length ||
    props.producto?.frasesP?.length
  ),
)

async function leerClasificacion(file: File) {
  clasificacionLeida.value = false
  try {
    const c = await analizarFicha(file)
    if (c.noPeligroso) {
      toast.success('La ficha indica que el producto no está clasificado como peligroso: no lleva pictogramas.')
      return
    }
    if (!c.pictogramasGhs.length && !c.frasesH.length && !c.palabraAdvertencia) {
      toast.warning('No se encontró la clasificación GHS en la ficha. Márcala a mano.')
      return
    }
    pictogramasGhs.value = c.pictogramasGhs
    palabraAdvertencia.value = c.palabraAdvertencia
    frasesH.value = c.frasesH
    frasesP.value = c.frasesP
    clasificacionLeida.value = true
    mostrarGhs.value = true
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? 'No se pudo leer la ficha de seguridad')
  }
}

// --- Previsualización del archivo recién seleccionado (Dialog secundario) ---
const previewOpen = ref(false)
const fichaPreviewUrl = ref<string | null>(null)

watch(fichaFile, (file) => {
  if (fichaPreviewUrl.value) {
    URL.revokeObjectURL(fichaPreviewUrl.value)
    fichaPreviewUrl.value = null
  }
  previewOpen.value = false
  if (file) {
    fichaPreviewUrl.value = URL.createObjectURL(file)
  }
})

onBeforeUnmount(() => {
  if (fichaPreviewUrl.value) URL.revokeObjectURL(fichaPreviewUrl.value)
})

function cancelarFichaSeleccionada() {
  fichaFile.value = null
}

const { mutateAsync: subirFicha, isPending: subiendoFicha } = useUploadFichaSeguridad()

const onSubmit = handleSubmit(async (values) => {
  try {
    let productoId: number
    if (isEditing && props.producto) {
      // densidad vacía se manda como null para poder borrarla al editar
      const actualizado = await actualizar({
        id: props.producto.id,
        dto: { ...values, densidad: values.densidad ?? null, palabraAdvertencia: values.palabraAdvertencia ?? null } as any,
      })
      productoId = actualizado.id
      toast.success('Producto actualizado')
    } else {
      const creado = await crear(values)
      productoId = creado.id
      toast.success('Producto creado')
    }

    // La ficha se sube contra un id que en el alta recién existe ahora, así que
    // va después de guardar. Si falla, el producto ya quedó creado igual.
    if (fichaFile.value) {
      try {
        await subirFicha({ id: productoId, file: fichaFile.value })
        toast.success('Ficha de seguridad cargada')
      } catch {
        toast.error(
          'El producto se guardó, pero la ficha de seguridad no se pudo subir. Podés reintentarlo editando el producto.',
        )
      }
    }

    emit('success')
  } catch (err: any) {
    if (err?.response?.status === 409) {
      toast.error('Ya existe un producto con ese nombre')
    } else {
      toast.error('Ocurrió un error al guardar el producto')
    }
  }
})
</script>

<template>
  <form class="space-y-4" @submit="onSubmit">
    <div class="space-y-2">
      <Label for="nombre">Nombre</Label>
      <Input
        id="nombre"
        ref="nombreInputRef"
        v-model="nombre"
        v-bind="nombreAttrs"
        placeholder="Nombre del producto"
      />
      <p v-if="errors.nombre" class="text-sm text-destructive">{{ errors.nombre }}</p>
    </div>

    <div class="space-y-2">
      <Label for="fichaFile">
        Ficha de seguridad
        <span class="text-muted-foreground font-normal">(opcional)</span>
      </Label>

      <div
        v-if="fichaActual && !fichaFile"
        class="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
      >
        <FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
        <span class="flex-1 truncate text-muted-foreground">Ficha de seguridad cargada</span>
      </div>

      <div v-if="permiso.puedeEditar && !fichaFile">
        <label
          for="fichaFile"
          class="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Upload class="h-4 w-4" />
          {{ fichaActual ? 'Reemplazar archivo PDF' : 'Seleccionar archivo PDF' }}
        </label>
        <input
          id="fichaFile"
          type="file"
          accept="application/pdf"
          class="hidden"
          @change="onFichaChange"
        />
      </div>

      <div v-else-if="fichaFile" class="space-y-1">
        <div class="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
          <FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
          <span class="flex-1 truncate">{{ fichaFile.name }}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title="Previsualizar"
            @click="previewOpen = true"
          >
            <Eye class="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title="Cancelar selección"
            @click="cancelarFichaSeleccionada"
          >
            <X class="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <p v-if="fichaActual" class="text-xs text-amber-500">
          La ficha actual será reemplazada por este archivo al guardar los cambios.
        </p>
      </div>

      <p v-if="permiso.puedeEditar && !fichaFile" class="text-xs text-muted-foreground">
        {{
          fichaActual
            ? 'Subí un archivo para reemplazar la ficha de seguridad actual.'
            : 'Opcional. Solo PDF, máx. 10MB.'
        }}
      </p>
    </div>

    <!-- Clasificación GHS: la propone el lector de la FDS; a mano solo si hace falta -->
    <div v-if="mostrarGhs">
      <div class="space-y-2">
        <Label>Pictogramas GHS <span class="text-muted-foreground font-normal">(opcional)</span></Label>
        <p v-if="leyendoFicha" class="text-xs text-muted-foreground">Leyendo la ficha de seguridad…</p>
        <p
          v-else-if="clasificacionLeida"
          class="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300"
        >
          Datos leídos de la ficha de seguridad. Revísalos con la sección 2 de la FDS antes de guardar.
        </p>
        <div class="grid grid-cols-3 gap-2 sm:grid-cols-5">
          <button
            v-for="p in PICTOGRAMAS_GHS"
            :key="p.codigo"
            type="button"
            class="flex flex-col items-center rounded-md border p-2 transition-colors"
            :class="pictogramasGhs?.includes(p.codigo) ? 'border-primary bg-primary/10' : 'border-border opacity-60 hover:opacity-100'"
            :title="p.nombre"
            @click="alternarPictograma(p.codigo)"
          >
            <PictogramaGhs :codigo="p.codigo" mostrar-nombre />
          </button>
        </div>
        <p class="text-xs text-muted-foreground">Se muestran al escanear el QR de la etiqueta.</p>

        <div class="space-y-1 pt-2">
          <Label class="text-xs font-normal text-muted-foreground">Palabra de advertencia</Label>
          <div class="flex gap-2">
            <button
              v-for="op in [{ v: 'PELIGRO', t: 'Peligro' }, { v: 'ATENCION', t: 'Atención' }]"
              :key="op.v"
              type="button"
              class="rounded-md border px-3 py-1.5 text-sm transition-colors"
              :class="palabraAdvertencia === op.v ? 'border-primary bg-primary/10 font-medium' : 'border-border text-muted-foreground'"
              @click="palabraAdvertencia = palabraAdvertencia === op.v ? null : op.v"
            >
              {{ op.t }}
            </button>
          </div>
        </div>

        <div class="space-y-1 pt-2">
          <Label for="frasesH" class="text-xs font-normal text-muted-foreground">
            Frases H — indicaciones de peligro (una por línea)
          </Label>
          <textarea
            id="frasesH"
            v-model="textoFrasesH"
            rows="3"
            placeholder="H314: Provoca quemaduras graves en la piel y lesiones oculares graves."
            class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
          />
        </div>
        <div class="space-y-1">
          <Label for="frasesP" class="text-xs font-normal text-muted-foreground">
            Frases P — consejos de prudencia (una por línea)
          </Label>
          <textarea
            id="frasesP"
            v-model="textoFrasesP"
            rows="3"
            placeholder="P280: Llevar guantes, prendas y gafas de protección."
            class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
          />
          <p class="text-xs text-muted-foreground">Cópialas de la sección 2 de la FDS del proveedor.</p>
        </div>
      </div>
    </div>
    <button
      v-else
      type="button"
      class="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      @click="mostrarGhs = true"
    >
      Marcar pictogramas GHS a mano
    </button>

    <div class="space-y-2">
      <Label>Rombo NFPA 704 <span class="text-muted-foreground font-normal">(opcional)</span></Label>
      <div class="grid grid-cols-3 gap-3">
        <div class="space-y-1">
          <Label for="nfpaSalud" class="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
            Salud
          </Label>
          <Input
            id="nfpaSalud"
            v-model="nfpaSalud"
            v-bind="nfpaSaludAttrs"
            type="number"
            min="0"
            max="4"
            placeholder="0-4"
          />
          <p v-if="errors.nfpaSalud" class="text-xs text-destructive">{{ errors.nfpaSalud }}</p>
        </div>
        <div class="space-y-1">
          <Label for="nfpaInflamabilidad" class="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-red-600" />
            Inflamabilidad
          </Label>
          <Input
            id="nfpaInflamabilidad"
            v-model="nfpaInflamabilidad"
            v-bind="nfpaInflamabilidadAttrs"
            type="number"
            min="0"
            max="4"
            placeholder="0-4"
          />
          <p v-if="errors.nfpaInflamabilidad" class="text-xs text-destructive">{{ errors.nfpaInflamabilidad }}</p>
        </div>
        <div class="space-y-1">
          <Label for="nfpaReactividad" class="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400" />
            Reactividad
          </Label>
          <Input
            id="nfpaReactividad"
            v-model="nfpaReactividad"
            v-bind="nfpaReactividadAttrs"
            type="number"
            min="0"
            max="4"
            placeholder="0-4"
          />
          <p v-if="errors.nfpaReactividad" class="text-xs text-destructive">{{ errors.nfpaReactividad }}</p>
        </div>
      </div>
    </div>

    <div class="space-y-2">
      <Label for="densidad">
        Densidad (g/ml)
        <span class="text-muted-foreground font-normal">(opcional)</span>
      </Label>
      <Input
        id="densidad"
        v-model="densidad"
        v-bind="densidadAttrs"
        inputmode="decimal"
        placeholder="Ej. 1.19"
      />
      <p v-if="errors.densidad" class="text-sm text-destructive">{{ errors.densidad }}</p>
      <p class="text-xs text-muted-foreground">
        Solo para líquidos (neto en ML o L): con la densidad, la etiqueta calcula la tara.
        Sin ella, la tara de líquidos queda en «—».
      </p>
    </div>

    <Button type="submit" class="w-full" :disabled="isSubmitting || subiendoFicha">
      <span
        v-if="isSubmitting || subiendoFicha"
        class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      {{ isEditing ? 'Guardar cambios' : 'Crear producto' }}
    </Button>

    <Dialog v-model:open="previewOpen">
      <DialogContent class="flex h-[85vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle class="truncate">{{ fichaFile?.name }}</DialogTitle>
        </DialogHeader>
        <iframe
          v-if="fichaPreviewUrl"
          :src="fichaPreviewUrl"
          class="w-full flex-1 rounded-md border border-border"
          title="Previsualización de la ficha de seguridad"
        />
      </DialogContent>
    </Dialog>
  </form>
</template>