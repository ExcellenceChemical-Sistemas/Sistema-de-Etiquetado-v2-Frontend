<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { toast } from "vue-sonner";
import { useUpdateCotizacion } from "~/composables/useCotizaciones";
import { isoADatetimeLocal, datetimeLocalAIso } from "~/utils/fechaHora";
import type { Cotizacion, ActualizarCotizacionInput } from "~/types/cotizacion";

// Fecha y n° de proforma se piden juntos: recién cuando Joel manda la cotización se conoce el
// número que le asignó KEYFACIL, así que no tiene sentido pedirlo antes (ver CotizacionForm).
const props = defineProps<{
  open: boolean;
  cotizacion: Cotizacion | null;
}>();

const emit = defineEmits<{
  "update:open": [boolean];
}>();

const fecha = ref("");
const numeroProforma = ref("");
const numeroProformaRef = ref<{ $el: HTMLInputElement } | null>(null);

watch(
  () => props.open,
  async (abierto) => {
    if (abierto && props.cotizacion) {
      fecha.value = isoADatetimeLocal(props.cotizacion.cotizacionEnviadaEn) || isoADatetimeLocal(new Date().toISOString());
      numeroProforma.value = props.cotizacion.numeroProforma ?? "PF01-";
      await nextTick();
      const input = numeroProformaRef.value?.$el;
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    }
  },
);

const { mutateAsync: actualizar, isPending } = useUpdateCotizacion();

async function guardar() {
  if (!props.cotizacion || !fecha.value || !numeroProforma.value.trim()) return;
  try {
    const input: ActualizarCotizacionInput = {
      cotizacionEnviadaEn: datetimeLocalAIso(fecha.value),
      numeroProforma: numeroProforma.value.trim(),
    };
    await actualizar({ id: props.cotizacion.id, input });
    toast.success("Cotización marcada como enviada");
    emit("update:open", false);
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo guardar la cotización");
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-sm">
      <DialogTitle>Marcar cotización enviada</DialogTitle>
      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="numeroProforma">N° de proforma (KEYFACIL)</Label>
          <Input id="numeroProforma" ref="numeroProformaRef" v-model="numeroProforma" />
        </div>
        <div class="space-y-2">
          <Label for="fechaHora">Fecha y hora de envío</Label>
          <Input id="fechaHora" v-model="fecha" type="datetime-local" step="1" />
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" :disabled="isPending" @click="emit('update:open', false)">
            Cancelar
          </Button>
          <Button :disabled="isPending || !fecha || !numeroProforma.trim()" @click="guardar">
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
