<script setup lang="ts">
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { loteSchema, type LoteFormValues } from "~/schemas/lote.schema";
import {
  useCreateLote,
  useUpdateLote,
  useUploadCoa,
  useDeleteCoa,
} from "~/composables/useLotes";
import { useProductos } from "~/composables/useProductos";
import { useFabricantesQuery } from "~/composables/useFabricantes";
import { usePermiso } from "~/composables/usePermiso";
import { toast } from "vue-sonner";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { FileText, Trash2, Upload, Eye } from "@lucide/vue";
import type { Lote } from "~/types/lote";
import type { Producto } from "~/types/producto";
import type { Fabricante } from "~/types/fabricante";

const props = defineProps<{ lote?: Lote | null }>();
const emit = defineEmits<{ success: [] }>();

const isEditing = !!props.lote;

// El COA es parte del recurso LOTES en el backend: subir/reemplazar pide
// puedeEditar (POST /lotes/:id/coa) y borrar pide puedeEliminar
// (DELETE /lotes/:id/coa). Mismo usePermiso("LOTES") con el que lotes/index.vue
// gatea el botón "Editar" que abre este form.
const permiso = usePermiso("LOTES");

// Las listas de los selectores son de otros recursos: sin "Ver" en Productos o
// Fabricantes el backend responde 403 y el selector quedaría vacío sin explicar
// por qué, así que se avisa (mismo criterio que generar-etiqueta.vue).
const {
  data: productos,
  isLoading: cargandoProductos,
  isError: errorProductos,
} = useProductos();
const {
  data: fabricantes,
  isLoading: cargandoFabricantes,
  isError: errorFabricantes,
} = useFabricantesQuery();

const { handleSubmit, defineField, errors, isSubmitting } =
  useForm<LoteFormValues>({
    validationSchema: toTypedSchema(loteSchema),
    initialValues: {
      numeroLote: props.lote?.numeroLote ?? "",
      fechaFabricacion: props.lote?.fechaFabricacion ?? "",
      fechaVencimiento: props.lote?.fechaVencimiento ?? "",
      productoId: props.lote?.productoId,
      fabricanteId: props.lote?.fabricanteId,
    },
  });

const [numeroLote, numeroLoteAttrs] = defineField("numeroLote");
const [fechaFabricacion, fechaFabricacionAttrs] =
  defineField("fechaFabricacion");
const [fechaVencimiento, fechaVencimientoAttrs] =
  defineField("fechaVencimiento");
// El combobox emite number|undefined directo, ya no hace falta el puente
// productoIdStr/fabricanteIdStr que convertía a string para el Select.
const [productoId] = defineField("productoId", {
  validateOnModelUpdate: false,
});
const [fabricanteId] = defineField("fabricanteId", {
  validateOnModelUpdate: false,
});

function productoLabel(p: Producto) {
  return p.nombre;
}
function fabricanteLabel(f: Fabricante) {
  return f.nombre;
}

const numeroLoteInputRef = ref<{ $el: HTMLInputElement } | null>(null);
onMounted(() => {
  numeroLoteInputRef.value?.$el?.focus();
});

const { mutateAsync: crear } = useCreateLote();
const { mutateAsync: actualizar } = useUpdateLote();

// --- COA ---
const coaFile = ref<File | null>(null);
const coaActual = ref(props.lote?.coaUrl ?? null);

function onCoaChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0] ?? null;
  if (file && file.type !== "application/pdf") {
    toast.error("El COA debe ser un archivo PDF");
    target.value = "";
    coaFile.value = null;
    return;
  }
  coaFile.value = file;
}

// --- Previsualización del archivo recién seleccionado (Dialog secundario) ---
const previewOpen = ref(false);
const coaPreviewUrl = ref<string | null>(null);

watch(coaFile, (file) => {
  if (coaPreviewUrl.value) {
    URL.revokeObjectURL(coaPreviewUrl.value);
    coaPreviewUrl.value = null;
  }
  previewOpen.value = false;
  if (file) {
    coaPreviewUrl.value = URL.createObjectURL(file);
  }
});

onBeforeUnmount(() => {
  if (coaPreviewUrl.value) URL.revokeObjectURL(coaPreviewUrl.value);
});

function cancelarCoaSeleccionado() {
  coaFile.value = null;
}

const { mutateAsync: subirCoa, isPending: subiendoCoa } = useUploadCoa();
const { mutateAsync: eliminarCoa, isPending: eliminandoCoa } = useDeleteCoa();

async function quitarCoa() {
  if (!props.lote) return;
  try {
    await eliminarCoa(props.lote.id);
    coaActual.value = null;
    toast.success("COA eliminado");
  } catch {
    toast.error("No se pudo eliminar el COA");
  }
}

const onSubmit = handleSubmit(async (values) => {
  try {
    let loteId: number;
    if (isEditing && props.lote) {
      const actualizado = await actualizar({ id: props.lote.id, dto: values });
      loteId = actualizado.id;
      toast.success("Lote actualizado");
    } else {
      const creado = await crear(values);
      loteId = creado.id;
      toast.success("Lote creado");
    }

    if (coaFile.value) {
      try {
        await subirCoa({ id: loteId, file: coaFile.value });
        toast.success("COA cargado");
      } catch {
        toast.error(
          "El lote se guardó, pero el COA no se pudo subir. Podés reintentarlo editando el lote.",
        );
      }
    }

    emit("success");
  } catch (err: any) {
    if (err?.response?.status === 409) {
      toast.error(
        "Ya existe ese número de lote para ese producto y fabricante",
      );
    } else {
      toast.error("Ocurrió un error al guardar el lote");
    }
  }
});
</script>

