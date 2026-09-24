<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <!-- scroll-tema (tailwind.css): el scroll horizontal de esta tabla es
       nativo a propósito (no ScrollArea de shadcn) porque este div puede
       vivir anidado dentro de otro ScrollArea vertical (ver historial/indicadores.vue
       y pedidos/indicadores.vue) — un segundo ScrollArea adentro rompería el
       sticky header. Se tematiza igual para que no se vea el scrollbar gris
       del sistema. -->
  <div data-slot="table-container" class="scroll-tema relative w-full overflow-auto">
    <table data-slot="table" :class="cn('w-full caption-bottom text-sm', props.class)">
      <slot />
    </table>
  </div>
</template>
