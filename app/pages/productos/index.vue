<script setup lang="ts">
import { ref } from "vue";
import { useProductos, useVerFichaSeguridad } from "~/composables/useProductos";
import { useProductosListado } from "~/composables/useProductosListado";
import { useXlsxExport, type XlsxColumn } from "~/composables/useCsvExport";
import ProductoForm from "~/components/productos/ProductoForm.vue";
import NfpaBadge from "~/components/productos/NfpaBadge.vue";
import ProductosFiltroBar from "~/components/productos/ProductosFiltroBar.vue";
import Spinner from "~/components/ui/Spinner.vue";
import ProgressBar from "~/components/ui/ProgressBar.vue";
import type { Producto } from "~/types/producto";
import {
  Download,
  Pencil,
  Eye,
  FileText,
  FileX,
  ExternalLink,
} from "@lucide/vue";
import { toast } from "vue-sonner";
import { usePermiso } from "~/composables/usePermiso";

const permiso = usePermiso("PRODUCTOS");

const {
  data: productos,
  isPending,
  isFetching,
  isError,
  refetch,
} = useProductos();

const {
  search,
  nfpaFilter,
  page,
  totalPages,
  filtrados,
  paginados,
  PAGE_SIZE,
} = useProductosListado(productos);

const { progress, isExporting, exportar } = useXlsxExport();
function estadoRombo(p: Producto): string {
  return p.nfpaSalud == null &&
    p.nfpaInflamabilidad == null &&
    p.nfpaReactividad == null
    ? "Sin rombo"
    : "Con rombo";
}

const xlsxColumns: XlsxColumn<Producto>[] = [
  { key: "nombre", label: "Nombre" },
  { key: (p: Producto) => p.nfpaSalud ?? "", label: "NFPA Salud" },
  {
    key: (p: Producto) => p.nfpaInflamabilidad ?? "",
    label: "NFPA Inflamabilidad",
  },
  { key: (p: Producto) => p.nfpaReactividad ?? "", label: "NFPA Reactividad" },
  { key: (p: Producto) => estadoRombo(p), label: "Estado rombo" },
  {
    key: (p: Producto) => (p.fichaSeguridadUrl ? "Sí" : "No"),
    label: "Ficha de seguridad",
  },
];

