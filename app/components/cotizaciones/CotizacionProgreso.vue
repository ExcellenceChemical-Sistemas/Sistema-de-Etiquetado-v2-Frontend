<script setup lang="ts">
import { CheckCircle2, Circle } from "@lucide/vue";
import { formatFechaHora } from "~/utils/fechaHora";
import type { Cotizacion } from "~/types/cotizacion";

defineProps<{ cotizacion: Cotizacion }>();

// "Recibido" no entra acá porque ya tiene su propia columna (requerimientoEn
// siempre está seteado, es el punto de partida).
const ETAPAS = [
  { key: "cotizacionEnviadaEn", label: "Cotización enviada" },
  { key: "pedidoAprobadoEn", label: "Pedido aprobado" },
  { key: "avisoAlmacenEn", label: "Avisado a almacén" },
] as const;
</script>

<template>
  <div class="flex items-center">
    <template v-for="(etapa, i) in ETAPAS" :key="etapa.key">
      <span
        :title="`${etapa.label}: ${cotizacion[etapa.key] ? formatFechaHora(cotizacion[etapa.key]) : 'Pendiente'}`"
      >
        <CheckCircle2
          v-if="cotizacion[etapa.key]"
          class="h-4 w-4 text-green-500"
        />
        <Circle v-else class="h-4 w-4 text-muted-foreground/30" />
      </span>
      <span
        v-if="i < ETAPAS.length - 1"
        class="h-px w-3"
        :class="cotizacion[etapa.key] ? 'bg-green-500/50' : 'bg-muted-foreground/20'"
      />
    </template>
  </div>
</template>
