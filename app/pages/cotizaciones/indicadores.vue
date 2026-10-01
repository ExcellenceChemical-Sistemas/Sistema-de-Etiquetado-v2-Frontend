<script setup lang="ts">
import { ref, computed } from "vue";
import { ArrowLeft, Clock, PackageCheck, Timer, AlertTriangle, Download, Truck } from "@lucide/vue";
import { useCotizacionesQuery } from "~/composables/useCotizaciones";
import { formatFechaHora } from "~/utils/fechaHora";
import { horasHabilesEntre } from "~/utils/horasHabiles";
import { corteLimiteAvisoAlmacen, cumplioCorteAvisoAlmacen } from "~/utils/corteAvisoAlmacen";
import { ALERTA_COTIZACION_LABEL, CAMPO_COTIZACION_LABEL, type Cotizacion, type EstadoCotizacion } from "~/types/cotizacion";
import TendenciaMensualChart from "~/components/indicadores/TendenciaMensualChart.vue";
import ProgressBar from "~/components/ui/ProgressBar.vue";
import { FILL_AMBER, FILL_GREEN, type XlsxColumn } from "~/composables/useCsvExport";
import { usePdfExport } from "~/composables/usePdfExport";
import { COLOR_AMBAR, COLOR_VERDE, graficoColumnas } from "~/utils/graficosReporte";
import { construirReporte, filtrosMesAnio, sufijoPeriodo, type SeccionReporte } from "~/utils/reporteIndicadores";
import { construirReportePdf } from "~/utils/reportePdf";
import { urlSeguimiento } from "~/utils/seguimientoPedido";

// Mismos dos indicadores que hoy Katherine calcula a mano en el Excel del
// indicador comercial (DS-TIEMPO DE RESP-JOEL): tiempo de respuesta de
// cotización (meta 2h) y aviso a almacén tras la aprobación.
//
// El de aviso a almacén NO se mide en horas desde la aprobación: Joel no avisa apenas aprueba
// cada cotización, junta todas las del día y avisa en un solo corte a las 5pm hora Perú (política
// confirmada con el negocio, 2026-10-01). Medirlo en horas con una meta fija castigaba todo lo
// aprobado antes de las 5pm aunque Joel estuviera trabajando exactamente como corresponde — ver
// corteLimiteAvisoAlmacen()/cumplioCorteAvisoAlmacen() en utils/corteAvisoAlmacen.ts, mismo
// criterio que corte-aviso-almacen.ts del backend (la alerta "sin avisar a almacén").
const UMBRAL_COTIZACION_HORAS = 2;

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

// Bloque 2: aviso a almacén (aprobación -> aviso a almacén), medido contra el corte de las 5pm
// del día hábil en que se aprobó, no contra una cantidad fija de horas — ver nota arriba.
interface ConCorte extends Cotizacion {
  corteLimite: Date;
  cumplioCorte: boolean;
  horasHabilesDeAtraso: number; // 0 si cumplioCorte; si no, cuánto pasó el corte, en horas hábiles
}

