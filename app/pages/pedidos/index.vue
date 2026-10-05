<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Download, MessageSquare, Inbox, MoreVertical, Pencil, Trash2, Eye, Search, ChartNoAxesCombined, Link2, RefreshCw, Undo2 } from "@lucide/vue";
import { urlSeguimiento } from "~/utils/seguimientoPedido";
import { usePedidosQuery, useDeletePedido, useRegenerarTokenPedido } from "~/composables/usePedidos";
import { usePermiso } from "~/composables/usePermiso";
import { formatFechaHora, formatFechaHoraCorta } from "~/utils/fechaHora";
import { horaMostrable } from "~/utils/horaMostrable";
import { useXlsxExport, type XlsxColumn } from "~/composables/useCsvExport";
import ProgressBar from "~/components/ui/ProgressBar.vue";
import { toast } from "vue-sonner";
import {
  ESTADO_PEDIDO_LABEL,
  CATEGORIA_OBSERVACION_LABEL,
  type EstadoPedido,
  type Pedido,
} from "~/types/pedido";
import PedidoForm from "~/components/pedidos/PedidoForm.vue";
import PedidoFechaDialog from "~/components/pedidos/PedidoFechaDialog.vue";
import PedidoDeshacerDialog from "~/components/pedidos/PedidoDeshacerDialog.vue";
import PedidoObservacionDialog from "~/components/pedidos/PedidoObservacionDialog.vue";
import PedidoProgreso from "~/components/pedidos/PedidoProgreso.vue";
import { useUsuarioActual } from "~/composables/useUsuarioActual";

const permiso = usePermiso("PEDIDOS");
const { esAdmin } = useUsuarioActual();
const PAGE_SIZE = 10;
const page = ref(1);

const filtroEstado = ref<EstadoPedido | "TODOS">("TODOS");
const { data: pedidos, isPending, isError, refetch } = usePedidosQuery(filtroEstado);

// --- Búsqueda + filtro por día/mes/año (sobre la fecha de recepción) ---
// Por defecto se filtra por el día de hoy (día+mes+año), como pidió el usuario: la pantalla
// abre mostrando solo lo de hoy, no el historial completo. "Todos" (limpiarFechas) saca los 3
// filtros de una para ver todo.
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
  const anios = new Set((pedidos.value ?? []).map((p) => new Date(p.recibidoEn).getFullYear()));
  anios.add(hoy.getFullYear());
  return Array.from(anios).sort((a, b) => b - a);
});

// Cuántos días mostrar en el select: los del mes/año elegidos si ambos están fijados, si no 31
// (sin restringir de más cuando "Mes" o "Año" siguen en "Todos").
const diasEnMes = computed(() => {
  if (filtroMes.value === "TODOS" || filtroAnio.value === "TODOS") return 31;
  return new Date(Number(filtroAnio.value), Number(filtroMes.value) + 1, 0).getDate();
});

// Si cambia mes/año y el día elegido ya no existe en ese mes (ej. 31 en un mes de 30), se cae a
// "Todos" en vez de quedar en un valor inválido.
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

const pedidosFiltrados = computed(() => {
  let lista = pedidos.value ?? [];

  if (filtroDia.value !== "TODOS") {
    const dia = Number(filtroDia.value);
    lista = lista.filter((p) => new Date(p.recibidoEn).getDate() === dia);
  }
  if (filtroMes.value !== "TODOS") {
    const mes = Number(filtroMes.value);
    lista = lista.filter((p) => new Date(p.recibidoEn).getMonth() === mes);
  }
  if (filtroAnio.value !== "TODOS") {
    const anio = Number(filtroAnio.value);
    lista = lista.filter((p) => new Date(p.recibidoEn).getFullYear() === anio);
  }

  const q = busqueda.value.trim().toLowerCase();
  if (q) {
    lista = lista.filter(
      (p) => p.cliente.nombre.toLowerCase().includes(q) || p.numeroProforma.toLowerCase().includes(q),
    );
  }

  return lista;
});

