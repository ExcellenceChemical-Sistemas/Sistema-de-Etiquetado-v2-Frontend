import { computed, ref, watch, type Ref } from 'vue'
import type { Lote } from '~/types/lote'
import { estadoVencimiento } from '~/utils/fechavencimiento'

export type VencimientoFilter = 'todos' | 'vencidos' | 'porVencer'

const PAGE_SIZE = 10

export function useLotesListado(lotes: Ref<Lote[] | undefined>) {
  const search = ref('')
  const vencimientoFilter = ref<VencimientoFilter>('todos')
  // Rango de fechas de vencimiento (yyyy-mm-dd, formato nativo de <input type="date">)
  const fechaDesde = ref('')
  const fechaHasta = ref('')
  const page = ref(1)

  const filtrados = computed(() => {
    if (!lotes.value) return []
    const q = search.value.trim().toLowerCase()
    const desde = fechaDesde.value ? new Date(fechaDesde.value) : null
    const hasta = fechaHasta.value ? new Date(fechaHasta.value) : null

    return lotes.value.filter((l) => {
      const matchTexto =
        !q ||
        l.numeroLote.toLowerCase().includes(q) ||
        l.producto?.nombre.toLowerCase().includes(q) ||
        l.fabricante?.nombre.toLowerCase().includes(q)

      if (!matchTexto) return false

      if (vencimientoFilter.value !== 'todos') {
        const estado = estadoVencimiento(l.fechaVencimiento)
        if (vencimientoFilter.value === 'vencidos' && estado !== 'vencido') return false
        if (vencimientoFilter.value === 'porVencer' && estado !== 'porVencer') return false
      }

      if (desde || hasta) {
        if (!l.fechaVencimientoOrden) return false
        const fv = new Date(l.fechaVencimientoOrden)
        if (desde && fv < desde) return false
        if (hasta && fv > hasta) return false
      }

      return true
    })
  })

  watch([search, vencimientoFilter, fechaDesde, fechaHasta], () => {
    page.value = 1
  })

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filtrados.value.length / PAGE_SIZE)),
  )

  watch(totalPages, (tp) => {
    if (page.value > tp) page.value = tp
  })

  const paginados = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return filtrados.value.slice(start, start + PAGE_SIZE)
  })

  return {
    search,
    vencimientoFilter,
    fechaDesde,
    fechaHasta,
    page,
    totalPages,
    filtrados,
    paginados,
    PAGE_SIZE,
  }
}