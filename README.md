# ICEMAN Ecuador

Sitio estático responsive con catálogo y rutas amigables. El inventario de `catalog.js` se preparó desde el catálogo ICEMAN adjunto; las imágenes WebP de `assets/catalog/` son recortes de los empaques que aparecen en ese documento.

## Rediseño de la página principal

La home combina navegación directa y secciones narrativas. Los paneles de productos se expanden al tocarlos o seleccionarlos con teclado, desplazando los demás y mostrando su ficha. En móvil la fila se puede desplazar horizontalmente. La franja de puntos de venta se mueve automáticamente hacia la derecha, se pausa al interactuar y respeta la preferencia de movimiento reducido.

**Contenido oficial pendiente:** ICEMAN debe entregar la lista y los logotipos de establecimientos para sustituir los espacios de prueba de “Dónde encontrarnos”. También faltan las fotografías definitivas y la aprobación editorial de las recetas. Las imágenes actuales se identifican como referenciales en la interfaz. Antes de publicar, revisar además los datos legales que ya figuran como pendientes en `/privacidad` y `/terminos`.

## Vista local

Desde la carpeta del proyecto, sirve los archivos con cualquier servidor estático local. Las rutas `/productos`, `/empresas`, `/nosotros` y `/contacto` se resuelven con el fallback de `_redirects`.

## Publicación en GitHub Pages

El repositorio incluye un flujo de GitHub Actions que publica el sitio al actualizar `main`. En la primera publicación, activa GitHub Pages desde **Settings → Pages → Build and deployment → GitHub Actions**. La dirección del proyecto será `https://icemanec.com/`. Las rutas de producto se conservan al recargar la página.

## Solicitudes comerciales

El formulario valida campos en el navegador y envía la solicitud a Formspree mediante el endpoint `https://formspree.io/f/mzedjaza`, configurado en `index.html`. Si se elimina esa configuración, conserva la preparación del mensaje para WhatsApp. Para enviar solicitudes a un servicio propio, define una etiqueta `meta[name="iceman-lead-endpoint"]` en `index.html` con la URL HTTPS de un endpoint. Ese servicio debe volver a validar los campos, aplicar límites de frecuencia, filtrar el campo honeypot `website` y guardar los datos con controles de acceso adecuados. El formulario acepta una respuesta HTTP exitosa como confirmación.

Las solicitudes se reciben en el panel de Formspree y se notifican según la configuración de esa cuenta. Verificar el correo destinatario en Formspree antes de publicar. El sitio no incluye almacenamiento propio de leads.

## Medición y privacidad

GA4 está configurado con el ID existente `G-EP2322YPPC` y solo se carga después de aceptar analítica en el aviso de consentimiento. La elección se puede cambiar desde el pie de página. La web emite eventos como `whatsapp_click`, `b2b_form_start`, `b2b_form_submit`, `product_view`, `category_view` y `contact_click`, sin enviar el texto que se escribió en la búsqueda.

Las páginas `/privacidad` y `/terminos` contienen los datos confirmados por el código y señalan la información legal que el propietario aún debe completar. Revisa esos campos antes de publicar.

### Conversiones comerciales: `generate_lead`

Inventario: el único formulario comercial es `#lead-form` en `/empresas`, compartido por restaurantes, hoteles, cafeterías, supermercados, minimarkets, distribuidores, catering y otros negocios. Los botones de cotización y el enlace de `/contacto` llevan a ese mismo formulario. `/contacto` no tiene otro formulario: ofrece WhatsApp, teléfono y oficinas. El formulario de búsqueda no es una solicitud comercial.

`generate_lead` reutiliza `track()` y la etiqueta existente `G-EP2322YPPC`. Se emite únicamente después del `response.ok` del POST al endpoint HTTPS configurado, con consentimiento de analítica vigente. El contrato existente del endpoint es que una respuesta HTTP 2xx confirma la recepción de la solicitud; el servicio debe responder con error si no la ha recibido/guardado. No usar un servicio que devuelva 2xx para errores de negocio ni para trabajo pendiente sin confirmación. No se interpretan campos JSON de respuesta porque el proyecto no define ese contrato.

