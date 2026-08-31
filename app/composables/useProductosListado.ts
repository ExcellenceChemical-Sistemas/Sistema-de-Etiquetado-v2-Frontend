import { ref, computed, watch, type Ref } from 'vue'
import type { Producto } from '~/types/producto'

export type NfpaFilter = 'todos' | 'sin' | 'con'

const PAGE_SIZE = 10

/**
 * Encapsula búsqueda por nombre, filtro por estado de NFPA y paginación
 * sobre una lista reactiva de productos.
 *
 * Un producto se considera "con rombo" si al menos uno de los 3 campos
 * NFPA está definido (incluye 0), y "sin rombo" si los 3 están vacíos.
 */
export function useProductosListado(productos: Ref<Producto[] | undefined>) {
  const search = ref('')
  const nfpaFilter = ref<NfpaFilter>('todos')
  const page = ref(1)

  function tieneNfpa(p: Producto) {
    return p.nfpaSalud != null || p.nfpaInflamabilidad != null || p.nfpaReactividad != null
  }

  const filtrados = computed(() => {
    if (!productos.value) return []
    const q = search.value.trim().toLowerCase()
    let lista = q ? productos.value.filter(p => p.nombreNormalizado.includes(q)) : productos.value

    if (nfpaFilter.value === 'sin') {
      lista = lista.filter(p => !tieneNfpa(p))
    } else if (nfpaFilter.value === 'con') {
      lista = lista.filter(p => tieneNfpa(p))
    }

    return lista
  })

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filtrados.value.length / PAGE_SIZE))
  )

  const paginados = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return filtrados.value.slice(start, start + PAGE_SIZE)
  })

  // si cambia la búsqueda o el filtro de rombo, volvemos a la página 1
  watch([search, nfpaFilter], () => {
    page.value = 1
  })

  // si la página queda fuera de rango (ej. al filtrar), la corregimos sola
  watch(totalPages, (tp) => {
    if (page.value > tp) page.value = tp
  })

  return {
    search,
    nfpaFilter,
    page,
    totalPages,
    filtrados,
    paginados,
    PAGE_SIZE,
  }
}