function exportarCsv() {
  exportar(
    filtrados.value,
    xlsxColumns,
    `productos-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

const dialogOpen = ref(false);
const editando = ref<Producto | null>(null);

function abrirCrear() {
  editando.value = null;
  dialogOpen.value = true;
}

function abrirEditar(producto: Producto) {
  editando.value = producto;
  dialogOpen.value = true;
}

function onSuccess() {
  dialogOpen.value = false;
}

// --- Ver detalle ---
// Cualquiera con puedeVer en PRODUCTOS ya llega a esta página (lo exige el
// middleware de permisos), así que el detalle usa el mismo permiso: si ve
// la tabla, ve el detalle.
const detalleOpen = ref(false);
const detalleProducto = ref<Producto | null>(null);

function abrirDetalle(producto: Producto) {
  detalleProducto.value = producto;
  detalleOpen.value = true;
}

function formatFecha(fecha?: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// --- Ficha de seguridad ---
// La signed URL vence a los 5 minutos, así que se pide recién al hacer clic,
// nunca al renderizar la lista.
const { mutateAsync: obtenerFichaUrl, isPending: cargandoFicha } =
  useVerFichaSeguridad();
const fichaDialogOpen = ref(false);
const fichaPreviewUrl = ref<string | null>(null);
const fichaProducto = ref<Producto | null>(null);

async function abrirFicha(producto: Producto) {
  if (!producto.fichaSeguridadUrl) return;
  fichaProducto.value = producto;
  fichaPreviewUrl.value = null;
  fichaDialogOpen.value = true;
  try {
    fichaPreviewUrl.value = await obtenerFichaUrl(producto.id);
  } catch {
    toast.error("No se pudo cargar la ficha de seguridad");
    fichaDialogOpen.value = false;
  }
}

function abrirFichaEnPestana() {
  if (fichaPreviewUrl.value) {
    window.open(fichaPreviewUrl.value, "_blank");
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Productos</h1>
        <p class="text-sm text-muted-foreground">
          Gestión de productos registrados
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          :disabled="isExporting || filtrados.length === 0"
          class="min-w-[168px] justify-center"
          @click="exportarCsv"
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
        <Button v-if="permiso.puedeCrear" @click="abrirCrear">Nuevo producto</Button>
      </div>
    </div>

    <ProductosFiltroBar
      v-model:search="search"
      v-model:nfpa-filter="nfpaFilter"
      :result-count="filtrados.length"
      class="shrink-0"
    />
    <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>NFPA</TableHead>
            <TableHead class="w-24 text-center">Ficha</TableHead>
            <TableHead class="w-24 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isPending">
            <TableRow v-for="i in 4" :key="i">
              <TableCell><Skeleton class="h-4 w-48" /></TableCell>
              <TableCell><Skeleton class="h-4 w-16" /></TableCell>
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
              <TableCell colspan="4" class="text-center py-8">
                <p class="text-sm text-destructive mb-2">
                  No se pudieron cargar los productos
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
                colspan="4"
                class="text-center text-muted-foreground py-8"
              >
                No hay productos
                {{
                  search || nfpaFilter !== "todos"
                    ? "que coincidan con el filtro"
                    : "registrados"
                }}
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow v-for="p in paginados" :key="p.id">
              <TableCell>{{ p.nombre }}</TableCell>
              <TableCell>
                <NfpaBadge
                  :nfpa-salud="p.nfpaSalud"
                  :nfpa-inflamabilidad="p.nfpaInflamabilidad"
                  :nfpa-reactividad="p.nfpaReactividad"
                />
              </TableCell>
              <TableCell class="text-center">
                <button
                  v-if="p.fichaSeguridadUrl && permiso.puedeVer"
                  type="button"
                  class="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  title="Ver ficha de seguridad"
                  @click="abrirFicha(p)"
                >
                  <FileText class="h-4 w-4" />
                </button>
                <span
                  v-else
                  class="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground/40"
                  title="Sin ficha de seguridad"
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
                  @click="abrirDetalle(p)"
                >
                  <Eye class="h-4 w-4" />
                </Button>
                <Button
                  v-if="permiso.puedeEditar"
                  variant="ghost"
                  size="icon"
                  title="Editar"
                  @click="abrirEditar(p)"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
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
      <span>Actualizando lista de productos...</span>
    </div>

    <div
      v-if="!isPending && !isError && filtrados.length > 0"
      class="flex shrink-0 flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-muted-foreground">
        {{ filtrados.length }} producto{{ filtrados.length === 1 ? "" : "s" }} ·
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
      <DialogContent class="max-h-[90vh] overflow-y-auto">
        <DialogTitle>{{
          editando ? "Editar producto" : "Nuevo producto"
        }}</DialogTitle>
        <ProductoForm :producto="editando" @success="onSuccess" />
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="detalleOpen">
      <DialogContent class="max-w-lg">
        <DialogTitle>Detalle del producto</DialogTitle>

        <div
          v-if="detalleProducto"
          class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm"
        >
          <div class="col-span-2">
            <p class="text-muted-foreground">Nombre</p>
            <p class="font-medium">{{ detalleProducto.nombre }}</p>
          </div>
          <div class="col-span-2">
            <p class="text-muted-foreground">Rombo NFPA 704</p>
            <NfpaBadge
              class="mt-1"
              :nfpa-salud="detalleProducto.nfpaSalud"
              :nfpa-inflamabilidad="detalleProducto.nfpaInflamabilidad"
              :nfpa-reactividad="detalleProducto.nfpaReactividad"
            />
          </div>
          <div class="col-span-2">
            <p class="text-muted-foreground">Ficha de seguridad</p>
            <button
              v-if="detalleProducto.fichaSeguridadUrl && permiso.puedeVer"
              type="button"
              class="mt-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-secondary"
              @click="abrirFicha(detalleProducto)"
            >
              <FileText class="h-4 w-4" />
              Ver ficha de seguridad
            </button>
            <p v-else class="font-medium text-muted-foreground/70">
              Sin ficha de seguridad
            </p>
          </div>
          <div>
            <p class="text-muted-foreground">Creado</p>
            <p class="font-medium">
              {{ formatFecha(detalleProducto.createdAt) }}
            </p>
          </div>
          <div>
            <p class="text-muted-foreground">Última actualización</p>
            <p class="font-medium">
              {{ formatFecha(detalleProducto.updatedAt) }}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="fichaDialogOpen">
      <DialogContent class="max-w-3xl overflow-hidden">
        <DialogTitle class="flex min-w-0 items-center justify-between gap-2 pr-6">
          <span class="min-w-0 truncate">
            Ficha de seguridad · {{ fichaProducto?.nombre }}
          </span>
          <Button
            v-if="fichaPreviewUrl"
            variant="outline"
            size="sm"
            class="shrink-0"
            @click="abrirFichaEnPestana"
          >
            <ExternalLink class="h-4 w-4 mr-2" />
            Abrir en nueva pestaña
          </Button>
        </DialogTitle>

        <div class="h-[75vh] w-full min-w-0">
          <div
            v-if="cargandoFicha || !fichaPreviewUrl"
            class="flex h-full items-center justify-center"
          >
            <Spinner class="h-6 w-6" />
          </div>
          <iframe
            v-else
            :src="fichaPreviewUrl"
            class="h-full w-full rounded-md border border-border"
          />
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
