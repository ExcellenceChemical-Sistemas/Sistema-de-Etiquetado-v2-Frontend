<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Users, ChevronRight, ShieldCheck, Plus } from "lucide-vue-next";
import { useApi } from "~/composables/useApi";
import { useUsuarioActual } from "~/composables/useUsuarioActual";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Usuario } from "~/utils/permisos";
import { formatFechaHora } from "~/utils/fechaHora";

const usuarios = ref<Usuario[]>([]);
const cargando = ref(true);
const error = ref("");

const crearOpen = ref(false);
const editarOpen = ref(false);
const usuarioSeleccionado = ref<Usuario | null>(null);

const { esAdmin, usuarioActual, cargar: cargarUsuarioActual } = useUsuarioActual();

/**
 * Admin de KPIs sin ser admin general: entra a esta pantalla solo para
 * asignar accesos de KPIs/ISO. No puede leer GET /usuarios (expone los
 * permisos de los demás módulos) ni crear usuarios.
 */
const soloGestionaKpisIso = computed(
  () => !esAdmin.value && usuarioActual.value?.esAdminKpis === true,
);

async function cargar() {
  cargando.value = true;
  error.value = "";
  try {
    await cargarUsuarioActual();
    const api = useApi();
    const endpoint = soloGestionaKpisIso.value
      ? "/usuarios/lista-basica"
      : "/usuarios";
    const { data } = await api.get(endpoint);
    usuarios.value = data.data;
  } catch (e: any) {
    error.value =
      e?.response?.data?.message ?? "No se pudo cargar la lista de usuarios";
  } finally {
    cargando.value = false;
  }
}

function abrirEditar(u: Usuario) {
  usuarioSeleccionado.value = u;
  editarOpen.value = true;
}

function onCreado(usuario: Usuario) {
  usuarios.value.unshift(usuario);
}

function onActualizado(usuario: Usuario) {
  const i = usuarios.value.findIndex((u) => u.id === usuario.id);
  if (i !== -1) usuarios.value[i] = usuario;
}

function onEliminado(usuarioId: number) {
  usuarios.value = usuarios.value.filter((u) => u.id !== usuarioId);
}

onMounted(cargar);
</script>

<template>
  <div class="p-6 space-y-6 max-w-3xl">
    <div class="flex items-center justify-between border-b pb-4">
      <div class="flex items-center gap-3">
        <div class="rounded-md bg-primary/10 p-2.5 shrink-0">
          <Users class="h-5 w-5 text-primary" />
        </div>
        <div>
          <p
            class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Administración
          </p>
          <h1 class="text-2xl font-semibold mt-1">Usuarios y permisos</h1>
        </div>
      </div>
      <Button v-if="!soloGestionaKpisIso" @click="crearOpen = true">
        <Plus class="h-4 w-4" />
        Nuevo usuario
      </Button>
    </div>

    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

    <div class="rounded-lg border bg-card divide-y overflow-hidden">
      <template v-if="cargando">
        <div
          v-for="n in 3"
          :key="n"
          class="flex items-center justify-between px-5 py-4"
        >
          <div class="space-y-2">
            <Skeleton class="h-4 w-40" />
            <Skeleton class="h-3 w-24" />
          </div>
        </div>
      </template>

      <p
        v-else-if="usuarios.length === 0"
        class="px-5 py-6 text-sm text-muted-foreground"
      >
        Todavía no hay usuarios registrados.
      </p>

      <button
        v-else
        v-for="u in usuarios"
        :key="u.id"
        type="button"
        class="group flex w-full items-center justify-between gap-3 px-5 py-4 hover:bg-primary/5 transition-colors text-left"
        @click="abrirEditar(u)"
      >
        <div class="min-w-0">
          <p
            class="text-sm font-medium truncate"
            :class="{ 'text-muted-foreground': u.activo === false }"
          >
            {{ u.nombre }}
          </p>
          <p
            v-if="!soloGestionaKpisIso"
            class="text-xs text-muted-foreground mt-0.5"
          >
            {{
              u.activo === false
                ? `Desactivado el ${formatFechaHora(u.desactivadoEn)}${u.desactivadoPor ? ` por ${u.desactivadoPor.nombre}` : ""}`
                : u.esAdmin
                ? "Administrador — todos los permisos"
                : `${(u.permisos ?? []).filter((p) => p.puedeVer || p.puedeCrear || p.puedeEditar || p.puedeEliminar).length} módulo(s) configurado(s)`
            }}
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span
            v-if="u.activo === false"
            class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          >
            Desactivado
          </span>
          <ShieldCheck v-if="u.esAdmin" class="h-4 w-4 text-primary" />
          <ChevronRight
            class="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors"
          />
        </div>
      </button>
    </div>

    <AdminCrearusuario v-model:open="crearOpen" @creado="onCreado" />
    <AdminEditarpermisos
      v-model:open="editarOpen"
      :usuario="usuarioSeleccionado"
      @actualizado="onActualizado"
      @eliminado="onEliminado"
    />
  </div>
</template>
