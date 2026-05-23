import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';

function parseFs(field) {
  if (field == null) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(parseFs);
  if ('mapValue' in field) {
    const out = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) out[k] = parseFs(v);
    return out;
  }
  return field;
}
async function runQuery(structuredQuery) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery })
  });
  return await res.json();
}
function flat(r) {
  return (r || []).filter(rr => rr.document).map(rr => {
    const f = {};
    for (const [k, v] of Object.entries(rr.document.fields || {})) f[k] = parseFs(v);
    f._id = rr.document.name.split('/').pop();
    return f;
  });
}

const posts = flat(await runQuery({
  from: [{ collectionId: 'blog_posts' }],
  limit: 100
}));

// Lecture sitemap
import fs from 'fs';
const sitemap = fs.readFileSync('/Users/romanemarino/Coach-Running-IA/dist/sitemap.xml', 'utf8');
const sitemapUrls = [...sitemap.matchAll(/blog\/([a-z0-9-]+)</g)].map(m => m[1]);

// Lecture liste dist/blog
const distDirs = fs.readdirSync('/Users/romanemarino/Coach-Running-IA/dist/blog').filter(d => !d.endsWith('.html'));

const slugsDb = posts.map(p => p.slug).filter(Boolean);

console.log('🔍 ARTICLES EN BASE :', slugsDb.length);
slugsDb.sort().forEach(s => console.log(' •', s));

console.log('\n🗺️ ARTICLES DANS SITEMAP.XML :', sitemapUrls.length);
sitemapUrls.sort().forEach(s => console.log(' •', s));

console.log('\n📦 ARTICLES PRÉRENDÉS DANS dist/blog :', distDirs.length);
distDirs.sort().forEach(s => console.log(' •', s));

// Diagnostiques de cohérence
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚨 DIAGNOSTICS DE COHÉRENCE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const inDbNotInSitemap = slugsDb.filter(s => !sitemapUrls.includes(s));
console.log(`\n❌ Dans BASE mais ABSENT du sitemap (${inDbNotInSitemap.length}) :`);
inDbNotInSitemap.forEach(s => console.log(' •', s, ' ← bot Google ne les voit pas via sitemap'));

const inSitemapNotInDb = sitemapUrls.filter(s => !slugsDb.includes(s));
console.log(`\n👻 Dans SITEMAP mais ABSENT de la base (${inSitemapNotInDb.length}) :`);
inSitemapNotInDb.forEach(s => console.log(' •', s, ' ← URL fantôme = probable 404 = pénalité SEO'));

const inDbNotPrerendered = slugsDb.filter(s => !distDirs.includes(s));
console.log(`\n📭 Dans BASE mais NON PRÉRENDÉ dans dist/ (${inDbNotPrerendered.length}) :`);
inDbNotPrerendered.forEach(s => console.log(' •', s, ' ← Google crawl JS = lent ou incomplet'));

const prerenderedNotInDb = distDirs.filter(s => !slugsDb.includes(s));
console.log(`\n🗑️ Prérendu mais ABSENT base (${prerenderedNotInDb.length}) :`);
prerenderedNotInDb.forEach(s => console.log(' •', s, ' ← orphelin'));

// Meta description check
console.log('\n📝 ARTICLES SANS metaDescription :');
posts.filter(p => p.isPublished && !p.metaDescription).forEach(p => console.log(' •', p.slug));

console.log('\n📰 ARTICLES SANS metaTitle :');
posts.filter(p => p.isPublished && !p.metaTitle).forEach(p => console.log(' •', p.slug));

console.log('\n🔣 ARTICLES avec characters bizarres dans metaTitle (backticks/markdown) :');
posts.filter(p => p.metaTitle && /[`*_]/.test(p.metaTitle)).forEach(p => console.log(' •', p.slug, '→', p.metaTitle));

// lastmod sitemap
const lastmodMatches = [...sitemap.matchAll(/<lastmod>([^<]+)</g)].map(m => m[1]);
const oldestLastmod = lastmodMatches.sort()[0];
const newestLastmod = lastmodMatches.sort().reverse()[0];
console.log('\n📅 sitemap.xml lastmod range :', oldestLastmod, '→', newestLastmod);
console.log('   (date du jour : 2026-05-22)');

