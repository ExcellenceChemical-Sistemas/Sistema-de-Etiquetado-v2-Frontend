<script setup lang="ts">
import PieLegal from '~/components/PieLegal.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-8 bg-background">
    <a
      href="#contenido"
      class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
    >
      Saltar al contenido
    </a>
    <div class="flex flex-col items-center gap-1">
      <img src="/excellence-chemical-logo.png" alt="Excellence Chemical" class="h-14" />
      <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Plataforma de Gestión
      </p>
    </div>
    <main id="contenido" class="flex w-full justify-center">
      <slot />
    </main>
    <PieLegal />
  </div>
</template>