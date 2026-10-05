import { computed, ref, watch, type Ref } from 'vue'
import type { Plantilla } from '~/types/plantilla'

const PAGE_SIZE = 10

export function usePlantillasListado(plantillas: Ref<Plantilla[] | undefined>) {
  const search = ref('')
  const page = ref(1)

  const filtrados = computed(() => {
    if (!search.value.trim()) return plantillas.value ?? []
    const q = search.value.trim().toLowerCase()
    return (plantillas.value ?? []).filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.archivo.toLowerCase().includes(q),
    )
  })

  // si cambia la búsqueda, siempre volvemos a la página 1
  watch(search, () => {
    page.value = 1
  })

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filtrados.value.length / PAGE_SIZE)),
  )

  // si la página quedó "fuera de rango" (ej. al borrar la última plantilla de
  // la última página), la corregimos sola
  watch(totalPages, (tp) => {
    if (page.value > tp) page.value = tp
  })

  const paginados = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return filtrados.value.slice(start, start + PAGE_SIZE)
  })

  return { search, page, totalPages, filtrados, paginados, PAGE_SIZE }
}
