<script setup lang="ts">
import { Inbox, Check, Trash2 } from "lucide-vue-next";
import {
  useNotificacionesQuery,
  useMarcarNotificacionLeida,
  useMarcarTodasLeidas,
  useEliminarNotificacion,
} from "~/composables/useNotificaciones";
import type { Notificacion } from "~/types/notificacion";
import { formatFechaHora } from "~/utils/fechaHora";

const { data: notificaciones, isPending, isError, refetch } = useNotificacionesQuery();

const hayNoLeidas = computed(() => (notificaciones.value ?? []).some((n) => !n.leidaEn));

const { mutate: marcarLeida } = useMarcarNotificacionLeida();
const { mutateAsync: marcarTodas, isPending: marcandoTodas } = useMarcarTodasLeidas();
const { mutate: eliminarNotificacion } = useEliminarNotificacion();

function abrirPedido(n: Notificacion) {
  if (!n.leidaEn) marcarLeida(n.id);
  // Pedidos no tiene una vista de detalle propia por id (todo el detalle se ve en la lista),
  // así que solo lleva a la lista general — no hay un deep-link más específico posible hoy.
  if (n.pedidoId) navigateTo("/pedidos");
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Mensajería</h1>
        <p class="text-sm text-muted-foreground">Avisos internos del sistema, ej. pedidos que llevan mucho tiempo sin entregarse.</p>
      </div>
      <Button v-if="hayNoLeidas" variant="outline" size="sm" :disabled="marcandoTodas" @click="marcarTodas()">
        Marcar todo como recibido
      </Button>
    </div>

    <ScrollArea class="min-h-0 flex-1 rounded-md border border-border">
      <div class="divide-y divide-border">
        <template v-if="isPending">
          <div v-for="i in 3" :key="i" class="p-4"><Skeleton class="h-10 w-full" /></div>
        </template>
        <template v-else-if="isError">
          <div class="py-16 text-center">
            <p class="text-sm text-destructive mb-2">No se pudieron cargar las notificaciones</p>
            <Button variant="outline" size="sm" @click="refetch()">Reintentar</Button>
          </div>
        </template>
        <template v-else-if="(notificaciones ?? []).length === 0">
          <div class="py-16 text-center text-muted-foreground">
            <Inbox class="mx-auto mb-3 h-10 w-10 opacity-50" />
            Sin notificaciones
          </div>
        </template>
        <template v-else>
          <div v-for="n in notificaciones" :key="n.id" class="flex items-start gap-3 p-4" :class="!n.leidaEn && 'bg-primary/5'">
            <span
              class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              :class="n.leidaEn ? 'bg-transparent' : 'bg-primary'"
            />
            <button
              type="button"
              class="min-w-0 flex-1 text-left"
              :class="n.pedidoId != null && 'cursor-pointer'"
              @click="abrirPedido(n)"
            >
              <p class="text-sm" :class="!n.leidaEn && 'font-medium'">{{ n.mensaje }}</p>
              <p class="text-xs text-muted-foreground">{{ formatFechaHora(n.createdAt) }}</p>
            </button>
            <div class="flex shrink-0 gap-1">
              <Button
                v-if="!n.leidaEn"
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                title="Alerta recibida"
                aria-label="Alerta recibida"
                @click="marcarLeida(n.id)"
              >
                <Check class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                title="Eliminar"
                aria-label="Eliminar"
                @click="eliminarNotificacion(n.id)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </template>
      </div>
    </ScrollArea>
  </div>
</template>
