import { execSync } from 'child_process';

const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const PROJECT = 'coach-running-ia';

// ============================================================
// PATCH NANAREBELLE : re-niveau Débutant + paces + fix main sets
// ============================================================
const NANA_ID = '1778867644661';

const r0 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${NANA_ID}`, {
  headers: { Authorization: `Bearer ${TOKEN}` }
});
const nana = await r0.json();
const nf = nana.fields;
const currentPaces = nf.paces?.mapValue?.fields || {};
console.log('Nanarebelle paces actuels:');
console.log(`  efPace=${currentPaces.efPace?.stringValue}`);
console.log(`  seuilPace=${currentPaces.seuilPace?.stringValue}`);
console.log(`  vmaPace=${currentPaces.vmaPace?.stringValue}`);
console.log(`  recoveryPace=${currentPaces.recoveryPace?.stringValue}`);

// Nouveaux paces niveau Débutant (60% / 82% / 100% / 60% de VMA 10,3 km/h)
// VMA 10,3 km/h → 60% = 6,18 km/h = 9:42 min/km → arrondi 9:30 = 6,32 (légèrement plus rapide)
// On vise EF 9:30 (62% VMA, plus prudent que 67%), seuil 7:10 (82%), récup 10:00 (60%)
const NEW_PACES_NANA = {
  efPace: { stringValue: '9:30' },
  seuilPace: { stringValue: '7:10' },
  vmaPace: { stringValue: '5:48' },  // 100% VMA inchangé
  recoveryPace: { stringValue: '10:00' },
  eaPace: { stringValue: '7:50' },  // EA = 75% VMA
  allureSpecifique5k: currentPaces.allureSpecifique5k || { stringValue: '6:00' },
  allureSpecifique10k: currentPaces.allureSpecifique10k || { stringValue: '6:30' },
  allureSpecifiqueSemi: currentPaces.allureSpecifiqueSemi || { stringValue: '6:50' },
  allureSpecifiqueMarathon: currentPaces.allureSpecifiqueMarathon || { stringValue: '7:30' },
  vma: currentPaces.vma || { doubleValue: 10.3 },
  vmaKmh: { stringValue: '10.3' },
};

// Patch sessions S1 : remplacer "40 cycles" → "16 cycles", "20 cycles" → "16 cycles"
// Et mettre à jour les targetPace
const weeksArr = nf.weeks?.arrayValue?.values || [];
const newWeeks = JSON.parse(JSON.stringify(weeksArr));  // deep clone

for (const w of newWeeks) {
  const sessions = w.mapValue?.fields?.sessions?.arrayValue?.values || [];
  for (const s of sessions) {
    const sm = s.mapValue.fields;
    const day = sm.day?.stringValue;
    const main = sm.mainSet?.stringValue || '';
    const tp = sm.targetPace?.stringValue || '';
    // Remplacer cycles
    if (day === 'Mercredi' && main.includes('40 cycles')) {
      sm.mainSet.stringValue = main.replace('40 cycles', '16 cycles');
    }
    if (day === 'Dimanche' && main.includes('20 cycles')) {
      sm.mainSet.stringValue = main.replace('20 cycles', '16 cycles');
    }
    // Remplacer paces dans les textes
    if (sm.warmup?.stringValue) sm.warmup.stringValue = sm.warmup.stringValue.replace(/9:40 min\/km/g, '10:00 min/km').replace(/8:39 min\/km/g, '9:30 min/km');
    if (sm.cooldown?.stringValue) sm.cooldown.stringValue = sm.cooldown.stringValue.replace(/9:40 min\/km/g, '10:00 min/km').replace(/8:39 min\/km/g, '9:30 min/km');
    if (sm.mainSet?.stringValue) sm.mainSet.stringValue = sm.mainSet.stringValue.replace(/9:40 min\/km/g, '10:00 min/km').replace(/8:39 min\/km/g, '9:30 min/km');
    if (sm.targetPace?.stringValue) sm.targetPace.stringValue = sm.targetPace.stringValue.replace(/9:40/g, '10:00').replace(/8:39/g, '9:30');
  }
}

const patchNanaBody = {
  fields: {
    paces: { mapValue: { fields: NEW_PACES_NANA } },
    weeks: { arrayValue: { values: newWeeks } },
  }
};
const maskNana = ['paces', 'weeks'];
const urlNana = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${NANA_ID}?` +
  maskNana.map(m => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&');

const rNana = await fetch(urlNana, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(patchNanaBody),
});
if (!rNana.ok) {
  const e = await rNana.json();
  console.log(`\n❌ NANAREBELLE PATCH ÉCHEC: ${rNana.status}\n${JSON.stringify(e, null, 2).substring(0,1500)}`);
} else {
  console.log('\n✅ Nanarebelle : paces re-calibrées Débutant + main sets fixés (40→16 et 20→16 cycles)');
}

