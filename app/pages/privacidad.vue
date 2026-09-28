<script setup lang="ts">
import LegalDocumento from '~/components/LegalDocumento.vue'
import { EMPRESA } from '~/config/empresa'

definePageMeta({ layout: 'legal' })
useHead({ title: 'Política de privacidad — Excellence Chemical' })
</script>

<template>
  <LegalDocumento titulo="Política de privacidad y protección de datos personales">
    <p>
      Esta política explica qué datos personales trata {{ EMPRESA.razonSocial }} en su sistema de
      gestión, para qué los usa, con quién los comparte y cómo puedes ejercer tus derechos, conforme a la
      Ley N.° 29733, Ley de Protección de Datos Personales, y su reglamento.
    </p>

    <h2>1. Responsable del tratamiento</h2>
    <ul>
      <li>Razón social: {{ EMPRESA.razonSocial }}</li>
      <li v-if="EMPRESA.ruc">RUC: {{ EMPRESA.ruc }}</li>
      <li v-if="EMPRESA.domicilio">Domicilio: {{ EMPRESA.domicilio }}</li>
      <li v-if="EMPRESA.telefono">Teléfono: {{ EMPRESA.telefono }}</li>
      <li v-if="EMPRESA.correoPrivacidad">
        Contacto para datos personales:
        <a :href="`mailto:${EMPRESA.correoPrivacidad}`">{{ EMPRESA.correoPrivacidad }}</a>
      </li>
      <li>Sitio web de la empresa: <a :href="EMPRESA.sitioWeb" rel="noopener">{{ EMPRESA.sitioWeb }}</a></li>
    </ul>

    <h2>2. Qué es este sistema</h2>
    <p>
      Es una plataforma interna de gestión (productos, lotes, etiquetas, pedidos, indicadores y
      documentos) que usa el personal autorizado. Además tiene dos páginas públicas que se abren con un
      enlace o un código QR: el seguimiento de un pedido y la información de trazabilidad de un producto
      etiquetado. No hay registro de usuarios abierto al público ni tienda en línea.
    </p>

    <h2>3. Datos que tratamos y para qué</h2>
    <p><strong>Personal y usuarios del sistema</strong></p>
    <ul>
      <li>Nombre, correo electrónico y, si la persona quiere, una foto de perfil.</li>
      <li>Datos de acceso: la contraseña la gestiona el proveedor de autenticación y se guarda cifrada; si activas el segundo factor, también su configuración.</li>
      <li>Registro de acciones dentro del sistema (por ejemplo, etiquetas generadas, cambios de permisos y de estado de pedidos).</li>
      <li>Finalidad: permitir el acceso seguro, aplicar permisos y mantener la trazabilidad interna.</li>
    </ul>
    <p><strong>Clientes</strong></p>
    <ul>
      <li>Nombre o razón social, tipo y número de documento, dirección, celular y correo. Solo el nombre es obligatorio; el resto se pide únicamente si es necesario.</li>
      <li>Datos del pedido: número de proforma y fechas de cada etapa.</li>
      <li>Finalidad: gestionar y hacer seguimiento de los pedidos y avisar al cliente cuando su pedido sale y cuando se entrega.</li>
      <li>El personal registra en el sistema que informó al cliente y que este autoriza el uso de sus datos de contacto.</li>
    </ul>
    <p><strong>Personas que abren las páginas públicas</strong></p>
    <ul>
      <li>No se piden datos ni se crean cuentas. La página de seguimiento de un pedido muestra solo el número de proforma y las fechas de cada etapa.</li>
      <li>Solo se cuenta cuántas veces se abre una etiqueta o un documento, sin identificar a quien lo abre.</li>
      <li>Como en cualquier sitio web, los proveedores de alojamiento pueden registrar datos técnicos de la conexión (como la dirección IP) por seguridad y funcionamiento.</li>
    </ul>

    <h2>4. Lo que no hacemos</h2>
    <ul>
      <li>No vendemos ni cedemos datos personales para publicidad.</li>
      <li>No usamos cookies de publicidad, analítica ni seguimiento (ver la <NuxtLink to="/cookies">política de cookies</NuxtLink>).</li>
      <li>No elaboramos perfiles de las personas ni tomamos decisiones automatizadas sobre ellas.</li>
    </ul>

    <h2>5. Con quién compartimos los datos</h2>
    <p>
      Usamos proveedores que tratan datos por nuestra cuenta para que el sistema funcione, y solo para
      ese fin:
    </p>
    <ul>
      <li>Supabase: autenticación, base de datos y almacenamiento de archivos.</li>
      <li>Render: servidor donde funciona la API del sistema.</li>
      <li>Vercel: alojamiento de la aplicación web.</li>
    </ul>
    <p>
      Estos proveedores pueden tener sus servidores fuera del Perú, incluidos los Estados Unidos, por lo
      que tus datos pueden ser transferidos al extranjero. No compartimos datos con otras empresas,
      salvo obligación legal o requerimiento de una autoridad competente.
    </p>

    <h2>6. Cuánto tiempo los conservamos</h2>
    <ul>
      <li>Cuentas de personal: mientras estén activas. Al desactivar una cuenta se conserva su historial de acciones.</li>
      <li>Clientes y pedidos: mientras dure la relación comercial y durante los plazos que exijan las normas aplicables.</li>
      <li>Enlace de seguimiento de un pedido: deja de abrirse un tiempo después de la entrega (90 días por defecto).</li>
      <li>Imágenes de etiquetas enviadas a imprimir: se eliminan automáticamente a los pocos días.</li>
      <li>Hacemos copias de respaldo periódicas de la base de datos; contienen los mismos datos que el sistema.</li>
    </ul>

    <h2>7. Tus derechos</h2>
    <p>
      Puedes solicitar información, acceso, rectificación, cancelación u oposición sobre tus datos
      personales, así como revocar tu consentimiento cuando este sea la base del tratamiento.
    </p>
    <p v-if="EMPRESA.correoPrivacidad">
      Escríbenos a <a :href="`mailto:${EMPRESA.correoPrivacidad}`">{{ EMPRESA.correoPrivacidad }}</a>
      indicando tu nombre, tu documento de identidad y lo que solicitas. Responderemos dentro de los plazos
      que fija la normativa.
    </p>
    <p v-else>
      Para ejercerlos, comunícate con {{ EMPRESA.razonSocial }} por los canales de contacto de su sitio web.
      Responderemos dentro de los plazos que fija la normativa.
    </p>
    <p>
      Si consideras que no atendimos tu solicitud, puedes presentar un reclamo ante la Autoridad
      Nacional de Protección de Datos Personales (Ministerio de Justicia y Derechos Humanos).
    </p>

    <h2>8. Seguridad</h2>
    <p>
      Aplicamos medidas técnicas y organizativas para proteger los datos. Están descritas en la
      <NuxtLink to="/seguridad">política de seguridad</NuxtLink>.
    </p>

    <h2>9. Menores de edad</h2>
    <p>El sistema es de uso empresarial y no está dirigido a menores de edad.</p>

    <h2>10. Cambios en esta política</h2>
    <p>
      Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha de
      actualización.
    </p>
  </LegalDocumento>
</template>
