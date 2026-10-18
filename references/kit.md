# Referencia del kit

Todo lo que usan las lecciones, por capas. Abajo está el núcleo isométrico, `iso-kit.mjs`, que viene del proyecto original. Encima, `brick.mjs` con las piezas LEGO. Luego los kits especializados (`lego-round`, `lego-tube`, `lego-figure`, `lego-spin`, `lego-fx` y `lego-audit`). Arriba del todo, `lesson.mjs`, que monta la página. La `SKILL.md` resume lo esencial de cada uno; aquí están todas las funciones con sus opciones.

**Unidades.** El mundo va en milímetros de LEGO: `x` e `y` en el suelo y `z` hacia arriba. Un *stud* mide 8, una placa 3,2 y un ladrillo 9,6. Las piezas de rejilla (`brick`, `round`, `dome`…) reciben `x`, `y`, `w` y `d` en *studs*, y `z` y `h` en placas. Las piezas libres (`custom`, `pipe`, `ball`, `wheel`, `turned`…) reciben milímetros. La cámara mira desde +x, +y y desde arriba, así que de cada pieza se ven las caras +x, +y y la de arriba.

## Contenido
1. El núcleo: `iso-kit.mjs`
2. Piezas: `brick.mjs`
3. Piezas redondas: `lego-round.mjs`
4. Mangueras, tubos y cables: `lego-tube.mjs`
5. Minifiguras: `lego-figure.mjs`, y LEGO City: `lego-city.mjs`
6. Piezas que giran: `lego-spin.mjs`
7. Efectos WebGL: `lego-fx.mjs`
8. Auditoría: `lego-audit.mjs`
9. La página: `lesson.mjs`
10. Herramientas
11. Ampliar el kit

## 1. El núcleo: `iso-kit.mjs`

Proyección isométrica y página base. Las lecciones usan sobre todo esto:

| Función | Qué hace |
|---|---|
| `fitProjection(points, width, height, { pad = 24, headroom = 0, azimuth = 45, elevation = 30 })` | La cámara que encaja esos puntos en el `viewBox`. Pasa las esquinas de la escena (`boxCorners`) y los puntos más altos. Las lecciones usan `azimuth: 55`. |
| `boxCorners({ x, y, w, d }, z0, z1)` | Las ocho esquinas de una caja, para `fitProjection`. |
| `iso([x, y, z], P)` | De mundo a pantalla: `[sx, sy]`. |
| `depthOf([x, y, z], P)` | Profundidad: cuanto mayor, más cerca. Se ordena de menor a mayor para pintar de atrás adelante. |
| `cameraOf(P)` | `{ sinA, cosA, sinE, cosE, k }`; `k` son los píxeles por milímetro. |
| `towardViewer(P)` | La dirección en el suelo que apunta hacia quien mira. |
| `pathOf(points, closed)` | Un `d` de SVG a partir de puntos de pantalla, redondeado a 0,1. |
| `translateAlong(P, [dx, dy, dz])` | Un `"translate(x y)"` que mueve un grupo ya dibujado según un desplazamiento en el mundo: el avión, el kart, el pistón. |
| `axisVector(P, [dx, dy, dz])` | El vector de pantalla de un desplazamiento en el mundo. |
| `screenRise(h, P)` | Cuántos píxeles ocupa una altura `h`. |
| `figureSvg({ width, height, label, body })` | El `<svg>` de la escena. `lessonSvg` lo envuelve. |
| `plateHtml(…)`, `pageHtml(…)`, `ISO_CSS` | La tarjeta y la página base. `lessonHtml` las usa por dentro. |

También están los constructores del Anatomy original: sólidos extruidos (`slabOf`, `cylinder`, `extrude`, `roundedPlan`, `insetPlan`); líneas sobre caras (`onTop`, `lineOnTop`, `planOutline`, `ring`, `segment`, `rise`, `sideArc`, `sideRing`, `sideSeam`); detalles (`knurl`, `coil`, `topTicks`, `sideTicks`, `radialTicks`, `dotGrid`, `corners`); marcas en SVG (`lineSvg`, `dotsSvg`, `wireSvg`, `fadeLineSvg`, `faceTextSvg`); y matrices para pegar texto en una cara (`topMatrix`, `sideMatrix`). Las lecciones casi nunca los necesitan, porque `brick.mjs` dibuja con su propio sombreado. Sirven si hace falta una marca fina sobre una pieza: una escala, un muelle, un texto grabado.

