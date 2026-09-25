import type { PedidoPublicoFechas } from '~/utils/seguimientoPedido'

export interface PedidoPublico extends PedidoPublicoFechas {
  numeroProforma: string
}

// Sin useApi a propósito, igual que useEtiquetaPublica: esta página la abre el cliente
// con el enlace que le mandó la empresa, sin sesión, así que no hay Bearer que adjuntar.
export function usePedidoPublico() {
  const { public: { apiBase } } = useRuntimeConfig()

  function obtener(token: string) {
    return $fetch<PedidoPublico>(`${apiBase}/publico/pedidos/${encodeURIComponent(token)}`)
  }

  return { obtener }
}
