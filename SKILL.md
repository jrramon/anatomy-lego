---
name: lego
description: Explica a niños pequeños que aún no leen cómo funciona algo del mundo (la luz de las farolas, por qué flota un barco, cómo late el corazón, de dónde viene el agua del grifo) construyéndolo como una escena LEGO City interactiva, paso a paso como un folleto de instrucciones, para que una madre o un padre se la cuente sentado al lado en el ordenador. Úsala cuando alguien quiera explicar algo a un niño o una niña "con LEGO", pida una lección, un cuento o una explicación visual para peques, o haga una pregunta infantil del tipo "¿cómo llega…?", "¿por qué…?", "¿de dónde sale…?", aunque no diga LEGO. Genera una página HTML autónoma en español, sin dependencias.
license: MIT
compatibility: Escrita para Claude Code. Necesita Node.js 20.10+, y Chrome o Chromium para las comprobaciones.
---

# LEGO: lecciones para peques

Esta skill convierte una pregunta de un niño pequeño en una **escena LEGO City que se construye paso a paso** mientras un adulto cuenta la historia. El niño no lee: mira, señala, contesta y toca. El adulto lee en voz alta lo que pone en «Dile», hace la pregunta de «Pregúntale» y, si quiere saber más, tiene la explicación de verdad en «Para mamá o papá».

Hay cuatro ejemplos completos. Abre el más parecido antes de empezar y cópialo como plantilla:
- `examples/farola/`: «¿Cómo llega la luz a la farola?». Flujos que dependen del día y la noche, y cable en el corte de tierra.
- `examples/agua/`: «¿De dónde sale el agua del grifo?». Tuberías (`pipe`), piezas que cambian de color por el camino y la demanda del pueblo frente a la de la casa.
- `examples/avion/`: «¿Por qué vuela un avión?». Un objeto que se mueve por la escena con su propio aire, que también se mueve con él. Usa piezas redondas (fuselaje, ruedas, cúpula), una manguera que solo aparece en un paso (`until`) y un modelo físico con un caso que falla a propósito (demasiado peso).

- `examples/motor/`: «¿Cómo funciona el motor de un coche?». Un mecanismo por dentro: un cilindro de cristal casi transparente, piezas vivas (pistón, biela, válvulas) movidas por un único ángulo, y una carga de piezas que se aprieta y cambia de color según el tiempo del motor. También un piloto sentado (`minifig({ legs: null, facing: "x" })`) y soportes que se retiran (`until`) para que el kart arranque.

Cada uno se construye con `node examples/<nombre>/build.mjs`, que escribe la página junto al script. Con `--audit` pasa además la auditoría.

## La idea que importa

**El montaje LEGO es la explicación.** No dibujes cajas con flechas ni carteles. Inventa una escena LEGO que *funcione* como la cosa que se explica, y haz que lo invisible se vea con piezas: la electricidad son piececitas amarillas que viajan por los cables, el agua son piezas azules transparentes, el aire son piezas blancas.

| Pregunta | Escena | Lo invisible, hecho pieza |
|---|---|---|
| ¿Cómo llega la luz a la farola? | Molino, torres, transformador, cable bajo la acera, farolas | Piezas amarillas redondas: grandes en alta tensión, pequeñas después del transformador |
| ¿De dónde sale el agua del grifo? | Embalse, depuradora, depósito en una colina, tuberías bajo la calle, una casa | Piezas azules transparentes que bajan por la cuesta |
| ¿Por qué flota un barco? | Un muelle con un barco que se carga de cajas hasta hundirse un poco más | El agua que el barco aparta, como un hueco con forma de barco |
| ¿Cómo late el corazón? | Una bomba de pistón con dos «puertas» que solo se abren hacia un lado | Piezas rojas que entran y salen al ritmo del pistón |
| ¿Por qué hay día y noche? | Una Tierra de ladrillos que gira junto a una lámpara | Una minifigura que pasa de la luz a la sombra |
| ¿Cómo llega la basura a la planta? | Contenedores, camión de basura, planta de reciclaje | Piezas de colores que se separan por cintas |

Dos fallos típicos:

- **Demasiado abstracto.** Bloques flotando con etiquetas no son nada para un niño de cuatro años. Tiene que reconocer cosas: un molino, una farola, una minifigura, un árbol.
- **Demasiado cargado.** Cada paso añade **una** idea. Si en un paso aparecen tres cosas nuevas, el niño no sabe dónde mirar.

## Público y tono

