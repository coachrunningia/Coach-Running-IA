// ============================================================================
// Tests V1 J3 — Harness de capture des prompts
// ============================================================================
// Stratégie :
//  1. Bundle src/services/geminiService.ts via esbuild en remplaçant
//     @google/generative-ai par un stub qui INTERCEPTE le prompt et le persiste sur disque
//     puis throw une erreur typée pour interrompre la suite.
//  2. Charge le bundle ESM, appelle generatePreviewPlan(profil) puis
//     generateRemainingWeeks(plan) — on récupère les prompts via les fichiers .txt
//     écrits par le stub.
//  3. Boucle sur les 10 profils * 2 prompts = 20 fichiers.
// ============================================================================

import { build } from 'esbuild';
import { writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Construction du stub @google/generative-ai
// ---------------------------------------------------------------------------
const STUB_DIR = resolve(__dirname, 'sandbox/stub_generative_ai');
mkdirSync(STUB_DIR, { recursive: true });

// Le stub écrit le prompt courant dans process.env.PROMPT_OUTPUT_FILE puis throw.
writeFileSync(resolve(STUB_DIR, 'index.js'), `
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class GoogleGenerativeAI {
  constructor(apiKey) { this.apiKey = apiKey; }
  getGenerativeModel(opts) {
    return {
      generateContent: async (req) => {
        const prompt = req?.contents?.[0]?.parts?.[0]?.text || '<NO PROMPT>';
        const file = process.env.PROMPT_OUTPUT_FILE;
        if (!file) throw new Error('PROMPT_OUTPUT_FILE not set');
        try { mkdirSync(dirname(file), { recursive: true }); } catch {}
        writeFileSync(file, prompt);
        const err = new Error('__PROMPT_CAPTURED__');
        err.code = '__PROMPT_CAPTURED__';
        throw err;
      }
    };
  }
}

export default { GoogleGenerativeAI };
`);
writeFileSync(resolve(STUB_DIR, 'package.json'), JSON.stringify({
  name: '@google/generative-ai',
  type: 'module',
  main: 'index.js'
}, null, 2));

// ---------------------------------------------------------------------------
// Plugin esbuild qui résoud @google/generative-ai vers notre stub
// ---------------------------------------------------------------------------
const stubPlugin = {
  name: 'stub-genai',
  setup(build) {
    build.onResolve({ filter: /^@google\/generative-ai$/ }, () => ({
      path: resolve(STUB_DIR, 'index.js')
    }));
    // Stub firebase too (used by storageService and others — non requis ici mais safe)
    build.onResolve({ filter: /^firebase|^firebase\// }, (args) => ({
      path: args.path,
      namespace: 'stub-empty'
    }));
    build.onLoad({ filter: /.*/, namespace: 'stub-empty' }, () => ({
      contents: 'export default {}; export const initializeApp = ()=>{}; export const getFirestore = ()=>{};',
      loader: 'js'
    }));
  }
};

// ---------------------------------------------------------------------------
// Compile la version donnée (chemin source TS) → bundle ESM
// ---------------------------------------------------------------------------
export async function bundleGeminiService(srcTsPath, outFilePath) {
  await build({
    entryPoints: [srcTsPath],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    outfile: outFilePath,
    plugins: [stubPlugin],
    logLevel: 'silent',
    // Stub import.meta.env (Vite-isme) — esbuild ne permet pas de define un objet, on injecte un banner
    banner: {
      js: `globalThis.__IMPORT_META_ENV__ = { VITE_R2_GATES_ENABLED: 'true', VITE_GEMINI_API_KEY: 'TEST_FAKE_KEY_NOT_USED', PROD: false, DEV: true, MODE: 'development' };`,
    },
    define: {
      'import.meta.env': 'globalThis.__IMPORT_META_ENV__',
    },
    // Permet l'import dynamique de @google/generative-ai au runtime (L487)
    external: [],
  });
}

// ---------------------------------------------------------------------------
// Capture d'un prompt unique
// ---------------------------------------------------------------------------
export async function capturePreviewPrompt(bundleModule, data, outFile) {
  process.env.PROMPT_OUTPUT_FILE = outFile;
  try {
    await bundleModule.generatePreviewPlan(structuredClone(data));
    throw new Error('Expected __PROMPT_CAPTURED__ to be thrown — generation did not stop');
  } catch (e) {
    if (e?.code === '__PROMPT_CAPTURED__' || /__PROMPT_CAPTURED__/.test(String(e?.message))) {
      return;
    }
    throw e;
  }
}

export async function captureRemainingPrompt(bundleModule, plan, outFile) {
  process.env.PROMPT_OUTPUT_FILE = outFile;
  try {
    await bundleModule.generateRemainingWeeks(plan);
    throw new Error('Expected __PROMPT_CAPTURED__ to be thrown — remaining generation did not stop');
  } catch (e) {
    if (e?.code === '__PROMPT_CAPTURED__' || /__PROMPT_CAPTURED__/.test(String(e?.message))) {
      return;
    }
    throw e;
  }
}

// Sanity check si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Stub & bundler module ready. Use via tests-v1/run-capture.mjs');
}
