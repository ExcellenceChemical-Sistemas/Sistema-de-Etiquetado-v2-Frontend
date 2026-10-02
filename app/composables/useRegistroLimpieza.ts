import { useQuery } from '@tanstack/vue-query'
import { REGISTRO_LIMPIEZA } from '~/config/registroLimpieza'
import { parseCsv } from '~/utils/csv'

export type TablaRegistroLimpieza = {
  encabezados: string[]
  filas: string[][]
}

export function useRegistroLimpiezaQuery() {
  return useQuery({
    queryKey: ['registro-limpieza'],
    queryFn: async (): Promise<TablaRegistroLimpieza> => {
      const res = await fetch(REGISTRO_LIMPIEZA.sheetCsvUrl)
      if (!res.ok) throw new Error('No se pudo leer la hoja de respuestas')
      const texto = await res.text()
      const [encabezados, ...filas] = parseCsv(texto)
      return { encabezados: encabezados ?? [], filas }
    },
    enabled: !!REGISTRO_LIMPIEZA.sheetCsvUrl,
    staleTime: 1000 * 60, // las respuestas nuevas no son urgentes de ver al segundo
  })
}
