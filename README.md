# ICEMAN Ecuador

Sitio estático responsive con catálogo y rutas amigables. El inventario de `catalog.js` se preparó desde el catálogo ICEMAN adjunto; las imágenes WebP de `assets/catalog/` son recortes de los empaques que aparecen en ese documento.

## Vista local

Desde la carpeta del proyecto, sirve los archivos con cualquier servidor estático local. Las rutas `/productos`, `/empresas`, `/nosotros` y `/contacto` se resuelven con el fallback de `_redirects`.

## Publicación en GitHub Pages

El repositorio incluye un flujo de GitHub Actions que publica el sitio al actualizar `main`. En la primera publicación, activa GitHub Pages desde **Settings → Pages → Build and deployment → GitHub Actions**. La dirección del proyecto será `https://thenextwebec.github.io/ICEMAN.com/`. Las rutas de producto se conservan al recargar la página.

## Solicitudes comerciales

El formulario valida campos en el navegador y prepara el mensaje para WhatsApp. Para enviar solicitudes a un servicio propio, define una etiqueta `meta[name="iceman-lead-endpoint"]` en `index.html` con la URL HTTPS de un endpoint. Ese servicio debe volver a validar los campos, aplicar límites de frecuencia, filtrar el campo honeypot `website` y guardar los datos con controles de acceso adecuados. El formulario acepta una respuesta HTTP exitosa como confirmación.

No hay un endpoint de leads ni almacenamiento configurado en esta carpeta. Mientras no se configure, la persona revisa y envía manualmente su consulta desde WhatsApp.

## Medición y privacidad

GA4 está configurado con el ID existente `G-EP2322YPPC` y solo se carga después de aceptar analítica en el aviso de consentimiento. La elección se puede cambiar desde el pie de página. La web emite eventos como `whatsapp_click`, `b2b_form_start`, `b2b_form_submit`, `product_view`, `category_view` y `contact_click`, sin enviar el texto que se escribió en la búsqueda.

Las páginas `/privacidad` y `/terminos` contienen los datos confirmados por el código y señalan la información legal que el propietario aún debe completar. Revisa esos campos antes de publicar.

El sitemap y `robots.txt` se generan para la URL de GitHub Pages documentada arriba. Si se configura un dominio personalizado, actualiza la URL base en `index.html`, `robots.txt` y `sitemap.xml`. Las cabeceras de seguridad, la redirección HTTP a HTTPS y el dominio canónico se deben configurar en hosting/DNS; GitHub Pages no permite definir esas cabeceras desde estos archivos estáticos.
