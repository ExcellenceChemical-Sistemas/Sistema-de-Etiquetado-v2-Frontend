<script setup lang="ts">
import { ref, computed } from "vue";
import { ArrowLeft, Download, Clock, AlertTriangle, PackageCheck, Timer, FileClock } from "@lucide/vue";
import { usePedidosQuery } from "~/composables/usePedidos";
import { formatFechaHora } from "~/utils/fechaHora";
import { FILL_GREEN, FILL_RED, type XlsxColumn } from "~/composables/useCsvExport";
import { usePdfExport } from "~/composables/usePdfExport";
import { COLOR_BASE, COLOR_ROJO, COLOR_VERDE, graficoBarras, graficoDona } from "~/utils/graficosReporte";
import { construirReporte, filtrosMesAnio, sufijoPeriodo } from "~/utils/reporteIndicadores";
import { construirReportePdf } from "~/utils/reportePdf";
import { horasHabilesEntre } from "~/utils/horasHabiles";
import ProgressBar from "~/components/ui/ProgressBar.vue";
import { CATEGORIA_OBSERVACION_LABEL, type EstadoPedido, type Pedido } from "~/types/pedido";

// El indicador solo tiene sentido sobre pedidos ya entregados: es el único
// estado con las 5 fechas completas para medir el tiempo real de entrega.
const estadoEntregado = ref<EstadoPedido | "TODOS">("ENTREGADO");
const { data: pedidos, isPending, isError, refetch } = usePedidosQuery(estadoEntregado);

// Umbral fijo igual al Excel actual (meta: ≥80% de pedidos entregados dentro
// de 48h / 2 días hábiles).
const UMBRAL_HORAS = 48;

const filtroMes = ref("TODOS");
const filtroAnio = ref("TODOS");

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface PedidoConTiempo extends Pedido {
  horas: number;
  dias: number;
}

// Tiempo de entrega = Recepción → Entrega al cliente, en horas hábiles (lunes
// a viernes, 7:30-17:30, sin feriados) — igual criterio que el Excel, que no
// contaba noches ni fines de semana como demora real.
const pedidosConTiempo = computed<PedidoConTiempo[]>(() =>
  (pedidos.value ?? [])
    .filter((p): p is Pedido & { entregadoEn: string } => !!p.entregadoEn)
    .map((p) => {
      const horas = horasHabilesEntre(p.recibidoEn, p.entregadoEn);
      return { ...p, horas, dias: horas / 24 };
    }),
);

const aniosDisponibles = computed(() => {
  const anios = new Set(pedidosConTiempo.value.map((p) => new Date(p.entregadoEn!).getFullYear()));
  return Array.from(anios).sort((a, b) => b - a);
});

const pedidosFiltrados = computed(() => {
  let lista = pedidosConTiempo.value;
  if (filtroMes.value !== "TODOS") {
    const mes = Number(filtroMes.value);
    lista = lista.filter((p) => new Date(p.entregadoEn!).getMonth() === mes);
  }
  if (filtroAnio.value !== "TODOS") {
    const anio = Number(filtroAnio.value);
    lista = lista.filter((p) => new Date(p.entregadoEn!).getFullYear() === anio);
  }
  return lista;
});

const resumen = computed(() => {
  const lista = pedidosFiltrados.value;
  const total = lista.length;
  const dentro = lista.filter((p) => p.horas <= UMBRAL_HORAS).length;
  const fuera = total - dentro;
  const promedioHoras = total ? lista.reduce((s, p) => s + p.horas, 0) / total : 0;
  const varianza = total
    ? lista.reduce((s, p) => s + (p.horas - promedioHoras) ** 2, 0) / total
    : 0;

  return {
    total,
    dentro,
    fuera,
    pctDentro: total ? (dentro / total) * 100 : 0,
    pctFuera: total ? (fuera / total) * 100 : 0,
    promedioHoras,
    promedioDias: promedioHoras / 24,
    desviacionHoras: Math.sqrt(varianza),
    maximoDias: total ? Math.max(...lista.map((p) => p.dias)) : 0,
  };
});

