<script setup lang="ts">
import { Checkbox } from "@/components/ui/checkbox";
import {
  RECURSOS,
  RECURSO_LABEL,
  ACCIONES,
  type PermisosState,
} from "~/utils/permisos";

defineProps<{
  modelValue: PermisosState;
  disabled?: boolean;
}>();
</script>

<template>
  <div class="rounded-lg border bg-card overflow-hidden">
    <div
      class="grid grid-cols-[1fr_repeat(4,72px)] items-center gap-2 px-5 py-3 border-b bg-muted/40"
    >
      <span
        class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >Módulo</span
      >
      <span
        v-for="a in ACCIONES"
        :key="a.key"
        class="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center"
      >
        {{ a.label }}
      </span>
    </div>

    <div
      v-for="recurso in RECURSOS"
      :key="recurso"
      class="grid grid-cols-[1fr_repeat(4,72px)] items-center gap-2 px-5 py-3 border-b last:border-b-0"
    >
      <span class="text-sm font-medium">{{ RECURSO_LABEL[recurso] }}</span>
      <div v-for="a in ACCIONES" :key="a.key" class="flex justify-center">
        <Checkbox
          :disabled="disabled"
          :model-value="modelValue[recurso][a.key]"
          @update:model-value="
            (v) => (modelValue[recurso][a.key] = v as boolean)
          "
        />
      </div>
    </div>
  </div>
</template>
