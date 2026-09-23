<script setup lang="ts">
import { ref, watch } from "vue";
import { Loader2 } from "lucide-vue-next";
import { useApi } from "~/composables/useApi";
import { formatFechaHora } from "~/utils/fechaHora";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Registro {
  id: number;
  accion: string;
  actorNombre: string;
  objetivoNombre: string;
  detalle: string | null;
  createdAt: string;
}

const open = defineModel<boolean>("open", { required: true });

const registros = ref<Registro[]>([]);
const cargando = ref(false);
const error = ref("");

// Texto de cada acción, tal como se lee en la frase "<actor> <acción> a <objetivo>".
const ACCION: Record<string, string> = {
  USUARIO_DESACTIVADO: "desactivó a",
  USUARIO_REACTIVADO: "reactivó a",
  USUARIO_ELIMINADO: "eliminó a",
  PERMISOS_ACTUALIZADOS: "cambió los permisos de",
};

// Se pide cada vez que se abre: es un registro que crece mientras la pantalla está abierta.
watch(open, async (abierto) => {
  if (!abierto) return;
  cargando.value = true;
  error.value = "";
  try {
    const api = useApi();
    const { data } = await api.get("/usuarios/auditoria");
    registros.value = data.data;
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? "No se pudo cargar el historial";
  } finally {
    cargando.value = false;
  }
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Historial de cambios</DialogTitle>
        <DialogDescription>
          Quién desactivó, reactivó, eliminó o cambió los permisos de una cuenta.
        </DialogDescription>
      </DialogHeader>

      <div class="max-h-[60vh] overflow-y-auto scroll-tema -mx-1 px-1">
        <div v-if="cargando" class="flex justify-center py-8">
          <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
        <p v-else-if="error" class="text-sm text-destructive">{{ error }}</p>
        <p v-else-if="registros.length === 0" class="py-6 text-sm text-muted-foreground">
          Todavía no hay movimientos registrados.
        </p>
        <ul v-else class="divide-y">
          <li v-for="r in registros" :key="r.id" class="py-3">
            <p class="text-sm">
              <span class="font-medium">{{ r.actorNombre }}</span>
              {{ ACCION[r.accion] ?? r.accion }}
              <span class="font-medium">{{ r.objetivoNombre }}</span>
            </p>
            <p v-if="r.detalle" class="mt-0.5 text-xs text-muted-foreground break-words">
              {{ r.detalle }}
            </p>
            <p class="mt-0.5 text-xs text-muted-foreground">{{ formatFechaHora(r.createdAt) }}</p>
          </li>
        </ul>
      </div>
    </DialogContent>
  </Dialog>
</template>
