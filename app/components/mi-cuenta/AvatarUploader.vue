<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/ui/Spinner.vue'
import { useAvatar } from '@/composables/useAvatar'

const props = defineProps<{
  usuarioId: string
  /** null cuando el usuario todavía no subió foto (Usuario.avatarUrl es nullable). */
  avatarUrl?: string | null
}>()

const emit = defineEmits<{
  actualizado: [url: string]
}>()

const { subiendo, subirAvatar } = useAvatar()

const inputFile = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null | undefined>(props.avatarUrl)

watch(
  () => props.avatarUrl,
  (nuevo) => {
    if (!subiendo.value) previewUrl.value = nuevo
  }
)

function abrirSelector() {
  inputFile.value?.click()
}

async function onFileSeleccionado(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const urlAnterior = previewUrl.value
  previewUrl.value = URL.createObjectURL(file)

  const urlFinal = await subirAvatar(file, props.usuarioId)

  if (urlFinal) {
    previewUrl.value = urlFinal
    emit('actualizado', urlFinal)
  } else {
    previewUrl.value = urlAnterior
  }

  if (inputFile.value) inputFile.value.value = ''
}
</script>

<template>
  <div class="flex items-center gap-4">
    <div class="relative">
      <Avatar class="size-16">
        <AvatarImage v-if="previewUrl" :src="previewUrl" alt="Foto de perfil" />
        <AvatarFallback>--</AvatarFallback>
      </Avatar>
      <div
        v-if="subiendo"
        class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40"
      >
        <Spinner class="size-5 text-white" />
      </div>
    </div>

    <div>
      <input
        ref="inputFile"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="hidden"
        @change="onFileSeleccionado"
      />
      <Button variant="outline" size="sm" :disabled="subiendo" @click="abrirSelector">
        Cambiar foto
      </Button>
      <p class="mt-1 text-xs text-muted-foreground">PNG, JPEG o WEBP. Máx. 2 MB.</p>
    </div>
  </div>
</template>