Parámetros: `form_id=lead-form`, `form_name=b2b_request`, `form_path=/empresas` y `destination=backend`. No se envían nombre, empresa, correo, teléfono ni mensaje, ni se inventa un valor monetario. El bloqueo existente `data-submitting` evita POSTs y eventos duplicados mientras la solicitud está pendiente; el formulario se limpia tras el éxito. Un nuevo envío independiente sí cuenta como otro lead. Esto no deduplica solicitudes recibidas por el servidor en otros dispositivos o pestañas.

No se emite al abrir, enfocar, abandonar o validar el formulario, ante errores HTTP/red, honeypot, ni al abrir WhatsApp (incluido el enlace alternativo si se bloquea la ventana). Se mantienen `b2b_form_start`, `b2b_form_submit`, `whatsapp_click`, `contact_click`, `product_view` y `category_view`. `b2b_form_submit` con `destination=whatsapp` mide la preparación de la consulta, no su recepción comercial: no marcarlo como conversión confirmada.

**Estado:** `index.html` configura Formspree con `https://formspree.io/f/mzedjaza`. Se envía JSON con `Accept: application/json` para recibir confirmación sin redirección. Verificar en Formspree el correo destinatario y cualquier activación pendiente. El formulario envía a Formspree y abre WhatsApp con los mismos datos durante el clic de envío. Conserva un enlace con el mensaje preparado si el navegador bloquea la ventana; el enlace sigue disponible tras el éxito o el error del backend. Solo la confirmación de Formspree genera generate_lead. La recepción real y DebugView aún requieren la prueba de aceptación tras publicar.

**Pruebas automáticas:** con Node.js, ejecutar `node --test tests/lead-analytics.test.cjs`. Las pruebas ejecutan el manejador real con DOM, GA4 y red simulados; no envían solicitudes comerciales ni prueban la recepción en Google Analytics.

**Prueba de aceptación en GA4:**

1. En un entorno con el servicio de leads configurado, abrir `/empresas?ga4_debug=1`, aceptar analítica y abrir DebugView en la propiedad correspondiente a `G-EP2322YPPC`. Este parámetro añade `debug_mode=true` solo a `generate_lead`; no crea otra etiqueta. Usar datos de prueba acordados con el equipo comercial.
2. Completar y enviar el formulario. Confirmar primero que el POST obtuvo una respuesta 2xx que acredita la recepción. En las herramientas de red del navegador comprobar la petición GA4 `g/collect` con `en=generate_lead` y modo de depuración. En DebugView debe aparecer un solo `generate_lead` con los parámetros indicados.
3. Repetir haciendo doble clic mientras el POST está pendiente: una solicitud y un evento. Una vez limpio el formulario, intentar enviarlo vacío: cero eventos nuevos. Un nuevo formulario válido y recibido genera otro evento.
4. Abrir/enfocar/abandonar el formulario, enviar datos inválidos, simular HTTP 500 o pérdida de red y probar sin endpoint (WhatsApp): cero `generate_lead`. Rechazar analítica también debe producir cero eventos GA4 de lead.
5. Comprobar que siguen apareciendo `contact_click`, `product_view` y `category_view` al navegar con analítica aceptada. Salir del modo de prueba quitando `ga4_debug=1` de la URL.
6. En Administración de GA4, marcar `generate_lead` como evento clave para medir conversiones comerciales. Revisar que no haya reglas de GA4/GTM que creen otro `generate_lead` desde clics o `b2b_form_submit`, porque esas reglas no están en este repositorio.

La recepción en DebugView y la configuración como evento clave requieren acceso a la propiedad GA4 y un envío confirmado real; las pruebas automáticas no acreditan esa recepción.

El dominio personalizado es `icemanec.com`, declarado en `CNAME`. Las URLs de `index.html`, `robots.txt` y `sitemap.xml` usan `https://icemanec.com`. Las cabeceras de seguridad, la redirección HTTP a HTTPS y el dominio canónico se deben configurar en hosting/DNS; GitHub Pages no permite definir esas cabeceras desde estos archivos estáticos.
