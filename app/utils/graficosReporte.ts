// Gráficos para los reportes Excel de indicadores. ExcelJS no genera gráficos nativos de Excel,
// así que se dibujan en un <canvas> y se insertan como imagen PNG. Se dibujan desde los datos
// (no se captura el SVG de la página) para que salgan siempre con fondo blanco y colores fijos,
// aunque el usuario tenga el tema oscuro activo.

export interface GraficoPng {
  /** data URL `data:image/png;base64,...` — ExcelJS lo acepta tal cual en `addImage`. */
  base64: string
  /** Tamaño en píxeles con el que se inserta en la hoja. */
  width: number
  height: number
}

export interface PuntoGrafico {
  etiqueta: string
  valor: number
  color?: string
  /** Texto sobre/junto a la barra; por defecto, el valor redondeado. */
  texto?: string
}

export const COLOR_VERDE = '#22c55e'
export const COLOR_AMBAR = '#f59e0b'
export const COLOR_ROJO = '#ef4444'
export const COLOR_BASE = '#334155'
const COLOR_TEXTO = '#0f172a'
const COLOR_TEXTO_SUAVE = '#64748b'
const COLOR_GRILLA = '#e2e8f0'
const FUENTE = 'Arial, Helvetica, sans-serif'

// Misma paleta que DonutProductosEscaneados, con gris al final para "Otros".
export const PALETA_DONA = ['#22c55e', '#60a5fa', '#facc15', '#f472b6', '#a78bfa', '#94a3b8']

// Se dibuja al doble de resolución y se inserta a tamaño 1x, para que no salga borroso.
const ESCALA = 2

function lienzo(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width * ESCALA
  canvas.height = height * ESCALA
  const ctx = canvas.getContext('2d')!
  ctx.scale(ESCALA, ESCALA)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.textBaseline = 'middle'
  return { canvas, ctx }
}

function fuente(ctx: CanvasRenderingContext2D, px: number, negrita = false) {
  ctx.font = `${negrita ? 'bold ' : ''}${px}px ${FUENTE}`
}

function recortar(ctx: CanvasRenderingContext2D, texto: string, maxAncho: number) {
  if (ctx.measureText(texto).width <= maxAncho) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxAncho) t = t.slice(0, -1)
  return `${t}…`
}

function png(canvas: HTMLCanvasElement, width: number, height: number): GraficoPng {
  return { base64: canvas.toDataURL('image/png'), width, height }
}

function textoPorDefecto(p: PuntoGrafico) {
  return p.texto ?? String(Math.round(p.valor))
}

/** Columnas verticales, con línea de meta opcional (ej. cumplimiento mensual 0-100%). */
export function graficoColumnas(
  puntos: PuntoGrafico[],
  opciones: { maximo?: number; meta?: number; etiquetaMeta?: string } = {},
): GraficoPng {
  const ANCHO_BARRA = 38
  const SEPARACION = 18
  const PAD_X = 16
  const PAD_TOP = 30
  const ALTO_PLOT = 180
  const ALTO_EJE = 26
  const width = Math.max(360, puntos.length * (ANCHO_BARRA + SEPARACION) - SEPARACION + PAD_X * 2)
  const height = PAD_TOP + ALTO_PLOT + ALTO_EJE
  const { canvas, ctx } = lienzo(width, height)

  const maximo = Math.max(opciones.maximo ?? 0, ...puntos.map((p) => p.valor), 1)
  const y = (v: number) => PAD_TOP + ALTO_PLOT - (Math.min(v, maximo) / maximo) * ALTO_PLOT
  const base = PAD_TOP + ALTO_PLOT

  ctx.strokeStyle = COLOR_GRILLA
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, base + 0.5)
  ctx.lineTo(width, base + 0.5)
  ctx.stroke()

  if (opciones.meta !== undefined) {
    const yMeta = Math.round(y(opciones.meta)) + 0.5
    ctx.strokeStyle = COLOR_TEXTO_SUAVE
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(0, yMeta)
    ctx.lineTo(width, yMeta)
    ctx.stroke()
    ctx.setLineDash([])
    fuente(ctx, 10)
    ctx.fillStyle = COLOR_TEXTO_SUAVE
    ctx.textAlign = 'right'
    ctx.fillText(opciones.etiquetaMeta ?? `Meta ${opciones.meta}`, width - 4, yMeta - 8)
  }

  puntos.forEach((p, i) => {
    const x = PAD_X + i * (ANCHO_BARRA + SEPARACION)
    const alto = Math.max(base - y(p.valor), p.valor > 0 ? 2 : 0)
    ctx.fillStyle = p.color ?? COLOR_BASE
    ctx.fillRect(x, base - alto, ANCHO_BARRA, alto)

    ctx.textAlign = 'center'
    fuente(ctx, 11, true)
    ctx.fillStyle = COLOR_TEXTO
    ctx.fillText(textoPorDefecto(p), x + ANCHO_BARRA / 2, base - alto - 10)

    fuente(ctx, 11)
    ctx.fillStyle = COLOR_TEXTO_SUAVE
    ctx.fillText(recortar(ctx, p.etiqueta, ANCHO_BARRA + SEPARACION - 2), x + ANCHO_BARRA / 2, base + ALTO_EJE / 2 + 2)
  })

  return png(canvas, width, height)
}

