<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Loader2, Eye, EyeOff } from 'lucide-vue-next'
import { useApi } from '~/composables/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import { crearPermisosStateVacio, permisosStateAArray, type Usuario } from '~/utils/permisos'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  creado: [usuario: Usuario]
}>()

const nombre = ref('')
const email = ref('')
const password = ref('')
const mostrarPassword = ref(false)
const esAdmin = ref(false)
const permisosState = reactive(crearPermisosStateVacio())
const guardando = ref(false)
const error = ref('')

function resetForm() {
  nombre.value = ''
  email.value = ''
  password.value = ''
  mostrarPassword.value = false
  esAdmin.value = false
  Object.assign(permisosState, crearPermisosStateVacio())
  error.value = ''
}

function cerrar() {
  open.value = false
  resetForm()
}

async function guardar() {
  error.value = ''

  if (!nombre.value.trim() || !email.value.trim()) {
    error.value = 'Nombre y email son obligatorios'
    return
  }
  if (password.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }

  guardando.value = true
  try {
    const api = useApi()
    const { data } = await api.post('/usuarios', {
      nombre: nombre.value.trim(),
      email: email.value.trim(),
      password: password.value,
      esAdmin: esAdmin.value,
      permisos: esAdmin.value ? [] : permisosStateAArray(permisosState),
    })

    toast.success('Usuario creado')
    emit('creado', data.data)
    cerrar()
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'No se pudo crear el usuario'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open" @update:open="(v) => !v && resetForm()">
    <DialogContent class="sm:max-w-xl p-0 gap-0">
      <DialogHeader class="px-6 pt-6 pb-4">
        <DialogTitle>Nuevo usuario</DialogTitle>
        <DialogDescription>
          Se crea la cuenta en el sistema de autenticación y, si no es administrador, se
          configuran sus permisos por módulo.
        </DialogDescription>
      </DialogHeader>

      <!-- El contenedor interno de Reka lleva min-width: fit-content inline y
           crece hasta la línea más larga (el checkbox de administrador), más
           ancho que el diálogo en pantallas chicas. Se anula acá para que el
           texto envuelva; el grid de permisos ya scrollea solo. -->
      <ScrollArea
        class="max-h-[55vh] min-w-0 px-6 [&_[data-slot=scroll-area-viewport]>div]:min-w-0!"
      >
        <form autocomplete="off" class="space-y-4 pb-6" @submit.prevent>
          <input type="text" name="fakeusernameremembered" class="hidden" tabindex="-1" />
          <input type="password" name="fakepasswordremembered" class="hidden" tabindex="-1" />

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label for="nombre">Nombre</Label>
              <Input id="nombre" v-model="nombre" name="nuevo-usuario-nombre" autocomplete="off" placeholder="Jheremy" />
            </div>
            <div class="space-y-1.5">
              <Label for="email">Email</Label>
              <Input
                id="email"
                v-model="email"
                type="email"
                name="nuevo-usuario-email"
                autocomplete="off"
                placeholder="usuario@empresa.com"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <Label for="password">Contraseña inicial</Label>
            <div class="relative">
              <Input
                id="password"
                v-model="password"
                :type="mostrarPassword ? 'text' : 'password'"
                name="nuevo-usuario-password"
                autocomplete="new-password"
                placeholder="Mínimo 8 caracteres"
                class="pr-10"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                @click="mostrarPassword = !mostrarPassword"
              >
                <EyeOff v-if="mostrarPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox :checked="esAdmin" @update:checked="(v: boolean) => (esAdmin = v)" />
            Es administrador (acceso completo, sin restricciones por módulo)
          </label>

          <div v-if="!esAdmin" class="space-y-1.5">
            <Label>Permisos por módulo</Label>
            <AdminPermisosgrid v-model="permisosState" />
          </div>

          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        </form>
      </ScrollArea>

      <DialogFooter class="px-6 py-4 border-t gap-2">
        <Button variant="outline" :disabled="guardando" @click="cerrar">Cancelar</Button>
        <Button :disabled="guardando" @click="guardar">
          <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
          Crear usuario
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>