import { ref, watch } from 'vue'

export interface PaletaColor {
  id: string
  nombre: string
  // Color de muestra para el punto del selector (no toca los colores de peligro/estado).
  muestra: string
}

// "Carbón" es la paleta de hoy (los valores ya definidos en .dark, sin overrides);
// el resto agrega variantes de fondo con un matiz distinto, definidas en tailwind.css.
export const PALETAS_COLOR: PaletaColor[] = [
  { id: 'noche', nombre: 'Noche', muestra: '#60a5fa' },
  { id: 'ciruela', nombre: 'Ciruela', muestra: '#c084fc' },
  { id: 'abismo', nombre: 'Abismo', muestra: '#2dd4bf' },
  { id: 'bosque', nombre: 'Bosque', muestra: '#4ade80' },
  { id: 'carbon', nombre: 'Carbón', muestra: '#a1a1aa' },
  { id: 'vino', nombre: 'Vino', muestra: '#fb7185' },
]

const CLAVE_STORAGE = 'tema-color-paleta'
const PALETA_DEFECTO = 'carbon'

// ref a nivel de módulo: todo el que llame al composable comparte la misma instancia.
const paletaActual = ref<string>(PALETA_DEFECTO)
let inicializado = false

function aplicar(id: string) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.paleta = id
}

export function useTemaColor() {
  if (!inicializado) {
    inicializado = true
    try {
      const guardada = localStorage.getItem(CLAVE_STORAGE)
      if (guardada && PALETAS_COLOR.some((p) => p.id === guardada)) {
        paletaActual.value = guardada
      }
    } catch {
      // localStorage puede fallar (privado, bloqueado) — se queda con la paleta por defecto.
    }
    aplicar(paletaActual.value)
    watch(paletaActual, (id) => {
      aplicar(id)
      try {
        localStorage.setItem(CLAVE_STORAGE, id)
      } catch {
        // conveniencia por sesión, no crítico si no se guarda.
      }
    })
  }

  return { paletaActual, paletas: PALETAS_COLOR }
}
