// Reporte PDF de una página de indicadores: reemplaza el reporte Excel multi-hoja por un PDF de
// lectura/impresión directa (portada con KPIs y gráficos, igual contenido que antes solo que ya
// no hace falta abrir Excel para verlo) — mismos `Reporte`/`SeccionReporte`/`HojaReporte` que
// construye cada página, solo cambia cómo se renderizan.
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { HojaReporte, Reporte } from './reporteIndicadores'
import type { XlsxColumn } from '~/composables/useCsvExport'

type RGB = [number, number, number]

const COLOR_TITULO: RGB = [15, 23, 42] // slate-900
const COLOR_SECCION: RGB = [30, 41, 59] // slate-800
const COLOR_SUAVE: RGB = [100, 116, 139] // slate-500
const COLOR_BORDE: RGB = [226, 232, 240] // slate-200
const FILL_KPI: RGB = [241, 245, 249] // slate-100
const FILL_SECCION: RGB = [226, 232, 240] // slate-200
const COLOR_ACENTO: RGB = [34, 197, 94] // green-500, igual que COLOR_VERDE de los gráficos
const BLANCO: RGB = [255, 255, 255]

const MARGEN = 14
const ANCHO_PAGINA = 210 // A4 portrait, mm
const ALTO_PAGINA = 297
const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2
const Y_INICIO_CONTENIDO = 24
const Y_LIMITE_CONTENIDO = ALTO_PAGINA - 16

// `agregarHojaTabla`/`graficosReporte.ts` ya trabajan en ARGB (formato ExcelJS); se reutiliza la
// misma paleta (`FILL_GREEN`, `FILL_AMBER`, `FILL_RED`...) para no duplicar colores, convirtiendo
// a RGB recién acá.
function argbARgb(argb: string): RGB {
  const hex = argb.slice(-6)
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
}

function pxAMm(px: number) {
  return px * 0.2646 // 96dpi
}

// Las fuentes base14 de jsPDF (Helvetica/WinAnsi) no tienen ≤/≥/→: sin esto se imprimen como
// glifos rotos (comillas/símbolos sueltos) en vez del carácter — se detectó probando el PDF real
// contra producción. Se limpia acá, en el único punto donde todo el texto converge antes de
// `doc.text`/autoTable, en vez de tocar cada string en las 3 páginas que arman el `Reporte`.
function limpiar(texto: string): string {
  return texto.replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/→/g, '->')
}
function limpiarCelda(valor: string | number): string {
  return limpiar(String(valor))
}

export function construirReportePdf(reporte: Reporte): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 0

  function saltoDePagina() {
    doc.addPage()
    y = Y_INICIO_CONTENIDO
  }

  function asegurarEspacio(necesario: number) {
    if (y + necesario > Y_LIMITE_CONTENIDO) saltoDePagina()
  }

  // --- Portada: banner de título + descripción + fecha + filtros aplicados ---
  doc.setFillColor(...COLOR_TITULO)
  doc.rect(0, 0, ANCHO_PAGINA, 24, 'F')
  doc.setFillColor(...COLOR_ACENTO)
  doc.rect(0, 24, ANCHO_PAGINA, 1.4, 'F')
  doc.setTextColor(...BLANCO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(limpiar(reporte.titulo), MARGEN, 15)
  y = 32

  if (reporte.descripcion) {
    doc.setTextColor(...COLOR_SUAVE)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    const lineas = doc.splitTextToSize(limpiar(reporte.descripcion), ANCHO_UTIL)
    doc.text(lineas, MARGEN, y)
    y += lineas.length * 4.2 + 2
  }

  const generado = new Date().toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLOR_SUAVE)
  doc.text(`Generado: ${generado}`, MARGEN, y)
  y += 6

  if (reporte.filtros.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEN, right: MARGEN },
      theme: 'plain',
      tableWidth: 90,
      styles: { fontSize: 9, cellPadding: 1.5 },
      body: reporte.filtros.map(([nombre, valor]) => [limpiar(nombre), limpiar(valor)]),
      columnStyles: {
        0: { fontStyle: 'bold', textColor: COLOR_SECCION, fillColor: FILL_KPI, cellWidth: 45 },
        1: { textColor: COLOR_TITULO, cellWidth: 45 },
      },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  function banner(texto: string, size = 11.5) {
    asegurarEspacio(12)
    doc.setFillColor(...FILL_SECCION)
    doc.rect(MARGEN, y, ANCHO_UTIL, 8, 'F')
    doc.setTextColor(...COLOR_SECCION)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.text(limpiar(texto), MARGEN + 2.5, y + 5.5)
    y += 8 + 4
  }

  function tablaKpis(kpis: [string, string | number][]) {
    if (!kpis.length) return
    asegurarEspacio(10)
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEN, right: MARGEN, top: Y_INICIO_CONTENIDO, bottom: 16 },
      theme: 'grid',
      styles: { fontSize: 9.5, cellPadding: 2.2, lineColor: COLOR_BORDE, lineWidth: 0.1 },
      body: kpis.map(([nombre, valor]) => [limpiar(nombre), limpiarCelda(valor)]),
      columnStyles: {
        0: { fillColor: FILL_KPI, textColor: COLOR_SECCION },
        1: { fontStyle: 'bold', textColor: COLOR_TITULO, halign: 'right', cellWidth: 40 },
      },
    })
    y = (doc as any).lastAutoTable.finalY + 5
  }

  for (const seccion of reporte.secciones) {
    banner(seccion.titulo)
    tablaKpis(seccion.kpis ?? [])

    for (const grafico of seccion.graficos ?? []) {
      asegurarEspacio(14)
      doc.setTextColor(...COLOR_SECCION)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(limpiar(grafico.titulo), MARGEN, y + 4)
      y += 6

      if (grafico.nota) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(...COLOR_SUAVE)
        const lineas = doc.splitTextToSize(limpiar(grafico.nota), ANCHO_UTIL)
        doc.text(lineas, MARGEN, y)
        y += lineas.length * 3.6 + 2
      }

      if (grafico.imagen) {
        const anchoMm = Math.min(ANCHO_UTIL, pxAMm(grafico.imagen.width))
        const altoMm = anchoMm * (grafico.imagen.height / grafico.imagen.width)
        asegurarEspacio(altoMm + 4)
        doc.addImage(grafico.imagen.base64, 'PNG', MARGEN, y, anchoMm, altoMm)
        y += altoMm + 5
      } else {
        asegurarEspacio(8)
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9)
        doc.setTextColor(...COLOR_SUAVE)
        doc.text(limpiar(grafico.vacio ?? 'Sin datos para graficar en este filtro'), MARGEN, y + 3)
        y += 9
      }

      if (grafico.datos && grafico.datos.filas.length > 0) {
        autoTable(doc, {
          startY: y,
          margin: { left: MARGEN, right: MARGEN, top: Y_INICIO_CONTENIDO, bottom: 16 },
          theme: 'grid',
          head: [grafico.datos.columnas.map(limpiar)],
          body: grafico.datos.filas.map((fila) => fila.map(limpiarCelda)),
          styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: COLOR_BORDE, lineWidth: 0.1 },
          headStyles: { fillColor: COLOR_SECCION, textColor: BLANCO, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: FILL_KPI },
        })
        y = (doc as any).lastAutoTable.finalY + 6
      }
    }
    y += 2
  }

  // --- Detalle: una tabla por hoja, cada una en página nueva para que no se corte a la mitad ---
  for (const hoja of reporte.hojas) {
    if (hoja.filas.length === 0) continue
    saltoDePagina()
    doc.setTextColor(...COLOR_TITULO)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12.5)
    doc.text(limpiar(hoja.nombre), MARGEN, y)
    y += 3
    doc.setDrawColor(...COLOR_ACENTO)
    doc.setLineWidth(0.6)
    doc.line(MARGEN, y, MARGEN + 22, y)
    y += 5

    agregarTablaHoja(doc, hoja, y)
  }

  agregarEncabezadoPie(doc, reporte.titulo)
  return doc
}

