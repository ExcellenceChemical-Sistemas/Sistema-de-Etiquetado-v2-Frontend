<script setup lang="ts">
import { ref } from "vue";
import { Download, Pencil, Trash2 } from "@lucide/vue";
import { useClientesQuery, useDeleteCliente } from "~/composables/useClientes";
import { useClientesListado } from "~/composables/useClientesListado";
import { useXlsxExport, type XlsxColumn } from "~/composables/useCsvExport";
import ClientesFiltroBar from "~/components/clientes/ClientesFiltroBar.vue";
import ClienteForm from "~/components/clientes/ClienteForm.vue";
import Spinner from "~/components/ui/Spinner.vue";
import ProgressBar from "~/components/ui/ProgressBar.vue";
import { usePermiso } from "~/composables/usePermiso";
import { TIPO_DOCUMENTO_CLIENTE_LABEL, type Cliente } from "~/types/cliente";
import { toast } from "vue-sonner";

const permiso = usePermiso("PEDIDOS");

const { data: clientes, isPending, isFetching, isError, refetch } = useClientesQuery();

const { search, page, totalPages, filtrados, paginados, PAGE_SIZE } =
  useClientesListado(clientes);

const { progress, isExporting, exportar } = useXlsxExport();

const xlsxColumns: XlsxColumn<Cliente>[] = [
  { key: "nombre", label: "Nombre" },
  {
    key: (c: Cliente) => (c.tipoDocumento ? TIPO_DOCUMENTO_CLIENTE_LABEL[c.tipoDocumento] : ""),
    label: "Tipo de documento",
  },
  { key: (c: Cliente) => c.numeroDocumento ?? "", label: "N° de documento" },
  { key: (c: Cliente) => c.direccion ?? "", label: "Dirección" },
  { key: (c: Cliente) => c.celular ?? "", label: "Celular" },
];

function exportarXlsx() {
  // Exporta la lista filtrada (búsqueda), no solo la página visible
  exportar(
    filtrados.value,
    xlsxColumns,
    `clientes-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

const dialogOpen = ref(false);
const editando = ref<Cliente | null>(null);

function abrirCrear() {
  editando.value = null;
  dialogOpen.value = true;
}

function abrirEditar(cliente: Cliente) {
  editando.value = cliente;
  dialogOpen.value = true;
}

function onSuccess() {
  dialogOpen.value = false;
}

// --- Eliminar ---
const { mutateAsync: eliminarCliente, isPending: eliminando } = useDeleteCliente();
const eliminarOpen = ref(false);
const clienteAEliminar = ref<Cliente | null>(null);

function pedirEliminar(cliente: Cliente) {
  clienteAEliminar.value = cliente;
  eliminarOpen.value = true;
}

async function confirmarEliminar() {
  if (!clienteAEliminar.value) return;
  try {
    await eliminarCliente(clienteAEliminar.value.id);
    toast.success("Cliente eliminado");
    eliminarOpen.value = false;
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo eliminar el cliente");
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Clientes</h1>
        <p class="text-sm text-muted-foreground">
          Gestión de clientes registrados
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
        <Button v-if="permiso.puedeCrear" @click="abrirCrear">Nuevo cliente</Button>
      </div>
    </div>

    <ClientesFiltroBar
      v-model:search="search"
      :result-count="filtrados.length"
      class="shrink-0"
    />

    <ScrollArea class="min-h-0 flex-1 rounded-md border border-border">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead class="w-64">Dirección</TableHead>
            <TableHead>Celular</TableHead>
            <TableHead class="w-24 text-right">Acciones</TableHead>
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
                <p class="text-sm text-destructive mb-2">No se pudieron cargar los clientes</p>
                <Button variant="outline" size="sm" @click="refetch()">Reintentar</Button>
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="filtrados.length === 0">
            <TableRow>
              <TableCell colspan="5" class="text-center text-muted-foreground py-8">
                No hay clientes {{ search ? "que coincidan con la búsqueda" : "registrados" }}
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow v-for="c in paginados" :key="c.id">
              <TableCell class="max-w-48 truncate font-medium" :title="c.nombre">
                {{ c.nombre }}
              </TableCell>
              <TableCell>
                <span v-if="c.numeroDocumento">
                  {{ c.tipoDocumento ? TIPO_DOCUMENTO_CLIENTE_LABEL[c.tipoDocumento] : "" }}
                  {{ c.numeroDocumento }}
                </span>
                <span v-else class="text-muted-foreground">—</span>
              </TableCell>
              <TableCell class="max-w-64 truncate" :title="c.direccion ?? undefined">
                {{ c.direccion || "—" }}
              </TableCell>
              <TableCell>{{ c.celular || "—" }}</TableCell>
              <TableCell class="text-right">
                <Button
                  v-if="permiso.puedeEditar"
                  variant="ghost"
                  size="icon"
                  title="Editar"
                  @click="abrirEditar(c)"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button
                  v-if="permiso.puedeEliminar"
                  variant="ghost"
                  size="icon"
                  title="Eliminar"
                  @click="pedirEliminar(c)"
                >
                  <Trash2 class="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </ScrollArea>

    <div
      v-if="isFetching && !isPending"
      class="flex items-center gap-2 text-xs text-muted-foreground"
    >
      <Spinner class="h-3.5 w-3.5" />
      <span>Actualizando lista de clientes...</span>
    </div>

    <div
      v-if="!isPending && !isError && filtrados.length > 0"
      class="flex shrink-0 flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-muted-foreground">
        {{ filtrados.length }} cliente{{ filtrados.length === 1 ? "" : "s" }} ·
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
        <DialogTitle>{{ editando ? "Editar cliente" : "Nuevo cliente" }}</DialogTitle>
        <ClienteForm
          :key="dialogOpen ? (editando?.id ?? 'nuevo') : 'cerrado'"
          :cliente="editando"
          @success="onSuccess"
        />
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="eliminarOpen">
      <DialogContent class="max-w-md">
        <DialogTitle>Eliminar cliente</DialogTitle>
        <p class="text-sm text-muted-foreground">
          ¿Seguro que quieres eliminar a
          <span class="font-medium text-foreground">{{ clienteAEliminar?.nombre }}</span>?
          Esta acción no se puede deshacer.
        </p>
        <p class="text-xs text-muted-foreground">
          Si el cliente tiene pedidos registrados, no se podrá eliminar.
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
