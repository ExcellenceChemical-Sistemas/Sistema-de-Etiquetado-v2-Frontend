<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { CircleCheck, Circle, SearchX, PackageCheck, Loader } from "@lucide/vue";
import { usePedidoPublico, type PedidoPublico } from "~/composables/usePedidoPublico";
import { construirLineaTiempo } from "~/utils/seguimientoPedido";

// Página pública de seguimiento: la abre el cliente con el enlace que le manda la
// empresa. Sin sidebar (layout "publico") y sin sesión; lo único que la protege es el
// token del enlace, y el backend solo devuelve lo mínimo (proforma, fechas y estado).
definePageMeta({ layout: "publico", tituloPublico: "Seguimiento de pedido" });
useHead({
  title: "Seguimiento de pedido",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});

const route = useRoute();
const token = computed(() => String(route.params.token));
const { obtener } = usePedidoPublico();

const pedido = ref<PedidoPublico | null>(null);
const cargando = ref(true);
const noEncontrado = ref(false);
const errorRed = ref(false);

onMounted(async () => {
  try {
    pedido.value = await obtener(token.value);
  } catch (e: unknown) {
    const status =
      (e as { statusCode?: number; response?: { status?: number } })?.statusCode ??
      (e as { response?: { status?: number } })?.response?.status;
    if (status === 404) noEncontrado.value = true;
    else errorRed.value = true;
  } finally {
    cargando.value = false;
  }
});

const etapas = computed(() => (pedido.value ? construirLineaTiempo(pedido.value) : []));
const etapaActual = computed(
  () => etapas.value.find((e) => e.situacion === "actual") ?? etapas.value[etapas.value.length - 1],
);
const entregado = computed(() => pedido.value?.estado === "ENTREGADO");

const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" }) : null;
</script>

<template>
  <div class="space-y-4">
    <div v-if="cargando" class="space-y-4">
      <Skeleton class="h-24 w-full rounded-xl" />
      <Skeleton class="h-8 w-2/3" />
      <Skeleton class="h-64 w-full rounded-xl" />
    </div>

    <div
      v-else-if="noEncontrado || errorRed"
      class="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center"
    >
      <SearchX class="h-10 w-10 text-muted-foreground" />
      <h1 class="text-lg font-semibold">
        {{ noEncontrado ? "Pedido no encontrado" : "No se pudo cargar el pedido" }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{
          noEncontrado
            ? "El enlace no es válido o ya no está disponible. Si crees que es un error, comunícate con Excellence Chemical."
            : "Revisa tu conexión e inténtalo de nuevo."
        }}
      </p>
    </div>

    <template v-else-if="pedido && etapaActual">
      <div
        class="flex items-center gap-3 rounded-xl border p-4"
        :class="
          entregado
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-primary/30 bg-primary/5'
        "
      >
        <PackageCheck v-if="entregado" class="h-9 w-9 shrink-0 text-emerald-500" />
        <Loader v-else class="h-9 w-9 shrink-0 text-primary" />
        <div>
          <p
            class="font-semibold"
            :class="entregado ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'"
          >
            {{ etapaActual.titulo }}
          </p>
          <p class="text-sm text-muted-foreground">{{ etapaActual.descripcion }}</p>
        </div>
      </div>

      <div>
        <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          N° de proforma
        </p>
        <h1 class="text-2xl font-semibold leading-tight tracking-tight">
          {{ pedido.numeroProforma }}
        </h1>
      </div>

      <div class="rounded-xl border bg-card p-4">
        <p class="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Estado de tu pedido
        </p>
        <ol class="relative ml-2 space-y-5 border-l pl-6">
          <li v-for="e in etapas" :key="e.estado" class="relative">
            <span class="absolute -left-[33px] top-0.5 bg-card">
              <CircleCheck v-if="e.situacion === 'hecha'" class="h-4 w-4 text-emerald-500" />
              <Loader v-else-if="e.situacion === 'actual'" class="h-4 w-4 text-primary" />
              <Circle v-else class="h-4 w-4 text-muted-foreground/40" />
            </span>
            <p
              class="text-sm font-semibold"
              :class="e.situacion === 'pendiente' ? 'text-muted-foreground/70' : ''"
            >
              {{ e.titulo }}
            </p>
            <p v-if="fmtFecha(e.fecha)" class="text-sm text-muted-foreground">
              {{ fmtFecha(e.fecha) }}
            </p>
            <p v-else-if="e.situacion === 'pendiente'" class="text-sm text-muted-foreground/60">
              Pendiente
            </p>
          </li>
        </ol>
      </div>

      <p class="text-center text-xs text-muted-foreground">
        ¿Dudas sobre tu pedido? Comunícate con Excellence Chemical indicando tu número de proforma.
      </p>
    </template>
  </div>
</template>
