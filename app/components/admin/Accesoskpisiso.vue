<script setup lang="ts">
import { Checkbox } from "@/components/ui/checkbox";
import {
  PROCESOS_INDICADOR,
  PROCESO_INDICADOR_LABEL,
  ACCIONES_DOCUMENTO,
  type AccesosKpisIsoState,
} from "~/utils/permisos";

defineProps<{
  modelValue: AccesosKpisIsoState;
  disabled?: boolean;
}>();
</script>

<template>
  <div
    v-if="modelValue"
    class="w-full min-w-0 rounded-lg border bg-card overflow-x-auto"
  >
    <div class="min-w-max">
      <!-- Indicadores: 5 permisos por proceso -->
      <div
        class="grid grid-cols-[1fr_repeat(5,72px)] items-center gap-2 px-5 py-3 border-b bg-muted/40"
      >
        <span
          class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >Proceso (Indicadores)</span
        >
        <span
          v-for="a in ACCIONES_DOCUMENTO"
          :key="a.key"
          class="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center"
        >
          {{ a.label }}
        </span>
      </div>

      <div
        v-for="proceso in PROCESOS_INDICADOR"
        :key="proceso"
        class="grid grid-cols-[1fr_repeat(5,72px)] items-center gap-2 px-5 py-3 border-b"
      >
        <span class="text-sm font-medium">{{
          PROCESO_INDICADOR_LABEL[proceso]
        }}</span>
        <div
          v-for="a in ACCIONES_DOCUMENTO"
          :key="a.key"
          class="flex justify-center"
        >
          <Checkbox
            :disabled="disabled"
            :model-value="modelValue.indicador[proceso][a.key]"
            @update:model-value="
              (v) => (modelValue.indicador[proceso][a.key] = v as boolean)
            "
          />
        </div>
      </div>

      <!-- ISO: los mismos 5 permisos, sin desglose por proceso -->
      <div
        class="grid grid-cols-[1fr_repeat(5,72px)] items-center gap-2 px-5 py-3 border-b bg-muted/40"
      >
        <span
          class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >Documentación ISO</span
        >
        <span
          v-for="a in ACCIONES_DOCUMENTO"
          :key="a.key"
          class="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center"
        >
          {{ a.label }}
        </span>
      </div>

      <div
        class="grid grid-cols-[1fr_repeat(5,72px)] items-center gap-2 px-5 py-3 border-b"
      >
        <span class="text-sm font-medium"
          >ISO-SGC (documentación completa)</span
        >
        <div
          v-for="a in ACCIONES_DOCUMENTO"
          :key="a.key"
          class="flex justify-center"
        >
          <Checkbox
            :disabled="disabled"
            :model-value="modelValue.iso[a.key]"
            @update:model-value="(v) => (modelValue.iso[a.key] = v as boolean)"
          />
        </div>
      </div>

      <!-- Obsoleto: un solo flag, acopla ver + editar a propósito -->
      <div class="flex items-start gap-3 px-5 py-3 bg-muted/20">
        <Checkbox
          id="gestiona-obsoleto"
          :disabled="disabled"
          :model-value="modelValue.iso.gestionaObsoleto"
          class="mt-0.5"
          @update:model-value="
            (v) => (modelValue.iso.gestionaObsoleto = v as boolean)
          "
        />
        <label for="gestiona-obsoleto" class="cursor-pointer">
          <span class="text-sm font-medium">Carpeta Obsoleto</span>
          <span class="block text-xs text-muted-foreground">
            Permite ver y editar el histórico de ISO. No incluye descargar,
            adjuntar ni eliminar.
          </span>
        </label>
      </div>
    </div>
  </div>
</template>
