<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { toast } from "vue-sonner";
import { useUpdateCotizacion } from "~/composables/useCotizaciones";
import { isoADatetimeLocal, datetimeLocalAIso } from "~/utils/fechaHora";
import type { Cotizacion, ActualizarCotizacionInput } from "~/types/cotizacion";

// Las 4 fechas (incluida requerimientoEn) se fijan con la hora real del servidor la primera vez
// que se marcan — nadie elige el valor. Si ya estaban marcadas (requerimientoEn siempre lo está,
// se fija al crear la cotización), es una corrección: exclusiva de un Admin, con motivo
// obligatorio. El backend aplica la misma regla — esto solo evita el viaje redondo con un 403.
const props = defineProps<{
  open: boolean;
  cotizacion: Cotizacion | null;
  campo: "requerimientoEn" | "cotizacionEnviadaEn" | "pedidoAprobadoEn" | "avisoAlmacenEn";
  titulo: string;
}>();

const emit = defineEmits<{
  "update:open": [boolean];
}>();

const esCorreccion = computed(() => !!props.cotizacion?.[props.campo]);

const valor = ref("");
const motivo = ref("");

watch(
  () => props.open,
  (abierto) => {
    if (abierto && props.cotizacion) {
      valor.value = isoADatetimeLocal(props.cotizacion[props.campo]) || isoADatetimeLocal(new Date().toISOString());
      motivo.value = "";
    }
  },
);

const { mutateAsync: actualizar, isPending } = useUpdateCotizacion();

const puedeGuardar = computed(() => {
  if (!valor.value) return false;
  if (esCorreccion.value) return !!motivo.value.trim();
  return true;
});

async function guardar() {
  if (!props.cotizacion || !puedeGuardar.value) return;
  try {
    const input: ActualizarCotizacionInput = {
      // Al marcar por primera vez el backend ignora el valor y usa su propia hora — igual se manda
      // "ahora" acá solo para no dejar el campo vacío. Al corregir sí importa el valor elegido.
      [props.campo]: esCorreccion.value ? datetimeLocalAIso(valor.value) : new Date().toISOString(),
      ...(esCorreccion.value && { motivoCorreccion: motivo.value.trim() }),
    };
    await actualizar({ id: props.cotizacion.id, input });
    toast.success("Cotización actualizada");
    emit("update:open", false);
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo guardar la fecha");
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-sm">
      <DialogTitle>{{ titulo }}</DialogTitle>
      <div class="space-y-4">
        <div v-if="campo === 'requerimientoEn' || esCorreccion" class="space-y-2">
          <Label for="fechaHora">Fecha y hora</Label>
          <Input id="fechaHora" v-model="valor" type="datetime-local" step="1" />
        </div>
        <p v-else class="text-xs text-muted-foreground">
          Se va a registrar con la hora actual del sistema — no es editable, para que el
          indicador mida el tiempo real.
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
