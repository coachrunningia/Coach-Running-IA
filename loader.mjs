import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
export async function load(url, context, nextLoad) {
  if (!url.endsWith('.ts')) return nextLoad(url, context);
  const src = await readFile(fileURLToPath(url), 'utf8');
  const patched = src.replace(/import\.meta\.env\b/g, 'process.env');
  console.error('[loader] patched', url, 'preview:', patched.slice(0, 80));
  return nextLoad(url, { ...context, source: patched });
}
