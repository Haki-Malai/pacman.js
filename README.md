# Pacman
This is a pacman game i am currently working on for fun. I have developed it again with similar animations and sprites but due to it being my first javascript project it didn't come out as good and scalable. The code was messy and the bugs were countless. The old repository is [here](https://github.com/Haki-Malai/Games/tree/main/Pac-Man%20JavaScript).

## Getting started
- `npm install`
- `npm run dev` to launch the Vite dev server (serves from `public/assets` and `src/`).
- `npm run build` to produce the deployable bundle in `dist/`.
- `npm run preview` to serve the built bundle locally.
- `npm run typecheck` to run the strict TypeScript compiler with `--noEmit`.
- `npm run lint` to run ESLint against the TypeScript sources.
- `npm run test` to execute the Vitest suite.

## Project layout
- `src/main.ts` contains the Phaser scene logic (imports Phaser from npm).
- `src/style.css` contains global styles.
- `public/assets/` holds sprites, tilemaps, fonts, and other static assets copied to `dist/`.
- `index.html` is the Vite entry HTML.

## About the game
The code is written with scalability in mind. Levels are authored in Tiled using the included tileset and exported JSON map. Object layers supply Pacman and ghost spawns (including pen bounds) and place collectibles directly in the map data.

## To-Do List
- [x] Draw Ghosts
- [ ] Make static OOP functions in seperate file
- [x] Add Ghosts etc
- [x] Add Ghost prison variables
- [ ] Add Ghost death
- [ ] Menu
- [ ] Sound
- [ ] Display Score, Multipliers, Lifes etc
- [ ] Highscores
- [ ] Multiple levels
- [ ] Add the portals

## To-Do Specialized List
- [ ] Make Clearer Animation
