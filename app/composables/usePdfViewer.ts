import { ref, shallowRef, onBeforeUnmount } from "vue";
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useBloqueoDocumento } from "./useBloqueoDocumento";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export function usePdfViewer() {
  // Fase 2: bloqueo de impresión/guardado/clic derecho, compartido con el
  // visor de Word. Ver useBloqueoDocumento para el alcance real de esto.
  useBloqueoDocumento();

  const cargando = ref(false);
  const error = ref<string | null>(null);
  const paginaActual = ref(1);
  const totalPaginas = ref(0);
  const escala = ref(1);

  let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  // getDocument() devuelve el loading task, que es quien tiene destroy(); el
  // PDFDocumentProxy que resuelve su .promise NO lo tiene (pdfjs-dist 6).
  let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
  let renderTask: ReturnType<pdfjsLib.PDFPageProxy["render"]> | null = null;
  const canvasRef = shallowRef<HTMLCanvasElement | null>(null);
  const contenedorRef = shallowRef<HTMLElement | null>(null);

  async function calcularEscalaAncho(numeroPagina: number) {
    if (!pdfDoc || !contenedorRef.value) return;
    const page = await pdfDoc.getPage(numeroPagina);
    const viewportNatural = page.getViewport({ scale: 1 });
    const anchoDisponible = contenedorRef.value.clientWidth - 32; // padding lateral
    if (anchoDisponible > 0) {
      escala.value = anchoDisponible / viewportNatural.width;
    }
  }

  async function cargar(url: string, canvas: HTMLCanvasElement, contenedor?: HTMLElement) {
    cargando.value = true;
    error.value = null;
    canvasRef.value = canvas;
    if (contenedor) contenedorRef.value = contenedor;
    try {
      loadingTask = pdfjsLib.getDocument({ url });
      pdfDoc = await loadingTask.promise;
      totalPaginas.value = pdfDoc.numPages;
      paginaActual.value = 1;
      await calcularEscalaAncho(1);
      await renderPagina(1);
    } catch (e) {
      console.error("Error cargando PDF:", e);
      error.value = "No se pudo cargar el documento";
    } finally {
      cargando.value = false;
    }
  }

  async function renderPagina(numero: number) {
    if (!pdfDoc || !canvasRef.value) return;
    renderTask?.cancel();

    const page = await pdfDoc.getPage(numero);
    const viewport = page.getViewport({ scale: escala.value });
    const canvas = canvasRef.value;
    const context = canvas.getContext("2d")!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // En pdfjs-dist 6 `canvas` es obligatorio y `canvasContext` pasó a ser
    // opcional (la doc del tipo recomienda pasar el canvas). Se mandan los
    // dos: apuntan al mismo elemento y así el render no cambia.
    renderTask = page.render({ canvas, canvasContext: context, viewport });
    try {
      await renderTask.promise;
    } catch (e: any) {
      if (e?.name !== "RenderingCancelledException") throw e;
    }
  }

  function irAPagina(numero: number) {
    if (numero < 1 || numero > totalPaginas.value) return;
    paginaActual.value = numero;
    renderPagina(numero);
  }

  const siguiente = () => irAPagina(paginaActual.value + 1);
  const anterior = () => irAPagina(paginaActual.value - 1);

  function acercar() {
    escala.value = Math.min(escala.value + 0.2, 3);
    renderPagina(paginaActual.value);
  }
  function alejar() {
    escala.value = Math.max(escala.value - 0.2, 0.3);
    renderPagina(paginaActual.value);
  }

  async function ajustarAncho() {
    await calcularEscalaAncho(paginaActual.value);
    renderPagina(paginaActual.value);
  }

  /**
   * Corre en onBeforeUnmount, así que no puede tirar: si algo acá explota, el
   * error sale como "Uncaught (in promise)" en la consola y el resto de la
   * limpieza queda sin ejecutar. Cada paso va aislado y el estado se resetea
   * siempre.
   */
  function limpiar() {
    try {
      renderTask?.cancel();
    } catch (e) {
      console.error("Error cancelando el render del PDF:", e);
    }

    try {
      // destroy() es del loading task, no del PDFDocumentProxy. Devuelve una
      // promesa, así que también hay que atajar el rechazo.
      loadingTask?.destroy()?.catch((e) => {
        console.error("Error liberando el documento PDF:", e);
      });
    } catch (e) {
      console.error("Error liberando el documento PDF:", e);
    }

    renderTask = null;
    pdfDoc = null;
    loadingTask = null;
  }

  onBeforeUnmount(limpiar);

  return {
    cargando, error, paginaActual, totalPaginas, escala,
    cargar, irAPagina, siguiente, anterior, acercar, alejar, ajustarAncho, limpiar,
  };
}