En la página, la lección incrusta el núcleo entero (`kitScript()`), así que `iso`, `depthOf`, `cameraOf`, `pathOf` y `translateAlong` se pueden usar en el `script`.

## 2. Piezas: `brick.mjs`

### Medidas, colores y sombreado

| Nombre | Qué es |
|---|---|
| `STUD` 8, `PLATE` 3,2, `BRICK` 9,6, `STUD_R` 2,4, `STUD_H` 1,7, `GAP` 0,1 | Medidas de LEGO en milímetros. `GAP` es la holgura entre piezas, que los constructores de rejilla ya aplican. |
| `COLORS`, `colorOf(nombre)` | La paleta: `red`, `yellow`, `blue`, `green`, `bright-green`, `lime`, `white`, `black`, `light-gray`, `dark-gray`, `tan`, `dark-tan`, `brown`, `orange`, `azure`, `skin`, `trans-yellow` y `trans-clear`. Cualquier otro `#rrggbb` también vale. |
| `LIGHT` | La dirección de la luz de folleto: arriba claro, la cara +y media y la cara +x oscura. |
| `tone(color, intensidad)`, `edgeOf(color)`, `mix(a, b, t)` | El tono de una cara según cuánto mira a la luz, el color del contorno y la mezcla de dos colores. |
| `BRICK_CSS` | Los estilos de piezas, *studs*, caras, mangueras y anillos. `lessonHtml` ya los incluye. |

### Caras y sólidos

Una cara es una lista de puntos 3D. Un sólido es una lista de caras.

| Función | Qué hace |
|---|---|
| `boxFaces(x0, y0, z0, x1, y1, z1)` | Una caja. |
| `prismFaces(ring, z0, z1)` | Un prisma vertical a partir de un contorno en el suelo. |
| `circleOf(cx, cy, r, steps = 24)` | Un círculo como contorno. |
| `cylinderFaces(cx, cy, r, z0, z1, steps = 24)` | Un cilindro vertical. |
| `frustumFaces(cx, cy, r0, z0, r1, z1, steps = 24)` | Un cono truncado: pantallas, árboles, chimeneas. |
| `extrudeFaces(profile, "x" \| "y", from, to)` | Un perfil empujado a lo largo de `x` (perfil en `[y, z]`) o de `y` (perfil en `[x, z]`): rampas, tejados, alas, cilindros tumbados. |
| `solidSvg(faces, color, P, { trans, glow, crease = 28 })` | Dibuja un sólido **convexo**: rellena las caras visibles, marca aristas donde dos caras forman más de `crease` grados y dibuja el contorno. Para sólidos cóncavos, `meshSvg` de `lego-round`. |
| `studSvg(cx, cy, z, color, P, { r, h })`, `studsSvg(points, color, P)` | Un *stud* suelto o varios, ordenados de atrás adelante. |

### Piezas de escena

Una pieza es un objeto `{ box, svg(P), … }`, y `sceneSvg` las ordena y las dibuja. Todas aceptan además estas opciones:

| Opción | Para qué |
|---|---|
| `step` | El paso de la lección en que aparece (0 por defecto). |
| `until` | El último paso en que se ve: una manguera que se retira, unos soportes que se quitan. |
| `id` | Sale como `data-id`, para clics y estilos. |
| `name` | El nombre que usa la auditoría en sus mensajes. |
| `overlaps`, `float`, `offGrid` | Excepciones para la auditoría (§ 8). |

| Función | Qué hace |
|---|---|
| `brick({ x, y, z, w = 1, d = 1, h = 3, color, studs = true, trans })` | Ladrillo de rejilla. `plate(…)` es `h: 1` y `tile(…)` es una placa sin *studs*. |
| `round({ x, y, z, w = 1, h = 3, color, studs, trans, glow, steps })` | Pieza redonda de diámetro `w` *studs*. |
| `custom({ faces, color, trans, glow, extra, box })` | Cualquier sólido convexo. `extra(P)` dibuja encima (un símbolo, una cara) y `box` sustituye a la caja calculada. |
| `pipe({ axis: "x" \| "y" \| "z", from, to, at, r = 2.4, color = "blue", steps })` | Tubería recta en milímetros. `at` son las otras dos coordenadas: `[y, z]` para `x`, `[x, z]` para `y` y `[x, y]` para `z`. Trae `overlaps: true`, porque se mete en lo que conecta. |
| `group({ parts, box })` | Varias piezas que se ordenan como una sola. Las partes se dibujan en el orden de la lista, de atrás adelante. |
| `boxOf(x0, y0, z0, x1, y1, z1)` | La caja de una pieza, para las que se hacen a mano. |

