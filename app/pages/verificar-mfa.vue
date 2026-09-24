<script setup lang="ts">
import { mensajeErrorMfa } from "~/utils/mfa";

definePageMeta({ layout: "auth" });

const codigo = ref("");
const error = ref("");
const cargando = ref(false);
const { verificarInicio } = useMfa();
const { logout } = useAuth();

const onSubmit = async () => {
  error.value = "";
  cargando.value = true;
  try {
    await verificarInicio(codigo.value);
    await navigateTo("/");
  } catch (e) {
    error.value = mensajeErrorMfa(e);
    codigo.value = "";
  } finally {
    cargando.value = false;
  }
};

const cancelar = async () => {
  await logout();
  await navigateTo("/login");
};
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle>Verificación en dos pasos</CardTitle>
      <CardDescription
        >Ingresa el código de 6 dígitos de tu app autenticadora</CardDescription
      >
    </CardHeader>
    <CardContent>
      <form @submit.prevent="onSubmit" class="space-y-4">
        <div class="space-y-2">
          <Label for="codigo">Código</Label>
          <Input
            id="codigo"
            v-model="codigo"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="7"
            placeholder="123456"
            autofocus
            required
          />
        </div>
        <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
        <Button type="submit" :disabled="cargando || codigo.trim() === ''" class="w-full">
          <Spinner v-if="cargando" class="mr-2 size-4" />
          {{ cargando ? "Verificando..." : "Verificar" }}
        </Button>
      </form>

      <div class="mt-4 text-center text-sm text-muted-foreground">
        <button
          type="button"
          class="underline underline-offset-4 hover:text-foreground"
          @click="cancelar"
        >
          Cancelar y cerrar sesión
        </button>
      </div>
    </CardContent>
  </Card>
</template>
