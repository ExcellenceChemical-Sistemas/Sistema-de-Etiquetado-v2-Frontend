<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  // Cada item: nombre del producto y su total de escaneos (ya sumado).
  datos: { nombre: string; escaneos: number }[];
}>();

// Mismos colores que "Ventas por región" del panel de referencia: verde, celeste,
// amarillo, rosa, y un gris para "Otros".
const PALETA = ["#22c55e", "#60a5fa", "#facc15", "#f472b6", "#a78bfa", "#94a3b8"];
const MAX_SEGMENTOS = 5;

const segmentos = computed(() => {
  const ordenados = [...props.datos].sort((a, b) => b.escaneos - a.escaneos).filter((d) => d.escaneos > 0);
  const top = ordenados.slice(0, MAX_SEGMENTOS);
  const resto = ordenados.slice(MAX_SEGMENTOS).reduce((acc, d) => acc + d.escaneos, 0);
  if (resto > 0) top.push({ nombre: "Otros", escaneos: resto });
  return top.map((d, i) => ({ ...d, color: PALETA[i % PALETA.length] }));
});

const total = computed(() => segmentos.value.reduce((acc, s) => acc + s.escaneos, 0));

// Arcos del donut en SVG: radio 15.9155 da una circunferencia de exactamente 100,
// así el porcentaje se usa directo como longitud del trazo.
const RADIO = 15.9155;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

const arcos = computed(() => {
  let acumulado = 0;
  return segmentos.value.map((s) => {
    const porcentaje = total.value ? (s.escaneos / total.value) * 100 : 0;
    const arco = { ...s, porcentaje, offset: -((acumulado / 100) * CIRCUNFERENCIA) };
    acumulado += porcentaje;
    return arco;
  });
});
</script>

<template>
  <div v-if="total > 0" class="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
    <svg viewBox="0 0 36 36" class="h-40 w-40 shrink-0 -rotate-90">
      <circle cx="18" cy="18" :r="RADIO" fill="none" stroke="currentColor" class="text-secondary" stroke-width="4" />
      <circle
        v-for="a in arcos"
        :key="a.nombre"
        cx="18"
        cy="18"
        :r="RADIO"
        fill="none"
        :stroke="a.color"
        stroke-width="4"
        :stroke-dasharray="`${(a.porcentaje / 100) * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`"
        :stroke-dashoffset="a.offset"
      />
    </svg>
    <ul class="flex flex-col gap-1.5 text-sm">
      <li v-for="a in arcos" :key="a.nombre" class="flex items-center gap-2">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: a.color }" />
        <span class="text-muted-foreground">{{ a.nombre }}</span>
        <span class="font-medium tabular-nums">{{ a.escaneos }}</span>
      </li>
    </ul>
  </div>
  <p v-else class="py-6 text-center text-sm text-muted-foreground">
    Todavía no hay escaneos registrados.
  </p>
</template>
