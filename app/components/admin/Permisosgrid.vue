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

// Dependencias entre permisos: algunas pantallas llenan sus selectores con
// listas de otro recurso. Sin el "Ver" de ese recurso el backend responde 403
// y el selector queda vacío, así que se tilda solo. Se puede destildar a mano.
//   - Generar etiqueta: plantillas (PLANTILLAS) y lotes (LOTES).
//   - Formulario de lote: productos (PRODUCTOS) y fabricantes (FABRICANTES).
type Accion = (typeof ACCIONES)[number]["key"];
const DEPENDENCIAS: { recurso: Recurso; accion: Accion; requiere: Recurso[] }[] = [
  { recurso: "ETIQUETAS", accion: "puedeCrear", requiere: ["PLANTILLAS", "LOTES"] },
  { recurso: "LOTES", accion: "puedeCrear", requiere: ["PRODUCTOS", "FABRICANTES"] },
  { recurso: "LOTES", accion: "puedeEditar", requiere: ["PRODUCTOS", "FABRICANTES"] },
];

function cambiar(recurso: Recurso, key: Accion, valor: boolean) {
  props.modelValue[recurso][key] = valor;
  if (!valor) return;
  for (const d of DEPENDENCIAS) {
    if (d.recurso === recurso && d.accion === key) {
      for (const r of d.requiere) props.modelValue[r].puedeVer = true;
    }
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
