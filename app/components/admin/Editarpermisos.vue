<script setup lang="ts">
import { reactive, watch, ref, computed } from "vue";
import { Loader2, ShieldCheck, Trash2, TriangleAlert } from "lucide-vue-next";
import Spinner from "~/components/ui/Spinner.vue";
import { useApi } from "~/composables/useApi";
import { useUsuarioActual } from "~/composables/useUsuarioActual";
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
  crearAccesosKpisIsoStateVacio,
  poblarAccesosKpisIsoState,
  accesosKpisIsoStateADto,
  type Usuario,
} from "~/utils/permisos";

const props = defineProps<{
  usuario: Usuario | null;
}>();

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  actualizado: [usuario: Usuario];
  eliminado: [usuarioId: number];
}>();

const permisosState = reactive(crearPermisosStateVacio());
const accesosKpisIsoState = reactive(crearAccesosKpisIsoStateVacio());
const guardando = ref(false);

const { esAdmin: soyAdmin, usuarioActual: usuarioLogueado } = useUsuarioActual();

/**
 * Quien abre el dialog es Admin de KPIs sin ser admin general: solo gestiona
 * accesos de KPIs/ISO. Los permisos por módulo no se muestran ni se mandan
 * (PATCH /usuarios/:id/permisos le daría 403).
 */
const soloKpisIso = computed(
  () => !soyAdmin.value && usuarioLogueado.value?.esAdminKpis === true,
);

// Solo el admin general elimina (DELETE /usuarios/:id es de EsAdminGuard), y
// nunca a sí mismo: el backend lo rechaza igual, acá solo se evita ofrecerlo.
const puedeEliminar = computed(
  () => soyAdmin.value && !!props.usuario && props.usuario.id !== usuarioLogueado.value?.id,
);

const confirmarEliminarOpen = ref(false);
const eliminando = ref(false);

async function eliminarUsuario() {
  if (!props.usuario) return;
  eliminando.value = true;
  try {
    const api = useApi();
    await api.delete(`/usuarios/${props.usuario.id}`);
    toast.success(`Usuario "${props.usuario.nombre}" eliminado`);
    emit("eliminado", props.usuario.id);
    confirmarEliminarOpen.value = false;
    open.value = false;
  } catch (e: any) {
    // 409: tiene historial (etiquetas, pedidos o archivos) y no se puede borrar
    toast.error(e?.response?.data?.message ?? "No se pudo eliminar el usuario");
    confirmarEliminarOpen.value = false;
  } finally {
    eliminando.value = false;
  }
}

/**
 * Los accesos NUNCA se leen de la fila de la lista: `GET /usuarios/lista-basica`
 * (la única que puede leer el Admin de KPIs) devuelve solo
 * {id, nombre, avatarUrl}, y tomar esa ausencia como "todo en false" hacía que
 * al guardar el PATCH le borrara los accesos reales al usuario — el service
 * hace deleteMany + createMany con exactamente lo que se le manda.
 *
 * Se piden siempre a GET /usuarios/:id/accesos-kpis-iso al abrir el diálogo.
 * `accesosCargados` se pone en true recién cuando esa respuesta llegó bien;
 * mientras tanto (cargando o error) el grid no se muestra y guardar está
 * bloqueado, así que no hay forma de mandar un estado vacío.
 */
const accesosCargados = ref(false);
const cargandoAccesos = ref(false);

/**
 * Igual que el contador de useUsuarioActual: si se cierra el diálogo y se abre
 * otro usuario antes de que responda el pedido anterior, la respuesta vieja se
 * descarta en vez de poblar el grid del usuario equivocado.
 */
let epocaAccesos = 0;

async function cargarAccesos(usuarioId: number) {
  const epoca = ++epocaAccesos;
  cargandoAccesos.value = true;
  accesosCargados.value = false;
  Object.assign(accesosKpisIsoState, crearAccesosKpisIsoStateVacio());

  try {
    const api = useApi();
    const { data } = await api.get(`/usuarios/${usuarioId}/accesos-kpis-iso`);
    if (epoca !== epocaAccesos) return;
    poblarAccesosKpisIsoState(accesosKpisIsoState, data.data);
    accesosCargados.value = true;
  } catch (e: any) {
    // 404, red caída, 403: se deja accesosCargados en false a propósito para
    // que se vea el aviso y no un grid vacío que parezca "no tiene accesos".
    if (epoca !== epocaAccesos) return;
    console.error("Error cargando los accesos de KPIs/ISO:", e);
    accesosCargados.value = false;
  } finally {
    if (epoca === epocaAccesos) cargandoAccesos.value = false;
  }
}

