<script setup lang="ts">
import { Checkbox } from "@/components/ui/checkbox";
import {
  RECURSOS,
  RECURSO_LABEL,
  ACCIONES,
  type PermisosState,
  type Recurso,
} from "~/utils/permisos";

const props = defineProps<{
  modelValue: PermisosState;
  disabled?: boolean;
}>();

// Generar Etiqueta llena su selector con GET /plantillas, que exige
// PLANTILLAS.puedeVer. Dar ETIQUETAS.puedeCrear sin eso deja la pantalla a
// medias (selector vacío), así que se tilda solo. Se puede destildar a mano.
function cambiar(recurso: Recurso, key: (typeof ACCIONES)[number]["key"], valor: boolean) {
  props.modelValue[recurso][key] = valor;
  if (valor && recurso === "ETIQUETAS" && key === "puedeCrear") {
    props.modelValue.PLANTILLAS.puedeVer = true;
  }
}
</script>

<template>
  <div class="scroll-tema w-full min-w-0 rounded-lg border bg-card overflow-x-auto">
    <div class="min-w-max">
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
            @update:model-value="(v) => cambiar(recurso, a.key, v as boolean)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
