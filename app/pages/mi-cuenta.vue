<script setup lang="ts">
import AvatarUploader from '@/components/mi-cuenta/AvatarUploader.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import Spinner from '@/components/ui/Spinner.vue'
import { Check, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { Recurso } from '@/composables/usePermiso'

const { usuarioActual, esAdmin, cargar } = useUsuarioActual()

onMounted(() => {
  cargar()
})

const RECURSOS: { valor: Recurso; etiqueta: string }[] = [
  { valor: 'LOTES', etiqueta: 'Lotes' },
  { valor: 'PRODUCTOS', etiqueta: 'Productos' },
  { valor: 'FABRICANTES', etiqueta: 'Fabricantes' },
  { valor: 'PLANTILLAS', etiqueta: 'Plantillas' },
  { valor: 'COA', etiqueta: 'COA' },
  { valor: 'USUARIOS', etiqueta: 'Usuarios' },
]

// Misma lógica de fallback que usePermiso.ts: admin ve todo en verde
// sin depender de que existan filas explícitas en usuarioActual.permisos.
const filasPermisos = computed(() =>
  RECURSOS.map(({ valor, etiqueta }) => {
    const p = usuarioActual.value?.permisos.find((permiso) => permiso.recurso === valor)
    return {
      recurso: valor,
      etiqueta,
      puedeVer: esAdmin.value || p?.puedeVer === true,
      puedeCrear: esAdmin.value || p?.puedeCrear === true,
      puedeEditar: esAdmin.value || p?.puedeEditar === true,
      puedeEliminar: esAdmin.value || p?.puedeEliminar === true,
    }
  })
)

const nombre = ref(usuarioActual.value?.nombre ?? '')
const guardando = ref(false)

watch(usuarioActual, (u) => {
  if (u) nombre.value = u.nombre
})

const huboCambioNombre = computed(
  () => nombre.value.trim() !== '' && nombre.value !== usuarioActual.value?.nombre
)

async function guardarNombre() {
  if (!huboCambioNombre.value) return

  guardando.value = true
  try {
    const api = useApi()
    await api.patch('/usuarios/me', { nombre: nombre.value })
    toast.success('Nombre actualizado')
    if (usuarioActual.value) usuarioActual.value.nombre = nombre.value
  } catch (e) {
    toast.error('No se pudo actualizar el nombre')
  } finally {
    guardando.value = false
  }
}

function onAvatarActualizado(url: string) {
  // Mantiene la UI consistente sin esperar a un refrescar() completo
  if (usuarioActual.value) usuarioActual.value.avatarUrl = url
}
</script>

<template>
  <div class="max-w-5xl space-y-6 p-6">
    <div>
      <h1 class="text-2xl font-semibold">Mi cuenta</h1>
      <p class="text-sm text-muted-foreground">
        Actualiza tu foto de perfil y tu nombre.
      </p>
    </div>

    <div class="grid gap-6 md:grid-cols-2 md:items-start">
      <div class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Foto de perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <AvatarUploader
              v-if="usuarioActual"
              :usuario-id="String(usuarioActual.id)"
              :avatar-url="usuarioActual.avatarUrl"
              @actualizado="onAvatarActualizado"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">Datos personales</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label for="nombre">Nombre</Label>
              <Input id="nombre" v-model="nombre" placeholder="Tu nombre" />
            </div>
            <div class="space-y-2">
              <Label>Correo</Label>
              <p class="text-sm text-muted-foreground">{{ usuarioActual?.email }}</p>
            </div>
            <Button :disabled="!huboCambioNombre || guardando" @click="guardarNombre">
              <Spinner v-if="guardando" class="mr-2 size-4" />
              Guardar cambios
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0">
          <CardTitle class="text-base">Permisos</CardTitle>
          <span
            v-if="esAdmin"
            class="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            Administrador
          </span>
        </CardHeader>
        <CardContent>
          <p v-if="esAdmin" class="mb-4 text-sm text-muted-foreground">
            Como administrador tienes acceso total a todos los recursos.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recurso</TableHead>
                <TableHead class="text-center">Ver</TableHead>
                <TableHead class="text-center">Crear</TableHead>
                <TableHead class="text-center">Editar</TableHead>
                <TableHead class="text-center">Eliminar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="fila in filasPermisos" :key="fila.recurso">
                <TableCell class="font-medium">{{ fila.etiqueta }}</TableCell>
                <TableCell class="text-center">
                  <Check v-if="fila.puedeVer" class="mx-auto size-4 text-green-600" />
                  <X v-else class="mx-auto size-4 text-muted-foreground" />
                </TableCell>
                <TableCell class="text-center">
                  <Check v-if="fila.puedeCrear" class="mx-auto size-4 text-green-600" />
                  <X v-else class="mx-auto size-4 text-muted-foreground" />
                </TableCell>
                <TableCell class="text-center">
                  <Check v-if="fila.puedeEditar" class="mx-auto size-4 text-green-600" />
                  <X v-else class="mx-auto size-4 text-muted-foreground" />
                </TableCell>
                <TableCell class="text-center">
                  <Check v-if="fila.puedeEliminar" class="mx-auto size-4 text-green-600" />
                  <X v-else class="mx-auto size-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </div>
</template>