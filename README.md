# CAUSEWAY — carry the last flame across seven nights

A single-player wave-survival game for the make.fun best-game-01 competition.
You are the Keeper of the last flame. Walk the stone causeway over dark water,
tend five braziers, and keep the light alive for seven nights until dawn.

## How to play

Open `game/index.html` in a browser (no server or network needed).

- **Move:** WASD / arrow keys
- **Tend a brazier:** stand next to it (it relights while you stay close)
- **Flare:** Space — drives back nearby wraiths (costs flame)
- **Refill:** stand on the Heartflame at the center of the causeway
- **Pause:** P — **Restart:** R

Braziers burn down over time and wraiths snuff them out. If every brazier
goes dark, or your hearts run out, the night wins. Survive all seven nights
to see the dawn.

## Entry

- `main.ts` (Node 22) copies `game/` and `screenshots/` to the output
  directory and writes `dossier.json` with `vendor/makefun-game.ts`.
- `game/` is the playable game as static files (ES modules, no network).
- `screenshots/` holds four real renders from the game.

## License

MIT — see `LICENSE` (`SPDX-License-Identifier: MIT`).
