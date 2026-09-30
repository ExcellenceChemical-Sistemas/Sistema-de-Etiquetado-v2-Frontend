import { ref } from 'vue'
import ExcelJS from 'exceljs'

export interface XlsxColumn<T> {
  key: keyof T | ((row: T) => string | number | null | undefined)
  label: string
  /** Ancho de columna en caracteres (opcional, se autoajusta si no se pasa) */
  width?: number
  /**
   * Color de fondo (ARGB) para la celda según su valor ya formateado y la fila
   * completa. Devolver undefined = sin color. Reemplaza el coloreado
   * hardcodeado por label; úsalo en cualquier columna de "estado".
   */
  colorFill?: (value: string | number, row: T) => string | undefined
}

const HEADER_FILL = 'FF1F2937'      // slate-800
const HEADER_FONT = 'FFFFFFFF'      // blanco
const BORDER_COLOR = 'FFD1D5DB'     // gray-300
const ZEBRA_FILL = 'FFF9FAFB'       // gray-50

// Paleta reutilizable para colorFill en columnas de estado
export const FILL_GREEN = 'FFDCFCE7' // green-100
export const FILL_AMBER = 'FFFEF3C7' // amber-100
export const FILL_RED = 'FFFEE2E2'   // red-100

// Legacy: coloreado específico de Productos, se mantiene por compatibilidad
// para no tocar el caller existente (columna con label exacto "Estado rombo")
const ROMBO_OK_FILL = FILL_GREEN
const ROMBO_FALTA_FILL = FILL_AMBER

/**
 * Agrega a `workbook` una hoja con los estilos estándar del sistema (header oscuro, bordes,
 * zebra, `colorFill` por columna). La usan tanto el export de una sola tabla como los reportes
 * de indicadores, que suman varias hojas de detalle al mismo libro.
 */
export function agregarHojaTabla<T>(
  workbook: ExcelJS.Workbook,
  rows: T[],
  columns: XlsxColumn<T>[],
  sheetName = 'Datos',
) {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  sheet.columns = columns.map((c) => ({
    header: c.label,
    width: c.width ?? Math.max(c.label.length + 4, 14),
  }))

  const headerRow = sheet.getRow(1)
  headerRow.height = 20
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FONT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    }
  })
  // Filtro automático en el header — deja filtrar/ordenar cada hoja de detalle directo en Excel
  // sin que el usuario tenga que seleccionar el rango a mano.
  if (rows.length > 0) {
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
  }

  rows.forEach((row, i) => {
    const values = columns.map(
      (c) => (typeof c.key === 'function' ? c.key(row) : row[c.key]) ?? '',
    )
    const excelRow = sheet.addRow(values)

    excelRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } },
      }
      if (i % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_FILL } }
      }

      const col = columns[colNumber - 1]
      const colLabel = col?.label

      if (col?.colorFill) {
        const fill = col.colorFill(cell.value as string | number, row)
        if (fill) {
          cell.alignment = { horizontal: 'center' }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
        }
      } else if (colLabel === 'Estado rombo') {
        // legacy: compat con Productos, que no pasa colorFill explícito
        cell.alignment = { horizontal: 'center' }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: cell.value === 'Con rombo' ? ROMBO_OK_FILL : ROMBO_FALTA_FILL },
        }
      }
    })
  })

  return sheet
}

/**
 * Export genérico a XLSX con estilos (header en negrita, bordes, zebra
 * striping, resaltado opcional por columna vía `colorFill`) y barra de
 * progreso animada (1% -> 100%) vía requestAnimationFrame. La construcción
 * real del workbook corre en paralelo a la animación.
 */
export function useXlsxExport() {
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
      // requestAnimationFrame no corre con la pestaña en segundo plano: sin este respaldo, si el
      // usuario cambia de pestaña mientras exporta, la descarga queda esperando a que vuelva.
      setTimeout(terminar, durationMs + 100)
    })
  }

  function buildWorkbook<T>(rows: T[], columns: XlsxColumn<T>[], sheetName = 'Datos') {
    const workbook = new ExcelJS.Workbook()
    agregarHojaTabla(workbook, rows, columns, sheetName)
    return workbook
  }

  async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function exportar<T>(
    rows: T[],
    columns: XlsxColumn<T>[],
    filename: string,
    durationMs = 900,
  ) {
    if (rows.length === 0) return
    await exportarLibro(() => buildWorkbook(rows, columns), filename, durationMs)
  }

  /** Igual que `exportar`, pero para un libro armado por el caller (varias hojas, imágenes). */
  async function exportarLibro(
    construir: () => ExcelJS.Workbook | Promise<ExcelJS.Workbook>,
    filename: string,
    durationMs = 900,
  ) {
    if (isExporting.value) return
    isExporting.value = true
    progress.value = 1
    try {
      const [workbook] = await Promise.all([
        Promise.resolve().then(construir),
        animateProgress(durationMs),
      ])
      await downloadWorkbook(workbook, filename)
    } finally {
      setTimeout(() => {
        isExporting.value = false
        progress.value = 0
      }, 300)
    }
  }

  return { progress, isExporting, exportar, exportarLibro }
}