const avisadasConCorte = computed<ConCorte[]>(() =>
  cotizacionesFiltradas.value
    .filter((c): c is Cotizacion & { pedidoAprobadoEn: string; avisoAlmacenEn: string } =>
      !!c.pedidoAprobadoEn && !!c.avisoAlmacenEn,
    )
    .map((c) => {
      const corteLimite = corteLimiteAvisoAlmacen(c.pedidoAprobadoEn);
      const cumplioCorte = cumplioCorteAvisoAlmacen(c.pedidoAprobadoEn, c.avisoAlmacenEn);
      return {
        ...c,
        corteLimite,
        cumplioCorte,
        horasHabilesDeAtraso: cumplioCorte ? 0 : horasHabilesEntre(corteLimite, c.avisoAlmacenEn),
      };
    }),
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

function resumenCorteDe(lista: ConCorte[]) {
  const total = lista.length;
  const cumple = lista.filter((c) => c.cumplioCorte).length;
  const fuera = total - cumple;
  const atrasos = lista.filter((c) => !c.cumplioCorte).map((c) => c.horasHabilesDeAtraso);
  const atrasoPromedio = atrasos.length ? atrasos.reduce((s, h) => s + h, 0) / atrasos.length : 0;
  return {
    total,
    cumple,
    fuera,
    pctCumple: total ? (cumple / total) * 100 : 0,
    pctFuera: total ? (fuera / total) * 100 : 0,
    atrasoPromedio,
    atrasoMaximo: atrasos.length ? Math.max(...atrasos) : 0,
  };
}

const resumenAviso = computed(() => resumenCorteDe(avisadasConCorte.value));

const peoresCotizacion = computed(() =>
  [...cotizadasConTiempo.value].filter((c) => c.horas > UMBRAL_COTIZACION_HORAS).sort((a, b) => b.horas - a.horas),
);
const peoresAviso = computed(() =>
  [...avisadasConCorte.value].filter((c) => !c.cumplioCorte).sort((a, b) => b.horasHabilesDeAtraso - a.horasHabilesDeAtraso),
);

function formatNumero(n: number, decimales = 1) {
  return n.toLocaleString("es-PE", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

// Registros cuya fecha de alguna etapa cayó en un feriado/fin de semana o dentro de una ausencia
// registrada de quien la cargó — ver Ausencias. No se excluyen de los promedios de arriba (eso
// podría esconder un problema real), se muestran aparte para que se revisen antes de confiar en
// el indicador.
const cotizacionesConAlertas = computed(() => cotizacionesFiltradas.value.filter((c) => c.alertas.length > 0));

// Tendencia mensual (gráfico): a diferencia de las tarjetas de arriba, ignora el filtro de mes —
// no tendría sentido un gráfico "por mes" mostrando un solo mes — pero sí respeta el año elegido,
// para no mezclar años distintos en el mismo eje.
const cotizacionesDelAnio = computed(() => {
  if (filtroAnio.value === "TODOS") return [];
  const anio = Number(filtroAnio.value);
  return (cotizaciones.value ?? []).filter((c) => new Date(c.requerimientoEn).getFullYear() === anio);
});

function tendenciaMensual(
  lista: Cotizacion[],
  horasDe: (c: Cotizacion) => number | null,
  umbral: number,
) {
  const porMes = Array.from({ length: 12 }, () => ({ total: 0, dentro: 0 }));
  for (const c of lista) {
    const horas = horasDe(c);
    if (horas === null) continue;
    const mes = new Date(c.requerimientoEn).getMonth();
    porMes[mes]!.total++;
    if (horas <= umbral) porMes[mes]!.dentro++;
  }
  return porMes
    .map((m, i) => ({ mes: MESES[i]!.slice(0, 3), total: m.total, dentro: m.dentro, pct: m.total ? (m.dentro / m.total) * 100 : 0 }))
    .filter((m) => m.total > 0);
}

const tendenciaCotizacion = computed(() =>
  tendenciaMensual(
    cotizacionesDelAnio.value,
    (c) => (c.cotizacionEnviadaEn ? horasHabilesEntre(c.requerimientoEn, c.cotizacionEnviadaEn) : null),
    UMBRAL_COTIZACION_HORAS,
  ),
);
// Para el aviso a almacén la tendencia mensual también se arma distinto: cada cotización vale
// 1 (cumplió su corte) o 0 (no), en vez de comparar horas contra un umbral fijo.
function tendenciaMensualCorte(lista: Cotizacion[]) {
  const porMes = Array.from({ length: 12 }, () => ({ total: 0, dentro: 0 }));
  for (const c of lista) {
    if (!c.pedidoAprobadoEn || !c.avisoAlmacenEn) continue;
    const mes = new Date(c.requerimientoEn).getMonth();
    porMes[mes]!.total++;
    if (cumplioCorteAvisoAlmacen(c.pedidoAprobadoEn, c.avisoAlmacenEn)) porMes[mes]!.dentro++;
  }
  return porMes
    .map((m, i) => ({ mes: MESES[i]!.slice(0, 3), total: m.total, dentro: m.dentro, pct: m.total ? (m.dentro / m.total) * 100 : 0 }))
    .filter((m) => m.total > 0);
}

const tendenciaAviso = computed(() => tendenciaMensualCorte(cotizacionesDelAnio.value));

// --- Bloque 3: trazabilidad de punta a punta con el Pedido (requerimiento -> entrega real) ---
// Cruza por numeroProforma (ver CLAUDE.md del backend). Solo entra a este bloque lo que ya tiene
// un Pedido con entregadoEn: es el único punto donde el ciclo completo está cerrado.
interface ConTiempoTotal extends Cotizacion {
  horasTotal: number;
}

const cotizacionesConEntrega = computed<ConTiempoTotal[]>(() =>
  cotizacionesFiltradas.value
    .filter((c): c is Cotizacion & { pedidoRelacionado: NonNullable<Cotizacion["pedidoRelacionado"]> & { entregadoEn: string } } =>
      !!c.pedidoRelacionado?.entregadoEn,
    )
    .map((c) => ({ ...c, horasTotal: horasHabilesEntre(c.requerimientoEn, c.pedidoRelacionado!.entregadoEn!) })),
);

// Cotizaciones ya aprobadas (el cliente dijo que sí) pero que todavía no tienen un Pedido
// registrado en el módulo de Pedidos — no es un error, solo informa que el ciclo sigue abierto.
const cotizacionesAprobadasSinPedido = computed(() =>
  cotizacionesFiltradas.value.filter(
    (c) => (c.estado === "APROBADO" || c.estado === "AVISADO_ALMACEN") && !c.pedidoRelacionado,
  ),
);

const resumenTrazabilidad = computed(() => {
  const lista = cotizacionesConEntrega.value;
  const total = lista.length;
  const promedio = total ? lista.reduce((s, c) => s + c.horasTotal, 0) / total : 0;
  const varianza = total ? lista.reduce((s, c) => s + (c.horasTotal - promedio) ** 2, 0) / total : 0;
  return {
    total,
    promedio,
    desviacion: Math.sqrt(varianza),
    maximo: total ? Math.max(...lista.map((c) => c.horasTotal)) : 0,
  };
});

const peoresTrazabilidad = computed(() => [...cotizacionesConEntrega.value].sort((a, b) => b.horasTotal - a.horasTotal).slice(0, 15));

function urlSeguimientoDe(c: ConTiempoTotal) {
  if (typeof window === "undefined") return "";
  return urlSeguimiento(window.location.origin, c.pedidoRelacionado!.tokenSeguimiento);
}

// --- Exportar el reporte completo (mismos filtros que la pantalla) ---
const { progress, isExporting, exportarPdf } = usePdfExport();

type Resumen = ReturnType<typeof resumenDe>;
type Tendencia = typeof tendenciaCotizacion.value;

function seccionIndicador(titulo: string, resumen: Resumen, umbral: number, tendencia: Tendencia): SeccionReporte {
  return {
    titulo,
    kpis: [
      ["Registros en el período", resumen.total],
      [`Dentro de ${umbral}h`, resumen.dentro],
      ["Fuera de plazo", resumen.fuera],
      [`% dentro de ${umbral}h (meta ≥80%)`, `${formatNumero(resumen.pctDentro, 0)}%`],
      ["Cumple la meta", resumen.total ? (resumen.pctDentro >= 80 ? "Sí" : "No") : "—"],
      ["Promedio (horas hábiles)", Number(resumen.promedio.toFixed(1))],
      ["Desviación estándar (h)", Number(resumen.desviacion.toFixed(1))],
      ["Tiempo máximo (h)", Number(resumen.maximo.toFixed(1))],
    ],
    graficos: [
      {
        titulo: "Cumplimiento mensual",
        nota:
          filtroAnio.value === "TODOS"
            ? undefined
            : `Año ${filtroAnio.value} completo (el gráfico no aplica el filtro de mes, igual que en pantalla).`,
        vacio: "Elegí un año en el filtro para incluir la tendencia mensual.",
        imagen: tendencia.length
          ? graficoColumnas(
              tendencia.map((m) => ({
                etiqueta: m.mes,
                valor: m.pct,
                texto: `${Math.round(m.pct)}%`,
                color: m.pct >= 80 ? COLOR_VERDE : COLOR_AMBAR,
              })),
              { maximo: 100, meta: 80, etiquetaMeta: "Meta 80%" },
            )
          : null,
        datos: {
          columnas: ["Mes", "Total", `Dentro de ${umbral}h`, "% cumplimiento"],
          filas: tendencia.map((m) => [m.mes, m.total, m.dentro, `${Math.round(m.pct)}%`]),
        },
      },
    ],
  };
}

type ResumenCorte = ReturnType<typeof resumenCorteDe>;

function seccionIndicadorCorte(resumen: ResumenCorte, tendencia: Tendencia): SeccionReporte {
  return {
    titulo: "Aviso a almacén",
    kpis: [
      ["Registros en el período", resumen.total],
      ["Avisadas antes o en su corte de las 5pm", resumen.cumple],
      ["Avisadas después de su corte", resumen.fuera],
      ["% que cumplió su corte (meta ≥80%)", `${formatNumero(resumen.pctCumple, 0)}%`],
      ["Cumple la meta", resumen.total ? (resumen.pctCumple >= 80 ? "Sí" : "No") : "—"],
      ["Atraso promedio de las que no cumplieron (horas hábiles)", Number(resumen.atrasoPromedio.toFixed(1))],
      ["Atraso máximo (h)", Number(resumen.atrasoMaximo.toFixed(1))],
    ],
    graficos: [
      {
        titulo: "Cumplimiento mensual",
        nota:
          filtroAnio.value === "TODOS"
            ? undefined
            : `Año ${filtroAnio.value} completo (el gráfico no aplica el filtro de mes, igual que en pantalla).`,
        vacio: "Elegí un año en el filtro para incluir la tendencia mensual.",
        imagen: tendencia.length
          ? graficoColumnas(
              tendencia.map((m) => ({
                etiqueta: m.mes,
                valor: m.pct,
                texto: `${Math.round(m.pct)}%`,
                color: m.pct >= 80 ? COLOR_VERDE : COLOR_AMBAR,
              })),
              { maximo: 100, meta: 80, etiquetaMeta: "Meta 80%" },
            )
          : null,
        datos: {
          columnas: ["Mes", "Total", "Cumplió su corte", "% cumplimiento"],
          filas: tendencia.map((m) => [m.mes, m.total, m.dentro, `${Math.round(m.pct)}%`]),
        },
      },
    ],
  };
}

const columnasAvisoCorte: XlsxColumn<ConCorte>[] = [
  { key: (c) => c.cliente.nombre, label: "Cliente", width: 36 },
  { key: (c) => c.numeroProforma ?? "", label: "N° Proforma" },
  { key: (c) => formatFechaHora(c.pedidoAprobadoEn!), label: "Pedido aprobado", width: 22 },
  { key: (c) => formatFechaHora(c.corteLimite.toISOString()), label: "Corte límite (5pm)", width: 22 },
  { key: (c) => formatFechaHora(c.avisoAlmacenEn!), label: "Avisado a almacén", width: 22 },
  {
    key: (c) => (c.cumplioCorte ? "Cumplió su corte" : "Fuera de plazo"),
    label: "Resultado",
    width: 18,
    colorFill: (v) => (v === "Cumplió su corte" ? FILL_GREEN : FILL_AMBER),
  },
  { key: (c) => (c.cumplioCorte ? 0 : Number(c.horasHabilesDeAtraso.toFixed(1))), label: "Horas hábiles de atraso" },
  { key: (c) => (c.alertas.length ? "Sí" : ""), label: "Con alerta" },
];

function columnasTiempo(umbral: number, desde: string, hasta: string, campoDesde: keyof Cotizacion, campoHasta: keyof Cotizacion): XlsxColumn<ConHoras>[] {
  return [
    { key: (c) => c.cliente.nombre, label: "Cliente", width: 36 },
    { key: (c) => c.numeroProforma ?? "", label: "N° Proforma" },
    { key: (c) => formatFechaHora(c[campoDesde] as string), label: desde, width: 22 },
    { key: (c) => formatFechaHora(c[campoHasta] as string), label: hasta, width: 22 },
    { key: (c) => Number(c.horas.toFixed(1)), label: "Horas hábiles" },
    {
      key: (c) => (c.horas <= umbral ? "Dentro de plazo" : "Fuera de plazo"),
      label: `Meta ≤${umbral}h`,
      width: 18,
      colorFill: (v) => (v === "Dentro de plazo" ? FILL_GREEN : FILL_AMBER),
    },
    { key: (c) => (c.alertas.length ? "Sí" : ""), label: "Con alerta" },
  ];
}

const columnasTrazabilidad: XlsxColumn<ConTiempoTotal>[] = [
  { key: (c) => c.cliente.nombre, label: "Cliente", width: 36 },
  { key: (c) => c.numeroProforma ?? "", label: "N° Proforma" },
  { key: (c) => formatFechaHora(c.requerimientoEn), label: "Requerimiento", width: 22 },
  { key: (c) => formatFechaHora(c.pedidoRelacionado!.entregadoEn!), label: "Entregado al cliente", width: 22 },
  { key: (c) => Number(c.horasTotal.toFixed(1)), label: "Horas hábiles totales" },
  { key: (c) => Number((c.horasTotal / 24).toFixed(2)), label: "Días totales" },
];

const columnasAlertas: XlsxColumn<Cotizacion>[] = [
  { key: (c) => c.cliente.nombre, label: "Cliente", width: 36 },
  { key: (c) => c.numeroProforma ?? "", label: "N° Proforma" },
  {
    key: (c) => c.alertas.map((a) => `${CAMPO_COTIZACION_LABEL[a.campo]}: ${ALERTA_COTIZACION_LABEL[a.tipo]}`).join(" | "),
    label: "Motivo",
    width: 90,
  },
];

const hayDatos = computed(() => cotizacionesFiltradas.value.length > 0);

function exportarReporte() {
  exportarPdf(
    () =>
      construirReportePdf({
        titulo: "Indicador de tiempo de respuesta — Cotizaciones",
        descripcion: `Cotización: horas hábiles (lun-vie 7:30-17:30, sin feriados), meta ≤${UMBRAL_COTIZACION_HORAS}h. Aviso a almacén: Joel avisa en un solo corte diario a las 5pm, así que se mide si se avisó antes o en el corte del día hábil en que se aprobó, no en horas. Meta en ambos: ≥80% de los casos.`,
        filtros: filtrosMesAnio(filtroMes.value, filtroAnio.value),
        secciones: [
          {
            titulo: "Alertas de integridad",
            kpis: [
              ["Registros con alerta (revisar antes de confiar en el promedio)", cotizacionesConAlertas.value.length],
            ],
          },
          seccionIndicador("Tiempo de respuesta de cotización", resumenCotizacion.value, UMBRAL_COTIZACION_HORAS, tendenciaCotizacion.value),
          seccionIndicadorCorte(resumenAviso.value, tendenciaAviso.value),
          {
            titulo: "Trazabilidad con el pedido (requerimiento → entrega real)",
            kpis: [
              ["Cotizaciones con pedido entregado", resumenTrazabilidad.value.total],
              ["Aprobadas sin pedido registrado todavía", cotizacionesAprobadasSinPedido.value.length],
              ["Tiempo total promedio (horas hábiles)", Number(resumenTrazabilidad.value.promedio.toFixed(1))],
              ["Tiempo total promedio (días)", Number((resumenTrazabilidad.value.promedio / 24).toFixed(2))],
              ["Desviación estándar (h)", Number(resumenTrazabilidad.value.desviacion.toFixed(1))],
              ["Tiempo total máximo (h)", Number(resumenTrazabilidad.value.maximo.toFixed(1))],
            ],
          },
        ],
        hojas: [
          {
            nombre: "Respuesta de cotización",
            filas: [...cotizadasConTiempo.value].sort((a, b) => b.horas - a.horas),
            columnas: columnasTiempo(UMBRAL_COTIZACION_HORAS, "Requerimiento", "Cotización enviada", "requerimientoEn", "cotizacionEnviadaEn"),
          },
          {
            nombre: "Aviso a almacén",
            filas: [...avisadasConCorte.value].sort((a, b) => b.horasHabilesDeAtraso - a.horasHabilesDeAtraso),
            columnas: columnasAvisoCorte,
          },
          {
            nombre: "Trazabilidad con pedido",
            filas: [...cotizacionesConEntrega.value].sort((a, b) => b.horasTotal - a.horasTotal),
            columnas: columnasTrazabilidad,
          },
          { nombre: "Alertas de integridad", filas: cotizacionesConAlertas.value, columnas: columnasAlertas },
        ],
      }),
    `indicadores-cotizaciones-${sufijoPeriodo(filtroMes.value, filtroAnio.value)}.pdf`,
  );
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
          y aviso a almacén avisado en el corte diario de las 5pm (Joel junta las del día y avisa en un solo corte, no apenas aprueba cada una).
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
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
        <Button
          variant="outline"
          :disabled="isPending || isExporting || !hayDatos"
          class="min-w-[168px] justify-center"
          @click="exportarReporte"
        >
          <template v-if="isExporting">
            <ProgressBar :value="progress" compact class="w-20" />
            <span class="ml-2 text-xs tabular-nums text-muted-foreground">{{ Math.round(progress) }}%</span>
          </template>
          <template v-else>
            <Download class="h-4 w-4 mr-2" />
            Exportar PDF
          </template>
        </Button>
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
          <Card v-if="cotizacionesConAlertas.length > 0" class="border-amber-500/40 bg-amber-500/10">
            <CardHeader class="pb-2">
              <CardTitle class="flex items-center gap-1.5 text-sm font-medium text-amber-700">
                <AlertTriangle class="h-4 w-4" />
                {{ cotizacionesConAlertas.length }} registro(s) con alerta de integridad — revisar antes de confiar en el promedio
              </CardTitle>
            </CardHeader>
            <CardContent class="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Proforma</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="c in cotizacionesConAlertas" :key="c.id">
                    <TableCell class="max-w-40 truncate">{{ c.cliente.nombre }}</TableCell>
                    <TableCell>{{ c.numeroProforma ?? "—" }}</TableCell>
                    <TableCell class="text-xs">
                      <div v-for="(a, i) in c.alertas" :key="i">
                        <span class="font-medium">{{ CAMPO_COTIZACION_LABEL[a.campo] }}</span>:
                        {{ ALERTA_COTIZACION_LABEL[a.tipo] }}
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

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

            <Card>
              <CardHeader class="pb-2">
                <CardTitle class="text-sm font-medium text-muted-foreground">
                  Cumplimiento mensual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TendenciaMensualChart :datos="tendenciaCotizacion" :meta="80" />
              </CardContent>
            </Card>

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

          <!-- Bloque 2: aviso a almacén, contra el corte diario de las 5pm -->
          <section class="space-y-3">
            <h2 class="text-lg font-semibold">Aviso a almacén</h2>
            <p class="text-sm text-muted-foreground">
              Joel avisa a almacén en un solo corte diario a las 5pm (no apenas aprueba cada cotización): se mide si
              se avisó antes o en el corte del día hábil en que se aprobó, no en horas desde la aprobación.
            </p>
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">Avisadas en el período</CardTitle>
                  <PackageCheck class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold">{{ resumenAviso.total }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ resumenAviso.cumple }} cumplieron su corte · {{ resumenAviso.fuera }} fuera de plazo
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">% que cumplió su corte</CardTitle>
                  <Clock class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold" :class="resumenAviso.pctCumple >= 80 ? 'text-green-600' : 'text-amber-600'">
                    {{ formatNumero(resumenAviso.pctCumple, 0) }}%
                  </p>
                  <p class="text-xs text-muted-foreground">Meta: ≥80%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">Atraso promedio</CardTitle>
                  <Timer class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold">{{ formatNumero(resumenAviso.atrasoPromedio) }}h</p>
                  <p class="text-xs text-muted-foreground">Solo entre las que no cumplieron su corte</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">Atraso máximo</CardTitle>
                  <AlertTriangle class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold">{{ formatNumero(resumenAviso.atrasoMaximo) }}h</p>
                  <p class="text-xs text-muted-foreground">El aviso más demorado del período</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader class="pb-2">
                <CardTitle class="text-sm font-medium text-muted-foreground">
                  Cumplimiento mensual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TendenciaMensualChart :datos="tendenciaAviso" :meta="80" />
              </CardContent>
            </Card>

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
                      <TableHead>Corte límite (5pm)</TableHead>
                      <TableHead>Avisado a almacén</TableHead>
                      <TableHead class="text-right">Horas de atraso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="c in peoresAviso" :key="c.id">
                      <TableCell class="max-w-40 truncate">{{ c.cliente.nombre }}</TableCell>
                      <TableCell>{{ c.numeroProforma }}</TableCell>
                      <TableCell>{{ formatFechaHora(c.pedidoAprobadoEn) }}</TableCell>
                      <TableCell>{{ formatFechaHora(c.corteLimite.toISOString()) }}</TableCell>
                      <TableCell>{{ formatFechaHora(c.avisoAlmacenEn) }}</TableCell>
                      <TableCell class="text-right font-medium text-amber-600">{{ formatNumero(c.horasHabilesDeAtraso) }}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          <!-- Bloque 3: trazabilidad de punta a punta con el pedido -->
          <section class="space-y-3">
            <h2 class="text-lg font-semibold">Trazabilidad con el pedido</h2>
            <p class="text-sm text-muted-foreground">
              Del requerimiento del cliente a la entrega real, cruzando con el módulo de Pedidos por N° de proforma.
            </p>
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">Con pedido entregado</CardTitle>
                  <Truck class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold">{{ resumenTrazabilidad.total }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ cotizacionesAprobadasSinPedido.length }} aprobada(s) sin pedido registrado todavía
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">Tiempo total promedio</CardTitle>
                  <Timer class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold">{{ formatNumero(resumenTrazabilidad.promedio) }}h</p>
                  <p class="text-xs text-muted-foreground">
                    {{ formatNumero(resumenTrazabilidad.promedio / 24, 2) }} días · desv. estándar {{ formatNumero(resumenTrazabilidad.desviacion) }}h
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-muted-foreground">Tiempo total máximo</CardTitle>
                  <AlertTriangle class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-semibold">{{ formatNumero(resumenTrazabilidad.maximo) }}h</p>
                  <p class="text-xs text-muted-foreground">El ciclo completo más demorado del período</p>
                </CardContent>
              </Card>
            </div>

            <Card v-if="peoresTrazabilidad.length > 0">
              <CardHeader class="pb-2">
                <CardTitle class="text-sm font-medium text-muted-foreground">
                  Ciclo completo más lento (top {{ peoresTrazabilidad.length }})
                </CardTitle>
              </CardHeader>
              <CardContent class="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Proforma</TableHead>
                      <TableHead>Requerimiento</TableHead>
                      <TableHead>Entregado</TableHead>
                      <TableHead class="text-right">Horas totales</TableHead>
                      <TableHead>Seguimiento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="c in peoresTrazabilidad" :key="c.id">
                      <TableCell class="max-w-40 truncate">{{ c.cliente.nombre }}</TableCell>
                      <TableCell>{{ c.numeroProforma }}</TableCell>
                      <TableCell>{{ formatFechaHora(c.requerimientoEn) }}</TableCell>
                      <TableCell>{{ formatFechaHora(c.pedidoRelacionado!.entregadoEn!) }}</TableCell>
                      <TableCell class="text-right font-medium text-amber-600">{{ formatNumero(c.horasTotal) }}</TableCell>
                      <TableCell>
                        <a :href="urlSeguimientoDe(c)" target="_blank" class="text-xs text-primary hover:underline">Ver enlace</a>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <p v-else class="text-sm text-muted-foreground">
              Ninguna cotización del período tiene todavía un pedido entregado.
            </p>
          </section>
        </div>
      </ScrollArea>
    </template>
  </div>
</template>