- El niño tiene unos 3-6 años y **no lee**. Las palabras del dibujo no le sirven: el texto es para el adulto. Dentro del dibujo no hay texto; como mucho, un símbolo (un rayo de peligro).
- El adulto lee «Dile» en voz alta. Escríbelo como se habla: frases cortas, de tú, cálidas, con alguna exclamación. **Dos frases como mucho, unas 30 palabras.**
- «Pregúntale» es una pregunta que se contesta **mirando el dibujo** («¿Cuántas torres ves?»), una predicción («Si se para el molino… ¿qué le pasa a la farola?») o algo que conecta con su vida («¿Has visto farolas encenderse?»).
- «Para mamá o papá» es la verdad de adultos, de 1 a 3 frases, con datos reales (voltios, metros, nombres) y **cada simplificación de la historia, dicha como tal**. Nunca enseñes algo falso sin corregirlo aquí.
- Idioma: el del adulto que lo pide; por defecto, español de España.

## Flujo de trabajo

1. **La verdad primero.** Escribe en 5-10 líneas cómo funciona de verdad: qué cosas hay, en qué orden, qué cifras. Busca los datos si no los sabes con seguridad. De ahí salen las notas para padres.
2. **La historia en pasos.** Entre 5 y 8 pasos. El primero presenta el sitio (el suelo, la calle) y hace la pregunta. Cada paso siguiente añade **una** parte de la cadena y su frase. El último es **juego libre**: el niño provoca causas y ve efectos. Escribe los pasos (`say`, `ask`, `note`, `night`) antes de dibujar nada.
3. **Lo invisible, hecho pieza.** Decide qué viaja (energía, agua, comida, aire) y con qué pieza: color, tamaño y si cambia por el camino (grande → pequeña en el transformador). Debe moverse **solo cuando de verdad hay flujo**: la corriente no va a la farola de día porque está apagada.
4. **Un modelo pequeño.** Las causas y efectos de la lección, como estado y reglas: viento → giro → electricidad en la línea; noche y electricidad → farolas encendidas → corriente en el cable de la calle. Todo lo que se mueve sale de ese modelo, nunca de animaciones sueltas.
5. **La escena en la rejilla.** Dibuja el plano en *studs*: largo en x, fondo en y, de unos 40-60 × 16-24. Pon la cadena de izquierda (origen) a derecha (destino), y lo que esté bajo tierra en la cara delantera (y máxima), que es la que se ve en corte. Cámara: `azimuth: 55`, `elevation: 30`.
6. **Construye con el kit.** Asigna a cada pieza su `step`. El paso 0 es el suelo y el paisaje. Las piezas de cada paso caen en su sitio con un rebote al avanzar.
7. **Dale vida.** Usa `lesson.route` para lo que viaja, `lesson.every` para el modelo, uno o dos botones de causa (`buttons`) y clics sobre las partes del dibujo (`lesson.click`). Si el día y la noche importan, añade `skySvg` y `nightSvg`.
8. **Comprueba como un crítico** (más abajo).

## El kit

### `kit/brick.mjs`: las piezas

Las medidas son las de LEGO de verdad, en milímetros: un *stud* mide 8 de ancho, una placa 3,2 de alto y un ladrillo 9,6 (tres placas). En las piezas, `x`, `y`, `w` y `d` van en *studs*, y `z` y `h` en placas.

| Función | Qué hace |
|---|---|
| `brick({ x, y, z, w, d, h = 3, color, studs = true, trans })` | Ladrillo rectangular. `plate(…)` es `h: 1` y `tile(…)` es una placa sin *studs*. |
| `round({ x, y, z, w, h, color, studs, trans, steps })` | Ladrillo o placa redonda de diámetro `w`. Se puede colocar en medio *stud* (`x: 4.5`). |
| `custom({ faces, color, extra, box })` | Cualquier sólido convexo, a partir de caras. `extra(P)` añade dibujo encima, como la señal del rayo. |
| `group({ parts })` | Varias piezas que se ordenan como una sola, listadas de atrás adelante. |
| `minifig({ x, y, z, torso, legs, hair, hat, facing })` | Una minifigura con ojos y sonrisa, mirando hacia +y o hacia +x (`facing: "x"`). Con `legs: null` está sentada, con la cintura a la altura `z`. |
| `pipe({ axis: "x" \| "y" \| "z", from, to, at, r, color })` | Tubería recta en milímetros. `at` son las otras dos coordenadas. Los codos son un `round` de 1×1 en la esquina. |
| `boxFaces`, `cylinderFaces`, `frustumFaces`, `extrudeFaces(profile, "x" \| "y", from, to)`, `prismFaces` | Constructores de caras, en milímetros: cajas, cilindros, conos y pantallas, rampas y cuñas, cilindros tumbados (ruedas, ejes) y prismas. |
| `solidSvg(faces, color, P)` | Dibuja un sólido suelto, fuera de la escena, por ejemplo el buje del molino. |
| `studSvg(cx, cy, z, color, P)` | Un *stud* suelto. |
| `sceneSvg(pieces, P)` | Ordena todas las piezas (las de detrás primero) y las envuelve para los pasos. |

