<script setup lang="ts">
import { ref, computed } from "vue";
import { Inbox, Search, Trash2, CheckCircle2, Clock } from "@lucide/vue";
import {
  useCotizacionesQuery,
  useMarcarCotizacionEnviada,
  useDeleteCotizacion,
} from "~/composables/useCotizaciones";
import { usePermiso } from "~/composables/usePermiso";
import { formatFechaHora, formatFechaHoraCorta } from "~/utils/fechaHora";
import { toast } from "vue-sonner";
import { ESTADO_COTIZACION_LABEL, type Cotizacion, type EstadoCotizacion } from "~/types/cotizacion";
import CotizacionForm from "~/components/cotizaciones/CotizacionForm.vue";

const permiso = usePermiso("PEDIDOS");

const filtroEstado = ref<EstadoCotizacion | "TODOS">("PENDIENTE_ENVIO");
const { data: cotizaciones, isPending, isError, refetch } = useCotizacionesQuery(filtroEstado);

const busqueda = ref("");
const cotizacionesFiltradas = computed(() => {
  let lista = cotizaciones.value ?? [];
  const q = busqueda.value.trim().toLowerCase();
  if (q) {
    lista = lista.filter(
      (c) => c.cliente.nombre.toLowerCase().includes(q) || c.numeroProforma.toLowerCase().includes(q),
    );
  }
  return lista;
});

const TABS: { value: EstadoCotizacion | "TODOS"; label: string }[] = [
  { value: "PENDIENTE_ENVIO", label: "Falta enviar" },
  { value: "ENVIADO", label: "Enviadas" },
  { value: "TODOS", label: "Todas" },
];

const dialogOpen = ref(false);
function onSuccessCrear() {
  dialogOpen.value = false;
}

// Cuánto hace que se creó, para que se note a simple vista cuál lleva más tiempo esperando.
function antiguedad(c: Cotizacion) {
  const horas = (Date.now() - new Date(c.createdAt).getTime()) / 3_600_000;
  if (horas < 1) return "hace menos de 1 hora";
  if (horas < 24) return `hace ${Math.floor(horas)} h`;
  return `hace ${Math.floor(horas / 24)} d`;
}

const { mutateAsync: marcarEnviada, isPending: marcando } = useMarcarCotizacionEnviada();
async function confirmarEnvio(c: Cotizacion) {
  try {
    await marcarEnviada(c.id);
    toast.success("Marcada como enviada a almacén");
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo marcar como enviada");
  }
}

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
    toast.success("Aviso eliminado");
    eliminarOpen.value = false;
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo eliminar el aviso");
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Cotizaciones camino a almacén</h1>
        <p class="text-sm text-muted-foreground">
          Aviso de que un pedido ya se cotizó en KEYFACIL y falta que llegue a almacén. No
          reemplaza la cotización (eso queda en KEYFACIL): es solo para que no se pierda.
        </p>
      </div>
      <Button v-if="permiso.puedeCrear" @click="dialogOpen = true">Nuevo aviso</Button>
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
    </div>

    <ScrollArea class="min-h-0 flex-1 rounded-md border border-border">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Proforma</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Registrado</TableHead>
            <TableHead>Notas</TableHead>
            <TableHead class="w-40 text-right">Acción</TableHead>
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
                <p class="text-sm text-destructive mb-2">No se pudieron cargar las cotizaciones</p>
                <Button variant="outline" size="sm" @click="refetch()">Reintentar</Button>
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="cotizacionesFiltradas.length === 0">
            <TableRow>
              <TableCell colspan="6" class="py-16 text-center text-muted-foreground">
                <Inbox class="mx-auto mb-3 h-10 w-10 opacity-50" />
                No hay avisos en este filtro
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow v-for="c in cotizacionesFiltradas" :key="c.id">
              <TableCell class="max-w-48 truncate font-medium" :title="c.cliente.nombre">
                {{ c.cliente.nombre }}
              </TableCell>
              <TableCell>{{ c.numeroProforma }}</TableCell>
              <TableCell>
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="c.estado === 'ENVIADO' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'"
                >
                  <CheckCircle2 v-if="c.estado === 'ENVIADO'" class="h-3 w-3" />
                  <Clock v-else class="h-3 w-3" />
                  {{ ESTADO_COTIZACION_LABEL[c.estado] }}
                </span>
              </TableCell>
              <TableCell :title="formatFechaHora(c.createdAt)">
                {{ formatFechaHoraCorta(c.createdAt) }}
                <span v-if="c.estado === 'PENDIENTE_ENVIO'" class="block text-xs text-muted-foreground">
                  {{ antiguedad(c) }}
                </span>
              </TableCell>
              <TableCell class="max-w-64 truncate text-sm text-muted-foreground" :title="c.notas ?? ''">
                {{ c.notas ?? "—" }}
              </TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button
                    v-if="permiso.puedeEditar && c.estado === 'PENDIENTE_ENVIO'"
                    size="sm"
                    variant="outline"
                    :disabled="marcando"
                    @click="confirmarEnvio(c)"
                  >
                    Marcar enviado
                  </Button>
                  <Button
                    v-if="permiso.puedeEliminar"
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 text-destructive"
                    title="Eliminar aviso"
                    aria-label="Eliminar aviso"
                    @click="pedirEliminar(c)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </ScrollArea>

    <Dialog v-model:open="dialogOpen">
      <DialogContent>
        <DialogTitle>Nuevo aviso a almacén</DialogTitle>
        <CotizacionForm @success="onSuccessCrear" />
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="eliminarOpen">
      <DialogContent class="max-w-md">
        <DialogTitle>Eliminar aviso</DialogTitle>
        <p class="text-sm text-muted-foreground">
          ¿Seguro que quieres eliminar el aviso de
          <span class="font-medium text-foreground">{{ cotizacionAEliminar?.cliente.nombre }}</span>
          (proforma {{ cotizacionAEliminar?.numeroProforma }})? Esta acción no se puede deshacer.
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
