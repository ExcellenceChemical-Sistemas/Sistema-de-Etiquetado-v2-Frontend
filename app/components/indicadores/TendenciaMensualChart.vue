<script setup lang="ts">
import { computed } from "vue";
import { VisAxis, VisLine, VisStackedBar, VisXYContainer } from "@unovis/vue";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer, ChartCrosshair, ChartTooltip } from "@/components/ui/chart";

// Barra por mes con el % de cumplimiento de la meta. Color = estado (cumple/no cumple), no
// identidad de serie, por eso lleva leyenda en vez de depender solo del color.
type Punto = { mes: string; pct: number; total: number; dentro: number };

const props = defineProps<{
  datos: Punto[];
  meta: number;
}>();

const COLOR_CUMPLE = "#22c55e"; // green-500
const COLOR_NO_CUMPLE = "#f59e0b"; // amber-500
const COLOR_META = "#9ca3af"; // gray-400

const chartConfig = {
  pct: { label: "Cumplimiento", color: COLOR_CUMPLE },
} satisfies ChartConfig;

const x = (_d: Punto, i: number) => i;
const y = [(d: Punto) => Math.min(d.pct, 100)];
const yMeta = () => Math.min(props.meta, 100);
const colorBarra = (d: Punto) => (d.pct >= props.meta ? COLOR_CUMPLE : COLOR_NO_CUMPLE);

const tickMes = (i: number) => props.datos[i]?.mes ?? "";
const tickPct = (v: number) => `${v}%`;

// Unovis pasa a la plantilla el dato bajo el cursor; devuelve HTML.
const tooltip = (d: Punto) => `
  <div class="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
    <div class="font-medium">${d.mes}</div>
    <div class="text-muted-foreground">${Math.round(d.pct)}% (${d.dentro} de ${d.total})</div>
  </div>
`;

const altura = computed(() => "h-52");
</script>

<template>
  <div v-if="datos.length === 0" class="flex h-40 items-center justify-center text-sm text-muted-foreground">
    Elegí un año para ver la tendencia mensual
  </div>
  <div v-else class="space-y-2">
    <ChartContainer
      :config="chartConfig"
      :class="['w-full', altura]"
      role="img"
      :aria-label="`Cumplimiento mensual, meta ${meta} por ciento`"
    >
      <VisXYContainer :data="datos" :y-domain="[0, 100]" :margin="{ top: 10, right: 8 }">
        <VisStackedBar
          :x="x"
          :y="y"
          :color="colorBarra"
          :rounded-corners="4"
          :bar-padding="0.35"
          :bar-max-width="40"
        />
        <VisLine
          :x="x"
          :y="yMeta"
          :color="COLOR_META"
          :line-width="1"
          :line-dash-array="[4, 3]"
        />
        <VisAxis
          type="x"
          :tick-format="tickMes"
          :num-ticks="datos.length"
          :tick-line="false"
          :domain-line="false"
          :grid-line="false"
        />
        <VisAxis
          type="y"
          :tick-format="tickPct"
          :num-ticks="5"
          :tick-line="false"
          :domain-line="false"
        />
        <ChartTooltip />
        <ChartCrosshair :template="tooltip" :color="colorBarra" />
      </VisXYContainer>
    </ChartContainer>

    <div class="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <span class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-sm bg-green-500" />
        Cumple meta (≥{{ meta }}%)
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-sm bg-amber-500" />
        No cumple
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block h-0 w-4 border-t border-dashed border-muted-foreground/60" />
        Meta {{ meta }}%
      </span>
    </div>
  </div>
</template>