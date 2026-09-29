// Feriados nacionales de Perú. Los de fecha fija se listan tal cual; Jueves y
// Viernes Santo se calculan a partir del Domingo de Pascua (algoritmo de
// Gauss/Meeus), que cambia cada año — así no hace falta actualizar esta
// lista a mano todos los años por esos dos.
function domingoDePascua(anio: number): Date {
  const a = anio % 19
  const b = Math.floor(anio / 100)
  const c = anio % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(anio, mes - 1, dia)
}

// [mes (1-12), día]
const FERIADOS_FIJOS: [number, number][] = [
  [1, 1], // Año Nuevo
  [5, 1], // Día del Trabajo
  [6, 29], // San Pedro y San Pablo
  [7, 28], // Fiestas Patrias
  [7, 29], // Fiestas Patrias
  [8, 30], // Santa Rosa de Lima
  [10, 8], // Combate de Angamos
  [11, 1], // Todos los Santos
  [12, 8], // Inmaculada Concepción
  [12, 9], // Batalla de Ayacucho
  [12, 25], // Navidad
]

function mismaFecha(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function esFeriadoPeru(fecha: Date): boolean {
  for (const [mes, dia] of FERIADOS_FIJOS) {
    if (fecha.getMonth() + 1 === mes && fecha.getDate() === dia) return true
  }

  const pascua = domingoDePascua(fecha.getFullYear())
  const juevesSanto = new Date(pascua)
  juevesSanto.setDate(pascua.getDate() - 3)
  const viernesSanto = new Date(pascua)
  viernesSanto.setDate(pascua.getDate() - 2)

  return mismaFecha(fecha, juevesSanto) || mismaFecha(fecha, viernesSanto)
}
