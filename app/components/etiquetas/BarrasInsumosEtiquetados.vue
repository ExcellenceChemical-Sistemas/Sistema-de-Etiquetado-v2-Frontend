<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  datos: { nombre: string; etiquetas: number }[];
}>();

const MAX_BARRAS = 10;

const top = computed(() => props.datos.slice(0, MAX_BARRAS));
const maximo = computed(() => Math.max(1, ...top.value.map((d) => d.etiquetas)));
const total = computed(() => props.datos.reduce((suma, d) => suma + d.etiquetas, 0));
const restantes = computed(() => Math.max(0, props.datos.length - MAX_BARRAS));
</script>

<template>
  <ul v-if="top.length" class="flex flex-col gap-2.5" aria-label="Etiquetas por insumo">
    <li
      v-for="d in top"
      :key="d.nombre"
      class="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,14rem)_1fr_auto]"
      :title="`${d.nombre}: ${d.etiquetas} etiquetas (${Math.round((d.etiquetas / total) * 100)}%)`"
    >
      <span class="truncate text-muted-foreground">{{ d.nombre }}</span>
      <span class="h-3 rounded-full bg-secondary">
        <span
          class="block h-3 rounded-full bg-primary"
          :style="{ width: `${(d.etiquetas / maximo) * 100}%` }"
        />
      </span>
      <span class="w-20 text-right font-medium tabular-nums">
        {{ d.etiquetas }}
        <span class="text-xs font-normal text-muted-foreground">
          ({{ Math.round((d.etiquetas / total) * 100) }}%)
        </span>
      </span>
    </li>
    <li v-if="restantes" class="text-xs text-muted-foreground">
      y {{ restantes }} insumo{{ restantes === 1 ? "" : "s" }} más con menos etiquetas
    </li>
  </ul>
  <p v-else class="py-6 text-center text-sm text-muted-foreground">
    No se generaron etiquetas en este período.
  </p>
</template>
