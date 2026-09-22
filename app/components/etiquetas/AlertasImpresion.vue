<script setup lang="ts">
import { computed, watch } from "vue";
import { toast } from "vue-sonner";
import { TriangleAlert, CircleAlert } from "@lucide/vue";
import { usePermiso } from "~/composables/usePermiso";
import { useEstadoImpresion, type AlertaImpresion } from "~/composables/useEstadoImpresion";

// Avisa (banner + aviso emergente) cuando el agente no responde, la impresora se
// quedó sin papel o tinta, o hay etiquetas esperando demasiado. Solo lo ven quienes
// trabajan con etiquetas.
const permiso = usePermiso("ETIQUETAS");
const habilitado = computed(() => permiso.puedeVer || permiso.puedeCrear);
const { data: estado } = useEstadoImpresion(habilitado);

const alertas = computed<AlertaImpresion[]>(() => estado.value?.alertas ?? []);

// Un aviso emergente por cada alerta nueva; mientras siga igual solo queda el banner.
const yaAvisadas = new Set<string>();
watch(
  alertas,
  (lista) => {
    const claves = new Set(lista.map((a) => `${a.tipo}:${a.mensaje}`));
    for (const clave of [...yaAvisadas]) if (!claves.has(clave)) yaAvisadas.delete(clave);
    for (const a of lista) {
      const clave = `${a.tipo}:${a.mensaje}`;
      if (yaAvisadas.has(clave)) continue;
      yaAvisadas.add(clave);
      const opciones = { duration: 12000 };
      if (a.severidad === "error") toast.error(a.mensaje, opciones);
      else toast.warning(a.mensaje, opciones);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="alertas.length" class="flex flex-col gap-2" role="alert">
    <div
      v-for="a in alertas"
      :key="a.tipo + a.mensaje"
      class="flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
      :class="
        a.severidad === 'error'
          ? 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
      "
    >
      <CircleAlert v-if="a.severidad === 'error'" class="mt-0.5 h-4 w-4 shrink-0" />
      <TriangleAlert v-else class="mt-0.5 h-4 w-4 shrink-0" />
      <span>{{ a.mensaje }}</span>
    </div>
  </div>
</template>
