import { computed, ref, watch, type Ref } from 'vue'
import type { Cliente } from '~/types/cliente'

const PAGE_SIZE = 10

export function useClientesListado(clientes: Ref<Cliente[] | undefined>) {
  const search = ref('')
  const page = ref(1)

  const filtrados = computed(() => {
    if (!search.value.trim()) return clientes.value ?? []
    const q = search.value.trim().toLowerCase()
    return (clientes.value ?? []).filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.numeroDocumento?.toLowerCase().includes(q) ||
        c.celular?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q),
    )
  })

  // si cambia la búsqueda, siempre volvemos a la página 1
  watch(search, () => {
    page.value = 1
  })

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filtrados.value.length / PAGE_SIZE)),
  )

  // si la página quedó "fuera de rango" (ej. al borrar el último cliente de
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