Cada pieza lleva también `kind`, `color` y, si es de rejilla, `grid` (`circle` las redondas), que usa la auditoría.

### Orden y escena

| Función | Qué hace |
|---|---|
| `sceneSvg(pieces, P, { shadows = false, ground = 3 placas })` | Ordena las piezas y envuelve cada una en `<g class="lb-piece" data-step data-until data-id>`, que es lo que hace que caigan en su paso. Con `shadows`, las piezas de pie hasta la altura `ground` proyectan una sombra suave de contacto (una pieza decide con `shadow: true/false`). No dibuja los *studs* tapados por otra pieza apoyada encima. |
| `orderPieces(pieces, P)` | Solo el orden. Donde dos piezas se solapan en pantalla y están separadas en algún eje, la de más cerca va después; si no se separan en ninguno, decide la profundidad del centro. Si piezas que se atraviesan forman un ciclo, se agrupa (componentes fuertemente conexas) y se resuelve por profundidad solo entre sus miembros, sin desordenar el resto. Aun así, **evita que las cajas se atraviesen**. |
| `splitByLane(pieces, y0, y1)` | Para algo que se mueve a lo largo de `x` en la franja `y0…y1` y se dibuja encima de la escena: `{ behind, ahead, inLane }`. `behind` va antes del vehículo, `ahead` después, y en `inLane` no debería quedar nada con lo que choque. |

## 3. Piezas redondas: `lego-round.mjs`

Piezas de revolución, dibujadas cara a cara de atrás adelante, así que también valen las cóncavas (un plato, una llanta, un anillo).

| Función | Qué hace |
|---|---|
| `revolveFaces(profile, { at, axis = "z", steps = 32 })` | Gira un perfil `[t, r]` alrededor de un eje (`t` a lo largo del eje desde `at`, `r` hacia fuera). Se recorre dejando el sólido a la izquierda: del eje hacia fuera por abajo, subiendo por fuera y de vuelta al eje por arriba. Devuelve caras con su normal: `{ points, normal }`. |
| `meshSvg(faces, color, P, { trans, crease = 30 })` | Dibuja caras con normal, ordenadas de atrás adelante. |
| `turned({ profile, at, axis, steps, color, trans, extra })` | Pieza de escena a partir de un perfil. Con `axis: "z"` la auditoría usa su huella redonda. |
| `dome({ x, y, z, w = 2, color, trans })` | Cúpula: collar y media esfera. |
| `cone({ x, y, z, w = 1, h = 3, top, color, studs = true, trans })` | Cono con *stud* en la punta. |
| `barrel({ x, y, z, w = 2, h = 6, color })` | Barril abombado. |
| `ball({ at, r, color, trans, steps })` | Bola, en milímetros. |
| `dish({ x, y, z, w = 4, depth = 6, up = true, color })` | Plato boca arriba (antena) o boca abajo (pantalla, paraguas). |
| `wheel({ at, axis = "y", r = 7, width = 6, tire = "black", rim = "light-gray" })` | Rueda sobre un eje horizontal (o tumbada con `axis: "z"`): neumático redondeado y llanta hundida en la cara +eje. |

## 4. Mangueras, tubos y cables: `lego-tube.mjs`

En una cámara isométrica un tubo se ve igual de ancho en todas partes, así que se dibuja como trazos a lo largo de su eje: borde, cuerpo, brillo y, si es acanalado, anillos.

| Función | Qué hace |
|---|---|
| `hose({ points, r = 2.4, color = "black", ribbed, pitch = 2.4, chunk = 14, caps = true })` | Manguera como **lista de piezas**, en trozos de `chunk` mm que se ordenan entre los ladrillos. Hay que expandirla: `...hose(…)`. Trae `overlaps` y `float`. |
| `tubeSvg(points, P, { r = 1, color, ribbed, pitch, caps })` | El mismo tubo como un solo dibujo, para ponerlo encima de la escena (cables al aire). |
| `curve(points, { samples = 8 })` | Curva suave que pasa por los puntos (Catmull-Rom). |
| `sag(from, to, drop, count = 12)` | Cable que cuelga `drop` mm en el centro. |
| `resample(points, spacing)` | Puntos a distancia regular, por ejemplo para las rutas de lo que viaja. |

