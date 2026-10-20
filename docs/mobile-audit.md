# Auditoría y correcciones de experiencia móvil — 20 octubre 2026

Se conserva la identidad visual, tipografía, paleta, fotografías, escena sticky,
parallax, flotación de empaques, acordeón desktop y transiciones de productos.

## Problemas corregidos

- El detector touchend del showcase añadía un desplazamiento programático encima
  del scroll nativo y confundía gestos diagonales con cambios de producto.
  Ahora la selección sigue la posición real del carrusel en un único frame.
- Las reglas heredadas de flex-basis reducían las tarjetas no seleccionadas a
  76 px. Móvil y tablet hasta 820 px usan tarjetas completas, con imagen,
  título y detalle en flujo normal, sin coordenadas absolutas que se solapen.
- Los carriles restringidos a touch-action:pan-x bloqueaban el gesto vertical.
  Ahora permiten desplazamiento en ambos ejes y zoom nativo.
- Abrir menú o búsqueda reconstruía la ruta y reiniciaba sus animaciones.
  Ahora se actualizan los controles existentes, conservando el contenido.
  El menú permite recorrer el foco, cerrar con Escape y volver al control.
- El controlador de movimiento releía dimensiones y estilos computados del
  hero durante cada scroll. Cachea las dimensiones mediante ResizeObserver,
  separa lecturas de escrituras y evita actualizar el hero fuera de pantalla.
- La marquesina mantenía frames activos mientras estaba pausada. Se detienen
  esos frames y se gestiona touchcancel para no dejarla pausada accidentalmente.
- La escena móvil usa unidades svh para evitar que las barras del navegador
  alteren su altura durante el desplazamiento; respeta las áreas seguras.
- La imagen inicial PNG de 2 MB dispone de variantes WebP de 57 y 145 KB,
  con srcset y preload concordantes. La selección depende del ancho y densidad.
- Se atienden cambios de movimiento reducido durante la sesión y se limpian
  observadores y frames cuando cambia la ruta.

## Validación ejecutada

- 12 pruebas existentes: aprobadas (formularios, analítica y recetas).
- Sintaxis de JavaScript y git diff --check: aprobados.
- Chrome con emulación móvil: 320, 375, 390, 430, 640, 768, 820 px.
- Chrome desktop: 1024 y 1440 px.
- En esos nueve anchos: portada, productos, recetas, empresas, nosotros,
  contacto, privacidad y términos; sin desbordamiento horizontal ni errores
  JavaScript observados. En el carrusel móvil se comprueban dimensiones,
  separación entre imagen/título/detalle, contador, navegación y vuelta al inicio.
- Gestos táctiles mediante Chrome DevTools Protocol: scroll vertical sobre el
  carrusel y swipe horizontal nativo; ambos aprobados.
- Foco del menú, Escape, conservación del DOM y cambio en vivo de preferencia
  de movimiento reducido: aprobados.

El proyecto es estático; no tiene compilación ni package.json. Su flujo de
publicación sube los archivos directamente a GitHub Pages.

Para repetir las pruebas de navegador, servir esta carpeta y ejecutar:

```sh
node --test tests/*.test.cjs
python3 -m http.server 8765 --bind 127.0.0.1
# En otra terminal, con Playwright y Chromium instalados:
node tests/mobile-browser.cjs
```

Las variables opcionales TEST_URL, PLAYWRIGHT_MODULE y CHROME_PATH permiten
cambiar servidor, ubicación de Playwright y ejecutable de Chrome.

## Límites de la validación

No se han medido Core Web Vitals de usuarios reales, ni se certifican 60 FPS.
La reducción de transferencia y trabajo por frame son cambios verificables,
no sustitutos de métricas de campo. Falta validar Safari en iPhone físico y
Android de gama baja. No se enviaron solicitudes comerciales reales, mensajes
ni formularios externos durante estas pruebas.
