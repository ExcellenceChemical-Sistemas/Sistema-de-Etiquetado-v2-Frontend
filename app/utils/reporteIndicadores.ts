import ExcelJS from 'exceljs'
import { agregarHojaTabla, type XlsxColumn } from '~/composables/useCsvExport'
import type { GraficoPng } from '~/utils/graficosReporte'

// Reporte Excel de una página de indicadores: una hoja "Resumen" con los filtros aplicados, los
// KPIs y cada gráfico (imagen + la tabla de datos que lo arma, para poder re-graficar en Excel o
// auditar el número), y después una hoja por cada listado de detalle.

export interface GraficoReporte {
  titulo: string
  /** null cuando no hay datos para dibujar; se muestra `vacio` en su lugar. */
  imagen: GraficoPng | null
  vacio?: string
  nota?: string
  datos?: { columnas: string[]; filas: (string | number)[][] }
}

export interface SeccionReporte {
  titulo: string
  kpis?: [string, string | number][]
  graficos?: GraficoReporte[]
}

export interface HojaReporte<T = any> {
  nombre: string
  filas: T[]
  columnas: XlsxColumn<T>[]
}

export interface Reporte {
  titulo: string
  descripcion?: string
  filtros: [string, string][]
  secciones: SeccionReporte[]
  hojas: HojaReporte[]
}

const COLOR_TITULO = 'FF0F172A'
const COLOR_SECCION = 'FF1F2937'
const COLOR_SUAVE = 'FF64748B'
const FILL_KPI = 'FFF1F5F9'
const FILL_HEADER = 'FF1F2937'
const FILL_BANNER_TITULO = 'FF0F172A'
const FILL_BANNER_SECCION = 'FFE2E8F0'
const BORDE = 'FFD1D5DB'
// Ancho de la última columna que se fusiona en los banners de título/sección del Resumen —
// igual a la cantidad de columnas declaradas en `hoja.columns` más abajo.
const COLUMNAS_RESUMEN = 6
// Alto por defecto de una fila de Excel (15 pt) expresado en píxeles, para calcular cuántas
// filas ocupa cada imagen y seguir escribiendo debajo sin superponer.
const PX_POR_FILA = 20

const borde = {
  top: { style: 'thin' as const, color: { argb: BORDE } },
  bottom: { style: 'thin' as const, color: { argb: BORDE } },
  left: { style: 'thin' as const, color: { argb: BORDE } },
  right: { style: 'thin' as const, color: { argb: BORDE } },
}

