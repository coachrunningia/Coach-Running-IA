import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const PROJECT = 'coach-running-ia';

const getStr = f => f?.stringValue;
const getNum = f => f?.integerValue !== undefined ? +f.integerValue : (f?.doubleValue !== undefined ? +f.doubleValue : undefined);
const getArr = f => f?.arrayValue?.values || [];
const getMap = f => f?.mapValue?.fields || {};
const getBool = f => f?.booleanValue;
const parseKm = s => { if (!s) return 0; const m = String(s).match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',','.')) : 0; };

const EMAILS = ['delphine2107@yahoo.fr', 'al1.kasongo@hotmail.fr', 'nanarebelle@hotmail.com', 'Sachadjerboua67@gmail.com'];

async function findUser(email) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } } },
        limit: 1
      }
    })
  });
  const j = await r.json();
  return j.find(x => x.document)?.document;
}

async function findPlans(email) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'plans' }],
        where: { fieldFilter: { field: { fieldPath: 'userEmail' }, op: 'EQUAL', value: { stringValue: email } } },
        limit: 5
      }
    })
  });
  const j = await r.json();
  return j.filter(x => x.document).map(x => x.document);
}

let report = '';

for (const email of EMAILS) {
  const user = await findUser(email);
  const plans = await findPlans(email);
  if (!user) { report += `\n\n##### ${email} — USER NOT FOUND\n`; continue; }
  const qd = getMap(user.fields.questionnaireData);
  if (Object.keys(qd).length === 0) { report += `\n\n##### ${email} — QD VIDE\n`; continue; }

  // Tri plans par createdAt desc, prendre le plus récent
  plans.sort((a, b) => {
    const ta = a.fields.createdAt?.stringValue || '';
    const tb = b.fields.createdAt?.stringValue || '';
    return tb.localeCompare(ta);
  });
  const plan = plans[0];

  report += `\n\n${'='.repeat(80)}\n# ${email}\n${'='.repeat(80)}\n\n`;
  // Profil
  const age = getNum(qd.age);
  const sex = getStr(qd.sex);
  const w = getNum(qd.weight);
  const h = getNum(qd.height);
  const imc = (w && h) ? (w / Math.pow(h/100, 2)).toFixed(1) : '?';
  const lvl = getStr(qd.level);
  const curr = getNum(qd.currentWeeklyVolume);
  const currElev = getNum(qd.currentWeeklyElevation);
  const freq = getNum(qd.frequency);
  const goal = getStr(qd.goal);
  const sub = getStr(qd.subGoal);
  const target = getStr(qd.targetTime);
  const city = getStr(qd.city);
  const prefDays = getArr(qd.preferredDays).map(getStr);
  const longDay = getStr(qd.preferredLongRunDay);
  const startDate = getStr(qd.startDate);
  const raceDate = getStr(qd.raceDate);
  const inj = getMap(qd.injuries);
  const hasInj = getBool(inj.hasInjury);
  const injDesc = getStr(inj.description);
  const race = getMap(qd.recentRaceTimes);
  const trail = getMap(qd.trailDetails);
  const comments = getStr(qd.comments);
  const vma = getNum(qd.vma);

  report += `## Profil\n`;
  report += `- ${age}yo ${sex} · ${w}kg/${h}cm IMC=${imc}\n`;
  report += `- Niveau déclaré: **${lvl}**\n`;
  report += `- Volume actuel: ${curr} km/sem · D+ hebdo ${currElev||'?'}m · freq ${freq}\n`;
  report += `- Ville: ${city}\n`;
  report += `- Jours préférés: ${prefDays.join(', ') || '-'} · SL: ${longDay || '-'}\n`;
  report += `- Objectif: **${goal} ${sub ? '/ ' + sub : ''}** target=${target||'Finisher'}\n`;
  report += `- Dates: début ${startDate} → course ${raceDate}\n`;
  if (Object.keys(trail).length) report += `- Trail: ${getNum(trail.distance)}km D+${getNum(trail.elevation)}m\n`;
  report += `- Chronos: 5k=${getStr(race.distance5km)||'-'} 10k=${getStr(race.distance10km)||'-'} semi=${getStr(race.distanceHalfMarathon)||'-'} mara=${getStr(race.distanceMarathon)||'-'}\n`;
  if (hasInj) report += `- 🩹 **BLESSURE**: ${injDesc}\n`;
  if (comments) report += `- Commentaires: "${comments}"\n`;
  report += `- VMA enregistrée: ${vma?.toFixed?.(2) || vma} km/h\n`;

  if (!plan) { report += `\n⚠️ Aucun plan trouvé\n`; continue; }

  const pf = plan.fields;
  const pid = plan.name.split('/').pop();
  const created = getStr(pf.createdAt);
  const score = getNum(pf.confidenceScore);
  const feas = getMap(pf.feasibility);
  const status = getStr(feas.status);
  const safetyWarn = getStr(feas.safetyWarning);
  const dur = getNum(pf.durationWeeks);
  const fullGen = getBool(pf.fullPlanGenerated);
  const isPreview = getBool(pf.isPreview);
  const paces = getMap(pf.paces);
  const welcome = getStr(pf.welcomeMessage) || '';
  const planName = getStr(pf.name);
  const planDist = getStr(pf.distance);

  const gc = getMap(pf.generationContext);
  const peri = getMap(gc.periodizationPlan);
  const wv = getArr(peri.weeklyVolumes).map(getNum);
  const peakVol = wv.length ? Math.max(...wv) : 0;
  const totalVol = wv.reduce((a,b) => a + (b||0), 0);

  report += `\n## Plan ${pid} (créé ${created})\n`;
  report += `- Name: ${planName}\n`;
  report += `- Distance field: ${planDist}\n`;
  report += `- Durée: ${dur} sem · isPreview=${isPreview} · fullGen=${fullGen}\n`;
  report += `- Feasibility: **${status}** score=**${score}**\n`;
  if (safetyWarn) report += `- SafetyWarning: ${safetyWarn.substring(0, 200)}\n`;
  report += `- Allures: EF=${getStr(paces.efPace)} (recovery=${getStr(paces.recoveryPace)}) · Seuil=${getStr(paces.seuilPace)} · VMA=${getStr(paces.vmaPace)}\n`;
  report += `- Periodization: peak=${peakVol}km · total=${totalVol}km\n`;
  report += `- weeklyVolumes: ${JSON.stringify(wv)}\n`;

  // Sessions S1
  const weeks = getArr(pf.weeks);
  report += `- Weeks générées: ${weeks.length}/${dur}\n`;
  if (weeks.length > 0) {
    for (let wIdx = 0; wIdx < Math.min(weeks.length, 1); wIdx++) {
      const w = weeks[wIdx];
      const wm = getMap(w);
      const wn = getNum(wm.weekNumber);
      const phase = getStr(wm.phase);
      const theme = getStr(wm.theme);
      const sessions = getArr(wm.sessions);
      report += `\n### S${wn} (${phase}) — ${theme || ''}\n`;
      let wkVol = 0;
      let wkSL = 0;
      let renfoCount = 0;
      const sessionTypes = new Set();
      const sessionTitles = [];
      for (const s of sessions) {
        const sm = getMap(s);
        const day = getStr(sm.day);
        const t = getStr(sm.type);
        const title = getStr(sm.title);
        const dur = getStr(sm.duration);
        const distS = getStr(sm.distance);
        const pace = getStr(sm.targetPace);
        const intensity = getStr(sm.intensity);
        const km = parseKm(distS);
        wkVol += km;
        if (t === 'Sortie Longue' || /sortie\s*longue/i.test(title||'')) wkSL = Math.max(wkSL, km);
        if (t === 'Renforcement') renfoCount++;
        sessionTypes.add(t);
        sessionTitles.push(title);

        const main = getStr(sm.mainSet) || '';
        const advice = getStr(sm.advice) || '';
        const warmup = getStr(sm.warmup) || '';
        report += `\n  **${day} · ${t} · ${title}**\n`;
        report += `    Durée: ${dur} · Distance: ${distS || '-'} · Pace: ${pace || '-'} · Intensité: ${intensity}\n`;
        if (warmup) report += `    Échauf: ${warmup.substring(0, 200)}\n`;
        if (main) report += `    Main: ${main.substring(0, 400)}\n`;
        if (advice) report += `    Conseil: ${advice.substring(0, 250)}\n`;
      }
      report += `\n  >>> Vol S${wn} = ${wkVol.toFixed(1)} km · SL=${wkSL.toFixed(1)} km · Renfo=${renfoCount} · Types: ${[...sessionTypes].join(', ')}\n`;
    }
  }

  // Welcome message
  report += `\n## Welcome message (${welcome.length} chars)\n${welcome.substring(0, 2000)}\n`;
  if (welcome.length > 2000) report += `[... +${welcome.length - 2000} chars]\n`;
}

writeFileSync('/Users/romanemarino/Coach-Running-IA/4-plans-audit.md', report);
console.log(`Audit écrit: /Users/romanemarino/Coach-Running-IA/4-plans-audit.md (${report.length} chars)`);