watch(
  () => [props.usuario, open.value] as const,
  ([usuario, isOpen]) => {
    if (usuario && isOpen) {
      Object.assign(permisosState, crearPermisosStateVacio());
      // la vista reducida de usuarios no trae permisos (el Admin de KPIs
      // tampoco los edita); los de verdad llegan con GET /usuarios
      poblarPermisosState(permisosState, usuario.permisos ?? []);
      // los accesos de KPIs/ISO siempre se piden aparte, nunca se leen de la fila
      cargarAccesos(usuario.id);
    }
  },
  { immediate: true },
);

async function guardar() {
  if (!props.usuario) return;
  // Segunda barrera además del botón deshabilitado: guardar sin los accesos
  // cargados equivale a borrárselos al usuario.
  if (!accesosCargados.value) {
    toast.error(
      "No se pudieron leer los accesos actuales de este usuario. No se guarda nada para no borrárselos.",
    );
    return;
  }
  guardando.value = true;
  try {
    const api = useApi();
    let data: any;

    if (!soloKpisIso.value && !props.usuario.esAdmin) {
      ({ data } = await api.patch(`/usuarios/${props.usuario.id}/permisos`, {
        permisos: permisosStateAArray(permisosState),
      }));
    }

    ({ data } = await api.patch(
      `/usuarios/${props.usuario.id}/accesos-kpis-iso`,
      accesosKpisIsoStateADto(accesosKpisIsoState),
    ));

    toast.success(
      soloKpisIso.value ? "Accesos actualizados" : "Permisos actualizados",
    );
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
        <DialogDescription>
          {{
            soloKpisIso
              ? "Accesos a KPIs / Documentación ISO"
              : "Permisos por módulo"
          }}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea class="max-h-[55vh] min-w-0 px-6">
        <div class="space-y-4 pb-6">
          <div
            v-if="usuario?.esAdmin"
            class="flex items-center gap-3 rounded-md border bg-primary/5 px-5 py-4 text-sm"
          >
            <ShieldCheck class="h-4 w-4 text-primary shrink-0" />
            <p>
              Este usuario es <strong>administrador</strong> y tiene acceso
              completo a todos los módulos. Los permisos por módulo no aplican.
            </p>
          </div>

          <AdminPermisosgrid
            v-if="!soloKpisIso"
            v-model="permisosState"
            :disabled="usuario?.esAdmin"
          />

          <div class="space-y-1.5 pt-2">
            <p class="text-sm font-medium">
              Accesos a KPIs / Documentación ISO
            </p>
            <div
              v-if="cargandoAccesos"
              class="flex items-center gap-3 rounded-md border bg-muted/30 px-5 py-4 text-sm text-muted-foreground"
            >
              <Spinner class="h-4 w-4 shrink-0" />
              <p>Cargando los accesos actuales de este usuario…</p>
            </div>
            <div
              v-else-if="!accesosCargados"
              class="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm"
            >
              <TriangleAlert class="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p>
                No se pudieron leer los accesos actuales de este usuario, así
                que tampoco se pueden editar sin arriesgar borrarlos. Cerrá y
                volvé a abrir para reintentar.
              </p>
            </div>
            <AdminAccesoskpisiso v-else v-model="accesosKpisIsoState" />
          </div>
        </div>
      </ScrollArea>

      <DialogFooter class="px-6 py-4 border-t gap-2">
        <Button
          v-if="puedeEliminar"
          variant="ghost"
          class="text-destructive hover:text-destructive sm:mr-auto"
          :disabled="guardando"
          @click="confirmarEliminarOpen = true"
        >
          <Trash2 class="h-4 w-4" />
          Eliminar usuario
        </Button>
        <Button variant="outline" :disabled="guardando" @click="open = false"
          >Cerrar</Button
        >
        <Button
          v-if="soloKpisIso || !usuario?.esAdmin"
          :disabled="guardando || cargandoAccesos || !accesosCargados"
          @click="guardar"
        >
          <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
          {{ soloKpisIso ? "Guardar accesos" : "Guardar permisos" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog v-model:open="confirmarEliminarOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>¿Eliminar a {{ usuario?.nombre }}?</DialogTitle>
        <DialogDescription>
          Se borra su cuenta y todos sus permisos. Esta acción no se puede
          deshacer. Si el usuario ya imprimió etiquetas, cargó pedidos o subió
          archivos, no se va a poder eliminar.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button
          variant="outline"
          :disabled="eliminando"
          @click="confirmarEliminarOpen = false"
        >
          Cancelar
        </Button>
        <Button variant="destructive" :disabled="eliminando" @click="eliminarUsuario">
          <Loader2 v-if="eliminando" class="h-4 w-4 animate-spin" />
          Eliminar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
