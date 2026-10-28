# Noche Azul

A Latin-jazz rhythm game in the spirit of PaRappa the Rapper, with an anime look inspired by *Blue Giant*. You play trumpet: learn the band's hooks in the practice room, then play them live at the club, back up the pianist's solo, and earn your own freestyle solo.

Everything runs in the browser. The club and practice room are 3D (three.js) with manga-style 2D portrait pop-ins, the band's voices are generated Latin American Spanish lines, and a crowd cheers if you finish well. The music is synthesized live with the Web Audio API, notation is drawn with the Bravura music font, and the art is inline SVG plus canvas effects.

## Play

Open `index.html` in a browser for the 3D demo (it loads three.js from a CDN and falls back to the 2D club if that is blocked), or `noche-azul-2d.html` for the 2D-only build. To host it, turn on GitHub Pages for this repo (Settings → Pages → deploy from `main`, root folder).

| Input | Action |
| --- | --- |
| D F J K (or the pads) | Play the note matching each color |
| Hold | Long notes must be held for their full length |
| Space | Up an octave (solo); tap the pad to lock |
| Shift | Down an octave (solo); tap the pad to lock |
| Esc | Pause |

The trumpet is monophonic: a new note cuts off the previous one.

## How a night goes

1. **Practice room.** Tomás plays each hook (call), and you answer it (response). Three passing takes (60% weighted accuracy or better) send you to the club.
2. **The Blue Room.** You play hooks A and B with the full band. Then Inés takes a piano solo while you comp the chords underneath, and you play both hooks again.
3. **Solo.** A high enough rank earns you a freestyle solo over Am7, Dm7, E7, Am7. Heat builds when you stay in the pocket, vary your notes, leave space and quote the hooks.
4. **The head and tag.** Everyone plays the head out together, and the night ends strong or rough depending on how you played.

## Project layout

```
src/head.html    markup + CSS (Bravura font is injected at build time)
src/audio.js     synth, hooks, chord tables, solo lines, crowd cheer
src/art.js       SVG scenes, characters, trumpet, FX layer
src/game.js      scheduler, segments, judging, scoring, notation, input
src/lstage.js    layered 2D stage (injected into game.js at build time)
src/club3d.js    three.js club and practice room, camera director, IK band
src/rig.js, rigs.js, stage.js   generated portrait and stage art (base64)
src/voices.js    generated voice lines (kokoro-onnx, es-419), base64 mp3
build.py         builds index.html (3D demo) and noche-azul-2d.html
```

## Story and design

The next version follows four friends from age 9 to Newport across five stages, each with its own song, and the hook evolves until the final suite quotes them all. The full game design document lives in the Claude doc "Noche Azul: Game Design Document".
