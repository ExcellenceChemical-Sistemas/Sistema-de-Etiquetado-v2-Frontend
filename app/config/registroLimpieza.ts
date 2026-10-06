// Registro de limpieza: el llenado NO se construye en este sistema, se hace con un Google Form
// aparte (lo crea/edita el área de calidad sin depender de un desarrollo). Esta pantalla solo
// enlaza a ese formulario y muestra el historial leyendo la hoja de respuestas publicada.
//
// Completar con los datos reales antes de que la pantalla funcione:
// 1. FORM_URL: el link del Google Form (el que comparten para "Nuevo registro").
// 2. SHEET_CSV_URL: en la hoja de cálculo de respuestas del Form, Archivo > Compartir >
//    Publicar en la web > elegir la hoja > formato CSV. Copiar el link que genera ahí
//    (termina en algo como ".../pub?gid=0&single=true&output=csv").
export const REGISTRO_LIMPIEZA = {
  formUrl: 'https://forms.gle/NLgdvp94af2xDgj8A',
  sheetCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRtoqkIXZZ5u8xfwN6c-7f9Rh1KIitOvI1vsS5lmbxxXZNoWntFSO9mo6M8p9ctKe9UhuQAxLLq_Irq/pub?gid=478509965&single=true&output=csv',
} as const
