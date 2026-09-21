<script setup lang="ts">
import { ref } from "vue";
import { Download, FileText, FileX, ExternalLink, Pencil, Eye, Trash2 } from "@lucide/vue";
import { useLotes, useVerCoa, useDeleteLote } from "~/composables/useLotes";
import { useLotesListado } from "~/composables/useloteslistado";
import {
  useXlsxExport,
  type XlsxColumn,
  FILL_GREEN,
  FILL_AMBER,
  FILL_RED,
} from "~/composables/useCsvExport";
import { estadoVencimiento } from "~/utils/fechavencimiento";
import LoteForm from "~/components/lotes/LoteForm.vue";
import LotesFiltroBar from "~/components/lotes/Lotesfiltrobar.vue";
import VencimientoBadge from "~/components/lotes/Vencimientobadge.vue";
import Spinner from "~/components/ui/Spinner.vue";
import ProgressBar from "~/components/ui/ProgressBar.vue";
import { toast } from "vue-sonner";
import type { Lote } from "~/types/lote";
import { usePermiso } from "~/composables/usePermiso";

const permiso = usePermiso("LOTES");

const { data: lotes, isPending, isFetching, isError, refetch } = useLotes();

const {
  search,
  vencimientoFilter,
  page,
  fechaDesde,
  fechaHasta,
  totalPages,
  filtrados,
  paginados,
  PAGE_SIZE,
} = useLotesListado(lotes);

const { progress, isExporting, exportar } = useXlsxExport();

function estadoLabel(l: Lote): string {
  const estado = estadoVencimiento(l.fechaVencimiento);
  if (estado === "vencido") return "Vencido";
  if (estado === "porVencer") return "Por vencer";
  return "Vigente";
}

