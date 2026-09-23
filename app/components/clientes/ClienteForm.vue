<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { clienteSchema } from "~/schemas/cliente.schema";
import { useCreateCliente, useUpdateCliente } from "~/composables/useClientes";
import {
  TIPOS_DOCUMENTO_CLIENTE,
  TIPO_DOCUMENTO_CLIENTE_LABEL,
  type Cliente,
} from "~/types/cliente";
import { toast } from "vue-sonner";

const props = defineProps<{
  cliente?: Cliente | null;
}>();

const emit = defineEmits<{
  success: [];
}>();

const isEditing = computed(() => !!props.cliente);

const { handleSubmit, defineField, errors, isSubmitting, setValues } = useForm({
  validationSchema: toTypedSchema(clienteSchema),
  initialValues: {
    nombre: props.cliente?.nombre ?? "",
    tipoDocumento: props.cliente?.tipoDocumento ?? undefined,
    numeroDocumento: props.cliente?.numeroDocumento ?? "",
    direccion: props.cliente?.direccion ?? "",
    celular: props.cliente?.celular ?? "",
  },
});

const [nombre, nombreAttrs] = defineField("nombre");
const [tipoDocumento] = defineField("tipoDocumento", { validateOnModelUpdate: false });
const [numeroDocumento, numeroDocumentoAttrs] = defineField("numeroDocumento");
const [direccion, direccionAttrs] = defineField("direccion");
const [celular, celularAttrs] = defineField("celular");

const nombreInputRef = ref<{ $el: HTMLInputElement } | null>(null);
onMounted(() => nombreInputRef.value?.$el?.focus());

watch(
  () => props.cliente,
  (c) => {
    setValues({
      nombre: c?.nombre ?? "",
      tipoDocumento: c?.tipoDocumento ?? undefined,
      numeroDocumento: c?.numeroDocumento ?? "",
      direccion: c?.direccion ?? "",
      celular: c?.celular ?? "",
    });
  },
);

const createMutation = useCreateCliente();
const updateMutation = useUpdateCliente();

const onSubmit = handleSubmit(async (values) => {
  const input = {
    nombre: values.nombre,
    tipoDocumento: values.tipoDocumento as Cliente["tipoDocumento"] | undefined,
    numeroDocumento: values.numeroDocumento || undefined,
    direccion: values.direccion || undefined,
    celular: values.celular || undefined,
  };
  try {
    if (isEditing.value && props.cliente) {
      await updateMutation.mutateAsync({ id: props.cliente.id, input });
      toast.success("Cliente actualizado");
    } else {
      await createMutation.mutateAsync(input);
      toast.success("Cliente creado");
    }
    emit("success");
  } catch (err: any) {
    if (err?.response?.status === 409) {
      toast.error("Ya existe un cliente con ese nombre");
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
      <Label for="nombre">Nombre / Razón social</Label>
      <Input
        id="nombre"
        ref="nombreInputRef"
        v-model="nombre"
        v-bind="nombreAttrs"
      />
      <p v-if="errors.nombre" class="text-sm text-destructive">
        {{ errors.nombre }}
      </p>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <Label for="tipoDocumento">Tipo de documento</Label>
        <Select v-model="tipoDocumento">
          <SelectTrigger id="tipoDocumento">
            <SelectValue placeholder="Selecciona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="t in TIPOS_DOCUMENTO_CLIENTE" :key="t" :value="t">
              {{ TIPO_DOCUMENTO_CLIENTE_LABEL[t] }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="space-y-1.5">
        <Label for="numeroDocumento">N° de documento</Label>
        <Input
          id="numeroDocumento"
          v-model="numeroDocumento"
          v-bind="numeroDocumentoAttrs"
        />
        <p v-if="errors.numeroDocumento" class="text-sm text-destructive">
          {{ errors.numeroDocumento }}
        </p>
      </div>
    </div>

    <div class="space-y-1.5">
      <Label for="direccion">Dirección</Label>
      <Input id="direccion" v-model="direccion" v-bind="direccionAttrs" />
      <p v-if="errors.direccion" class="text-sm text-destructive">
        {{ errors.direccion }}
      </p>
    </div>

    <div class="space-y-1.5">
      <Label for="celular">Celular</Label>
      <Input id="celular" v-model="celular" v-bind="celularAttrs" />
      <p v-if="errors.celular" class="text-sm text-destructive">
        {{ errors.celular }}
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
        {{ isEditing ? "Guardar cambios" : "Crear cliente" }}
      </Button>
    </div>
  </form>
</template>
