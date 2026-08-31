<script setup lang="ts">
import { Toaster } from '~/components/ui/sonner'
// o: import Sonner from '~/components/ui/sonner'
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster theme="dark" />
  </div>
</template>