// si cambia cualquier filtro, siempre volvemos a la página 1
watch([filtroEstado, filtroDia, filtroMes, filtroAnio, busqueda], () => {
  page.value = 1;
});

const totalPages = computed(() => Math.max(1, Math.ceil(pedidosFiltrados.value.length / PAGE_SIZE)));
watch(totalPages, (tp) => {
  if (page.value > tp) page.value = tp;
});

const pedidosPaginados = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE;
  return pedidosFiltrados.value.slice(start, start + PAGE_SIZE);
});

const { progress, isExporting, exportar } = useXlsxExport();

const xlsxColumns: XlsxColumn<Pedido>[] = [
  { key: (p: Pedido) => p.cliente.nombre, label: "Cliente" },
  { key: "numeroProforma", label: "N° Proforma" },
  { key: (p: Pedido) => ESTADO_PEDIDO_LABEL[p.estado], label: "Estado" },
  { key: (p: Pedido) => formatFechaHora(p.recibidoEn), label: "Recibido de almacén" },
  { key: (p: Pedido) => formatFechaHora(p.inicioPreparacionEn), label: "Inicio de preparación" },
  { key: (p: Pedido) => formatFechaHora(horaMostrable(p.preparadoEn)), label: "Fin de preparación" },
  { key: (p: Pedido) => formatFechaHora(p.salioEn), label: "Salió de almacén" },
  { key: (p: Pedido) => formatFechaHora(horaMostrable(p.entregadoEn)), label: "Entregado" },
  {
    key: (p: Pedido) => (p.categoriaObservacion ? CATEGORIA_OBSERVACION_LABEL[p.categoriaObservacion] : ""),
    label: "Observación",
  },
  { key: (p: Pedido) => p.detalleObservacion ?? "", label: "Detalle observación" },
];

