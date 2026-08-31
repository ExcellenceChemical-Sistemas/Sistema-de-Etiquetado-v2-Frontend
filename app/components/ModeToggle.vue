<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sun, Moon } from 'lucide-vue-next'

const mode = useColorMode({ emitAuto: true })
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="relative">
        <Sun class="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon class="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span class="sr-only">Cambiar tema</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem @click="mode = 'light'">Claro</DropdownMenuItem>
      <DropdownMenuItem @click="mode = 'dark'">Oscuro</DropdownMenuItem>
      <DropdownMenuItem @click="mode = 'auto'">Sistema</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>