// Registra el service worker al cargar la app, sin pedir permiso de notificaciones todavía.
// Necesario para que el navegador considere la app "instalable" (PWA): Chrome exige un SW
// activo antes de ofrecer el prompt de instalación. usePushNotifications.ts vuelve a registrar
// el mismo /sw.js (ya registrado, es un no-op) recién cuando el usuario activa el push.
export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Instalación silenciosa: si falla, el push y la instalabilidad simplemente no están
    // disponibles en este navegador, no hace falta interrumpir al usuario por esto.
  })
})
