<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { toast } from "vue-sonner";
import { useUpdateCotizacion } from "~/composables/useCotizaciones";
import type { Cotizacion } from "~/types/cotizacion";

// Deshace una etapa ya marcada (vuelve esa fecha, y las que dependen de ella, a null) en vez de
// corregirla — para el caso de un clic accidental ("Marcar pedido aprobado" en la cotización
// equivocada), donde corregir la fecha no sirve porque la etapa nunca debió marcarse. Exclusivo
// de Admin (el backend aplica la misma regla); pide motivo igual que una corrección, para que
// quede en el historial.
const ETIQUETAS: Record<"cotizacionEnviadaEn" | "pedidoAprobadoEn" | "avisoAlmacenEn", string> = {
  cotizacionEnviadaEn: "cotización enviada",
  pedidoAprobadoEn: "pedido aprobado",
  avisoAlmacenEn: "pedido notificado",
};

const props = defineProps<{
  open: boolean;
  cotizacion: Cotizacion | null;
  campo: "cotizacionEnviadaEn" | "pedidoAprobadoEn" | "avisoAlmacenEn";
}>();

const emit = defineEmits<{
  "update:open": [boolean];
}>();

// Si se deshace una etapa intermedia, las que vienen después también se limpian (ej. deshacer
// "pedido aprobado" con "aviso a almacén" ya marcado se lleva las dos) — se lo avisamos antes.
const ORDEN_ETAPAS = ["cotizacionEnviadaEn", "pedidoAprobadoEn", "avisoAlmacenEn"] as const;
const camposArrastrados = computed(() => {
  if (!props.cotizacion) return [];
  const desde = ORDEN_ETAPAS.indexOf(props.campo);
  return ORDEN_ETAPAS.slice(desde + 1).filter((c) => props.cotizacion?.[c]);
});

const motivo = ref("");

watch(
  () => props.open,
  (abierto) => {
    if (abierto) motivo.value = "";
  },
);

const { mutateAsync: actualizar, isPending } = useUpdateCotizacion();

async function confirmar() {
  if (!props.cotizacion || !motivo.value.trim()) return;
  try {
    await actualizar({
      id: props.cotizacion.id,
      input: { revertirEtapa: props.campo, motivoCorreccion: motivo.value.trim() },
    });
    toast.success("Etapa deshecha");
    emit("update:open", false);
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo deshacer la etapa");
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-sm">
      <DialogTitle>Deshacer "{{ ETIQUETAS[campo] }}"</DialogTitle>
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">
          La cotización vuelve a quedar como si "{{ ETIQUETAS[campo] }}" nunca se hubiera marcado.
          Esto no se puede deshacer, pero queda en el historial.
        </p>
        <p v-if="camposArrastrados.length" class="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
          También se va a deshacer: {{ camposArrastrados.map((c) => ETIQUETAS[c]).join(", ") }}
          (depende de "{{ ETIQUETAS[campo] }}").
        </p>
        <div class="space-y-2">
          <Label for="motivoDeshacer">Motivo</Label>
          <Textarea id="motivoDeshacer" v-model="motivo" rows="2" placeholder="Por qué se deshace esta etapa" />
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" :disabled="isPending" @click="emit('update:open', false)">
            Cancelar
          </Button>
          <Button variant="destructive" :disabled="isPending || !motivo.trim()" @click="confirmar">
            <span
              v-if="isPending"
              class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Deshacer
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
