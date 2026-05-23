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
    f._createTime = rr.document.createTime;
    f._updateTime = rr.document.updateTime;
    return f;
  });
}

// Get all blog_posts sorted by date
const posts = flat(await runQuery({
  from: [{ collectionId: 'blog_posts' }],
  orderBy: [{ field: { fieldPath: 'publishedAt' }, direction: 'DESCENDING' }],
  limit: 50
}));

console.log(`📚 ${posts.length} articles blog en base\n`);
console.log('🆕 15 plus récents :\n');
const cutoff = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
for (const p of posts.slice(0, 15)) {
  const ageDays = Math.round((Date.now() - new Date(p.publishedAt || p._createTime).getTime()) / 86400000);
  console.log(`  • [${ageDays}j] ${p.slug || p._id}`);
  console.log(`    title : ${p.title || '?'}`);
  console.log(`    publishedAt : ${p.publishedAt}`);
  console.log(`    isPublished : ${p.isPublished} | status: ${p.status}`);
  console.log(`    metaDescription : ${(p.metaDescription || '').slice(0, 100)}${p.metaDescription ? '' : '❌ MANQUANT'}`);
  console.log(`    metaTitle : ${(p.metaTitle || '').slice(0, 80)}${p.metaTitle ? '' : '❌ MANQUANT'}`);
  console.log(`    keywords/tags : ${JSON.stringify(p.tags || p.keywords || []).slice(0, 100)}`);
  console.log(`    canonicalUrl : ${p.canonicalUrl || '(défaut)'}`);
  console.log(`    image : ${p.image || p.coverImage || '?'}`);
  console.log('');
}
