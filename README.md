# Noche Azul

A Latin-jazz rhythm game in the spirit of PaRappa the Rapper, with an anime look inspired by *Blue Giant*. You play trumpet: learn the band's hooks in the practice room, then play them live at the club, back up the pianist's solo, and earn your own freestyle solo.

Everything runs in the browser. The music is synthesized live with the Web Audio API, notation is drawn with the Bravura music font, and the art is inline SVG plus canvas effects.

## Play

Open `index.html` in a browser. To host it, turn on GitHub Pages for this repo (Settings → Pages → deploy from `main`, root folder).

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
src/head.html   markup + CSS (Bravura font is injected at build time)
src/audio.js    synth, hooks, chord tables, solo lines
src/art.js      SVG scenes, characters, trumpet, FX layer
src/game.js     scheduler, segments, judging, scoring, notation, input
assets/         Bravura.woff2 (SIL Open Font License 1.1)
build.py        inlines everything into index.html
tests/          Playwright bots (perfect / tap / no-input) and visual screenshots
```

## Build and test

```bash
python3 build.py                 # writes index.html
npm i -D playwright && npx playwright install chromium
node tests/practice.test.js      # practice room: three clean takes -> club
node tests/club.test.js          # club run: perfect bot, tap bot, no-input bot
node tests/visual.test.js        # screenshots to shots/
```

## Credits

Music font: [Bravura](https://github.com/steinbergmedia/bravura) by Steinberg, SIL Open Font License 1.1.