// Ajustá el formato si tu proyecto ya tiene un helper de fechas propio
function formatFecha(fecha?: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const xlsxColumns: XlsxColumn<Lote>[] = [
  { key: (l: Lote) => l.producto?.nombre ?? "", label: "Producto" },
  { key: "numeroLote", label: "N° Lote" },
  { key: (l: Lote) => l.fabricante?.nombre ?? "", label: "Fabricante" },
  {
    key: (l: Lote) => formatFecha(l.fechaFabricacion),
    label: "Fecha de fabricación",
  },
  { key: "fechaVencimiento", label: "Vencimiento" },
  {
    key: (l: Lote) => estadoLabel(l),
    label: "Estado",
    colorFill: (valor) => {
      if (valor === "Vencido") return FILL_RED;
      if (valor === "Por vencer") return FILL_AMBER;
      return FILL_GREEN;
    },
  },
];

function exportarXlsx() {
  // Exporta la lista filtrada (búsqueda + filtro de vencimiento), no solo la página visible
  exportar(
    filtrados.value,
    xlsxColumns,
    `lotes-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

const dialogOpen = ref(false);
const editando = ref<Lote | null>(null);

function abrirCrear() {
  editando.value = null;
  dialogOpen.value = true;
}

function abrirEditar(lote: Lote) {
  editando.value = lote;
  dialogOpen.value = true;
}

// --- Ver detalle ---
// Cualquiera con puedeVer en LOTES ya llega a esta página (lo exige el
// middleware de permisos), así que el detalle usa el mismo permiso: si ve
// la tabla, ve el detalle.
const detalleOpen = ref(false);
const detalleLote = ref<Lote | null>(null);

function abrirDetalle(lote: Lote) {
  detalleLote.value = lote;
  detalleOpen.value = true;
}

// --- Eliminar ---
const { mutateAsync: eliminarLote, isPending: eliminando } = useDeleteLote();
const eliminarOpen = ref(false);
const loteAEliminar = ref<Lote | null>(null);

function pedirEliminar(lote: Lote) {
  loteAEliminar.value = lote;
  eliminarOpen.value = true;
}

async function confirmarEliminar() {
  if (!loteAEliminar.value) return;
  try {
    await eliminarLote(loteAEliminar.value.id);
    toast.success("Lote eliminado");
    eliminarOpen.value = false;
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo eliminar el lote");
  }
}

function onSuccess() {
  dialogOpen.value = false;
}

// --- Previsualización de COA ---
const { mutateAsync: obtenerCoaUrl, isPending: cargandoCoa } = useVerCoa();
const coaDialogOpen = ref(false);
const coaPreviewUrl = ref<string | null>(null);

async function abrirCoa(lote: Lote) {
  if (!lote.coaUrl) return;
  coaPreviewUrl.value = null;
  coaDialogOpen.value = true;
  try {
    coaPreviewUrl.value = await obtenerCoaUrl(lote.id);
  } catch {
    toast.error("No se pudo cargar el COA");
    coaDialogOpen.value = false;
  }
}

function abrirCoaEnPestana() {
  if (coaPreviewUrl.value) {
    window.open(coaPreviewUrl.value, "_blank");
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Lotes</h1>
        <p class="text-sm text-muted-foreground">
          Gestión de lotes registrados
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          :disabled="isExporting || filtrados.length === 0"
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
        <Button v-if="permiso.puedeCrear" @click="abrirCrear"
          >Nuevo lote</Button
        >
      </div>
    </div>

    <LotesFiltroBar
      v-model:search="search"
      v-model:vencimiento-filter="vencimientoFilter"
      v-model:fecha-desde="fechaDesde"
      v-model:fecha-hasta="fechaHasta"
      :result-count="filtrados.length"
      class="shrink-0"
    />

    <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Lote</TableHead>
            <TableHead>Fabricante</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead class="w-16 text-center">COA</TableHead>
            <TableHead class="w-32 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isPending">
            <TableRow v-for="i in 4" :key="i">
              <TableCell><Skeleton class="h-4 w-40" /></TableCell>
              <TableCell><Skeleton class="h-4 w-24" /></TableCell>
              <TableCell><Skeleton class="h-4 w-32" /></TableCell>
              <TableCell><Skeleton class="h-4 w-20" /></TableCell>
              <TableCell class="text-center"
                ><Skeleton class="h-4 w-6 mx-auto"
              /></TableCell>
              <TableCell class="text-right"
                ><Skeleton class="h-4 w-12 ml-auto"
              /></TableCell>
            </TableRow>
          </template>
          <template v-else-if="isError">
            <TableRow>
              <TableCell colspan="6" class="text-center py-8">
                <p class="text-sm text-destructive mb-2">
                  No se pudieron cargar los lotes
                </p>
                <Button variant="outline" size="sm" @click="refetch()"
                  >Reintentar</Button
                >
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="filtrados.length === 0">
            <TableRow>
              <TableCell
                colspan="6"
                class="text-center text-muted-foreground py-8"
              >
                No hay lotes
                {{
                  search ||
                  vencimientoFilter !== "todos" ||
                  fechaDesde ||
                  fechaHasta
                    ? "que coincidan con el filtro"
                    : "registrados"
                }}
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow v-for="l in paginados" :key="l.id">
              <TableCell>{{ l.producto?.nombre }}</TableCell>
              <TableCell>{{ l.numeroLote }}</TableCell>
              <TableCell>{{ l.fabricante?.nombre }}</TableCell>
              <TableCell>
                <VencimientoBadge :fecha="l.fechaVencimiento" />
              </TableCell>
              <TableCell class="text-center">
                <button
                  v-if="l.coaUrl"
                  type="button"
                  class="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  title="Ver COA"
                  @click="abrirCoa(l)"
                >
                  <FileText class="h-4 w-4" />
                </button>
                <span
                  v-else
                  class="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground/40"
                  title="Sin COA"
                >
                  <FileX class="h-4 w-4" />
                </span>
              </TableCell>
              <TableCell class="text-right">
                <Button
                  v-if="permiso.puedeVer"
                  variant="ghost"
                  size="icon"
                  title="Ver detalle"
                  @click="abrirDetalle(l)"
                >
                  <Eye class="h-4 w-4" />
                </Button>
                <Button
                  v-if="permiso.puedeEditar"
                  variant="ghost"
                  size="icon"
                  title="Editar"
                  @click="abrirEditar(l)"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button
                  v-if="permiso.puedeEliminar"
                  variant="ghost"
                  size="icon"
                  title="Eliminar"
                  @click="pedirEliminar(l)"
                >
                  <Trash2 class="h-4 w-4 text-destructive" />
                </Button>
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
      <span>Actualizando lista de lotes...</span>
    </div>

    <div
      v-if="!isPending && !isError && filtrados.length > 0"
      class="flex shrink-0 flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-muted-foreground">
        {{ filtrados.length }} lote{{ filtrados.length === 1 ? "" : "s" }} ·
        página {{ page }} de {{ totalPages }}
      </p>

      <Pagination
        v-model:page="page"
        :total="filtrados.length"
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
        <DialogTitle>{{ editando ? "Editar lote" : "Nuevo lote" }}</DialogTitle>
        <LoteForm
          :key="dialogOpen ? (editando?.id ?? 'nuevo') : 'cerrado'"
          :lote="editando"
          @success="onSuccess"
        />
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="eliminarOpen">
      <DialogContent class="max-w-md">
        <DialogTitle>Eliminar lote</DialogTitle>
        <p class="text-sm text-muted-foreground">
          ¿Seguro que quieres eliminar el lote
          <span class="font-medium text-foreground">{{ loteAEliminar?.numeroLote }}</span>
          de {{ loteAEliminar?.producto?.nombre }}? Esta acción no se puede deshacer.
        </p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" :disabled="eliminando" @click="eliminarOpen = false">
            Cancelar
          </Button>
          <Button variant="destructive" :disabled="eliminando" @click="confirmarEliminar">
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="detalleOpen">
      <DialogContent class="max-w-lg">
        <DialogTitle>Detalle del lote</DialogTitle>

        <div v-if="detalleLote" class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <p class="text-muted-foreground">Producto</p>
            <p class="font-medium">{{ detalleLote.producto?.nombre ?? "—" }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">N° Lote</p>
            <p class="font-medium">{{ detalleLote.numeroLote }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Fabricante</p>
            <p class="font-medium">{{ detalleLote.fabricante?.nombre ?? "—" }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Estado</p>
            <VencimientoBadge :fecha="detalleLote.fechaVencimiento" />
          </div>
          <div>
            <p class="text-muted-foreground">Fecha de fabricación</p>
            <p class="font-medium">{{ detalleLote.fechaFabricacion }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Fecha de vencimiento</p>
            <p class="font-medium">{{ detalleLote.fechaVencimiento }}</p>
          </div>
          <div v-if="detalleLote.fechaVencimientoOrden" class="col-span-2">
            <p class="text-muted-foreground">Vencimiento (orden interno)</p>
            <p class="font-medium">{{ formatFecha(detalleLote.fechaVencimientoOrden) }}</p>
          </div>
          <div class="col-span-2">
            <p class="text-muted-foreground">COA</p>
            <button
              v-if="detalleLote.coaUrl"
              type="button"
              class="mt-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-secondary"
              @click="abrirCoa(detalleLote)"
            >
              <FileText class="h-4 w-4" />
              Ver COA
            </button>
            <p v-else class="font-medium text-muted-foreground/70">Sin COA</p>
          </div>
          <div>
            <p class="text-muted-foreground">Creado</p>
            <p class="font-medium">{{ formatFecha(detalleLote.createdAt) }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Última actualización</p>
            <p class="font-medium">{{ formatFecha(detalleLote.updatedAt) }}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="coaDialogOpen">
      <DialogContent class="max-w-3xl">
        <DialogTitle class="flex items-center justify-between gap-2 pr-6">
          <span>Certificado de análisis</span>
          <Button
            v-if="coaPreviewUrl"
            variant="outline"
            size="sm"
            @click="abrirCoaEnPestana"
          >
            <ExternalLink class="h-4 w-4 mr-2" />
            Abrir en nueva pestaña
          </Button>
        </DialogTitle>

        <div class="h-[75vh] w-full">
          <div
            v-if="cargandoCoa || !coaPreviewUrl"
            class="flex h-full items-center justify-center"
          >
            <Spinner class="h-6 w-6" />
          </div>
          <iframe
            v-else
            :src="coaPreviewUrl"
            class="h-full w-full rounded-md border border-border"
          />
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>