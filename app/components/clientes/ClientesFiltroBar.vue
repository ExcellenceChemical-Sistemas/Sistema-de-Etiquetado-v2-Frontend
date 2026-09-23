<script setup lang="ts">
import { Search } from '@lucide/vue'

const search = defineModel<string>('search', { required: true })

defineProps<{
  /** Cantidad de resultados a mostrar junto al buscador (opcional) */
  resultCount?: number
}>()
</script>

<template>
  <div class="relative w-full max-w-sm shrink-0">
    <Search class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      v-model="search"
      placeholder="Buscar por nombre, documento o celular..."
      class="pl-8"
      :class="resultCount !== undefined ? 'pr-24' : ''"
    />
    <span
      v-if="resultCount !== undefined"
      class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums"
    >
      {{ resultCount }} resultado{{ resultCount === 1 ? '' : 's' }}
    </span>
  </div>
</template>
