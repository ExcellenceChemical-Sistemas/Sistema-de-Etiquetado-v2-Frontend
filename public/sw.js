// Service worker mínimo, solo para Web Push (no cachea nada ni hace la app offline-first a
// propósito: evita que un SW viejo sirva una build vieja del SPA sin que el usuario se entere).

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let datos = { title: 'Excellence Chemical', body: 'Tenés una notificación nueva.', url: '/mensajeria' }
  try {
    if (event.data) datos = { ...datos, ...event.data.json() }
  } catch {
    // payload no era JSON: se queda con el texto por defecto de arriba
  }

  event.waitUntil(
    self.registration.showNotification(datos.title, {
      body: datos.body,
      icon: '/excellence-chemical-icon.png',
      badge: '/excellence-chemical-icon.png',
      data: { url: datos.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/mensajeria'

  event.waitUntil(
    (async () => {
      const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existente = clientes.find((c) => new URL(c.url).pathname === url)
      if (existente) {
        await existente.focus()
      } else {
        await self.clients.openWindow(url)
      }
    })(),
  )
})