// El cuello de botella: pedidos que superaron el umbral, del más demorado al
// menos demorado, para ver primero los casos más graves.
const cuellosDeBotella = computed(() =>
  [...pedidosFiltrados.value].filter((p) => p.horas > UMBRAL_HORAS).sort((a, b) => b.horas - a.horas),
);

// --- Desglose por etapa: dónde se va el tiempo, no solo cuánto tarda en total ---
interface EtapaProm {
  key: string;
  label: string;
  horas: number;
}

function horasEntre(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return horasHabilesEntre(a, b);
}

function promedioEtapa(lista: PedidoConTiempo[], fn: (p: PedidoConTiempo) => number | null): number {
  const valores = lista.map(fn).filter((v): v is number => v !== null);
  return valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : 0;
}

const etapas = computed<EtapaProm[]>(() => {
  const lista = pedidosFiltrados.value;
  return [
    {
      key: "recepcion",
      label: "Recepción → Inicio de preparación",
      horas: promedioEtapa(lista, (p) => horasEntre(p.recibidoEn, p.inicioPreparacionEn)),
    },
    {
      key: "preparacion",
      label: "Inicio de preparación → Preparado",
      horas: promedioEtapa(lista, (p) => horasEntre(p.inicioPreparacionEn, p.preparadoEn)),
    },
    {
      key: "salida",
      label: "Preparado → Salió de almacén",
      horas: promedioEtapa(lista, (p) => horasEntre(p.preparadoEn, p.salioEn)),
    },
    {
      key: "entrega",
      label: "Salió de almacén → Entregado",
      horas: promedioEtapa(lista, (p) => horasEntre(p.salioEn, p.entregadoEn)),
    },
  ];
});

const etapaMaxHoras = computed(() => Math.max(...etapas.value.map((e) => e.horas), 0.01));

const etapaCuello = computed(() =>
  etapas.value.reduce((max, e) => (e.horas > max.horas ? e : max), etapas.value[0]!),
);

// --- Trazabilidad con la cotización: cuánto del tiempo total lo tiene el cliente esperando desde
// que pidió la cotización (no solo desde que almacén recibió el pedido). Cruza por numeroProforma
// (ver CLAUDE.md del backend) — solo entra acá lo que tiene una Cotizacion vinculada.
interface PedidoConTiempoTotal extends PedidoConTiempo {
  cotizacionRelacionada: NonNullable<PedidoConTiempo["cotizacionRelacionada"]>;
  horasCotizacion: number;
  horasTotal: number;
}

const pedidosConCotizacion = computed<PedidoConTiempoTotal[]>(() =>
  pedidosFiltrados.value
    .filter((p): p is PedidoConTiempo & { cotizacionRelacionada: NonNullable<PedidoConTiempo["cotizacionRelacionada"]> } =>
      !!p.cotizacionRelacionada,
    )
    .map((p) => {
      const horasCotizacion = horasHabilesEntre(p.cotizacionRelacionada.requerimientoEn, p.recibidoEn);
      return { ...p, horasCotizacion, horasTotal: horasCotizacion + p.horas };
    }),
);

const resumenTotal = computed(() => {
  const lista = pedidosConCotizacion.value;
  const total = lista.length;
  const promedioCotizacion = total ? lista.reduce((s, p) => s + p.horasCotizacion, 0) / total : 0;
  // Promedio de la etapa Almacén sobre este mismo subconjunto (no el `resumen.promedioHoras`
  // general, que mezcla pedidos sin cotización vinculada) — así las 3 tarjetas suman entre sí.
  const promedioAlmacen = total ? lista.reduce((s, p) => s + p.horas, 0) / total : 0;
  const promedioTotal = total ? lista.reduce((s, p) => s + p.horasTotal, 0) / total : 0;
  return { total, promedioCotizacion, promedioAlmacen, promedioTotal };
});

const peoresTotal = computed(() => [...pedidosConCotizacion.value].sort((a, b) => b.horasTotal - a.horasTotal).slice(0, 15));

