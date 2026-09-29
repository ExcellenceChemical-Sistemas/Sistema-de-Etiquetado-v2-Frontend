<script setup lang="ts">
import { ref, computed } from "vue";
import { ArrowLeft, Clock, PackageCheck, Timer, AlertTriangle } from "@lucide/vue";
import { useCotizacionesQuery } from "~/composables/useCotizaciones";
import { formatFechaHora } from "~/utils/fechaHora";
import { horasHabilesEntre } from "~/utils/horasHabiles";
import type { Cotizacion, EstadoCotizacion } from "~/types/cotizacion";

// Mismos dos indicadores que hoy Katherine calcula a mano en el Excel del
// indicador comercial (DS-TIEMPO DE RESP-JOEL): tiempo de respuesta de
// cotización (meta 2h) y tiempo de aviso a almacén tras la aprobación (meta 1h).
const UMBRAL_COTIZACION_HORAS = 2;
const UMBRAL_AVISO_HORAS = 1;

const filtroTodas = ref<EstadoCotizacion | "TODOS">("TODOS");
const { data: cotizaciones, isPending, isError, refetch } = useCotizacionesQuery(filtroTodas);

const filtroMes = ref("TODOS");
const filtroAnio = ref("TODOS");

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const aniosDisponibles = computed(() => {
  const anios = new Set((cotizaciones.value ?? []).map((c) => new Date(c.requerimientoEn).getFullYear()));
  return Array.from(anios).sort((a, b) => b - a);
});

const cotizacionesFiltradas = computed(() => {
  let lista = cotizaciones.value ?? [];
  if (filtroMes.value !== "TODOS") {
    const mes = Number(filtroMes.value);
    lista = lista.filter((c) => new Date(c.requerimientoEn).getMonth() === mes);
  }
  if (filtroAnio.value !== "TODOS") {
    const anio = Number(filtroAnio.value);
    lista = lista.filter((c) => new Date(c.requerimientoEn).getFullYear() === anio);
  }
  return lista;
});

interface ConHoras extends Cotizacion {
  horas: number;
}

// Bloque 1: tiempo de respuesta de cotización (requerimiento -> cotización enviada), en horas
// hábiles (lunes a viernes, 7:30-17:30, sin feriados) — igual criterio que el Excel de Katherine.
const cotizadasConTiempo = computed<ConHoras[]>(() =>
  cotizacionesFiltradas.value
    .filter((c): c is Cotizacion & { cotizacionEnviadaEn: string } => !!c.cotizacionEnviadaEn)
    .map((c) => ({
      ...c,
      horas: horasHabilesEntre(c.requerimientoEn, c.cotizacionEnviadaEn),
    })),
);

// Bloque 2: tiempo de aviso a almacén (aprobación -> aviso a almacén).
const avisadasConTiempo = computed<ConHoras[]>(() =>
  cotizacionesFiltradas.value
    .filter((c): c is Cotizacion & { pedidoAprobadoEn: string; avisoAlmacenEn: string } =>
      !!c.pedidoAprobadoEn && !!c.avisoAlmacenEn,
    )
    .map((c) => ({
      ...c,
      horas: horasHabilesEntre(c.pedidoAprobadoEn, c.avisoAlmacenEn),
    })),
);

function resumenDe(lista: ConHoras[], umbral: number) {
  const total = lista.length;
  const dentro = lista.filter((c) => c.horas <= umbral).length;
  const fuera = total - dentro;
  const promedio = total ? lista.reduce((s, c) => s + c.horas, 0) / total : 0;
  const varianza = total ? lista.reduce((s, c) => s + (c.horas - promedio) ** 2, 0) / total : 0;
  return {
    total,
    dentro,
    fuera,
    pctDentro: total ? (dentro / total) * 100 : 0,
    pctFuera: total ? (fuera / total) * 100 : 0,
    promedio,
    desviacion: Math.sqrt(varianza),
    maximo: total ? Math.max(...lista.map((c) => c.horas)) : 0,
  };
}

const resumenCotizacion = computed(() => resumenDe(cotizadasConTiempo.value, UMBRAL_COTIZACION_HORAS));
const resumenAviso = computed(() => resumenDe(avisadasConTiempo.value, UMBRAL_AVISO_HORAS));

const peoresCotizacion = computed(() =>
  [...cotizadasConTiempo.value].filter((c) => c.horas > UMBRAL_COTIZACION_HORAS).sort((a, b) => b.horas - a.horas),
);
const peoresAviso = computed(() =>
  [...avisadasConTiempo.value].filter((c) => c.horas > UMBRAL_AVISO_HORAS).sort((a, b) => b.horas - a.horas),
);

