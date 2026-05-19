import { execSync } from 'child_process';
const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();

const getStr = f => f?.stringValue;
const getNum = f => f?.integerValue !== undefined ? +f.integerValue : (f?.doubleValue !== undefined ? +f.doubleValue : undefined);
const getArr = f => f?.arrayValue?.values || [];
const getMap = f => f?.mapValue?.fields || {};
const getBool = f => f?.booleanValue;
const parseKm = s => { if (!s) return 0; const m = String(s).match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',','.')) : 0; };

const EMAILS = ['Sachadjerboua67@gmail.com'];

for (const email of EMAILS) {
  console.log(`\n\n================== ${email} ==================`);
  // Query plans
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'plans' }],
        where: { fieldFilter: { field: { fieldPath: 'userEmail' }, op: 'EQUAL', value: { stringValue: email } } },
        limit: 10
      }
    })
  });
  const docs = await r.json();
  console.log(`Trouvé ${docs.length} plans`);

  for (const item of docs) {
    if (!item.document) continue;
    const f = item.document.fields;
    const id = item.document.name.split('/').pop();
    const goal = getStr(f.goal);
    const dist = getStr(f.distance);
    const dur = getNum(f.durationWeeks);
    const fullGen = getBool(f.fullPlanGenerated);
    const isPreview = getBool(f.isPreview);
    const vma = getNum(f.vma) ?? getNum(f.calculatedVMA);
    const vmaSrc = getStr(f.vmaSource);
    const sess = getNum(f.sessionsPerWeek);
    const paces = getMap(f.paces);
    const feas = getMap(f.feasibility);
    const status = getStr(feas.status);
    const score = getNum(f.confidenceScore);
    const createdAt = getStr(f.createdAt);
    const welcome = getStr(f.welcomeMessage) || '';
    const userId = getStr(f.userId);

    const gc = getMap(f.generationContext);
    const peri = getMap(gc.periodizationPlan);
    const wv = getArr(peri.weeklyVolumes).map(getNum);
    const totalPlanVol = getNum(peri.totalVolumeKm);
    const peakVol = getNum(peri.peakVolumeKm);

    // Fetch user
    const ur = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/users/${userId}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const uj = await ur.json();
    const qd = getMap(uj.fields?.questionnaireData);
    const ageU = getNum(qd.age);
    const sexU = getStr(qd.sex);
    const weightU = getNum(qd.weight);
    const heightU = getNum(qd.height);
    const lvlU = getStr(qd.level);
    const currVolU = getNum(qd.currentWeeklyVolume);
    const currElevU = getNum(qd.currentWeeklyElevation);
    const freqU = getNum(qd.frequency);
    const goalU = getStr(qd.goal);
    const targetU = getStr(qd.targetTime);
    const cityU = getStr(qd.city);
    const injMap = getMap(qd.injuries);
    const hasInj = getBool(injMap.hasInjury);
    const injDesc = getStr(injMap.description);
    const raceMap = getMap(qd.recentRaceTimes);
    const trailMap = getMap(qd.trailDetails);
    const imc = (weightU && heightU) ? (weightU / Math.pow(heightU/100,2)).toFixed(1) : '?';
    const prefDays = getArr(qd.preferredDays).map(getStr);
    const longRunDay = getStr(qd.preferredLongRunDay);
    const startDate = getStr(qd.startDate);
    const raceDate = getStr(qd.raceDate);

    console.log(`\n=== Plan ${id} (créé ${createdAt}) ===`);
    console.log(`isPreview=${isPreview} fullGen=${fullGen}`);
    console.log(`Goal: ${goal} / ${dist} — Target: ${targetU || 'Finisher'} — Durée: ${dur} sem (start ${startDate} → course ${raceDate})`);
    console.log(`Profil: ${ageU}yo ${sexU} ${weightU}kg/${heightU}cm IMC=${imc} — Niveau ${lvlU} — Vol actuel ${currVolU}km/sem D+${currElevU}m freq=${freqU} — Ville: ${cityU}`);
    console.log(`Jours préférés: ${prefDays.join(',')} — SL: ${longRunDay}`);
    if (hasInj) console.log(`🩹 BLESSURE: ${injDesc}`);
    console.log(`Trail: dist=${getNum(trailMap.distance)}km D+${getNum(trailMap.elevation)}m`);
    console.log(`Chronos: 5k=${getStr(raceMap.distance5km)||'-'} 10k=${getStr(raceMap.distance10km)||'-'} semi=${getStr(raceMap.distanceHalfMarathon)||'-'} mara=${getStr(raceMap.distanceMarathon)||'-'}`);
    console.log(`VMA: ${vma?.toFixed(1)} km/h (${vmaSrc})`);
    console.log(`Allures: EF=${getStr(paces.efPace)} (67%) · Seuil=${getStr(paces.seuilPace)} (87%) · VMA=${getStr(paces.vmaPace)} · récup=${getStr(paces.recoveryPace)}`);
    console.log(`Feasibility: ${status} score=${score}`);
    console.log(`Periodization: peak=${peakVol}km totalVol=${totalPlanVol}km`);
    console.log(`weeklyVolumes: ${JSON.stringify(wv)}`);

    // Weeks (S1 in preview)
    const weeks = getArr(f.weeks);
    console.log(`\nWeeks générées: ${weeks.length}/${dur}`);
    for (const w of weeks) {
      const wm = getMap(w);
      const wn = getNum(wm.weekNumber);
      const phase = getStr(wm.phase);
      const goal2 = getStr(wm.weekGoal);
      const sessions = getArr(wm.sessions);
      let wkVol = 0;
      console.log(`\n  S${wn} (${phase}) — ${goal2}`);
      for (const s of sessions) {
        const sm = getMap(s);
        const t = getStr(sm.type);
        const day = getStr(sm.day);
        const title = getStr(sm.title);
        const intensity = getStr(sm.intensity);
        const dur = getStr(sm.duration);
        const distS = getStr(sm.distance);
        const pace = getStr(sm.targetPace);
        const km = parseKm(distS);
        wkVol += km;
        console.log(`    ${day} • ${t} • ${title}`);
        console.log(`       ${dur} · ${distS || '-'} · pace=${pace || '-'} · intensity=${intensity}`);
        const warmup = getStr(sm.warmup);
        const mainSet = getStr(sm.mainSet);
        const cooldown = getStr(sm.cooldown);
        if (warmup) console.log(`       Échauf: ${warmup.substring(0,150)}`);
        if (mainSet) console.log(`       Main: ${mainSet.substring(0,200)}`);
        if (cooldown) console.log(`       Retour: ${cooldown.substring(0,150)}`);
        const advice = getStr(sm.advice);
        if (advice) console.log(`       Conseil: ${advice.substring(0,200)}`);
      }
      console.log(`    >>> Vol S${wn} = ${wkVol.toFixed(1)} km`);
    }
    console.log(`\n--- Message d'accueil (${welcome.length} chars) ---`);
    console.log(welcome.substring(0, 1500));
    if (welcome.length > 1500) console.log(`... (${welcome.length - 1500} chars supplémentaires)`);
  }
}
