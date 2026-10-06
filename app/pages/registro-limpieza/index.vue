<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ExternalLink, SprayCan } from "@lucide/vue";
import { REGISTRO_LIMPIEZA } from "~/config/registroLimpieza";
import { useRegistroLimpiezaQuery } from "~/composables/useRegistroLimpieza";
import { usePermiso } from "~/composables/usePermiso";
import Spinner from "~/components/ui/Spinner.vue";

const PAGE_SIZE = 10;

const permiso = usePermiso("REGISTRO_LIMPIEZA");

const hayForm = computed(() => !!REGISTRO_LIMPIEZA.formUrl);
const hayHistorial = computed(() => !!REGISTRO_LIMPIEZA.sheetCsvUrl);

const { data, isPending, isFetching, isError, refetch } = useRegistroLimpiezaQuery();

const page = ref(1);

const filas = computed(() => data.value?.filas ?? []);
const encabezados = computed(() => data.value?.encabezados ?? []);

const totalPages = computed(() => Math.max(1, Math.ceil(filas.value.length / PAGE_SIZE)));

// si la página queda fuera de rango (ej. al refrescar con menos filas), la corregimos sola
watch(totalPages, (tp) => {
  if (page.value > tp) page.value = tp;
});

const paginadas = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE;
  return filas.value.slice(start, start + PAGE_SIZE);
});
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div class="flex items-center gap-3">
        <div class="rounded-md bg-primary/10 p-2.5 shrink-0">
          <SprayCan class="h-5 w-5 text-primary" />
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Calidad
          </p>
          <h1 class="text-2xl font-semibold mt-1">Registro de limpieza</h1>
        </div>
      </div>
      <Button v-if="hayForm && permiso.puedeCrear" as-child>
        <a :href="REGISTRO_LIMPIEZA.formUrl" target="_blank" rel="noopener noreferrer">
          <ExternalLink class="h-4 w-4" />
          Nuevo registro
        </a>
      </Button>
    </div>

    <div
      v-if="!hayForm"
      class="shrink-0 rounded-lg border bg-card px-5 py-6 text-sm text-muted-foreground"
    >
      Todavía no está configurado el link del formulario.
      Completalo en <code class="text-xs">app/config/registroLimpieza.ts</code>.
    </div>

    <div
      v-if="!hayHistorial"
      class="shrink-0 rounded-lg border bg-card px-5 py-6 text-sm text-muted-foreground"
    >
      El historial todavía no está disponible: falta el link de la hoja de respuestas publicada.
      Completalo en <code class="text-xs">app/config/registroLimpieza.ts</code>.
    </div>

    <template v-else>
      <ScrollArea class="min-h-0 flex-1 rounded-md border border-border">
        <Table>
          <TableHeader class="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead
                v-for="(col, i) in encabezados"
                :key="i"
                class="whitespace-nowrap"
              >
                {{ col }}
              </TableHead>
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
                <TableCell :colspan="Math.max(encabezados.length, 1)" class="text-center py-8">
                  <p class="text-sm text-destructive mb-2">No se pudo cargar el historial</p>
                  <Button variant="outline" size="sm" @click="refetch()">Reintentar</Button>
                </TableCell>
              </TableRow>
            </template>
            <template v-else-if="filas.length === 0">
              <TableRow>
                <TableCell
                  :colspan="Math.max(encabezados.length, 1)"
                  class="text-center text-muted-foreground py-8"
                >
                  Todavía no hay registros
                </TableCell>
              </TableRow>
            </template>
            <template v-else>
              <TableRow v-for="(fila, i) in paginadas" :key="i">
                <TableCell v-for="(celda, j) in fila" :key="j" class="whitespace-nowrap">
                  {{ celda || "—" }}
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </Table>
      </ScrollArea>

      <div
        v-if="isFetching && !isPending"
        class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"
      >
        <Spinner class="h-3.5 w-3.5" />
        <span>Actualizando historial...</span>
      </div>

      <div
        v-if="!isPending && !isError && filas.length > 0"
        class="flex shrink-0 flex-wrap items-center justify-between gap-3"
      >
        <p class="text-sm text-muted-foreground">
          {{ filas.length }} registro{{ filas.length === 1 ? "" : "s" }} ·
          página {{ page }} de {{ totalPages }}
        </p>

        <Pagination
          v-model:page="page"
          :total="filas.length"
          :items-per-page="PAGE_SIZE"
          :sibling-count="1"
          show-edges
        >
          <PaginationContent v-slot="{ items }">
            <PaginationPrevious />
            <template v-for="(item, index) in items" :key="index">
              <PaginationItem v-if="item.type === 'page'" :value="item.value" as-child>
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
    </template>
  </div>
</template>