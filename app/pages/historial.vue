<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Search, ExternalLink, Copy, Inbox, FileText, Download, ShieldAlert } from "@lucide/vue";
import { toast } from "vue-sonner";
import {
  useHistorialEtiquetas,
  type EtiquetaHistorial,
} from "~/composables/useHistorialEtiquetas";
import Spinner from "~/components/ui/Spinner.vue";

const PAGE_SIZE = 15;

const { data: etiquetas, isPending, isFetching, isError, refetch } = useHistorialEtiquetas();

type FiltroEstado = "todos" | EtiquetaHistorial["estado"];
const search = ref("");
const estado = ref<FiltroEstado>("todos");
const page = ref(1);

const OPCIONES_ESTADO: { v: FiltroEstado; t: string }[] = [
  { v: "todos", t: "Todas" },
  { v: "IMPRESO", t: "Impresas" },
  { v: "PENDIENTE", t: "Pendientes" },
  { v: "ERROR", t: "Con error" },
];

const filtradas = computed(() => {
  const q = search.value.trim().toLowerCase();
  return (etiquetas.value ?? []).filter((e) => {
    if (estado.value !== "todos" && e.estado !== estado.value) return false;
    if (!q) return true;
    return [e.lote.producto.nombre, e.lote.numeroLote, e.lote.fabricante.nombre, e.proforma].some(
      (t) => t.toLowerCase().includes(q),
    );
  });
});

watch([search, estado], () => (page.value = 1));

const paginadas = computed(() =>
  filtradas.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
);
const totalPages = computed(() => Math.max(1, Math.ceil(filtradas.value.length / PAGE_SIZE)));

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });

function neto(e: EtiquetaHistorial) {
  return e.cantidadNeta ? `${e.cantidadNeta} ${e.unidadNeta.toLowerCase()}` : "—";
}

