<script setup lang="ts">
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { cotizacionSchema } from "~/schemas/cotizacion.schema";
import { useClientesQuery } from "~/composables/useClientes";
import { useCreateCotizacion } from "~/composables/useCotizaciones";
import type { Cliente } from "~/types/cliente";
import { toast } from "vue-sonner";

const emit = defineEmits<{ success: [] }>();

const { data: clientes, isLoading: cargandoClientes } = useClientesQuery();

const { handleSubmit, defineField, errors, isSubmitting } = useForm({
  validationSchema: toTypedSchema(cotizacionSchema),
});

const [clienteId] = defineField("clienteId", { validateOnModelUpdate: false });
const [notas, notasAttrs] = defineField("notas");

function clienteLabel(c: Cliente) {
  return c.nombre;
}

const { mutateAsync: crearCotizacion } = useCreateCotizacion();

const onSubmit = handleSubmit(async (values) => {
  try {
    await crearCotizacion({
      clienteId: values.clienteId,
      notas: values.notas,
    });
    toast.success("Cotización registrada como recibida");
    emit("success");
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? "Ocurrió un error al registrar la cotización");
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

    <p class="text-xs text-muted-foreground">
      La fecha y hora de requerimiento se registra ahora, con la hora del sistema — así el
      indicador mide el tiempo real desde que llegó el pedido. Si hace falta corregirla porque se
      cargó tarde, solo un administrador puede hacerlo después.
    </p>

    <div class="space-y-2">
      <Label for="notas">Notas (opcional)</Label>
      <Textarea id="notas" v-model="notas" v-bind="notasAttrs" rows="3" />
      <p v-if="errors.notas" class="text-sm text-destructive">
        {{ errors.notas }}
      </p>
    </div>

    <p class="text-xs text-muted-foreground">
      El número de proforma todavía no existe — se carga cuando Joel cotiza en KEYFACIL y se
      marque "cotización enviada".
    </p>

    <Button type="submit" class="w-full" :disabled="isSubmitting">
      <span
        v-if="isSubmitting"
        class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      Registrar cotización
    </Button>
  </form>
</template>
