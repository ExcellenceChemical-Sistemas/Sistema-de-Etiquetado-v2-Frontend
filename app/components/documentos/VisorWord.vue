<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from "vue";
import { renderAsync } from "docx-preview";
import Spinner from "~/components/ui/Spinner.vue";
import { useBloqueoDocumento } from "~/composables/useBloqueoDocumento";
import { ScrollArea } from "~/components/ui/scroll-area";

const props = defineProps<{
  url: string | null;
}>();

const contenedorEl = ref<HTMLElement | null>(null);
const cargando = ref(false);
const error = ref<string | null>(null);

// mismo bloqueo que el visor de PDF
useBloqueoDocumento();

// para descartar una descarga en curso si cambia la URL o se desmonta
let peticion: AbortController | null = null;

async function cargar(url: string) {
  cargando.value = true;
  error.value = null;
  peticion?.abort();
  peticion = new AbortController();

  try {
    await nextTick();
    const contenedor = contenedorEl.value;
    if (!contenedor) return;
    contenedor.innerHTML = "";

    // El .docx se baja entero al navegador: docx-preview necesita los bytes.
    // La URL firmada de Supabase vive 300s, de sobra para esta única lectura.
    const respuesta = await fetch(url, { signal: peticion.signal });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const buffer = await respuesta.arrayBuffer();

    await renderAsync(buffer, contenedor, undefined, {
      inWrapper: true,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
    });
  } catch (e: any) {
    if (e?.name === "AbortError") return;
    console.error("Error cargando el documento Word:", e);
    error.value = "No se pudo cargar el documento";
  } finally {
    cargando.value = false;
  }
}

watch(
  () => props.url,
  (nuevaUrl) => {
    if (nuevaUrl) cargar(nuevaUrl);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  peticion?.abort();
});
</script>

<template>
  <!-- select-none: docx-preview renderiza HTML real, así que sin esto el texto
       del documento se podría seleccionar y copiar. Es el mismo disuasivo que
       usa VisorPdf y tiene el mismo alcance: NO es protección real (punto 4.1
       del contexto). Quien quiera el archivo lo tiene en la pestaña Network. -->
  <div class="flex h-full w-full select-none flex-col">
    <ScrollArea class="relative min-h-0 flex-1 bg-muted/30">
      <div class="relative min-h-full p-4">
        <div
          v-if="cargando"
          class="absolute inset-0 z-10 flex items-center justify-center bg-background/60"
        >
          <Spinner class="h-6 w-6" />
        </div>

        <p
          v-else-if="error"
          class="flex min-h-[50vh] items-center justify-center text-sm text-destructive"
        >
          {{ error }}
        </p>

        <div ref="contenedorEl" class="mx-auto w-fit" />
      </div>
    </ScrollArea>
  </div>
</template>