## 5. Minifiguras: `lego-figure.mjs`

| Función | Qué hace |
|---|---|
| `minifig({ x, y, z, torso = "red", legs = "blue", hair = "brown", hat, facing = "y", skin = "skin", print, hairStyle = "short", hatStyle = "cap", child })` | Una minifigura con medidas reales: piernas con pie, banda de cadera, torso, brazos con hombro redondo, manos en C, cuello y cabeza redondeada con cejas, ojos y sonrisa. Mira hacia +y (`facing: "y"`) o hacia +x (`"x"`). Con `legs: null` está sentada: la cintura queda a la altura `z` y las manos van al frente. Con `hat` lleva gorra; con `hair: null` y sin gorra, el *stud* hueco de la cabeza clásica. Mide unos 40 mm, unos 4 ladrillos. `print` estampa el torso (`jacket`, `shirt`, `apron`, `police`, `hivis`); `hairStyle` es `short`, `ponytail` o `tall`; con `hat`, `hatStyle` es `cap`, `helmet`, `chef` o `police`; `child: true` le da piernas cortas. |

### LEGO City: `lego-city.mjs`

Conjuntos ya montados, cada uno devuelve una lista de piezas. `ROAD` y `PAVEMENT` son los grises de carretera y acera.

| Función | Qué hace |
|---|---|
| `road({ x, y, w, d, z = 0, along = "x", dashes = true, skip })` | Placa de carretera gris claro con línea central discontinua. `skip: [desde, hasta]` deja un tramo sin rayas. Las marcas son pintura: llevan `overlaps`. |
| `crossing({ x, y, w, d, z, along })` | Paso de cebra sobre la carretera. |
| `sidewalk({ x, y, w, d, z, h = 2, color })` | Acera de baldosas de 2×2, a la altura del bordillo. |
| `building({ x, y, z = 1, w, d = 4, floors = 2, floorH = 4, color = "tan", trim = "white", awning, sign, door = 1 })` | Fachada que mira hacia +y: ladrillos por plantas con una banda del color `trim`, ventanas enmarcadas con alféizar, puerta en el hueco `door`, cornisa y tejado. `awning` es el color del toldo de rayas; `sign` es `{ symbol: "pizza" \| "cup" \| "cross", color }`. Las ventanas llevan `data-id="window"`. |
| `tree({ x, y, z = 1, size, color })`, `bush({ x, y, z, size })`, `flowers(spots)` | Árbol de tronco redondo y copa de bolas de hojas, arbusto de tres bolas, flores de placas redondas (`[x, y, color]`). |
| `bench`, `bin`, `hydrant` (`{ x, y, z = 2 }`) | Banco que mira hacia +y, papelera y boca de incendios, sobre la acera. |
| `car({ x, y, z = 1, color })` | Coche de 8×4 *studs* con el morro hacia +x: ruedas, chasis, carrocería, parabrisas y faros. |
| `dog({ x, y, z = 2, color })` | Un perro mirando hacia +x. |
| `CITY_CSS` | Enciende las ventanas cuando la lección es de noche; añádelo al `css` de la lección. |

## 6. Piezas que giran: `lego-spin.mjs`

Un grupo de caras que gira sobre un eje y se vuelve a dibujar en cada fotograma, con el sombreado de folleto.

| Función | Qué hace |
|---|---|
| `withNormals(polys)` | Añade normales hacia fuera a las caras de un sólido convexo (`boxFaces` y compañía). |
| `spinData(meshes, { pivot, axis = "z", sun, night })` | Prepara el grupo. `meshes` es `[{ color, faces, name? }]` y cada cara puede llevar `color` propio y `lamp: true`. Con `sun` (un punto del mundo), lo que queda al otro lado del cuerpo se oscurece hacia `night` y las caras `lamp` se encienden allí. El día y la noche se deciden por la posición en el cuerpo, no por hacia dónde mira cada cara. |
| `spinSvg(id)` | El grupo vacío que va en la escena. |
| `spinRuntime(node, data, P)` | El motor en la página; `lessonHtml({ spins })` lo crea por ti. |

