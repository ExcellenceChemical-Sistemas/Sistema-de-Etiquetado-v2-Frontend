<script setup lang="ts">
import LegalDocumento from '~/components/LegalDocumento.vue'
import { EMPRESA } from '~/config/empresa'

definePageMeta({ layout: 'legal' })
useHead({ title: 'Política de seguridad — Excellence Chemical' })
</script>

<template>
  <LegalDocumento titulo="Política de seguridad de la información">
    <p>
      Esta página resume las medidas con las que {{ EMPRESA.razonSocial }} protege la información que
      maneja en su sistema de gestión. Describe lo que el sistema hace hoy; no es una certificación.
    </p>

    <h2>1. Acceso y autenticación</h2>
    <ul>
      <li>Cada persona entra con su propia cuenta. La contraseña se guarda cifrada por el proveedor de autenticación y nadie de la empresa puede verla.</li>
      <li>Puedes activar un segundo factor de verificación (código temporal desde una app autenticadora) en «Mi cuenta».</li>
      <li>Al cambiar la contraseña se cierran las sesiones abiertas en tus otros dispositivos.</li>
      <li>Las cuentas se pueden desactivar de inmediato, sin perder su historial.</li>
    </ul>

    <h2>2. Permisos</h2>
    <ul>
      <li>Cada usuario solo accede a los módulos y acciones que se le asignan (ver, crear, editar, eliminar).</li>
      <li>Los permisos se verifican en el servidor en cada solicitud, no solo en la pantalla.</li>
      <li>Los documentos de indicadores y del sistema de gestión tienen permisos propios por carpeta y por tipo de archivo.</li>
      <li>Los cambios de permisos y de estado de cuentas quedan en un registro de auditoría.</li>
    </ul>

    <h2>3. Protección de los datos</h2>
    <ul>
      <li>Toda la comunicación con el sistema viaja cifrada (HTTPS).</li>
      <li>La base de datos solo se consulta desde el servidor del sistema, con la seguridad a nivel de fila activada.</li>
      <li>Los archivos subidos (PDF, documentos) se validan por tipo y por su contenido real, con un tamaño máximo.</li>
      <li>Los archivos se abren con enlaces temporales que caducan a los pocos minutos.</li>
      <li>Se hacen copias de respaldo periódicas de la base de datos.</li>
    </ul>

    <h2>4. Páginas y enlaces públicos</h2>
    <ul>
      <li>El enlace de seguimiento de un pedido usa un código aleatorio prácticamente imposible de adivinar; quien no lo tiene no puede ver el pedido.</li>
      <li>Las páginas públicas muestran solo una lista cerrada de datos, sin información interna ni nombres de personas.</li>
      <li>Las páginas públicas tienen un límite de solicitudes por minuto para evitar abusos.</li>
    </ul>

    <h2>5. Protección de la aplicación</h2>
    <ul>
      <li>Límite general de solicitudes por dirección de red.</li>
      <li>Cabeceras de seguridad del navegador y protección contra la inclusión del sitio en páginas ajenas.</li>
      <li>Revisión periódica de las dependencias de software en busca de vulnerabilidades conocidas.</li>
      <li>Pruebas automáticas en cada cambio y comprobación programada del estado del servicio.</li>
    </ul>

    <h2>6. Qué te pedimos a ti</h2>
    <ul>
      <li>No compartas tu contraseña ni tu código de verificación.</li>
      <li>Activa el segundo factor de verificación.</li>
      <li>Cierra la sesión en equipos compartidos.</li>
      <li>Avísanos si sospechas que tu cuenta fue usada por otra persona.</li>
    </ul>

    <h2>7. Reportar un problema de seguridad</h2>
    <p v-if="EMPRESA.correoPrivacidad">
      Si encuentras una falla o crees que hubo un acceso indebido, escríbenos a
      <a :href="`mailto:${EMPRESA.correoPrivacidad}`">{{ EMPRESA.correoPrivacidad }}</a>. No publiques la
      falla antes de que la revisemos.
    </p>
    <p v-else>
      Si encuentras una falla o crees que hubo un acceso indebido, comunícate con
      {{ EMPRESA.razonSocial }} por los canales de contacto de su sitio web. No publiques la falla antes
      de que la revisemos.
    </p>
    <p>
      Si ocurre un incidente que afecte datos personales, actuaremos según la normativa aplicable.
      Ningún sistema es totalmente infalible, pero trabajamos para reducir los riesgos.
    </p>

    <p>
      Más información sobre el tratamiento de datos personales en la
      <NuxtLink to="/privacidad">política de privacidad</NuxtLink>.
    </p>
  </LegalDocumento>
</template>
