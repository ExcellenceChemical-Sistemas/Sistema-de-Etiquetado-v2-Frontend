<script setup lang="ts">
definePageMeta({ layout: "auth" });

const email = ref("");
const enviado = ref(false);
const error = ref("");
const cargando = ref(false);
const { solicitarResetPassword } = useAuth();

const onSubmit = async () => {
  error.value = "";
  cargando.value = true;
  try {
    await solicitarResetPassword(email.value);
    enviado.value = true;
  } catch (e: any) {
    error.value = e?.message ?? "No se pudo enviar el correo";
  } finally {
    cargando.value = false;
  }
};
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle>Recuperar contraseña</CardTitle>
      <CardDescription>
        Ingresá tu correo y te enviamos un enlace para restablecerla
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="enviado" class="text-sm text-muted-foreground">
        Si el correo existe, te enviamos un enlace para restablecer tu
        contraseña. Revisá tu bandeja de entrada.
      </div>

      <form v-else @submit.prevent="onSubmit" class="space-y-4">
        <div class="space-y-2">
          <Label for="email">Correo</Label>
          <Input
            id="email"
            v-model="email"
            type="email"
            placeholder="tu@correo.com"
            required
          />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <Button type="submit" :disabled="cargando" class="w-full">
          <Spinner v-if="cargando" class="mr-2 size-4" />
          {{ cargando ? "Enviando..." : "Enviar enlace" }}
        </Button>
      </form>

      <div class="mt-4 text-center text-sm text-muted-foreground">
        <NuxtLink
          to="/login"
          class="underline underline-offset-4 hover:text-foreground"
        >
          Volver a iniciar sesión
        </NuxtLink>
      </div>
    </CardContent>
  </Card>
</template>
