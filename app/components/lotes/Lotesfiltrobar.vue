<script setup lang="ts">
import { Search, X } from '@lucide/vue'
import type { VencimientoFilter } from '~/composables/useloteslistado'

const search = defineModel<string>('search', { required: true })
const vencimientoFilter = defineModel<VencimientoFilter>('vencimientoFilter', { required: true })
const fechaDesde = defineModel<string>('fechaDesde', { required: true })
const fechaHasta = defineModel<string>('fechaHasta', { required: true })

defineProps<{
  resultCount?: number
}>()


</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <div class="relative w-full max-w-sm">
      <Search class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        v-model="search"
        placeholder="Buscar por lote, producto o fabricante..."
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

    <div class="flex items-center gap-1 rounded-md border border-border p-1">
      <Button size="sm" :variant="vencimientoFilter === 'todos' ? 'default' : 'ghost'" @click="vencimientoFilter = 'todos'">Todos</Button>
      <Button size="sm" :variant="vencimientoFilter === 'porVencer' ? 'default' : 'ghost'" @click="vencimientoFilter = 'porVencer'">Por vencer</Button>
      <Button size="sm" :variant="vencimientoFilter === 'vencidos' ? 'default' : 'ghost'" @click="vencimientoFilter = 'vencidos'">Vencidos</Button>
      <Button size="sm" :variant="vencimientoFilter === 'vigente' ? 'default' : 'ghost'" @click="vencimientoFilter = 'vigente'">Vigentes</Button>
    </div>

  </div>
</template>