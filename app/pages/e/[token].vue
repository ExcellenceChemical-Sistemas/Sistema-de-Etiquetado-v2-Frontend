<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { CircleCheck, TriangleAlert, FileText, Download, SearchX } from "@lucide/vue";
import {
  useEtiquetaPublica,
  type EtiquetaPublica,
} from "~/composables/useEtiquetaPublica";
import VencimientoBadge from "~/components/lotes/Vencimientobadge.vue";

// Página pública que abre quien escanea el QR de la etiqueta: sin sidebar
// (layout "publico") y sin sesión.
definePageMeta({ layout: "publico" });
useHead({
  title: "Trazabilidad de etiqueta",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});

const route = useRoute();
const token = computed(() => String(route.params.token));
const { obtener, urlCoa } = useEtiquetaPublica();

const etiqueta = ref<EtiquetaPublica | null>(null);
const cargando = ref(true);
const noEncontrada = ref(false);
const errorRed = ref(false);

onMounted(async () => {
  try {
    etiqueta.value = await obtener(token.value);
  } catch (e: unknown) {
    const status = (e as { statusCode?: number; response?: { status?: number } })
      ?.statusCode ?? (e as { response?: { status?: number } })?.response?.status;
    if (status === 404) noEncontrada.value = true;
    else errorRed.value = true;
  } finally {
    cargando.value = false;
  }
});

const UNIDADES: Record<string, string> = {
  KG: "kilogramo",
  GR: "gramo",
  ML: "mililitro",
  L: "litro",
};

function conUnidad(valor: string | null, unidad: string) {
  if (!valor) return "—";
  return `${valor} ${UNIDADES[unidad] ?? unidad}`;
}

const cantidadNeta = computed(() =>
  etiqueta.value ? conUnidad(etiqueta.value.cantidadNeta, etiqueta.value.unidadNeta) : "—",
);
const tara = computed(() =>
  etiqueta.value ? conUnidad(etiqueta.value.tara, etiqueta.value.unidadBruto) : "—",
);
const pesoBruto = computed(() =>
  etiqueta.value ? conUnidad(etiqueta.value.pesoBruto, etiqueta.value.unidadBruto) : "—",
);

const errorCoa = ref("");
const abriendoCoa = ref(false);
const descargandoCoa = ref(false);

async function verCoa() {
  errorCoa.value = "";
  abriendoCoa.value = true;
  // Se abre la pestaña ANTES del await: si se abriera después, los navegadores
  // móviles la bloquean como popup porque ya no es parte del gesto del toque.
  const ventana = window.open("", "_blank");
  try {
    const { url } = await urlCoa(token.value, false);
    if (ventana) ventana.location.href = url;
    else window.location.href = url;
  } catch {
    ventana?.close();
    errorCoa.value = "No se pudo abrir el certificado. Inténtalo de nuevo.";
  } finally {
    abriendoCoa.value = false;
  }
}

async function descargarCoa() {
  errorCoa.value = "";
  descargandoCoa.value = true;
  try {
    const { url } = await urlCoa(token.value, true);
    window.location.href = url;
  } catch {
    errorCoa.value = "No se pudo descargar el certificado. Inténtalo de nuevo.";
  } finally {
    descargandoCoa.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="cargando" class="space-y-4">
      <Skeleton class="h-20 w-full rounded-xl" />
      <Skeleton class="h-10 w-3/4" />
      <Skeleton class="h-64 w-full rounded-xl" />
    </div>

    <div
      v-else-if="noEncontrada || errorRed"
      class="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center"
    >
      <SearchX class="h-10 w-10 text-muted-foreground" />
      <h1 class="text-lg font-semibold">
        {{ noEncontrada ? "Etiqueta no encontrada" : "No se pudo cargar la etiqueta" }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{
          noEncontrada
            ? "El código de esta etiqueta no es válido o ya no está disponible."
            : "Revisa tu conexión e inténtalo de nuevo."
        }}
      </p>
    </div>

    <template v-else-if="etiqueta">
      <div
        v-if="etiqueta.tieneCoa"
        class="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
      >
        <CircleCheck class="h-9 w-9 shrink-0 text-emerald-500" />
        <div>
          <p class="font-semibold text-emerald-600 dark:text-emerald-400">Etiqueta válida</p>
          <p class="text-sm text-emerald-700/80 dark:text-emerald-300/80">
            COA validado por Calidad
          </p>
        </div>
      </div>
      <div
        v-else
        class="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
      >
        <TriangleAlert class="h-9 w-9 shrink-0 text-amber-500" />
        <div>
          <p class="font-semibold text-amber-600 dark:text-amber-400">Etiqueta registrada</p>
          <p class="text-sm text-amber-700/80 dark:text-amber-300/80">
            Este lote aún no tiene certificado COA adjunto
          </p>
        </div>
      </div>

      <h1 class="text-2xl font-semibold leading-tight tracking-tight">
        {{ etiqueta.producto }}
      </h1>

      <div class="grid grid-cols-2 overflow-hidden rounded-xl border bg-card">
        <div class="border-b border-r p-4">
          <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Lote</p>
          <p class="mt-1 break-words font-semibold">{{ etiqueta.numeroLote }}</p>
        </div>
        <div class="border-b p-4">
          <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Marca / Fabricante
          </p>
          <p class="mt-1 break-words font-semibold">{{ etiqueta.fabricante }}</p>
        </div>

        <div class="border-b border-r p-4">
          <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            F. Elaboración
          </p>
          <p class="mt-1 font-semibold">{{ etiqueta.fechaFabricacion }}</p>
        </div>
        <div class="border-b p-4">
          <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            F. Vencimiento
          </p>
          <p class="mt-1 font-semibold">
            <VencimientoBadge :fecha="etiqueta.fechaVencimiento" />
          </p>
        </div>

        <div class="col-span-2 border-b bg-primary/5 p-4">
          <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Cantidad neta
          </p>
          <p class="mt-1 break-words text-lg font-bold uppercase text-primary">{{ cantidadNeta }}</p>
        </div>

        <div class="border-r p-4">
          <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tara</p>
          <p class="mt-1 font-semibold uppercase">{{ tara }}</p>
        </div>
        <div class="p-4">
          <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Peso bruto
          </p>
          <p class="mt-1 font-semibold uppercase">{{ pesoBruto }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          size="lg"
          :disabled="!etiqueta.tieneCoa || abriendoCoa"
          @click="verCoa"
        >
          <FileText class="mr-2 h-4 w-4" />
          Ver certificado COA
        </Button>
        <Button size="lg" :disabled="!etiqueta.tieneCoa || descargandoCoa" @click="descargarCoa">
          <Download class="mr-2 h-4 w-4" />
          Descargar PDF
        </Button>
      </div>
      <p v-if="errorCoa" class="text-center text-sm text-destructive">{{ errorCoa }}</p>
    </template>
  </div>
</template>
