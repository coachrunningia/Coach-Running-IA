import { GoogleGenerativeAI } from '@google/generative-ai';
const apiKey = 'AIzaSyC-8R1QE0lVE72ihSU1vsN7JnBGf-WWDgY';
const genAI = new GoogleGenerativeAI(apiKey);

console.log('=== TEST 1: gemini-3-flash-preview ping ===');
try {
  const t0 = Date.now();
  const m = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  const r = await m.generateContent({
    contents: [{ role: 'user', parts: [{ text: 'Dis bonjour en 5 mots.' }] }],
    generationConfig: { maxOutputTokens: 200 }
  });
  const txt = (await r.response).text();
  console.log(`OK ${Date.now() - t0}ms: "${txt.slice(0, 100)}"`);
} catch (e) { console.log('ERR:', e.message?.slice(0, 300)); }

console.log('\n=== TEST 2: maxOutputTokens=65536 simple JSON ===');
try {
  const t0 = Date.now();
  const m = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  const r = await m.generateContent({
    contents: [{ role: 'user', parts: [{ text: 'Retourne {"hello":"world"}' }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 65536 }
  });
  const resp = await r.response;
  const txt = resp.text();
  console.log(`OK ${Date.now() - t0}ms`);
  console.log(`Longueur: ${txt.length}`);
  console.log(`finishReason: ${resp.candidates?.[0]?.finishReason}`);
  console.log(`usageMetadata:`, JSON.stringify(resp.usageMetadata));
  console.log(`Début: ${txt.slice(0, 200)}`);
} catch (e) { console.log('ERR:', e.message?.slice(0, 500)); }

const realisticPrompt = `Tu es Coach Running Expert. Génère les SEMAINES 2 à 7 d'un plan Course route 20km.

VMA: 16.0 km/h. Allures: EF 5:00, Seuil 4:18, VMA 3:45.

SEMAINE 1 (RÉFÉRENCE):
Mardi: Footing 45min, Jeudi: Renfo 30min, Dimanche: SL 1h

Périodisation:
S2: fondamental 25km, S3: fondamental 27km, S4: fondamental 22km (RÉCUP),
S5: developpement 30km, S6: developpement 33km, S7: developpement 27km (RÉCUP)

Profil: Intermédiaire, Finisher, 3 séances/sem (Mardi/Jeudi/Dimanche), SL Dimanche.

Retourne UNIQUEMENT un tableau JSON [{weekNumber,theme,phase,isRecoveryWeek,sessions:[{day,type,title,duration,distance,intensity,targetPace,warmup,mainSet,cooldown,advice}]},...] pour S2 à S7.
EXACTEMENT 6 semaines, 3 séances chacune.`;

console.log('\n=== TEST 3: Prompt réaliste batch 6sem + maxOutputTokens=65536 ===');
try {
  const t0 = Date.now();
  const m = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  const r = await m.generateContent({
    contents: [{ role: 'user', parts: [{ text: realisticPrompt }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 65536 }
  });
  const elapsed = Date.now() - t0;
  const resp = await r.response;
  const txt = resp.text();
  console.log(`Temps: ${elapsed}ms / ${(elapsed/1000).toFixed(1)}s`);
  console.log(`Longueur: ${txt.length}`);
  console.log(`finishReason: ${resp.candidates?.[0]?.finishReason}`);
  console.log(`usage:`, JSON.stringify(resp.usageMetadata));
  try {
    const parsed = JSON.parse(txt);
    console.log(`JSON OK: Array(${parsed.length})`);
    console.log(`Semaines: ${parsed.map(w => w.weekNumber).join(', ')}`);
  } catch (pe) {
    console.log(`JSON.parse ERR: ${pe.message}`);
    console.log(`Début: ${txt.slice(0, 300)}`);
    console.log(`Fin: ${txt.slice(-300)}`);
  }
} catch (e) { console.log('ERR:', e.message?.slice(0, 800)); }

console.log('\n=== TEST 4: Idem prompt mais maxOutputTokens=8192 ===');
try {
  const t0 = Date.now();
  const m = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  const r = await m.generateContent({
    contents: [{ role: 'user', parts: [{ text: realisticPrompt }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 }
  });
  const elapsed = Date.now() - t0;
  const resp = await r.response;
  const txt = resp.text();
  console.log(`Temps: ${elapsed}ms / ${(elapsed/1000).toFixed(1)}s`);
  console.log(`Longueur: ${txt.length}`);
  console.log(`finishReason: ${resp.candidates?.[0]?.finishReason}`);
  console.log(`usage:`, JSON.stringify(resp.usageMetadata));
  try {
    const p = JSON.parse(txt);
    console.log(`JSON OK: Array(${p.length})`);
  } catch (pe) { console.log(`JSON.parse ERR: ${pe.message}`); }
} catch (e) { console.log('ERR:', e.message?.slice(0, 500)); }

console.log('\n=== TEST 5: gemini-2.5-flash en comparaison ===');
try {
  const t0 = Date.now();
  const m = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const r = await m.generateContent({
    contents: [{ role: 'user', parts: [{ text: realisticPrompt }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 }
  });
  const elapsed = Date.now() - t0;
  const resp = await r.response;
  const txt = resp.text();
  console.log(`Temps: ${elapsed}ms / ${(elapsed/1000).toFixed(1)}s`);
  console.log(`Longueur: ${txt.length}`);
  console.log(`finishReason: ${resp.candidates?.[0]?.finishReason}`);
  console.log(`usage:`, JSON.stringify(resp.usageMetadata));
} catch (e) { console.log('ERR:', e.message?.slice(0, 300)); }

console.log('\n=== FIN ===');