function formatNumero(n: number, decimales = 1) {
  return n.toLocaleString("es-PE", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div>
        <NuxtLink to="/cotizaciones" class="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
          <ArrowLeft class="h-3.5 w-3.5" />
          Volver a Cotizaciones
        </NuxtLink>
        <h1 class="text-2xl font-semibold">Indicador de tiempo de respuesta</h1>
        <p class="text-sm text-muted-foreground">
          Mismas dos métricas que hoy se llevan a mano: respuesta de cotización (meta ≤{{ UMBRAL_COTIZACION_HORAS }}h)
          y aviso a almacén tras la aprobación (meta ≤{{ UMBRAL_AVISO_HORAS }}h).
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Select v-model="filtroMes">
          <SelectTrigger class="w-40" aria-label="Filtrar por mes">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los meses</SelectItem>
            <SelectItem v-for="(mes, i) in MESES" :key="i" :value="String(i)">{{ mes }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filtroAnio">
          <SelectTrigger class="w-28" aria-label="Filtrar por año">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem v-for="anio in aniosDisponibles" :key="anio" :value="String(anio)">
              {{ anio }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <template v-if="isPending">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton v-for="i in 4" :key="i" class="h-24 w-full" />
      </div>
    </template>

    <template v-else-if="isError">
      <div class="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p class="text-sm text-destructive">No se pudieron cargar las cotizaciones</p>
        <Button variant="outline" size="sm" @click="refetch()">Reintentar</Button>
      </div>
    </template>

    <template v-else>
      <ScrollArea class="min-h-0 flex-1">
        <div class="space-y-6 pr-2">
          <!-- Bloque 1: tiempo de respuesta de cotización -->
          <section class="space-y-3">
            <h2 class="text-lg font-semibold">Tiempo de respuesta de cotización</h2>
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">Cotizadas en el período</CardTitle>
                  <PackageCheck class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold">{{ resumenCotizacion.total }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ resumenCotizacion.dentro }} dentro de {{ UMBRAL_COTIZACION_HORAS }}h · {{ resumenCotizacion.fuera }} fuera de plazo
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">% dentro de {{ UMBRAL_COTIZACION_HORAS }}h</CardTitle>
                  <Clock class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold" :class="resumenCotizacion.pctDentro >= 80 ? 'text-green-600' : 'text-amber-600'">
                    {{ formatNumero(resumenCotizacion.pctDentro, 0) }}%
                  </p>
                  <p class="text-xs text-muted-foreground">Meta: ≥80%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">Promedio</CardTitle>
                  <Timer class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold">{{ formatNumero(resumenCotizacion.promedio) }}h</p>
                  <p class="text-xs text-muted-foreground">desv. estándar {{ formatNumero(resumenCotizacion.desviacion) }}h</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">Tiempo máximo</CardTitle>
                  <AlertTriangle class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold">{{ formatNumero(resumenCotizacion.maximo) }}h</p>
                  <p class="text-xs text-muted-foreground">La cotización más demorada del período</p>
                </CardContent>
              </Card>
            </div>

            <Card v-if="peoresCotizacion.length > 0">
              <CardHeader class="pb-2">
                <CardTitle class="text-sm font-medium text-muted-foreground">
                  Fuera de plazo ({{ peoresCotizacion.length }})
                </CardTitle>
              </CardHeader>
              <CardContent class="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Proforma</TableHead>
                      <TableHead>Requerimiento</TableHead>
                      <TableHead>Cotización enviada</TableHead>
                      <TableHead class="text-right">Horas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="c in peoresCotizacion" :key="c.id">
                      <TableCell class="max-w-40 truncate">{{ c.cliente.nombre }}</TableCell>
                      <TableCell>{{ c.numeroProforma }}</TableCell>
                      <TableCell>{{ formatFechaHora(c.requerimientoEn) }}</TableCell>
                      <TableCell>{{ formatFechaHora(c.cotizacionEnviadaEn) }}</TableCell>
                      <TableCell class="text-right font-medium text-amber-600">{{ formatNumero(c.horas) }}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          <!-- Bloque 2: tiempo de aviso a almacén -->
          <section class="space-y-3">
            <h2 class="text-lg font-semibold">Tiempo de aviso a almacén</h2>
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">Avisadas en el período</CardTitle>
                  <PackageCheck class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold">{{ resumenAviso.total }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ resumenAviso.dentro }} dentro de {{ UMBRAL_AVISO_HORAS }}h · {{ resumenAviso.fuera }} fuera de plazo
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">% dentro de {{ UMBRAL_AVISO_HORAS }}h</CardTitle>
                  <Clock class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold" :class="resumenAviso.pctDentro >= 80 ? 'text-green-600' : 'text-amber-600'">
                    {{ formatNumero(resumenAviso.pctDentro, 0) }}%
                  </p>
                  <p class="text-xs text-muted-foreground">Meta: ≥80%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">Promedio</CardTitle>
                  <Timer class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold">{{ formatNumero(resumenAviso.promedio) }}h</p>
                  <p class="text-xs text-muted-foreground">desv. estándar {{ formatNumero(resumenAviso.desviacion) }}h</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">Tiempo máximo</CardTitle>
                  <AlertTriangle class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold">{{ formatNumero(resumenAviso.maximo) }}h</p>
                  <p class="text-xs text-muted-foreground">El aviso más demorado del período</p>
                </CardContent>
              </Card>
            </div>

            <Card v-if="peoresAviso.length > 0">
              <CardHeader class="pb-2">
                <CardTitle class="text-sm font-medium text-muted-foreground">
                  Fuera de plazo ({{ peoresAviso.length }})
                </CardTitle>
              </CardHeader>
              <CardContent class="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Proforma</TableHead>
                      <TableHead>Pedido aprobado</TableHead>
                      <TableHead>Avisado a almacén</TableHead>
                      <TableHead class="text-right">Horas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="c in peoresAviso" :key="c.id">
                      <TableCell class="max-w-40 truncate">{{ c.cliente.nombre }}</TableCell>
                      <TableCell>{{ c.numeroProforma }}</TableCell>
                      <TableCell>{{ formatFechaHora(c.pedidoAprobadoEn) }}</TableCell>
                      <TableCell>{{ formatFechaHora(c.avisoAlmacenEn) }}</TableCell>
                      <TableCell class="text-right font-medium text-amber-600">{{ formatNumero(c.horas) }}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        </div>
      </ScrollArea>
    </template>
  </div>
</template>
