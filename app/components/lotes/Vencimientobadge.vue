<script setup lang="ts">
import { computed } from 'vue'
import { estadoVencimiento } from '~/utils/fechavencimiento'

const props = defineProps<{
  fecha: string
}>()

const estado = computed(() => estadoVencimiento(props.fecha))
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      v-if="estado === 'vencido'"
      class="h-2 w-2 rounded-full bg-red-500 shrink-0"
      title="Vencido"
    />
    <span
      v-else-if="estado === 'porVencer'"
      class="h-2 w-2 rounded-full bg-amber-500 shrink-0"
      title="Por vencer (30 días o menos)"
    />
    <span>{{ fecha }}</span>
  </div>
</template>