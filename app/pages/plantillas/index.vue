<script setup lang="ts">
import { ref } from "vue";
import { Pencil, Trash2 } from "@lucide/vue";
import {
  usePlantillasQuery,
  useUpdatePlantilla,
  useDeletePlantilla,
} from "~/composables/usePlantillas";
import { usePlantillasListado } from "~/composables/usePlantillasListado";
import PlantillasFiltroBar from "~/components/plantillas/PlantillasFiltroBar.vue";
import PlantillaForm from "~/components/plantillas/PlantillaForm.vue";
import Spinner from "~/components/ui/Spinner.vue";
import { usePermiso } from "~/composables/usePermiso";
import type { Plantilla } from "~/types/plantilla";
import { toast } from "vue-sonner";

const permiso = usePermiso("PLANTILLAS");

const { data: plantillas, isPending, isFetching, isError, refetch } = usePlantillasQuery();

const { search, page, totalPages, filtrados, paginados, PAGE_SIZE } =
  usePlantillasListado(plantillas);

const dialogOpen = ref(false);
const editando = ref<Plantilla | null>(null);

function abrirCrear() {
  editando.value = null;
  dialogOpen.value = true;
}

function abrirEditar(plantilla: Plantilla) {
  editando.value = plantilla;
  dialogOpen.value = true;
}

function onSuccess() {
  dialogOpen.value = false;
}

// --- Activar / desactivar ---
const { mutateAsync: actualizarPlantilla, isPending: actualizando } = useUpdatePlantilla();
const alternandoId = ref<number | null>(null);

async function alternarActiva(plantilla: Plantilla) {
  alternandoId.value = plantilla.id;
  try {
    await actualizarPlantilla({ id: plantilla.id, input: { activa: !plantilla.activa } });
    toast.success(plantilla.activa ? "Plantilla desactivada" : "Plantilla activada");
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo actualizar la plantilla");
  } finally {
    alternandoId.value = null;
  }
}

// --- Eliminar ---
const { mutateAsync: eliminarPlantilla, isPending: eliminando } = useDeletePlantilla();
const eliminarOpen = ref(false);
const plantillaAEliminar = ref<Plantilla | null>(null);

function pedirEliminar(plantilla: Plantilla) {
  plantillaAEliminar.value = plantilla;
  eliminarOpen.value = true;
}

async function confirmarEliminar() {
  if (!plantillaAEliminar.value) return;
  try {
    await eliminarPlantilla(plantillaAEliminar.value.id);
    toast.success("Plantilla eliminada");
    eliminarOpen.value = false;
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo eliminar la plantilla");
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Plantillas</h1>
        <p class="text-sm text-muted-foreground">
          Diseños de etiqueta disponibles al generar una etiqueta
        </p>
      </div>
      <Button v-if="permiso.puedeCrear" @click="abrirCrear">Nueva plantilla</Button>
    </div>

    <PlantillasFiltroBar
      v-model:search="search"
      :result-count="filtrados.length"
      class="shrink-0"
    />

    <ScrollArea class="min-h-0 flex-1 rounded-md border border-border">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Archivo</TableHead>
            <TableHead class="w-28">Estado</TableHead>
            <TableHead class="w-32 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isPending">
            <TableRow v-for="i in 4" :key="i">
              <TableCell v-for="j in 4" :key="j"><Skeleton class="h-4 w-full" /></TableCell>
            </TableRow>
          </template>
          <template v-else-if="isError">
            <TableRow>
              <TableCell colspan="4" class="text-center py-8">
                <p class="text-sm text-destructive mb-2">No se pudieron cargar las plantillas</p>
                <Button variant="outline" size="sm" @click="refetch()">Reintentar</Button>
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="filtrados.length === 0">
            <TableRow>
              <TableCell colspan="4" class="text-center text-muted-foreground py-8">
                No hay plantillas {{ search ? "que coincidan con la búsqueda" : "registradas" }}
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow v-for="p in paginados" :key="p.id">
              <TableCell class="max-w-64 truncate font-medium" :title="p.nombre">
                {{ p.nombre }}
              </TableCell>
              <TableCell class="max-w-64 truncate font-mono text-xs" :title="p.archivo">
                {{ p.archivo }}
              </TableCell>
              <TableCell>
                <button
                  v-if="permiso.puedeEditar"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-60"
                  :class="p.activa
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'"
                  :disabled="actualizando && alternandoId === p.id"
                  @click="alternarActiva(p)"
                >
                  <Spinner v-if="actualizando && alternandoId === p.id" class="h-3 w-3" />
                  {{ p.activa ? "Activa" : "Inactiva" }}
                </button>
                <span
                  v-else
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="p.activa
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground'"
                >
                  {{ p.activa ? "Activa" : "Inactiva" }}
                </span>
              </TableCell>
              <TableCell class="text-right">
                <Button
                  v-if="permiso.puedeEditar"
                  variant="ghost"
                  size="icon"
                  title="Editar" aria-label="Editar"
                  @click="abrirEditar(p)"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button
                  v-if="permiso.puedeEliminar"
                  variant="ghost"
                  size="icon"
                  title="Eliminar" aria-label="Eliminar"
                  @click="pedirEliminar(p)"
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
      <span>Actualizando lista de plantillas...</span>
    </div>

    <div
      v-if="!isPending && !isError && filtrados.length > 0"
      class="flex shrink-0 flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-muted-foreground">
        {{ filtrados.length }} plantilla{{ filtrados.length === 1 ? "" : "s" }} ·
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
        <DialogTitle>{{ editando ? "Editar plantilla" : "Nueva plantilla" }}</DialogTitle>
        <PlantillaForm
          :key="dialogOpen ? (editando?.id ?? 'nuevo') : 'cerrado'"
          :plantilla="editando"
          @success="onSuccess"
        />
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="eliminarOpen">
      <DialogContent class="max-w-md">
        <DialogTitle>Eliminar plantilla</DialogTitle>
        <p class="text-sm text-muted-foreground">
          ¿Seguro que quieres eliminar
          <span class="font-medium text-foreground">{{ plantillaAEliminar?.nombre }}</span>?
          Esta acción no se puede deshacer.
        </p>
        <p class="text-xs text-muted-foreground">
          Si la plantilla tiene trabajos de impresión asociados, no se podrá eliminar.
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
