<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "@lucide/vue";
import { usePdfViewer } from "~/composables/usePdfViewer";
import Spinner from "~/components/ui/Spinner.vue";

const props = defineProps<{
  url: string | null;
}>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const contenedorEl = ref<HTMLElement | null>(null);

const {
  cargando,
  error,
  paginaActual,
  totalPaginas,
  cargar,
  siguiente,
  anterior,
  acercar,
  alejar,
  ajustarAncho,
} = usePdfViewer();

watch(
  () => props.url,
  async (nuevaUrl) => {
    if (!nuevaUrl) return;
    await nextTick();
    if (canvasEl.value && contenedorEl.value) {
      cargar(nuevaUrl, canvasEl.value, contenedorEl.value);
    }
  },
  { immediate: true },
);

let resizeObserver: ResizeObserver | null = null;
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  if (!contenedorEl.value) return;
  resizeObserver = new ResizeObserver(() => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => ajustarAncho(), 150);
  });
  resizeObserver.observe(contenedorEl.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (resizeTimeout) clearTimeout(resizeTimeout);
});
</script>

<template>
  <!-- select-none: acompaña al bloqueo de atajos de usePdfViewer, para que el
       contenido tampoco se pueda seleccionar y copiar -->
  <div class="flex h-full w-full select-none flex-col">
    <div class="flex shrink-0 items-center justify-center gap-2 border-b border-border pb-2">
      <Button variant="ghost" size="icon" :disabled="paginaActual <= 1" @click="anterior">
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <span class="text-sm tabular-nums text-muted-foreground">
        {{ paginaActual }} / {{ totalPaginas || 1 }}
      </span>
      <Button variant="ghost" size="icon" :disabled="paginaActual >= totalPaginas" @click="siguiente">
        <ChevronRight class="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" class="mx-2 h-4" />
      <Button variant="ghost" size="icon" @click="alejar">
        <ZoomOut class="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" @click="acercar">
        <ZoomIn class="h-4 w-4" />
      </Button>
    </div>

    <div ref="contenedorEl" class="relative min-h-0 flex-1 overflow-auto bg-muted/30 py-4">
      <div v-if="cargando" class="flex h-full items-center justify-center">
        <Spinner class="h-6 w-6" />
      </div>
      <p v-else-if="error" class="flex h-full items-center justify-center text-sm text-destructive">
        {{ error }}
      </p>
      <div class="flex justify-center">
        <canvas ref="canvasEl" class="shadow-md" :class="{ hidden: cargando || error }" />
      </div>
    </div>
  </div>
</template>