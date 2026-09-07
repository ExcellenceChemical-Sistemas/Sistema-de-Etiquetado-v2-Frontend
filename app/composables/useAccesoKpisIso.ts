// composables/useAccesoKpisIso.ts
import { computed } from 'vue'
import { useUsuarioActual } from './useUsuarioActual'
import type { Carpeta, NodoRuta, TipoArchivoDocumento } from './useCarpetas'
import type { AccesoDocumentoAcciones, AccesoISO } from '~/utils/permisos'

/** Para resolver acceso solo importa el tipo, no el resto del Archivo. */
type ArchivoConTipo = { tipo: TipoArchivoDocumento }

/**
 * Cadena de ancestros de una carpeta, de la raíz hacia abajo — tal cual la
 * devuelve `obtenerRuta`, que ya incluye a la propia carpeta como último
 * elemento. Es el equivalente de `obtenerCadena()` del backend (que la arma al
 * revés, pero acá solo se usa con `.some`, así que el orden da igual).
 *
 * Vacía por defecto: sin cadena, `estaEnObsoleto` solo puede mirar la carpeta
 * que recibe, que es exactamente el comportamiento que había antes.
 */
type CadenaCarpetas = readonly NodoRuta[]

const SIN_ACCESO: AccesoDocumentoAcciones = Object.freeze({
  puedeVer: false,
  puedeDescargar: false,
  puedeAdjuntar: false,
  puedeEditar: false,
  puedeEliminar: false,
})

const ACCESO_TOTAL: AccesoDocumentoAcciones = Object.freeze({
  puedeVer: true,
  puedeDescargar: true,
  puedeAdjuntar: true,
  puedeEditar: true,
  puedeEliminar: true,
})

