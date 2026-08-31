<script setup lang="ts">
import { Search } from '@lucide/vue'
import type { NfpaFilter } from '~/composables/useProductosListado'

const search = defineModel<string>('search', { required: true })
const nfpaFilter = defineModel<NfpaFilter>('nfpaFilter', { required: true })

defineProps<{
  /** Cantidad de resultados a mostrar junto al buscador (opcional) */
  resultCount?: number
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <div class="relative w-full max-w-sm">
      <Search class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        v-model="search"
        placeholder="Buscar producto..."
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
      <Button
        size="sm"
        :variant="nfpaFilter === 'todos' ? 'default' : 'ghost'"
        @click="nfpaFilter = 'todos'"
      >
        Todos
      </Button>
      <Button
        size="sm"
        :variant="nfpaFilter === 'sin' ? 'default' : 'ghost'"
        @click="nfpaFilter = 'sin'"
      >
        Sin rombo NFPA
      </Button>
      <Button
        size="sm"
        :variant="nfpaFilter === 'con' ? 'default' : 'ghost'"
        @click="nfpaFilter = 'con'"
      >
        Con rombo
      </Button>
    </div>
  </div>
</template>