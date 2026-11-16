// CAUSEWAY — best-game-01 entry program.
//
// Node 22, standard library only. It hands the game in: the static game/
// folder and the screenshots/ folder are copied from beside this file into
// the output directory, and /output/dossier.json is written with the
// vendored make.fun library (vendor/makefun-game.ts, copied from the kit
// unchanged). The game itself is plain static files — a desktop browser
// opens game/index.html offline and plays it, no network request.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The hand-in is deterministic: every input is a static file in this
// repository, so two runs write the same bytes.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyIfPresent(name: string): void {
  const from = join(repoDir, name);
  if (!existsSync(from)) return;
  cpSync(from, join(outputDir, name), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyIfPresent('game');
copyIfPresent('screenshots');

// The caps mirror the scorer's own gate (reference/gate.json): only
// text_max_bytes shapes the bytes; the rest refuse an entry the scorer
// would refuse — more than 4 screenshots or one over 256 KiB; game/ over
// 993 files, over 48 MiB in all, or a path over 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);
