import { computed, ref, watch, type Ref } from 'vue'
import type { Fabricante } from '~/types/fabricante'

const PAGE_SIZE = 10

export function useFabricantesListado(fabricantes: Ref<Fabricante[] | undefined>) {
  const search = ref('')
  const page = ref(1)

  const filtrados = computed(() => {
    if (!search.value.trim()) return fabricantes.value ?? []
    const q = search.value.trim().toLowerCase()
    return (fabricantes.value ?? []).filter((f) => f.nombre.toLowerCase().includes(q))
  })

  // si cambia la búsqueda, siempre volvemos a la página 1
  watch(search, () => {
    page.value = 1
  })

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filtrados.value.length / PAGE_SIZE)),
  )

  // si la página quedó "fuera de rango" (ej. al borrar el último fabricante
  // de la última página), la corregimos sola
  watch(totalPages, (tp) => {
    if (page.value > tp) page.value = tp
  })

  const paginados = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return filtrados.value.slice(start, start + PAGE_SIZE)
  })

  return { search, page, totalPages, filtrados, paginados, PAGE_SIZE }
}