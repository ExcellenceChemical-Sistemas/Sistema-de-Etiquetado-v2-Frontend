// Datos de la empresa que se muestran en las páginas legales (privacidad, seguridad, cookies).
// Los campos vacíos NO se muestran: complétalos con los datos reales de la empresa antes de
// publicar. Ningún dato se inventa ni se adivina.
export const EMPRESA = {
  razonSocial: 'Excellence Chemical S.A.C.',
  sitioWeb: 'https://excellencechemical.com',

  // Completar (los ve el público en las páginas legales):
  ruc: '',
  domicilio: '', // domicilio legal, ej. "Av. ... N.° ..., distrito, provincia, departamento"
  telefono: '',
  // Canal para ejercer derechos sobre los datos personales (acceso, rectificación, cancelación,
  // oposición) y para reportar problemas de seguridad. Es obligatorio tener uno: complétalo.
  correoPrivacidad: '',
} as const

// Fecha de la última revisión de los textos legales (se muestra en cada página).
export const ULTIMA_ACTUALIZACION_LEGAL = '25 de septiembre de 2026'
