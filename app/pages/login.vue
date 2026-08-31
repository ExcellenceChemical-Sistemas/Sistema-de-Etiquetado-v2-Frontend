<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const { login } = useAuth()

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value, password.value)
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.message === 'Invalid login credentials'
      ? 'Correo o contraseña incorrectos'
      : 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle>Iniciar sesión</CardTitle>
      <CardDescription>Ingresá tus credenciales para continuar</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="space-y-2">
          <Label for="email">Correo</Label>
          <Input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
          />
        </div>
        <div class="space-y-2">
          <div class="flex items-center">
            <Label for="password">Contraseña</Label>
            <NuxtLink
              to="/olvide-password"
              class="ml-auto text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </NuxtLink>
          </div>
          <Input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="error" class="text-sm text-destructive">
          {{ error }}
        </p>

        <Button type="submit" class="w-full" :disabled="loading">
          <Spinner v-if="loading" class="mr-2 size-4" />
          {{ loading ? 'Ingresando...' : 'Ingresar' }}
        </Button>
      </form>
    </CardContent>
  </Card>
</template>