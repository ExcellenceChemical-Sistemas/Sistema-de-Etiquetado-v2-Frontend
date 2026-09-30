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
// listas de otro recurso, o dan acceso a una acción de otro recurso desde su propia pantalla.
// Sin ese permiso el backend responde 403 (selector vacío, o botón que falla al guardar), así
// que se tilda solo. Se puede destildar a mano. Por defecto se tilda "Ver"; se puede pedir otra
// acción puntual con { recurso, accion }.
//   - Generar etiqueta: plantillas (PLANTILLAS) y lotes (LOTES).
//   - Formulario de lote: productos (PRODUCTOS) y fabricantes (FABRICANTES).
//   - Nueva cotización / Nuevo pedido: el combobox de cliente lee /clientes (recurso CLIENTES,
//     propio), y el link "Créalo en Clientes" deja crear uno nuevo ahí mismo — hace falta Ver y
//     Crear en Clientes, no solo Ver, si no quien solo tiene COTIZACIONES o PEDIDOS no puede
//     registrar un cliente nuevo.
type Accion = (typeof ACCIONES)[number]["key"];
type Requisito = Recurso | { recurso: Recurso; accion: Accion };
const REQUIERE_CLIENTES: Requisito[] = ["CLIENTES", { recurso: "CLIENTES", accion: "puedeCrear" }];
const DEPENDENCIAS: { recurso: Recurso; accion: Accion; requiere: Requisito[] }[] = [
  { recurso: "ETIQUETAS", accion: "puedeCrear", requiere: ["PLANTILLAS", "LOTES"] },
  { recurso: "LOTES", accion: "puedeCrear", requiere: ["PRODUCTOS", "FABRICANTES"] },
  { recurso: "LOTES", accion: "puedeEditar", requiere: ["PRODUCTOS", "FABRICANTES"] },
  { recurso: "COTIZACIONES", accion: "puedeCrear", requiere: REQUIERE_CLIENTES },
  { recurso: "PEDIDOS", accion: "puedeCrear", requiere: REQUIERE_CLIENTES },
];

function cambiar(recurso: Recurso, key: Accion, valor: boolean) {
  props.modelValue[recurso][key] = valor;
  if (!valor) return;
  for (const d of DEPENDENCIAS) {
    if (d.recurso === recurso && d.accion === key) {
      for (const r of d.requiere) {
        if (typeof r === "string") props.modelValue[r].puedeVer = true;
        else props.modelValue[r.recurso][r.accion] = true;
      }
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
