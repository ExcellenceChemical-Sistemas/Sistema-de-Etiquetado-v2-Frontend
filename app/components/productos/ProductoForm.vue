<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { productoSchema, type ProductoFormValues } from '~/schemas/producto.schema'
import { useCreateProducto, useUpdateProducto } from '~/composables/useProductos'
import { toast } from 'vue-sonner'
import type { Producto } from '~/types/producto'

const props = defineProps<{ producto?: Producto | null }>()
const emit = defineEmits<{ success: [] }>()

const isEditing = !!props.producto

const { handleSubmit, defineField, errors, isSubmitting } = useForm<ProductoFormValues>({
  validationSchema: toTypedSchema(productoSchema),
  initialValues: {
    nombre: props.producto?.nombre ?? '',
    nfpaSalud: props.producto?.nfpaSalud ?? undefined,
    nfpaInflamabilidad: props.producto?.nfpaInflamabilidad ?? undefined,
    nfpaReactividad: props.producto?.nfpaReactividad ?? undefined,
  },
})

const [nombre, nombreAttrs] = defineField('nombre')
const [nfpaSalud, nfpaSaludAttrs] = defineField('nfpaSalud')
const [nfpaInflamabilidad, nfpaInflamabilidadAttrs] = defineField('nfpaInflamabilidad')
const [nfpaReactividad, nfpaReactividadAttrs] = defineField('nfpaReactividad')

const nombreInputRef = ref<{ $el: HTMLInputElement } | null>(null)
onMounted(() => {
  nombreInputRef.value?.$el?.focus()
})

const { mutateAsync: crear } = useCreateProducto()
const { mutateAsync: actualizar } = useUpdateProducto()

const onSubmit = handleSubmit(async (values) => {
  try {
    if (isEditing && props.producto) {
      await actualizar({ id: props.producto.id, dto: values })
      toast.success('Producto actualizado')
    } else {
      await crear(values)
      toast.success('Producto creado')
    }
    emit('success')
  } catch (err: any) {
    if (err?.response?.status === 409) {
      toast.error('Ya existe un producto con ese nombre')
    } else {
      toast.error('Ocurrió un error al guardar el producto')
    }
  }
})
</script>

<template>
  <form class="space-y-4" @submit="onSubmit">
    <div class="space-y-2">
      <Label for="nombre">Nombre</Label>
      <Input
        id="nombre"
        ref="nombreInputRef"
        v-model="nombre"
        v-bind="nombreAttrs"
        placeholder="Nombre del producto"
      />
      <p v-if="errors.nombre" class="text-sm text-destructive">{{ errors.nombre }}</p>
    </div>

    <div class="space-y-2">
      <Label>Rombo NFPA 704 <span class="text-muted-foreground font-normal">(opcional)</span></Label>
      <div class="grid grid-cols-3 gap-3">
        <div class="space-y-1">
          <Label for="nfpaSalud" class="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
            Salud
          </Label>
          <Input
            id="nfpaSalud"
            v-model="nfpaSalud"
            v-bind="nfpaSaludAttrs"
            type="number"
            min="0"
            max="4"
            placeholder="0-4"
          />
          <p v-if="errors.nfpaSalud" class="text-xs text-destructive">{{ errors.nfpaSalud }}</p>
        </div>
        <div class="space-y-1">
          <Label for="nfpaInflamabilidad" class="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-red-600" />
            Inflamabilidad
          </Label>
          <Input
            id="nfpaInflamabilidad"
            v-model="nfpaInflamabilidad"
            v-bind="nfpaInflamabilidadAttrs"
            type="number"
            min="0"
            max="4"
            placeholder="0-4"
          />
          <p v-if="errors.nfpaInflamabilidad" class="text-xs text-destructive">{{ errors.nfpaInflamabilidad }}</p>
        </div>
        <div class="space-y-1">
          <Label for="nfpaReactividad" class="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400" />
            Reactividad
          </Label>
          <Input
            id="nfpaReactividad"
            v-model="nfpaReactividad"
            v-bind="nfpaReactividadAttrs"
            type="number"
            min="0"
            max="4"
            placeholder="0-4"
          />
          <p v-if="errors.nfpaReactividad" class="text-xs text-destructive">{{ errors.nfpaReactividad }}</p>
        </div>
      </div>
    </div>

    <Button type="submit" class="w-full" :disabled="isSubmitting">
      <span
        v-if="isSubmitting"
        class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      {{ isEditing ? 'Guardar cambios' : 'Crear producto' }}
    </Button>
  </form>
</template>