<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { toast } from "vue-sonner";
import { useUpdateCotizacion } from "~/composables/useCotizaciones";
import { isoADatetimeLocal, datetimeLocalAIso } from "~/utils/fechaHora";
import type { Cotizacion, ActualizarCotizacionInput } from "~/types/cotizacion";

// Fecha y n° de proforma se piden juntos: recién cuando Joel manda la cotización se conoce el
// número que le asignó KEYFACIL, así que no tiene sentido pedirlo antes (ver CotizacionForm).
//
// La primera vez que se marca, la fecha NO es editable: el backend usa la hora real del
// servidor sin importar qué se mande, para que el indicador mida lo que pasó de verdad y no lo
// que a alguien le convenga. Corregirla después (cotización ya marcada) es exclusivo de un Admin
// y exige motivo — ver update() en cotizaciones.service.ts.
const props = defineProps<{
  open: boolean;
  cotizacion: Cotizacion | null;
}>();

const emit = defineEmits<{
  "update:open": [boolean];
}>();

const esCorreccion = computed(() => !!props.cotizacion?.cotizacionEnviadaEn);

const fecha = ref("");
const numeroProforma = ref("");
const motivo = ref("");
const numeroProformaRef = ref<{ $el: HTMLInputElement } | null>(null);

watch(
  () => props.open,
  async (abierto) => {
    if (abierto && props.cotizacion) {
      fecha.value = isoADatetimeLocal(props.cotizacion.cotizacionEnviadaEn) || isoADatetimeLocal(new Date().toISOString());
      numeroProforma.value = props.cotizacion.numeroProforma ?? "PF01-";
      motivo.value = "";
      await nextTick();
      const input = numeroProformaRef.value?.$el;
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    }
  },
);

const { mutateAsync: actualizar, isPending } = useUpdateCotizacion();

const puedeGuardar = computed(() => {
  if (!numeroProforma.value.trim()) return false;
  if (esCorreccion.value) return !!fecha.value && !!motivo.value.trim();
  return true;
});

async function guardar() {
  if (!props.cotizacion || !puedeGuardar.value) return;
  try {
    const input: ActualizarCotizacionInput = {
      // Al marcar por primera vez el valor se ignora en el backend (usa la hora real del
      // servidor); solo importa al corregir.
      cotizacionEnviadaEn: esCorreccion.value ? datetimeLocalAIso(fecha.value) : new Date().toISOString(),
      numeroProforma: numeroProforma.value.trim(),
      ...(esCorreccion.value && { motivoCorreccion: motivo.value.trim() }),
    };
    await actualizar({ id: props.cotizacion.id, input });
    toast.success(esCorreccion.value ? "Cotización corregida" : "Cotización marcada como enviada");
    emit("update:open", false);
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo guardar la cotización");
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-sm">
      <DialogTitle>{{ esCorreccion ? "Corregir cotización enviada" : "Marcar cotización enviada" }}</DialogTitle>
      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="numeroProforma">N° de proforma (KEYFACIL)</Label>
          <Input id="numeroProforma" ref="numeroProformaRef" v-model="numeroProforma" />
        </div>
        <div v-if="esCorreccion" class="space-y-2">
          <Label for="fechaHora">Fecha y hora de envío</Label>
          <Input id="fechaHora" v-model="fecha" type="datetime-local" step="1" />
        </div>
        <p v-else class="text-xs text-muted-foreground">
          Se va a registrar con la hora actual del sistema — no es editable, para que el indicador
          mida el tiempo real de respuesta.
        </p>
        <div v-if="esCorreccion" class="space-y-2">
          <Label for="motivo">Motivo de la corrección</Label>
          <Textarea id="motivo" v-model="motivo" rows="2" placeholder="Por qué se corrige esta fecha" />
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" :disabled="isPending" @click="emit('update:open', false)">
            Cancelar
          </Button>
          <Button :disabled="isPending || !puedeGuardar" @click="guardar">
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