// ============================================================
// PATCH SACHA : re-niveau Confirmé + paces + SL 15,65→13 km
// ============================================================
const SACHA_ID = '1778867137508';
const r0s = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${SACHA_ID}`, {
  headers: { Authorization: `Bearer ${TOKEN}` }
});
const sacha = await r0s.json();
const sf = sacha.fields;
const sacaPaces = sf.paces?.mapValue?.fields || {};
console.log('\nSacha paces actuels:');
console.log(`  efPace=${sacaPaces.efPace?.stringValue}`);
console.log(`  seuilPace=${sacaPaces.seuilPace?.stringValue}`);

// Nouveau paces niveau Confirmé (recalibré pour VMA 17,4 km/h actuelle)
// EF 4:55 = 12,2 km/h = 70% VMA (entre Conf 65% et Expert 67% — choix coach)
// Seuil 4:00 = 15 km/h = 86%
// VMA 3:26 = 17,4 km/h = 100% inchangé
// Récup 5:30 = 10,9 km/h = 63%
const NEW_PACES_SACHA = {
  efPace: { stringValue: '4:55' },
  seuilPace: { stringValue: '4:00' },
  vmaPace: { stringValue: '3:26' },
  recoveryPace: { stringValue: '5:30' },
  eaPace: { stringValue: '4:30' },
  allureSpecifique5k: sacaPaces.allureSpecifique5k || { stringValue: '3:37' },
  allureSpecifique10k: sacaPaces.allureSpecifique10k || { stringValue: '3:50' },
  allureSpecifiqueSemi: sacaPaces.allureSpecifiqueSemi || { stringValue: '4:02' },
  allureSpecifiqueMarathon: sacaPaces.allureSpecifiqueMarathon || { stringValue: '4:18' },
  vma: sacaPaces.vma || { doubleValue: 17.4 },
  vmaKmh: { stringValue: '17.4' },
};

// Sessions S1 : remplacer paces + réduire SL 15,65→13 km
const sweeksArr = sf.weeks?.arrayValue?.values || [];
const newSWeeks = JSON.parse(JSON.stringify(sweeksArr));

for (const w of newSWeeks) {
  const sessions = w.mapValue?.fields?.sessions?.arrayValue?.values || [];
  for (const s of sessions) {
    const sm = s.mapValue.fields;
    const day = sm.day?.stringValue;
    const t = sm.type?.stringValue || '';

    // SL Samedi : 15.65 km → 13 km, 1h20 → 1h05
    if (day === 'Samedi' && t === 'Sortie Longue') {
      if (sm.distance) sm.distance.stringValue = '13 km';
      if (sm.duration) sm.duration.stringValue = '1h05';
      if (sm.mainSet?.stringValue) {
        sm.mainSet.stringValue = sm.mainSet.stringValue
          .replace(/1h20 min/g, '1h05 min')
          .replace(/1h20/g, '1h05')
          .replace(/5:08 min\/km/g, '4:55 min/km')
          .replace(/5:08/g, '4:55');
      }
    }

    // Replace paces dans tous les textes
    for (const k of ['warmup','mainSet','cooldown','advice','targetPace']) {
      if (sm[k]?.stringValue) {
        sm[k].stringValue = sm[k].stringValue
          .replace(/5:08 min\/km/g, '4:55 min/km')
          .replace(/5:08/g, '4:55')
          .replace(/3:57 min\/km/g, '4:00 min/km')
          .replace(/3:57/g, '4:00')
          .replace(/5:44 min\/km/g, '5:30 min/km')
          .replace(/5:44/g, '5:30');
      }
    }
  }
}

const patchSachaBody = {
  fields: {
    paces: { mapValue: { fields: NEW_PACES_SACHA } },
    weeks: { arrayValue: { values: newSWeeks } },
  }
};
const maskSacha = ['paces', 'weeks'];
const urlSacha = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${SACHA_ID}?` +
  maskSacha.map(m => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&');

const rSacha = await fetch(urlSacha, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(patchSachaBody),
});
if (!rSacha.ok) {
  const e = await rSacha.json();
  console.log(`\n❌ SACHA PATCH ÉCHEC: ${rSacha.status}\n${JSON.stringify(e, null, 2).substring(0,1500)}`);
} else {
  console.log('\n✅ Sacha : paces re-calibrées Confirmé + SL Samedi 15,65→13 km (1h05)');
}

// Vérification finale
console.log('\n--- Vérification post-patch ---');
for (const [name, id] of [['Nanarebelle', NANA_ID], ['Sacha', SACHA_ID]]) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  const j = await r.json();
  const p = j.fields?.paces?.mapValue?.fields || {};
  console.log(`${name}:
  EF=${p.efPace?.stringValue} seuil=${p.seuilPace?.stringValue} récup=${p.recoveryPace?.stringValue}`);
}
