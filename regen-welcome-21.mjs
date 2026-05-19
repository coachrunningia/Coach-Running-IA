/**
 * Régénération welcome — 21 plans critiques où le welcome contredit le nouveau statut
 *
 * 6 BON→IRRÉALISTE + 2 AMBITIEUX→IRRÉALISTE + 2 RISQUÉ→IRRÉALISTE = 10 vers IRRÉALISTE
 * 11 BON→RISQUÉ = 11 vers RISQUÉ
 * Total 21 plans
 *
 * Template structuré (pas d'appel Gemini) basé sur :
 *   - prénom user
 *   - subGoal + targetTime + durée
 *   - nouvelle pace cible
 *   - %VMA cible vs fourchette standard
 *   - chrono récent matching ou non
 *
 * Mode dry-run par défaut. Pour exec : --exec
 */
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';

const DRY_RUN = !process.argv.includes('--exec');
const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

if (!existsSync('backups-welcomes')) mkdirSync('backups-welcomes');

function pv(v){ if(!v) return null; if(v.stringValue!==undefined) return v.stringValue; if(v.integerValue!==undefined) return parseInt(v.integerValue); if(v.doubleValue!==undefined) return v.doubleValue; if(v.booleanValue!==undefined) return v.booleanValue; if(v.timestampValue!==undefined) return v.timestampValue; if(v.arrayValue) return (v.arrayValue.values||[]).map(pv); if(v.mapValue) return pf(v.mapValue.fields); return null; }
function pf(f){ if(!f) return {}; const o={}; for(const [k,v] of Object.entries(f)) o[k]=pv(v); return o; }

// Charger l'audit V2
const detailed = JSON.parse(readFileSync('audit-pace-bug-v2.json', 'utf8'));
const EXCLUDE = new Set(['1778927329896']);  // al1.kasongo Marathon — déjà patché manuellement

// Filtrer les 21 critiques (vers IRRÉALISTE ou RISQUÉ depuis BON/AMBITIEUX/RISQUÉ)
const critical = detailed.filter(d => {
  if (EXCLUDE.has(d.id)) return false;
  const from = d.feasStatusActuel;
  const to = d.feasStatusReco;
  if (to === 'IRRÉALISTE' && from !== 'IRRÉALISTE') return true;
  if (to === 'RISQUÉ' && from !== 'RISQUÉ' && from !== 'IRRÉALISTE') return true;
  return false;
});
console.log(`${DRY_RUN ? '🧪 DRY-RUN' : '🚀 EXEC'} sur ${critical.length} plans critiques\n`);

// ────────────────────────────────────────────────────────────────────
// TEMPLATES
// ────────────────────────────────────────────────────────────────────

function paceToReadable(pace) {
  // "4:59" → "4:59/km"
  return pace.includes('/') ? pace : `${pace}/km`;
}

