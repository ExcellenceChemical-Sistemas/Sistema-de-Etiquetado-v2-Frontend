<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import SelectorPaleta from '@/components/SelectorPaleta.vue'
import PieLegal from '@/components/PieLegal.vue'
</script>

<template>
  <SidebarProvider>
    <a
      href="#contenido"
      class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
    >
      Saltar al contenido
    </a>
    <AppSidebar />
    <SidebarInset>
      <header
        class="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4"
      >
        <SidebarTrigger class="-ml-1" />
        <Separator orientation="vertical" class="mr-2 h-4" />
        <!-- acá podés meter breadcrumbs con el nombre de la vista actual -->
        <SelectorPaleta class="ml-auto" />
      </header>

      <main id="contenido" class="flex flex-1 flex-col gap-4 p-4">
        <slot />
      </main>
      <PieLegal class="border-t py-3" />
    </SidebarInset>
  </SidebarProvider>
</template>