export function construirReporte(reporte: Reporte): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Sistema de Gestión Excellence Chemical'
  workbook.created = new Date()

  const hoja = workbook.addWorksheet('Resumen', {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    properties: { defaultRowHeight: 18 },
  })
  hoja.columns = [{ width: 50 },{ width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }]

  let fila = 1
  const celda = (f: number, c: number) => hoja.getCell(f, c)
  // Banner de ancho completo (fusiona A:F de esa fila) — se usa para el título del reporte y
  // para cada título de sección, en vez de solo texto en negrita, para que se note más "hecho a
  // propósito" al abrir el Excel en vez de una hoja de texto plano.
  function banner(f: number, texto: string, opts: { fill: string; fontColor: string; size?: number; altura?: number }) {
    hoja.mergeCells(f, 1, f, COLUMNAS_RESUMEN)
    const c = celda(f, 1)
    c.value = texto
    c.font = { bold: true, size: opts.size ?? 13, color: { argb: opts.fontColor } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } }
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    hoja.getRow(f).height = opts.altura ?? 22
  }

  banner(fila, reporte.titulo, { fill: FILL_BANNER_TITULO, fontColor: 'FFFFFFFF', size: 16, altura: 30 })
  fila++
  if (reporte.descripcion) {
    celda(fila, 1).value = reporte.descripcion
    celda(fila, 1).font = { italic: true, color: { argb: COLOR_SUAVE } }
    fila++
  }
  const generado = new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
  celda(fila, 1).value = `Generado: ${generado}`
  celda(fila, 1).font = { color: { argb: COLOR_SUAVE } }
  fila += 2

  celda(fila, 1).value = 'Filtros aplicados'
  celda(fila, 1).font = { bold: true, color: { argb: COLOR_SECCION } }
  fila++
  for (const [nombre, valor] of reporte.filtros) {
    celda(fila, 1).value = nombre
    celda(fila, 2).value = valor
    celda(fila, 1).border = borde
    celda(fila, 2).border = borde
    celda(fila, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_KPI } }
    celda(fila, 2).font = { bold: true }
    fila++
  }
  fila++

  for (const seccion of reporte.secciones) {
    banner(fila, seccion.titulo, { fill: FILL_BANNER_SECCION, fontColor: COLOR_SECCION, size: 13 })
    fila++

    for (const [nombre, valor] of seccion.kpis ?? []) {
      celda(fila, 1).value = nombre
      celda(fila, 2).value = valor
      celda(fila, 1).border = borde
      celda(fila, 2).border = borde
      celda(fila, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_KPI } }
      celda(fila, 2).font = { bold: true }
      celda(fila, 2).alignment = { horizontal: 'right' }
      fila++
    }
    if (seccion.kpis?.length) fila++

    for (const grafico of seccion.graficos ?? []) {
      celda(fila, 1).value = grafico.titulo
      celda(fila, 1).font = { bold: true, color: { argb: COLOR_SECCION } }
      fila++
      if (grafico.nota) {
        celda(fila, 1).value = grafico.nota
        celda(fila, 1).font = { italic: true, size: 9, color: { argb: COLOR_SUAVE } }
        fila++
      }

      if (grafico.imagen) {
        const id = workbook.addImage({ base64: grafico.imagen.base64, extension: 'png' })
        // tl es 0-based: (fila - 1) es la fila actual de Excel.
        hoja.addImage(id, {
          tl: { col: 0, row: fila - 1 },
          ext: { width: grafico.imagen.width, height: grafico.imagen.height },
        })
        fila += Math.ceil(grafico.imagen.height / PX_POR_FILA) + 1
      } else {
        celda(fila, 1).value = grafico.vacio ?? 'Sin datos para graficar en este filtro'
        celda(fila, 1).font = { italic: true, color: { argb: COLOR_SUAVE } }
        fila += 2
      }

      if (grafico.datos && grafico.datos.filas.length > 0) {
        grafico.datos.columnas.forEach((col, i) => {
          const c = celda(fila, i + 1)
          c.value = col
          c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL_HEADER } }
          c.border = borde
        })
        fila++
        for (const datos of grafico.datos.filas) {
          datos.forEach((valor, i) => {
            const c = celda(fila, i + 1)
            c.value = valor
            c.border = borde
          })
          fila++
        }
        fila++
      }
    }
    fila++
  }

  for (const h of reporte.hojas) {
    agregarHojaTabla(workbook, h.filas, h.columnas, nombreHoja(h.nombre))
  }

  return workbook
}

// Excel limita el nombre de hoja a 31 caracteres y prohíbe \ / ? * [ ] :
function nombreHoja(nombre: string) {
  return nombre.replace(/[\\/?*[\]:]/g, '-').slice(0, 31)
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** Filtros mes/año tal como los muestran las páginas de indicadores ("TODOS" o el número). */
export function filtrosMesAnio(mes: string, anio: string): [string, string][] {
  return [
    ['Mes', mes === 'TODOS' ? 'Todos los meses' : MESES[Number(mes)]!],
    ['Año', anio === 'TODOS' ? 'Todos' : anio],
  ]
}

/** Sufijo de archivo con el período filtrado, ej. `2026-09`, `2026`, `todo`. */
export function sufijoPeriodo(mes: string, anio: string) {
  const partes = [anio === 'TODOS' ? '' : anio, mes === 'TODOS' ? '' : String(Number(mes) + 1).padStart(2, '0')]
  return partes.filter(Boolean).join('-') || 'todo'
}
