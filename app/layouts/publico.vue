<script setup lang="ts">
import PieLegal from "~/components/PieLegal.vue";
// Cada página pública puede poner su propio rótulo con definePageMeta({ tituloPublico }).
const route = useRoute();
const titulo = computed(() => String(route.meta.tituloPublico ?? "Trazabilidad de producto"));
</script>

<template>
  <div class="min-h-screen bg-background">
    <a
      href="#contenido"
      class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
    >
      Saltar al contenido
    </a>
    <header class="border-b bg-card">
      <div class="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <img src="/excellence-chemical-logo.png" alt="Excellence Chemical" class="h-10" />
        <p class="text-right text-[11px] font-medium uppercase leading-tight tracking-widest text-muted-foreground">
          {{ titulo }}
        </p>
      </div>
    </header>
    <main id="contenido" class="mx-auto w-full max-w-lg px-4 py-5">
      <slot />
    </main>
    <PieLegal class="mx-auto max-w-lg pb-8" />
  </div>
</template>
