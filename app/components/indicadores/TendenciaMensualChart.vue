<script setup lang="ts">
import { computed } from "vue";

// Barra por mes con el % de cumplimiento de la meta. Color = estado (cumple/no cumple), no
// identidad de serie, por eso lleva leyenda en vez de depender solo del color. Una sola serie,
// un solo eje (0-100%), etiquetas directas en cada barra — ver skill de dataviz.
const props = defineProps<{
  datos: { mes: string; pct: number; total: number; dentro: number }[];
  meta: number;
}>();

const BAR_WIDTH = 28;
const GAP = 18;
const PLOT_HEIGHT = 130;
const PADDING_TOP = 20;
const PADDING_X = 6;
const AXIS_HEIGHT = 20;

// Ancho mínimo para que 1-2 meses de datos no salgan como una barra gigante y angosta al
// escalar el SVG a lo ancho del contenedor (ver bulletproof responsive SVG pattern abajo).
const width = computed(() =>
  Math.max(220, props.datos.length * (BAR_WIDTH + GAP) - GAP + PADDING_X * 2),
);
const height = PLOT_HEIGHT + PADDING_TOP + AXIS_HEIGHT;

function barX(i: number) {
  return PADDING_X + i * (BAR_WIDTH + GAP);
}
function barY(pct: number) {
  return PADDING_TOP + PLOT_HEIGHT - (Math.min(pct, 100) / 100) * PLOT_HEIGHT;
}
function barH(pct: number) {
  return Math.max((Math.min(pct, 100) / 100) * PLOT_HEIGHT, 1);
}
const metaY = computed(() => PADDING_TOP + PLOT_HEIGHT - (Math.min(props.meta, 100) / 100) * PLOT_HEIGHT);
</script>

<template>
  <div v-if="datos.length === 0" class="flex h-40 items-center justify-center text-sm text-muted-foreground">
    Elegí un año para ver la tendencia mensual
  </div>
  <div v-else class="space-y-2">
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      :width="width"
      :height="height"
      style="max-width: 100%; height: auto; display: block"
      role="img"
      :aria-label="`Cumplimiento mensual, meta ${meta} por ciento`"
    >
      <line
        :x1="0" :x2="width" :y1="metaY" :y2="metaY"
        stroke="currentColor" class="text-muted-foreground/50" stroke-width="1" stroke-dasharray="4 3"
      />
      <text :x="width" :y="metaY - 4" text-anchor="end" class="fill-muted-foreground" font-size="9">
        Meta {{ meta }}%
      </text>
      <g v-for="(d, i) in datos" :key="d.mes">
        <rect
          :x="barX(i)"
          :y="barY(d.pct)"
          :width="BAR_WIDTH"
          :height="barH(d.pct)"
          rx="4"
          :class="d.pct >= meta ? 'fill-green-500' : 'fill-amber-500'"
        >
          <title>{{ d.mes }}: {{ Math.round(d.pct) }}% ({{ d.dentro }} de {{ d.total }})</title>
        </rect>
        <text
          :x="barX(i) + BAR_WIDTH / 2"
          :y="barY(d.pct) - 6"
          text-anchor="middle"
          class="fill-foreground"
          font-size="10"
          font-weight="600"
        >
          {{ Math.round(d.pct) }}%
        </text>
        <text
          :x="barX(i) + BAR_WIDTH / 2"
          :y="PADDING_TOP + PLOT_HEIGHT + 16"
          text-anchor="middle"
          class="fill-muted-foreground"
          font-size="10"
        >
          {{ d.mes }}
        </text>
      </g>
    </svg>
    <div class="flex items-center gap-4 text-xs text-muted-foreground">
      <span class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-sm bg-green-500" />
        Cumple meta (≥{{ meta }}%)
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-sm bg-amber-500" />
        No cumple
      </span>
    </div>
  </div>
</template>
