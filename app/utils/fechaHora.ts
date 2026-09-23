// Puente entre el ISO string que maneja el backend y el formato que exige
// <input type="datetime-local"> (sin zona horaria, "YYYY-MM-DDTHH:mm", en
// hora LOCAL del navegador — no UTC).

// Incluye segundos a propósito: dos etapas de un pedido (ej. recepción e
// inicio de preparación) pueden marcarse con pocos segundos de diferencia, y
// sin segundos ambas se ven "iguales" en pantalla aunque sean valores
// distintos guardados por separado.
export function isoADatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return datetimeLocalAhora()
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function datetimeLocalAhora(): string {
  return isoADatetimeLocal(new Date().toISOString())
}

export function datetimeLocalAIso(valor: string): string {
  return new Date(valor).toISOString()
}

// Formato completo (con año) — usar para exportaciones (Excel) y tooltips,
// donde importa poder ubicar la fecha exacta sin ambigüedad de año.
export function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Formato corto (sin año) — solo para texto visible en tablas angostas. El
// año se sigue guardando y exportando igual; esto es puramente cosmético.
export function formatFechaHoraCorta(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
