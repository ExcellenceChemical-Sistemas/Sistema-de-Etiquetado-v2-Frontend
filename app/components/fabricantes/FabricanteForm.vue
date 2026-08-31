<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { fabricanteSchema } from '~/schemas/fabricante.schema'
import type { Fabricante } from '~/types/fabricante'
import { toast } from 'vue-sonner'

const props = defineProps<{
  fabricante?: Fabricante | null
}>()

const emit = defineEmits<{
  success: []
}>()

const isEditing = computed(() => !!props.fabricante)

const { handleSubmit, defineField, errors, isSubmitting, setValues } = useForm({
  validationSchema: toTypedSchema(fabricanteSchema),
  initialValues: {
    nombre: props.fabricante?.nombre ?? '',
  },
})

const [nombre, nombreAttrs] = defineField('nombre')

const nombreInputRef = ref<{ $el: HTMLInputElement } | null>(null)

onMounted(() => {
  nombreInputRef.value?.$el?.focus()
})

watch(
  () => props.fabricante,
  (f) => {
    setValues({ nombre: f?.nombre ?? '' })
  }
)

const createMutation = useCreateFabricante()
const updateMutation = useUpdateFabricante()

const onSubmit = handleSubmit(async (values) => {
  try {
    if (isEditing.value && props.fabricante) {
      await updateMutation.mutateAsync({ id: props.fabricante.id, input: values })
      toast.success('Fabricante actualizado')
    } else {
      await createMutation.mutateAsync(values)
      toast.success('Fabricante creado')
    }
    emit('success')
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? 'Ocurrió un error, intentá de nuevo'
    toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
  }
})
</script>

<template>
  <form class="space-y-4" @submit="onSubmit">
    <div class="space-y-1.5">
      <Label for="nombre">Nombre</Label>
      <Input
        id="nombre"
        ref="nombreInputRef"
        v-model="nombre"
        v-bind="nombreAttrs"
        placeholder="Ej: Laboratorios Acme"
      />
      <p v-if="errors.nombre" class="text-sm text-destructive">
        {{ errors.nombre }}
      </p>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button
        type="submit"
        :disabled="isSubmitting || createMutation.isPending.value || updateMutation.isPending.value"
      >
        <span
          v-if="isSubmitting || createMutation.isPending.value || updateMutation.isPending.value"
          class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
        {{ isEditing ? 'Guardar cambios' : 'Crear fabricante' }}
      </Button>
    </div>
  </form>
</template>