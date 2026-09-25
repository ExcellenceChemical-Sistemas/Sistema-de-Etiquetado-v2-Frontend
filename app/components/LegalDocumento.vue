<script setup lang="ts">
import { ULTIMA_ACTUALIZACION_LEGAL } from '~/config/empresa'

defineProps<{ titulo: string }>()
</script>

<template>
  <article
    class="space-y-4 text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5"
  >
    <h1 class="text-2xl font-semibold">{{ titulo }}</h1>
    <p class="text-muted-foreground">Última actualización: {{ ULTIMA_ACTUALIZACION_LEGAL }}</p>
    <slot />
  </article>
</template>
