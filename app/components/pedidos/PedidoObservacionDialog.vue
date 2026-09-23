<script setup lang="ts">
import { ref, watch } from "vue";
import { toast } from "vue-sonner";
import { useUpdatePedido } from "~/composables/usePedidos";
import {
  CATEGORIAS_OBSERVACION_PEDIDO,
  CATEGORIA_OBSERVACION_LABEL,
  type Pedido,
  type CategoriaObservacionPedido,
} from "~/types/pedido";

const props = defineProps<{
  open: boolean;
  pedido: Pedido | null;
}>();

const emit = defineEmits<{
  "update:open": [boolean];
}>();

const categoria = ref<CategoriaObservacionPedido | undefined>(undefined);
const detalle = ref("");

watch(
  () => props.open,
  (abierto) => {
    if (abierto && props.pedido) {
      categoria.value = props.pedido.categoriaObservacion ?? undefined;
      detalle.value = props.pedido.detalleObservacion ?? "";
    }
  },
);

const { mutateAsync: actualizar, isPending } = useUpdatePedido();

async function guardar() {
  if (!props.pedido) return;
  try {
    await actualizar({
      id: props.pedido.id,
      input: {
        categoriaObservacion: categoria.value,
        detalleObservacion: detalle.value,
      },
    });
    toast.success("Observación guardada");
    emit("update:open", false);
  } catch {
    toast.error("No se pudo guardar la observación");
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-sm">
      <DialogTitle>Observación del pedido</DialogTitle>
      <div class="space-y-4">
        <div class="space-y-2">
          <Label>Categoría</Label>
          <Select v-model="categoria">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Sin observación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="c in CATEGORIAS_OBSERVACION_PEDIDO"
                :key="c"
                :value="c"
              >
                {{ CATEGORIA_OBSERVACION_LABEL[c] }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-2">
          <Label for="detalle">Detalle (opcional)</Label>
          <Textarea id="detalle" v-model="detalle" rows="3" maxlength="500" />
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" :disabled="isPending" @click="emit('update:open', false)">
            Cancelar
          </Button>
          <Button :disabled="isPending" @click="guardar">
            <span
              v-if="isPending"
              class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Guardar
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
