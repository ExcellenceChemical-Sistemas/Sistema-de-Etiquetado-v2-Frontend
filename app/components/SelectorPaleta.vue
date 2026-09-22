<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Palette } from 'lucide-vue-next'
import { useTemaColor } from '~/composables/useTemaColor'

const { paletaActual, paletas } = useTemaColor()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" title="Color de fondo">
        <Palette class="size-4" />
        <span class="sr-only">Color de fondo</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel class="text-xs text-muted-foreground">Color de fondo</DropdownMenuLabel>
      <DropdownMenuRadioGroup v-model="paletaActual">
        <DropdownMenuRadioItem v-for="p in paletas" :key="p.id" :value="p.id">
          <span
            class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            :style="{ backgroundColor: p.muestra }"
          />
          {{ p.nombre }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
