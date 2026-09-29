<script setup lang="ts">
import { ref, watch } from "vue";
import { toast } from "vue-sonner";
import { useUpdateCotizacion } from "~/composables/useCotizaciones";
import { isoADatetimeLocal, datetimeLocalAIso } from "~/utils/fechaHora";
import type { Cotizacion, ActualizarCotizacionInput } from "~/types/cotizacion";

const props = defineProps<{
  open: boolean;
  cotizacion: Cotizacion | null;
  campo: "requerimientoEn" | "cotizacionEnviadaEn" | "pedidoAprobadoEn" | "avisoAlmacenEn";
  titulo: string;
}>();

const emit = defineEmits<{
  "update:open": [boolean];
}>();

const valor = ref("");

watch(
  () => props.open,
  (abierto) => {
    if (abierto && props.cotizacion) {
      valor.value = isoADatetimeLocal(props.cotizacion[props.campo]);
    }
  },
);

const { mutateAsync: actualizar, isPending } = useUpdateCotizacion();

async function guardar() {
  if (!props.cotizacion || !valor.value) return;
  try {
    const input: ActualizarCotizacionInput = {
      [props.campo]: datetimeLocalAIso(valor.value),
    };
    await actualizar({ id: props.cotizacion.id, input });
    toast.success("Cotización actualizada");
    emit("update:open", false);
  } catch {
    toast.error("No se pudo guardar la fecha");
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-sm">
      <DialogTitle>{{ titulo }}</DialogTitle>
      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="fechaHora">Fecha y hora</Label>
          <Input id="fechaHora" v-model="valor" type="datetime-local" step="1" />
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" :disabled="isPending" @click="emit('update:open', false)">
            Cancelar
          </Button>
          <Button :disabled="isPending || !valor" @click="guardar">
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
