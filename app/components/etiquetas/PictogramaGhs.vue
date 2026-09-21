<script setup lang="ts">
import { computed } from 'vue'
import { PICTOGRAMAS_GHS } from '~/utils/ghs'

const props = defineProps<{ codigo: string; mostrarNombre?: boolean }>()

const nombre = computed(() => PICTOGRAMAS_GHS.find((p) => p.codigo === props.codigo)?.nombre ?? props.codigo)
</script>

<template>
  <div class="flex w-20 flex-col items-center gap-1 text-center">
    <!-- Pictograma oficial GHS de la ONU (UNECE) -->
    <img :src="`/ghs/${codigo}.png`" :alt="nombre" class="h-16 w-16 rounded-sm bg-white" />
    <span v-if="mostrarNombre" class="mt-1 text-[11px] leading-tight text-muted-foreground">{{ nombre }}</span>
  </div>
</template>
