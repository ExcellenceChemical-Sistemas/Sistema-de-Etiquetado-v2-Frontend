<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { plantillaSchema } from "~/schemas/plantilla.schema";
import { useCreatePlantilla, useUpdatePlantilla } from "~/composables/usePlantillas";
import type { Plantilla } from "~/types/plantilla";
import { toast } from "vue-sonner";

const props = defineProps<{
  plantilla?: Plantilla | null;
}>();

const emit = defineEmits<{
  success: [];
}>();

const isEditing = computed(() => !!props.plantilla);

const { handleSubmit, defineField, errors, isSubmitting, setValues } = useForm({
  validationSchema: toTypedSchema(plantillaSchema),
  initialValues: {
    nombre: props.plantilla?.nombre ?? "",
    archivo: props.plantilla?.archivo ?? "",
    activa: props.plantilla?.activa ?? true,
  },
});

const [nombre, nombreAttrs] = defineField("nombre");
const [archivo, archivoAttrs] = defineField("archivo");
const [activa] = defineField("activa");

const nombreInputRef = ref<{ $el: HTMLInputElement } | null>(null);
onMounted(() => nombreInputRef.value?.$el?.focus());

watch(
  () => props.plantilla,
  (p) => {
    setValues({
      nombre: p?.nombre ?? "",
      archivo: p?.archivo ?? "",
      activa: p?.activa ?? true,
    });
  },
);

const createMutation = useCreatePlantilla();
const updateMutation = useUpdatePlantilla();

const onSubmit = handleSubmit(async (values) => {
  const input = {
    nombre: values.nombre,
    archivo: values.archivo,
    activa: values.activa === true,
  };
  try {
    if (isEditing.value && props.plantilla) {
      await updateMutation.mutateAsync({ id: props.plantilla.id, input });
      toast.success("Plantilla actualizada");
    } else {
      await createMutation.mutateAsync(input);
      toast.success("Plantilla creada");
    }
    emit("success");
  } catch (err: any) {
    if (err?.response?.status === 409) {
      toast.error("Ya existe una plantilla con ese nombre");
    } else {
      const msg = err?.response?.data?.message ?? "Ocurrió un error, intentá de nuevo";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  }
});
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
        placeholder="Ej: Estándar 10x6 cm con QR"
      />
      <p v-if="errors.nombre" class="text-sm text-destructive">
        {{ errors.nombre }}
      </p>
    </div>

    <div class="space-y-1.5">
      <Label for="archivo">Archivo (.hbs)</Label>
      <Input
        id="archivo"
        v-model="archivo"
        v-bind="archivoAttrs"
        placeholder="Ej: estandar.hbs"
      />
      <p v-if="errors.archivo" class="text-sm text-destructive">
        {{ errors.archivo }}
      </p>
      <p v-else class="text-xs text-muted-foreground">
        Debe coincidir exactamente con un archivo en assets/templates/ del agente de impresión.
      </p>
    </div>

    <div class="flex items-start gap-2">
      <Checkbox
        id="activa"
        class="mt-0.5"
        :model-value="activa === true"
        @update:model-value="(v: boolean | 'indeterminate') => (activa = v === true)"
      />
      <Label for="activa" class="text-sm font-normal leading-snug">
        Activa (visible para elegir al generar una etiqueta)
      </Label>
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
        {{ isEditing ? "Guardar cambios" : "Crear plantilla" }}
      </Button>
    </div>
  </form>
</template>
