<script setup lang="ts">
import { MinusCircle } from "@lucide/vue";

defineProps<{
  nfpaSalud?: number | null
  nfpaInflamabilidad?: number | null
  nfpaReactividad?: number | null
}>()
</script>

<template>
  <div
    v-if="nfpaSalud != null || nfpaInflamabilidad != null || nfpaReactividad != null"
    class="flex items-center gap-1"
  >
    <span
      v-if="nfpaSalud != null"
      class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-semibold"
      title="Salud"
    >{{ nfpaSalud }}</span>
    <span
      v-if="nfpaInflamabilidad != null"
      class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-semibold"
      title="Inflamabilidad"
    >{{ nfpaInflamabilidad }}</span>
    <span
      v-if="nfpaReactividad != null"
      class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400 text-black text-[10px] font-semibold"
      title="Reactividad"
    >{{ nfpaReactividad }}</span>
  </div>
  <span
    v-else
    class="inline-flex items-center justify-center text-muted-foreground/40"
    title="Sin rombo NFPA"
  >
    <MinusCircle class="h-4 w-4" />
  </span>
</template>