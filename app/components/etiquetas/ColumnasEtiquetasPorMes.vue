<script setup lang="ts">
import { computed } from "vue";
import type { EtiquetasPorMes } from "~/utils/estadisticas";

const props = defineProps<{
  datos: EtiquetasPorMes[];
  // Mes (0-11) y año filtrados arriba, para resaltar esa columna.
  mesResaltado?: number | null;
}>();

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const maximo = computed(() => Math.max(1, ...props.datos.map((d) => d.etiquetas)));
const hayDatos = computed(() => props.datos.some((d) => d.etiquetas > 0));
</script>

<template>
  <div v-if="hayDatos" class="overflow-x-auto">
    <div class="flex h-48 min-w-[28rem] items-end gap-2" role="img" aria-label="Etiquetas generadas por mes">
      <div
        v-for="d in datos"
        :key="`${d.anio}-${d.mes}`"
        class="flex h-full flex-1 flex-col items-center justify-end gap-1"
        :title="`${MESES_CORTOS[d.mes]} ${d.anio}: ${d.etiquetas} etiquetas`"
      >
        <span class="text-xs tabular-nums text-muted-foreground">{{ d.etiquetas || "" }}</span>
        <span
          class="w-full max-w-10 rounded-t-md"
          :class="mesResaltado === d.mes ? 'bg-primary' : 'bg-primary/40'"
          :style="{ height: `${(d.etiquetas / maximo) * 100}%`, minHeight: d.etiquetas ? '4px' : '0' }"
        />
      </div>
    </div>
    <div class="mt-1 flex min-w-[28rem] gap-2 border-t pt-1">
      <span
        v-for="d in datos"
        :key="`${d.anio}-${d.mes}-l`"
        class="flex-1 text-center text-xs text-muted-foreground"
      >
        {{ MESES_CORTOS[d.mes] }}
      </span>
    </div>
  </div>
  <p v-else class="py-6 text-center text-sm text-muted-foreground">
    No hay etiquetas generadas en estos meses.
  </p>
</template>