En la página, `lesson.spin(id)` devuelve `{ angle, set(ángulo), show(nombre, sí/no), lit(punto, normal) }`. Todas las mallas de un grupo se ordenan juntas, así que lo que gira junto (un planeta y la casa que lleva encima) va en el mismo grupo.

## 7. Efectos WebGL: `lego-fx.mjs`

Un lienzo transparente encima del SVG dibuja efectos con la misma cámara, en bandas de color planas. Sin WebGL queda vacío, y la lección sigue completa con su versión SVG.

| Función | Qué hace |
|---|---|
| `water({ id, rect: [x0, y0, x1, y1], z, occluders })` | Agua en un rectángulo del suelo, con brillos que se mueven y anillos de gota. |
| `flame({ id, at: [x, y], r, z0, z1, occluders })` | Llama dentro de un cilindro vertical. |
| `smoke({ id, at, drift = [-14, 2, 30], size = 1, color, occluders })` | Bocanadas de humo o vapor que suben siguiendo `drift`. Sobre fondo claro, usa un `color` algo más oscuro que el blanco. |
| `occluders` | Cajas `[x0, y0, z0, x1, y1, z1]` de las piezas que quedan delante del efecto. El *shader* comprueba en cada píxel si el rayo de la cámara las atraviesa antes de llegar al efecto. |
| `fxFragment(effects)`, `fxCamera(P)`, `fxRuntime(…)`, `FX_CSS` | Las piezas internas; `lessonHtml({ fx })` las monta. |

En la página, `lesson.fx`:

| Llamada | Qué hace |
|---|---|
| `ready` | `true` si hay WebGL. Úsalo para esconder la versión SVG cuando el efecto se ve. |
| `level(id, 0…1)` | Enciende o apaga un efecto. |
| `offset(id, [x, y, z])` | Lo mueve con un grupo que se desplaza. |
| `set(id, "low", z)` | Mueve el suelo de una llama (la cabeza de un pistón). |
| `ripple(id, x, y)` | Hace un anillo donde cae una gota. |

## 8. Auditoría: `lego-audit.mjs`

| Función | Qué hace |
|---|---|
| `auditPieces(pieces)` | Devuelve los problemas: `[{ type, a, b, message }]`. |
| `auditOrExit(pieces, { label })` | Con `node build.mjs --audit`, imprime los problemas y sale con error si hay alguno; sin el argumento, no hace nada. Se llama antes de `fitProjection`, con todas las piezas, incluidas las de los grupos que se mueven (en su posición de reposo). |

| Tipo | Cuándo salta |
|---|---|
| `overlap` | Dos piezas se atraviesan. Las piezas redondas comparan su huella redonda, no su caja. |
| `floating` | Una pieza por encima del suelo no toca nada: ni debajo, ni encima, ni al lado. |
| `early` | Solo la sujetan piezas de un paso posterior, así que flotaría hasta entonces. |
| `grid` | Un ladrillo o una pieza redonda queda fuera de la rejilla. Se admite medio *stud* en `x` e `y`; en `z` y `h`, solo placas enteras. |

Para que una excepción sea aceptable hay que declararla en la pieza: `overlaps: true` (se mete en otra: tubos, accesorios, una chimenea), `float: true` (nubes, mangueras) u `offGrid: true` (un cubo suelto, un asa). Arregla la geometría antes de marcar una excepción. El test `scripts/lego-audit.test.mjs` comprueba que cada tipo se detecta.

## 9. La página: `lesson.mjs`

| Función | Qué hace |
|---|---|
| `lessonHtml({ title, svg, steps, projection, buttons, keys, script, css, fx, spins })` | La página completa. `steps` es `[{ say, ask, note, night }]`, donde `night` vale `true`, `false` o `null` (deja la noche como está). `buttons` es `[{ action, label }]` y `keys`, el texto de ayuda del teclado. `script` es el código de la lección, `css` sus estilos, `fx` sus efectos y `spins` sus grupos que giran (`{ id: spinData }`). |
| `lessonSvg({ width, height, label, body })` | El SVG. `label` describe la escena entera para lectores de pantalla. |
| `tokenDef(id, P, { color, r = 3, h = 1.8 })` | El símbolo de lo que viaja, dibujado una vez y movido con `translate`. Va en `<defs>`. |
| `skySvg(width, { at, stars })`, `nightSvg(width, height)` | Sol y luna (al pulsarlos se cambia entre día y noche) y el velo de la noche. |
| `glowSvg(P, punto, floorZ, { halo, pool })`, `GLOW_DEFS` | Halo y charco de luz, dentro de `<g class="lb-glow">`. |
| `LESSON_CSS` | Los estilos de la página. Ya van incluidos. |

