<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Spinner from '@/components/ui/Spinner.vue'
import { ShieldCheck } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { mensajeErrorMfa } from '~/utils/mfa'

const props = defineProps<{
  /** Un administrador al que el backend le exige activarlo (EXIGIR_MFA_ADMIN). */
  obligatorio?: boolean
}>()

const mfa = useMfa()

type Estado = 'cargando' | 'inactivo' | 'activando' | 'activo'
const estado = ref<Estado>('cargando')
const factorId = ref('')
const qr = ref('')
const secreto = ref('')
const codigo = ref('')
const error = ref('')
const trabajando = ref(false)
const confirmandoBaja = ref(false)

async function cargarEstado() {
  try {
    const factor = await mfa.factorActivo()
    factorId.value = factor?.id ?? ''
    estado.value = factor ? 'activo' : 'inactivo'
  } catch {
    estado.value = 'inactivo'
    error.value = 'No se pudo consultar el estado de la verificación en dos pasos'
  }
}

onMounted(cargarEstado)

async function empezar() {
  error.value = ''
  trabajando.value = true
  try {
    const r = await mfa.iniciarActivacion()
    factorId.value = r.factorId
    qr.value = r.qr
    secreto.value = r.secreto
    codigo.value = ''
    estado.value = 'activando'
  } catch (e) {
    error.value = mensajeErrorMfa(e)
  } finally {
    trabajando.value = false
  }
}

async function confirmar() {
  error.value = ''
  trabajando.value = true
  try {
    await mfa.confirmarActivacion(factorId.value, codigo.value)
    estado.value = 'activo'
    qr.value = ''
    secreto.value = ''
    codigo.value = ''
    toast.success('Verificación en dos pasos activada')
  } catch (e) {
    error.value = mensajeErrorMfa(e)
    codigo.value = ''
  } finally {
    trabajando.value = false
  }
}

async function cancelar() {
  await mfa.cancelarActivacion(factorId.value)
  estado.value = 'inactivo'
  factorId.value = ''
  qr.value = ''
  secreto.value = ''
  codigo.value = ''
  error.value = ''
}

async function desactivar() {
  error.value = ''
  trabajando.value = true
  try {
    await mfa.desactivar(factorId.value)
    estado.value = 'inactivo'
    factorId.value = ''
    confirmandoBaja.value = false
    toast.success('Verificación en dos pasos desactivada')
  } catch (e) {
    error.value = mensajeErrorMfa(e)
  } finally {
    trabajando.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <p
      v-if="props.obligatorio && estado !== 'activo'"
      class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
      role="alert"
    >
      Los administradores deben activar la verificación en dos pasos para seguir usando el sistema.
    </p>

    <div v-if="estado === 'cargando'" class="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner class="size-4" /> Consultando...
    </div>

    <!-- Sin activar -->
    <template v-else-if="estado === 'inactivo'">
      <p class="text-sm text-muted-foreground">
        Suma un código de tu celular al iniciar sesión, además de la contraseña. Si alguien
        descubre tu contraseña, no podrá entrar sin tu teléfono.
      </p>
      <Button :disabled="trabajando" @click="empezar">
        <Spinner v-if="trabajando" class="mr-2 size-4" />
        Activar
      </Button>
    </template>

    <!-- Escaneando el QR -->
    <template v-else-if="estado === 'activando'">
      <ol class="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Instala una app autenticadora (Google Authenticator, Microsoft Authenticator, Authy…).</li>
        <li>Escanea este código QR con la app.</li>
        <li>Escribe abajo el código de 6 dígitos que muestra.</li>
      </ol>
      <div class="w-fit rounded-md bg-white p-2">
        <img :src="qr" alt="Código QR para la app autenticadora" class="size-40" />
      </div>
      <p class="text-xs text-muted-foreground">
        ¿No puedes escanear? Escribe este código en la app:
        <span class="select-all break-all font-mono text-foreground">{{ secreto }}</span>
      </p>
      <form class="space-y-2" @submit.prevent="confirmar">
        <Label for="codigo-activar">Código de 6 dígitos</Label>
        <Input
          id="codigo-activar"
          v-model="codigo"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="7"
          placeholder="123456"
          class="max-w-40"
        />
        <div class="flex gap-2 pt-1">
          <Button type="submit" :disabled="trabajando || codigo.trim() === ''">
            <Spinner v-if="trabajando" class="mr-2 size-4" />
            Confirmar
          </Button>
          <Button type="button" variant="ghost" :disabled="trabajando" @click="cancelar">
            Cancelar
          </Button>
        </div>
      </form>
    </template>

    <!-- Activado -->
    <template v-else>
      <p class="flex items-center gap-2 text-sm">
        <ShieldCheck class="size-4 text-green-600" />
        La verificación en dos pasos está activada.
      </p>
      <div v-if="!confirmandoBaja">
        <Button variant="outline" size="sm" @click="confirmandoBaja = true">Desactivar</Button>
      </div>
      <div v-else class="space-y-2">
        <p class="text-sm text-muted-foreground">
          Tu cuenta volverá a protegerse solo con la contraseña. ¿Desactivar?
        </p>
        <div class="flex gap-2">
          <Button variant="destructive" size="sm" :disabled="trabajando" @click="desactivar">
            <Spinner v-if="trabajando" class="mr-2 size-4" />
            Sí, desactivar
          </Button>
          <Button variant="ghost" size="sm" :disabled="trabajando" @click="confirmandoBaja = false">
            Cancelar
          </Button>
        </div>
      </div>
    </template>

    <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
  </div>
</template>