// Calcule une cible réaliste basée sur VMA + distance
// Utilise le milieu de la fourchette standard (point central physiologique)
function calculerCibleRealiste(vma, subGoal) {
  // %VMA milieu fourchette : 5km=95%, 10km=90%, semi=86%, marathon=82%
  const distMap = {
    '5 km': { dist: 5, pct: 0.95 },
    '10 km': { dist: 10, pct: 0.90 },
    'Semi-Marathon': { dist: 21.097, pct: 0.86 },
    'Marathon': { dist: 42.195, pct: 0.82 },
  };
  const info = distMap[subGoal];
  if (!info || !vma) return null;
  const speed = vma * info.pct; // km/h
  const totalSec = (info.dist / speed) * 3600;
  const h = Math.floor(totalSec / 3600);
  const m = Math.round((totalSec % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${m}min`;
}

// Parse un chrono dans n'importe quel format courant : "2h24", "2h24min", "2:24:21", "1h45"
function parseChronoToMinutes(chronoStr) {
  if (!chronoStr) return null;
  const s = String(chronoStr).trim().toLowerCase();
  // Format "Xh" ou "XhYY" ou "XhYYmin"
  const hm = s.match(/(\d+)\s*h\s*(\d{0,2})/i);
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2] || 0);
  // Format "HH:MM:SS" — minutes = HH*60 + MM, on ignore les SS
  const hms = s.match(/(\d+):(\d{1,2}):(\d{1,2})/);
  if (hms) return parseInt(hms[1]) * 60 + parseInt(hms[2]);
  // Format "MM:SS" pour distances courtes (< 1h)
  const ms = s.match(/^(\d+):(\d{1,2})$/);
  if (ms) return parseInt(ms[1]); // approx en minutes (on ignore secondes)
  return null;
}

// Format chrono → chrono légèrement amélioré (-2 à -8min selon distance et écart)
function ameliorationChrono(chronoStr, subGoal) {
  const totalMin = parseChronoToMinutes(chronoStr);
  if (totalMin === null) return chronoStr;
  // amélioration : 2-3% du chrono (objectif léger mais visible)
  const ameliorationMin = subGoal === 'Marathon' ? Math.max(5, Math.round(totalMin * 0.025))
                       : subGoal === 'Semi-Marathon' ? Math.max(3, Math.round(totalMin * 0.025))
                       : Math.max(2, Math.round(totalMin * 0.03));
  const newTotal = Math.max(1, totalMin - ameliorationMin);
  const nh = Math.floor(newTotal / 60), nmn = newTotal % 60;
  return nh > 0 ? `${nh}h${String(nmn).padStart(2,'0')}` : `${nmn}min`;
}

function templateIRREALISTE({ firstName, subGoal, targetTime, durationWeeks, paceCible, pctVMACible, matchingChrono, isSenior, vma }) {
  const prenom = firstName ? ` ${firstName}` : '';

  let alt;
  if (matchingChrono) {
    const ameliore = ameliorationChrono(matchingChrono, subGoal);
    alt = `Au vu de ton chrono récent (${matchingChrono} sur ${subGoal.toLowerCase()}), un objectif autour de **${ameliore}** serait plus accessible et te permettrait quand même de progresser. Cela dit, avec un entraînement régulier sur les semaines à venir, tu peux continuer à améliorer ta VMA et te rapprocher de ton objectif initial.`;
  } else {
    const cibleReco = calculerCibleRealiste(parseFloat(vma), subGoal);
    if (cibleReco) {
      alt = `Avec ta VMA actuelle, il serait plus réaliste de viser autour de **${cibleReco}**. Cependant, avec un entraînement régulier, tu peux tout à fait améliorer ta VMA au fil des semaines et te rapprocher de ton objectif initial.`;
    } else {
      alt = `Avec ta VMA actuelle, un objectif moins ambitieux serait plus accessible. Cela dit, avec un entraînement régulier, tu peux améliorer ta VMA au fil des semaines.`;
    }
  }

  return `Bonjour${prenom},

Suite à un recalibrage technique de nos calculs d'allure, ton plan a été ajusté.

Concernant ton objectif ${subGoal} en ${targetTime} : viser cette cible demande de courir à ${paceToReadable(paceCible)}, soit ${pctVMACible} de ta VMA actuelle. C'est au-delà de ce que ton profil actuel permet d'atteindre sereinement.

${alt}

Le plan reste à ta disposition tel quel. Si tu souhaites l'ajuster vers un objectif plus accessible, on peut le regénérer — sinon, suis-le en te concentrant sur tes sensations et en écoutant ton corps.

🩺 Avant de démarrer, consulte ton médecin pour un certificat médical d'aptitude au sport${isSenior ? ', et idéalement un test d\'effort vu ton âge' : ''}. Hydrate-toi bien, échauffe-toi sérieusement avant chaque séance et accorde-toi des temps de récupération suffisants.

Bonne préparation.`;
}

function templateRISQUE({ firstName, subGoal, targetTime, durationWeeks, paceCible, pctVMACible, matchingChrono, isSenior, vma }) {
  const prenom = firstName ? ` ${firstName}` : '';

  let altNote;
  if (matchingChrono) {
    altNote = `Ton chrono récent (${matchingChrono}) montre que tu as déjà couru cette distance — tenter cet objectif reste possible avec une préparation rigoureuse. Avec un entraînement régulier, tu peux te rapprocher progressivement de ta cible.`;
  } else {
    const cibleReco = calculerCibleRealiste(parseFloat(vma), subGoal);
    altNote = cibleReco
      ? `À ton niveau actuel, viser plutôt **${cibleReco}** te garantirait une préparation plus confortable. Cela dit, avec un entraînement régulier, tu peux améliorer ta VMA et te rapprocher progressivement de ton objectif initial.`
      : `Avec un entraînement régulier, tu peux te rapprocher progressivement de ton objectif initial.`;
  }

  return `Bonjour${prenom},

Suite à un recalibrage technique de nos calculs d'allure, ton plan a été ajusté.

Concernant ton objectif ${subGoal} en ${targetTime} : viser cette cible demande de courir à ${paceToReadable(paceCible)}, soit ${pctVMACible} de ta VMA actuelle. C'est ambitieux pour ton niveau actuel.

${altNote}

Le plan reste calibré pour t'amener à ta cible. Quelques conseils pour mettre toutes les chances de ton côté :
- **Privilégie la régularité** sur les séances d'endurance fondamentale — c'est ce qui fait la différence sur la durée.
- **Écoute ton corps** : douleur persistante, fatigue inhabituelle, sommeil dégradé → ralentis ou prends un jour de repos supplémentaire.
- **Ne saute pas la décharge** : les semaines de récupération sont aussi importantes que les semaines de charge.

🩺 Avant de démarrer, consulte ton médecin pour un certificat médical d'aptitude au sport${isSenior ? ', et idéalement un test d\'effort vu ton âge' : ''}. Hydrate-toi bien, échauffe-toi sérieusement avant chaque séance.

Bonne préparation.`;
}

// ────────────────────────────────────────────────────────────────────
// EXEC
// ────────────────────────────────────────────────────────────────────

const log = [];
let nbOk = 0, nbErr = 0;

for (const d of critical) {
  try {
    // Fetch + backup
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${d.id}`, { headers:H });
    const doc = await r.json();
    if (!doc.fields) { console.log(`⚠ ${d.id} introuvable`); nbErr++; continue; }
    writeFileSync(`backups-welcomes/${d.id}.json`, JSON.stringify({ welcomeMessage: doc.fields.welcomeMessage?.stringValue }, null, 2));

    const snap = doc.fields.generationContext?.mapValue?.fields?.questionnaireSnapshot?.mapValue?.fields;
    const userRef = doc.fields.userId?.stringValue;
    let firstName = null;
    if (userRef) {
      const ur = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${userRef}`, { headers:H });
      const uj = await ur.json();
      firstName = uj.fields?.firstName?.stringValue;
    }
    const age = parseInt(snap?.age?.integerValue || '0');
    const isSenior = age >= 45;

    const tmplArgs = {
      firstName,
      subGoal: d.subGoal,
      targetTime: d.targetTime,
      durationWeeks: doc.fields.durationWeeks?.integerValue,
      paceCible: d.paceCibleStr,
      pctVMACible: d.pctVMACible,
      matchingChrono: d.matchingChrono,
      isSenior,
      vma: d.vma,
    };
    const newWelcome = d.feasStatusReco === 'IRRÉALISTE' ? templateIRREALISTE(tmplArgs) : templateRISQUE(tmplArgs);

    log.push({
      id: d.id, email: d.email, firstName,
      feasFrom: d.feasStatusActuel, feasTo: d.feasStatusReco,
      subGoal: d.subGoal, targetTime: d.targetTime,
      paceCible: d.paceCibleStr, pctVMACible: d.pctVMACible,
      matchingChrono: d.matchingChrono,
      oldWelcomeFirst200: (doc.fields.welcomeMessage?.stringValue || '').substring(0,200) + '…',
      newWelcomeFirst200: newWelcome.substring(0,200) + '…',
      newWelcomeFull: newWelcome,
    });

    if (!DRY_RUN) {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${d.id}?updateMask.fieldPaths=welcomeMessage`;
      const patch = await fetch(url, { method:'PATCH', headers:H, body: JSON.stringify({ fields: { welcomeMessage: { stringValue: newWelcome } } }) });
      if (patch.status !== 200) {
        const pj = await patch.json();
        console.log(`❌ ${d.id} patch failed (${patch.status}): ${JSON.stringify(pj).substring(0,200)}`);
        nbErr++;
        continue;
      }
    }
    nbOk++;
  } catch (e) {
    console.log(`❌ ${d.id} exception: ${e.message}`);
    nbErr++;
  }
}

console.log(`\n${DRY_RUN ? '🧪 DRY-RUN' : '🚀 EXEC'} TERMINÉ — ${nbOk}/${critical.length} OK, ${nbErr} erreurs`);

writeFileSync('regen-welcome-21-log.json', JSON.stringify({ dryRun: DRY_RUN, log }, null, 2));
console.log(`\n📝 regen-welcome-21-log.json (détail + nouveaux welcomes complets)`);
console.log(`📦 backups-welcomes/ (${nbOk} backups d'anciens welcomes)`);

if (DRY_RUN) console.log(`\n💡 Pour exécuter : node regen-welcome-21.mjs --exec`);