function exportarXlsx() {
  // Exporta exactamente lo que se ve: tab de estado + búsqueda + mes/año
  exportar(
    pedidosFiltrados.value,
    xlsxColumns,
    `pedidos-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

const TABS: { value: EstadoPedido | "TODOS"; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "RECIBIDO", label: "Recibidos" },
  { value: "EN_PREPARACION", label: "En preparación" },
  { value: "PREPARADO", label: "Preparados" },
  { value: "SALIO", label: "En ruta" },
  { value: "ENTREGADO", label: "Entregados" },
];

// Qué campo de fecha corresponde marcar/editar a continuación según el
// estado actual del pedido — así cada fila solo ofrece la acción que
// corresponde, sin tener que exponer las 5 fechas como botones sueltos.
const SIGUIENTE_CAMPO: Record<
  EstadoPedido,
  { campo: "inicioPreparacionEn" | "preparadoEn" | "salioEn" | "entregadoEn"; label: string } | null
> = {
  RECIBIDO: { campo: "inicioPreparacionEn", label: "Marcar inicio de preparación" },
  EN_PREPARACION: { campo: "preparadoEn", label: "Marcar preparado" },
  PREPARADO: { campo: "salioEn", label: "Marcar salida" },
  SALIO: { campo: "entregadoEn", label: "Marcar entrega" },
  ENTREGADO: null,
};

const dialogOpen = ref(false);

const fechaDialogOpen = ref(false);
const fechaDialogPedido = ref<Pedido | null>(null);
const fechaDialogCampo = ref<"recibidoEn" | "inicioPreparacionEn" | "preparadoEn" | "salioEn" | "entregadoEn">(
  "recibidoEn",
);
const fechaDialogTitulo = ref("");

function abrirFecha(pedido: Pedido, campo: typeof fechaDialogCampo.value, titulo: string) {
  fechaDialogPedido.value = pedido;
  fechaDialogCampo.value = campo;
  fechaDialogTitulo.value = titulo;
  fechaDialogOpen.value = true;
}

const deshacerDialogOpen = ref(false);
const deshacerDialogPedido = ref<Pedido | null>(null);
const deshacerDialogCampo = ref<"inicioPreparacionEn" | "preparadoEn" | "salioEn" | "entregadoEn">(
  "salioEn",
);

function abrirDeshacer(pedido: Pedido, campo: typeof deshacerDialogCampo.value) {
  deshacerDialogPedido.value = pedido;
  deshacerDialogCampo.value = campo;
  deshacerDialogOpen.value = true;
}

const observacionOpen = ref(false);
const observacionPedido = ref<Pedido | null>(null);

function abrirObservacion(pedido: Pedido) {
  observacionPedido.value = pedido;
  observacionOpen.value = true;
}

function onSuccessCrear() {
  dialogOpen.value = false;
}

// --- Ver detalle ---
// Cualquiera con puedeVer en PEDIDOS ya llega a esta página (lo exige el
// middleware de permisos), así que el detalle usa el mismo permiso: si ve
// la tabla, ve el detalle.
const detalleOpen = ref(false);
const detallePedido = ref<Pedido | null>(null);

// Enlace público de seguimiento: el cliente lo abre sin cuenta (/p/<token>).
async function copiarEnlace(pedido: Pedido) {
  const url = urlSeguimiento(window.location.origin, pedido.tokenSeguimiento);
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Enlace de seguimiento copiado", {
      description: `Proforma ${pedido.numeroProforma}. Envíaselo al cliente.`,
    });
  } catch {
    // Sin permiso de portapapeles (o sin https): se muestra para copiarlo a mano.
    window.prompt("Copia este enlace y envíaselo al cliente:", url);
  }
}

function abrirDetalle(pedido: Pedido) {
  detallePedido.value = pedido;
  detalleOpen.value = true;
}

// --- Eliminar ---
const { mutateAsync: eliminarPedido, isPending: eliminando } = useDeletePedido();
const eliminarOpen = ref(false);
const pedidoAEliminar = ref<Pedido | null>(null);

function pedirEliminar(pedido: Pedido) {
  pedidoAEliminar.value = pedido;
  eliminarOpen.value = true;
}

async function confirmarEliminar() {
  if (!pedidoAEliminar.value) return;
  try {
    await eliminarPedido(pedidoAEliminar.value.id);
    toast.success("Pedido eliminado");
    eliminarOpen.value = false;
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo eliminar el pedido");
  }
}

// --- Regenerar enlace de seguimiento ---
// El enlace viejo deja de funcionar apenas se emite el nuevo, por eso pide confirmación
// como eliminar (no es tan grave, pero sigue siendo una acción que no se puede deshacer).
const { mutateAsync: regenerarToken, isPending: regenerando } = useRegenerarTokenPedido();
const regenerarOpen = ref(false);
const pedidoARegenerar = ref<Pedido | null>(null);

function pedirRegenerar(pedido: Pedido) {
  pedidoARegenerar.value = pedido;
  regenerarOpen.value = true;
}

async function confirmarRegenerar() {
  if (!pedidoARegenerar.value) return;
  try {
    const actualizado = await regenerarToken(pedidoARegenerar.value.id);
    regenerarOpen.value = false;
    const url = urlSeguimiento(window.location.origin, actualizado.tokenSeguimiento);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace regenerado y copiado", {
        description: `El enlace anterior ya no funciona. Envíaselo al cliente.`,
      });
    } catch {
      toast.success("Enlace regenerado");
      window.prompt("El enlace anterior ya no funciona. Copia el nuevo y envíaselo al cliente:", url);
    }
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo regenerar el enlace");
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Pedidos</h1>
        <p class="text-sm text-muted-foreground">
          Tiempo de entrega: recepción, preparación, salida y entrega de cada pedido.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" as-child>
          <NuxtLink to="/pedidos/indicadores">
            <ChartNoAxesCombined class="h-4 w-4 mr-2" />
            Indicadores
          </NuxtLink>
        </Button>
        <Button
          variant="outline"
          :disabled="isExporting || pedidosFiltrados.length === 0"
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
        <Button v-if="permiso.puedeCrear" @click="dialogOpen = true">Nuevo pedido</Button>
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
        Ver todos los pedidos
      </Button>
    </div>

    <ScrollArea class="min-h-0 flex-1 rounded-md border border-border">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Proforma</TableHead>
            <TableHead>Recibido</TableHead>
            <TableHead>Progreso</TableHead>
            <TableHead class="w-10 text-center">Obs.</TableHead>
            <TableHead class="w-[23rem] text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isPending">
            <TableRow v-for="i in 4" :key="i">
              <TableCell v-for="j in 6" :key="j"><Skeleton class="h-4 w-full" /></TableCell>
            </TableRow>
          </template>
          <template v-else-if="isError">
            <TableRow>
              <TableCell colspan="6" class="text-center py-8">
                <p class="text-sm text-destructive mb-2">No se pudieron cargar los pedidos</p>
                <Button variant="outline" size="sm" @click="refetch()">Reintentar</Button>
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="pedidosFiltrados.length === 0">
            <TableRow>
              <TableCell colspan="6" class="py-16 text-center text-muted-foreground">
                <Inbox class="mx-auto mb-3 h-10 w-10 opacity-50" />
                No hay pedidos en este filtro
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow v-for="p in pedidosPaginados" :key="p.id">
              <TableCell class="max-w-48 truncate font-medium" :title="p.cliente.nombre">
                {{ p.cliente.nombre }}
              </TableCell>
              <TableCell>{{ p.numeroProforma }}</TableCell>
              <TableCell :title="formatFechaHora(p.recibidoEn)">
                {{ formatFechaHoraCorta(p.recibidoEn) }}
              </TableCell>
              <TableCell>
                <PedidoProgreso :pedido="p" />
              </TableCell>
              <TableCell class="text-center">
                <MessageSquare
                  v-if="p.categoriaObservacion"
                  class="mx-auto h-4 w-4 text-amber-500"
                  :title="CATEGORIA_OBSERVACION_LABEL[p.categoriaObservacion]"
                />
              </TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" class="h-8 w-8" title="Ver detalle" aria-label="Ver detalle" @click="abrirDetalle(p)">
                    <Eye class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8"
                    title="Copiar enlace de seguimiento para el cliente" aria-label="Copiar enlace de seguimiento para el cliente"
                    @click="copiarEnlace(p)"
                  >
                    <Link2 class="h-4 w-4" />
                    <span class="sr-only">Copiar enlace de seguimiento</span>
                  </Button>
                  <Button
                    v-if="permiso.puedeEditar && SIGUIENTE_CAMPO[p.estado]"
                    size="sm"
                    variant="outline"
                    class="min-w-[15rem] shrink-0 justify-center"
                    @click="abrirFecha(p, SIGUIENTE_CAMPO[p.estado]!.campo, SIGUIENTE_CAMPO[p.estado]!.label)"
                  >
                    {{ SIGUIENTE_CAMPO[p.estado]!.label }}
                  </Button>
                  <span
                    v-else
                    class="inline-flex min-w-[15rem] shrink-0 items-center justify-end text-xs text-muted-foreground"
                  >
                    {{ ESTADO_PEDIDO_LABEL[p.estado] }}
                  </span>

                  <DropdownMenu v-if="permiso.puedeEditar || permiso.puedeEliminar">
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="icon" class="h-8 w-8" title="Más acciones" aria-label="Más acciones">
                        <MoreVertical class="h-4 w-4" />
                        <span class="sr-only">Más acciones</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <template v-if="permiso.puedeEditar">
                        <DropdownMenuItem @click="abrirFecha(p, 'recibidoEn', 'Corregir fecha de recepción')">
                          <Pencil class="mr-2 h-3.5 w-3.5" />
                          Corregir recepción
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          v-if="p.inicioPreparacionEn"
                          @click="abrirFecha(p, 'inicioPreparacionEn', 'Corregir fecha de inicio de preparación')"
                        >
                          <Pencil class="mr-2 h-3.5 w-3.5" />
                          Corregir inicio de preparación
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          v-if="p.preparadoEn"
                          @click="abrirFecha(p, 'preparadoEn', 'Corregir fecha de preparación')"
                        >
                          <Pencil class="mr-2 h-3.5 w-3.5" />
                          Corregir preparación
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          v-if="p.salioEn"
                          @click="abrirFecha(p, 'salioEn', 'Corregir fecha de salida')"
                        >
                          <Pencil class="mr-2 h-3.5 w-3.5" />
                          Corregir salida
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          v-if="p.entregadoEn"
                          @click="abrirFecha(p, 'entregadoEn', 'Corregir fecha de entrega')"
                        >
                          <Pencil class="mr-2 h-3.5 w-3.5" />
                          Corregir entrega
                        </DropdownMenuItem>
                        <DropdownMenuSeparator v-if="esAdmin && (p.inicioPreparacionEn || p.preparadoEn || p.salioEn || p.entregadoEn)" />
                        <DropdownMenuItem
                          v-if="p.entregadoEn && esAdmin"
                          class="text-destructive focus:text-destructive"
                          @click="abrirDeshacer(p, 'entregadoEn')"
                        >
                          <Undo2 class="mr-2 h-3.5 w-3.5" />
                          Deshacer entrega
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          v-if="p.salioEn && esAdmin"
                          class="text-destructive focus:text-destructive"
                          @click="abrirDeshacer(p, 'salioEn')"
                        >
                          <Undo2 class="mr-2 h-3.5 w-3.5" />
                          Deshacer salida
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          v-if="p.preparadoEn && esAdmin"
                          class="text-destructive focus:text-destructive"
                          @click="abrirDeshacer(p, 'preparadoEn')"
                        >
                          <Undo2 class="mr-2 h-3.5 w-3.5" />
                          Deshacer preparación
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          v-if="p.inicioPreparacionEn && esAdmin"
                          class="text-destructive focus:text-destructive"
                          @click="abrirDeshacer(p, 'inicioPreparacionEn')"
                        >
                          <Undo2 class="mr-2 h-3.5 w-3.5" />
                          Deshacer inicio de preparación
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem @click="abrirObservacion(p)">
                          <MessageSquare class="mr-2 h-3.5 w-3.5" />
                          {{ p.categoriaObservacion ? "Editar observación" : "Agregar observación" }}
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="pedirRegenerar(p)">
                          <RefreshCw class="mr-2 h-3.5 w-3.5" />
                          Regenerar enlace de seguimiento
                        </DropdownMenuItem>
                      </template>
                      <template v-if="permiso.puedeEliminar">
                        <DropdownMenuSeparator v-if="permiso.puedeEditar" />
                        <DropdownMenuItem class="text-destructive focus:text-destructive" @click="pedirEliminar(p)">
                          <Trash2 class="mr-2 h-3.5 w-3.5" />
                          Eliminar pedido
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
      v-if="!isPending && !isError && pedidosFiltrados.length > 0"
      class="flex shrink-0 flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-muted-foreground">
        {{ pedidosFiltrados.length }} pedido{{ pedidosFiltrados.length === 1 ? "" : "s" }} ·
        página {{ page }} de {{ totalPages }}
      </p>

      <Pagination
        v-model:page="page"
        :total="pedidosFiltrados.length"
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
        <DialogTitle>Nuevo pedido</DialogTitle>
        <PedidoForm @success="onSuccessCrear" />
      </DialogContent>
    </Dialog>

    <PedidoFechaDialog
      v-model:open="fechaDialogOpen"
      :pedido="fechaDialogPedido"
      :campo="fechaDialogCampo"
      :titulo="fechaDialogTitulo"
    />

    <PedidoDeshacerDialog
      v-model:open="deshacerDialogOpen"
      :pedido="deshacerDialogPedido"
      :campo="deshacerDialogCampo"
    />

    <PedidoObservacionDialog v-model:open="observacionOpen" :pedido="observacionPedido" />

    <Dialog v-model:open="detalleOpen">
      <DialogContent class="max-w-lg">
        <DialogTitle>Detalle del pedido</DialogTitle>

        <div v-if="detallePedido" class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <p class="text-muted-foreground">Cliente</p>
            <p class="font-medium">{{ detallePedido.cliente.nombre }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">N° Proforma</p>
            <p class="font-medium">{{ detallePedido.numeroProforma }}</p>
          </div>
          <div class="col-span-2">
            <p class="text-muted-foreground">Estado</p>
            <p class="font-medium">{{ ESTADO_PEDIDO_LABEL[detallePedido.estado] }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Recibido de almacén</p>
            <p class="font-medium">{{ formatFechaHora(detallePedido.recibidoEn) }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Inicio de preparación</p>
            <p class="font-medium">{{ formatFechaHora(detallePedido.inicioPreparacionEn) }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Fin de preparación</p>
            <p class="font-medium">{{ formatFechaHora(horaMostrable(detallePedido.preparadoEn)) }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Salió de almacén</p>
            <p class="font-medium">{{ formatFechaHora(detallePedido.salioEn) }}</p>
          </div>
          <div class="col-span-2">
            <p class="text-muted-foreground">Entregado</p>
            <p class="font-medium">{{ formatFechaHora(horaMostrable(detallePedido.entregadoEn)) }}</p>
          </div>
          <div class="col-span-2">
            <p class="text-muted-foreground">Observación</p>
            <p v-if="detallePedido.categoriaObservacion" class="font-medium">
              {{ CATEGORIA_OBSERVACION_LABEL[detallePedido.categoriaObservacion] }}
              <span v-if="detallePedido.detalleObservacion" class="font-normal text-muted-foreground">
                — {{ detallePedido.detalleObservacion }}
              </span>
            </p>
            <p v-else class="font-medium text-muted-foreground">Sin observación</p>
          </div>
          <div>
            <p class="text-muted-foreground">Creado por</p>
            <p class="font-medium">{{ detallePedido.creadoPor.nombre }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Última edición</p>
            <p class="font-medium">{{ detallePedido.ultimoEditadoPor?.nombre ?? "—" }}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="regenerarOpen">
      <DialogContent class="max-w-md">
        <DialogTitle>Regenerar enlace de seguimiento</DialogTitle>
        <p class="text-sm text-muted-foreground">
          Se va a crear un enlace nuevo para el pedido de
          <span class="font-medium text-foreground">{{ pedidoARegenerar?.cliente.nombre }}</span>
          (proforma {{ pedidoARegenerar?.numeroProforma }}). El enlace anterior dejará de funcionar de inmediato.
        </p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" :disabled="regenerando" @click="regenerarOpen = false">
            Cancelar
          </Button>
          <Button :disabled="regenerando" @click="confirmarRegenerar">
            <span
              v-if="regenerando"
              class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Regenerar
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="eliminarOpen">
      <DialogContent class="max-w-md">
        <DialogTitle>Eliminar pedido</DialogTitle>
        <p class="text-sm text-muted-foreground">
          ¿Seguro que quieres eliminar el pedido de
          <span class="font-medium text-foreground">{{ pedidoAEliminar?.cliente.nombre }}</span>
          (proforma {{ pedidoAEliminar?.numeroProforma }})? Esta acción no se puede deshacer.
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
