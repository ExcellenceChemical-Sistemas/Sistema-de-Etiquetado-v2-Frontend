<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { toast } from "vue-sonner";
import { useUpdatePedido } from "~/composables/usePedidos";
import type { Pedido } from "~/types/pedido";

// Deshace una etapa ya marcada (vuelve esa fecha, y las que dependen de ella, a null) en vez de
// corregirla — para el caso de un clic accidental ("Marcar salió" en el pedido equivocado), donde
// corregir la fecha no sirve porque la etapa nunca debió marcarse. Exclusivo de Admin (el backend
// aplica la misma regla); pide motivo igual que una corrección, aunque acá no queda guardado en
// ningún historial (Pedido no tiene una tabla equivalente a CotizacionHistorial) — se exige igual
// para que quien lo hace lo piense dos veces. Mismo patrón que CotizacionDeshacerDialog.vue.
const ETIQUETAS: Record<"inicioPreparacionEn" | "preparadoEn" | "salioEn" | "entregadoEn", string> = {
  inicioPreparacionEn: "inicio de preparación",
  preparadoEn: "preparado",
  salioEn: "salió",
  entregadoEn: "entregado",
};

const props = defineProps<{
  open: boolean;
  pedido: Pedido | null;
  campo: "inicioPreparacionEn" | "preparadoEn" | "salioEn" | "entregadoEn";
}>();

const emit = defineEmits<{
  "update:open": [boolean];
}>();

// Si se deshace una etapa intermedia, las que vienen después también se limpian (ej. deshacer
// "preparado" con "salió" y "entregado" ya marcados se lleva las tres) — se lo avisamos antes.
const ORDEN_ETAPAS = ["inicioPreparacionEn", "preparadoEn", "salioEn", "entregadoEn"] as const;
const camposArrastrados = computed(() => {
  if (!props.pedido) return [];
  const desde = ORDEN_ETAPAS.indexOf(props.campo);
  return ORDEN_ETAPAS.slice(desde + 1).filter((c) => props.pedido?.[c]);
});

const motivo = ref("");

watch(
  () => props.open,
  (abierto) => {
    if (abierto) motivo.value = "";
  },
);

const { mutateAsync: actualizar, isPending } = useUpdatePedido();

async function confirmar() {
  if (!props.pedido || !motivo.value.trim()) return;
  try {
    await actualizar({
      id: props.pedido.id,
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
          El pedido vuelve a quedar como si "{{ ETIQUETAS[campo] }}" nunca se hubiera marcado.
          Esto no se puede deshacer.
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
