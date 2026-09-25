<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { toast } from 'vue-sonner'
import { FileText, X, Upload, Eye, Trash2 } from '@lucide/vue'

// Campo de un PDF de producto (ficha de seguridad o ficha técnica): muestra si ya hay
// una cargada, deja elegir una nueva (para crear o reemplazar) y borrar la actual.
// El archivo elegido se sube al guardar el formulario; borrar la actual es inmediato.
const props = defineProps<{
  id: string
  etiqueta: string // "ficha de seguridad" / "ficha técnica" (minúscula, para los mensajes)
  actual: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
  eliminando?: boolean
}>()

const emit = defineEmits<{
  elegido: [file: File]
  eliminar: []
}>()

const archivo = defineModel<File | null>({ default: null })

const TAMANO_MAXIMO = 10 * 1024 * 1024 // 10MB, igual que el límite del backend

function onChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0] ?? null
  // Validación de cortesía: el backend valida lo mismo, esto solo da el error al toque.
  if (file && file.type !== 'application/pdf') {
    toast.error(`La ${props.etiqueta} debe ser un archivo PDF`)
    target.value = ''
    archivo.value = null
    return
  }
  if (file && file.size > TAMANO_MAXIMO) {
    toast.error(`La ${props.etiqueta} no puede superar los 10MB`)
    target.value = ''
    archivo.value = null
    return
  }
  archivo.value = file
  if (file) emit('elegido', file)
}

function confirmarEliminar() {
  if (!confirm(`¿Eliminar la ${props.etiqueta} de este producto? Esta acción no se puede deshacer.`)) return
  emit('eliminar')
}

// --- Previsualización del archivo recién elegido ---
const previewOpen = ref(false)
const previewUrl = ref<string | null>(null)

watch(archivo, (file) => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
  previewOpen.value = false
  if (file) previewUrl.value = URL.createObjectURL(file)
})

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <div class="space-y-2">
    <Label :for="id">
      <slot name="titulo" />
      <span class="text-muted-foreground font-normal">(opcional)</span>
    </Label>

    <div
      v-if="actual && !archivo"
      class="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
    >
      <FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
      <span class="flex-1 truncate text-muted-foreground">Cargada</span>
      <Button
        v-if="puedeEliminar"
        type="button"
        variant="ghost"
        size="sm"
        :title="`Eliminar ${etiqueta}`"
        :disabled="eliminando"
        @click="confirmarEliminar"
      >
        <Trash2 class="h-4 w-4 text-destructive" />
      </Button>
    </div>

    <div v-if="puedeEditar && !archivo">
      <label
        :for="id"
        class="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Upload class="h-4 w-4" />
        {{ actual ? 'Reemplazar archivo PDF' : 'Seleccionar archivo PDF' }}
      </label>
      <input :id="id" type="file" accept="application/pdf" class="hidden" @change="onChange" />
    </div>

    <div v-else-if="archivo" class="space-y-1">
      <div class="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
        <FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
        <span class="flex-1 truncate">{{ archivo.name }}</span>
        <Button type="button" variant="ghost" size="sm" title="Previsualizar" @click="previewOpen = true">
          <Eye class="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button type="button" variant="ghost" size="sm" title="Cancelar selección" @click="archivo = null">
          <X class="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      <p v-if="actual" class="text-xs text-amber-500">
        La {{ etiqueta }} actual será reemplazada por este archivo al guardar los cambios.
      </p>
    </div>

    <p v-if="puedeEditar && !archivo" class="text-xs text-muted-foreground">
      {{
        actual
          ? `Sube un archivo para reemplazar la ${etiqueta} actual.`
          : 'Opcional. Solo PDF, máx. 10MB.'
      }}
    </p>

    <Dialog v-model:open="previewOpen">
      <DialogContent class="flex h-[85vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle class="truncate">{{ archivo?.name }}</DialogTitle>
        </DialogHeader>
        <iframe
          v-if="previewUrl"
          :src="previewUrl"
          class="w-full flex-1 rounded-md border border-border"
          :title="`Previsualización de la ${etiqueta}`"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>
