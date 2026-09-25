<script setup lang="ts">
import { ref, watch } from "vue";
import { toast } from "vue-sonner";
import { useUpdatePedido } from "~/composables/usePedidos";
import { isoADatetimeLocal, datetimeLocalAIso } from "~/utils/fechaHora";
import type { Pedido, ActualizarPedidoInput } from "~/types/pedido";

const props = defineProps<{
  open: boolean;
  pedido: Pedido | null;
  // Cuál de las 5 fechas se está marcando/editando.
  campo: "recibidoEn" | "inicioPreparacionEn" | "preparadoEn" | "salioEn" | "entregadoEn";
  titulo: string;
}>();

const emit = defineEmits<{
  "update:open": [boolean];
}>();

const valor = ref("");

// Se precarga con la hora actual al marcar una etapa nueva, o con la fecha
// ya guardada si se está corrigiendo una que ya existía — en ambos casos
// queda editable antes de guardar (ver contexto: "se entrega cuando salimos
// del trabajo" no debe forzar una hora falsa).
watch(
  () => props.open,
  (abierto) => {
    if (abierto && props.pedido) {
      valor.value = isoADatetimeLocal(props.pedido[props.campo]);
    }
  },
);

const { mutateAsync: actualizar, isPending } = useUpdatePedido();

async function guardar() {
  if (!props.pedido || !valor.value) return;
  try {
    const input: ActualizarPedidoInput = {
      [props.campo]: datetimeLocalAIso(valor.value),
    };
    // Solo cuenta como "marcar la etapa" (y por eso avisa al cliente) si antes no tenía fecha;
    // corregir una fecha ya puesta no reenvía nada.
    const eraMarcar = !props.pedido[props.campo];
    const actualizado = await actualizar({ id: props.pedido.id, input });
    if (props.campo === "salioEn" || props.campo === "entregadoEn") {
      const avisado =
        props.campo === "salioEn" ? actualizado.avisoSalioEnviadoEn : actualizado.avisoEntregadoEnviadoEn;
      if (avisado) {
        toast.success("Pedido actualizado", { description: "Se le avisó al cliente por correo." });
      } else if (eraMarcar && !actualizado.cliente.email) {
        toast.success("Pedido actualizado", {
          description: "El cliente no tiene correo, así que no se le avisó. Puedes avisarle por WhatsApp.",
        });
      } else {
        toast.success("Pedido actualizado");
      }
    } else {
      toast.success("Pedido actualizado");
    }
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