function agregarTablaHoja<T>(doc: jsPDF, hoja: HojaReporte<T>, startY: number) {
  const columnas = hoja.columnas
  const valorDe = (row: T, col: XlsxColumn<T>) =>
    (typeof col.key === 'function' ? col.key(row) : row[col.key]) ?? ''

  autoTable(doc, {
    startY,
    margin: { left: MARGEN, right: MARGEN, top: Y_INICIO_CONTENIDO, bottom: 16 },
    theme: 'grid',
    head: [columnas.map((c) => limpiar(c.label))],
    body: hoja.filas.map((row) => columnas.map((c) => limpiarCelda(valorDe(row, c) as string | number))),
    styles: { fontSize: 7.5, cellPadding: 1.6, lineColor: COLOR_BORDE, lineWidth: 0.1, overflow: 'linebreak' },
    headStyles: { fillColor: COLOR_SECCION, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: FILL_KPI },
    didParseCell(data) {
      if (data.section !== 'body') return
      const col = columnas[data.column.index]
      if (!col?.colorFill) return
      const row = hoja.filas[data.row.index] as T
      const valor = valorDe(row, col) as string | number
      const fill = col.colorFill(valor, row)
      if (fill) {
        data.cell.styles.fillColor = argbARgb(fill)
        data.cell.styles.halign = 'center'
      }
    },
  })
}

function agregarEncabezadoPie(doc: jsPDF, titulo: string) {
  const totalPaginas = doc.getNumberOfPages()
  const generadoCorto = new Date().toLocaleDateString('es-PE', { dateStyle: 'short' })
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p)
    if (p > 1) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...COLOR_SECCION)
      doc.text('Excellence Chemical S.A.C.', MARGEN, 11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLOR_SUAVE)
      doc.text(limpiar(titulo), ANCHO_PAGINA - MARGEN, 11, { align: 'right' })
      doc.setDrawColor(...COLOR_BORDE)
      doc.setLineWidth(0.2)
      doc.line(MARGEN, 14, ANCHO_PAGINA - MARGEN, 14)
    }
    doc.setDrawColor(...COLOR_BORDE)
    doc.setLineWidth(0.2)
    doc.line(MARGEN, ALTO_PAGINA - 12, ANCHO_PAGINA - MARGEN, ALTO_PAGINA - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...COLOR_SUAVE)
    doc.text(`Generado el ${generadoCorto}`, MARGEN, ALTO_PAGINA - 7)
    doc.text(`Página ${p} de ${totalPaginas}`, ANCHO_PAGINA - MARGEN, ALTO_PAGINA - 7, { align: 'right' })
  }
}
