<!-- pages/kpis/index.vue -->
<script setup lang="ts">
import { FolderKanban, ChevronRight } from "@lucide/vue";
import { useAccesoKpisIso } from '~/composables/useAccesoKpisIso'

const { listarRaices } = useCarpetas()
const { cargar: cargarUsuarioActual } = useUsuarioActual()
const { puedeVerCarpeta } = useAccesoKpisIso()

const raices = ref<Awaited<ReturnType<typeof listarRaices>>>([])
const cargando = ref(true)

onMounted(async () => {
  // el filtro de abajo depende de usuarioActual, así que se pide en paralelo
  const [lista] = await Promise.all([listarRaices(), cargarUsuarioActual()])
  raices.value = lista
  cargando.value = false
})

/**
 * GET /carpetas/raiz devuelve las dos raíces (KPIs e ISO) a todo el mundo;
 * acá se muestran solo las que el usuario puede abrir, igual que
 * archivosVisibles en [id].vue.
 */
const raicesVisibles = computed(() => raices.value.filter((r) => puedeVerCarpeta(r)))
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="shrink-0">
      <h1 class="text-2xl font-semibold">KPIs y Documentación ISO</h1>
      <p class="text-sm text-muted-foreground">
        Indicadores por proceso y documentación del sistema de gestión
      </p>
    </div>

    <div v-if="cargando" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card v-for="n in 2" :key="n">
        <CardHeader>
          <div class="flex items-center gap-3">
            <Skeleton class="h-9 w-9 rounded-md" />
            <div class="space-y-2">
              <Skeleton class="h-5 w-44" />
              <Skeleton class="h-4 w-16" />
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>

    <p v-else-if="raicesVisibles.length === 0" class="text-sm text-muted-foreground">
      No hay carpetas disponibles.
    </p>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="raiz in raicesVisibles"
        :key="raiz.id"
        :to="`/kpis/${raiz.id}`"
        class="group"
      >
        <Card
          class="h-full transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
          <CardHeader>
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-start gap-3">
                <div class="shrink-0 rounded-md bg-primary/10 p-2">
                  <FolderKanban class="h-5 w-5 text-primary" />
                </div>
                <div class="min-w-0 space-y-1">
                  <CardTitle class="truncate text-base">
                    {{ raiz.nombre }}
                  </CardTitle>
                  <Badge variant="secondary">{{ raiz.modulo }}</Badge>
                </div>
              </div>
              <ChevronRight
                class="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary"
              />
            </div>
          </CardHeader>
        </Card>
      </NuxtLink>
    </div>
  </div>
</template>