const ESTADO_UI = {
  IMPRESO: { texto: "Impresa", clase: "bg-green-500/15 text-green-600 dark:text-green-400" },
  PENDIENTE: { texto: "Pendiente", clase: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  ERROR: { texto: "Error", clase: "bg-red-500/15 text-red-600 dark:text-red-400" },
} as const;

const urlQr = (token: string) => `${window.location.origin}/e/${token}`;

function abrirQr(e: EtiquetaHistorial) {
  if (e.token) window.open(urlQr(e.token), "_blank");
}
async function copiarQr(e: EtiquetaHistorial) {
  if (!e.token) return;
  try {
    await navigator.clipboard.writeText(urlQr(e.token));
    toast.success("Enlace del QR copiado");
  } catch {
    toast.error("No se pudo copiar el enlace");
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="flex shrink-0 items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Historial</h1>
        <p class="text-sm text-muted-foreground">
          Etiquetas generadas, de la más reciente a la más antigua
        </p>
      </div>
      <NuxtLink to="/estadisticas" class="shrink-0 text-sm font-medium text-primary hover:underline">
        Ver estadísticas →
      </NuxtLink>
    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-3">
      <div class="relative w-full max-w-sm">
        <Search
          class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="search"
          placeholder="Buscar por producto, lote, fabricante o proforma..."
          class="pl-8 pr-24"
        />
        <span
          class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs tabular-nums text-muted-foreground"
        >
          {{ filtradas.length }} resultado{{ filtradas.length === 1 ? "" : "s" }}
        </span>
      </div>
      <div class="flex items-center gap-1 rounded-md border border-border p-1">
        <Button
          v-for="op in OPCIONES_ESTADO"
          :key="op.v"
          size="sm"
          :variant="estado === op.v ? 'default' : 'ghost'"
          @click="estado = op.v"
        >
          {{ op.t }}
        </Button>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Lote</TableHead>
            <TableHead>Proforma</TableHead>
            <TableHead>Neto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Creada por</TableHead>
            <TableHead class="text-center">Escaneos</TableHead>
            <TableHead class="text-center">COA / FDS</TableHead>
            <TableHead class="w-24 text-right">QR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isPending">
            <TableRow v-for="i in 5" :key="i">
              <TableCell v-for="c in 10" :key="c"><Skeleton class="h-4 w-full" /></TableCell>
            </TableRow>
          </template>
          <template v-else-if="isError">
            <TableRow>
              <TableCell colspan="10" class="py-8 text-center">
                <p class="mb-2 text-sm text-destructive">No se pudo cargar el historial</p>
                <Button variant="outline" size="sm" @click="refetch()">Reintentar</Button>
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="filtradas.length === 0">
            <TableRow>
              <TableCell colspan="10" class="py-16 text-center text-muted-foreground">
                <Inbox class="mx-auto mb-3 h-10 w-10 opacity-50" />
                <p class="font-medium text-foreground">
                  {{ search || estado !== "todos" ? "Sin resultados" : "Aún no hay etiquetas" }}
                </p>
                <p class="text-sm">
                  {{
                    search || estado !== "todos"
                      ? "Ninguna etiqueta coincide con el filtro."
                      : "Las etiquetas que generes aparecerán aquí."
                  }}
                </p>
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow v-for="e in paginadas" :key="e.id">
              <TableCell class="whitespace-nowrap text-muted-foreground">
                {{ fmtFecha(e.createdAt) }}
              </TableCell>
              <TableCell class="font-medium">{{ e.lote.producto.nombre }}</TableCell>
              <TableCell>{{ e.lote.numeroLote }}</TableCell>
              <TableCell>{{ e.proforma }}</TableCell>
              <TableCell class="whitespace-nowrap">{{ neto(e) }}</TableCell>
              <TableCell>
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="ESTADO_UI[e.estado].clase"
                  :title="e.estado === 'ERROR' ? (e.mensajeError ?? '') : undefined"
                >
                  {{ ESTADO_UI[e.estado].texto }}
                </span>
              </TableCell>
              <TableCell>{{ e.creadoPor.nombre }}</TableCell>
              <TableCell class="text-center">
                <template v-if="e.token">
                  <span class="tabular-nums">{{ e.escaneos }}</span>
                  <p
                    v-if="e.ultimoEscaneoAt"
                    class="whitespace-nowrap text-xs text-muted-foreground"
                    title="Último escaneo"
                  >
                    {{ fmtFecha(e.ultimoEscaneoAt) }}
                  </p>
                </template>
                <span v-else class="text-xs text-muted-foreground">—</span>
              </TableCell>
              <TableCell class="text-center">
                <template v-if="e.token">
                  <div class="flex items-center justify-center gap-3 text-xs tabular-nums text-muted-foreground">
                    <span class="inline-flex items-center gap-1" title="Veces que se vio el COA">
                      <FileText class="h-3.5 w-3.5" />{{ e.coaVistas }}
                    </span>
                    <span class="inline-flex items-center gap-1" title="Veces que se descargó el COA">
                      <Download class="h-3.5 w-3.5" />{{ e.coaDescargas }}
                    </span>
                    <span class="inline-flex items-center gap-1" title="Veces que se vio la ficha de seguridad (FDS)">
                      <ShieldAlert class="h-3.5 w-3.5" />{{ e.fdsVistas }}
                    </span>
                  </div>
                </template>
                <span v-else class="text-xs text-muted-foreground">—</span>
              </TableCell>
              <TableCell class="text-right">
                <template v-if="e.token">
                  <Button variant="ghost" size="icon" title="Abrir página del QR" @click="abrirQr(e)">
                    <ExternalLink class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Copiar enlace del QR" @click="copiarQr(e)">
                    <Copy class="h-4 w-4" />
                  </Button>
                </template>
                <span v-else class="text-xs text-muted-foreground">—</span>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <div
      v-if="isFetching && !isPending"
      class="flex items-center gap-2 text-xs text-muted-foreground"
    >
      <Spinner class="h-3.5 w-3.5" />
      <span>Actualizando historial...</span>
    </div>

    <div
      v-if="!isPending && !isError && filtradas.length > 0"
      class="flex shrink-0 flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-muted-foreground">
        {{ filtradas.length }} etiqueta{{ filtradas.length === 1 ? "" : "s" }} · página
        {{ page }} de {{ totalPages }}
      </p>
      <Pagination
        v-model:page="page"
        :total="filtradas.length"
        :items-per-page="PAGE_SIZE"
        :sibling-count="1"
        show-edges
      >
        <PaginationContent v-slot="{ items }">
          <PaginationPrevious />
          <template v-for="(item, index) in items" :key="index">
            <PaginationItem v-if="item.type === 'page'" :value="item.value" as-child>
              <Button class="h-9 w-9 p-0" :variant="item.value === page ? 'default' : 'outline'">
                {{ item.value }}
              </Button>
            </PaginationItem>
            <PaginationEllipsis v-else :index="index" />
          </template>
          <PaginationNext />
        </PaginationContent>
      </Pagination>
    </div>
  </div>
</template>
