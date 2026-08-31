<script setup lang="ts">
defineProps<{
  /** Valor entre 0 y 100 */
  value: number;
  label?: string;
  /** Versión compacta: barra más fina, sin fila de label separada (para usar dentro de botones) */
  compact?: boolean;
}>();
</script>

<template>
  <div class="w-full space-y-1">
    <div
      v-if="label && !compact"
      class="flex items-center justify-between text-xs text-muted-foreground"
    >
      <span>{{ label }}</span>
      <span class="tabular-nums">{{ Math.round(value) }}%</span>
    </div>
    <div
      class="w-full overflow-hidden rounded-full bg-muted"
      :class="compact ? 'h-1.5' : 'h-2'"
    >
      <div
        class="h-full rounded-full bg-primary transition-[width] duration-150 ease-linear"
        :style="{ width: `${Math.min(100, Math.max(0, value))}%` }"
      />
    </div>
  </div>
</template>
