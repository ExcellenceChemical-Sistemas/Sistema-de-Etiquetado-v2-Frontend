<script setup lang="ts">
import { computed } from "vue";
import { ChartPie, QrCode, FileText, Download, ShieldAlert, Inbox } from "@lucide/vue";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHistorialEtiquetas } from "~/composables/useHistorialEtiquetas";
import DonutProductosEscaneados from "~/components/etiquetas/DonutProductosEscaneados.vue";
import { agruparEscaneosPorProducto } from "~/utils/escaneos";
import { agruparEstadisticasPorProducto, totalesEstadisticas } from "~/utils/estadisticas";

const { data: etiquetas, isPending, isError, refetch } = useHistorialEtiquetas();

const totales = computed(() => totalesEstadisticas(etiquetas.value));
const productosMasEscaneados = computed(() => agruparEscaneosPorProducto(etiquetas.value));
const porProducto = computed(() => agruparEstadisticasPorProducto(etiquetas.value));

// Ranking de COA: qué producto es de quien se vio/descargó el certificado,
// ordenado por actividad total (vistas + descargas). Solo los que tienen algo.
const rankingCoa = computed(() =>
  porProducto.value
    .filter((p) => p.coaVistas > 0 || p.coaDescargas > 0)
    .sort((a, b) => b.coaVistas + b.coaDescargas - (a.coaVistas + a.coaDescargas)),
);

// Ranking de FDS: mismo criterio, pero para la ficha de seguridad.
const rankingFds = computed(() =>
  porProducto.value.filter((p) => p.fdsVistas > 0).sort((a, b) => b.fdsVistas - a.fdsVistas),
);

// El ScrollArea de shadcn necesita una altura CONCRETA para poder recortar y
// scrollear (su viewport interno es height:100%; con solo max-height el
// contenido se desborda en vez de scrollear — ver comentario más abajo). Por
// eso el alto fijo se aplica recién cuando hay contenido de sobra para
// llenarlo; con pocas filas, sin clase de alto, el ScrollArea se limita a
// mostrarlas todas sin scroll ni espacio vacío de más.
const UMBRAL_SCROLL = 6;
const UMBRAL_SCROLL_DETALLE = 10;
const alturaCoa = computed(() => (rankingCoa.value.length > UMBRAL_SCROLL ? "h-72" : ""));
const alturaFds = computed(() => (rankingFds.value.length > UMBRAL_SCROLL ? "h-72" : ""));
const detalleEsLargo = computed(() => porProducto.value.length > UMBRAL_SCROLL_DETALLE);

