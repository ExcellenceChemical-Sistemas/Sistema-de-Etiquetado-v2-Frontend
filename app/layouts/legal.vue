<script setup lang="ts">
import PieLegal from '~/components/PieLegal.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <a
      href="#contenido"
      class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
    >
      Saltar al contenido
    </a>
    <header class="border-b bg-card">
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <NuxtLink to="/" aria-label="Excellence Chemical, ir al inicio">
          <img src="/excellence-chemical-logo.png" alt="Excellence Chemical" class="h-10" />
        </NuxtLink>
        <NuxtLink
          to="/login"
          class="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Ir al inicio de sesión
        </NuxtLink>
      </div>
    </header>
    <main id="contenido" class="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <slot />
    </main>
    <PieLegal class="border-t py-6" />
  </div>
</template>
