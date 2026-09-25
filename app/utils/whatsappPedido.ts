// WhatsApp "semi-manual": no se envía nada solo. Se arma el enlace wa.me con el mensaje
// ya escrito, se abre el chat del cliente y una persona pulsa enviar. Es gratis y no
// necesita ningún proveedor. Lógica pura para poder probarla sin Nuxt.

import type { EstadoPedido } from '~/types/pedido'

const CODIGO_PERU = '51'

/**
 * Deja el celular en formato internacional solo con dígitos (lo que pide wa.me), o null si no
 * parece un número usable. Los clientes se importaron de un Excel, así que llegan como
 * "987 654 321", "+51 987654321", "(01) 555-1234"...
 *  - 9 dígitos que empiezan en 9  → celular peruano, se le antepone 51
 *  - 11 dígitos que empiezan en 519 → ya trae el código de Perú
 *  - con "+" y entre 8 y 15 dígitos → número internacional, se respeta
 *  - todo lo demás (fijos, números cortados) → null: no se adivina
 */
export function normalizarCelular(celular: string | null | undefined): string | null {
  if (!celular) return null
  const conMas = celular.trim().startsWith('+')
  let digitos = celular.replace(/\D/g, '')
  if (digitos.startsWith('00')) digitos = digitos.slice(2)
  if (/^9\d{8}$/.test(digitos)) return CODIGO_PERU + digitos
  if (/^519\d{8}$/.test(digitos)) return digitos
  if ((conMas || celular.trim().startsWith('00')) && digitos.length >= 8 && digitos.length <= 15) return digitos
  return null
}

const FRASE_ESTADO: Record<EstadoPedido, string> = {
  RECIBIDO: 'Recibimos tu pedido.',
  EN_PREPARACION: 'Estamos preparando tu pedido.',
  PREPARADO: 'Tu pedido está listo.',
  SALIO: 'Tu pedido salió de nuestro almacén y va en camino.',
  ENTREGADO: 'Registramos la entrega de tu pedido. ¡Gracias por confiar en nosotros!',
}

/** Mensaje según en qué etapa está el pedido. `proforma` es texto tipeado por la gente: se limpia. */
export function mensajeWhatsapp(estado: EstadoPedido, proforma: string, enlace: string): string {
  const p = proforma.replace(/\s+/g, ' ').trim().slice(0, 60) || 's/n'
  return [
    'Hola, te escribimos de Excellence Chemical.',
    FRASE_ESTADO[estado],
    `N° de proforma: ${p}`,
    `Sigue el estado de tu pedido aquí: ${enlace}`,
  ].join('\n')
}

/** Enlace que abre el chat con el mensaje puesto, o null si el celular no sirve. */
export function urlWhatsapp(celular: string | null | undefined, mensaje: string): string | null {
  const numero = normalizarCelular(celular)
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}` : null
}