const TARJETAS = computed(() => [
  { label: "Escaneos de QR", valor: totales.value.escaneos, icon: QrCode },
  { label: "COA vistos", valor: totales.value.coaVistas, icon: FileText },
  { label: "COA descargados", valor: totales.value.coaDescargas, icon: Download },
  { label: "Fichas de seguridad vistas", valor: totales.value.fdsVistas, icon: ShieldAlert },
]);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-6 overflow-auto p-4 lg:p-6">
    <div class="shrink-0">
      <h1 class="text-2xl font-semibold">Estadísticas</h1>
      <p class="text-sm text-muted-foreground">
        Uso de las etiquetas desde que se escanea el QR: aperturas, y vistas/descargas del COA
        y la ficha de seguridad, por producto.
      </p>
    </div>

    <div v-if="isPending" class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Skeleton v-for="i in 4" :key="i" class="h-24 w-full rounded-lg" />
    </div>
    <div
      v-else-if="isError"
      class="rounded-md border border-border p-8 text-center"
    >
      <p class="mb-2 text-sm text-destructive">No se pudieron cargar las estadísticas</p>
      <Button variant="outline" size="sm" @click="refetch()">Reintentar</Button>
    </div>

    <template v-else>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div
          v-for="t in TARJETAS"
          :key="t.label"
          class="rounded-lg border bg-card p-4"
        >
          <div class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <component :is="t.icon" class="h-3.5 w-3.5" />
            {{ t.label }}
          </div>
          <p class="mt-2 font-mono text-2xl font-semibold tabular-nums">{{ t.valor }}</p>
        </div>
      </div>

      <div class="rounded-md border border-border p-4">
        <h2 class="mb-3 flex items-center gap-1.5 text-sm font-medium">
          <ChartPie class="h-4 w-4 text-muted-foreground" />
          Productos más escaneados
        </h2>
        <DonutProductosEscaneados :datos="productosMasEscaneados" />
      </div>

      <!-- Estos dos van separados a propósito, cada uno con su propia lista de
           productos: la duda que motivó esta página era justo "de qué producto
           es cada COA/ficha", así que no alcanza con un total suelto. -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="rounded-md border border-border p-4">
          <h2 class="mb-3 flex items-center gap-1.5 text-sm font-medium">
            <FileText class="h-4 w-4 text-muted-foreground" />
            COA — vistas y descargas por producto
          </h2>
          <div v-if="rankingCoa.length === 0" class="py-8 text-center text-sm text-muted-foreground">
            <Inbox class="mx-auto mb-2 h-8 w-8 opacity-50" />
            Todavía nadie vio ni descargó un COA desde el QR.
          </div>
          <ScrollArea v-else :class="alturaCoa">
            <Table>
              <TableHeader class="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead class="text-center">Vistas</TableHead>
                  <TableHead class="text-center">Descargas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="p in rankingCoa" :key="p.nombre">
                  <TableCell class="font-medium">{{ p.nombre }}</TableCell>
                  <TableCell class="text-center tabular-nums">{{ p.coaVistas }}</TableCell>
                  <TableCell class="text-center tabular-nums">{{ p.coaDescargas }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <div class="rounded-md border border-border p-4">
          <h2 class="mb-3 flex items-center gap-1.5 text-sm font-medium">
            <ShieldAlert class="h-4 w-4 text-muted-foreground" />
            Ficha de seguridad (FDS) — vistas por producto
          </h2>
          <div v-if="rankingFds.length === 0" class="py-8 text-center text-sm text-muted-foreground">
            <Inbox class="mx-auto mb-2 h-8 w-8 opacity-50" />
            Todavía nadie vio una ficha de seguridad desde el QR.
          </div>
          <ScrollArea v-else :class="alturaFds">
            <Table>
              <TableHeader class="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead class="text-center">Vistas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="p in rankingFds" :key="p.nombre">
                  <TableCell class="font-medium">{{ p.nombre }}</TableCell>
                  <TableCell class="text-center tabular-nums">{{ p.fdsVistas }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>

      <!-- grid-rows-[auto_1fr] en vez de flex+flex-1: el ScrollArea de shadcn
           es height:100% por dentro, y un flex-item con flex-1 NO le da una
           altura lo bastante "definida" para que ese 100% funcione (el
           contenido se sale igual, sin scroll) — un track "1fr" de grid sí
           resuelve bien esa altura. -->
      <div
        class="shrink-0 rounded-md border border-border"
        :class="detalleEsLargo ? 'grid h-[28rem] grid-rows-[auto_1fr] overflow-hidden' : ''"
      >
        <h2 class="border-b p-4 text-sm font-medium">Detalle completo por producto</h2>
        <ScrollArea :class="detalleEsLargo ? 'h-full min-h-0' : ''">
          <Table>
            <TableHeader class="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead class="text-center">Escaneos</TableHead>
                <TableHead class="text-center">COA visto</TableHead>
                <TableHead class="text-center">COA descargado</TableHead>
                <TableHead class="text-center">FDS vista</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="porProducto.length === 0">
                <TableRow>
                  <TableCell colspan="5" class="py-16 text-center text-muted-foreground">
                    <Inbox class="mx-auto mb-3 h-10 w-10 opacity-50" />
                    <p class="font-medium text-foreground">Todavía no hay actividad registrada</p>
                    <p class="text-sm">
                      Cuando alguien escanee un QR, vea o descargue un COA, o vea una ficha de
                      seguridad, aparecerá acá.
                    </p>
                  </TableCell>
                </TableRow>
              </template>
              <template v-else>
                <TableRow v-for="p in porProducto" :key="p.nombre">
                  <TableCell class="font-medium">{{ p.nombre }}</TableCell>
                  <TableCell class="text-center tabular-nums">{{ p.escaneos }}</TableCell>
                  <TableCell class="text-center tabular-nums">{{ p.coaVistas }}</TableCell>
                  <TableCell class="text-center tabular-nums">{{ p.coaDescargas }}</TableCell>
                  <TableCell class="text-center tabular-nums">{{ p.fdsVistas }}</TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* El <Table> de shadcn envuelve la tabla en su propio div con overflow-auto
   (Table.vue: data-slot="table-container"). Dentro de un ScrollArea eso
   crea un segundo contenedor con scroll propio, y el thead "sticky" termina
   pegándose a ESE div en vez de al viewport del ScrollArea — como ese div
   no es el que realmente scrollea acá, el header visualmente no se queda
   fijo. Se neutraliza el overflow VERTICAL para que el único que scrollee
   en Y sea el ScrollArea de afuera — pero el horizontal se deja en "auto":
   la tabla de detalle tiene 5 columnas y en celulares (~375px) no entra
   entera, así que sigue haciendo falta poder scrollearla de lado. */
:deep([data-slot="table-container"]) {
  overflow-x: auto;
  overflow-y: visible;
}
</style>
