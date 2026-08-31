<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <header
        class="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4"
      >
        <SidebarTrigger class="-ml-1" />
        <Separator orientation="vertical" class="mr-2 h-4" />
        <!-- acá podés meter breadcrumbs con el nombre de la vista actual -->
      </header>

      <div class="flex flex-1 flex-col gap-4 p-4">
        <slot />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>