export function useAccesoKpisIso() {
  const { usuarioActual, esAdmin } = useUsuarioActual()

  const accesoIso = computed<AccesoISO>(
    () => usuarioActual.value?.accesoIso ?? { ...SIN_ACCESO, gestionaObsoleto: false },
  )

  function accesoIndicador(proceso: string | null): AccesoDocumentoAcciones {
    if (!proceso) return SIN_ACCESO
    return (
      usuarioActual.value?.accesosIndicador?.find((a) => a.proceso === proceso) ?? SIN_ACCESO
    )
  }

  /** true si tiene puedeVer en al menos un proceso de Indicadores. */
  const veAlgunIndicador = computed(() =>
    (usuarioActual.value?.accesosIndicador ?? []).some((a) => a.puedeVer),
  )

  /** La carpeta Obsoleto de ISO: gestionaObsoleto acopla ver+editar en un solo flag. */
  const puedeVerObsoleto = computed(() => esAdmin.value || accesoIso.value.gestionaObsoleto)

  /**
   * ¿Hay algo del módulo que este usuario pueda abrir? Con esto se muestra u
   * oculta la entrada "KPIs / ISO" del sidebar: en false no tiene ni una
   * carpeta a la que entrar.
   */
  const puedeVerAlgoKpisIso = computed(
    () =>
      esAdmin.value ||
      veAlgunIndicador.value ||
      accesoIso.value.puedeVer ||
      accesoIso.value.gestionaObsoleto,
  )

  /**
   * Espeja `cadena.some(c => c.tipo === 'OBSOLETO')` del backend: la rama
   * Obsoleto se hereda hacia abajo, así que una subcarpeta anidada dentro de
   * Obsoleto sigue siendo Obsoleto aunque su propio `tipo` sea otro.
   *
   * Mirar solo `carpeta.tipo` dejaba esas subcarpetas cayendo en la rama de
   * ISO normal, que muestra adjuntar/eliminar a cualquiera con esos flags —
   * botones que el backend después rechaza.
   */
  function estaEnObsoleto(carpeta: Carpeta, cadena: CadenaCarpetas): boolean {
    return carpeta.tipo === 'OBSOLETO' || cadena.some((c) => c.tipo === 'OBSOLETO')
  }

  /**
   * Resuelve los 5 flags efectivos del usuario sobre una carpeta concreta.
   * Todo lo demás de este composable se deriva de acá.
   *
   * `cadena` son los ancestros de `carpeta` (sirve la ruta del breadcrumb tal
   * cual, que ya la incluye). Sin ella no se puede detectar Obsoleto heredado.
   */
  function accesosDeCarpeta(
    carpeta: Carpeta,
    cadena: CadenaCarpetas = [],
  ): AccesoDocumentoAcciones {
    if (esAdmin.value) return ACCESO_TOTAL

    if (carpeta.modulo === 'KPIS') {
      // Los nodos por encima del proceso (raíz, año, INDICADORES) no tienen
      // proceso denormalizado: se muestran solo como camino hacia algún
      // proceso que el usuario sí puede ver.
      if (!carpeta.proceso) {
        return veAlgunIndicador.value ? { ...SIN_ACCESO, puedeVer: true } : SIN_ACCESO
      }
      return accesoIndicador(carpeta.proceso)
    }

    // gestionaObsoleto es todo o nada sobre esa rama: el backend devuelve
    // ACCESO_TOTAL, no un acceso parcial. Antes acá se daban solo ver+editar,
    // así que a quien gestiona Obsoleto se le ocultaban botones (descargar,
    // adjuntar, eliminar) que el backend sí le permite.
    if (estaEnObsoleto(carpeta, cadena)) {
      return accesoIso.value.gestionaObsoleto ? ACCESO_TOTAL : SIN_ACCESO
    }

    return accesoIso.value
  }

  const puedeVerCarpeta = (carpeta: Carpeta, cadena: CadenaCarpetas = []) =>
    accesosDeCarpeta(carpeta, cadena).puedeVer
  const puedeEditarCarpeta = (carpeta: Carpeta, cadena: CadenaCarpetas = []) =>
    accesosDeCarpeta(carpeta, cadena).puedeEditar
  const puedeAdjuntarEnCarpeta = (carpeta: Carpeta, cadena: CadenaCarpetas = []) =>
    accesosDeCarpeta(carpeta, cadena).puedeAdjuntar

  /**
   * Espeja el `esPdfIso` del backend (acceso-documentos.service.ts): el módulo
   * sale de la carpeta contenedora, no del archivo, porque `Archivo` no lo
   * trae — el backend hace lo mismo con `archivo.carpeta.modulo`.
   *
   * Es la condición que gobierna las dos excepciones del PDF de ISO, opuestas
   * entre sí: le da paso libre a la signed URL (alimenta el visor propio, no
   * una descarga) y a la vez le prohíbe el borrado salvo a esAdmin.
   *
   * Ojo: `tipo === 'PDF'` a secas NO alcanza. Un PDF dentro de una carpeta
   * KPIS no está exento en el backend, y usar la condición corta hacía que el
   * frontend ofreciera un botón que después terminaba en 403.
   */
  function esPdfIso(archivo: ArchivoConTipo, carpeta: Carpeta): boolean {
    return carpeta.modulo === 'ISO' && archivo.tipo === 'PDF'
  }

  /**
   * En ISO, puedeVer alcanza para el PDF, que es el documento oficial ya
   * aprobado; Word/Excel/PowerPoint son borrador de trabajo y piden además
   * puedeEditar.
   *
   * La regla NO se aplica en KPIs: ahí los RI son Word y los DS son Excel,
   * así que filtrar por tipo dejaría las carpetas de un proceso vacías para
   * cualquiera que tenga puedeVer sin puedeEditar, que es justo el caso de
   * uso de solo lectura.
   */
  function puedeVerArchivo(
    archivo: ArchivoConTipo,
    carpeta: Carpeta,
    cadena: CadenaCarpetas = [],
  ): boolean {
    if (esAdmin.value) return true
    const acciones = accesosDeCarpeta(carpeta, cadena)
    if (!acciones.puedeVer) return false
    if (carpeta.modulo !== 'ISO') return true
    if (archivo.tipo === 'PDF') return true
    return acciones.puedeEditar
  }

  function puedeDescargarArchivo(
    archivo: ArchivoConTipo,
    carpeta: Carpeta,
    cadena: CadenaCarpetas = [],
  ): boolean {
    if (esAdmin.value) return true
    if (!puedeVerArchivo(archivo, carpeta, cadena)) return false
    return accesosDeCarpeta(carpeta, cadena).puedeDescargar
  }

  /**
   * Regla dura: en ISO nadie borra un PDF salvo esAdmin, ni con
   * puedeEliminar=true — es la versión oficial/vigente de un documento de
   * calidad y borrarlo por error es un problema de auditoría. El backend
   * valida lo mismo; esto solo oculta el botón.
   */
  function puedeEliminarArchivo(
    archivo: ArchivoConTipo,
    carpeta: Carpeta,
    cadena: CadenaCarpetas = [],
  ): boolean {
    if (esAdmin.value) return true
    if (esPdfIso(archivo, carpeta)) return false
    if (!puedeVerArchivo(archivo, carpeta, cadena)) return false
    return accesosDeCarpeta(carpeta, cadena).puedeEliminar
  }

  return {
    accesoIso,
    accesoIndicador,
    accesosDeCarpeta,
    estaEnObsoleto,
    esPdfIso,
    puedeVerObsoleto,
    puedeVerAlgoKpisIso,
    puedeVerCarpeta,
    puedeEditarCarpeta,
    puedeAdjuntarEnCarpeta,
    puedeVerArchivo,
    puedeDescargarArchivo,
    puedeEliminarArchivo,
  }
}