Cualquier pieza acepta `step`, el paso en que aparece; `until`, el último paso en que se ve (una manguera que se retira); e `id`, que pasa a `data-id` y sirve para clics y estilos. Colores: `red`, `yellow`, `blue`, `green`, `bright-green`, `lime`, `white`, `black`, `light-gray`, `dark-gray`, `tan`, `dark-tan`, `brown`, `orange`, `azure`, `skin`, `trans-yellow` y `trans-clear`, o cualquier `#rrggbb`. El sombreado es el de los folletos de instrucciones: arriba claro, la cara +y media y la cara +x oscura, con contorno fino.

### `kit/lego-round.mjs`: piezas redondas

| Función | Qué hace |
|---|---|
| `dome({ x, y, z, w })` | Cúpula: collar y media esfera (2×2, 4×4). |
| `cone({ x, y, z, w, h, top })` | Cono con *stud* en la punta. |
| `barrel({ x, y, z, w, h })` | Barril abombado. |
| `ball({ at, r })` | Bola en milímetros: la Tierra, un planeta, una pelota. |
| `dish({ x, y, z, w, depth, up })` | Plato: boca arriba (antena, cuenco) o boca abajo (pantalla, paraguas). |
| `wheel({ at, axis: "x" \| "y", r, width, tire, rim })` | Rueda con neumático y llanta hundida, sobre un eje horizontal. |
| `turned({ profile, at, axis, color })` | Cualquier pieza de revolución. El perfil es `[t, r]` y se recorre dejando el sólido a la izquierda: del eje hacia fuera por abajo, subiendo por fuera y de vuelta al eje por arriba. |

### `kit/lego-tube.mjs`: mangueras, tubos y cables

| Función | Qué hace |
|---|---|
| `hose({ points, r, color, ribbed, pitch })` | Manguera como piezas de escena, en trozos que se ordenan entre los ladrillos: hay que expandirla con `...hose(…)` en la lista. `ribbed` le pone anillos, como un tubo Technic. |
| `tubeSvg(points, P, { r, color })` | El mismo tubo como un solo dibujo, para ponerlo por encima de la escena (cables al aire). |
| `curve(points)`, `sag(from, to, drop)`, `resample(points, step)` | Curva suave entre puntos, cable que cuelga y puntos a distancia regular. |

### `kit/lego-audit.mjs`: la auditoría

`auditOrExit(pieces)`, llamado antes de `fitProjection`, revisa las piezas con `node build.mjs --audit`:
- **overlap:** dos piezas se atraviesan.
- **floating:** una pieza no toca nada que la sujete.
- **early:** solo la sujetan piezas de un paso posterior.
- **grid:** un ladrillo o una pieza redonda queda fuera de la rejilla de *studs* y placas.

Para que una excepción sea aceptable hay que declararla en la pieza: `overlaps: true` (un accesorio que se mete en otro; los tubos ya lo traen), `float: true` (una nube) u `offGrid: true` (un cubo suelto, un asa).

### `kit/lesson.mjs`: la página

| Función | Qué hace |
|---|---|
| `lessonHtml({ title, svg, steps, projection, buttons, keys, script, css })` | La página completa: tarjeta, botones ◀ ▶, botones propios y los textos «Dile», «Pregúntale» y «Para mamá o papá». Incrusta el kit y el motor. |
| `lessonSvg({ width, height, label, body })` | El SVG de la escena. `label` describe la escena entera para lectores de pantalla. |
| `tokenDef(id, P, { color, r })` | El símbolo de lo que viaja. Va en `<defs>`. |
| `skySvg(width)`, `nightSvg(width, height)` | Sol y luna con estrellas (al pulsarlos se cambia entre día y noche) y el velo de la noche. |
| `glowSvg(P, point, floorZ)` + `GLOW_DEFS` | Halo y charco de luz, dentro de `<g class="lb-glow">`. |

Orden del `body` del SVG: `<defs>`, la escena (`sceneSvg`), lo que va por encima de las piezas (cables, aspas; cada grupo con `class="lb-piece" data-step`), `nightSvg`, `skySvg`, los brillos y, al final, `<g data-part="tokens"></g>`. Las piezas viajeras van por encima de la noche, así que brillan en la oscuridad.

En el `script` de la lección está disponible `lesson`:

```js
lesson.route(points, { token: "#e-big", gap, speed })  // devuelve una ruta; ponle route.level de 0 a 1 cada fotograma
lesson.every((dt) => sigueMoviendose)                   // el modelo, cada fotograma
lesson.button("wind", accion, () => "etiqueta")          // botón de `buttons`, con etiqueta viva
lesson.click('[data-id="turbine"]', accion)               // clic en una parte del dibujo
lesson.key("v", accion)                                   // atajo de teclado
lesson.onStep((paso) => …)                                // al cambiar de paso
lesson.readout(() => "💨 hay viento · 💡 farolas encendidas")
lesson.night, lesson.dark, lesson.ease(desde, hasta, dt, tau)
```

