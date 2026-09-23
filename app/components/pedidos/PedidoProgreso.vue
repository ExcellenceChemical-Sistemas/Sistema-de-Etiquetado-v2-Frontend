<script setup lang="ts">
import { CheckCircle2, Circle } from "@lucide/vue";
import { formatFechaHora } from "~/utils/fechaHora";
import type { Pedido } from "~/types/pedido";

defineProps<{ pedido: Pedido }>();

// Las 4 etapas posteriores a la recepción. "Recibido" no entra acá porque ya
// tiene su propia columna (siempre está seteado, es el punto de partida).
const ETAPAS = [
  { key: "inicioPreparacionEn", label: "Inicio de preparación" },
  { key: "preparadoEn", label: "Preparado" },
  { key: "salioEn", label: "Salió" },
  { key: "entregadoEn", label: "Entregado" },
] as const;
</script>

<template>
  <div class="flex items-center">
    <template v-for="(etapa, i) in ETAPAS" :key="etapa.key">
      <span
        :title="`${etapa.label}: ${pedido[etapa.key] ? formatFechaHora(pedido[etapa.key]) : 'Pendiente'}`"
      >
        <CheckCircle2
          v-if="pedido[etapa.key]"
          class="h-4 w-4 text-green-500"
        />
        <Circle v-else class="h-4 w-4 text-muted-foreground/30" />
      </span>
      <span
        v-if="i < ETAPAS.length - 1"
        class="h-px w-3"
        :class="pedido[etapa.key] ? 'bg-green-500/50' : 'bg-muted-foreground/20'"
      />
    </template>
  </div>
</template>
