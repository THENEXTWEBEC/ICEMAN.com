# Informe de optimización de imágenes — 30 de octubre de 2026

## Trabajo realizado

- Se auditaron 221 imágenes en `assets/`: 127 PNG, 90 WebP y 4 JPEG. Los PNG sumaban 165,92 MiB; varios platos y recortes de empaques pesaban entre 2 y 3 MiB cada uno.
- Se generaron equivalentes WebP con calidad 92, conservando transparencia. Los 127 equivalentes suman 21,44 MiB: **87,1 % menos bytes** frente a esos mismos PNG.
- Los PNG originales permanecen disponibles. En navegadores que admiten WebP, el sitio usa la versión WebP; cuando no, conserva el PNG original como alternativa.
- Se crearon variantes de catálogo de 320, 640 y 960 px con `srcset` y `sizes`. Las tarjetas y comparadores de productos ya no descargan por defecto el original de resolución completa.
- Se añadieron variantes de 480, 960 y 1200 px para el hero de inicio. El preload y la imagen usan el mismo conjunto responsive. El hero conserva prioridad alta; las imágenes de secciones posteriores permanecen diferidas.
- Se quitaron prioridades altas que estaban asignadas a algunas imágenes con carga diferida, y se añadió una versión de caché a las nuevas URLs WebP.
- En el catálogo móvil se ajustó `sizes` al ancho real de una tarjeta de dos columnas (46vw), en vez de estimar que cada imagen ocupaba 82vw. El navegador ahora elige una variante menor en teléfonos.
- En los listados por categoría solo el primer comparador recibe prioridad alta; se conservan dos tarjetas iniciales en carga eager y el resto queda diferido. Así se reduce la competencia entre descargas al abrir «Productos».

## Comprobaciones hechas

- En el comparador móvil de Papas Air Fryer, el navegador seleccionó las variantes de 320 px: 59,4 KB para el plato y 37,9 KB para el empaque. Los PNG originales equivalentes suman 4.608,0 KB: **97,9 % menos bytes para ese par de imágenes**.
- La variante de hero de 480 px pesa 33,9 KB; el archivo de 1672 px pesa 145,0 KB. El navegador elige otra variante en pantallas con mayor densidad.
- En la página de Papas se comprobó que solo el primer par conserva prioridad alta, el segundo par carga sin prioridad alta y las tarjetas siguientes usan carga diferida. El `sizes` emitido corresponde a una tarjeta de catálogo.
- La home y la página de producto se revisaron en anchos CSS de 320, 375, 390 y 430 px. No se observó desbordamiento horizontal ni imágenes rotas entre las imágenes que el navegador había cargado. El comparador y sus proporciones se mantuvieron.
- `node --check` pasó para `app.js` y `motion-experience.js`; pasaron las 24 pruebas unitarias existentes. Dos comprobaciones de navegador no arrancaron por falta del paquete Playwright en este entorno.

## Métricas de laboratorio pendientes

No se obtuvieron resultados Lighthouse ni trazas equivalentes de antes y después. La sesión de Chrome DevTools disponible ya estaba ocupada, así que no fue posible ejecutar su auditoría. Tampoco se simuló 4G ni se midieron LCP, CLS, TBT o INP en un dispositivo controlado. Las reducciones anteriores comparan bytes reales de archivos y candidatos responsive; no representan una medición de transferencia total de una visita ni una puntuación Lighthouse.

El despliegue actual publica el directorio completo mediante GitHub Pages. No ofrece una configuración de servidor en este repositorio para definir `Cache-Control`, Brotli o Gzip; no se añadieron cabeceras que esa plataforma pudiera ignorar. Las URLs WebP nuevas incluyen una versión de caché.
