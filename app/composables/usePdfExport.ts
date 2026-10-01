import { ref } from 'vue'
import type { jsPDF } from 'jspdf'

/**
 * Exporta un reporte de indicadores a PDF (en vez del XLSX de `useXlsxExport`) con la misma
 * barra de progreso animada — los tres dashboards de indicadores (`cotizaciones`, `pedidos`,
 * `historial`) la usan sobre el PDF que arma `construirReportePdf`.
 */
export function usePdfExport() {
  const progress = ref(0)
  const isExporting = ref(false)

  function animateProgress(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now()
      let terminado = false
      const terminar = () => {
        if (terminado) return
        terminado = true
        progress.value = 100
        resolve()
      }
      function tick(now: number) {
        if (terminado) return
        const elapsed = now - start
        const pct = Math.min(100, Math.round((elapsed / durationMs) * 100))
        progress.value = Math.max(1, pct)
        if (pct < 100) requestAnimationFrame(tick)
        else terminar()
      }
      requestAnimationFrame(tick)
      // Igual que en useXlsxExport: requestAnimationFrame no corre en segundo plano, así que si
      // el usuario cambia de pestaña mientras exporta, este respaldo igual termina la descarga.
      setTimeout(terminar, durationMs + 100)
    })
  }

  async function exportarPdf(
    construir: () => jsPDF | Promise<jsPDF>,
    filename: string,
    durationMs = 900,
  ) {
    if (isExporting.value) return
    isExporting.value = true
    progress.value = 1
    try {
      const [doc] = await Promise.all([Promise.resolve().then(construir), animateProgress(durationMs)])
      doc.save(filename)
    } finally {
      setTimeout(() => {
        isExporting.value = false
        progress.value = 0
      }, 300)
    }
  }

  return { progress, isExporting, exportarPdf }
}
