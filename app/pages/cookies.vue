<script setup lang="ts">
import LegalDocumento from '~/components/LegalDocumento.vue'
import { EMPRESA } from '~/config/empresa'

definePageMeta({ layout: 'legal' })
useHead({ title: 'Política de cookies — Excellence Chemical' })
</script>

<template>
  <LegalDocumento titulo="Política de cookies y almacenamiento en el navegador">
    <p>
      El sistema de {{ EMPRESA.razonSocial }} no usa cookies de publicidad, de analítica ni de
      seguimiento, y no incluye herramientas de terceros que rastreen a las personas que lo visitan.
    </p>

    <h2>1. Qué guarda el sistema en tu navegador</h2>
    <p>
      Solo usa el almacenamiento local del navegador (no cookies) para dos cosas, ambas necesarias para
      que el sistema funcione o para recordar tu preferencia:
    </p>
    <ul>
      <li><strong>Sesión de acceso:</strong> mantiene tu sesión iniciada. Es imprescindible para entrar al sistema y se borra al cerrar sesión.</li>
      <li><strong>Apariencia:</strong> recuerda si prefieres el modo claro u oscuro y la paleta de color que elegiste.</li>
    </ul>
    <p>
      Como se trata únicamente de almacenamiento necesario o de una preferencia que tú eliges, no
      mostramos un aviso para aceptar o rechazar cookies. Si en el futuro incorporamos herramientas de
      analítica u otras que no sean necesarias, te pediremos tu consentimiento antes de activarlas y
      actualizaremos esta página.
    </p>

    <h2>2. Páginas públicas</h2>
    <p>
      Las páginas de seguimiento de pedidos y de trazabilidad de producto no guardan nada en tu navegador,
      salvo tu preferencia de apariencia si ya la habías elegido.
    </p>

    <h2>3. Servicios de terceros</h2>
    <p>
      El sistema se conecta con sus proveedores de infraestructura para funcionar (autenticación, base de
      datos, alojamiento). Están indicados en la
      <NuxtLink to="/privacidad">política de privacidad</NuxtLink>. El sistema no carga fuentes, scripts
      de analítica, redes sociales ni publicidad de otros sitios.
    </p>

    <h2>4. Cómo borrar estos datos</h2>
    <ul>
      <li>Cerrar sesión elimina la sesión guardada.</li>
      <li>También puedes borrar los datos del sitio desde la configuración de tu navegador. Después tendrás que iniciar sesión de nuevo y elegir otra vez tu apariencia.</li>
    </ul>
  </LegalDocumento>
</template>
