// Estado de la clasificación GHS de un producto:
//  - completo: tiene pictogramas.
//  - incompleto: tiene frases H o palabra de advertencia pero NO pictogramas (falta marcarlos).
//  - sin: no tiene nada cargado.
export type EstadoGhs = 'completo' | 'incompleto' | 'sin'

export function estadoGhs(p: {
  pictogramasGhs?: string[] | null
  palabraAdvertencia?: string | null
  frasesH?: string[] | null
}): EstadoGhs {
  if (p.pictogramasGhs?.length) return 'completo'
  if (p.frasesH?.length || p.palabraAdvertencia) return 'incompleto'
  return 'sin'
}

// Pictogramas GHS/SGA: nombre corto y qué significa (se muestra al escanear el QR).
export const PICTOGRAMAS_GHS = [
  { codigo: 'GHS01', nombre: 'Explosivo', descripcion: 'Puede explotar por calor, golpe o fricción.' },
  { codigo: 'GHS02', nombre: 'Inflamable', descripcion: 'Arde con facilidad. Mantener lejos de llamas, chispas y calor.' },
  { codigo: 'GHS03', nombre: 'Comburente', descripcion: 'Aviva el fuego y facilita que otras sustancias se incendien.' },
  { codigo: 'GHS04', nombre: 'Gas a presión', descripcion: 'Envase a presión: puede explotar si se calienta. Si es gas licuado, causa quemaduras por frío.' },
  { codigo: 'GHS05', nombre: 'Corrosivo', descripcion: 'Causa quemaduras graves en piel y daño ocular grave. Puede corroer metales.' },
  { codigo: 'GHS06', nombre: 'Tóxico', descripcion: 'Puede intoxicar gravemente o causar la muerte por ingestión, contacto o inhalación.' },
  { codigo: 'GHS07', nombre: 'Irritante / nocivo', descripcion: 'Irrita la piel, los ojos o las vías respiratorias. Nocivo si se ingiere.' },
  { codigo: 'GHS08', nombre: 'Peligro para la salud', descripcion: 'Riesgo a largo plazo: cancerígeno, mutágeno, daña órganos o la reproducción, o sensibiliza las vías respiratorias.' },
  { codigo: 'GHS09', nombre: 'Peligro ambiental', descripcion: 'Tóxico para la vida acuática. No verter al desagüe ni al ambiente.' },
] as const
