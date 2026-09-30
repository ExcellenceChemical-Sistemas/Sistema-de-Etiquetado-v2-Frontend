<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Inbox, Trash2, ShieldAlert } from "@lucide/vue";
import { useAusenciasQuery, useCreateAusencia, useDeleteAusencia } from "~/composables/useAusencias";
import { useUsuarioActual } from "~/composables/useUsuarioActual";
import { toast } from "vue-sonner";

const { esAdmin, cargar: cargarUsuarioActual } = useUsuarioActual();
onMounted(cargarUsuarioActual);

interface UsuarioBasico {
  id: number;
  nombre: string;
}

const usuarios = ref<UsuarioBasico[]>([]);
const cargandoUsuarios = ref(false);

async function cargarUsuarios() {
  cargandoUsuarios.value = true;
  try {
    const api = useApi();
    const { data } = await api.get("/usuarios");
    usuarios.value = (data.data ?? []).map((u: any) => ({ id: u.id, nombre: u.nombre }));
  } catch {
    toast.error("No se pudo cargar la lista de usuarios");
  } finally {
    cargandoUsuarios.value = false;
  }
}
onMounted(cargarUsuarios);

const { data: ausencias, isPending, isError, refetch } = useAusenciasQuery();

const usuarioId = ref<number | undefined>(undefined);
const desde = ref("");
const hasta = ref("");
const motivo = ref("");

function usuarioLabel(u: UsuarioBasico) {
  return u.nombre;
}

const { mutateAsync: crearAusencia, isPending: guardando } = useCreateAusencia();

async function registrar() {
  if (!usuarioId.value || !desde.value || !hasta.value) {
    toast.error("Completa usuario, desde y hasta");
    return;
  }
  try {
    await crearAusencia({
      usuarioId: usuarioId.value,
      desde: desde.value,
      hasta: hasta.value,
      motivo: motivo.value || undefined,
    });
    toast.success("Ausencia registrada");
    usuarioId.value = undefined;
    desde.value = "";
    hasta.value = "";
    motivo.value = "";
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo registrar la ausencia");
  }
}

const { mutateAsync: eliminarAusencia } = useDeleteAusencia();
async function eliminar(id: number) {
  try {
    await eliminarAusencia(id);
    toast.success("Ausencia eliminada");
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "No se pudo eliminar la ausencia");
  }
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div v-if="!esAdmin" class="flex flex-1 items-center justify-center text-center text-muted-foreground">
      <div>
        <ShieldAlert class="mx-auto mb-3 h-10 w-10 opacity-50" />
        Solo un administrador puede ver esta página.
      </div>
    </div>

    <template v-else>
      <div>
        <h1 class="text-2xl font-semibold">Ausencias</h1>
        <p class="text-sm text-muted-foreground">
          Vacaciones y licencias del personal. Cotizaciones cruza estas fechas contra lo que cada
          quien carga en el sistema: si una etapa aparece marcada dentro de una ausencia registrada
          acá, o en un feriado/fin de semana, el sistema la señala como sospechosa en el indicador.
        </p>
      </div>

      <div class="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="space-y-2 lg:col-span-1">
          <Label>Usuario</Label>
          <ComboboxBuscador
            v-model="usuarioId"
            :items="usuarios"
            :loading="cargandoUsuarios"
            :get-label="usuarioLabel"
            placeholder="Buscar usuario…"
            loading-placeholder="Cargando usuarios…"
          />
        </div>
        <div class="space-y-2">
          <Label for="desde">Desde</Label>
          <Input id="desde" v-model="desde" type="date" />
        </div>
        <div class="space-y-2">
          <Label for="hasta">Hasta</Label>
          <Input id="hasta" v-model="hasta" type="date" />
        </div>
        <div class="space-y-2">
          <Label for="motivo">Motivo (opcional)</Label>
          <Input id="motivo" v-model="motivo" placeholder="Vacaciones, licencia..." />
        </div>
        <div class="sm:col-span-2 lg:col-span-4">
          <Button :disabled="guardando" @click="registrar">Registrar ausencia</Button>
        </div>
      </div>

      <ScrollArea class="min-h-0 flex-1 rounded-md border border-border">
        <Table>
          <TableHeader class="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Hasta</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Registrado por</TableHead>
              <TableHead class="w-16 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-if="isPending">
              <TableRow v-for="i in 3" :key="i">
                <TableCell v-for="j in 6" :key="j"><Skeleton class="h-4 w-full" /></TableCell>
              </TableRow>
            </template>
            <template v-else-if="isError">
              <TableRow>
                <TableCell colspan="6" class="text-center py-8">
                  <p class="text-sm text-destructive mb-2">No se pudieron cargar las ausencias</p>
                  <Button variant="outline" size="sm" @click="refetch()">Reintentar</Button>
                </TableCell>
              </TableRow>
            </template>
            <template v-else-if="(ausencias ?? []).length === 0">
              <TableRow>
                <TableCell colspan="6" class="py-16 text-center text-muted-foreground">
                  <Inbox class="mx-auto mb-3 h-10 w-10 opacity-50" />
                  Sin ausencias registradas
                </TableCell>
              </TableRow>
            </template>
            <template v-else>
              <TableRow v-for="a in ausencias" :key="a.id">
                <TableCell class="font-medium">{{ a.usuario.nombre }}</TableCell>
                <TableCell>{{ formatFecha(a.desde) }}</TableCell>
                <TableCell>{{ formatFecha(a.hasta) }}</TableCell>
                <TableCell>{{ a.motivo ?? "—" }}</TableCell>
                <TableCell>{{ a.registradoPor.nombre }}</TableCell>
                <TableCell class="text-right">
                  <Button variant="ghost" size="icon" class="h-8 w-8" title="Eliminar" aria-label="Eliminar" @click="eliminar(a.id)">
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </Table>
      </ScrollArea>
    </template>
  </div>
</template>
