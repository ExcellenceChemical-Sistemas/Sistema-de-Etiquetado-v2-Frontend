<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Download, Inbox, Search, Trash2, Eye, ChartNoAxesCombined, MoreVertical, Pencil, TriangleAlert, History, Truck } from "@lucide/vue";
import { urlSeguimiento } from "~/utils/seguimientoPedido";
import {
  useCotizacionesQuery,
  useDeleteCotizacion,
} from "~/composables/useCotizaciones";
import { usePermiso } from "~/composables/usePermiso";
import { formatFechaHora, formatFechaHoraCorta } from "~/utils/fechaHora";
import { useXlsxExport, type XlsxColumn } from "~/composables/useCsvExport";
import ProgressBar from "~/components/ui/ProgressBar.vue";
import { toast } from "vue-sonner";
import {
  ALERTA_COTIZACION_LABEL,
  CAMPO_COTIZACION_LABEL,
  ESTADO_COTIZACION_LABEL,
  type Cotizacion,
  type EstadoCotizacion,
} from "~/types/cotizacion";
import CotizacionForm from "~/components/cotizaciones/CotizacionForm.vue";
import CotizacionFechaDialog from "~/components/cotizaciones/CotizacionFechaDialog.vue";
import CotizacionEnviarDialog from "~/components/cotizaciones/CotizacionEnviarDialog.vue";
import CotizacionProgreso from "~/components/cotizaciones/CotizacionProgreso.vue";
import { useUsuarioActual } from "~/composables/useUsuarioActual";

const permiso = usePermiso("COTIZACIONES");
const { esAdmin } = useUsuarioActual();
const PAGE_SIZE = 10;
const page = ref(1);

const filtroEstado = ref<EstadoCotizacion | "TODOS">("TODOS");
const { data: cotizaciones, isPending, isError, refetch } = useCotizacionesQuery(filtroEstado);

// --- Búsqueda + filtro por día/mes/año (sobre la fecha de requerimiento) ---
// Mismo criterio que Pedidos: por defecto solo hoy (día+mes+año); "Ver todas" limpia los 3.
const hoy = new Date();
const busqueda = ref("");
const filtroDia = ref(String(hoy.getDate()));
const filtroMes = ref(String(hoy.getMonth()));
const filtroAnio = ref(String(hoy.getFullYear()));

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const aniosDisponibles = computed(() => {
  const anios = new Set((cotizaciones.value ?? []).map((c) => new Date(c.requerimientoEn).getFullYear()));
  anios.add(hoy.getFullYear());
  return Array.from(anios).sort((a, b) => b - a);
});

const diasEnMes = computed(() => {
  if (filtroMes.value === "TODOS" || filtroAnio.value === "TODOS") return 31;
  return new Date(Number(filtroAnio.value), Number(filtroMes.value) + 1, 0).getDate();
});

watch(diasEnMes, (dias) => {
  if (filtroDia.value !== "TODOS" && Number(filtroDia.value) > dias) filtroDia.value = "TODOS";
});

function limpiarFechas() {
  filtroDia.value = "TODOS";
  filtroMes.value = "TODOS";
  filtroAnio.value = "TODOS";
}

const hayFiltroFecha = computed(
  () => filtroDia.value !== "TODOS" || filtroMes.value !== "TODOS" || filtroAnio.value !== "TODOS",
);

const cotizacionesFiltradas = computed(() => {
  let lista = cotizaciones.value ?? [];

  if (filtroDia.value !== "TODOS") {
    const dia = Number(filtroDia.value);
    lista = lista.filter((c) => new Date(c.requerimientoEn).getDate() === dia);
  }
  if (filtroMes.value !== "TODOS") {
    const mes = Number(filtroMes.value);
    lista = lista.filter((c) => new Date(c.requerimientoEn).getMonth() === mes);
  }
  if (filtroAnio.value !== "TODOS") {
    const anio = Number(filtroAnio.value);
    lista = lista.filter((c) => new Date(c.requerimientoEn).getFullYear() === anio);
  }

  const q = busqueda.value.trim().toLowerCase();
  if (q) {
    lista = lista.filter(
      (c) => c.cliente.nombre.toLowerCase().includes(q) || (c.numeroProforma ?? "").toLowerCase().includes(q),
    );
  }
  return lista;
});

// si cambia cualquier filtro, siempre volvemos a la página 1
watch([filtroEstado, filtroDia, filtroMes, filtroAnio, busqueda], () => {
  page.value = 1;
});

