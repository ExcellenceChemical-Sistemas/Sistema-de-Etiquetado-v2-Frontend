<script setup lang="ts">
import { computed } from "vue";
import { ChartPie, QrCode, FileText, Download, ShieldAlert, Inbox } from "@lucide/vue";
import { useHistorialEtiquetas } from "~/composables/useHistorialEtiquetas";
import DonutProductosEscaneados from "~/components/etiquetas/DonutProductosEscaneados.vue";
import { agruparEscaneosPorProducto } from "~/utils/escaneos";
import { agruparEstadisticasPorProducto, totalesEstadisticas } from "~/utils/estadisticas";

const { data: etiquetas, isPending, isError, refetch } = useHistorialEtiquetas();

const totales = computed(() => totalesEstadisticas(etiquetas.value));
const productosMasEscaneados = computed(() => agruparEscaneosPorProducto(etiquetas.value));
const porProducto = computed(() => agruparEstadisticasPorProducto(etiquetas.value));

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
        y la ficha de seguridad.
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

      <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border">
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
      </div>
    </template>
  </div>
</template>
