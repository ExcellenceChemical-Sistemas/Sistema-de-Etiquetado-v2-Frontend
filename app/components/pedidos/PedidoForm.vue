<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { pedidoSchema } from "~/schemas/pedido.schema";
import { useClientesQuery } from "~/composables/useClientes";
import { useCreatePedido } from "~/composables/usePedidos";
import type { Cliente } from "~/types/cliente";
import { toast } from "vue-sonner";

const emit = defineEmits<{ success: [] }>();

const { data: clientes, isLoading: cargandoClientes } = useClientesQuery();

const { handleSubmit, defineField, errors, isSubmitting } = useForm({
  validationSchema: toTypedSchema(pedidoSchema),
  initialValues: { numeroProforma: "PF01-" },
});

const [clienteId] = defineField("clienteId", { validateOnModelUpdate: false });
const [numeroProforma, numeroProformaAttrs] = defineField("numeroProforma");

function clienteLabel(c: Cliente) {
  return c.nombre;
}

const numeroProformaRef = ref<{ $el: HTMLInputElement } | null>(null);
onMounted(() => {
  const input = numeroProformaRef.value?.$el;
  input?.focus();
  // deja el cursor al final del prefijo "PF01-" para que solo escriba el número
  input?.setSelectionRange(input.value.length, input.value.length);
});

const { mutateAsync: crearPedido } = useCreatePedido();

const onSubmit = handleSubmit(async (values) => {
  try {
    await crearPedido(values);
    toast.success("Pedido registrado");
    emit("success");
  } catch {
    toast.error("Ocurrió un error al registrar el pedido");
  }
});
</script>

<template>
  <form class="space-y-4" @submit="onSubmit">
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label>Cliente</Label>
        <NuxtLink to="/clientes" class="text-xs text-primary hover:underline">
          ¿No está en la lista? Créalo en Clientes
        </NuxtLink>
      </div>
      <ComboboxBuscador
        v-model="clienteId"
        :items="clientes ?? []"
        :loading="cargandoClientes"
        :get-label="clienteLabel"
        placeholder="Buscar cliente…"
        loading-placeholder="Cargando clientes…"
      />
      <p v-if="errors.clienteId" class="text-sm text-destructive">
        {{ errors.clienteId }}
      </p>
    </div>

    <div class="space-y-2">
      <Label for="numeroProforma">N° de proforma</Label>
      <Input
        id="numeroProforma"
        ref="numeroProformaRef"
        v-model="numeroProforma"
        v-bind="numeroProformaAttrs"
      />
      <p v-if="errors.numeroProforma" class="text-sm text-destructive">
        {{ errors.numeroProforma }}
      </p>
    </div>

    <p class="text-xs text-muted-foreground">
      La fecha y hora de recepción se registra ahora mismo, con la hora actual.
    </p>

    <Button type="submit" class="w-full" :disabled="isSubmitting">
      <span
        v-if="isSubmitting"
        class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      Registrar pedido
    </Button>
  </form>
</template>