function formatNumero(n: number, decimales = 1) {
  return n.toLocaleString("es-PE", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

const { progress, isExporting, exportarPdf } = usePdfExport();

const columnasCuello: XlsxColumn<PedidoConTiempo>[] = [
  { key: (p) => p.cliente.nombre, label: "Cliente", width: 36 },
  { key: "numeroProforma", label: "N° Proforma" },
  { key: (p) => formatFechaHora(p.recibidoEn), label: "Recibido de almacén", width: 22 },
  { key: (p) => formatFechaHora(p.salioEn), label: "Salió de almacén", width: 22 },
  { key: (p) => formatFechaHora(p.entregadoEn), label: "Entregado al cliente", width: 22 },
  { key: (p) => Number(p.horas.toFixed(1)), label: "Horas" },
  { key: (p) => Number(p.dias.toFixed(2)), label: "Días" },
  {
    key: (p) => (p.categoriaObservacion ? CATEGORIA_OBSERVACION_LABEL[p.categoriaObservacion] : ""),
    label: "Observación",
    width: 24,
  },
];

function horasCelda(a: string | null, b: string | null) {
  const h = horasEntre(a, b);
  return h === null ? "" : Number(h.toFixed(1));
}

// Detalle completo del período (no solo los fuera de plazo), con las horas de cada etapa para
// poder rehacer el desglose por etapa en Excel.
const columnasEntregados: XlsxColumn<PedidoConTiempo>[] = [
  { key: (p) => p.cliente.nombre, label: "Cliente", width: 36 },
  { key: "numeroProforma", label: "N° Proforma" },
  { key: (p) => formatFechaHora(p.recibidoEn), label: "Recibido de almacén", width: 22 },
  { key: (p) => formatFechaHora(p.inicioPreparacionEn), label: "Inicio de preparación", width: 22 },
  { key: (p) => formatFechaHora(p.preparadoEn), label: "Fin de preparación", width: 22 },
  { key: (p) => formatFechaHora(p.salioEn), label: "Salió de almacén", width: 22 },
  { key: (p) => formatFechaHora(p.entregadoEn), label: "Entregado al cliente", width: 22 },
  { key: (p) => horasCelda(p.recibidoEn, p.inicioPreparacionEn), label: "h Recepción→Inicio", width: 18 },
  { key: (p) => horasCelda(p.inicioPreparacionEn, p.preparadoEn), label: "h Preparación", width: 16 },
  { key: (p) => horasCelda(p.preparadoEn, p.salioEn), label: "h Preparado→Salida", width: 18 },
  { key: (p) => horasCelda(p.salioEn, p.entregadoEn), label: "h Salida→Entrega", width: 18 },
  { key: (p) => Number(p.horas.toFixed(1)), label: "Horas totales", width: 14 },
  { key: (p) => Number(p.dias.toFixed(2)), label: "Días" },
  {
    key: (p) => (p.horas <= UMBRAL_HORAS ? "Dentro de plazo" : "Fuera de plazo"),
    label: `Meta ≤${UMBRAL_HORAS}h`,
    width: 18,
    colorFill: (v) => (v === "Dentro de plazo" ? FILL_GREEN : FILL_RED),
  },
  {
    key: (p) => (p.categoriaObservacion ? CATEGORIA_OBSERVACION_LABEL[p.categoriaObservacion] : ""),
    label: "Observación",
    width: 24,
  },
  { key: (p) => p.detalleObservacion ?? "", label: "Detalle observación", width: 40 },
];

const columnasTrazabilidad: XlsxColumn<PedidoConTiempoTotal>[] = [
  { key: (p) => p.cliente.nombre, label: "Cliente", width: 36 },
  { key: "numeroProforma", label: "N° Proforma" },
  { key: (p) => formatFechaHora(p.cotizacionRelacionada.requerimientoEn), label: "Requerimiento (cotización)", width: 22 },
  { key: (p) => formatFechaHora(p.recibidoEn), label: "Recibido en almacén", width: 22 },
  { key: (p) => formatFechaHora(p.entregadoEn), label: "Entregado al cliente", width: 22 },
  { key: (p) => Number(p.horasCotizacion.toFixed(1)), label: "h Cotización (requerimiento→recepción)", width: 20 },
  { key: (p) => Number(p.horas.toFixed(1)), label: "h Almacén (recepción→entrega)", width: 18 },
  { key: (p) => Number(p.horasTotal.toFixed(1)), label: "h Totales (requerimiento→entrega)", width: 20 },
];

function exportarReporte() {
  const r = resumen.value;
  const hayEntregados = pedidosFiltrados.value.length > 0;
  exportarPdf(
    () =>
      construirReportePdf({
        titulo: "Indicador de tiempo de entrega — Pedidos",
        descripcion: `Recepción → entrega al cliente, en horas hábiles (lun-vie 7:30-17:30, sin feriados). Meta: ≥80% de pedidos entregados dentro de ${UMBRAL_HORAS}h.`,
        filtros: filtrosMesAnio(filtroMes.value, filtroAnio.value),
        secciones: [
          {
            titulo: "Tiempo de entrega de pedidos",
            kpis: [
              ["Entregados en el período", r.total],
              [`Dentro de ${UMBRAL_HORAS}h`, r.dentro],
              ["Fuera de plazo", r.fuera],
              [`% dentro de ${UMBRAL_HORAS}h (meta ≥80%)`, `${formatNumero(r.pctDentro, 0)}%`],
              ["Cumple la meta", r.total ? (r.pctDentro >= 80 ? "Sí" : "No") : "—"],
              ["Promedio de entrega (h)", Number(r.promedioHoras.toFixed(1))],
              ["Promedio de entrega (días)", Number(r.promedioDias.toFixed(2))],
              ["Desviación estándar (h)", Number(r.desviacionHoras.toFixed(1))],
              ["Tiempo máximo (días)", Number(r.maximoDias.toFixed(2))],
            ],
            graficos: [
              {
                titulo: `Cumplimiento de plazo (≤${UMBRAL_HORAS}h)`,
                imagen: hayEntregados
                  ? graficoDona([
                      { etiqueta: "Dentro de plazo", valor: r.dentro, color: COLOR_VERDE },
                      { etiqueta: "Fuera de plazo", valor: r.fuera, color: COLOR_ROJO },
                    ])
                  : null,
                datos: {
                  columnas: ["Resultado", "Pedidos", "%"],
                  filas: [
                    ["Dentro de plazo", r.dentro, `${formatNumero(r.pctDentro, 0)}%`],
                    ["Fuera de plazo", r.fuera, `${formatNumero(r.pctFuera, 0)}%`],
                  ],
                },
              },
              {
                titulo: "Tiempo promedio por etapa",
                nota: hayEntregados
                  ? `Cuello de botella: ${etapaCuello.value.label} (${formatNumero(etapaCuello.value.horas)}h en promedio).`
                  : undefined,
                imagen: hayEntregados
                  ? graficoBarras(
                      etapas.value.map((e) => ({
                        etiqueta: e.label,
                        valor: e.horas,
                        texto: `${formatNumero(e.horas)}h`,
                        color: e.key === etapaCuello.value.key ? COLOR_ROJO : COLOR_BASE,
                      })),
                    )
                  : null,
                datos: {
                  columnas: ["Etapa", "Horas promedio"],
                  filas: etapas.value.map((e) => [e.label, Number(e.horas.toFixed(1))]),
                },
              },
            ],
          },
          {
            titulo: "Trazabilidad con la cotización (requerimiento del cliente → entrega real)",
            kpis: [
              ["Pedidos con cotización vinculada", resumenTotal.value.total],
              ["Promedio en etapa Cotización (requerimiento→recepción)", Number(resumenTotal.value.promedioCotizacion.toFixed(1))],
              ["Promedio en etapa Almacén (recepción→entrega)", Number(resumenTotal.value.promedioAlmacen.toFixed(1))],
              ["Promedio total (requerimiento→entrega)", Number(resumenTotal.value.promedioTotal.toFixed(1))],
            ],
          },
        ],
        hojas: [
          {
            nombre: "Pedidos entregados",
            filas: [...pedidosFiltrados.value].sort((a, b) => b.horas - a.horas),
            columnas: columnasEntregados,
          },
          { nombre: "Cuello de botella", filas: cuellosDeBotella.value, columnas: columnasCuello },
          {
            nombre: "Trazabilidad con cotización",
            filas: [...pedidosConCotizacion.value].sort((a, b) => b.horasTotal - a.horasTotal),
            columnas: columnasTrazabilidad,
          },
        ],
      }),
    `indicadores-pedidos-${sufijoPeriodo(filtroMes.value, filtroAnio.value)}.pdf`,
  );
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div>
        <NuxtLink to="/pedidos" class="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
          <ArrowLeft class="h-3.5 w-3.5" />
          Volver a Pedidos
        </NuxtLink>
        <h1 class="text-2xl font-semibold">Indicador de tiempo de entrega</h1>
        <p class="text-sm text-muted-foreground">
          Recepción → Entrega al cliente. Meta: ≥80% de pedidos entregados dentro de {{ UMBRAL_HORAS }}h.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Select v-model="filtroMes">
          <SelectTrigger class="w-40" aria-label="Filtrar por mes">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los meses</SelectItem>
            <SelectItem v-for="(mes, i) in MESES" :key="i" :value="String(i)">{{ mes }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filtroAnio">
          <SelectTrigger class="w-28" aria-label="Filtrar por año">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem v-for="anio in aniosDisponibles" :key="anio" :value="String(anio)">
              {{ anio }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          :disabled="isPending || isExporting || pedidosFiltrados.length === 0"
          class="min-w-[168px] justify-center"
          @click="exportarReporte"
        >
          <template v-if="isExporting">
            <ProgressBar :value="progress" compact class="w-20" />
            <span class="ml-2 text-xs tabular-nums text-muted-foreground">{{ Math.round(progress) }}%</span>
          </template>
          <template v-else>
            <Download class="h-4 w-4 mr-2" />
            Exportar PDF
          </template>
        </Button>
      </div>
    </div>

    <Card class="shrink-0">
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium text-muted-foreground">Ficha del indicador</CardTitle>
      </CardHeader>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Meta</TableHead>
              <TableHead>Fórmula de cálculo</TableHead>
              <TableHead>Frecuencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell class="font-medium">Tiempo de entrega de pedidos</TableCell>
              <TableCell>≥80%</TableCell>
              <TableCell class="text-muted-foreground">
                N° de pedidos entregados dentro del plazo x 100 / N° total de pedidos entregados
              </TableCell>
              <TableCell>Mensual</TableCell>
            </TableRow>
            <TableRow>
              <TableCell class="font-medium text-muted-foreground">Errores de despacho</TableCell>
              <TableCell class="text-muted-foreground">&lt;5%</TableCell>
              <TableCell class="text-muted-foreground" colspan="2">
                No disponible todavía — el sistema no registra despachos errados
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <template v-if="isPending">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton v-for="i in 4" :key="i" class="h-24 w-full" />
      </div>
    </template>

    <template v-else-if="isError">
      <div class="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p class="text-sm text-destructive">No se pudieron cargar los pedidos entregados</p>
        <Button variant="outline" size="sm" @click="refetch()">Reintentar</Button>
      </div>
    </template>

    <template v-else>
      <div class="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">Entregados en el período</CardTitle>
            <PackageCheck class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-semibold">{{ resumen.total }}</p>
            <p class="text-xs text-muted-foreground">
              {{ resumen.dentro }} dentro de {{ UMBRAL_HORAS }}h · {{ resumen.fuera }} fuera de plazo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">% dentro de {{ UMBRAL_HORAS }}h</CardTitle>
            <Clock class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-semibold" :class="resumen.pctDentro >= 80 ? 'text-green-600' : 'text-amber-600'">
              {{ formatNumero(resumen.pctDentro, 0) }}%
            </p>
            <p class="text-xs text-muted-foreground">Meta: ≥80% · {{ formatNumero(resumen.pctFuera, 0) }}% fuera de plazo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">Promedio de entrega</CardTitle>
            <Timer class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-semibold">{{ formatNumero(resumen.promedioHoras) }}h</p>
            <p class="text-xs text-muted-foreground">
              {{ formatNumero(resumen.promedioDias, 2) }} días · desv. estándar {{ formatNumero(resumen.desviacionHoras) }}h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">Tiempo máximo</CardTitle>
            <AlertTriangle class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-semibold">{{ formatNumero(resumen.maximoDias, 2) }} días</p>
            <p class="text-xs text-muted-foreground">El pedido más demorado del período</p>
          </CardContent>
        </Card>
      </div>

      <div class="grid shrink-0 gap-3 md:grid-cols-2">
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">
              Cumplimiento de plazo (≤{{ UMBRAL_HORAS }}h)
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            <div class="flex h-8 w-full overflow-hidden rounded-full bg-muted">
              <div
                class="flex items-center justify-center text-xs font-medium text-white transition-all"
                :class="resumen.pctDentro > 0 ? 'bg-green-500' : ''"
                :style="{ width: resumen.pctDentro + '%' }"
              >
                <span v-if="resumen.pctDentro > 12">{{ formatNumero(resumen.pctDentro, 0) }}%</span>
              </div>
              <div
                class="flex items-center justify-center text-xs font-medium text-white transition-all"
                :class="resumen.pctFuera > 0 ? 'bg-red-500' : ''"
                :style="{ width: resumen.pctFuera + '%' }"
              >
                <span v-if="resumen.pctFuera > 12">{{ formatNumero(resumen.pctFuera, 0) }}%</span>
              </div>
            </div>
            <div class="flex items-center gap-4 text-xs text-muted-foreground">
              <span class="flex items-center gap-1.5">
                <span class="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                Dentro de plazo ({{ resumen.dentro }})
              </span>
              <span class="flex items-center gap-1.5">
                <span class="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                Fuera de plazo ({{ resumen.fuera }})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">Tiempo promedio por etapa</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div v-for="e in etapas" :key="e.key" class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">{{ e.label }}</span>
                <span class="font-medium" :class="e.key === etapaCuello.key ? 'text-red-600' : ''">
                  {{ formatNumero(e.horas) }}h
                </span>
              </div>
              <div class="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full rounded-full transition-all"
                  :class="e.key === etapaCuello.key ? 'bg-red-500' : 'bg-primary'"
                  :style="{ width: Math.max((e.horas / etapaMaxHoras) * 100, 2) + '%' }"
                />
              </div>
            </div>
            <p v-if="pedidosFiltrados.length > 0" class="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <AlertTriangle class="h-3.5 w-3.5 shrink-0 text-red-500" />
              Cuello de botella: <span class="font-medium text-foreground">{{ etapaCuello.label }}</span>
              ({{ formatNumero(etapaCuello.horas) }}h en promedio)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card v-if="resumenTotal.total > 0" class="shrink-0">
        <CardHeader class="pb-2">
          <CardTitle class="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <FileClock class="h-4 w-4" />
            Trazabilidad con la cotización — desde el requerimiento del cliente
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <p class="text-xs text-muted-foreground">
            {{ resumenTotal.total }} pedido(s) con cotización vinculada (mismo N° de proforma). Reparte el tiempo total
            entre lo que tarda Cotizaciones en aprobar y lo que tarda Almacén en entregar.
          </p>
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-md border border-border p-3">
              <p class="text-xs text-muted-foreground">Etapa Cotización (requerimiento → recepción)</p>
              <p class="text-xl font-semibold">{{ formatNumero(resumenTotal.promedioCotizacion) }}h</p>
            </div>
            <div class="rounded-md border border-border p-3">
              <p class="text-xs text-muted-foreground">Etapa Almacén (recepción → entrega)</p>
              <p class="text-xl font-semibold">{{ formatNumero(resumenTotal.promedioAlmacen) }}h</p>
            </div>
            <div class="rounded-md border border-primary/30 bg-primary/5 p-3">
              <p class="text-xs text-muted-foreground">Total (requerimiento → entrega)</p>
              <p class="text-xl font-semibold text-primary">{{ formatNumero(resumenTotal.promedioTotal) }}h</p>
            </div>
          </div>

          <div v-if="peoresTotal.length > 0" class="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Proforma</TableHead>
                  <TableHead>Requerimiento</TableHead>
                  <TableHead>Entregado</TableHead>
                  <TableHead class="text-right">h Cotización</TableHead>
                  <TableHead class="text-right">h Almacén</TableHead>
                  <TableHead class="text-right">h Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="p in peoresTotal" :key="p.id">
                  <TableCell class="max-w-40 truncate">{{ p.cliente.nombre }}</TableCell>
                  <TableCell>{{ p.numeroProforma }}</TableCell>
                  <TableCell>{{ formatFechaHora(p.cotizacionRelacionada.requerimientoEn) }}</TableCell>
                  <TableCell>{{ formatFechaHora(p.entregadoEn) }}</TableCell>
                  <TableCell class="text-right">{{ formatNumero(p.horasCotizacion) }}</TableCell>
                  <TableCell class="text-right">{{ formatNumero(p.horas) }}</TableCell>
                  <TableCell class="text-right font-medium text-primary">{{ formatNumero(p.horasTotal) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div class="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-semibold">
          Cuello de botella
          <span class="text-sm font-normal text-muted-foreground">
            — pedidos que superaron {{ UMBRAL_HORAS }}h ({{ cuellosDeBotella.length }})
          </span>
        </h2>
      </div>

      <ScrollArea class="min-h-0 flex-1 rounded-md border border-border">
        <Table>
          <TableHeader class="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Proforma</TableHead>
              <TableHead>Recibido de almacén</TableHead>
              <TableHead>Salió de almacén</TableHead>
              <TableHead>Entregado</TableHead>
              <TableHead class="text-right">Horas</TableHead>
              <TableHead class="text-right">Días</TableHead>
              <TableHead>Observación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-if="cuellosDeBotella.length === 0">
              <TableRow>
                <TableCell colspan="8" class="py-16 text-center text-muted-foreground">
                  <PackageCheck class="mx-auto mb-3 h-10 w-10 opacity-50" />
                  Ningún pedido superó el umbral en este filtro
                </TableCell>
              </TableRow>
            </template>
            <template v-else>
              <TableRow v-for="p in cuellosDeBotella" :key="p.id">
                <TableCell class="max-w-48 truncate font-medium" :title="p.cliente.nombre">
                  {{ p.cliente.nombre }}
                </TableCell>
                <TableCell>{{ p.numeroProforma }}</TableCell>
                <TableCell :title="formatFechaHora(p.recibidoEn)">{{ formatFechaHora(p.recibidoEn) }}</TableCell>
                <TableCell :title="formatFechaHora(p.salioEn)">{{ formatFechaHora(p.salioEn) }}</TableCell>
                <TableCell :title="formatFechaHora(p.entregadoEn)">{{ formatFechaHora(p.entregadoEn) }}</TableCell>
                <TableCell class="text-right font-medium text-amber-600">{{ formatNumero(p.horas) }}</TableCell>
                <TableCell class="text-right">{{ formatNumero(p.dias, 2) }}</TableCell>
                <TableCell class="max-w-40 truncate" :title="p.categoriaObservacion ? CATEGORIA_OBSERVACION_LABEL[p.categoriaObservacion] : ''">
                  {{ p.categoriaObservacion ? CATEGORIA_OBSERVACION_LABEL[p.categoriaObservacion] : "—" }}
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </Table>
      </ScrollArea>
    </template>
  </div>
</template>