<template>
  <form class="space-y-4" @submit="onSubmit">
    <div class="space-y-2">
      <Label>Producto</Label>
      <ComboboxBuscador
        v-model="productoId"
        :items="productos ?? []"
        :loading="cargandoProductos"
        :get-label="productoLabel"
        placeholder="Buscar producto…"
        loading-placeholder="Cargando productos…"
      />
      <p v-if="errorProductos" class="text-sm text-destructive">
        No tenés permiso para ver los productos. Pedile a un administrador que
        te asigne el permiso "Productos &gt; Ver".
      </p>
      <p v-else-if="errors.productoId" class="text-sm text-destructive">
        {{ errors.productoId }}
      </p>
    </div>

    <div class="space-y-2">
      <Label>Fabricante</Label>
      <ComboboxBuscador
        v-model="fabricanteId"
        :items="fabricantes ?? []"
        :loading="cargandoFabricantes"
        :get-label="fabricanteLabel"
        placeholder="Buscar fabricante…"
        loading-placeholder="Cargando fabricantes…"
      />
      <p v-if="errorFabricantes" class="text-sm text-destructive">
        No tenés permiso para ver los fabricantes. Pedile a un administrador
        que te asigne el permiso "Fabricantes &gt; Ver".
      </p>
      <p v-else-if="errors.fabricanteId" class="text-sm text-destructive">
        {{ errors.fabricanteId }}
      </p>
    </div>

    <div class="space-y-2">
      <Label for="numeroLote">Número de lote</Label>
      <Input
        id="numeroLote"
        ref="numeroLoteInputRef"
        v-model="numeroLote"
        v-bind="numeroLoteAttrs"
      />
      <p v-if="errors.numeroLote" class="text-sm text-destructive">
        {{ errors.numeroLote }}
      </p>
    </div>

    <div class="space-y-2">
      <Label for="fechaFabricacion">Fecha de fabricación</Label>
      <Input
        id="fechaFabricacion"
        v-model="fechaFabricacion"
        v-bind="fechaFabricacionAttrs"
        placeholder="MM/AAAA o DD/MM/AAAA"
      />
      <p v-if="errors.fechaFabricacion" class="text-sm text-destructive">
        {{ errors.fechaFabricacion }}
      </p>
    </div>

    <div class="space-y-2">
      <Label for="fechaVencimiento">Fecha de vencimiento</Label>
      <Input
        id="fechaVencimiento"
        v-model="fechaVencimiento"
        v-bind="fechaVencimientoAttrs"
        placeholder="MM/AAAA o DD/MM/AAAA"
      />
      <p v-if="errors.fechaVencimiento" class="text-sm text-destructive">
        {{ errors.fechaVencimiento }}
      </p>
    </div>

    <div class="space-y-2">
      <Label for="coaFile">Certificado de análisis (COA)</Label>

      <div
        v-if="coaActual && !coaFile"
        class="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
      >
        <FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
        <span class="flex-1 truncate text-muted-foreground">COA cargado</span>
        <Button
          v-if="permiso.puedeEliminar"
          type="button"
          variant="ghost"
          size="sm"
          :disabled="eliminandoCoa"
          @click="quitarCoa"
        >
          <Trash2 class="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div v-if="!coaFile && permiso.puedeEditar">
        <label
          for="coaFile"
          class="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Upload class="h-4 w-4" />
          {{ coaActual ? "Reemplazar archivo PDF" : "Seleccionar archivo PDF" }}
        </label>
        <input
          id="coaFile"
          type="file"
          accept="application/pdf"
          class="hidden"
          @change="onCoaChange"
        />
      </div>

      <div v-if="coaFile" class="space-y-1">
        <div class="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
          <FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
          <span class="flex-1 truncate">{{ coaFile.name }}</span>
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
            @click="cancelarCoaSeleccionado"
          >
            <Trash2 class="h-4 w-4 text-destructive" />
          </Button>
        </div>
        <p v-if="coaActual" class="text-xs text-amber-500">
          El COA actual será reemplazado por este archivo al guardar los cambios.
        </p>
      </div>

      <p
        v-if="!coaFile && permiso.puedeEditar"
        class="text-xs text-muted-foreground"
      >
        {{
          coaActual
            ? "Subí un archivo para reemplazar el COA actual."
            : "Opcional. Solo PDF, máx. 10MB."
        }}
      </p>
    </div>

    <Button type="submit" class="w-full" :disabled="isSubmitting || subiendoCoa">
      <span
        v-if="isSubmitting || subiendoCoa"
        class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      {{ isEditing ? "Guardar cambios" : "Crear lote" }}
    </Button>

    <Dialog v-model:open="previewOpen">
      <DialogContent class="flex h-[85vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle class="truncate">{{ coaFile?.name }}</DialogTitle>
        </DialogHeader>
        <iframe
          v-if="coaPreviewUrl"
          :src="coaPreviewUrl"
          class="w-full flex-1 rounded-md border border-border"
          title="Previsualización COA"
        />
      </DialogContent>
    </Dialog>
  </form>
</template>