const totalPages = computed(() => Math.max(1, Math.ceil(cotizacionesFiltradas.value.length / PAGE_SIZE)));
watch(totalPages, (tp) => {
  if (page.value > tp) page.value = tp;
});

const cotizacionesPaginadas = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE;
  return cotizacionesFiltradas.value.slice(start, start + PAGE_SIZE);
});

const { progress, isExporting, exportar } = useXlsxExport();

const xlsxColumns: XlsxColumn<Cotizacion>[] = [
  { key: (c: Cotizacion) => c.cliente.nombre, label: "Cliente" },
  { key: (c: Cotizacion) => c.numeroProforma ?? "", label: "N° Proforma" },
  { key: (c: Cotizacion) => ESTADO_COTIZACION_LABEL[c.estado], label: "Estado" },
  { key: (c: Cotizacion) => formatFechaHora(c.requerimientoEn), label: "Requerimiento del cliente" },
  { key: (c: Cotizacion) => formatFechaHora(c.cotizacionEnviadaEn), label: "Cotización enviada" },
  { key: (c: Cotizacion) => formatFechaHora(c.pedidoAprobadoEn), label: "Pedido aprobado" },
  { key: (c: Cotizacion) => formatFechaHora(c.avisoAlmacenEn), label: "Avisado a almacén" },
  { key: (c: Cotizacion) => c.notas ?? "", label: "Notas" },
  { key: (c: Cotizacion) => textoAlertas(c), label: "Alertas de integridad" },
  { key: (c: Cotizacion) => c.creadoPor.nombre, label: "Creado por" },
];

