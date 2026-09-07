import { onMounted, onBeforeUnmount } from "vue";

/**
 * Fase 2: mientras hay un documento abierto en un visor propio se bloquean
 * Ctrl/Cmd+P, Ctrl/Cmd+S y el menú contextual. Lo comparten el visor de PDF y
 * el de Word para que la regla no se duplique y no se les vaya divergiendo.
 *
 * Es un DISUASIVO, no una protección: el menú del navegador, DevTools, una
 * captura de pantalla y sobre todo la URL firmada de Supabase que se ve en la
 * pestaña Network siguen disponibles. Cerrar eso de verdad es trabajo de
 * backend (URLs de vida corta o servir los bytes por un endpoint propio).
 */
export function useBloqueoDocumento() {
  function bloquearAtajos(e: KeyboardEvent) {
    if (!e.ctrlKey && !e.metaKey) return;
    const tecla = e.key.toLowerCase();
    if (tecla === "p" || tecla === "s") {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function bloquearMenuContextual(e: MouseEvent) {
    e.preventDefault();
  }

  onMounted(() => {
    // en captura, para adelantarse a cualquier otro handler de la página
    document.addEventListener("keydown", bloquearAtajos, true);
    document.addEventListener("contextmenu", bloquearMenuContextual);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("keydown", bloquearAtajos, true);
    document.removeEventListener("contextmenu", bloquearMenuContextual);
  });
}
