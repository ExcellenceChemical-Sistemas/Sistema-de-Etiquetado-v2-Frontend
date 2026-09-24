<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Spinner from '@/components/ui/Spinner.vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { PASSWORD_MIN, mensajeErrorPassword, validarPasswordNueva } from '~/utils/password'

const { cambiarPassword } = useAuth()

const actual = ref('')
const nueva = ref('')
const confirmar = ref('')
const mostrar = ref(false)
const error = ref('')
const guardando = ref(false)

const puedeEnviar = computed(
  () => actual.value !== '' && nueva.value !== '' && confirmar.value !== '' && !guardando.value
)

async function onSubmit() {
  error.value = ''
  if (nueva.value !== confirmar.value) {
    error.value = 'Las contraseñas nuevas no coinciden'
    return
  }
  const problema = validarPasswordNueva(nueva.value, actual.value)
  if (problema) {
    error.value = problema
    return
  }

  guardando.value = true
  try {
    await cambiarPassword(actual.value, nueva.value)
    toast.success('Contraseña actualizada', {
      description: 'Se cerró tu sesión en los demás dispositivos.',
    })
    actual.value = ''
    nueva.value = ''
    confirmar.value = ''
    mostrar.value = false
  } catch (e) {
    error.value = mensajeErrorPassword(e)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <div class="space-y-2">
      <Label for="password-actual">Contraseña actual</Label>
      <Input
        id="password-actual"
        v-model="actual"
        :type="mostrar ? 'text' : 'password'"
        autocomplete="current-password"
      />
    </div>
    <div class="space-y-2">
      <Label for="password-nueva">Contraseña nueva</Label>
      <Input
        id="password-nueva"
        v-model="nueva"
        :type="mostrar ? 'text' : 'password'"
        autocomplete="new-password"
      />
      <p class="text-xs text-muted-foreground">
        Mínimo {{ PASSWORD_MIN }} caracteres, con letras y números.
      </p>
    </div>
    <div class="space-y-2">
      <Label for="password-confirmar">Repite la contraseña nueva</Label>
      <Input
        id="password-confirmar"
        v-model="confirmar"
        :type="mostrar ? 'text' : 'password'"
        autocomplete="new-password"
      />
    </div>

    <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>

    <div class="flex items-center gap-2">
      <Button type="submit" :disabled="!puedeEnviar">
        <Spinner v-if="guardando" class="mr-2 size-4" />
        Cambiar contraseña
      </Button>
      <Button type="button" variant="ghost" size="sm" @click="mostrar = !mostrar">
        <EyeOff v-if="mostrar" class="mr-1 size-4" />
        <Eye v-else class="mr-1 size-4" />
        {{ mostrar ? 'Ocultar' : 'Mostrar' }}
      </Button>
    </div>
  </form>
</template>