`iso(point, P)` y `pathOf(points)` del kit isométrico también están disponibles en la página. Con `?paso=N` en la URL, la página abre directamente en ese paso.

## Reglas de oficio

- **Que parezca LEGO de verdad.** Piezas de medidas reales, con *studs*. Separaciones de 0,1 entre piezas, que el kit ya pone. Placas base verdes, calles de *tiles* gris oscuro, aceras gris claro y minifiguras a escala: una minifigura mide unos 4 ladrillos. Árboles, flores y alguna minifigura dan vida, pero sin tapar la cadena.
- **Una cosa importante a la vista.** Lo que hay que mirar en cada paso no puede quedar escondido detrás de otra pieza. Si algo va bajo tierra, va en la cara de corte delantera.
- **Las piezas no se atraviesan.** El orden de pintado se basa en que las cajas de las piezas no se cruzan. Si dos se cruzan (un brazo que atraviesa un poste), pártelas o usa `group`. Lo que cruza la escena de lado a lado (cables, aspas) no va como pieza: va encima, en un grupo propio.
- **Lo que viaja, más pequeño que su tubo.** Una pieza viajera más ancha que la tubería o el cable la tapa: usa `r` de 1,6 en tuberías finas y de 2,6-3,2 en las gruesas o en cables al aire.
- **Lo que se mueve por la escena va aparte.** Un avión o un coche que recorre la escena no entra en `sceneSvg` con el resto: se ordena solo (`sceneSvg(susPiezas, P)`), va en su propio grupo por encima y se mueve con `translateAlong`. Lo que viaja con él (su aire) va en una capa dentro de ese grupo (`lesson.route(…, { layer })`). Pásalo igualmente a la auditoría en su posición de reposo. Como ese grupo se pinta encima de la escena, parte la escena con `splitByLane(piezas, y0, y1)` (la franja en `y` que ocupa al moverse): `behind` va antes del grupo y `ahead` después, para que no pase por encima de una minifigura que está delante. Y que en `inLane` no quede nada con lo que choque.
- **Cada cosa aparece en su paso.** Lo que pertenece a algo (el camino de la casa, el contador de la pared) va en el mismo `step` que ese algo, no en el paso 0.
- **Colores con intención.** Los colores básicos de LEGO City. El amarillo brillante queda reservado para lo que viaja, para que el niño lo siga con el dedo.
- **Movimiento tranquilo.** Seguimiento exponencial (`lesson.ease`), nada brusco, nada que aparezca de golpe: las rutas ya se desvanecen en los extremos. Con movimiento reducido, todo queda quieto en su estado final.
- **Causa y efecto honestos.** Lo que pasa al pulsar un botón tiene que ser verdad o estar matizado en la nota para padres.
- **Sin marcas.** No dibujes el logo de LEGO en los *studs* ni lo uses en títulos. Las lecciones son para uso personal: no las publiques en la galería de Anatomy.
- **Rendimiento.** Una placa base de 30×20 son 600 *studs*. No pases de unas 300 piezas ni de 1 MB de HTML.

## Comprobación

Lee cada PNG que generes:

- **Cada paso**: `node scripts/capture.mjs "file://…/leccion.html?paso=N" --out pasoN.png --width 1200 --wait 4000`. ¿Está a la vista la pieza nueva de ese paso? ¿Se entiende sin leer?
- **La interacción**: con `scripts/drive.mjs`, recorre los pasos con `["click", "[data-action=\"next\"]"]`, pulsa los botones propios y comprueba el `[data-readout]` con `["eval", …]`. Cada causa tiene que producir su efecto, y deshacerla tiene que deshacerlo. Volver atrás tiene que esconder las piezas de los pasos posteriores.
- **De día y de noche**, si la lección usa el cielo.
- **La auditoría a cero**: `node build.mjs --audit` tiene que terminar en `auditoría superada`. Arregla la geometría; marca una excepción solo cuando de verdad lo sea.
- La consola tiene que salir limpia (`console: clean`).
- La prueba final: imagina que se lo cuentas a un niño de cuatro años. ¿Sabe dónde mirar en cada paso? ¿Reconoce cada cosa? ¿Puede contestar la pregunta mirando el dibujo?

## Más técnica

El kit isométrico que hay debajo es el de **Anatomy**, el proyecto original del que sale este. Su guía completa (tuberías, piezas torneadas, sombreadores WebGL, modo 3D, la auditoría de geometría) está en `references/anatomy.md`, con los detalles en `references/kit.md`, `references/craft.md` y el resto de `references/`. Úsala cuando una lección necesite algo que `brick.mjs` no tiene, como agua con brillos o fuego.