/** Barras horizontales con el nombre a la izquierda (rankings, promedios por etapa). */
export function graficoBarras(puntos: PuntoGrafico[]): GraficoPng {
  const ANCHO_ETIQUETA = 230
  const ANCHO_PLOT = 300
  const ANCHO_VALOR = 70
  const ALTO_FILA = 28
  const PAD = 12
  const width = PAD + ANCHO_ETIQUETA + ANCHO_PLOT + ANCHO_VALOR + PAD
  const height = PAD * 2 + Math.max(1, puntos.length) * ALTO_FILA
  const { canvas, ctx } = lienzo(width, height)

  const maximo = Math.max(1e-9, ...puntos.map((p) => p.valor))
  puntos.forEach((p, i) => {
    const yCentro = PAD + i * ALTO_FILA + ALTO_FILA / 2
    fuente(ctx, 11)
    ctx.fillStyle = COLOR_TEXTO
    ctx.textAlign = 'left'
    ctx.fillText(recortar(ctx, p.etiqueta, ANCHO_ETIQUETA - 10), PAD, yCentro)

    const xPlot = PAD + ANCHO_ETIQUETA
    ctx.fillStyle = COLOR_GRILLA
    ctx.fillRect(xPlot, yCentro - 8, ANCHO_PLOT, 16)
    const ancho = Math.max((p.valor / maximo) * ANCHO_PLOT, p.valor > 0 ? 3 : 0)
    ctx.fillStyle = p.color ?? COLOR_BASE
    ctx.fillRect(xPlot, yCentro - 8, ancho, 16)

    fuente(ctx, 11, true)
    ctx.fillStyle = COLOR_TEXTO
    ctx.fillText(textoPorDefecto(p), xPlot + ANCHO_PLOT + 8, yCentro)
  })

  return png(canvas, width, height)
}

/** Dona con leyenda a la derecha: nombre, cantidad y porcentaje de cada segmento. */
export function graficoDona(puntos: PuntoGrafico[]): GraficoPng {
  const DIAMETRO = 200
  const PAD = 16
  const ALTO_FILA = 24
  const ANCHO_LEYENDA = 300
  const width = PAD + DIAMETRO + PAD * 2 + ANCHO_LEYENDA
  const height = Math.max(DIAMETRO + PAD * 2, puntos.length * ALTO_FILA + PAD * 2)
  const { canvas, ctx } = lienzo(width, height)

  const total = puntos.reduce((s, p) => s + p.valor, 0)
  const cx = PAD + DIAMETRO / 2
  const cy = height / 2
  const radio = DIAMETRO / 2
  let angulo = -Math.PI / 2
  puntos.forEach((p, i) => {
    const barrido = total ? (p.valor / total) * Math.PI * 2 : 0
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radio, angulo, angulo + barrido)
    ctx.closePath()
    ctx.fillStyle = p.color ?? PALETA_DONA[i % PALETA_DONA.length]!
    ctx.fill()
    angulo += barrido
  })
  ctx.beginPath()
  ctx.arc(cx, cy, radio * 0.58, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  ctx.textAlign = 'center'
  fuente(ctx, 22, true)
  ctx.fillStyle = COLOR_TEXTO
  ctx.fillText(String(total), cx, cy - 6)
  fuente(ctx, 11)
  ctx.fillStyle = COLOR_TEXTO_SUAVE
  ctx.fillText('total', cx, cy + 14)

  const xLeyenda = PAD + DIAMETRO + PAD * 2
  const yInicio = cy - (puntos.length * ALTO_FILA) / 2 + ALTO_FILA / 2
  puntos.forEach((p, i) => {
    const yFila = yInicio + i * ALTO_FILA
    ctx.fillStyle = p.color ?? PALETA_DONA[i % PALETA_DONA.length]!
    ctx.fillRect(xLeyenda, yFila - 6, 12, 12)
    const pct = total ? Math.round((p.valor / total) * 100) : 0
    const detalle = ` ${p.valor} (${pct}%)`
    fuente(ctx, 11, true)
    const anchoDetalle = ctx.measureText(detalle).width
    fuente(ctx, 11)
    ctx.textAlign = 'left'
    ctx.fillStyle = COLOR_TEXTO
    const nombre = recortar(ctx, p.etiqueta, ANCHO_LEYENDA - 22 - anchoDetalle)
    ctx.fillText(nombre, xLeyenda + 20, yFila)
    const anchoNombre = ctx.measureText(nombre).width
    fuente(ctx, 11, true)
    ctx.fillText(detalle, xLeyenda + 20 + anchoNombre, yFila)
  })

  return png(canvas, width, height)
}