Orden del `body`: `<defs>`, la escena (`sceneSvg`), lo que va encima de las piezas (cables, aspas, grupos que se mueven, cristales; cada uno con `class="lb-piece" data-step` para que aparezca en su paso), `nightSvg`, `skySvg`, los brillos y, al final, `<g data-part="tokens"></g>`.

En el `script` está `lesson`:

| Llamada | Qué hace |
|---|---|
| `lesson.step`, `lesson.onStep(fn)` | El paso actual y un aviso cuando cambia. |
| `lesson.every((dt, now) => sigue)` | El modelo, en cada fotograma. Devuelve `true` mientras necesite más fotogramas. |
| `lesson.route(points, { token, gap = 24, speed = 40, layer })` | Piezas que viajan por una polilínea. Devuelve una ruta con `level` (0…1) y `speed`, que se pueden cambiar en cada fotograma. Las piezas se desvanecen en los extremos. `layer` es el grupo donde se dibujan (por defecto, `[data-part="tokens"]`). |
| `lesson.button(action, fn, () => etiqueta)` | Conecta un botón de `buttons` y devuelve el nodo, para desactivarlo. La etiqueta se refresca en cada fotograma. |
| `lesson.click(selector, fn)`, `lesson.key(tecla, fn)` | Clic en una parte del dibujo y atajo de teclado. |
| `lesson.readout(() => texto)` | La línea viva de abajo a la derecha de la tarjeta. |
| `lesson.night`, `lesson.dark`, `lesson.toggleNight()` | La noche que se quiere y la oscuridad suavizada, de 0 a 1. |
| `lesson.ease(desde, hasta, dt, tau)` | Seguimiento exponencial. Con movimiento reducido va directo al destino. |
| `lesson.fx`, `lesson.spin(id)` | Efectos (§ 7) y grupos que giran (§ 6). |
| `lesson.kick()` | Vuelve a arrancar el bucle tras un cambio hecho desde fuera (un arrastre con el ratón). |

Con `?paso=N` en la URL, la página abre en ese paso. Las flechas ← → cambian de paso, y la N cambia entre día y noche si hay cielo.

## 10. Herramientas

| Script | Para qué |
|---|---|
| `scripts/capture.mjs page.html` | Capturas con Chrome sin ventana, con WebGL. `--out`, `--width`, `--wait`, `--zoom x,y,w,h` (con `--zoom-scale`) para primeros planos y `--times ms,…` para varios momentos. Informa de errores de consola y de *scroll* lateral. Para abrir en un paso: `"file://…/leccion.html?paso=N"`. |
| `scripts/drive.mjs page.html '[acciones]'` | Sesiones guionizadas: `wait`, `click`, `drag`, `key`, `eval`, `until`, `shot`, `slow`. `--no-webgl` comprueba que la versión SVG se basta sola. Es la forma de probar botones, pasos y modelos. |
| `scripts/lines.mjs` | Comprobación de que las líneas finas acaban sobre algo. Viene del original; las lecciones no la necesitan. |
| `scripts/inline-kit.mjs` | `kitScript()`: el núcleo como script para incrustarlo en la página (`lessonHtml` ya lo hace). |

## 11. Ampliar el kit

Cada lección nueva suele pedir algo que el kit aún no tiene. Así salieron `until`, `splitByLane`, las minifiguras sentadas, el color del humo o `show` en los grupos que giran. Cuando pase:

- **Ponlo en el módulo de su capa.** Una pieza nueva, en `brick.mjs` o en el kit especializado que toque. Algo de la página, en `lesson.mjs`. Un módulo de abajo nunca importa uno de arriba: por eso la minifigura vive en `lego-figure.mjs` y no en `brick.mjs`.
- **Escríbelo para cualquier lección**, no para la que lo pide. Dale opciones con valores por defecto que no cambien lo que ya existe.
- **Regenera y audita las lecciones existentes** (`node examples/<nombre>/build.mjs --audit`) y mira una captura de cada una.
- **Documéntalo aquí y en la tabla de la `SKILL.md`.** Si es una regla de oficio (algo que se puede hacer mal), añádela también a las reglas de la `SKILL.md`.
