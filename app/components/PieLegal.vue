<script setup lang="ts">
import { EMPRESA } from '~/config/empresa'
</script>

<template>
  <footer class="px-4 text-center text-xs text-muted-foreground">
    <nav aria-label="Información legal" class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      <NuxtLink to="/privacidad" class="underline-offset-4 hover:text-foreground hover:underline">
        Política de privacidad
      </NuxtLink>
      <NuxtLink to="/seguridad" class="underline-offset-4 hover:text-foreground hover:underline">
        Política de seguridad
      </NuxtLink>
      <NuxtLink to="/cookies" class="underline-offset-4 hover:text-foreground hover:underline">
        Política de cookies
      </NuxtLink>
    </nav>
    <p class="mt-2">{{ EMPRESA.razonSocial }}</p>
  </footer>
</template>
