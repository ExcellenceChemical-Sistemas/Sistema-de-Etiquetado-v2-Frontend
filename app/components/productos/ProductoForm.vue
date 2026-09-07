<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { productoSchema, type ProductoFormValues } from '~/schemas/producto.schema'
import {
  useCreateProducto,
  useUpdateProducto,
  useUploadFichaSeguridad,
} from '~/composables/useProductos'
import { usePermiso } from '~/composables/usePermiso'
import { toast } from 'vue-sonner'
import { FileText, X, Upload, Eye } from '@lucide/vue'
import type { Producto } from '~/types/producto'

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
  },
})

const [nombre, nombreAttrs] = defineField('nombre')
const [nfpaSalud, nfpaSaludAttrs] = defineField('nfpaSalud')
const [nfpaInflamabilidad, nfpaInflamabilidadAttrs] = defineField('nfpaInflamabilidad')
const [nfpaReactividad, nfpaReactividadAttrs] = defineField('nfpaReactividad')

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
      const actualizado = await actualizar({ id: props.producto.id, dto: values })
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