function exportarXlsx() {
  // Exporta exactamente lo que se ve: tab de estado + búsqueda + mes/año
  exportar(
    cotizacionesFiltradas.value,
    xlsxColumns,
    `cotizaciones-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

const TABS: { value: EstadoCotizacion | "TODOS"; label: string }[] = [
  { value: "TODOS", label: "Todas" },
  { value: "RECIBIDO", label: "Recibidas" },
  { value: "COTIZADO", label: "Cotizadas" },
  { value: "APROBADO", label: "Aprobadas" },
  { value: "AVISADO_ALMACEN", label: "Avisadas a almacén" },
];

const dialogOpen = ref(false);
function onSuccessCrear() {
  dialogOpen.value = false;
}

// Qué fecha corresponde marcar a continuación según el estado actual — igual criterio que
// SIGUIENTE_CAMPO en Pedidos.
const SIGUIENTE_CAMPO: Record<
  EstadoCotizacion,
  { campo: "cotizacionEnviadaEn" | "pedidoAprobadoEn" | "avisoAlmacenEn"; label: string } | null
> = {
  RECIBIDO: { campo: "cotizacionEnviadaEn", label: "Marcar cotización enviada" },
  COTIZADO: { campo: "pedidoAprobadoEn", label: "Marcar pedido aprobado" },
  APROBADO: { campo: "avisoAlmacenEn", label: "Marcar avisado a almacén" },
  AVISADO_ALMACEN: null,
};

const fechaDialogOpen = ref(false);
const fechaDialogCotizacion = ref<Cotizacion | null>(null);
const fechaDialogCampo = ref<"requerimientoEn" | "cotizacionEnviadaEn" | "pedidoAprobadoEn" | "avisoAlmacenEn">(
  "requerimientoEn",
);
const fechaDialogTitulo = ref("");

function abrirFecha(cotizacion: Cotizacion, campo: typeof fechaDialogCampo.value, titulo: string) {
  fechaDialogCotizacion.value = cotizacion;
  fechaDialogCampo.value = campo;
  fechaDialogTitulo.value = titulo;
  fechaDialogOpen.value = true;
}

// "Cotización enviada" pide fecha + n° de proforma juntos (recién ahí se conoce el número que
// asignó KEYFACIL), así que usa su propio diálogo en vez del genérico de fecha.
const enviarDialogOpen = ref(false);
const enviarDialogCotizacion = ref<Cotizacion | null>(null);

function abrirEnviar(cotizacion: Cotizacion) {
  enviarDialogCotizacion.value = cotizacion;
  enviarDialogOpen.value = true;
}

function marcarSiguiente(c: Cotizacion) {
  const siguiente = SIGUIENTE_CAMPO[c.estado];
  if (!siguiente) return;
  if (siguiente.campo === "cotizacionEnviadaEn") {
    abrirEnviar(c);
  } else {
    abrirFecha(c, siguiente.campo, siguiente.label);
  }
}

const detalleOpen = ref(false);
const detalleCotizacion = ref<Cotizacion | null>(null);

// El listado no trae pedidoRelacionado (evita un lookup extra por fila) — al abrir el detalle se
// muestra primero la versión del listado y se reemplaza en cuanto llega GET /cotizaciones/:id.
function abrirDetalle(cotizacion: Cotizacion) {
  detalleCotizacion.value = cotizacion;
  detalleOpen.value = true;
  const api = useApi();
  api
    .get<Cotizacion>(`/cotizaciones/${cotizacion.id}`)
    .then(({ data }) => {
      if (detalleCotizacion.value?.id === cotizacion.id) detalleCotizacion.value = data;
    })
    .catch(() => {
      // se queda con la versión del listado; solo se pierde la sección de trazabilidad con Pedido
    });
}

// Tiempo de punta a punta: desde que el cliente pidió la cotización hasta que el pedido se
// entregó de verdad — cruza los dos módulos (Cotización cotiza, Pedido despacha) por el mismo
// numeroProforma de KEYFACIL, ver PedidoRelacionado en types/cotizacion.ts.
function formatDuracion(desdeIso: string, hastaIso: string): string {
  const horas = (new Date(hastaIso).getTime() - new Date(desdeIso).getTime()) / 3_600_000;
  if (horas < 24) return `${Math.round(horas)}h`;
  const dias = Math.floor(horas / 24);
  const resto = Math.round(horas % 24);
  return resto > 0 ? `${dias}d ${resto}h` : `${dias}d`;
}

const tiempoTotalEntrega = computed(() => {
  const entregadoEn = detalleCotizacion.value?.pedidoRelacionado?.entregadoEn;
  const requerimientoEn = detalleCotizacion.value?.requerimientoEn;
  if (!entregadoEn || !requerimientoEn) return null;
  return formatDuracion(requerimientoEn, entregadoEn);
});

// SPA sin SSR (ver CLAUDE.md): window siempre existe acá, no hace falta guardarlo.
const urlSeguimientoPedidoRelacionado = computed(() => {
  const token = detalleCotizacion.value?.pedidoRelacionado?.tokenSeguimiento;
  return token ? urlSeguimiento(window.location.origin, token) : "";
});

const { mutateAsync: eliminarCotizacion, isPending: eliminando } = useDeleteCotizacion();
const eliminarOpen = ref(false);
const cotizacionAEliminar = ref<Cotizacion | null>(null);

function pedirEliminar(c: Cotizacion) {
  cotizacionAEliminar.value = c;
  eliminarOpen.value = true;
}

async function confirmarEliminar() {
  if (!cotizacionAEliminar.value) return;
  try {
    await eliminarCotizacion(cotizacionAEliminar.value.id);
    toast.success("Cotización eliminada");
    eliminarOpen.value = false;
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo eliminar la cotización");
  }
}

function formatFechaHoraOTexto(valor: string, campo: string) {
  return campo === "numeroProforma" ? valor : formatFechaHora(valor);
}

function textoAlertas(c: Cotizacion) {
  return c.alertas
    .map((a) => `${CAMPO_COTIZACION_LABEL[a.campo]}: ${ALERTA_COTIZACION_LABEL[a.tipo]}`)
    .join("\n");
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Cotizaciones</h1>
        <p class="text-sm text-muted-foreground">
          Seguimiento del proceso de Joel: pedido del cliente → cotización → aprobación → aviso a
          almacén. Insumos y cantidades quedan en KEYFACIL ERP, acá solo los tiempos.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" as-child>
          <NuxtLink to="/cotizaciones/indicadores">
            <ChartNoAxesCombined class="h-4 w-4 mr-2" />
            Indicadores
          </NuxtLink>
        </Button>
        <Button
          variant="outline"
          :disabled="isExporting || cotizacionesFiltradas.length === 0"
          class="min-w-[168px] justify-center"
          @click="exportarXlsx"
        >
          <template v-if="isExporting">
            <ProgressBar :value="progress" compact class="w-20" />
            <span class="ml-2 text-xs tabular-nums text-muted-foreground">
              {{ Math.round(progress) }}%
            </span>
          </template>
          <template v-else>
            <Download class="h-4 w-4 mr-2" />
            Exportar Excel
          </template>
        </Button>
        <Button v-if="permiso.puedeCrear" @click="dialogOpen = true">Nueva cotización</Button>
      </div>
    </div>

    <div class="flex shrink-0 flex-wrap gap-2">
      <Button
        v-for="tab in TABS"
        :key="tab.value"
        size="sm"
        :variant="filtroEstado === tab.value ? 'default' : 'outline'"
        @click="filtroEstado = tab.value"
      >
        {{ tab.label }}
      </Button>
    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-2">
      <div class="relative w-full max-w-sm">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="busqueda" placeholder="Buscar por cliente o proforma..." aria-label="Buscar por cliente o proforma" class="pl-8" />
      </div>
      <Select v-model="filtroDia">
        <SelectTrigger class="w-24" aria-label="Filtrar por día">
          <SelectValue placeholder="Día" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Todos</SelectItem>
          <SelectItem v-for="d in diasEnMes" :key="d" :value="String(d)">{{ d }}</SelectItem>
        </SelectContent>
      </Select>
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
      <Button v-if="hayFiltroFecha" variant="ghost" size="sm" @click="limpiarFechas">
        Ver todas las cotizaciones
      </Button>
    </div>

    <ScrollArea class="min-h-0 flex-1 rounded-md border border-border">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Proforma</TableHead>
            <TableHead>Requerimiento</TableHead>
            <TableHead>Progreso</TableHead>
            <TableHead class="w-64 text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isPending">
            <TableRow v-for="i in 4" :key="i">
              <TableCell v-for="j in 5" :key="j"><Skeleton class="h-4 w-full" /></TableCell>
            </TableRow>
          </template>
          <template v-else-if="isError">
            <TableRow>
              <TableCell colspan="5" class="text-center py-8">
                <p class="text-sm text-destructive mb-2">No se pudieron cargar las cotizaciones</p>
                <Button variant="outline" size="sm" @click="refetch()">Reintentar</Button>
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="cotizacionesFiltradas.length === 0">
            <TableRow>
              <TableCell colspan="5" class="py-16 text-center text-muted-foreground">
                <Inbox class="mx-auto mb-3 h-10 w-10 opacity-50" />
                No hay cotizaciones en este filtro
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow v-for="c in cotizacionesPaginadas" :key="c.id">
              <TableCell class="max-w-48 truncate font-medium">
                <span class="inline-flex items-center gap-1.5" :title="c.cliente.nombre">
                  <TriangleAlert
                    v-if="c.alertas.length > 0"
                    class="h-4 w-4 shrink-0 text-amber-500"
                    :title="textoAlertas(c)"
                  />
                  {{ c.cliente.nombre }}
                </span>
              </TableCell>
              <TableCell>{{ c.numeroProforma ?? "—" }}</TableCell>
              <TableCell :title="formatFechaHora(c.requerimientoEn)">
                {{ formatFechaHoraCorta(c.requerimientoEn) }}
              </TableCell>
              <TableCell>
                <CotizacionProgreso :cotizacion="c" />
              </TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" class="h-8 w-8" title="Ver detalle" aria-label="Ver detalle" @click="abrirDetalle(c)">
                    <Eye class="h-4 w-4" />
                  </Button>
                  <Button
                    v-if="permiso.puedeEditar && SIGUIENTE_CAMPO[c.estado]"
                    size="sm"
                    variant="outline"
                    @click="marcarSiguiente(c)"
                  >
                    {{ SIGUIENTE_CAMPO[c.estado]!.label }}
                  </Button>
                  <span v-else class="text-xs text-muted-foreground">{{ ESTADO_COTIZACION_LABEL[c.estado] }}</span>

                  <DropdownMenu v-if="permiso.puedeEditar || permiso.puedeEliminar">
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="icon" class="h-8 w-8">
                        <MoreVertical class="h-4 w-4" />
                        <span class="sr-only">Más acciones</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <template v-if="permiso.puedeEditar">
                        <DropdownMenuItem @click="abrirFecha(c, 'requerimientoEn', 'Editar fecha de requerimiento')">
                          <Pencil class="mr-2 h-3.5 w-3.5" />
                          Editar requerimiento
                        </DropdownMenuItem>
                        <DropdownMenuItem v-if="c.cotizacionEnviadaEn && esAdmin" @click="abrirEnviar(c)">
                          <Pencil class="mr-2 h-3.5 w-3.5" />
                          Corregir cotización enviada
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          v-if="c.pedidoAprobadoEn && esAdmin"
                          @click="abrirFecha(c, 'pedidoAprobadoEn', 'Corregir fecha de aprobación')"
                        >
                          <Pencil class="mr-2 h-3.5 w-3.5" />
                          Corregir aprobación
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          v-if="c.avisoAlmacenEn && esAdmin"
                          @click="abrirFecha(c, 'avisoAlmacenEn', 'Corregir fecha de aviso a almacén')"
                        >
                          <Pencil class="mr-2 h-3.5 w-3.5" />
                          Corregir aviso a almacén
                        </DropdownMenuItem>
                      </template>
                      <template v-if="permiso.puedeEliminar">
                        <DropdownMenuSeparator v-if="permiso.puedeEditar" />
                        <DropdownMenuItem class="text-destructive focus:text-destructive" @click="pedirEliminar(c)">
                          <Trash2 class="mr-2 h-3.5 w-3.5" />
                          Eliminar cotización
                        </DropdownMenuItem>
                      </template>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </ScrollArea>

    <div
      v-if="!isPending && !isError && cotizacionesFiltradas.length > 0"
      class="flex shrink-0 flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-muted-foreground">
        {{ cotizacionesFiltradas.length }} {{ cotizacionesFiltradas.length === 1 ? "cotización" : "cotizaciones" }} ·
        página {{ page }} de {{ totalPages }}
      </p>

      <Pagination
        v-model:page="page"
        :total="cotizacionesFiltradas.length"
        :items-per-page="PAGE_SIZE"
        :sibling-count="1"
        show-edges
      >
        <PaginationContent v-slot="{ items }">
          <PaginationPrevious />
          <template v-for="(item, index) in items" :key="index">
            <PaginationItem
              v-if="item.type === 'page'"
              :value="item.value"
              as-child
            >
              <Button
                class="w-9 h-9 p-0"
                :variant="item.value === page ? 'default' : 'outline'"
              >
                {{ item.value }}
              </Button>
            </PaginationItem>
            <PaginationEllipsis v-else :index="index" />
          </template>
          <PaginationNext />
        </PaginationContent>
      </Pagination>
    </div>

    <Dialog v-model:open="dialogOpen">
      <DialogContent>
        <DialogTitle>Nueva cotización</DialogTitle>
        <CotizacionForm @success="onSuccessCrear" />
      </DialogContent>
    </Dialog>

    <CotizacionFechaDialog
      v-model:open="fechaDialogOpen"
      :cotizacion="fechaDialogCotizacion"
      :campo="fechaDialogCampo"
      :titulo="fechaDialogTitulo"
    />

    <CotizacionEnviarDialog v-model:open="enviarDialogOpen" :cotizacion="enviarDialogCotizacion" />

    <Dialog v-model:open="detalleOpen">
      <DialogContent class="max-w-lg max-h-[85vh] overflow-y-auto scroll-tema">
        <DialogTitle>Detalle de la cotización</DialogTitle>
        <div v-if="detalleCotizacion" class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <p class="text-muted-foreground">Cliente</p>
            <p class="font-medium">{{ detalleCotizacion.cliente.nombre }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">N° Proforma</p>
            <p class="font-medium">{{ detalleCotizacion.numeroProforma ?? "—" }}</p>
          </div>
          <div class="col-span-2">
            <p class="text-muted-foreground">Estado</p>
            <p class="font-medium">{{ ESTADO_COTIZACION_LABEL[detalleCotizacion.estado] }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Requerimiento del cliente</p>
            <p class="font-medium">{{ formatFechaHora(detalleCotizacion.requerimientoEn) }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Cotización enviada</p>
            <p class="font-medium">{{ formatFechaHora(detalleCotizacion.cotizacionEnviadaEn) }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Pedido aprobado</p>
            <p class="font-medium">{{ formatFechaHora(detalleCotizacion.pedidoAprobadoEn) }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Avisado a almacén</p>
            <p class="font-medium">{{ formatFechaHora(detalleCotizacion.avisoAlmacenEn) }}</p>
          </div>
          <div v-if="detalleCotizacion.pedidoRelacionado" class="col-span-2 space-y-2 rounded-md border border-border p-3">
            <p class="flex items-center justify-between gap-2 text-muted-foreground">
              <span class="flex items-center gap-1.5">
                <Truck class="h-4 w-4" />
                Trazabilidad con el pedido
              </span>
              <span v-if="tiempoTotalEntrega" class="font-mono text-xs tabular-nums text-foreground">
                requerimiento → entrega: {{ tiempoTotalEntrega }}
              </span>
            </p>
            <ul class="space-y-1 text-xs">
              <li class="flex justify-between gap-2">
                <span>Recibido en almacén</span>
                <span class="font-medium">{{ formatFechaHora(detalleCotizacion.pedidoRelacionado.recibidoEn) }}</span>
              </li>
              <li class="flex justify-between gap-2">
                <span>Inicio de preparación</span>
                <span class="font-medium">{{ formatFechaHora(detalleCotizacion.pedidoRelacionado.inicioPreparacionEn) }}</span>
              </li>
              <li class="flex justify-between gap-2">
                <span>Preparado</span>
                <span class="font-medium">{{ formatFechaHora(detalleCotizacion.pedidoRelacionado.preparadoEn) }}</span>
              </li>
              <li class="flex justify-between gap-2">
                <span>Salió</span>
                <span class="font-medium">{{ formatFechaHora(detalleCotizacion.pedidoRelacionado.salioEn) }}</span>
              </li>
              <li class="flex justify-between gap-2">
                <span>Entregado</span>
                <span class="font-medium">{{ formatFechaHora(detalleCotizacion.pedidoRelacionado.entregadoEn) }}</span>
              </li>
            </ul>
            <a
              :href="urlSeguimientoPedidoRelacionado"
              target="_blank"
              rel="noopener"
              class="text-xs text-primary hover:underline"
            >
              Ver página pública de seguimiento →
            </a>
          </div>
          <p
            v-else-if="detalleCotizacion.numeroProforma"
            class="col-span-2 text-xs text-muted-foreground"
          >
            Todavía no hay un Pedido registrado con esta proforma.
          </p>

          <div class="col-span-2">
            <p class="text-muted-foreground">Notas</p>
            <p class="font-medium">{{ detalleCotizacion.notas ?? "—" }}</p>
          </div>
          <div v-if="detalleCotizacion.alertas.length > 0" class="col-span-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
            <p class="mb-1 flex items-center gap-1.5 font-medium text-amber-600">
              <TriangleAlert class="h-4 w-4" />
              Alertas de integridad
            </p>
            <ul class="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              <li v-for="(a, i) in detalleCotizacion.alertas" :key="i">
                <span class="font-medium text-foreground">{{ CAMPO_COTIZACION_LABEL[a.campo] }}</span>:
                {{ ALERTA_COTIZACION_LABEL[a.tipo] }}
                <span v-if="a.motivo">({{ a.motivo }})</span>
              </li>
            </ul>
          </div>
          <div>
            <p class="text-muted-foreground">Creado por</p>
            <p class="font-medium">{{ detalleCotizacion.creadoPor.nombre }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Última edición</p>
            <p class="font-medium">{{ detalleCotizacion.ultimoEditadoPor?.nombre ?? "—" }}</p>
          </div>
          <div v-if="(detalleCotizacion.historial ?? []).length > 0" class="col-span-2 space-y-2">
            <p class="flex items-center gap-1.5 text-muted-foreground">
              <History class="h-4 w-4" />
              Historial de cambios (hora real del sistema, no editable)
            </p>
            <ul class="space-y-1.5 rounded-md border border-border p-3 text-xs">
              <li v-for="h in detalleCotizacion.historial ?? []" :key="h.id" class="border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
                <span class="font-medium text-foreground">{{ CAMPO_COTIZACION_LABEL[h.campo as keyof typeof CAMPO_COTIZACION_LABEL] ?? h.campo }}</span>
                : {{ h.valorAnterior ? formatFechaHoraOTexto(h.valorAnterior, h.campo) : "(vacío)" }}
                →
                {{ h.valorNuevo ? formatFechaHoraOTexto(h.valorNuevo, h.campo) : "(vacío)" }}
                <span class="block text-muted-foreground">
                  {{ h.editadoPor.nombre }} · {{ formatFechaHora(h.editadoEn) }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="eliminarOpen">
      <DialogContent class="max-w-md">
        <DialogTitle>Eliminar cotización</DialogTitle>
        <p class="text-sm text-muted-foreground">
          ¿Seguro que quieres eliminar la cotización de
          <span class="font-medium text-foreground">{{ cotizacionAEliminar?.cliente.nombre }}</span>
          (proforma {{ cotizacionAEliminar?.numeroProforma ?? "sin cotizar" }})? Esta acción no se puede deshacer.
        </p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" :disabled="eliminando" @click="eliminarOpen = false">
            Cancelar
          </Button>
          <Button variant="destructive" :disabled="eliminando" @click="confirmarEliminar">
            <span
              v-if="eliminando"
              class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
