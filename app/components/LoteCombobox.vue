<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { ChevronsUpDown, Check } from "@lucide/vue";
import type { Lote } from "~/types/lote";

const props = defineProps<{
  modelValue: number | undefined;
  lotes: Lote[];
  loading?: boolean;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number | undefined): void;
}>();

function loteLabel(lote: Lote) {
  return `${lote.producto?.nombre ?? "Producto ?"} — ${lote.fabricante?.nombre ?? "Fabricante ?"} (Lote ${lote.numeroLote})`;
}

const search = ref("");
const open = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return props.lotes;
  return props.lotes.filter((l) => loteLabel(l).toLowerCase().includes(q));
});

// Si el modelValue cambia desde afuera (ej. resetForm / botón Limpiar),
// sincroniza el texto visible del input.
watch(
  () => props.modelValue,
  (id) => {
    if (!id) {
      search.value = "";
      return;
    }
    const lote = props.lotes.find((l) => l.id === id);
    if (lote) search.value = loteLabel(lote);
  },
  { immediate: true },
);

function selectLote(lote: Lote) {
  emit("update:modelValue", lote.id);
  search.value = loteLabel(lote);
  open.value = false;
}

function onFocus() {
  open.value = true;
}

function onClickOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    open.value = false;
    // Si el usuario borró el texto sin elegir nada, restaura el label de lo
    // que ya estaba seleccionado (no deja el input a medio escribir).
    if (props.modelValue) {
      const lote = props.lotes.find((l) => l.id === props.modelValue);
      if (lote) search.value = loteLabel(lote);
    }
  }
}

onMounted(() => document.addEventListener("mousedown", onClickOutside));
onBeforeUnmount(() =>
  document.removeEventListener("mousedown", onClickOutside),
);
</script>

<template>
  <div ref="wrapperRef" class="relative">
    <div class="relative">
      <Input
        v-model="search"
        :placeholder="
          loading ? 'Cargando lotes…' : (placeholder ?? 'Buscar lote…')
        "
        :disabled="loading"
        autocomplete="off"
        @focus="onFocus"
      />
      <ChevronsUpDown
        class="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>

    <div
      v-if="open"
      class="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md"
    >
      <ScrollArea class="max-h-64">
        <div class="p-1">
          <p
            v-if="filtered.length === 0"
            class="px-2 py-1.5 text-sm text-muted-foreground"
          >
            Sin resultados
          </p>
          <button
            v-for="lote in filtered"
            :key="lote.id"
            type="button"
            class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            @click="selectLote(lote)"
          >
            <Check
              class="h-4 w-4 shrink-0"
              :class="lote.id === modelValue ? 'opacity-100' : 'opacity-0'"
            />
            <span class="truncate">{{ loteLabel(lote) }}</span>
          </button>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>