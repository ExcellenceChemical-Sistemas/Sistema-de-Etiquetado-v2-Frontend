<script setup lang="ts">
import { computed } from 'vue'
import { Package, Layers, Factory, Printer, TriangleAlert, Plus, ArrowRight } from '@lucide/vue'
import { useProductos } from '~/composables/useProductos'
import { useLotes } from '~/composables/useLotes'

// Misma regla que el sidebar y el middleware: sin puedeVer no se consulta ni se muestra.
const permisoProductos = usePermiso('PRODUCTOS')
const permisoLotes = usePermiso('LOTES')
const permisoFabricantes = usePermiso('FABRICANTES')
const permisoEtiquetas = usePermiso('ETIQUETAS')

const { data: productos, isPending: cargandoProductos } = useProductos({ enabled: () => permisoProductos.puedeVer })
const { data: lotes, isPending: cargandoLotes } = useLotes({ enabled: () => permisoLotes.puedeVer })
const { data: fabricantes, isPending: cargandoFabricantes } = useFabricantesQuery({ enabled: () => permisoFabricantes.puedeVer })

const totalProductos = computed(() => productos.value?.length ?? 0)
const totalLotes = computed(() => lotes.value?.length ?? 0)
const totalFabricantes = computed(() => fabricantes.value?.length ?? 0)

// lotes que vencen en los próximos 30 días — ajusta el campo si tu
// tipo Lote usa otro nombre para la fecha de vencimiento
const lotesPorVencer = computed(() => {
  if (!lotes.value) return 0
  const hoy = new Date()
  const limite = new Date()
  limite.setDate(hoy.getDate() + 30)
  return lotes.value.filter((l) => {
    const venc = new Date(l.fechaVencimiento)
    return venc >= hoy && venc <= limite
  }).length
})

// tres "resguardos" de datos, con el número tratado como lectura de
// instrumento (tabular, monoespaciado) — el mismo lenguaje visual que
// LOTE / PESO BRUTO en la etiqueta impresa

const resguardos = computed(() =>
  [
    {
      label: 'Productos',
      value: totalProductos.value,
      loading: cargandoProductos.value,
      icon: Package,
      to: '/productos',
      visible: permisoProductos.puedeVer,
    },
    {
      label: 'Lotes',
      value: totalLotes.value,
      loading: cargandoLotes.value,
      icon: Layers,
      to: '/lotes',
      visible: permisoLotes.puedeVer,
    },
    {
      label: 'Fabricantes',
      value: totalFabricantes.value,
      loading: cargandoFabricantes.value,
      icon: Factory,
      to: '/fabricantes',
      visible: permisoFabricantes.puedeVer,
    },
  ].filter((r) => r.visible),
)

const accesosRapidos = [
  { label: 'Nuevo producto', to: '/productos', icon: Package },
  { label: 'Nuevo lote', to: '/lotes', icon: Layers },
  { label: 'Nuevo fabricante', to: '/fabricantes', icon: Factory },
]
</script>

<template>
  <div class="p-6 space-y-8 max-w-5xl">
    <!-- cabecera: marca + eyebrow + estado, como el encabezado de una hoja de planta -->
    <div class="flex items-baseline justify-between gap-4 border-b pb-4">
      <div class="flex items-center gap-3">
        <img
          src="/excellence-chemical-icon.png"
          alt="Excellence Chemical"
          class="h-7 w-7 shrink-0 self-start mt-0.5"
        />
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Excellence Chemical S.A.C.
          </p>
          <h1 class="text-2xl font-semibold mt-1">Panel de etiquetado</h1>
        </div>
      </div>
      <div class="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
        <span class="relative flex h-2 w-2">
          <span
            class="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
          />
          <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Sistema activo
      </div>
    </div>

    <!-- hero: la acción que define el sistema, con la piel de una etiqueta real -->
    <NuxtLink v-if="permisoEtiquetas.puedeCrear" to="/generar-etiqueta" class="block group">
      <div
        class="label-card relative overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow duration-200
               group-hover:shadow-md"
      >
        <div class="flex items-center gap-5 px-6 py-6 sm:px-8 sm:py-7">
          <div class="rounded-md bg-primary/10 p-4 shrink-0">
            <Printer class="h-8 w-8 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Acción principal
            </p>
            <p class="text-xl font-semibold mt-0.5">Generar etiqueta</p>
            <p class="text-sm text-muted-foreground mt-0.5">
              Elige un lote e imprime su etiqueta, con o sin rombo NFPA.
            </p>
          </div>
          <div
            class="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary shrink-0
                   opacity-70 group-hover:opacity-100 transition-opacity"
          >
            Imprimir
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </NuxtLink>

    <!-- alerta de vencimiento: franja de riesgo, no una card llena de color -->
    <div
      v-if="permisoLotes.puedeVer && !cargandoLotes && lotesPorVencer > 0"
      class="flex items-stretch gap-3 rounded-md border border-amber-200 bg-amber-50/60 overflow-hidden"
    >
      <div class="w-1.5 shrink-0 hazard-stripe" />
      <div class="flex items-center gap-3 py-3 pr-4 flex-1 min-w-0">
        <TriangleAlert class="h-4 w-4 text-amber-700 shrink-0" />
        <p class="text-sm text-amber-900 flex-1">
          <strong class="font-mono tabular-nums">{{ lotesPorVencer }}</strong>
          lote{{ lotesPorVencer === 1 ? '' : 's' }}
          vence{{ lotesPorVencer === 1 ? '' : 'n' }} en los próximos 30 días.
        </p>
        <NuxtLink to="/lotes" class="text-sm font-medium text-amber-900 underline shrink-0">
          Revisar
        </NuxtLink>
      </div>
    </div>

    <!-- resguardos: lectura de instrumento, números tabulares -->
    <div v-if="resguardos.length">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
        Registrado en el sistema
      </p>
      <div class="grid gap-px rounded-lg border bg-border sm:grid-cols-3 overflow-hidden">
        <NuxtLink
          v-for="r in resguardos"
          :key="r.label"
          :to="r.to"
          class="group bg-card px-6 py-5 flex items-center justify-between gap-3 hover:bg-primary/5 transition-colors"
        >
          <div>
            <Skeleton v-if="r.loading" class="h-8 w-14" />
            <p v-else class="text-3xl font-mono tabular-nums font-semibold leading-none">
              {{ String(r.value).padStart(2, '0') }}
            </p>
            <p class="text-xs uppercase tracking-wide text-muted-foreground mt-2">{{ r.label }}</p>
          </div>
          <component
            :is="r.icon"
            class="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0"
          />
        </NuxtLink>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* esquina despegada, como el margen de una etiqueta autoadhesiva */
.label-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 26px;
  height: 26px;
  background: linear-gradient(135deg, transparent 50%, rgb(0 0 0 / 0.06) 50%);
}

/* franja diagonal tipo cinta de peligro, discreta */
.hazard-stripe {
  background-image: repeating-linear-gradient(
    -45deg,
    rgb(217 119 6 / 0.55) 0px,
    rgb(217 119 6 / 0.55) 4px,
    rgb(251 191 36 / 0.55) 4px,
    rgb(251 191 36 / 0.55) 8px
  );
}

@media (prefers-reduced-motion: reduce) {
  .label-card {
    transition: none !important;
  }
}
</style>