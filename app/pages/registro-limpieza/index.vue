<script setup lang="ts">
import { ExternalLink, SprayCan } from "lucide-vue-next";
import { REGISTRO_LIMPIEZA } from "~/config/registroLimpieza";
import { useRegistroLimpiezaQuery } from "~/composables/useRegistroLimpieza";

const configurado = computed(() => !!REGISTRO_LIMPIEZA.formUrl && !!REGISTRO_LIMPIEZA.sheetCsvUrl);

const { data, isPending, isError, refetch } = useRegistroLimpiezaQuery();
</script>

<template>
  <div class="p-6 space-y-6 max-w-5xl">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
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
      <Button v-if="configurado" as-child>
        <a :href="REGISTRO_LIMPIEZA.formUrl" target="_blank" rel="noopener noreferrer">
          <ExternalLink class="h-4 w-4" />
          Nuevo registro
        </a>
      </Button>
    </div>

    <div v-if="!configurado" class="rounded-lg border bg-card px-5 py-6 text-sm text-muted-foreground">
      Todavía no está configurado el link del formulario ni el de la hoja de respuestas.
      Completalos en <code class="text-xs">app/config/registroLimpieza.ts</code>.
    </div>

    <template v-else>
      <p v-if="isError" class="text-sm text-destructive">
        No se pudo cargar el historial.
        <button type="button" class="underline" @click="refetch()">Reintentar</button>
      </p>

      <div v-else-if="isPending" class="space-y-2">
        <Skeleton v-for="n in 4" :key="n" class="h-10 w-full" />
      </div>

      <p v-else-if="data!.filas.length === 0" class="px-5 py-6 text-sm text-muted-foreground">
        Todavía no hay registros.
      </p>

      <div v-else class="rounded-lg border bg-card overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/40">
              <th
                v-for="(col, i) in data!.encabezados"
                :key="i"
                class="px-4 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
              >
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="(fila, i) in data!.filas" :key="i">
              <td v-for="(celda, j) in fila" :key="j" class="px-4 py-2 whitespace-nowrap">
                {{ celda }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
