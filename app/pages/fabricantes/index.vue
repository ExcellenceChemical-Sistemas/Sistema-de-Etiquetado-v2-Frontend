<script setup lang="ts">
import { ref } from "vue";
import { Download, Pencil } from "@lucide/vue";
import type { Fabricante } from "~/types/fabricante";
import { useFabricantesListado } from "~/composables/useFabricantesListado";
import { useXlsxExport, type XlsxColumn } from "~/composables/useCsvExport";
import FabricantesFiltroBar from "~/components/fabricantes/FabricantesFiltroBar.vue";
import Spinner from "~/components/ui/Spinner.vue";
import ProgressBar from "~/components/ui/ProgressBar.vue";
import { usePermiso } from "~/composables/usePermiso";

const permiso = usePermiso("FABRICANTES");

const {
  data: fabricantes,
  isPending,
  isFetching,
  isError,
  refetch,
} = useFabricantesQuery();

const { search, page, totalPages, filtrados, paginados, PAGE_SIZE } =
  useFabricantesListado(fabricantes);

const { progress, isExporting, exportar } = useXlsxExport();

function fechaAlta(f: Fabricante): string {
  return new Date(f.createdAt).toLocaleDateString("es-PE");
}

const xlsxColumns: XlsxColumn<Fabricante>[] = [
  { key: "nombre", label: "Nombre" },
  { key: (f: Fabricante) => fechaAlta(f), label: "Fecha de alta" },
];

function exportarXlsx() {
  // Exporta la lista filtrada (búsqueda), no solo la página visible
  exportar(
    filtrados.value,
    xlsxColumns,
    `fabricantes-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

const dialogOpen = ref(false);
const editingFabricante = ref<Fabricante | null>(null);

function openCreate() {
  editingFabricante.value = null;
  dialogOpen.value = true;
}

function openEdit(f: Fabricante) {
  editingFabricante.value = f;
  dialogOpen.value = true;
}

function onFormSuccess() {
  dialogOpen.value = false;
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Fabricantes</h1>
        <p class="text-sm text-muted-foreground">
          Gestión de fabricantes registrados
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
        <Button v-if="permiso.puedeCrear" @click="openCreate">Nuevo fabricante</Button>
      </div>
    </div>

    <FabricantesFiltroBar
      v-model:search="search"
      :result-count="filtrados.length"
      class="shrink-0"
    />

    <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead class="w-24 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isPending">
            <TableRow v-for="i in 4" :key="i">
              <TableCell><Skeleton class="h-4 w-48" /></TableCell>
              <TableCell class="text-right"
                ><Skeleton class="h-4 w-12 ml-auto"
              /></TableCell>
            </TableRow>
          </template>
          <template v-else-if="isError">
            <TableRow>
              <TableCell colspan="2" class="text-center py-8">
                <p class="text-sm text-destructive mb-2">
                  No se pudieron cargar los fabricantes
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
                colspan="2"
                class="text-center text-muted-foreground py-8"
              >
                No hay fabricantes
                {{ search ? "que coincidan con la búsqueda" : "registrados" }}
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow v-for="f in paginados" :key="f.id">
              <TableCell>{{ f.nombre }}</TableCell>
              <TableCell class="text-right">
                <Button
                  v-if="permiso.puedeEditar"
                 variant="ghost"
                  size="icon"
                  title="Editar"
                  @click="openEdit(f)"
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
      <span>Actualizando lista de fabricantes...</span>
    </div>

    <div
      v-if="!isPending && !isError && filtrados.length > 0"
      class="flex shrink-0 flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-muted-foreground">
        {{ filtrados.length }} fabricante{{
          filtrados.length === 1 ? "" : "s"
        }}
        · página {{ page }} de {{ totalPages }}
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
        <DialogHeader>
          <DialogTitle>
            {{ editingFabricante ? "Editar fabricante" : "Nuevo fabricante" }}
          </DialogTitle>
        </DialogHeader>
        <FabricantesFabricanteForm
          :key="editingFabricante?.id ?? 'new'"
          :fabricante="editingFabricante"
          @success="onFormSuccess"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>
