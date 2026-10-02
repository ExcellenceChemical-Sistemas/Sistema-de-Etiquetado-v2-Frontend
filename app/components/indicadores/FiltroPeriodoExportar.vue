<script setup lang="ts">
import { Download } from "@lucide/vue";
import ProgressBar from "~/components/ui/ProgressBar.vue";

// Toolbar de filtro mes/año + botón "Exportar PDF" con la barra de progreso animada: hasta
// ahora estaba copiada byte a byte en los 3 dashboards de indicadores (cotizaciones, pedidos,
// historial) — se extrae acá para que un cambio (ej. agregar un filtro, cambiar el texto del
// botón) no haya que repetirlo en los 3 lugares.
const props = defineProps<{
  mes: string;
  anio: string;
  meses: string[];
  aniosDisponibles: number[];
  disabled: boolean;
  isExporting: boolean;
  progress: number;
}>();

const emit = defineEmits<{
  "update:mes": [string];
  "update:anio": [string];
  exportar: [];
}>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <Select :model-value="props.mes" @update:model-value="(v) => emit('update:mes', String(v))">
      <SelectTrigger class="w-40" aria-label="Filtrar por mes">
        <SelectValue placeholder="Mes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TODOS">Todos los meses</SelectItem>
        <SelectItem v-for="(m, i) in meses" :key="i" :value="String(i)">{{ m }}</SelectItem>
      </SelectContent>
    </Select>
    <Select :model-value="props.anio" @update:model-value="(v) => emit('update:anio', String(v))">
      <SelectTrigger class="w-28" aria-label="Filtrar por año">
        <SelectValue placeholder="Año" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TODOS">Todos</SelectItem>
        <SelectItem v-for="anio in aniosDisponibles" :key="anio" :value="String(anio)">
          {{ anio }}
        </SelectItem>
      </SelectContent>
    </Select>
    <Button
      variant="outline"
      :disabled="disabled"
      class="min-w-[168px] justify-center"
      @click="emit('exportar')"
    >
      <template v-if="isExporting">
        <ProgressBar :value="progress" compact class="w-20" />
        <span class="ml-2 text-xs tabular-nums text-muted-foreground">{{ Math.round(progress) }}%</span>
      </template>
      <template v-else>
        <Download class="h-4 w-4 mr-2" />
        Exportar PDF
      </template>
    </Button>
  </div>
</template>
