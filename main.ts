// Leonida Legend — the entry program for gta6-trophy-guide-01.
//
// The guide itself is plain static files in app/ (index.html, style.css, the
// app.js + tracker.js modules and data/trophies.json) and four screenshots in
// screenshots/. This program hands them in: it copies app/ and screenshots/
// from beside this file into the output directory and writes dossier.json
// there with the vendored make.fun library, which is the summary the judge
// reads. vendor/makefun-frontend.ts must stay exactly as the kit shipped it —
// the scorer rebuilds the dossier with its own copy and compares byte for
// byte.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader MAKEFUN_OUTPUT_DIR is unset and /output is used.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps below mirror the scorer's limits: at most 4 screenshots, each at
// most 256 KiB; app/ at most 993 files and directories and 48 MiB in all; the
// dossier text at most 160 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
