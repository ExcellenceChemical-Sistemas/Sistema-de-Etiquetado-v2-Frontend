<script setup lang="ts">
definePageMeta({ layout: "auth" });

const nuevaPassword = ref("");
const confirmarPassword = ref("");
const error = ref("");
const listo = ref(false);
const cargando = ref(false);
const { actualizarPassword } = useAuth();
const router = useRouter();

const onSubmit = async () => {
  error.value = "";
  if (nuevaPassword.value !== confirmarPassword.value) {
    error.value = "Las contraseñas no coinciden";
    return;
  }
  if (nuevaPassword.value.length < 8) {
    error.value = "Mínimo 8 caracteres";
    return;
  }

  cargando.value = true;
  try {
    await actualizarPassword(nuevaPassword.value);
    listo.value = true;
    setTimeout(() => router.push("/login"), 2000);
  } catch (e: any) {
    error.value = e?.message ?? "No se pudo actualizar la contraseña";
  } finally {
    cargando.value = false;
  }
};
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle>Nueva contraseña</CardTitle>
      <CardDescription
        >Elegí una contraseña nueva para tu cuenta</CardDescription
      >
    </CardHeader>
    <CardContent>
      <div v-if="listo" class="text-sm text-muted-foreground">
        Contraseña actualizada. Redirigiendo al login...
      </div>

      <form v-else @submit.prevent="onSubmit" class="space-y-4">
        <div class="space-y-2">
          <Label for="nueva">Nueva contraseña</Label>
          <Input id="nueva" v-model="nuevaPassword" type="password" required />
        </div>
        <div class="space-y-2">
          <Label for="confirmar">Confirmar contraseña</Label>
          <Input
            id="confirmar"
            v-model="confirmarPassword"
            type="password"
            required
          />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <Button type="submit" :disabled="cargando" class="w-full">
          <Spinner v-if="cargando" class="mr-2 size-4" />
          {{ cargando ? "Guardando..." : "Actualizar contraseña" }}
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
