import { formatFechaHora } from './fechaHora'
import type { Pedido } from '~/types/pedido'
import type { Cotizacion } from '~/types/cotizacion'

// Mismo criterio que el backend (ver orden-etapas.ts): valida con la foto final (lo que ya
// estaba + el valor nuevo que se está marcando/corrigiendo), no solo el campo tocado — así se
// atrapa también una corrección de una etapa intermedia que rompe el orden contra otra ya
// marcada. Esto es solo para no hacer el viaje redondo al servidor con un error; el backend
// aplica la misma regla igual, nunca confiar solo en esto.
function primeraFueraDeOrden(etapas: { label: string; valor: Date | null }[]): string | null {
  let anterior: { label: string; valor: Date } | null = null;
  for (const etapa of etapas) {
    if (!etapa.valor) continue;
    if (anterior && etapa.valor.getTime() < anterior.valor.getTime()) {
      return (
        `"${etapa.label}" no puede quedar antes de "${anterior.label}" — el proceso debe respetar su orden ` +
        `(${anterior.label}: ${formatFechaHora(anterior.valor.toISOString())}, ${etapa.label}: ${formatFechaHora(etapa.valor.toISOString())}).`
      );
    }
    anterior = { label: etapa.label, valor: etapa.valor };
  }
  return null;
}

const ETAPAS_PEDIDO = [
  { campo: 'recibidoEn', label: 'Recibido' },
  { campo: 'inicioPreparacionEn', label: 'Inicio de preparación' },
  { campo: 'preparadoEn', label: 'Preparado' },
  { campo: 'salioEn', label: 'Salió' },
  { campo: 'entregadoEn', label: 'Entregado' },
] as const;

export function validarOrdenFechaPedido(
  pedido: Pedido,
  campo: (typeof ETAPAS_PEDIDO)[number]['campo'],
  nuevoIso: string,
): string | null {
  return primeraFueraDeOrden(
    ETAPAS_PEDIDO.map((e) => ({
      label: e.label,
      valor: e.campo === campo ? new Date(nuevoIso) : pedido[e.campo] ? new Date(pedido[e.campo] as string) : null,
    })),
  );
}

const ETAPAS_COTIZACION = [
  { campo: 'requerimientoEn', label: 'Requerimiento del cliente' },
  { campo: 'cotizacionEnviadaEn', label: 'Cotización enviada' },
  { campo: 'pedidoAprobadoEn', label: 'Pedido aprobado' },
  { campo: 'avisoAlmacenEn', label: 'Pedido notificado' },
] as const;

export function validarOrdenFechaCotizacion(
  cotizacion: Cotizacion,
  campo: (typeof ETAPAS_COTIZACION)[number]['campo'],
  nuevoIso: string,
): string | null {
  return primeraFueraDeOrden(
    ETAPAS_COTIZACION.map((e) => ({
      label: e.label,
      valor: e.campo === campo ? new Date(nuevoIso) : cotizacion[e.campo] ? new Date(cotizacion[e.campo] as string) : null,
    })),
  );
}
