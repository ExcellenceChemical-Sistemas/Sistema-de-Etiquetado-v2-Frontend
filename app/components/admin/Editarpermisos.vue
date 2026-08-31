<script setup lang="ts">
import { reactive, watch, ref } from "vue";
import { Loader2, ShieldCheck } from "lucide-vue-next";
import { useApi } from "~/composables/useApi";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "vue-sonner";
import {
  crearPermisosStateVacio,
  poblarPermisosState,
  permisosStateAArray,
  type Usuario,
} from "~/utils/permisos";

const props = defineProps<{
  usuario: Usuario | null;
}>();

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  actualizado: [usuario: Usuario];
}>();

const permisosState = reactive(crearPermisosStateVacio());
const guardando = ref(false);

watch(
  () => [props.usuario, open.value] as const,
  ([usuario, isOpen]) => {
    if (usuario && isOpen) {
      Object.assign(permisosState, crearPermisosStateVacio());
      poblarPermisosState(permisosState, usuario.permisos);
    }
  },
  { immediate: true },
);

async function guardar() {
  if (!props.usuario) return;
  guardando.value = true;
  try {
    const api = useApi();
    const { data } = await api.patch(`/usuarios/${props.usuario.id}/permisos`, {
      permisos: permisosStateAArray(permisosState),
    });
    toast.success("Permisos actualizados");
    emit("actualizado", data.data);
    open.value = false;
  } catch (e: any) {
    toast.error(
      e?.response?.data?.message ?? "No se pudieron guardar los permisos",
    );
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-xl p-0 gap-0">
      <DialogHeader class="px-6 pt-6 pb-4">
        <DialogTitle>{{ usuario?.nombre ?? "Usuario" }}</DialogTitle>
        <DialogDescription>Permisos por módulo</DialogDescription>
      </DialogHeader>

      <ScrollArea class="max-h-[55vh] px-6">
        <div class="space-y-4 pb-6">
          <div
            v-if="usuario?.esAdmin"
            class="flex items-center gap-3 rounded-md border bg-primary/5 px-5 py-4 text-sm"
          >
            <ShieldCheck class="h-4 w-4 text-primary shrink-0" />
            <p>
              Este usuario es <strong>administrador</strong> y tiene acceso completo
              a todos los módulos. Los permisos por módulo no aplican.
            </p>
          </div>

          <AdminPermisosgrid v-model="permisosState" :disabled="usuario?.esAdmin" />
        </div>
      </ScrollArea>

      <DialogFooter class="px-6 py-4 border-t gap-2">
        <Button variant="outline" :disabled="guardando" @click="open = false">Cerrar</Button>
        <Button v-if="!usuario?.esAdmin" :disabled="guardando" @click="guardar">
          <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
          Guardar permisos
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>