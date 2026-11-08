# Niko y las Islas Errantes

Aventura original de plataformas para navegador, protagonizada por Niko. Incluye una travesía por 30 islas, controles táctiles y teclado, y funciona sin instalar Python, Emscripten, Node, paquetes ni recursos externos.

## Jugar

**La forma más sencilla:** descarga el repositorio como ZIP, descomprímelo y abre `index.html` con Safari, Chrome, Firefox o Edge. No necesita compilarse, usar Terminal ni ejecutar un servidor. También puedes abrir la página publicada en GitHub Pages desde cualquier dispositivo con navegador.

El juego dibuja sus gráficos y sonidos localmente. No requiere conexión a internet para jugar después de obtener los archivos. El diseño se adapta a pantallas pequeñas e incluye botones táctiles.

## Controles

- Mover: flechas o **A / D**; pantalla táctil: botones ◀ ▶
- Saltar: **Espacio** o **↑**; pantalla táctil: botón **SALTAR**
- Pausar / continuar: **Esc** o **P**
- Reiniciar la isla: **R**
- Empezar: **Enter** o tocar/clicar el juego
- Sonido: botón **Sonido** (apagado inicialmente)
- Gamepad: palanca izquierda y botón A / X, si el navegador detecta uno

En ordenador, haz clic en el juego para darle el foco antes de usar el teclado. Cambiar de pestaña pausa el juego.

## Contenido

La aventura comienza en la Costa del Viento y recorre 30 islas de paletas de color distintas. Cada tramo incluye plataformas y brechas, un ascensor móvil, peligros de viento señalizados, pinchos, criaturas patrulleras, fragmentos coleccionables, un checkpoint y una meta. El arte se genera con Canvas; el juego no descarga música, imágenes ni fuentes.

Las 30 islas comparten el diseño base con variaciones visuales: son una aventura prototipo, no 30 campañas hechas a mano.

## Desarrollo

No hay paso de build. Para jugar localmente, abre `index.html`. Para publicar, sirve los archivos estáticos de este repositorio (por ejemplo, con GitHub Pages). `src/game.js`, `style.css` e `index.html` son todo lo necesario para la versión de navegador; el antiguo `src/game.cpp` queda como experimento no utilizado.
