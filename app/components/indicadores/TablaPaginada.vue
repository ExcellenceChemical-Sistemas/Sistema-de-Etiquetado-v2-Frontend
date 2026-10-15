<script setup lang="ts" generic="T">
import { computed, ref, watch } from "vue";

// Tabla con paginación de shadcn para los listados de los indicadores (alertas, fuera de plazo,
// ciclo más lento…): esas listas crecen con cada cotización, así que se muestran de a pocas filas.
// El scroll horizontal sigue siendo el nativo/tematizado de <Table> (ver nota en ui/table/Table.vue:
// no se anida un ScrollArea ahí); el scroll vertical lo da el ScrollArea de la página.
const props = withDefaults(
  defineProps<{
    items: T[];
    pageSize?: number;
    etiqueta?: string; // "registro" | "cotización"… para el contador del pie
  }>(),
  { pageSize: 5, etiqueta: "registro" },
);

defineSlots<{
  header(): unknown;
  row(props: { item: T }): unknown;
}>();

const page = ref(1);

const totalPages = computed(() => Math.max(1, Math.ceil(props.items.length / props.pageSize)));

// Si la lista cambia de tamaño (filtro de mes/año), se vuelve a la primera página.
watch(
  () => props.items.length,
  () => {
    page.value = 1;
  },
);

const paginados = computed(() => {
  const desde = (page.value - 1) * props.pageSize;
  return props.items.slice(desde, desde + props.pageSize);
});

const desde = computed(() => (props.items.length ? (page.value - 1) * props.pageSize + 1 : 0));
const hasta = computed(() => Math.min(page.value * props.pageSize, props.items.length));
</script>

<template>
  <div>
    <Table>
      <TableHeader>
        <slot name="header" />
      </TableHeader>
      <TableBody>
        <template v-for="(item, i) in paginados" :key="(page - 1) * pageSize + i">
          <slot name="row" :item="item" />
        </template>
      </TableBody>
    </Table>

    <div
      v-if="items.length > pageSize"
      class="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3"
    >
      <p class="text-xs text-muted-foreground">
        {{ desde }}–{{ hasta }} de {{ items.length }} {{ etiqueta }}{{ items.length === 1 ? "" : "s" }}
      </p>

      <Pagination
        v-model:page="page"
        :total="items.length"
        :items-per-page="pageSize"
        :sibling-count="1"
        show-edges
        class="mx-0 w-auto"
      >
        <PaginationContent v-slot="{ items: paginas }">
          <PaginationPrevious />
          <template v-for="(item, index) in paginas" :key="index">
            <PaginationItem v-if="item.type === 'page'" :value="item.value" as-child>
              <Button class="h-9 w-9 p-0" :variant="item.value === page ? 'default' : 'outline'">
                {{ item.value }}
              </Button>
            </PaginationItem>
            <PaginationEllipsis v-else :index="index" />
          </template>
          <PaginationNext />
        </PaginationContent>
      </Pagination>
    </div>
  </div>
</template>