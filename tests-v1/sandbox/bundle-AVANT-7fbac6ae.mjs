globalThis.__IMPORT_META_ENV__ = { VITE_R2_GATES_ENABLED: undefined, VITE_GEMINI_API_KEY: undefined, PROD: false, DEV: true, MODE: 'development' };
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// tests-v1/sandbox/stub_generative_ai/index.js
var stub_generative_ai_exports = {};
__export(stub_generative_ai_exports, {
  GoogleGenerativeAI: () => GoogleGenerativeAI,
  default: () => stub_generative_ai_default
});
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
var GoogleGenerativeAI, stub_generative_ai_default;
var init_stub_generative_ai = __esm({
  "tests-v1/sandbox/stub_generative_ai/index.js"() {
    GoogleGenerativeAI = class {
      constructor(apiKey) {
        this.apiKey = apiKey;
      }
      getGenerativeModel(opts) {
        return {
          generateContent: async (req) => {
            const prompt = req?.contents?.[0]?.parts?.[0]?.text || "<NO PROMPT>";
            const file = process.env.PROMPT_OUTPUT_FILE;
            if (!file) throw new Error("PROMPT_OUTPUT_FILE not set");
            try {
              mkdirSync(dirname(file), { recursive: true });
            } catch {
            }
            writeFileSync(file, prompt);
            const err = new Error("__PROMPT_CAPTURED__");
            err.code = "__PROMPT_CAPTURED__";
            throw err;
          }
        };
      }
    };
    stub_generative_ai_default = { GoogleGenerativeAI };
  }
});

// src/services/planUtils.ts
var parseKm, parseDurationMin, calculateWeekTargetElevation;
var init_planUtils = __esm({
  "src/services/planUtils.ts"() {
    parseKm = (d) => {
      if (!d) return 0;
      const n = parseFloat(d.toString().replace(/[^0-9.,]/g, "").replace(",", "."));
      return isFinite(n) && n > 0 ? n : 0;
    };
    parseDurationMin = (d) => {
      if (!d) return 0;
      const s = d.toString().toLowerCase();
      const hMatch = s.match(/(\d+)\s*h\s*(\d*)/);
      if (hMatch) return parseInt(hMatch[1]) * 60 + (hMatch[2] ? parseInt(hMatch[2]) : 0);
      const minMatch = s.match(/(\d+)\s*min/);
      if (minMatch) return parseInt(minMatch[1]);
      const num = parseInt(s);
      return num > 0 ? num : 0;
    };
    calculateWeekTargetElevation = (weekNumber, totalWeeks, raceElevation, level, currentWeeklyElevation, phase) => {
      if (!raceElevation || isNaN(raceElevation)) return 0;
      const lvl = level.toLowerCase();
      const isDeb = lvl === "deb" || lvl.includes("d\xE9butant") || lvl.includes("debutant");
      const isInter = lvl === "inter" || lvl.includes("interm\xE9diaire") || lvl.includes("intermediaire");
      const isConf = lvl === "conf" || lvl.includes("confirm\xE9") || lvl.includes("confirme") || lvl.includes("comp\xE9tition");
      const maxWeeklyElevation = isDeb ? Math.min(raceElevation, 800) : isInter ? Math.min(raceElevation, 1500) : isConf ? Math.min(raceElevation, 2500) : Math.min(raceElevation, 3500);
      const defaultStart = isDeb ? 150 : isInter ? 300 : isConf ? 500 : 800;
      const maxStart = Math.min(1500, Math.round(maxWeeklyElevation * 0.6));
      const minStartElevation = Math.round(raceElevation * 0.15);
      const rawStart = currentWeeklyElevation && currentWeeklyElevation > 0 ? Math.min(currentWeeklyElevation, maxStart) : Math.min(defaultStart, maxStart);
      const startElevation = Math.max(rawStart, Math.min(minStartElevation, maxStart));
      const progress = Math.min(1, (weekNumber - 1) / Math.max(1, totalWeeks - 1));
      let target = Math.round(startElevation + (maxWeeklyElevation - startElevation) * progress);
      const p = (phase || "").toLowerCase();
      if (p.includes("recup") || p.includes("r\xE9cup")) {
        target = Math.round(target * 0.55);
      } else if (p.includes("affut") || p.includes("aff\xFBt") || p.includes("taper")) {
        const remainingWeeks = totalWeeks - weekNumber;
        const affutageReduction = remainingWeeks <= 0 ? 0.4 : remainingWeeks === 1 ? 0.5 : 0.7;
        target = Math.round(target * affutageReduction);
      }
      return target;
    };
  }
});

// src/services/renfoService.ts
function pickExercises(exercises, count, weekNumber) {
  if (exercises.length === 0) return [];
  const n = Math.min(count, exercises.length);
  const offset = (weekNumber - 1) % exercises.length;
  const picked = [];
  for (let i = 0; i < n; i++) {
    picked.push(exercises[(offset + i) % exercises.length]);
  }
  return picked;
}
function scaleSets(sets, factor) {
  return sets.replace(/(\d+)x(\d+)/, (_match, s, r) => {
    const reps = Math.max(1, Math.round(parseInt(r, 10) * factor));
    return `${s}x${reps}`;
  });
}
function getLevelFactor(level) {
  if (level.includes("Debutant") || level.includes("D\xE9butant")) return 0.7;
  if (level.includes("Intermediaire") || level.includes("Interm\xE9diaire")) return 1;
  if (level.includes("Confirme") || level.includes("Confirm\xE9")) return 1.15;
  if (level.includes("Expert")) return 1.3;
  return 1;
}
function getPhaseFactor(phase) {
  switch (phase) {
    case "fondamental":
      return 0.9;
    // moderate, focus technique
    case "developpement":
      return 1;
    case "specifique":
      return 1.1;
    // higher intensity
    case "affutage":
      return 0.65;
    // -35% volume
    case "recuperation":
      return 0.6;
    // -40% volume
    default:
      return 1;
  }
}
function getDuration(level) {
  if (level.includes("Debutant") || level.includes("D\xE9butant")) return "30 min";
  if (level.includes("Intermediaire") || level.includes("Interm\xE9diaire")) return "35-40 min";
  return "40-45 min";
}
function getRestBetweenTours(level, goal) {
  if (goal === "Perte de poids") return "30s";
  if (level.includes("Debutant") || level.includes("D\xE9butant")) return "2 min";
  if (level.includes("Expert")) return "1 min";
  return "1 min 30";
}
function getTours(level, goal, phase) {
  let tours = 3;
  if (goal === "Perte de poids") tours = 4;
  if (level.includes("Debutant") || level.includes("D\xE9butant")) tours = 2;
  if (level.includes("Expert")) tours = 4;
  if (phase === "affutage" || phase === "recuperation") tours = Math.max(2, tours - 1);
  return tours;
}
function getFocusAFamilies(routeFamilies) {
  const quadFamily = routeFamilies.find((f) => f.name === "QUADRICEPS/FESSIERS");
  const gainageFamily = routeFamilies.find((f) => f.name === "GAINAGE");
  const molletsFamily = routeFamilies.find((f) => f.name === "MOLLETS/PIEDS");
  const quadExercises = quadFamily.exercises.filter(
    (e) => !e.name.includes("Hip thrust") && !e.name.includes("Pont unipodal")
  );
  const primaryA = { name: quadFamily.name, exercises: quadExercises };
  const gainageA = gainageFamily.exercises.filter(
    (e) => e.name.includes("ventral") || e.name.includes("Dead bug") || e.name.includes("Superman") || e.name.includes("Pompes")
  );
  const molletsA = molletsFamily.exercises.filter(
    (e) => e.name.includes("debout") || e.name.includes("pointes")
  );
  return { primary: primaryA, gainage: gainageA, mollets: molletsA };
}
function getFocusBFamilies(routeFamilies) {
  const quadFamily = routeFamilies.find((f) => f.name === "QUADRICEPS/FESSIERS");
  const stabFamily = routeFamilies.find((f) => f.name === "STABILITE HANCHE");
  const gainageFamily = routeFamilies.find((f) => f.name === "GAINAGE");
  const molletsFamily = routeFamilies.find((f) => f.name === "MOLLETS/PIEDS");
  const hipExercises = quadFamily.exercises.filter(
    (e) => e.name.includes("Hip thrust") || e.name.includes("Pont unipodal")
  );
  const primaryB = {
    name: "FESSIERS/HANCHES",
    exercises: [...hipExercises, ...stabFamily.exercises]
  };
  const gainageB = gainageFamily.exercises.filter(
    (e) => e.name.includes("lateral") || e.name.includes("Bird-dog")
  );
  const molletsB = molletsFamily.exercises.filter(
    (e) => e.name.includes("assis") || e.name.includes("talons")
  );
  return { primary: primaryB, gainage: gainageB, mollets: molletsB };
}
function buildRenfoMainSet(params) {
  const { weekNumber, goal, subGoal, trailDistance, level, phase, weight, height, age, injuries } = params;
  const bmi = weight && height && height > 0 ? weight / (height / 100) ** 2 : 0;
  const isOverweight = bmi >= 28;
  const isSenior60 = (age || 0) >= 60;
  const injuryDesc = (injuries?.description || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const hasInjury = !!injuries?.hasInjury;
  const hasPosteriorChainInjury = hasInjury && (injuryDesc.includes("ischio") || injuryDesc.includes("hamstring") || injuryDesc.includes("posterieur") || injuryDesc.includes("cuisse arriere") || injuryDesc.includes("chaine posterieur") || injuryDesc.includes("fessier") || injuryDesc.includes("sciatique"));
  const hasKneeInjury = hasInjury && (injuryDesc.includes("genou") || injuryDesc.includes("genoux") || injuryDesc.includes("rotule") || injuryDesc.includes("rotulien") || injuryDesc.includes("menisque") || injuryDesc.includes("ligament croise") || injuryDesc.includes("knee") || injuryDesc.includes("bandelette") || injuryDesc.includes("syndrome essuie") || injuryDesc.includes("femoro") || injuryDesc.includes("patellaire") || injuryDesc.includes("condromalac"));
  const hasBackInjury = hasInjury && (injuryDesc.includes("dos") || injuryDesc.includes("lombaire") || injuryDesc.includes("lombalgie") || injuryDesc.includes("hernie") || injuryDesc.includes("sciatique") || injuryDesc.includes("back") || injuryDesc.includes("vertebr"));
  const hasAnkleInjury = hasInjury && (injuryDesc.includes("cheville") || injuryDesc.includes("achille") || injuryDesc.includes("tendon") || injuryDesc.includes("tendinite") || injuryDesc.includes("tendinopathie") || injuryDesc.includes("perioste") || injuryDesc.includes("periostite") || injuryDesc.includes("fasci") || injuryDesc.includes("aponevrose") || injuryDesc.includes("plantaire") || injuryDesc.includes("ankle") || injuryDesc.includes("shin") || injuryDesc.includes("mollet") || injuryDesc.includes("calf"));
  const hasMuscleTear = hasInjury && (injuryDesc.includes("dechirure") || injuryDesc.includes("claquage") || injuryDesc.includes("elongation") || injuryDesc.includes("contracture") || injuryDesc.includes("tear") || injuryDesc.includes("strain"));
  const hasHipInjury = hasInjury && (injuryDesc.includes("hanche") || injuryDesc.includes("hip") || injuryDesc.includes("tendineu") || injuryDesc.includes("tendinopathie"));
  const hasMusclePain = hasInjury && (injuryDesc.includes("adducteur") || injuryDesc.includes("adductor") || injuryDesc.includes("douleur") || injuryDesc.includes("pubalgie") || injuryDesc.includes("aine") || injuryDesc.includes("groin"));
  const hasJointInjury = hasKneeInjury || hasAnkleInjury || hasHipInjury || hasInjury && (injuryDesc.includes("articul") || injuryDesc.includes("statique"));
  const hasAnySpecificInjury = hasPosteriorChainInjury || hasKneeInjury || hasBackInjury || hasAnkleInjury || hasMuscleTear;
  const needsLowImpact = isOverweight || hasJointInjury || hasMuscleTear || hasMusclePain || isSenior60;
  const isOddWeek = weekNumber % 2 === 1;
  const levelFactor = getLevelFactor(level);
  const phaseFactor = getPhaseFactor(phase);
  const combinedFactor = levelFactor * phaseFactor;
  const tours = getTours(level, goal, phase);
  const rest = getRestBetweenTours(level, goal);
  const warmup = needsLowImpact ? "10 min de mobilit\xE9 articulaire douce et \xE9chauffement progressif (marche rapide, rotations, pas chass\xE9s)" : hasPosteriorChainInjury ? "10-15 min d'\xE9chauffement progressif : marche rapide, mont\xE9es de genoux douces, activation fessiers (ponts au sol), \xE9tirements dynamiques ischio-jambiers" : "10 min de mobilit\xE9 articulaire et \xE9chauffement dynamique";
  let cooldown = "5 min d'\xE9tirements : quadriceps, ischio-jambiers, mollets, hanches";
  if (hasPosteriorChainInjury) {
    cooldown = "8-10 min d'\xE9tirements cibl\xE9s : ischio-jambiers (30s\xD72/jambe), fessiers (piriforme 30s\xD72), mollets (30s\xD72), psoas (30s\xD72). Automassage rouleau cha\xEEne post\xE9rieure si disponible.";
  } else if (hasKneeInjury) {
    cooldown = "8 min d'\xE9tirements : quadriceps (30s\xD72/jambe), bandelette IT (rouleau, 30s/c\xF4t\xE9), mollets, mobilit\xE9 rotule en flexion douce.";
  } else if (hasBackInjury) {
    cooldown = "8 min d'\xE9tirements : psoas (fente basse 30s\xD72), piriforme, cat-cow (10 reps), \xE9tirement dos allong\xE9.";
  } else if (hasAnkleInjury) {
    cooldown = "8 min : mobilit\xE9 cheville (genou au mur 15\xD72), \xE9tirements mollets + sol\xE9aire, automassage vo\xFBte plantaire (balle).";
  }
  const duration = getDuration(level);
  if (goal === "Perte de poids") {
    if (needsLowImpact) {
      const LOW_IMPACT_EXERCISES = [
        { name: "Squats poids de corps (descente lente)", sets: "3x12" },
        { name: "Pont fessier au sol", sets: "3x15" },
        { name: "Step-up sur marche basse", sets: "3x10/jambe" },
        { name: "Gainage ventral", sets: "3x20-30s" },
        { name: "Gainage lat\xE9ral", sets: "2x15-20s/c\xF4t\xE9" },
        { name: "Bird-dog", sets: "3x8/c\xF4t\xE9" },
        { name: "Fentes arri\xE8re lentes", sets: "3x8/jambe" },
        { name: "Marche lat\xE9rale avec \xE9lastique", sets: "3x10 pas/c\xF4t\xE9" },
        { name: "Extensions mollets debout", sets: "3x15" },
        { name: "Dead bug", sets: "3x8/c\xF4t\xE9" }
      ];
      const focusLabel2 = isOddWeek ? "Bas du corps" : "Gainage & Stabilit\xE9";
      const title3 = `Renfo Adapt\xE9 - ${focusLabel2} (S${weekNumber})`;
      const pool2 = isOddWeek ? LOW_IMPACT_EXERCISES.filter(
        (e) => e.name.includes("Squat") || e.name.includes("Pont") || e.name.includes("Step") || e.name.includes("Fente") || e.name.includes("Mollet")
      ) : LOW_IMPACT_EXERCISES.filter(
        (e) => e.name.includes("Gainage") || e.name.includes("Bird") || e.name.includes("Dead") || e.name.includes("lat\xE9ral")
      );
      const exercises3 = pickExercises(pool2, 4, weekNumber);
      const scaledExercises3 = exercises3.map((e) => ({
        ...e,
        sets: scaleSets(e.sets, combinedFactor * 0.85)
        // volume réduit
      }));
      const exerciseList3 = scaledExercises3.map((e) => `${e.name} (${e.sets})`).join(", ");
      const mainSet3 = `Circuit ${Math.max(2, tours - 1)} tours, repos ${rest} entre exercices, 1 min 30 entre tours : ${exerciseList3}. Privil\xE9gie la technique et le contr\xF4le, pas la vitesse.`;
      return { mainSet: mainSet3, warmup, cooldown, duration: "25-30 min", title: title3 };
    }
    const focusLabel = isOddWeek ? "Bas du corps" : "Full body";
    const title2 = isOddWeek ? `Circuit M\xE9tabolique Haute Intensit\xE9 - ${focusLabel}` : `HIIT Full Body - Semaine ${weekNumber}`;
    const isBeginnerLevel = level.includes("D\xE9butant") || level.includes("Debutant");
    const needsPlioFilter = isBeginnerLevel || hasJointInjury;
    const safeMetabolic = needsPlioFilter ? METABOLIC_EXERCISES.filter((e) => !e.name.includes("saute") && !e.name.includes("saut\xE9") && !e.name.includes("Burpees")) : METABOLIC_EXERCISES;
    const pool = isOddWeek ? safeMetabolic.filter(
      (e) => e.name.includes("Squat") || e.name.includes("Fente") || e.name.includes("Montee") || e.name.includes("Mountain")
    ) : safeMetabolic;
    const exercises2 = pickExercises(pool, 5, weekNumber);
    const scaledExercises2 = exercises2.map((e) => ({
      ...e,
      sets: scaleSets(e.sets, combinedFactor)
    }));
    const routeQuads = ROUTE_EXERCISES.find((f) => f.name === "QUADRICEPS/FESSIERS");
    const bonusExercise = pickExercises(routeQuads.exercises, 1, weekNumber + 3);
    let allExercises = [...scaledExercises2, ...bonusExercise.map((e) => ({
      ...e,
      sets: scaleSets(e.sets, combinedFactor)
    }))];
    if (needsLowImpact) {
      const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const riskyPatterns = ["bulgare", "saute", "sautee", "box jump", "pliomet"];
      allExercises = allExercises.filter((e) => !riskyPatterns.some((p) => normalize(e.name).includes(p)));
    }
    const exerciseList2 = allExercises.map((e) => `${e.name} (${e.sets})`).join(", ");
    const mainSet2 = `Circuit ${tours} tours, repos ${rest} entre exercices, 1 min entre tours : ${exerciseList2}.`;
    return { mainSet: mainSet2, warmup, cooldown, duration: "30-35 min", title: title2 };
  }
  if (goal === "Maintien en forme") {
    const focusLabel = isOddWeek ? "Renfo & Stabilite" : "Mobilite & Gainage";
    const title2 = `Renfo Equilibre - ${focusLabel} (S${weekNumber})`;
    const focus2 = isOddWeek ? getFocusAFamilies(ROUTE_EXERCISES) : getFocusBFamilies(ROUTE_EXERCISES);
    const primaryPicks = pickExercises(focus2.primary.exercises, 2, weekNumber);
    const gainagePicks = pickExercises(focus2.gainage, 2, weekNumber);
    const molletsPicks = pickExercises(focus2.mollets, 1, weekNumber);
    const fitnessPicks = pickExercises(FITNESS_EXERCISES, 1, weekNumber);
    let allExercises = [...primaryPicks, ...gainagePicks, ...molletsPicks, ...fitnessPicks].map((e) => ({ ...e, sets: scaleSets(e.sets, combinedFactor) }));
    if (needsLowImpact) {
      const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      let riskyPatterns = ["bulgare", "saute", "sautee", "box jump", "pliomet"];
      if (hasMuscleTear) riskyPatterns = [...riskyPatterns, "corde", "skipping", "bondissant", "drop jump"];
      if (injuryDesc.includes("mollet") || injuryDesc.includes("calf")) riskyPatterns = [...riskyPatterns, "mollet"];
      allExercises = allExercises.filter((e) => !riskyPatterns.some((p) => normalize(e.name).includes(p)));
    }
    const exerciseList2 = allExercises.map((e) => `${e.name} (${e.sets})`).join(", ");
    const mainSet2 = `Circuit ${tours} tours : ${exerciseList2}. Repos ${rest} entre tours.`;
    return { mainSet: mainSet2, warmup, cooldown, duration, title: title2 };
  }
  const isTrail = goal === "Trail";
  const isHyrox = goal === "Hyrox";
  const isUltra = isTrail && (trailDistance || 0) >= 60;
  const isTrailLong = isTrail && (trailDistance || 0) >= 30;
  const isMarathon = goal === "Course sur route" && subGoal?.toLowerCase().includes("marathon") && !subGoal?.toLowerCase().includes("semi");
  const isSemi = goal === "Course sur route" && subGoal?.toLowerCase().includes("semi");
  const isShortRoad = goal === "Course sur route" && !isMarathon && !isSemi;
  let title;
  if (isOddWeek) {
    title = isHyrox ? `Renfo Hyrox Focus A - Quadriceps & Gainage (S${weekNumber})` : isTrail ? `Renfo Trail Focus A - Quadriceps & Excentrique (S${weekNumber})` : `Renfo Focus A - Quadriceps & Gainage (S${weekNumber})`;
  } else {
    title = isHyrox ? `Renfo Hyrox Focus B - Fessiers/Hanches & Gainage lateral (S${weekNumber})` : isTrail ? `Renfo Trail Focus B - Hanches & Proprioception (S${weekNumber})` : `Renfo Focus B - Fessiers/Hanches & Gainage lateral (S${weekNumber})`;
  }
  if (phase === "affutage") {
    title = isHyrox ? `Renfo Hyrox Maintien Leger - Affutage (S${weekNumber})` : `Renfo Maintien Leger - Affutage (S${weekNumber})`;
  } else if (phase === "recuperation") {
    title = isHyrox ? `Renfo Hyrox Leger - Recuperation (S${weekNumber})` : `Renfo Leger - Recuperation (S${weekNumber})`;
  }
  if (hasPosteriorChainInjury) {
    title = title.replace("Quadriceps & Gainage", "Quadriceps & Pr\xE9vention Ischio");
    title = title.replace("Quadriceps & Excentrique", "Excentrique & Pr\xE9vention Ischio");
    title = title.replace("Fessiers/Hanches", "Fessiers/Ischio & Pr\xE9vention");
    title = title.replace("Hanches & Proprioception", "Hanches & Pr\xE9vention Ischio");
  } else if (hasKneeInjury) {
    title = title.replace("Quadriceps & Gainage", "Quadriceps & Pr\xE9vention Genou");
    title = title.replace("Quadriceps & Excentrique", "Excentrique & Pr\xE9vention Genou");
  }
  const exercises = [];
  const focus = isOddWeek ? getFocusAFamilies(ROUTE_EXERCISES) : getFocusBFamilies(ROUTE_EXERCISES);
  const primaryCount = phase === "affutage" || phase === "recuperation" ? 2 : 3;
  exercises.push(...pickExercises(focus.primary.exercises, primaryCount, weekNumber));
  const gainageCount = 2;
  exercises.push(...pickExercises(focus.gainage, gainageCount, weekNumber));
  exercises.push(...pickExercises(focus.mollets, 1, weekNumber));
  if (isTrail) {
    if (isOddWeek) {
      const excentricFamily = TRAIL_EXERCISES.find((f) => f.name === "EXCENTRIQUE QUADRICEPS");
      exercises.push(...pickExercises(excentricFamily.exercises, 2, weekNumber));
      if (!needsLowImpact && (level.includes("Confirme") || level.includes("Confirm\xE9") || level.includes("Expert"))) {
        const plioFamily = TRAIL_EXERCISES.find((f) => f.name === "PLIOMETRIE TRAIL");
        exercises.push(...pickExercises(plioFamily.exercises, 1, weekNumber));
      }
    } else {
      const proprioFamily = TRAIL_EXERCISES.find((f) => f.name === "PROPRIOCEPTION");
      const proprioExercises = needsLowImpact ? proprioFamily.exercises.filter((e) => !e.name.includes("Saut") && !e.name.includes("Corde")) : proprioFamily.exercises;
      exercises.push(...pickExercises(proprioExercises, 2, weekNumber));
      const gainageRotFamily = TRAIL_EXERCISES.find((f) => f.name === "GAINAGE ROTATION");
      exercises.push(...pickExercises(gainageRotFamily.exercises, 1, weekNumber));
    }
    const molletsTrailFamily = TRAIL_EXERCISES.find((f) => f.name === "MOLLETS MONTEE");
    exercises.push(...pickExercises(molletsTrailFamily.exercises, 1, weekNumber));
  }
  if (isUltra) {
    exercises.push(...pickExercises(ULTRA_EXERCISES, isTrail && (trailDistance || 0) >= 100 ? 3 : 2, weekNumber));
  }
  if (isMarathon) {
    exercises.push({ name: "Gainage ventral long", sets: "2x90-120s" });
  }
  if (isShortRoad && !needsLowImpact && (level.includes("Confirme") || level.includes("Confirm\xE9") || level.includes("Expert"))) {
    const explosiveExtras = [
      { name: "Squats saut\xE9s", sets: "3x10" },
      { name: "Fentes saut\xE9es altern\xE9es", sets: "3x8/jambe" },
      { name: "Skipping haut", sets: "3x15" }
    ];
    exercises.push(...pickExercises(explosiveExtras, 1, weekNumber));
  }
  if (needsLowImpact) {
    let riskyPatterns = ["bulgare", "saute", "sautee", "box jump", "pliomet"];
    if (hasMuscleTear) {
      riskyPatterns = [...riskyPatterns, "corde", "skipping", "bondissant", "drop jump"];
    }
    if (injuryDesc.includes("mollet") || injuryDesc.includes("calf")) {
      riskyPatterns = [...riskyPatterns, "mollet"];
    }
    const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const safeExercises = exercises.filter(
      (e) => !riskyPatterns.some((p) => normalize(e.name).includes(p))
    );
    exercises.length = 0;
    exercises.push(...safeExercises);
  }
  if (hasPosteriorChainInjury) {
    const prevention = pickExercises(POSTERIOR_CHAIN_PREVENTION, 2, weekNumber);
    const filtered = exercises.filter(
      (e) => !e.name.toLowerCase().includes("fentes marchees") && !e.name.toLowerCase().includes("fentes saut\xE9es")
    );
    exercises.length = 0;
    exercises.push(...filtered, ...prevention);
  } else if (hasKneeInjury) {
    const prevention = pickExercises(KNEE_PREVENTION, 2, weekNumber);
    exercises.push(...prevention);
  } else if (hasBackInjury) {
    const prevention = pickExercises(BACK_PREVENTION, 2, weekNumber);
    const filtered = exercises.filter(
      (e) => !e.name.toLowerCase().includes("squat saut\xE9") && !e.name.toLowerCase().includes("box jump")
    );
    exercises.length = 0;
    exercises.push(...filtered, ...prevention);
  } else if (hasAnkleInjury) {
    const prevention = pickExercises(ANKLE_PREVENTION, 2, weekNumber);
    exercises.push(...prevention);
  }
  const scaledExercises = exercises.map((e) => ({
    ...e,
    sets: scaleSets(e.sets, combinedFactor)
  }));
  const exerciseList = scaledExercises.map((e) => `${e.name} (${e.sets})`).join(", ");
  const preventionNote = hasAnySpecificInjury ? ` \u26A0\uFE0F Exercices de pr\xE9vention inclus pour ta blessure \u2014 si douleur, arr\xEAte imm\xE9diatement.` : "";
  const mainSet = `Circuit ${tours} tours : ${exerciseList}. Repos ${rest} entre tours.${preventionNote}`;
  let finalDuration = duration;
  if (isUltra) {
    finalDuration = "45-50 min";
  } else if (isTrailLong) {
    finalDuration = "40-45 min";
  } else if (isMarathon) {
    finalDuration = "35-45 min";
  }
  if (phase === "affutage" || phase === "recuperation") {
    finalDuration = "25-30 min";
  }
  return { mainSet, warmup, cooldown, duration: finalDuration, title };
}
var ROUTE_EXERCISES, TRAIL_EXERCISES, ULTRA_EXERCISES, POSTERIOR_CHAIN_PREVENTION, KNEE_PREVENTION, BACK_PREVENTION, ANKLE_PREVENTION, METABOLIC_EXERCISES, FITNESS_EXERCISES;
var init_renfoService = __esm({
  "src/services/renfoService.ts"() {
    ROUTE_EXERCISES = [
      {
        name: "QUADRICEPS/FESSIERS",
        exercises: [
          { name: "Squats poids de corps", sets: "3x15" },
          { name: "Squat bulgare", sets: "3x10/jambe" },
          { name: "Fentes avant", sets: "3x10/jambe" },
          { name: "Fentes marchees", sets: "3x12/jambe" },
          { name: "Step-up sur marche", sets: "3x10/jambe" },
          { name: "Hip thrust", sets: "3x15" },
          { name: "Pont unipodal", sets: "3x10/jambe" },
          { name: "Chaise murale", sets: "3x30-45s" }
        ]
      },
      {
        name: "STABILITE HANCHE",
        exercises: [
          { name: "Clamshell avec elastique", sets: "3x15/cote" },
          { name: "Marche laterale avec elastique", sets: "3x10 pas/cote" },
          { name: "Fente laterale", sets: "3x10/jambe" },
          { name: "Equilibre unipodal", sets: "2x30s/pied" }
        ]
      },
      {
        name: "MOLLETS/PIEDS",
        exercises: [
          { name: "Extensions mollets debout", sets: "3x20" },
          { name: "Mobilit\xE9 cheville", sets: "2x15/pied" },
          { name: "Marche sur talons", sets: "2x20m" },
          { name: "\xC9criture alphabet avec le pied", sets: "1x/pied" }
        ]
      },
      {
        name: "GAINAGE",
        exercises: [
          { name: "Gainage ventral", sets: "3x30-60s" },
          { name: "Gainage lateral", sets: "3x20-30s/cote" },
          { name: "Dead bug", sets: "3x10/cote" },
          { name: "Bird-dog", sets: "3x10/cote" },
          { name: "Superman", sets: "3x12" },
          { name: "Pompes", sets: "3x10" }
        ]
      }
    ];
    TRAIL_EXERCISES = [
      {
        name: "EXCENTRIQUE QUADRICEPS",
        exercises: [
          { name: "Squat excentrique (descente 4s)", sets: "3x10" },
          { name: "Step-down excentrique", sets: "3x8/jambe" },
          { name: "Fente arriere lente (3s)", sets: "3x10/jambe" },
          { name: "Chaise murale longue", sets: "3x45-90s" }
        ]
      },
      {
        name: "PROPRIOCEPTION",
        exercises: [
          { name: "Equilibre unipodal yeux fermes", sets: "3x20-30s/pied" },
          { name: "Equilibre sur coussin instable", sets: "3x30s/pied" },
          { name: "Sauts directionnels", sets: "3x8" },
          { name: "Corde a sauter", sets: "3x1min" }
        ]
      },
      {
        name: "MOLLETS MONTEE",
        exercises: [
          { name: "Mollets debout unipodal", sets: "3x12/jambe" },
          { name: "Mollets assis soleaire", sets: "3x15" },
          { name: "Protocole Stanish excentrique", sets: "3x10" }
        ]
      },
      {
        name: "GAINAGE ROTATION",
        exercises: [
          { name: "Planche + rotation laterale", sets: "3x10/cote" },
          { name: "Russian twist", sets: "3x15/cote" },
          { name: "Bird-dog avec rotation", sets: "3x10/cote" }
        ]
      },
      {
        name: "PLIOMETRIE TRAIL",
        exercises: [
          { name: "Sauts directionnels multi-axes", sets: "3x8" },
          { name: "Corde a sauter variee", sets: "3x1min" },
          { name: "Box jumps ou sauts sur banc", sets: "3x8" },
          { name: "Nordic hamstring curl", sets: "3x6" }
        ]
      }
    ];
    ULTRA_EXERCISES = [
      { name: "Pompes", sets: "3x15" },
      { name: "Dips sur banc", sets: "3x12" },
      { name: "Tirage elastique horizontal", sets: "3x15" },
      { name: "Extension triceps avec elastique", sets: "3x12" },
      { name: "Gainage avec sac leste", sets: "3x45s" },
      { name: "Dead bug haute repetition", sets: "3x20" },
      { name: "Chaise murale prolongee", sets: "3x90-120s" }
    ];
    POSTERIOR_CHAIN_PREVENTION = [
      { name: "Nordic hamstring curl (ou variante assise)", sets: "3x6" },
      { name: "Pont fessier unipodal (tenu 3s en haut)", sets: "3x10/jambe" },
      { name: "Deadlift roumain unipodal poids de corps", sets: "3x8/jambe" },
      { name: "\xC9tirement bandelette IT", sets: "2x30s/c\xF4t\xE9" },
      { name: "Good morning poids de corps", sets: "3x12" },
      { name: "Glissade talon au sol (hamstring slide)", sets: "3x8/jambe" }
    ];
    KNEE_PREVENTION = [
      { name: "Quart de squat isom\xE9trique (mur)", sets: "3x30s" },
      { name: "Step-down excentrique lent", sets: "3x8/jambe" },
      { name: "Pont fessier (activation VMO)", sets: "3x15" },
      { name: "Clamshell avec \xE9lastique", sets: "3x15/c\xF4t\xE9" },
      { name: "Marche lat\xE9rale \xE9lastique", sets: "3x10 pas/c\xF4t\xE9" },
      { name: "\xC9tirement bandelette IT (rouleau)", sets: "2x30s/c\xF4t\xE9" }
    ];
    BACK_PREVENTION = [
      { name: "Chat-vache (mobilit\xE9 dos)", sets: "2x10" },
      { name: "Bird-dog (contr\xF4le lombaire)", sets: "3x10/c\xF4t\xE9" },
      { name: "Pont fessier (d\xE9charge lombaire)", sets: "3x15" },
      { name: "Dead bug (gainage profond)", sets: "3x10/c\xF4t\xE9" },
      { name: "\xC9tirement psoas (fente basse)", sets: "2x30s/c\xF4t\xE9" },
      { name: "Superman partiel (bras seuls)", sets: "3x10" }
    ];
    ANKLE_PREVENTION = [
      { name: "Mobilit\xE9 cheville (genou au mur)", sets: "2x15/pied" },
      { name: "\xC9quilibre unipodal yeux ferm\xE9s", sets: "3x20s/pied" },
      { name: "Extensions mollets debout", sets: "3x15" },
      { name: "\xC9criture alphabet avec le pied", sets: "1x/pied" },
      { name: "Marche sur pointes + talons", sets: "2x20m chaque" }
    ];
    METABOLIC_EXERCISES = [
      { name: "Burpees adaptes", sets: "3x10" },
      { name: "Jumping jacks", sets: "3x30s" },
      { name: "Montees de genoux", sets: "3x20" },
      { name: "Mountain climbers", sets: "3x20" },
      { name: "Squats sautes", sets: "3x12" },
      { name: "Fentes sautees alternees", sets: "3x10/jambe" },
      { name: "Pompes", sets: "3x10" },
      { name: "Gainage dynamique avec rotation", sets: "3x10/cote" },
      { name: "Planche + tirage", sets: "3x10/cote" }
    ];
    FITNESS_EXERCISES = [
      { name: "Etirements dynamiques", sets: "2x8/cote" },
      { name: "Mobilite hanche (cercles)", sets: "2x10/cote" },
      { name: "Chat-vache (mobilite dos)", sets: "2x10" },
      { name: "Fente + rotation tronc", sets: "2x8/cote" }
    ];
  }
});

// src/services/planValidator.ts
var planValidator_exports = {};
__export(planValidator_exports, {
  aiReviewPlan: () => aiReviewPlan,
  generateCorrectedWeeks: () => generateCorrectedWeeks,
  validateAndCorrectPlan: () => validateAndCorrectPlan,
  validatePlanRules: () => validatePlanRules
});
function fixHillySessionsElevation(plan) {
  for (const week of plan.weeks || []) {
    for (const s of week.sessions || []) {
      if (!s || !HILL_TITLE_RE2.test(s.title || "")) continue;
      const elev = typeof s.elevationGain === "number" ? s.elevationGain : 0;
      if (elev > 0) continue;
      const km = parseFloat(String(s.distance || "0").replace(",", ".").replace(/[^0-9.]/g, ""));
      if (!isNaN(km) && km > 0) {
        s.elevationGain = Math.round(km * 15);
      }
    }
  }
}
var GEMINI_API_KEY, genAI, getWeekVolume, isConsecutiveDay, validatePlanRules, aiReviewPlan, generateCorrectedWeeks, HILL_TITLE_RE2, validateAndCorrectPlan;
var init_planValidator = __esm({
  "src/services/planValidator.ts"() {
    init_stub_generative_ai();
    init_renfoService();
    init_planUtils();
    GEMINI_API_KEY = globalThis.__IMPORT_META_ENV__.VITE_GEMINI_API_KEY || "";
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    getWeekVolume = (week) => {
      let total = 0;
      for (const s of week.sessions) {
        total += parseKm(s.distance);
      }
      return total;
    };
    isConsecutiveDay = (day1, day2) => {
      const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
      const i1 = DAYS.indexOf(day1);
      const i2 = DAYS.indexOf(day2);
      if (i1 < 0 || i2 < 0) return false;
      return Math.abs(i1 - i2) === 1 || i1 === 0 && i2 === 6 || i1 === 6 && i2 === 0;
    };
    validatePlanRules = (plan, questionnaire) => {
      const issues = [];
      const weeks = plan.weeks;
      const level = questionnaire?.level || "";
      const isBeginnerLevel = level.includes("D\xE9butant");
      const isConfirmed = level.includes("Confirm\xE9");
      const isExpertLevel = level.includes("Expert");
      const isExpert = isExpertLevel || isConfirmed;
      for (let i = 1; i < weeks.length; i++) {
        const prev = weeks[i - 1];
        const curr = weeks[i];
        const prevVol = getWeekVolume(prev);
        const currVol = getWeekVolume(curr);
        if (prevVol > 0 && currVol > 0 && !curr.isRecoveryWeek && !prev.isRecoveryWeek) {
          const increase = (currVol - prevVol) / prevVol * 100;
          const absoluteIncrease = currVol - prevVol;
          let errorPct;
          let warningPct;
          if (isBeginnerLevel) {
            if (prevVol < 20) {
              errorPct = 15;
              warningPct = 8;
            } else {
              errorPct = 12;
              warningPct = 7;
            }
          } else if (prevVol < 20) {
            errorPct = 25;
            warningPct = 15;
          } else if (prevVol < 40) {
            errorPct = 20;
            warningPct = 12;
          } else {
            errorPct = 15;
            warningPct = 10;
          }
          const absoluteMaxIncrease = isBeginnerLevel ? 3 : isExpertLevel ? 8 : isConfirmed ? 7 : 5;
          const isAbsoluteSpike = absoluteIncrease > absoluteMaxIncrease;
          if ((increase > errorPct || isAbsoluteSpike) && absoluteIncrease > 3) {
            issues.push({
              weekNumber: curr.weekNumber,
              severity: "error",
              rule: "volume_spike",
              message: `Volume +${increase.toFixed(0)}% (${prevVol.toFixed(0)}\u2192${currVol.toFixed(0)}km, +${absoluteIncrease.toFixed(0)}km).`
            });
          } else if (increase > warningPct && absoluteIncrease > 3) {
            issues.push({
              weekNumber: curr.weekNumber,
              severity: "warning",
              rule: "volume_spike",
              message: `Volume +${increase.toFixed(0)}% (${prevVol.toFixed(0)}\u2192${currVol.toFixed(0)}km) \u2014 \xE0 surveiller.`
            });
          }
        }
      }
      for (const week of weeks) {
        const hardSessions = week.sessions.filter(
          (s) => s.intensity === "Difficile" || s.type === "Fractionn\xE9"
        );
        for (let i = 0; i < hardSessions.length; i++) {
          for (let j = i + 1; j < hardSessions.length; j++) {
            if (isConsecutiveDay(hardSessions[i].day, hardSessions[j].day)) {
              issues.push({
                weekNumber: week.weekNumber,
                severity: "error",
                rule: "consecutive_hard",
                message: `2 s\xE9ances intenses cons\xE9cutives (${hardSessions[i].day} + ${hardSessions[j].day}) : risque de blessure.`
              });
            }
          }
        }
      }
      for (const week of weeks) {
        const longSessions = week.sessions.filter(
          (s) => s.type === "Sortie Longue" || s.duration && parseDurationMin(s.duration) >= 90
        );
        for (let i = 0; i < longSessions.length; i++) {
          for (let j = i + 1; j < longSessions.length; j++) {
            if (isConsecutiveDay(longSessions[i].day, longSessions[j].day)) {
              issues.push({
                weekNumber: week.weekNumber,
                severity: "error",
                rule: "consecutive_long",
                message: `2 s\xE9ances longues cons\xE9cutives (${longSessions[i].day} "${longSessions[i].title}" + ${longSessions[j].day} "${longSessions[j].title}") : risque de blessure et surcharge.`
              });
            }
          }
        }
      }
      const goalStr = questionnaire?.goal || "";
      const isTrail = goalStr.includes("Trail");
      const trailDist = questionnaire?.trailDetails?.distance || 0;
      const freq = questionnaire?.frequency || 3;
      const longRunMaxRatio = isTrail && trailDist >= 42 ? 0.55 : freq <= 3 ? 0.5 : 0.4;
      for (const week of weeks) {
        const weekVol = getWeekVolume(week);
        if (weekVol <= 0) continue;
        const longRun = week.sessions.find((s) => s.type === "Sortie Longue");
        if (longRun) {
          const longRunDist = parseKm(longRun.distance);
          if (longRunDist > 0 && longRunDist / weekVol > longRunMaxRatio) {
            issues.push({
              weekNumber: week.weekNumber,
              severity: "warning",
              rule: "long_run_ratio",
              message: `Sortie longue = ${(longRunDist / weekVol * 100).toFixed(0)}% du volume (${longRunDist}/${weekVol.toFixed(0)}km). Max adapt\xE9 : ${(longRunMaxRatio * 100).toFixed(0)}%.`
            });
          }
        }
      }
      if (isBeginnerLevel) {
        for (const week of weeks) {
          if (week.weekNumber <= 5) {
            const hasFrac = week.sessions.some(
              (s) => s.type === "Fractionn\xE9"
            );
            if (hasFrac) {
              issues.push({
                weekNumber: week.weekNumber,
                severity: "error",
                rule: "beginner_too_intense",
                message: `Fractionn\xE9 en semaine ${week.weekNumber} pour un d\xE9butant \u2014 trop t\xF4t (recommand\xE9 : semaine 6+).`
              });
            }
          }
          if (week.weekNumber >= 6 && week.weekNumber <= 7) {
            const hasHardVMA = week.sessions.some(
              (s) => s.type === "Fractionn\xE9" && s.intensity === "Difficile" && (s.mainSet?.toLowerCase().includes("vma") || s.mainSet?.toLowerCase().includes("30/30") || s.mainSet?.toLowerCase().includes("200m") || s.mainSet?.toLowerCase().includes("400m"))
            );
            if (hasHardVMA) {
              issues.push({
                weekNumber: week.weekNumber,
                severity: "error",
                rule: "beginner_too_intense",
                message: `VMA intense en semaine ${week.weekNumber} pour un d\xE9butant \u2014 trop t\xF4t (fartlek doux uniquement S6-7, VMA \xE0 partir de S8).`
              });
            }
          }
        }
        for (const week of weeks) {
          if (week.weekNumber <= 4) {
            const marcheCourseCount = week.sessions.filter(
              (s) => s.type === "Marche/Course"
            ).length;
            if (marcheCourseCount === 0) {
              issues.push({
                weekNumber: week.weekNumber,
                severity: "error",
                rule: "beginner_missing_walk_run",
                message: `Pas de s\xE9ance Marche/Course en semaine ${week.weekNumber} pour un d\xE9butant \u2014 obligatoire les 4 premi\xE8res semaines.`
              });
            }
          }
        }
        for (const week of weeks) {
          if (week.weekNumber <= 4) {
            for (const session of week.sessions) {
              if (session.type === "Renforcement") continue;
              const durationStr = session.duration || "";
              const durationMatch = durationStr.match(/(\d+)\s*min/);
              if (durationMatch) {
                const minutes = parseInt(durationMatch[1], 10);
                if (minutes > 45) {
                  issues.push({
                    weekNumber: week.weekNumber,
                    severity: "warning",
                    rule: "beginner_session_too_long",
                    message: `S\xE9ance "${session.title}" = ${minutes}min en S${week.weekNumber} pour un d\xE9butant (max 45min les 4 premi\xE8res semaines).`
                  });
                }
              }
            }
          }
        }
      }
      if (weeks.length >= 6) {
        let lastRecovery = 0;
        for (const week of weeks) {
          if (week.isRecoveryWeek) {
            if (lastRecovery > 0 && week.weekNumber - lastRecovery > 5) {
              issues.push({
                weekNumber: week.weekNumber,
                severity: "warning",
                rule: "missing_recovery",
                message: `${week.weekNumber - lastRecovery} semaines sans r\xE9cup\xE9ration (recommand\xE9 : toutes les 3-4 semaines).`
              });
            }
            lastRecovery = week.weekNumber;
          }
        }
        if (lastRecovery === 0 && weeks.length >= 6) {
          issues.push({
            weekNumber: weeks[3]?.weekNumber || 4,
            severity: "warning",
            rule: "missing_recovery",
            message: `Aucune semaine de r\xE9cup\xE9ration dans ${weeks.length} semaines \u2014 risque de surentra\xEEnement.`
          });
        }
      }
      const targetFreq = questionnaire?.frequency;
      if (targetFreq) {
        for (const week of weeks) {
          if (week.sessions.length !== targetFreq && !week.isRecoveryWeek) {
            issues.push({
              weekNumber: week.weekNumber,
              severity: "warning",
              rule: "session_count",
              message: `${week.sessions.length} s\xE9ances au lieu de ${targetFreq} demand\xE9es.`
            });
          }
        }
      }
      for (const week of weeks) {
        const hasRenfo = week.sessions.some((s) => s.type === "Renforcement");
        if (!hasRenfo) {
          issues.push({
            weekNumber: week.weekNumber,
            severity: "warning",
            rule: "missing_renfo",
            message: `Pas de s\xE9ance de renforcement en semaine ${week.weekNumber}.`
          });
        }
      }
      const subGoal = questionnaire?.subGoal || "";
      const isMarathon = subGoal.toLowerCase().includes("marathon") && !subGoal.toLowerCase().includes("semi");
      const isSemi = subGoal.toLowerCase().includes("semi");
      const isUltra = isTrail && trailDist >= 60;
      const is10k = subGoal.includes("10");
      const isPertePoids = goalStr.includes("Perte");
      const isMaintien = goalStr.includes("Maintien") || goalStr.includes("Remise");
      const getMaxWeeklyKm = () => {
        if (isPertePoids) return isBeginnerLevel ? 22 : isExpertLevel ? 50 : isConfirmed ? 39 : 33;
        if (isMaintien) return isBeginnerLevel ? 28 : isExpertLevel ? 61 : isConfirmed ? 50 : 44;
        if (isBeginnerLevel) {
          if (isUltra) return 50;
          if (isMarathon) return 50;
          if (isTrail && trailDist >= 30) return 50;
          if (isTrail) return 39;
          if (isSemi) return 39;
          if (is10k) return 33;
          return 28;
        }
        if (isExpertLevel) {
          if (isUltra) return 110;
          if (isMarathon) return 94;
          if (isTrail && trailDist >= 30) return 88;
          if (isTrail) return 72;
          if (isSemi) return 77;
          if (is10k) return 72;
          return 66;
        }
        if (isConfirmed) {
          if (isUltra) return 77;
          if (isMarathon) return 83;
          if (isTrail && trailDist >= 30) return 77;
          if (isTrail) return 61;
          if (isSemi) return 66;
          if (is10k) return 61;
          return 51;
        }
        if (isUltra) return 61;
        if (isMarathon) return 72;
        if (isTrail && trailDist >= 30) return 66;
        if (isTrail) return 55;
        if (isSemi) return 61;
        if (is10k) return 55;
        return 44;
      };
      const getMaxSessionKm = () => {
        if (isPertePoids) return isBeginnerLevel ? 9 : isExpertLevel ? 17 : isConfirmed ? 15 : 13;
        if (isMaintien) return isBeginnerLevel ? 11 : isExpertLevel ? 20 : isConfirmed ? 19 : 17;
        if (isBeginnerLevel) return isUltra ? 33 : isMarathon ? 28 : isTrail && trailDist >= 30 ? 28 : isTrail ? 20 : isSemi ? 20 : is10k ? 17 : 13;
        if (isExpertLevel) return isUltra ? 61 : isMarathon ? 42 : isTrail && trailDist >= 30 ? 50 : isTrail ? 33 : isSemi ? 31 : is10k ? 31 : 28;
        if (isConfirmed) return isUltra ? 55 : isMarathon ? 39 : isTrail && trailDist >= 30 ? 39 : isTrail ? 28 : isSemi ? 28 : is10k ? 28 : 24;
        return isUltra ? 44 : isMarathon ? 35 : isTrail && trailDist >= 30 ? 35 : isTrail ? 24 : isSemi ? 24 : is10k ? 24 : 20;
      };
      const maxWeeklyKm = getMaxWeeklyKm();
      const maxSessionKm = getMaxSessionKm();
      if (weeks.length > 0) {
        const avgVolume = weeks.reduce((sum, w) => sum + getWeekVolume(w), 0) / weeks.length;
        for (const week of weeks) {
          const weekVol = getWeekVolume(week);
          if (weekVol > maxWeeklyKm && !week.isRecoveryWeek) {
            issues.push({
              weekNumber: week.weekNumber,
              severity: "error",
              rule: "volume_exceeds_cap",
              message: `Volume ${weekVol.toFixed(0)}km d\xE9passe le max adapt\xE9 (${maxWeeklyKm}km/sem pour ${level} / ${goalStr}).`
            });
          }
        }
        for (const week of weeks) {
          for (const session of week.sessions) {
            const dist = parseKm(session.distance);
            if (dist > maxSessionKm) {
              issues.push({
                weekNumber: week.weekNumber,
                severity: "error",
                rule: "session_exceeds_cap",
                message: `S\xE9ance "${session.title}" = ${dist}km, d\xE9passe le max adapt\xE9 (${maxSessionKm}km pour ${level}).`
              });
            }
          }
        }
        if (isBeginnerLevel) {
          const beginnerMaxAvg = isMarathon ? 40 : isTrail ? 35 : isPertePoids ? 20 : 30;
          if (avgVolume > beginnerMaxAvg) {
            issues.push({
              weekNumber: 1,
              severity: "warning",
              rule: "volume_too_high",
              message: `Volume moyen ${avgVolume.toFixed(0)}km/sem pour un d\xE9butant (max adapt\xE9 : ~${beginnerMaxAvg}km).`
            });
          }
        }
        if (isExpert && avgVolume < 20 && avgVolume > 0 && !isPertePoids && !isMaintien) {
          issues.push({
            weekNumber: 1,
            severity: "warning",
            rule: "volume_too_low",
            message: `Volume moyen ${avgVolume.toFixed(0)}km/sem pour un coureur confirm\xE9 \u2014 potentiellement insuffisant.`
          });
        }
      }
      for (const week of weeks) {
        const hardCount = week.sessions.filter(
          (s) => s.intensity === "Difficile" || s.type === "Fractionn\xE9"
        ).length;
        if (hardCount > 2) {
          issues.push({
            weekNumber: week.weekNumber,
            severity: "error",
            rule: "too_many_hard_sessions",
            message: `${hardCount} s\xE9ances intenses dans la semaine (max recommand\xE9 : 2).`
          });
        }
      }
      for (const week of weeks) {
        if (week.isRecoveryWeek) {
          const prevWeek = weeks.find((w) => w.weekNumber === week.weekNumber - 1);
          if (prevWeek) {
            const prevVol = getWeekVolume(prevWeek);
            const currVol = getWeekVolume(week);
            if (prevVol > 0 && currVol > 0) {
              const reduction = (prevVol - currVol) / prevVol * 100;
              const minReduction = prevVol >= 60 ? 20 : prevVol >= 40 ? 22 : 25;
              if (reduction < minReduction) {
                issues.push({
                  weekNumber: week.weekNumber,
                  severity: "warning",
                  rule: "recovery_not_enough",
                  message: `Semaine de r\xE9cup : -${reduction.toFixed(0)}% seulement (min recommand\xE9 : -${minReduction}%).`
                });
              }
              if (reduction > 50) {
                issues.push({
                  weekNumber: week.weekNumber,
                  severity: "warning",
                  rule: "recovery_too_much",
                  message: `Semaine de r\xE9cup : -${reduction.toFixed(0)}% \u2014 r\xE9duction excessive, risque de perte d'adaptation.`
                });
              }
            }
          }
        }
      }
      if (questionnaire?.currentWeeklyVolume && weeks.length > 0) {
        const declaredVolume = questionnaire.currentWeeklyVolume;
        const week1Volume = getWeekVolume(weeks[0]);
        if (week1Volume > 0 && declaredVolume > 0) {
          const increase = (week1Volume - declaredVolume) / declaredVolume * 100;
          let errorThreshold;
          let warningThreshold;
          if (declaredVolume < 15) {
            errorThreshold = 60;
            warningThreshold = 40;
          } else if (declaredVolume < 30) {
            errorThreshold = 30;
            warningThreshold = 20;
          } else {
            errorThreshold = 20;
            warningThreshold = 12;
          }
          if (increase > errorThreshold) {
            issues.push({
              weekNumber: 1,
              severity: "error",
              rule: "week1_volume_too_high",
              message: `Volume semaine 1 (${week1Volume.toFixed(0)}km) trop \xE9lev\xE9 vs volume actuel (${declaredVolume}km) : +${increase.toFixed(0)}%.`
            });
          } else if (increase > warningThreshold) {
            issues.push({
              weekNumber: 1,
              severity: "warning",
              rule: "week1_volume_too_high",
              message: `Volume semaine 1 (${week1Volume.toFixed(0)}km) en hausse de ${increase.toFixed(0)}% vs volume actuel (${declaredVolume}km) \u2014 \xE0 surveiller.`
            });
          }
        }
      }
      if (isTrail && trailDist > 0) {
        const trailElevation = questionnaire?.trailDetails?.elevation || 0;
        for (const week of weeks) {
          const trailSessions = week.sessions.filter(
            (s) => s.type !== "Renforcement" && s.type !== "R\xE9cup\xE9ration"
          );
          const sessionsWithElevation = trailSessions.filter(
            (s) => s.elevationGain !== void 0 && s.elevationGain > 0
          );
          if (trailSessions.length > 0 && sessionsWithElevation.length === 0) {
            issues.push({
              weekNumber: week.weekNumber,
              severity: "warning",
              rule: "trail_missing_elevation",
              message: `Aucune s\xE9ance avec D+ en semaine ${week.weekNumber} pour un plan trail.`
            });
          }
        }
        if (trailElevation > 0 && weeks.length >= 4) {
          const getWeekElevation = (w) => w.sessions.reduce((sum, s) => sum + (s.elevationGain || 0), 0);
          const firstThirdEnd = Math.ceil(weeks.length / 3);
          const lastThirdStart = weeks.length - Math.ceil(weeks.length / 3);
          const earlyWeeks = weeks.slice(0, firstThirdEnd);
          const lateWeeks = weeks.slice(lastThirdStart).filter((w) => !w.isRecoveryWeek);
          if (earlyWeeks.length > 0 && lateWeeks.length > 0) {
            const avgEarlyElev = earlyWeeks.reduce((s, w) => s + getWeekElevation(w), 0) / earlyWeeks.length;
            const avgLateElev = lateWeeks.reduce((s, w) => s + getWeekElevation(w), 0) / lateWeeks.length;
            if (avgLateElev > 0 && avgLateElev < avgEarlyElev * 1.1) {
              issues.push({
                weekNumber: lateWeeks[0].weekNumber,
                severity: "warning",
                rule: "trail_elevation_no_progression",
                message: `D+ ne progresse pas : d\xE9but ${Math.round(avgEarlyElev)}m/sem \u2192 fin ${Math.round(avgLateElev)}m/sem.`
              });
            }
          }
          const peakWeekElev = Math.max(...weeks.filter((w) => !w.isRecoveryWeek).map((w) => getWeekElevation(w)));
          if (peakWeekElev > 0 && peakWeekElev < trailElevation * 0.5) {
            issues.push({
              weekNumber: weeks[Math.floor(weeks.length * 0.7)]?.weekNumber || 1,
              severity: "warning",
              rule: "trail_elevation_too_low",
              message: `D+ max hebdo (${Math.round(peakWeekElev)}m) tr\xE8s en dessous du D+ course (${trailElevation}m). Viser au moins 50-70%.`
            });
          }
        }
        if (trailDist >= 70 && weeks.length >= 6) {
          const specificWeeks = weeks.filter((w) => w.phase === "specifique" || w.phase === "sp\xE9cifique");
          const hasBackToBack = specificWeeks.some((w) => {
            const longSessions = w.sessions.filter(
              (s) => s.type === "Sortie Longue" || parseKm(s.distance) >= 20
            );
            if (longSessions.length < 2) return false;
            for (let i = 0; i < longSessions.length; i++) {
              for (let j = i + 1; j < longSessions.length; j++) {
                if (isConsecutiveDay(longSessions[i].day, longSessions[j].day)) return true;
              }
            }
            return false;
          });
          if (!hasBackToBack) {
            issues.push({
              weekNumber: specificWeeks[0]?.weekNumber || Math.floor(weeks.length * 0.6),
              severity: "warning",
              rule: "ultra_missing_back_to_back",
              message: `Trail ${trailDist}km : pas de back-to-back long en phase sp\xE9cifique (recommand\xE9 pour ultra).`
            });
          }
        }
      }
      if (isExpert && weeks.length >= 4) {
        let hasIntenseWork = false;
        for (const week of weeks.slice(0, 4)) {
          if (week.sessions.some((s) => s.intensity === "Difficile" || s.type === "Fractionn\xE9")) {
            hasIntenseWork = true;
            break;
          }
        }
        if (!hasIntenseWork) {
          issues.push({
            weekNumber: 1,
            severity: "warning",
            rule: "not_challenging_enough",
            message: `Aucune s\xE9ance intense dans les 4 premi\xE8res semaines pour un coureur confirm\xE9/expert.`
          });
        }
      }
      const planVMA = plan.vma || plan.calculatedVMA;
      if (planVMA && planVMA > 22) {
        issues.push({
          weekNumber: 0,
          severity: "error",
          rule: "vma_absurd",
          message: `VMA ${planVMA.toFixed(1)} km/h est aberrante (> 22 km/h). Bug probable dans le parsing du temps de course.`
        });
      }
      for (const week of weeks) {
        const wn = week.weekNumber || 1;
        for (const s of week.sessions) {
          if (s.type === "Renforcement" || s.type === "Repos") continue;
          const dur = parseDurationMin(s.duration);
          const dplus = s.elevationGain || 0;
          if (dplus > 400 && dur < 60) {
            issues.push({
              weekNumber: wn,
              severity: "error",
              rule: "dplus_impossible",
              message: `"${(s.title || s.type).substring(0, 40)}" : ${dplus}m D+ en ${dur}min est physiquement impossible.`
            });
          }
        }
      }
      if (weeks.length > 0) {
        const w1 = weeks[0];
        const isInterOrBeginner = isBeginnerLevel || level.includes("Interm\xE9diaire");
        if (isInterOrBeginner) {
          for (const s of w1.sessions) {
            if (s.type === "Renforcement" || s.type === "Repos") continue;
            const dur = parseDurationMin(s.duration);
            if (dur > 100 && s.type !== "Sortie Longue" && !/sortie longue/i.test(s.title || "")) {
              issues.push({
                weekNumber: 1,
                severity: "error",
                rule: "s1_footing_too_long",
                message: `"${(s.title || s.type).substring(0, 40)}" : ${dur}min en S1 est trop long pour un ${isBeginnerLevel ? "d\xE9butant" : "interm\xE9diaire"}.`
              });
            }
          }
        }
      }
      for (const week of weeks) {
        const wn = week.weekNumber || 1;
        const slCount = week.sessions.filter(
          (s) => s.type === "Sortie Longue" || /sortie\s*longue/i.test(s.title || "")
        ).length;
        if (slCount >= 2) {
          issues.push({
            weekNumber: wn,
            severity: "error",
            rule: "multiple_sl",
            message: `${slCount} Sorties Longues dans la m\xEAme semaine \u2014 max 1 recommand\xE9e.`
          });
        }
      }
      const errorCount = issues.filter((i) => i.severity === "error").length;
      const warningCount = issues.filter((i) => i.severity === "warning").length;
      const score = Math.max(0, 100 - errorCount * 15 - warningCount * 5);
      return {
        isValid: errorCount === 0,
        issues,
        score
      };
    };
    aiReviewPlan = async (plan, questionnaire) => {
      const planSummary = plan.weeks.map((w) => {
        const volume = getWeekVolume(w);
        const sessions = w.sessions.map(
          (s) => `${s.day}:${s.type}(${s.intensity || "?"},${s.duration}${s.distance ? "," + s.distance : ""})`
        ).join(" | ");
        return `S${w.weekNumber}[${w.phase || "?"}${w.isRecoveryWeek ? ",RECUP" : ""}] ${volume}km: ${sessions}`;
      }).join("\n");
      const profileSummary = questionnaire ? `Niveau:${questionnaire.level} | Objectif:${questionnaire.goal}${questionnaire.subGoal ? "(" + questionnaire.subGoal + ")" : ""} | Fr\xE9quence:${questionnaire.frequency}/sem | Temps vis\xE9:${questionnaire.targetTime || "Finisher"}` : "Profil non disponible";
      const reviewPrompt = `Tu es un expert en planification d'entra\xEEnement running. \xC9value ce plan en 200 mots MAX.

PROFIL : ${profileSummary}

PLAN :
${planSummary}

R\xE9ponds UNIQUEMENT en JSON :
{
  "overallScore": 0-100,
  "criteria": {
    "progression": 0-10,
    "injuryRisk": 0-10,
    "difficulty": 0-10,
    "variety": 0-10,
    "specificity": 0-10
  },
  "flaggedWeeks": [num\xE9ros des semaines probl\xE9matiques],
  "suggestions": ["suggestion courte 1", "suggestion courte 2"]
}

Crit\xE8res :
- progression : mont\xE9e en charge r\xE9guli\xE8re avec r\xE9cup
- injuryRisk : 10=aucun risque, 0=tr\xE8s dangereux
- difficulty : 10=parfaitement adapt\xE9 au niveau, 0=trop facile ou trop dur
- variety : diversit\xE9 des s\xE9ances et du renfo
- specificity : adapt\xE9 \xE0 l'objectif sp\xE9cifique (trail/route/perte de poids)

flaggedWeeks : semaines avec un score crit\xE8re < 6 qui n\xE9cessitent une correction.
Sois STRICT et HONN\xCATE. Un plan trop facile pour un expert est aussi mauvais qu'un plan trop dur pour un d\xE9butant.`;
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: reviewPrompt }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2048 }
        });
        const text = result.response.text();
        const review = JSON.parse(text);
        console.log(`[PlanValidator] AI Review: score=${review.overallScore}, flagged=${review.flaggedWeeks.join(",")}`);
        return review;
      } catch (error) {
        console.error("[PlanValidator] AI Review failed:", error);
        return {
          overallScore: 70,
          criteria: { progression: 7, injuryRisk: 7, difficulty: 7, variety: 7, specificity: 7 },
          flaggedWeeks: [],
          suggestions: []
        };
      }
    };
    generateCorrectedWeeks = async (plan, flaggedWeeks, issues, questionnaire) => {
      if (flaggedWeeks.length === 0) return [];
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const paces = plan.paces;
      const issuesSummary = issues.filter((i) => flaggedWeeks.includes(i.weekNumber)).map((i) => `- Semaine ${i.weekNumber}: [${i.severity}] ${i.message}`).join("\n");
      const contextWeeks = plan.weeks.filter((w) => !flaggedWeeks.includes(w.weekNumber)).slice(-3).map((w) => {
        const vol = getWeekVolume(w);
        return `S${w.weekNumber}[${w.phase}] ${vol}km: ${w.sessions.map((s) => `${s.day}:${s.type}(${s.duration})`).join(", ")}`;
      }).join("\n");
      const periodContext = flaggedWeeks.map((wn) => {
        const phaseIdx = wn - 1;
        const ctx = plan.generationContext?.periodizationPlan;
        if (!ctx || phaseIdx >= ctx.weeklyPhases.length) return `S${wn}: ?`;
        return `S${wn}: ${ctx.weeklyPhases[phaseIdx]} - ${ctx.weeklyVolumes[phaseIdx]}km${ctx.recoveryWeeks.includes(wn) ? " (R\xC9CUP)" : ""}`;
      }).join("\n");
      const correctionPrompt = `Tu es un Coach Running Expert. CORRIGE les semaines probl\xE9matiques de ce plan.

PROFIL : ${questionnaire ? `${questionnaire.level} | ${questionnaire.goal} ${questionnaire.subGoal || ""} | ${questionnaire.frequency} s\xE9ances/sem` : "Non disponible"}

ALLURES :
- EF: ${paces?.efPace} | Seuil: ${paces?.seuilPace} | VMA: ${paces?.vmaPace} | R\xE9cup: ${paces?.recoveryPace}

PROBL\xC8MES D\xC9TECT\xC9S :
${issuesSummary}

SEMAINES CORRECTES (contexte) :
${contextWeeks}

P\xC9RIODISATION DES SEMAINES \xC0 CORRIGER :
${periodContext}

G\xC9N\xC8RE les semaines corrig\xE9es (${flaggedWeeks.join(", ")}) en JSON :
[
  {
    "weekNumber": N,
    "theme": "Th\xE8me",
    "phase": "phase",
    "isRecoveryWeek": false,
    "sessions": [
      {
        "day": "Jour", "type": "Type", "title": "Titre",
        "duration": "dur\xE9e", "distance": "distance",
        "intensity": "Facile|Mod\xE9r\xE9|Difficile",
        "targetPace": "allure", "elevationGain": 0,
        "warmup": "\xE9chauffement", "mainSet": "corps d\xE9taill\xE9 avec allures EXACTES",
        "cooldown": "retour au calme", "advice": "conseil"
      }
    ]
  }
]

\u26A0\uFE0F CORRIGE sp\xE9cifiquement les probl\xE8mes list\xE9s. Garde la coh\xE9rence avec les semaines correctes.
\u26A0\uFE0F 1 s\xE9ance "Renforcement" OBLIGATOIRE par semaine.`;
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: correctionPrompt }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4096 }
        });
        const text = result.response.text();
        const correctedWeeks = JSON.parse(text);
        correctedWeeks.forEach((week) => {
          if (week.sessions) {
            week.sessions.forEach((session, idx) => {
              session.id = `w${week.weekNumber}-s${idx + 1}-fix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            });
          }
        });
        if (questionnaire) {
          correctedWeeks.forEach((week) => {
            (week.sessions || []).forEach((session) => {
              if (session.type === "Renforcement") {
                const renfo = buildRenfoMainSet({
                  weekNumber: week.weekNumber,
                  goal: questionnaire.goal || "",
                  subGoal: questionnaire.subGoal,
                  trailDistance: questionnaire.goal === "Trail" ? questionnaire.trailDetails?.distance : void 0,
                  level: questionnaire.level || "",
                  phase: week.phase || "fondamental",
                  weight: questionnaire.weight,
                  height: questionnaire.height,
                  age: questionnaire.age,
                  injuries: questionnaire.injuries
                });
                session.mainSet = renfo.mainSet;
                session.warmup = renfo.warmup;
                session.cooldown = renfo.cooldown;
                session.duration = renfo.duration;
                session.title = renfo.title;
              }
            });
          });
        }
        console.log(`[PlanValidator] Corrected ${correctedWeeks.length} weeks`);
        return correctedWeeks;
      } catch (error) {
        console.error("[PlanValidator] Correction failed:", error);
        return [];
      }
    };
    HILL_TITLE_RE2 = /vallonn|colline|c[ôo]te|d\+|denivel|d[ée]nivel|mont[ée]e/i;
    validateAndCorrectPlan = async (plan, questionnaire, onStatus) => {
      onStatus?.("V\xE9rification des r\xE8gles...");
      const validation = validatePlanRules(plan, questionnaire);
      console.log(`[PlanValidator] Layer 1: score=${validation.score}, issues=${validation.issues.length}`);
      const errorWeeks = [...new Set(
        validation.issues.filter((i) => i.severity === "error").map((i) => i.weekNumber)
      )];
      let aiReview;
      if (plan.weeks.length >= 3) {
        onStatus?.("Analyse IA du plan...");
        aiReview = await aiReviewPlan(plan, questionnaire);
        const aiFlagged = aiReview.flaggedWeeks || [];
        const allFlagged = [.../* @__PURE__ */ new Set([...errorWeeks, ...aiFlagged])];
        if (allFlagged.length > 0 && allFlagged.length <= 5) {
          onStatus?.(`Correction de ${allFlagged.length} semaine(s)...`);
          console.log(`[PlanValidator] Layer 3: correcting weeks ${allFlagged.join(", ")}`);
          const allIssues = [
            ...validation.issues,
            ...aiReview.suggestions.map((s, i) => ({
              weekNumber: aiFlagged[i] || allFlagged[0],
              severity: "warning",
              rule: "ai_suggestion",
              message: s
            }))
          ];
          const correctedWeeks = await generateCorrectedWeeks(plan, allFlagged, allIssues, questionnaire);
          if (correctedWeeks.length > 0) {
            const correctedPlan = { ...plan };
            correctedPlan.weeks = plan.weeks.map((w) => {
              const corrected = correctedWeeks.find((cw) => cw.weekNumber === w.weekNumber);
              return corrected || w;
            });
            const revalidation = validatePlanRules(correctedPlan, questionnaire);
            console.log(`[PlanValidator] Post-correction: score=${revalidation.score}`);
            fixHillySessionsElevation(correctedPlan);
            return {
              plan: correctedPlan,
              validation: revalidation,
              aiReview
            };
          }
        }
      } else if (errorWeeks.length > 0) {
        console.log(`[PlanValidator] Preview plan \u2014 ${errorWeeks.length} error weeks, skipping correction`);
      }
      fixHillySessionsElevation(plan);
      return { plan, validation, aiReview };
    };
  }
});

// src/services/geminiService.ts
init_stub_generative_ai();

// src/services/feasibilityService.ts
init_planUtils();
var MEDICAL_RED_FLAGS_RE = /douleur osseuse|fracture|fissure|œdème osseux|stress fracture|ostéonécrose|hernie discale|sciatique aigu/i;
function hasMedicalRedFlag(injuryDescription) {
  if (!injuryDescription) return false;
  return MEDICAL_RED_FLAGS_RE.test(injuryDescription);
}
function parseTargetTime(target) {
  if (!target) return null;
  const cleaned = target.trim().toLowerCase().replace(/^sub[- ]?/, "").replace(/\s+/g, "");
  const minOnlyMatch = cleaned.match(/^(\d{1,3})min$/);
  if (minOnlyMatch) {
    return parseInt(minOnlyMatch[1], 10);
  }
  const hMinMatch = cleaned.match(/^(\d{1,2})h(\d{0,2})(min)?$/);
  if (hMinMatch) {
    const hours = parseInt(hMinMatch[1], 10);
    const mins = hMinMatch[2] ? parseInt(hMinMatch[2], 10) : 0;
    return hours * 60 + mins;
  }
  const hmsMatch = cleaned.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hmsMatch) {
    const h = parseInt(hmsMatch[1], 10);
    const m = parseInt(hmsMatch[2], 10);
    const s = parseInt(hmsMatch[3], 10);
    return h * 60 + m + s / 60;
  }
  const msMatch = cleaned.match(/^(\d{1,3}):(\d{2})$/);
  if (msMatch) {
    const m = parseInt(msMatch[1], 10);
    const s = parseInt(msMatch[2], 10);
    return m + s / 60;
  }
  const numMatch = cleaned.match(/^(\d+)$/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  return null;
}
function formatTime(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h${m.toString().padStart(2, "0")}min`;
  }
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
function getDistanceKm(distance) {
  const d = distance.trim().toLowerCase();
  if (d === "5 km" || d === "5km") return 5;
  if (d === "10 km" || d === "10km") return 10;
  if (d.includes("semi") || d.includes("half")) return 21.1;
  if (d === "marathon" || d === "42 km" || d === "42km") return 42.195;
  const trailMatch = d.match(/(\d+)\s*km/);
  if (trailMatch) return parseInt(trailMatch[1], 10);
  return null;
}
function getVmaFactor(distanceKm) {
  if (distanceKm <= 5) return 0.95;
  if (distanceKm <= 10) return 0.9;
  if (distanceKm <= 21.1) return 0.85;
  if (distanceKm <= 42.195) return 0.8;
  if (distanceKm <= 80) return 0.7;
  return 0.65;
}
function getEquivalentFlatDistance(distanceKm, elevationM) {
  if (!elevationM || elevationM <= 0) return distanceKm;
  const elevationEquivalent = elevationM / 100;
  return distanceKm + elevationEquivalent;
}
function theoreticalTimeMinutes(vma, distanceKm) {
  const factor = getVmaFactor(distanceKm);
  const speedKmh = vma * factor;
  return distanceKm / speedKmh * 60;
}
function isBeginner(level) {
  return level.toLowerCase().includes("d\xE9butant") || level.toLowerCase().includes("debutant");
}
function isIntermediate(level) {
  return level.toLowerCase().includes("interm\xE9diaire") || level.toLowerCase().includes("intermediaire");
}
function requiredVmaForTarget(targetMinutes, distanceKm) {
  const factor = getVmaFactor(distanceKm);
  const requiredSpeed = distanceKm / (targetMinutes / 60);
  return requiredSpeed / factor;
}
var R2_GATES_ENABLED = globalThis.__IMPORT_META_ENV__.VITE_R2_GATES_ENABLED !== "false";
function applyR2Gates(ctx) {
  if (!R2_GATES_ENABLED) return { scorePenalty: 0, reasons: [] };
  const reasons = [];
  let scorePenalty = 0;
  let irrealisticCap;
  if (ctx.isTrail && ctx.raceDplus > 0 && ctx.distanceKm !== null) {
    const isCourt = ctx.distanceKm < 30;
    const isMoyen = ctx.distanceKm >= 30 && ctx.distanceKm < 60;
    const isUltra = ctx.distanceKm >= 60;
    const r1Multiplier = ctx.distanceKm < 20 ? 5 : ctx.distanceKm < 50 ? 4 : ctx.distanceKm < 100 ? 3.5 : 3;
    const r1Min = r1Multiplier * ctx.raceDplus;
    if (ctx.totalDplusCycle > 0 && ctx.totalDplusCycle < r1Min) {
      irrealisticCap = 10;
      reasons.push(`D+ cycle projet\xE9 ${ctx.totalDplusCycle}m < min ${Math.round(r1Min)}m (${r1Multiplier}\xD7 race D+, doctrine UTMB Academy)`);
    }
    if (ctx.currentElev > 0) {
      const ratioDplus = ctx.raceDplus / ctx.currentElev;
      if (ratioDplus > 40) {
        irrealisticCap = Math.min(irrealisticCap ?? 100, 10);
        reasons.push(`Ratio D+ race/actuel ${ratioDplus.toFixed(0)}\xD7 > 40 (hors fen\xEAtre pr\xE9p)`);
      } else if (ratioDplus > 25) {
        scorePenalty += 25;
        reasons.push(`Ratio D+ race/actuel ${ratioDplus.toFixed(0)}\xD7 > 25 (ambitieux)`);
      } else if (ratioDplus > 15) {
        scorePenalty += 10;
        reasons.push(`Ratio D+ race/actuel ${ratioDplus.toFixed(0)}\xD7 > 15 (vigilance)`);
      }
    } else if (ctx.raceDplus >= 500) {
      scorePenalty += 15;
      reasons.push(`D+ hebdo actuel non d\xE9clar\xE9 pour course ${ctx.raceDplus}m D+`);
    }
    if (ctx.currentVolume > 0) {
      const ratioVol = ctx.currentVolume / ctx.distanceKm;
      const seuils = isCourt ? { irr: 0.5, amb: 0.65 } : isMoyen ? { irr: 0.4, amb: 0.5 } : { irr: 0.3, amb: 0.4 };
      if (ratioVol < seuils.irr) {
        irrealisticCap = Math.min(irrealisticCap ?? 100, 10);
        reasons.push(`Vol actuel ${ctx.currentVolume}km/sem trop faible vs race ${ctx.distanceKm}km (ratio ${ratioVol.toFixed(2)} < ${seuils.irr})`);
      } else if (ratioVol < seuils.amb) {
        scorePenalty += 20;
        reasons.push(`Vol actuel ${ctx.currentVolume}km/sem juste vs race ${ctx.distanceKm}km (ratio ${ratioVol.toFixed(2)} < ${seuils.amb})`);
      }
    }
  }
  if (ctx.currentVolume > 0 && ctx.s1Volume > 0) {
    const sautAbs = ctx.s1Volume - ctx.currentVolume;
    const sautPct = ctx.s1Volume / ctx.currentVolume - 1;
    if (sautPct > 0.5 || sautAbs > 15) {
      irrealisticCap = Math.min(irrealisticCap ?? 100, 10);
      reasons.push(`Saut S0\u2192S1 trop violent : ${ctx.currentVolume}km \u2192 ${ctx.s1Volume}km (${(sautPct * 100).toFixed(0)}%, +${sautAbs}km)`);
    } else if (sautPct > 0.3) {
      scorePenalty += 10;
      reasons.push(`Saut S0\u2192S1 limite : ${ctx.currentVolume}km \u2192 ${ctx.s1Volume}km (+${(sautPct * 100).toFixed(0)}%)`);
    }
  }
  if (ctx.level.includes("Expert") && !ctx.hasChrono && ctx.currentVolume > 0 && ctx.currentVolume < 40) {
    scorePenalty += 20;
    reasons.push(`Niveau "Expert" d\xE9clar\xE9 mais aucun chrono valid\xE9 + volume ${ctx.currentVolume}km/sem (< 40 attendu pour Expert)`);
  }
  return { irrealisticCap, scorePenalty, reasons };
}
function getMinimumWeeksForBeginnerVolZero(distanceKm, isTrail, bmi, age, hasInjury) {
  let minWeeks;
  if (distanceKm === null) {
    minWeeks = 12;
  } else if (isTrail) {
    if (distanceKm >= 60) minWeeks = 52;
    else if (distanceKm >= 30) minWeeks = 36;
    else if (distanceKm >= 15) minWeeks = 22;
    else minWeeks = 12;
  } else {
    if (distanceKm >= 42) minWeeks = 30;
    else if (distanceKm >= 21) minWeeks = 20;
    else if (distanceKm >= 10) minWeeks = 14;
    else minWeeks = 10;
  }
  let modulations = 0;
  if (bmi !== null && bmi >= 30) modulations += 4;
  if (age !== void 0 && age >= 50) modulations += 2;
  if (hasInjury) modulations += 4;
  modulations = Math.min(modulations, 8);
  return minWeeks + modulations;
}
function calculateFeasibility(params) {
  const {
    vma,
    targetTime,
    distance,
    goal,
    level,
    planWeeks,
    currentVolume,
    hasInjury,
    hasChrono
  } = params;
  const distanceKm = getDistanceKm(distance);
  const isTrail = goal.toLowerCase().includes("trail");
  const beginner = isBeginner(level);
  const intermediate = isIntermediate(level);
  const isMarathon = !isTrail && distanceKm !== null && distanceKm >= 42;
  const isSemi = !isTrail && distanceKm !== null && distanceKm >= 21 && distanceKm < 42;
  const targetMinutes = parseTargetTime(targetTime ?? "");
  const hasTimeTarget = targetMinutes !== null && targetMinutes > 0;
  if (distanceKm === null || !hasTimeTarget) {
    return buildFinisherFeasibility(params, distanceKm, beginner, isTrail, isMarathon, isSemi);
  }
  const effectiveDistanceKm = isTrail ? getEquivalentFlatDistance(distanceKm, params.trailElevation) : distanceKm;
  const theoMinutes = theoreticalTimeMinutes(vma, effectiveDistanceKm);
  const gapPercent = (theoMinutes - targetMinutes) / theoMinutes * 100;
  const vmaNeededForTarget = requiredVmaForTarget(targetMinutes, effectiveDistanceKm);
  const vmaRatioPercent = Math.round(vmaNeededForTarget / vma * 100);
  if (vmaRatioPercent >= 130) {
    const theoFormatted2 = formatTime(theoMinutes);
    const realisticMinutes = theoMinutes * 1.05;
    const alternativeTarget2 = formatTime(realisticMinutes);
    const safetyWarning2 = buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, "IRR\xC9ALISTE", params.weight, params.height, params.age, isTrail, isMarathon || isSemi || distanceKm !== null && distanceKm >= 21);
    return {
      score: 5,
      status: "IRR\xC9ALISTE",
      message: `Ton objectif de ${formatTime(targetMinutes)} sur ${distance} n\xE9cessiterait une VMA de ${vmaNeededForTarget.toFixed(1)} km/h, soit ${vmaRatioPercent}% de ta VMA actuelle (${vma.toFixed(1)} km/h). M\xEAme avec une progression optimale, cet \xE9cart est trop important. Ton temps th\xE9orique est de ${theoFormatted2}. Un objectif r\xE9aliste serait autour de ${alternativeTarget2}.`,
      safetyWarning: safetyWarning2,
      alternativeTarget: alternativeTarget2,
      recommendation: `un temps cible de ${alternativeTarget2}`
    };
  }
  let score;
  let status;
  if (gapPercent <= -5) {
    score = 95;
    status = "EXCELLENT";
  } else if (gapPercent <= 5) {
    score = Math.round(100 - Math.abs(gapPercent) * 3);
    score = clamp(score, 85, 100);
    status = "EXCELLENT";
  } else if (gapPercent <= 15) {
    score = Math.round(84 - (gapPercent - 5) * 1.4);
    score = clamp(score, 70, 84);
    status = "BON";
  } else if (gapPercent <= 25) {
    score = Math.round(69 - (gapPercent - 15) * 1.4);
    score = clamp(score, 55, 69);
    status = "AMBITIEUX";
  } else {
    score = Math.round(54 - (gapPercent - 25) * 0.8);
    score = clamp(score, 10, 54);
    status = "RISQU\xC9";
  }
  if (beginner && isMarathon && planWeeks < 12) {
    score = clamp(Math.min(score, 25), 15, 30);
    status = "RISQU\xC9";
  }
  if (beginner && isMarathon && targetMinutes < 180) {
    score = clamp(Math.min(score, 15), 10, 20);
    status = "RISQU\xC9";
  }
  if (beginner && isMarathon && targetMinutes < 210 && targetMinutes >= 180) {
    score = clamp(Math.min(score, 30), 20, 35);
    status = "RISQU\xC9";
  }
  if (beginner && isMarathon && targetMinutes < 240 && targetMinutes >= 210) {
    score = Math.min(score, 50);
    if (score < 55) status = "RISQU\xC9";
  }
  if (beginner && isSemi && targetMinutes < 90) {
    score = clamp(Math.min(score, 25), 15, 30);
    status = "RISQU\xC9";
  }
  if (beginner && isSemi && targetMinutes < 105 && targetMinutes >= 90) {
    score = Math.min(score, 50);
    if (score < 55) status = "RISQU\xC9";
  }
  if (intermediate && isMarathon && targetMinutes < 180) {
    score = Math.min(score, 45);
    if (score < 55) status = "RISQU\xC9";
  }
  if (intermediate && isMarathon && targetMinutes < 195 && targetMinutes >= 180) {
    score = Math.min(score, 60);
  }
  if (vma < 12 && gapPercent > 5) {
    const lowVmaPenalty = Math.round((12 - vma) * (gapPercent - 5) * 0.5);
    score -= lowVmaPenalty;
  }
  if (intermediate && isSemi && targetMinutes < 80) {
    score = Math.min(score, 50);
    if (score < 55) status = "RISQU\xC9";
  }
  if (isSemi && planWeeks < 8) {
    score -= 20;
  }
  if (isMarathon && planWeeks < 12) {
    score -= 20;
  }
  if (isTrail && distanceKm !== null) {
    if (distanceKm >= 80 && planWeeks < 16) {
      score -= 25;
    } else if (distanceKm >= 60 && planWeeks < 14) {
      score -= 20;
    } else if (distanceKm >= 42 && planWeeks < 12) {
      score -= 15;
    } else if (distanceKm >= 30 && planWeeks < 8) {
      score -= 10;
    }
  }
  if (currentVolume !== void 0 && currentVolume > 0) {
    if (isMarathon && currentVolume < 30) {
      score -= 25;
    } else if (isSemi && currentVolume < 20) {
      score -= 20;
    } else if (distanceKm <= 10 && currentVolume < 15) {
      score -= 15;
    }
  }
  if (!hasChrono && hasTimeTarget) {
    const absGap = Math.abs(Math.min(gapPercent, 0));
    const noChronoCap = gapPercent >= 0 ? 65 : Math.round(clamp(65 + (absGap - 5) * 2, 65, 85));
    score = Math.min(score, noChronoCap);
    status = resolveStatus(score);
  }
  if (params.vmaFromTarget && hasTimeTarget) {
    score = Math.min(score, 50);
    status = resolveStatus(score);
  }
  if (hasInjury) {
    score -= 10;
  }
  if (hasMedicalRedFlag(params.injuryDescription)) {
    score = Math.min(score, 25);
  }
  if (params.weight && params.height && params.height > 0) {
    const bmi = params.weight / (params.height / 100) ** 2;
    if (bmi >= 35) {
      score -= isMarathon ? 30 : 25;
    } else if (bmi >= 30) {
      score -= isMarathon ? 20 : 15;
    } else if (bmi >= 27) {
      score -= isMarathon ? 10 : isSemi ? 7 : 3;
    } else if (bmi >= 25) {
      score -= isMarathon ? 5 : isSemi ? 3 : 0;
    }
  }
  if (params.weight && params.height && params.height > 0) {
    const bmi = params.weight / (params.height / 100) ** 2;
    const isSeniorAge = params.age !== void 0 && params.age >= 45;
    const isBmiHigh = bmi >= 30;
    const hasInjuryFlag = hasInjury;
    if (isBmiHigh && isSeniorAge && beginner) {
      score -= 25;
    } else if (isBmiHigh && hasInjuryFlag) {
      score -= 15;
    } else if (isSeniorAge && beginner && hasInjuryFlag) {
      score -= 15;
    }
  }
  if (isTrail && distanceKm !== null && distanceKm >= 100) {
    if (currentVolume !== void 0 && currentVolume < 50) {
      score -= 15;
    }
    if (params.frequency && params.frequency < 5) {
      score -= 15;
    }
    if (!hasChrono) {
      score -= 10;
    }
  }
  if (beginner && (currentVolume ?? 0) === 0) {
    const bmiBeg = params.weight && params.height && params.height > 0 ? params.weight / (params.height / 100) ** 2 : null;
    const minRequired = getMinimumWeeksForBeginnerVolZero(distanceKm, isTrail, bmiBeg, params.age, hasInjury);
    if (planWeeks < minRequired) {
      score = Math.min(score, 15);
    } else if (planWeeks < minRequired * 1.2) {
      score = Math.min(score, 30);
    }
  }
  let totalDplusCycleR2 = 0;
  if (isTrail && params.trailElevation) {
    for (let i = 1; i <= planWeeks; i++) {
      totalDplusCycleR2 += calculateWeekTargetElevation(i, planWeeks, params.trailElevation, params.level, params.currentWeeklyElevation, void 0);
    }
  }
  const peakVolEstimate = distanceKm ? isMarathon ? 60 : isSemi ? 45 : isTrail && distanceKm >= 60 ? 70 : isTrail && distanceKm >= 30 ? 55 : 35 : 35;
  const s1VolEstimate = currentVolume && currentVolume > 0 ? Math.round(currentVolume * 1.1) : Math.round(peakVolEstimate * 0.3);
  const r2 = applyR2Gates({
    isTrail,
    distanceKm,
    raceDplus: params.trailElevation ?? 0,
    planWeeks,
    currentVolume: currentVolume ?? 0,
    currentElev: params.currentWeeklyElevation ?? 0,
    s1Volume: s1VolEstimate,
    totalDplusCycle: totalDplusCycleR2,
    level: params.level || "",
    hasChrono: params.hasChrono
  });
  if (r2.reasons.length > 0) {
    console.debug(`[R2 Gates] reasons:`, r2.reasons);
  }
  score -= r2.scorePenalty;
  if (r2.irrealisticCap !== void 0) {
    score = Math.min(score, r2.irrealisticCap);
  }
  score = clamp(score, 10, 100);
  status = resolveStatus(score);
  const vmaNeeded = requiredVmaForTarget(targetMinutes, effectiveDistanceKm);
  const theoFormatted = formatTime(theoMinutes);
  const targetFormatted = formatTime(targetMinutes);
  let message = buildMessage(
    vma,
    theoFormatted,
    targetFormatted,
    vmaNeeded,
    distanceKm,
    distance,
    score,
    status,
    beginner,
    planWeeks,
    isMarathon,
    isSemi,
    hasChrono,
    currentVolume,
    targetMinutes,
    isTrail,
    params.trailElevation,
    level
  );
  if (params.vmaFromTarget) {
    const distLabel = isMarathon ? "marathon" : isSemi ? "semi-marathon" : `${distanceKm}km`;
    message = `Ta VMA est estim\xE9e \xE0 ${vma.toFixed(1)} km/h \xE0 partir de ton objectif de ${targetFormatted} sur ${distLabel} (pas de chrono de r\xE9f\xE9rence). Sans donn\xE9e r\xE9elle, il nous est difficile d'\xE9valuer pr\xE9cis\xE9ment la faisabilit\xE9 de cet objectif. Nous te recommandons de r\xE9aliser un test VMA ou de renseigner un chrono r\xE9cent (5km, 10km, semi) pour affiner ton plan et tes allures.`;
    if (hasInjury) {
      message += ` Attention : tes blessures d\xE9clar\xE9es n\xE9cessitent une vigilance particuli\xE8re. Consulte un professionnel de sant\xE9 avant de d\xE9marrer.`;
    }
  }
  if (!hasChrono && hasTimeTarget && !params.vmaFromTarget) {
    message += ` Cette \xE9valuation repose sur une VMA estim\xE9e (${vma.toFixed(1)} km/h) et non sur un chrono valid\xE9. Il faudra ajuster le plan au fil des s\xE9ances selon ton ressenti, ou r\xE9g\xE9n\xE9rer un plan en renseignant un chrono de r\xE9f\xE9rence (5km, 10km, semi) pour des allures plus pr\xE9cises.`;
  }
  let alternativeTarget;
  let recommendation;
  if (status === "AMBITIEUX" || status === "RISQU\xC9") {
    if (gapPercent > 0) {
      const realisticMinutes = theoMinutes * 1.05;
      alternativeTarget = formatTime(realisticMinutes);
      recommendation = `un temps cible de ${alternativeTarget}`;
    } else if (!hasChrono) {
      recommendation = `valider ta VMA avec un test terrain ou un chrono r\xE9cent (5km, 10km) pour affiner l'\xE9valuation`;
    }
  }
  if (status === "RISQU\xC9") {
    if (isMarathon && planWeeks < 12) {
      recommendation = `une dur\xE9e de pr\xE9paration d'au moins 16 semaines`;
    } else if (isSemi && planWeeks < 8) {
      recommendation = `une dur\xE9e de pr\xE9paration d'au moins 10 semaines`;
    }
  }
  let safetyWarning = buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, status, params.weight, params.height, params.age, isTrail, isMarathon || isSemi || distanceKm !== null && distanceKm >= 21);
  const maxRecommendedWeeks = isMarathon ? 20 : isSemi ? 18 : isTrail ? 20 : 14;
  if (planWeeks > maxRecommendedWeeks && !beginner) {
    const longPlanWarning = `\u26A0\uFE0F DUR\xC9E DU PLAN : ${planWeeks} semaines, c'est long pour ton profil. La plupart des coureurs de ton niveau pr\xE9parent cette distance en ${maxRecommendedWeeks} semaines maximum. Un plan trop long peut entra\xEEner de la lassitude et une stagnation. Si tu te sens pr\xEAt, tu peux envisager de rapprocher ta date de d\xE9but.`;
    safetyWarning = safetyWarning ? `${safetyWarning}

${longPlanWarning}` : longPlanWarning;
  }
  return { score, status, message, safetyWarning, alternativeTarget, recommendation };
}
function buildFinisherFeasibility(params, distanceKm, beginner, isTrail, isMarathon, isSemi) {
  const { vma, planWeeks, currentVolume, hasInjury, level } = params;
  let score = 80;
  let status = "BON";
  const reasons = [];
  const trailElev = params.trailElevation || 0;
  const trailRatio = trailElev > 0 && params.trailDistance ? Math.round(trailElev / params.trailDistance) : 0;
  const currentElev = params.currentWeeklyElevation || 0;
  const intermediate = isIntermediate(level);
  if (beginner && isTrail && distanceKm !== null && distanceKm >= 60) {
    score = clamp(15, 10, 20);
    reasons.push({ type: "risk", text: `un ultra-trail de ${distanceKm}km n'est pas adapt\xE9 pour un d\xE9butant \u2014 il faut plusieurs ann\xE9es d'exp\xE9rience trail` });
  } else if (beginner && isTrail && distanceKm !== null && distanceKm >= 42) {
    score = clamp(30, 25, 35);
    reasons.push({ type: "risk", text: `un trail de ${distanceKm}km est tr\xE8s ambitieux pour un d\xE9butant \u2014 vise d'abord un trail de 20-25km` });
  } else if (beginner && isTrail && distanceKm !== null && distanceKm >= 30) {
    score = Math.min(score, 55);
    reasons.push({ type: "warn", text: `trail de ${distanceKm}km pour un d\xE9butant : la distance combin\xE9e au D+ demande une solide base` });
  } else if (beginner && isTrail && distanceKm !== null && distanceKm >= 15) {
    score = Math.min(score, 65);
    if (params.trailElevation && params.trailElevation >= 500) score -= 5;
    if (params.trailElevation && params.trailElevation >= 1e3) score -= 5;
    reasons.push({ type: "warn", text: `trail de ${distanceKm}km pour un d\xE9butant : progression prudente n\xE9cessaire, alterne marche/course en mont\xE9e` });
  } else if (beginner && isTrail) {
    score -= 15;
    reasons.push({ type: "warn", text: `le trail demande de la technique m\xEAme sur courte distance \u2014 sois progressif` });
  }
  if (intermediate && isTrail && distanceKm !== null && distanceKm >= 100) {
    score = Math.min(score, 50);
    reasons.push({ type: "risk", text: `un ultra de ${distanceKm}km demande une exp\xE9rience significative m\xEAme pour un interm\xE9diaire` });
  } else if (intermediate && isTrail && distanceKm !== null && distanceKm >= 60) {
    score = Math.min(score, 60);
    reasons.push({ type: "warn", text: `un ultra de ${distanceKm}km en interm\xE9diaire : la gestion de l'effort sera cl\xE9` });
  }
  if (beginner && isMarathon && planWeeks < 12) {
    score = Math.min(score, 40);
    reasons.push({ type: "risk", text: `marathon d\xE9butant en ${planWeeks} semaines : minimum 16-20 semaines recommand\xE9es` });
  }
  if (isSemi && planWeeks < 8) {
    score -= 15;
    reasons.push({ type: "warn", text: `${planWeeks} semaines pour un semi-marathon, c'est court \u2014 8 \xE0 12 semaines recommand\xE9es` });
  }
  if (isMarathon && planWeeks < 12) {
    score -= 20;
    reasons.push({ type: "risk", text: `${planWeeks} semaines pour un marathon, c'est insuffisant \u2014 12 \xE0 16 semaines minimum` });
  }
  if (isTrail && distanceKm !== null) {
    if (distanceKm >= 100 && planWeeks < 20) {
      score -= 40;
      if (planWeeks < 16) score -= 20;
      reasons.push({ type: "risk", text: `${planWeeks} semaines pour un ultra de ${distanceKm}km est tr\xE8s dangereux \u2014 20-24 semaines sont le strict minimum` });
    } else if (distanceKm >= 60 && planWeeks < 20) {
      score -= 25;
      if (planWeeks < 12) score -= 15;
      reasons.push({ type: "risk", text: `${planWeeks} semaines pour un ultra de ${distanceKm}km est dangereux \u2014 20+ semaines sont n\xE9cessaires` });
    } else if (distanceKm >= 42 && planWeeks < 16) {
      score -= 20;
      if (planWeeks < 10) score -= 15;
      reasons.push({ type: "risk", text: `${planWeeks} semaines pour un trail de ${distanceKm}km, c'est court \u2014 16 \xE0 20 semaines id\xE9alement` });
    } else if (distanceKm >= 30 && planWeeks < 12) {
      score -= 15;
      if (planWeeks < 8) score -= 10;
      reasons.push({ type: "warn", text: `${planWeeks} semaines pour un trail de ${distanceKm}km : 12 \xE0 16 semaines recommand\xE9es` });
    } else if (distanceKm >= 15 && planWeeks < 8) {
      score -= 10;
      reasons.push({ type: "warn", text: `${planWeeks} semaines pour un trail de ${distanceKm}km est un peu juste` });
    }
  }
  if (isTrail && trailElev > 0 && currentElev > 0) {
    const dPlusRatio = trailElev / currentElev;
    if (dPlusRatio >= 3) {
      score -= 20;
      reasons.push({ type: "risk", text: `le D+ de la course (${trailElev}m) est ${dPlusRatio.toFixed(1)}x ton D+ hebdomadaire actuel (${currentElev}m/sem) \u2014 risque musculaire tr\xE8s \xE9lev\xE9 en descente, impossible de construire la r\xE9sistance excentrique n\xE9cessaire en ${planWeeks} semaines` });
    } else if (dPlusRatio >= 2) {
      score -= 10;
      reasons.push({ type: "warn", text: `le D+ de la course (${trailElev}m) est ${dPlusRatio.toFixed(1)}x ton D+ hebdomadaire actuel (${currentElev}m/sem) \u2014 renforce le travail excentrique (descentes, squats excentriques)` });
    }
  } else if (isTrail && trailElev >= 2e3 && currentElev === 0) {
    score -= 15;
    reasons.push({ type: "risk", text: `${trailElev}m de D+ en course sans volume de D+ hebdomadaire d\xE9clar\xE9 \u2014 la pr\xE9paration musculaire en descente sera critique` });
  }
  if (currentVolume !== void 0 && currentVolume > 0) {
    if (isMarathon && currentVolume < 30) {
      score -= 20;
      reasons.push({ type: "risk", text: `volume actuel de ${currentVolume}km/sem insuffisant pour un marathon (30km/sem minimum)` });
    } else if (isSemi && currentVolume < 20) {
      score -= 15;
      reasons.push({ type: "warn", text: `volume actuel de ${currentVolume}km/sem un peu faible pour un semi (20km/sem minimum)` });
    }
  }
  if (isTrail && distanceKm !== null && distanceKm > 42 && (currentVolume ?? 0) < 40) {
    score -= 20;
    if ((currentVolume ?? 0) === 0) {
      reasons.push({ type: "risk", text: `aucun volume hebdomadaire d\xE9clar\xE9 pour un trail de ${distanceKm}km \u2014 la mont\xE9e en charge sera tr\xE8s importante` });
    } else {
      reasons.push({ type: "risk", text: `volume actuel de ${currentVolume}km/sem insuffisant pour un trail de ${distanceKm}km (40km/sem recommand\xE9s)` });
    }
  }
  if (isTrail && distanceKm !== null && distanceKm >= 100) {
    if ((currentVolume ?? 0) < 50) {
      score -= 15;
      reasons.push({ type: "risk", text: `volume actuel de ${currentVolume || 0}km/sem bas pour un ultra de ${distanceKm}km (50km/sem+ recommand\xE9s)` });
    }
    if (params.frequency && params.frequency < 5) {
      score -= 15;
      reasons.push({ type: "risk", text: `${params.frequency} s\xE9ances/semaine est insuffisant pour un ultra de ${distanceKm}km \u2014 5-6 s\xE9ances recommand\xE9es pour atteindre le volume n\xE9cessaire` });
    }
    if (!params.hasChrono) {
      score -= 10;
      reasons.push({ type: "warn", text: `VMA estim\xE9e sur un ultra de ${distanceKm}km : les allures sont incertaines, valide avec un chrono (10km, semi) pour plus de fiabilit\xE9` });
    }
  }
  if (isTrail && distanceKm !== null && distanceKm >= 15 && distanceKm <= 42) {
    if ((currentVolume ?? 0) === 0) {
      score -= 15;
      reasons.push({ type: "risk", text: `aucun volume hebdomadaire d\xE9clar\xE9 : la progression devra \xEAtre tr\xE8s prudente` });
    } else if ((currentVolume ?? 0) < 20) {
      score -= 10;
      reasons.push({ type: "warn", text: `volume actuel de ${currentVolume}km/sem un peu faible pour cette distance` });
    }
  }
  if (isTrail && params.trailElevation && params.trailDistance) {
    const ratio = params.trailElevation / params.trailDistance;
    if (ratio > 80 && beginner) {
      score -= 15;
      reasons.push({ type: "risk", text: `ratio D+/km de ${trailRatio}m/km tr\xE8s \xE9lev\xE9 pour un d\xE9butant \u2014 terrain tr\xE8s exigeant` });
    } else if (ratio > 100) {
      score -= 10;
      reasons.push({ type: "warn", text: `ratio D+/km de ${trailRatio}m/km extr\xEAme \u2014 la gestion en mont\xE9e sera d\xE9terminante` });
    } else if (ratio > 60 && trailElev > 0) {
      reasons.push({ type: "warn", text: `${trailRatio}m D+/km : terrain vallonn\xE9, la gestion des mont\xE9es comptera` });
    }
    if (params.trailDistance >= 100 && planWeeks < 16) {
      score -= 20;
    } else if (params.trailDistance >= 80 && planWeeks < 14) {
      score -= 15;
    }
    if (currentElev > 0 && params.trailElevation > 0) {
      if (currentElev < params.trailElevation * 0.15) {
        score -= 20;
        reasons.push({ type: "risk", text: `ton D+ hebdo actuel (${currentElev}m) est tr\xE8s loin des ${params.trailElevation}m de la course \u2014 gros travail \xE0 faire` });
      } else if (currentElev < params.trailElevation * 0.25) {
        score -= 10;
        reasons.push({ type: "warn", text: `ton D+ hebdo actuel (${currentElev}m) est bas par rapport aux ${params.trailElevation}m de la course` });
      }
    } else if (currentElev === 0 && params.trailElevation > 0) {
      if (params.trailElevation >= 1500) {
        score -= 20;
        reasons.push({ type: "risk", text: `aucun entra\xEEnement en D+ pour ${params.trailElevation}m de d\xE9nivel\xE9 \u2014 int\xE8gre du D+ progressivement d\xE8s le d\xE9but` });
      } else if (params.trailElevation >= 500) {
        score -= 12;
        reasons.push({ type: "warn", text: `pas d'entra\xEEnement en D+ actuellement pour ${params.trailElevation}m de d\xE9nivel\xE9 \u2014 \xE0 travailler` });
      } else {
        score -= 5;
      }
    }
  }
  if (hasInjury) {
    score -= 10;
    reasons.push({ type: "warn", text: `blessure d\xE9clar\xE9e : adapte les s\xE9ances et consulte un professionnel de sant\xE9` });
  }
  if (hasMedicalRedFlag(params.injuryDescription)) {
    score = Math.min(score, 25);
    reasons.push({ type: "risk", text: `blessure articulaire/osseuse d\xE9clar\xE9e \u2014 imagerie m\xE9dicale + avis d'un sp\xE9cialiste indispensables avant de d\xE9marrer` });
  }
  if (params.weight && params.height && params.height > 0) {
    const bmi = params.weight / (params.height / 100) ** 2;
    if (bmi >= 35) {
      score -= 25;
      reasons.push({ type: "risk", text: `ton profil actuel impose une vigilance articulaire renforc\xE9e \u2014 consulte un m\xE9decin avant de d\xE9marrer, privil\xE9gie surfaces souples (herbe, terre, chemin) et chaussures avec amorti maximal` });
    } else if (bmi >= 30) {
      score -= 15;
      reasons.push({ type: "warn", text: `ton profil impose une vigilance articulaire \u2014 consulte un m\xE9decin, privil\xE9gie un bon amorti et des surfaces souples` });
    } else if (bmi >= 25 && (isMarathon || isTrail && distanceKm !== null && distanceKm >= 30)) {
      score -= 5;
      reasons.push({ type: "warn", text: `pour cette distance, investis dans de bonnes chaussures avec un bon amorti` });
    }
  }
  if (!params.hasChrono) {
    score -= 10;
    reasons.push({ type: "warn", text: `VMA estim\xE9e (pas de chrono valid\xE9) : l'\xE9valuation comporte une marge d'incertitude` });
  }
  const hasVolumeWarn = reasons.some((r) => (r.type === "warn" || r.type === "risk") && r.text.includes("volume"));
  if (currentVolume !== void 0 && currentVolume > 0 && distanceKm !== null && !hasVolumeWarn) {
    if (currentVolume >= distanceKm * 0.5) {
      score += 15;
      reasons.push({ type: "good", text: `ton volume actuel de ${currentVolume}km/sem est une excellente base pour cette distance` });
    } else if (currentVolume >= distanceKm * 0.3) {
      score += 8;
      reasons.push({ type: "good", text: `ton volume actuel de ${currentVolume}km/sem est un bon point de d\xE9part` });
    }
  }
  if (!beginner && planWeeks >= 16 && (currentVolume ?? 0) >= 40) {
    score += 5;
    reasons.push({ type: "good", text: `${planWeeks} semaines de pr\xE9paration avec un bon volume : conditions favorables` });
  }
  const frequency = params.frequency;
  if (frequency && planWeeks && planWeeks > 16 && frequency <= 3) {
    reasons.push({ type: "warn", text: `avec ${frequency} s\xE9ances/semaine sur ${planWeeks} semaines, chaque s\xE9ance sera tr\xE8s charg\xE9e en volume \u2014 passer \xE0 4 s\xE9ances rendrait le plan plus \xE9quilibr\xE9` });
  }
  if (currentVolume !== void 0 && currentVolume > 0) {
    const minStartByLevel = {
      "D\xE9butant (0-1 an)": 8,
      "Interm\xE9diaire (R\xE9gulier)": 15,
      "Confirm\xE9 (Comp\xE9tition)": 20,
      "Expert (Performance)": 25
    };
    const minStart = Object.entries(minStartByLevel).find(([k]) => (level || "").includes(k))?.[1] || 15;
    if (currentVolume < minStart) {
      reasons.push({ type: "warn", text: `ton volume actuel (${currentVolume} km/sem) est en dessous du minimum pour ton niveau (${minStart} km/sem) \u2014 le plan d\xE9marrera l\xE9g\xE8rement au-dessus` });
    }
  }
  if (beginner && (currentVolume ?? 0) === 0) {
    const bmiBeg = params.weight && params.height && params.height > 0 ? params.weight / (params.height / 100) ** 2 : null;
    const minRequired = getMinimumWeeksForBeginnerVolZero(distanceKm, isTrail, bmiBeg, params.age, hasInjury);
    if (planWeeks < minRequired) {
      score = Math.min(score, 15);
      reasons.push({ type: "risk", text: `${planWeeks} semaines pour d\xE9marrer la course \xE0 pied (volume actuel 0) est insuffisant pour ton profil \u2014 minimum recommand\xE9 : ${minRequired} semaines. Allonge la pr\xE9paration ou choisis un objectif plus modeste (marcher la majorit\xE9 du parcours)` });
    } else if (planWeeks < minRequired * 1.2) {
      score = Math.min(score, 30);
      reasons.push({ type: "warn", text: `${planWeeks} semaines pour d\xE9marrer la course (volume actuel 0) est juste pour ton profil \u2014 minimum confortable : ${Math.round(minRequired * 1.2)} semaines` });
    }
  }
  let totalDplusCycleR2 = 0;
  if (isTrail && params.trailElevation) {
    for (let i = 1; i <= planWeeks; i++) {
      totalDplusCycleR2 += calculateWeekTargetElevation(i, planWeeks, params.trailElevation, params.level, params.currentWeeklyElevation, void 0);
    }
  }
  const isMarathonFin = (distanceKm ?? 0) >= 42;
  const isSemiFin = (distanceKm ?? 0) >= 21 && (distanceKm ?? 0) < 42;
  const peakVolEstimateFin = distanceKm ? isMarathonFin ? 60 : isSemiFin ? 45 : isTrail && distanceKm >= 60 ? 70 : isTrail && distanceKm >= 30 ? 55 : 35 : 35;
  const s1VolEstimateFin = currentVolume && currentVolume > 0 ? Math.round(currentVolume * 1.1) : Math.round(peakVolEstimateFin * 0.3);
  const r2 = applyR2Gates({
    isTrail,
    distanceKm,
    raceDplus: params.trailElevation ?? 0,
    planWeeks,
    currentVolume: currentVolume ?? 0,
    currentElev: params.currentWeeklyElevation ?? 0,
    s1Volume: s1VolEstimateFin,
    totalDplusCycle: totalDplusCycleR2,
    level: params.level || "",
    hasChrono: params.hasChrono
  });
  for (const r of r2.reasons) {
    reasons.push({ type: r2.irrealisticCap !== void 0 ? "risk" : "warn", text: r });
  }
  if (r2.reasons.length > 0) {
    console.debug(`[R2 Gates Finisher] reasons:`, r2.reasons);
  }
  score -= r2.scorePenalty;
  if (r2.irrealisticCap !== void 0) {
    score = Math.min(score, r2.irrealisticCap);
  }
  score = clamp(score, 10, 100);
  status = resolveStatus(score);
  const riskReasons = reasons.filter((r) => r.type === "risk");
  const warnReasons = reasons.filter((r) => r.type === "warn");
  const goodReasons = reasons.filter((r) => r.type === "good");
  let message;
  const goalLower = params.goal.toLowerCase();
  const isPertePoids = goalLower.includes("perte");
  const isMaintien = goalLower.includes("maintien") || goalLower.includes("remise");
  const isNonRace = isPertePoids || isMaintien;
  const distLabel = isNonRace ? isPertePoids ? "programme perte de poids" : "programme remise en forme" : isTrail && distanceKm ? `trail de ${distanceKm}km${trailElev > 0 ? ` / ${trailElev}m D+` : ""}` : isMarathon ? "marathon" : isSemi ? "semi-marathon" : distanceKm ? `${distanceKm}km` : "cette course";
  if (isNonRace) {
    if (status === "EXCELLENT" || status === "BON") {
      message = `Ton ${distLabel} sur ${planWeeks} semaines est bien calibr\xE9 pour ton profil. Avec ta VMA de ${vma.toFixed(1)} km/h, concentre-toi sur la r\xE9gularit\xE9 et le plaisir.`;
    } else {
      message = `Ton ${distLabel} est ambitieux mais faisable. Sois progressif et \xE9coute ton corps.`;
    }
  } else if (status === "EXCELLENT") {
    message = `Ton profil est tr\xE8s bien adapt\xE9 \xE0 ce ${distLabel}. Avec ta VMA de ${vma.toFixed(1)} km/h et ${planWeeks} semaines de pr\xE9paration, les conditions sont r\xE9unies pour une belle course.`;
  } else if (status === "BON") {
    message = `Ton objectif de finisher sur ce ${distLabel} est tout \xE0 fait atteignable. Avec ta VMA de ${vma.toFixed(1)} km/h, concentre-toi sur la r\xE9gularit\xE9.`;
  } else if (status === "AMBITIEUX") {
    message = `Ce ${distLabel} est un beau d\xE9fi. Avec ta VMA de ${vma.toFixed(1)} km/h, c'est faisable mais attention :`;
  } else if (status === "RISQU\xC9") {
    message = `Ce ${distLabel} pr\xE9sente des risques s\xE9rieux dans ta configuration actuelle.`;
  } else {
    message = `Ce ${distLabel} n'est pas r\xE9aliste dans les conditions actuelles.`;
  }
  if (riskReasons.length > 0) {
    message += " " + riskReasons.map((r) => r.text.charAt(0).toUpperCase() + r.text.slice(1)).join(". ") + ".";
  }
  if (warnReasons.length > 0 && status !== "EXCELLENT") {
    const showWarns = status === "BON" ? warnReasons.slice(0, 1) : warnReasons;
    message += " " + showWarns.map((r) => r.text.charAt(0).toUpperCase() + r.text.slice(1)).join(". ") + ".";
  }
  if (goodReasons.length > 0 && riskReasons.length > 0) {
    message += " Point positif : " + goodReasons.map((r) => r.text).join(", ") + ".";
  } else if (goodReasons.length > 0 && status === "BON") {
    message += " " + goodReasons.map((r) => r.text.charAt(0).toUpperCase() + r.text.slice(1)).join(". ") + ".";
  }
  if (status === "RISQU\xC9" || status === "IRR\xC9ALISTE") {
    if (beginner && isTrail && distanceKm !== null && distanceKm >= 42) {
      message += ` Nous te recommandons de viser un trail de 20-25km d'abord pour acqu\xE9rir l'exp\xE9rience n\xE9cessaire.`;
    } else {
      message += ` \xC9coute ton corps, sois tr\xE8s progressif, et n'h\xE9site pas \xE0 adapter le plan si n\xE9cessaire.`;
    }
  } else if (status === "AMBITIEUX") {
    message += ` Suis le plan avec rigueur et r\xE9gularit\xE9, c'est la cl\xE9 pour y arriver.`;
  }
  let safetyWarning = buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, status, params.weight, params.height, params.age, isTrail, isMarathon || isSemi || distanceKm !== null && distanceKm >= 21);
  let recommendation;
  if (status === "RISQU\xC9" || status === "IRR\xC9ALISTE") {
    if (isTrail && distanceKm !== null && distanceKm >= 100 && planWeeks < 20) {
      recommendation = `une dur\xE9e de pr\xE9paration d'au moins 20 semaines`;
    } else if (isTrail && distanceKm !== null && distanceKm >= 60 && planWeeks < 16) {
      recommendation = `une dur\xE9e de pr\xE9paration d'au moins 16 semaines`;
    } else if (isTrail && distanceKm !== null && distanceKm >= 42 && planWeeks < 12) {
      recommendation = `une dur\xE9e de pr\xE9paration d'au moins 12 semaines`;
    } else if (isMarathon && planWeeks < 12) {
      recommendation = `une dur\xE9e de pr\xE9paration d'au moins 16 semaines`;
    } else if (isSemi && planWeeks < 8) {
      recommendation = `une dur\xE9e de pr\xE9paration d'au moins 10 semaines`;
    } else if (isTrail && distanceKm !== null && distanceKm >= 15 && planWeeks < 8) {
      recommendation = `une dur\xE9e de pr\xE9paration d'au moins 10 semaines`;
    } else {
      if (beginner && isTrail && distanceKm !== null && distanceKm >= 60) {
        recommendation = `un trail plus court (20-30km) pour acqu\xE9rir l'exp\xE9rience`;
      } else if (beginner && isMarathon) {
        recommendation = `un semi-marathon comme premi\xE8re exp\xE9rience longue distance`;
      } else {
        recommendation = `un objectif adapt\xE9 \xE0 ton profil actuel`;
      }
    }
  }
  const isTrailLong = isTrail && distanceKm !== null && distanceKm >= 42;
  const maxWeeksTrail = isTrailLong ? 22 : isTrail ? 20 : isMarathon ? 20 : isSemi ? 18 : 14;
  if (planWeeks > maxWeeksTrail && !beginner) {
    const longPlanWarning = `\u26A0\uFE0F DUR\xC9E DU PLAN : ${planWeeks} semaines, c'est long pour ton profil. La plupart des coureurs de ton niveau pr\xE9parent cette distance en ${maxWeeksTrail} semaines maximum. Un plan trop long peut entra\xEEner de la lassitude et une stagnation. Si tu te sens pr\xEAt, tu peux envisager de rapprocher ta date de d\xE9but.`;
    safetyWarning = safetyWarning ? `${safetyWarning}

${longPlanWarning}` : longPlanWarning;
  }
  return { score, status, message, safetyWarning, recommendation };
}
function buildMessage(vma, theoFormatted, targetFormatted, vmaNeeded, distanceKm, distanceName, score, status, beginner, planWeeks, isMarathon, isSemi, hasChrono, currentVolume, targetMinutes, isTrail, trailElevation, level) {
  const distanceLabel = isTrail && trailElevation ? `${distanceKm}km avec ${trailElevation}m D+` : distanceKm <= 5 ? "5km" : distanceKm <= 10 ? "10km" : distanceKm <= 21.1 ? "semi-marathon" : distanceKm <= 42.195 ? "marathon" : `${distanceKm}km`;
  const parts = [];
  parts.push(
    `Avec ta VMA de ${vma.toFixed(1)} km/h, ton temps th\xE9orique sur ${distanceLabel} est d'environ ${theoFormatted}.`
  );
  if (status === "EXCELLENT") {
    parts.push(`Ton objectif de ${targetFormatted} est coh\xE9rent avec ton niveau. C'est un plan r\xE9aliste et bien calibr\xE9.`);
  } else if (status === "BON") {
    parts.push(`Viser ${targetFormatted} est un bel objectif. Avec un entra\xEEnement r\xE9gulier, c'est tout \xE0 fait atteignable.`);
  } else if (status === "AMBITIEUX") {
    if (vmaNeeded < vma) {
      parts.push(`Ton objectif de ${targetFormatted} est a priori confortable par rapport \xE0 ton temps th\xE9orique de ${theoFormatted}.`);
      if (!hasChrono) {
        parts.push(`Cependant, ta VMA est estim\xE9e (pas de chrono valid\xE9), ce qui ajoute une marge d'incertitude \xE0 cette \xE9valuation.`);
      }
    } else {
      parts.push(
        `Viser ${targetFormatted} demande une VMA d'environ ${vmaNeeded.toFixed(1)} km/h. C'est un \xE9cart significatif par rapport \xE0 ton niveau actuel.`
      );
      parts.push(`Ce plan te fera progresser, mais un objectif autour de ${theoFormatted} serait plus r\xE9aliste pour cette pr\xE9paration.`);
    }
  } else {
    if (vmaNeeded < vma) {
      parts.push(`Ton objectif de ${targetFormatted} semble confortable, mais des facteurs de risque limitent la confiance dans cette \xE9valuation.`);
    } else {
      parts.push(
        `Viser ${targetFormatted} demande une VMA d'environ ${vmaNeeded.toFixed(1)} km/h. L'\xE9cart avec ton niveau actuel (${vma.toFixed(1)} km/h) est tr\xE8s important.`
      );
    }
  }
  if (beginner && isMarathon && planWeeks < 12) {
    parts.length = 0;
    parts.push(
      `Un marathon n\xE9cessite minimum 16-20 semaines de pr\xE9paration pour un d\xE9butant. ${planWeeks} semaines, c'est insuffisant pour construire l'endurance n\xE9cessaire sans risque de blessure. Nous te recommandons soit de reporter ta course, soit de viser un semi-marathon.`
    );
  } else if (beginner && isMarathon && score <= 50) {
    parts.length = 0;
    if (targetMinutes < 180) {
      parts.push(
        `Sub-3h au marathon demande une VMA d'environ 17-18 km/h et plusieurs ann\xE9es d'entra\xEEnement structur\xE9. Avec ta VMA actuelle de ${vma.toFixed(1)} km/h, l'\xE9cart est tr\xE8s important. Pour ton premier marathon, je te recommande de viser 4h30-5h \u2014 c'est d\xE9j\xE0 un bel objectif et surtout un objectif atteignable en s\xE9curit\xE9 !`
      );
    } else if (targetMinutes < 210) {
      parts.push(
        `Sub-3h30 au marathon est ambitieux pour un premier marathon. Avec ta VMA de ${vma.toFixed(1)} km/h, ton temps th\xE9orique est d'environ ${theoFormatted}. Je te conseille de viser ${theoFormatted} ou un peu plus pour ta premi\xE8re exp\xE9rience marathon \u2014 la priorit\xE9 est de franchir la ligne d'arriv\xE9e en bonne sant\xE9.`
      );
    } else {
      parts.push(
        `Sub-4h au marathon est un objectif courant mais ambitieux pour un d\xE9butant. Avec ta VMA de ${vma.toFixed(1)} km/h, ton temps th\xE9orique est d'environ ${theoFormatted}. Ton plan te guidera progressivement, mais \xE9coute ton corps.`
      );
    }
  } else if (beginner && isSemi && score <= 55) {
    const theoSemi = formatTime(theoreticalTimeMinutes(vma, 21.1));
    parts.length = 0;
    parts.push(
      `Avec ta VMA de ${vma.toFixed(1)} km/h, ton temps th\xE9orique semi est d'environ ${theoSemi}. Sans historique confirm\xE9, viser un temps tr\xE8s rapide est risqu\xE9. Vise plut\xF4t ${theoSemi} pour ton premier semi.`
    );
  }
  const alreadyMentionedChrono = parts.some((p) => p.includes("VMA est estim\xE9e"));
  if (!hasChrono && !alreadyMentionedChrono) {
    parts.push(`Note : ta VMA est estim\xE9e (pas de chrono de r\xE9f\xE9rence), l'\xE9valuation comporte donc une marge d'incertitude.`);
  }
  if (isMarathon && planWeeks < 12 && !beginner) {
    parts.push(`Attention : ${planWeeks} semaines, c'est court pour une pr\xE9paration marathon optimale. Le plan sera condens\xE9.`);
  }
  if (isSemi && planWeeks < 8) {
    parts.push(`Attention : ${planWeeks} semaines, c'est court pour une pr\xE9paration semi-marathon. Le plan sera condens\xE9.`);
  }
  if (isTrail && distanceKm !== null) {
    if (distanceKm >= 80 && planWeeks < 16) {
      parts.push(`Attention : ${planWeeks} semaines pour un ultra de ${distanceKm}km, c'est tr\xE8s court \u2014 16 \xE0 20 semaines id\xE9alement. Le plan sera condens\xE9 et chaque semaine comptera.`);
    } else if (distanceKm >= 60 && planWeeks < 14) {
      parts.push(`Attention : ${planWeeks} semaines pour un trail de ${distanceKm}km, c'est court \u2014 14 \xE0 18 semaines recommand\xE9es. Le plan sera condens\xE9.`);
    } else if (distanceKm >= 42 && planWeeks < 12) {
      parts.push(`Attention : ${planWeeks} semaines pour un trail de ${distanceKm}km, c'est juste \u2014 12 semaines minimum recommand\xE9es.`);
    }
  }
  if (currentVolume !== void 0 && currentVolume > 0) {
    const distDesc = isTrail ? `un trail de ${distanceKm}km` : isMarathon ? "un marathon" : "un semi";
    if (isMarathon && currentVolume < 30) {
      parts.push(`Ton volume actuel (${currentVolume} km/sem) est bas pour ${distDesc}. La mont\xE9e en charge sera progressive mais exigeante.`);
    } else if (isSemi && currentVolume < 20) {
      parts.push(`Ton volume actuel (${currentVolume} km/sem) est bas pour ${distDesc}. La mont\xE9e en charge sera progressive.`);
    }
    const minStartByLevel = {
      "D\xE9butant (0-1 an)": 8,
      "Interm\xE9diaire (R\xE9gulier)": 15,
      "Confirm\xE9 (Comp\xE9tition)": 20,
      "Expert (Performance)": 25
    };
    const minStart = Object.entries(minStartByLevel).find(([k]) => (level || "").includes(k))?.[1] || 15;
    if (currentVolume < minStart) {
      parts.push(`Note : ton volume actuel (${currentVolume} km/sem) est en dessous du minimum pour ton niveau (${minStart} km/sem). Le plan d\xE9marrera l\xE9g\xE8rement au-dessus pour garantir une progression coh\xE9rente.`);
    }
  }
  return parts.join(" ");
}
function buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, status, weight, height, age, isTrail, isLongDistance) {
  const bmi = weight && height && height > 0 ? weight / (height / 100) ** 2 : 0;
  const isSenior = (age || 0) >= 45;
  if (hasInjury && bmi >= 30) {
    return "AVIS M\xC9DICAL OBLIGATOIRE : tu cumules des facteurs de prudence (profil + ant\xE9c\xE9dent de blessure). Consulte imp\xE9rativement ton m\xE9decin et ton kin\xE9 avant de d\xE9marrer. Privil\xE9gie surfaces souples et chaussures \xE0 amorti maximal.";
  }
  if (bmi >= 30 && isSenior && beginner) {
    return `AVIS M\xC9DICAL OBLIGATOIRE : \xE0 ${age} ans, avec un d\xE9marrage d\xE9butant, consulte imp\xE9rativement ton m\xE9decin pour un test d'effort avant de commencer. D\xE9marre tr\xE8s progressivement en alternant marche et course.`;
  }
  if (hasInjury) {
    return "Fais valider la reprise avec ton kin\xE9/m\xE9decin avant de d\xE9marrer ce plan. Adapte les s\xE9ances si n\xE9cessaire.";
  }
  if (isSenior && (isMarathon || isLongDistance)) {
    return `\xC0 ${age} ans, on te recommande vivement de consulter ton m\xE9decin et de r\xE9aliser un test d'effort avant de d\xE9marrer cette pr\xE9paration. Un certificat m\xE9dical d'aptitude est indispensable pour cette distance. Privil\xE9gie la r\xE9cup\xE9ration (48-72h entre s\xE9ances intenses), hydrate-toi bien et \xE9coute ton corps.`;
  }
  if (bmi >= 35) {
    return "Consulte imp\xE9rativement ton m\xE9decin avant de d\xE9marrer ce programme. Risque articulaire \xE0 surveiller : privil\xE9gie surfaces souples (herbe, terre, chemin), chaussures \xE0 amorti maximal, et alterne marche et course si n\xE9cessaire.";
  }
  if (bmi >= 30) {
    return "On te recommande de consulter ton m\xE9decin avant de d\xE9marrer. Investis dans de bonnes chaussures avec amorti renforc\xE9 et privil\xE9gie surfaces souples (herbe, terre, chemin) pour r\xE9duire l'impact sur les articulations.";
  }
  if (isSenior) {
    return `\xC0 ${age} ans, on te recommande de consulter ton m\xE9decin pour un certificat d'aptitude et id\xE9alement un test d'effort avant de d\xE9marrer. Accorde-toi une r\xE9cup\xE9ration suffisante entre les s\xE9ances (48h minimum) et \xE9coute ton corps.`;
  }
  if (bmi >= 27) {
    return "Investis dans de bonnes chaussures avec un bon amorti et privil\xE9gie les surfaces souples quand c'est possible. Pense \xE0 bien t'hydrater et \xE0 \xE9couter ton corps.";
  }
  if (bmi >= 25 && (isMarathon || isSemi || isLongDistance)) {
    return "Investis dans de bonnes chaussures avec un bon amorti et privil\xE9gie les surfaces souples quand c'est possible. Pense \xE0 bien t'hydrater.";
  }
  if (beginner && (isMarathon || isSemi || isLongDistance)) {
    return "On te recommande de valider ce programme avec ton m\xE9decin, surtout pour un premier effort de cette distance. Un certificat m\xE9dical d'aptitude est vivement conseill\xE9.";
  }
  if (beginner) {
    return "Pense \xE0 consulter un m\xE9decin pour un certificat d'aptitude avant de commencer ta pr\xE9paration.";
  }
  if (status === "AMBITIEUX" || status === "RISQU\xC9") {
    return "\xC9coute ton corps \xE0 chaque s\xE9ance. Si tu ressens des douleurs inhabituelles, n'h\xE9site pas \xE0 adapter ou sauter une s\xE9ance.";
  }
  return "Hydrate-toi bien, \xE9chauffe-toi avant chaque s\xE9ance et accorde-toi un vrai temps de r\xE9cup\xE9ration.";
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function resolveStatus(score) {
  if (score >= 85) return "EXCELLENT";
  if (score >= 70) return "BON";
  if (score >= 55) return "AMBITIEUX";
  if (score > 10) return "RISQU\xC9";
  return "IRR\xC9ALISTE";
}

// src/services/geminiService.ts
init_renfoService();

// src/services/footingVariants.ts
var FOOTING_VARIANTS = [
  // ─────────────── TERRAIN PLAT ───────────────
  {
    slug: "footing_classique",
    title: "Footing en endurance fondamentale",
    terrain: "flat",
    universal: true,
    contraindications: [],
    goalFit: "all",
    warmup: "5 min de marche active puis mont\xE9e progressive vers l'allure d'endurance fondamentale.",
    cooldown: "5 min de footing tr\xE8s lent puis marche.",
    advice: "C'est la s\xE9ance qui construit ton moteur a\xE9robie : c\u0153ur, capillaires, tendons. La r\xE9gularit\xE9 de l'allure est l'objectif, pas la vitesse.",
    buildMainSet: (m, p) => `${m} min en endurance fondamentale, allure r\xE9guli\xE8re et confortable (${p}). Tu dois pouvoir tenir une conversation tout du long.`
  },
  {
    slug: "footing_negative_split",
    title: "Footing progressif (n\xE9gative split)",
    terrain: "flat",
    universal: true,
    contraindications: [],
    goalFit: "all",
    warmup: "5 min de marche puis 5 min de footing tr\xE8s lent (bas de l'endurance fondamentale).",
    cooldown: "5 min de footing lent puis marche.",
    advice: "Apprendre \xE0 finir mieux qu'on a commenc\xE9 : gestion de l'effort et discipline mentale. La 2e partie reste en a\xE9robie \u2014 si tu es essouffl\xE9, tu es all\xE9 trop loin.",
    buildMainSet: (m, p) => `${m} min en deux moiti\xE9s : la 1re tr\xE8s tranquille (bas de l'EF), la 2e dans le haut de l'EF autour de ${p} \u2014 toujours conversationnel, jamais essouffl\xE9. Tu termines plus vite que tu n'as commenc\xE9.`
  },
  {
    slug: "footing_fractionne_marche",
    title: "Footing en blocs souples",
    terrain: "flat",
    universal: true,
    contraindications: [],
    goalFit: "all",
    warmup: "5 min de marche active.",
    cooldown: "5 min de marche.",
    advice: "D\xE9couper l'effort permet d'accumuler du volume a\xE9robie en r\xE9duisant la charge m\xE9canique globale. Id\xE9al pour progresser sans casser.",
    buildMainSet: (m, p) => {
      const blocs = Math.max(3, Math.floor((m + 1) / 6));
      return `${blocs} blocs de 5 min de footing en endurance fondamentale (${p}), entrecoup\xE9s de 1 min de marche. Le footing reste lent et confortable ; la marche est une respiration de confort, pas une r\xE9cup\xE9ration d'effort dur.`;
    }
  },
  {
    slug: "footing_lignes_droites",
    title: "Footing + lignes droites",
    terrain: "flat",
    universal: false,
    contraindications: ["hasMuscleTear", "beginner"],
    goalFit: ["Route", "Maintien"],
    warmup: "5 min de marche puis 10 min de footing en endurance fondamentale.",
    cooldown: "5 min de footing lent puis marche.",
    advice: "Les lignes droites r\xE9veillent la coordination et la qualit\xE9 de foul\xE9e sans co\xFBt cardiovasculaire \u2014 elles sont trop courtes pour \xEAtre un travail de vitesse.",
    buildMainSet: (m, p) => `${Math.max(15, m - 8)} min de footing en endurance fondamentale (${p}), puis 4 \xE0 6 lignes droites : ~60-80 m en acc\xE9l\xE9ration souple et progressive sur terrain plat (on monte en fr\xE9quence de jambes sans forcer), avec retour \xE0 allure de footing et r\xE9cup\xE9ration compl\xE8te entre chaque. C'est trop court pour solliciter le cardio \u2014 c'est un travail de coordination, pas de vitesse.`
  },
  {
    slug: "footing_educatifs",
    title: "Footing + gammes athl\xE9tiques",
    terrain: "flat",
    universal: false,
    contraindications: ["hasJointInjury", "hasKneeInjury", "hasAnkleInjury", "hasMuscleTear", "beginner"],
    goalFit: ["Trail", "Route", "Maintien"],
    warmup: "5 min de marche puis 10 min de footing en endurance fondamentale.",
    cooldown: "5 min de footing lent puis marche.",
    advice: "Les gammes am\xE9liorent l'\xE9conomie de course et la qualit\xE9 de foul\xE9e. C'est un investissement technique qui rend chaque footing futur plus efficace.",
    buildMainSet: (m, p) => `${Math.max(15, m - 10)} min de footing en endurance fondamentale (${p}), puis un circuit d'\xE9ducatifs r\xE9alis\xE9 en souplesse, sans recherche d'intensit\xE9 : talons-fesses, mont\xE9es de genoux, pas chass\xE9s, foul\xE9es bondissantes l\xE9g\xE8res, jambes tendues \u2014 2 s\xE9ries de 20-30 m par exercice, retour en marche.`
  },
  {
    slug: "footing_fartlek_souple",
    title: "Footing au ressenti (fartlek doux)",
    terrain: "flat",
    universal: false,
    contraindications: ["beginner"],
    goalFit: ["Trail", "Route", "Maintien"],
    warmup: "10 min de footing en endurance fondamentale.",
    cooldown: "5 min de footing lent puis marche.",
    advice: "Le fartlek souple t'apprend \xE0 \xE9couter tes sensations plut\xF4t que ta montre. Le jeu d'allure casse la routine tout en restant 100 % a\xE9robie.",
    buildMainSet: (m, p) => `${m} min de footing en alternant librement, au ressenti, des portions "bas de l'EF" et des portions "haut de l'EF" (${p} en r\xE9f\xE9rence). Aucune portion ne doit faire monter l'essoufflement : tu restes conversationnel partout.`
  },
  // ─────────────── TERRAIN RELIEF ───────────────
  {
    slug: "footing_cotes_douces",
    title: "Footing vallonn\xE9",
    terrain: "relief",
    universal: false,
    contraindications: ["hasJointInjury", "hasKneeInjury", "isOverweight", "isSenior60"],
    goalFit: ["Trail", "Route", "Maintien"],
    warmup: "10 min de footing en endurance fondamentale sur terrain plat.",
    cooldown: "5 \xE0 10 min de footing plat puis marche.",
    advice: "Le relief renforce les cha\xEEnes musculaires de fa\xE7on naturelle et progressive. La r\xE8gle d'or : c'est l'effort qui reste constant, pas la vitesse.",
    buildMainSet: (m, p) => `${m} min sur parcours l\xE9g\xE8rement vallonn\xE9. En mont\xE9e : foul\xE9e courte, effort d'endurance fondamentale maintenu (${p} en r\xE9f\xE9rence sur le plat, la vitesse baisse en c\xF4te c'est normal). En descente : rel\xE2ch\xE9, foul\xE9e courte et contr\xF4l\xE9e. Pas de c\xF4te raide, du vallon doux.`
  },
  {
    slug: "footing_cotes_courtes_marche",
    title: "Footing vallonn\xE9, c\xF4tes en marche",
    terrain: "relief",
    universal: false,
    contraindications: ["hasKneeInjury"],
    goalFit: ["Trail", "Route", "Maintien"],
    warmup: "10 min de footing en endurance fondamentale sur terrain plat ou faux-plat.",
    cooldown: "5 \xE0 10 min de footing plat puis marche.",
    advice: "Franchir les mont\xE9es raides en marche active limite le travail excentrique tout en construisant les cha\xEEnes musculaires. Une approche accessible du relief, peu traumatisante.",
    buildMainSet: (m, p) => `${m} min sur parcours vallonn\xE9. Les mont\xE9es les plus raides se franchissent en marche active et dynamique (pouss\xE9e des bras, gainage). Le plat et les descentes douces se courent en endurance fondamentale (${p} en r\xE9f\xE9rence). On g\xE8re l'effort, pas le chrono.`
  },
  {
    slug: "footing_terrain_varie",
    title: "Footing nature, terrain vari\xE9",
    terrain: "relief",
    universal: false,
    contraindications: ["hasAnkleInjury", "hasJointInjury", "isSenior60", "beginner", "isOverweight"],
    goalFit: ["Trail", "Maintien"],
    warmup: "10 min de footing en endurance fondamentale sur chemin roulant.",
    cooldown: "5 \xE0 10 min sur terrain roulant puis marche.",
    advice: `Le terrain vari\xE9 sollicite les muscles stabilisateurs et la proprioception, en douceur. C'est un renforcement "gratuit" int\xE9gr\xE9 au footing.`,
    buildMainSet: (m, p) => `${m} min sur terrain vari\xE9 non technique \u2014 chemins, sentiers larges, herbe, sous-bois. Adapte l'allure au sol pour garder un effort d'endurance fondamentale constant (${p} en r\xE9f\xE9rence). \xC9vite le terrain pi\xE9geux (racines, cailloux, d\xE9vers).`
  },
  {
    slug: "footing_sentier_roulant",
    title: "Footing sur sentier roulant",
    terrain: "relief",
    universal: false,
    contraindications: ["hasAnkleInjury", "beginner"],
    goalFit: ["Trail", "Maintien"],
    warmup: "10 min de footing en endurance fondamentale sur chemin roulant.",
    cooldown: "5 \xE0 10 min sur terrain roulant puis marche.",
    advice: `Le sentier roulant fait travailler le d\xE9nivel\xE9 "de fond", diffus et r\xE9gulier, sans pic d'effort excentrique. La meilleure \xE9cole pour habituer les jambes au D+.`,
    buildMainSet: (m, p) => `${m} min sur sentier roulant non technique avec du d\xE9nivel\xE9 r\xE9gulier et diffus (pas de c\xF4te marqu\xE9e). Garde un effort d'endurance fondamentale constant (${p} en r\xE9f\xE9rence) : tu laisses la vitesse fluctuer avec le terrain.`
  }
];
function detectFootingFlags(params) {
  const { weight, height, age, level, injuries } = params;
  const bmi = weight && height && height > 0 ? weight / (height / 100) ** 2 : 0;
  const desc = (injuries?.description || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const hasInjury = !!injuries?.hasInjury;
  const hasKneeInjury = hasInjury && /genou|genoux|rotule|rotulien|menisque|ligament croise|bandelette|syndrome essuie|femoro|patellaire|condromalac/.test(desc);
  const hasAnkleInjury = hasInjury && /cheville|achille|tendon|tendinite|tendinopathie|perioste|periostite|fasci|aponevrose|plantaire/.test(desc);
  const hasHipInjury = hasInjury && /hanche|tendineu/.test(desc);
  const hasMuscleTear = hasInjury && /dechirure|claquage|elongation|contracture/.test(desc);
  const hasJointInjury = hasKneeInjury || hasAnkleInjury || hasHipInjury || hasInjury && /articul|statique/.test(desc);
  return {
    isOverweight: bmi >= 28,
    hasJointInjury,
    hasKneeInjury,
    hasAnkleInjury,
    hasMuscleTear,
    isSenior60: (age || 0) >= 60,
    beginner: /debutant|débutant/i.test(level || "")
  };
}
function mapToFootingGoal(goal) {
  const g = (goal || "").toLowerCase();
  if (g.includes("trail") || g.includes("vk")) return "Trail";
  if (g.includes("perte") || g.includes("maintien") || g.includes("remise") || g.includes("forme")) return "Maintien";
  return "Route";
}
var HILL_TITLE_RE = /vallonn|colline|c[ôo]te|d\+|denivel|d[ée]nivel|mont[ée]e/i;
function detectSessionTerrain(elevationGain, title) {
  if (elevationGain && elevationGain > 0) return "relief";
  if (title && HILL_TITLE_RE.test(title)) return "relief";
  return "flat";
}
function parseDurationToMin(durationStr) {
  if (!durationStr) return 45;
  const s = String(durationStr);
  const hm = s.match(/(\d+)\s*h\s*(\d+)/i);
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2]);
  let total = 0;
  const hOnly = s.match(/(\d+)\s*h/i);
  if (hOnly) total += parseInt(hOnly[1]) * 60;
  const mOnly = s.match(/(\d+)\s*min/i);
  if (mOnly) total += parseInt(mOnly[1]);
  if (total === 0) {
    const n = s.match(/^(\d+)/);
    if (n) total = parseInt(n[1]);
  }
  return total > 0 ? total : 45;
}
function hashSeed(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = h * 31 + seed.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}
function buildFootingVariant(params) {
  const { weekNumber, sessionIndex = 0, goal, durationStr, efPace, flags, sessionElevation, sessionTitle, seed } = params;
  const footingGoal = mapToFootingGoal(goal);
  const terrain = detectSessionTerrain(sessionElevation, sessionTitle);
  const eligible = FOOTING_VARIANTS.filter((v) => {
    if (v.terrain !== terrain) return false;
    if (v.contraindications.some((flag) => flags[flag] === true)) return false;
    if (v.goalFit !== "all" && !v.goalFit.includes(footingGoal)) return false;
    return true;
  });
  let filtered = eligible;
  if (filtered.length === 0) {
    if (terrain === "relief") {
      const reliefAll = FOOTING_VARIANTS.filter((v) => v.terrain === "relief");
      const leastRisky = reliefAll.reduce((best, v) => {
        const score = v.contraindications.filter((f) => flags[f] === true).length;
        const bestScore = best.contraindications.filter((f) => flags[f] === true).length;
        return score < bestScore ? v : best;
      });
      filtered = [leastRisky];
    } else {
      filtered = [FOOTING_VARIANTS[0]];
    }
  }
  const universals = filtered.filter((v) => v.universal);
  const conditionals = filtered.filter((v) => !v.universal);
  const pool = [];
  const maxLen = Math.max(universals.length, conditionals.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < universals.length) pool.push(universals[i]);
    if (i < conditionals.length) pool.push(conditionals[i]);
  }
  const seedOffset = seed ? hashSeed(seed) : 0;
  const rotationIndex = Math.max(1, weekNumber) - 1 + sessionIndex + seedOffset;
  const variant = pool[rotationIndex % pool.length];
  const totalMin = parseDurationToMin(durationStr);
  const bodyMin = Math.max(20, totalMin - 18);
  const pace = efPace || "allure EF";
  return {
    slug: variant.slug,
    title: variant.title,
    warmup: variant.warmup,
    mainSet: variant.buildMainSet(bodyMin, pace),
    cooldown: variant.cooldown,
    advice: variant.advice
  };
}

// src/services/geminiService.ts
init_planUtils();
var timeToSeconds = (time, contextDistance) => {
  if (!time) return 0;
  const t = time.trim().toLowerCase();
  const hMatch = t.match(/^(\d+)h:?(\d{0,2})/);
  if (hMatch) {
    const hours = parseInt(hMatch[1]);
    const mins = hMatch[2] ? parseInt(hMatch[2]) : 0;
    const asHours = hours * 3600 + mins * 60;
    if (contextDistance) {
      const maxPlausibleSec = contextDistance <= 5 ? 90 * 60 : (
        // 5 km : max 1h30
        contextDistance <= 10 ? 150 * 60 : (
          // 10 km : max 2h30
          contextDistance <= 21.5 ? 4 * 3600 : (
            // semi : max 4h
            contextDistance <= 43 ? 8 * 3600 : (
              // marathon : max 8h
              Math.max(30, contextDistance * 0.5) * 3600
            )
          )
        )
      );
      if (asHours > maxPlausibleSec) {
        const asMinSec = hours * 60 + mins;
        console.warn(`[timeToSeconds] "${time}" interpr\xE9t\xE9 "${hours}h${mins}min"=${asHours}s implausible pour ${contextDistance}km \u2014 r\xE9interpr\xE9t\xE9 "${hours}min${mins}s" = ${asMinSec}s`);
        return asMinSec;
      }
    }
    return asHours;
  }
  const minMatch = t.match(/^(\d+)\s*min/);
  if (minMatch) {
    return parseInt(minMatch[1]) * 60;
  }
  const parts = time.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    if (contextDistance && contextDistance >= 21) {
      return parts[0] * 3600 + parts[1] * 60;
    }
    if (contextDistance && contextDistance >= 5 && parts[0] <= 3) {
      return parts[0] * 3600 + parts[1] * 60;
    }
    return parts[0] * 60 + parts[1];
  }
  const embeddedMin = t.match(/(\d+)\s*min/);
  if (embeddedMin) {
    const embeddedH = t.match(/(\d+)\s*h/);
    if (embeddedH) return parseInt(embeddedH[1]) * 3600 + parseInt(embeddedMin[1]) * 60;
    return parseInt(embeddedMin[1]) * 60;
  }
  const soloNum = parseInt(t);
  if (!isNaN(soloNum) && soloNum > 0) {
    if (contextDistance && contextDistance >= 21) {
      return soloNum <= 6 ? soloNum * 3600 : soloNum * 60;
    }
    return soloNum * 60;
  }
  return 0;
};
var secondsToPace = (seconds) => {
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (secs >= 60) return `${mins + 1}:00`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
var calculateVMAFromTime = (distance, timeSeconds) => {
  const avgSpeed = distance / timeSeconds * 3600;
  let vmaFactor;
  if (distance <= 5) {
    vmaFactor = 0.95;
  } else if (distance <= 10) {
    vmaFactor = 0.9;
  } else if (distance <= 21.1) {
    vmaFactor = 0.85;
  } else {
    vmaFactor = 0.8;
  }
  return avgSpeed / vmaFactor;
};
var calculateAllPaces = (vma) => {
  const vmaPaceSeconds = 3600 / vma;
  const seuilSpeed = vma * 0.87;
  const eaSpeed = vma * 0.77;
  const efSpeed = vma * 0.67;
  const recoverySpeed = vma * 0.6;
  const specific5kSpeed = vma * 0.95;
  const specific10kSpeed = vma * 0.9;
  const specificSemiSpeed = vma * 0.85;
  const specificMarathonSpeed = vma * 0.8;
  return {
    vma,
    vmaKmh: vma.toFixed(1),
    vmaPace: secondsToPace(vmaPaceSeconds),
    seuilPace: secondsToPace(3600 / seuilSpeed),
    eaPace: secondsToPace(3600 / eaSpeed),
    efPace: secondsToPace(3600 / efSpeed),
    recoveryPace: secondsToPace(3600 / recoverySpeed),
    allureSpecifique5k: secondsToPace(3600 / specific5kSpeed),
    allureSpecifique10k: secondsToPace(3600 / specific10kSpeed),
    allureSpecifiqueSemi: secondsToPace(3600 / specificSemiSpeed),
    allureSpecifiqueMarathon: secondsToPace(3600 / specificMarathonSpeed)
  };
};
var getBestVMAEstimate = (raceTimes) => {
  if (!raceTimes) return null;
  const estimates = [];
  if (raceTimes.distance5km) {
    const seconds = timeToSeconds(raceTimes.distance5km, 5);
    if (seconds > 0) {
      estimates.push({
        vma: calculateVMAFromTime(5, seconds),
        source: `5km en ${raceTimes.distance5km}`,
        priority: 1
      });
    }
  }
  if (raceTimes.distance10km) {
    const seconds = timeToSeconds(raceTimes.distance10km, 10);
    if (seconds > 0) {
      estimates.push({
        vma: calculateVMAFromTime(10, seconds),
        source: `10km en ${raceTimes.distance10km}`,
        priority: 2
      });
    }
  }
  if (raceTimes.distanceHalfMarathon) {
    const seconds = timeToSeconds(raceTimes.distanceHalfMarathon, 21.1);
    if (seconds > 0) {
      estimates.push({
        vma: calculateVMAFromTime(21.1, seconds),
        source: `Semi en ${raceTimes.distanceHalfMarathon}`,
        priority: 3
      });
    }
  }
  if (raceTimes.distanceMarathon) {
    const seconds = timeToSeconds(raceTimes.distanceMarathon, 42.195);
    if (seconds > 0) {
      estimates.push({
        vma: calculateVMAFromTime(42.195, seconds),
        source: `Marathon en ${raceTimes.distanceMarathon}`,
        priority: 4
      });
    }
  }
  if (estimates.length === 0) return null;
  const VMA_MAX = 25;
  const VMA_MIN = 8;
  const validEstimates = estimates.filter((e) => e.vma >= VMA_MIN && e.vma <= VMA_MAX);
  if (validEstimates.length === 0) {
    console.warn("[VMA] Tous les chronos donnent des VMA hors limites:", estimates.map((e) => `${e.source} \u2192 ${e.vma.toFixed(1)}`));
    const closest = estimates.reduce((best, e) => {
      const distToBest = Math.abs(best.vma - 16);
      const distToE = Math.abs(e.vma - 16);
      return distToE < distToBest ? e : best;
    });
    return { vma: Math.min(Math.max(closest.vma, VMA_MIN), VMA_MAX), source: `${closest.source} (corrig\xE9)` };
  }
  validEstimates.sort((a, b) => a.priority - b.priority);
  if (validEstimates.length >= 2) {
    const maxVma = Math.max(...validEstimates.map((e) => e.vma));
    const minVma = Math.min(...validEstimates.map((e) => e.vma));
    if ((maxVma - minVma) / minVma > 0.2) {
      console.warn(`[VMA] Chronos incoh\xE9rents (\xE9cart ${((maxVma - minVma) / minVma * 100).toFixed(0)}%): ${validEstimates.map((e) => `${e.source} \u2192 ${e.vma.toFixed(1)}`).join(", ")} \u2192 on garde le plus fiable`);
      return validEstimates[0];
    }
    const weighted = validEstimates.slice(0, 2);
    const avgVma = weighted[0].vma * 0.6 + weighted[1].vma * 0.4;
    return {
      vma: avgVma,
      source: `Moyenne ${weighted[0].source} et ${weighted[1].source}`
    };
  }
  return validEstimates[0];
};
var getApiKey = () => {
  const key = globalThis.__IMPORT_META_ENV__.VITE_GEMINI_API_KEY;
  if (!key) {
    console.error("Cl\xE9 API Gemini manquante (VITE_GEMINI_API_KEY).");
    throw new Error("Cl\xE9 API Gemini non configur\xE9e.");
  }
  return key;
};
var forceTutoiement = (text) => {
  if (!text) return text;
  const imperatives = [
    // 1er groupe (-ez → -e)
    ["\xE9coutez", "\xE9coute"],
    ["hydratez", "hydrate"],
    ["alimentez", "alimente"],
    ["adaptez", "adapte"],
    ["concentrez", "concentre"],
    ["privil\xE9giez", "privil\xE9gie"],
    ["arr\xEAtez", "arr\xEAte"],
    ["g\xE9rez", "g\xE8re"],
    ["effectuez", "effectue"],
    ["emportez", "emporte"],
    ["pensez", "pense"],
    ["reposez", "repose"],
    ["\xE9tirez", "\xE9tire"],
    ["respectez", "respecte"],
    ["commencez", "commence"],
    ["augmentez", "augmente"],
    ["diminuez", "diminue"],
    ["terminez", "termine"],
    ["acc\xE9l\xE9rez", "acc\xE9l\xE8re"],
    ["portez", "porte"],
    ["forcez", "force"],
    ["choisissez", "choisis"],
    ["\xE9chauffez", "\xE9chauffe"],
    ["alternez", "alterne"],
    ["consultez", "consulte"],
    ["veillez", "veille"],
    ["profitez", "profite"],
    ["entra\xEEnez", "entra\xEEne"],
    ["continuez", "continue"],
    ["marchez", "marche"],
    ["notez", "note"],
    ["essayez", "essaie"],
    ["gardez", "garde"],
    ["pr\xE9parez", "pr\xE9pare"],
    ["r\xE9cup\xE9rez", "r\xE9cup\xE8re"],
    ["variez", "varie"],
    ["contr\xF4lez", "contr\xF4le"],
    ["assurez", "assure"],
    ["ralentissez", "ralentis"],
    ["utilisez", "utilise"],
    ["planifiez", "planifie"],
    ["\xE9vitez", "\xE9vite"],
    ["travaillez", "travaille"],
    ["restez", "reste"],
    ["int\xE9grez", "int\xE8gre"],
    // 2e/3e groupe irréguliers
    ["soyez", "sois"],
    ["faites", "fais"],
    ["prenez", "prends"],
    ["mettez", "mets"],
    ["courez", "cours"],
    ["partez", "pars"],
    ["sentez", "sens"],
    ["maintenez", "maintiens"],
    ["finissez", "finis"],
    ["r\xE9duisez", "r\xE9duis"],
    ["ressentez", "ressens"],
    ["surveillez", "surveille"],
    ["pr\xE9f\xE9rez", "pr\xE9f\xE8re"],
    ["raccourcissez", "raccourcis"],
    ["concentrez", "concentre"],
    ["arr\xEAtez", "arr\xEAte"],
    ["adaptez", "adapte"],
    ["hydratez", "hydrate"],
    ["privil\xE9giez", "privil\xE9gie"],
    ["g\xE9rez", "g\xE8re"],
    ["descendez", "descends"],
    ["montez", "monte"],
    ["poussez", "pousse"],
    ["ajustez", "ajuste"],
    ["respirez", "respire"],
    ["pensez", "pense"],
    ["reposez", "repose"],
    ["buvez", "bois"],
    ["appuyez", "appuie"],
    // Formes avec n'...ez
    ["n'h\xE9sitez", "n'h\xE9site"],
    ["n'oubliez", "n'oublie"]
  ];
  const wordRegex = (word, flags = "g") => new RegExp(`(?<=^|[\\s'"(\\-])${word}(?=[\\s,.:;!?'"()\\-]|$)`, flags);
  let result = text;
  result = result.replace(/-vous(?=\s|[,.:;!?'"]|$)/g, "-toi");
  result = result.replace(
    /\b(pour|de|en|à|sans|chez|sur)\s+(?:(bien|mieux|très|aussi|ne\s+pas)\s+)?vous\b/gi,
    (match, prep, adv) => adv ? `${prep} ${adv} te` : `${prep} te`
  );
  result = result.replace(
    /\b(nous|je|j'|on|qui|il|elle|ce|cela|ça)\s+vous\b/gi,
    (match, before) => `${before} te`
  );
  result = result.replace(/\bVotre\b/g, "Ton").replace(/\bvotre\b/g, "ton");
  result = result.replace(/\bVos\b/g, "Tes").replace(/\bvos\b/g, "tes");
  for (const [vous, tu] of imperatives) {
    try {
      result = result.replace(wordRegex(vous), tu);
      const vousUp = vous.charAt(0).toUpperCase() + vous.slice(1);
      const tuUp = tu.charAt(0).toUpperCase() + tu.slice(1);
      result = result.replace(wordRegex(vousUp), tuUp);
    } catch {
      result = result.replace(
        new RegExp(vous, "gi"),
        (m) => m[0] === m[0].toUpperCase() ? tu.charAt(0).toUpperCase() + tu.slice(1) : tu
      );
    }
  }
  result = result.replace(/(?<=^|[\s'"(\-])([A-Za-zÀ-ÿ]+)ez(?=[\s,.:;!?'"()\-]|$)/g, (match, stem) => {
    const skipWords = ["chez", "assez", "rez", "nez"];
    if (skipWords.includes(match.toLowerCase())) return match;
    return stem + "e";
  });
  result = result.replace(/\bVous\b/g, "Tu").replace(/\bvous\b/g, "tu");
  result = result.replace(/\bte ([aeéèêiïoôuùûyhà])/gi, "t'$1");
  const hybridFixes = [
    [/\btu devez\b/gi, "tu dois"],
    [/\btu pouvez\b/gi, "tu peux"],
    [/\btu avez\b/gi, "tu as"],
    [/\btu allez\b/gi, "tu vas"],
    [/\btu êtes\b/gi, "tu es"],
    [/\btu voulez\b/gi, "tu veux"],
    [/\btu savez\b/gi, "tu sais"],
    [/\btu venez\b/gi, "tu viens"],
    [/\btu prenez\b/gi, "tu prends"],
    [/\btu faites\b/gi, "tu fais"],
    [/\btu ressentez\b/gi, "tu ressens"],
    // "doit tu/te alerter" → "doit t'alerter"
    [/\bdoit\s+tu\s+/gi, "doit t'"],
    // "Ne tu préoccupez pas" → "Ne te préoccupe pas"
    [/\bNe tu (\w+)ez\b/gi, "Ne te $1e"],
    [/\bne tu (\w+)ez\b/gi, "ne te $1e"],
    // "C'est ton sortie" → "C'est ta sortie" (noms féminins avec "ton" au lieu de "ta")
    [/\bton sortie\b/gi, "ta sortie"],
    [/\bton course\b/gi, "ta course"],
    [/\bton séance\b/gi, "ta s\xE9ance"],
    [/\bton vitesse\b/gi, "ta vitesse"],
    [/\bton forme\b/gi, "ta forme"],
    [/\bton progression\b/gi, "ta progression"],
    [/\bton base\b/gi, "ta base"],
    [/\bton foulée\b/gi, "ta foul\xE9e"],
    [/\bton endurance\b/gi, "ton endurance"],
    // "endurance" commence par voyelle → "ton" est correct
    [/\bton meilleure\b/gi, "ta meilleure"],
    [/\bton prochaine\b/gi, "ta prochaine"],
    [/\bton première\b/gi, "ta premi\xE8re"],
    [/\bton dernière\b/gi, "ta derni\xE8re"],
    // "Ne cherchez pas" → "Ne cherche pas" (vouvoiement résiduel impératif négatif)
    [/\bNe cherchez pas\b/g, "Ne cherche pas"],
    [/\bne cherchez pas\b/g, "ne cherche pas"],
    // "Cette séance tu initie" → "Cette séance t'initie"
    [/\btu initie\b/gi, "t'initie"],
    [/\btu aide\b/gi, "t'aide"],
    [/\btu amène\b/gi, "t'am\xE8ne"],
    [/\btu apprend\b/gi, "t'apprend"],
    // "préoccupez-tu" → "préoccupe-toi"
    [/(\w+)ez-tu\b/gi, "$1e-toi"],
    // "allez-y" → "vas-y"
    [/\ballez-y\b/gi, "vas-y"],
    [/\bAllez-y\b/g, "Vas-y"],
    // "arrêt'immédiatement" → "arrête immédiatement" (élision cassée)
    [/\barrêt'imm/gi, "arr\xEAte imm"],
    // Noms féminins avec "ton" au lieu de "ta"
    [/\bton cheville\b/gi, "ta cheville"],
    [/\bton douleur\b/gi, "ta douleur"],
    [/\bton respiration\b/gi, "ta respiration"],
    [/\bton récupération\b/gi, "ta r\xE9cup\xE9ration"],
    [/\bton performance\b/gi, "ta performance"],
    [/\bton préparation\b/gi, "ta pr\xE9paration"],
    [/\bton posture\b/gi, "ta posture"],
    [/\bton technique\b/gi, "ta technique"],
    [/\bton condition\b/gi, "ta condition"],
    [/\bton allure\b/gi, "ton allure"],
    // allure = voyelle → "ton" est correct
    // "ton + nom féminin" catch-all pour les plus courants restants
    [/\bton jambe\b/gi, "ta jambe"],
    [/\bton hanche\b/gi, "ta hanche"],
    [/\bton cuisse\b/gi, "ta cuisse"],
    [/\bton blessure\b/gi, "ta blessure"],
    [/\bton fatigue\b/gi, "ta fatigue"],
    [/\bton capacité\b/gi, "ta capacit\xE9"],
    [/\bton sensation\b/gi, "ta sensation"],
    [/\bton puissance\b/gi, "ta puissance"],
    // Formes mal conjuguées par Gemini
    [/\btu pouve\b/gi, "tu peux"],
    [/\btu peut\b/gi, "tu peux"],
    // Élisions cassées par Gemini
    [/\bcôt'/g, "c\xF4te"],
    [/\bCompléte\b/g, "Compl\xE8te"],
    [/\bcompléte\b/g, "compl\xE8te"],
    // "Ne tu mets pas" → "Ne te mets pas"
    [/\bNe tu mets pas\b/gi, "Ne te mets pas"],
    [/\bNe tu met pas\b/gi, "Ne te met pas"]
  ];
  for (const [pattern, replacement] of hybridFixes) {
    result = result.replace(pattern, replacement);
  }
  return result;
};
var correctFrenchWithAI = async (plan) => {
  try {
    const apiKey = getApiKey();
    const { GoogleGenerativeAI: GoogleGenerativeAI2 } = await Promise.resolve().then(() => (init_stub_generative_ai(), stub_generative_ai_exports));
    const genAI2 = new GoogleGenerativeAI2(apiKey);
    const model = genAI2.getGenerativeModel({ model: "gemini-2.5-flash" });
    const textsToFix = [];
    if (plan.welcomeMessage) textsToFix.push({ path: "welcomeMessage", text: plan.welcomeMessage });
    if (plan.feasibility?.message) textsToFix.push({ path: "feasibility.message", text: plan.feasibility.message });
    (plan.weeks || []).forEach((w, wi) => {
      if (w.weekGoal) textsToFix.push({ path: `weeks[${wi}].weekGoal`, text: w.weekGoal });
      (w.sessions || []).forEach((s, si) => {
        const prefix = `weeks[${wi}].sessions[${si}]`;
        if (s.warmup) textsToFix.push({ path: `${prefix}.warmup`, text: s.warmup });
        if (s.mainSet) textsToFix.push({ path: `${prefix}.mainSet`, text: s.mainSet });
        if (s.cooldown) textsToFix.push({ path: `${prefix}.cooldown`, text: s.cooldown });
        if (s.advice) textsToFix.push({ path: `${prefix}.advice`, text: s.advice });
      });
    });
    if (textsToFix.length === 0) return;
    const payload = textsToFix.map((t, i) => `[${i}] ${t.text}`).join("\n---\n");
    const prompt = `Tu es un correcteur de fran\xE7ais. Corrige UNIQUEMENT la grammaire, l'orthographe et les accords dans les textes ci-dessous.

R\xC8GLES STRICTES :
1. TUTOIEMENT obligatoire partout (tu, ton, ta, tes \u2014 jamais vous/votre/vos)
2. Accords genre/nombre : "ta sortie" (pas "ton sortie"), "ta forme" (pas "ton forme"), "ta vitesse", "ta progression", "ta base", "ta foul\xE9e"
3. Conjugaison tutoiement : "tu dois" (pas "tu devez"), "tu peux" (pas "tu pouvez"), "ne te pr\xE9occupe pas" (pas "ne tu pr\xE9occupez pas")
4. \xC9lision devant voyelle : "t'initie" (pas "tu initie"), "t'aide", "t'am\xE8ne", "t'alerter"
5. NE CHANGE PAS le contenu sportif, les allures (min/km), les distances, les dur\xE9es, les noms d'exercices

R\xE9ponds UNIQUEMENT avec un JSON : {"corrections": {"0": "texte corrig\xE9", "3": "texte corrig\xE9"}}
N'inclus que les textes qui ont \xE9t\xE9 modifi\xE9s. Si rien \xE0 corriger, r\xE9ponds {"corrections": {}}.

TEXTES :
${payload}`;
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
    });
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[FrenchAI] Pas de JSON dans la r\xE9ponse");
      return;
    }
    const parsed = JSON.parse(jsonMatch[0]);
    const corrections = parsed.corrections || {};
    const correctionCount = Object.keys(corrections).length;
    if (correctionCount === 0) {
      console.log("[FrenchAI] \u2705 Aucune correction n\xE9cessaire");
      return;
    }
    for (const [indexStr, correctedText] of Object.entries(corrections)) {
      const idx = parseInt(indexStr);
      if (idx < 0 || idx >= textsToFix.length) continue;
      const entry = textsToFix[idx];
      const originalPaces = entry.text.match(/\d+:\d+\s*min\/km/g) || [];
      const correctedPaces = correctedText.match(/\d+:\d+\s*min\/km/g) || [];
      if (originalPaces.length > 0 && correctedPaces.length < originalPaces.length) {
        console.warn(`[FrenchAI] \u26A0\uFE0F Skip ${entry.path}: allures supprim\xE9es`);
        continue;
      }
      const parts = entry.path.split(".");
      let obj = plan;
      for (let i = 0; i < parts.length - 1; i++) {
        const match = parts[i].match(/(\w+)\[(\d+)\]/);
        if (match) {
          obj = obj[match[1]][parseInt(match[2])];
        } else {
          obj = obj[parts[i]];
        }
      }
      const lastKey = parts[parts.length - 1];
      const lastMatch = lastKey.match(/(\w+)\[(\d+)\]/);
      if (lastMatch) {
        obj[lastMatch[1]][parseInt(lastMatch[2])] = correctedText;
      } else {
        obj[lastKey] = correctedText;
      }
    }
    console.log(`[FrenchAI] \u2705 ${correctionCount} texte(s) corrig\xE9(s)`);
  } catch (err) {
    console.warn("[FrenchAI] Correction \xE9chou\xE9e (non-bloquant):", err);
  }
};
var recalculateSessionDistance = (session) => {
  if (session.type === "Renforcement") return;
  if (!session.duration || !session.targetPace) return;
  const durationStr = session.duration.toString().toLowerCase();
  let durationMinutes = 0;
  const hMatch = durationStr.match(/(\d+)\s*h\s*(\d*)/);
  const minMatch = durationStr.match(/^(\d+)\s*min/);
  if (hMatch) {
    durationMinutes = parseInt(hMatch[1]) * 60 + (hMatch[2] ? parseInt(hMatch[2]) : 0);
  } else if (minMatch) {
    durationMinutes = parseInt(minMatch[1]);
  } else {
    const num = parseInt(durationStr);
    if (num > 0) durationMinutes = num;
  }
  if (durationMinutes <= 0) return;
  const paceStr = session.targetPace.toString();
  const paceParts = paceStr.split(":").map(Number);
  let paceMinPerKm = 0;
  if (paceParts.length === 2 && !isNaN(paceParts[0]) && !isNaN(paceParts[1])) {
    paceMinPerKm = paceParts[0] + paceParts[1] / 60;
  }
  if (paceMinPerKm <= 0) return;
  const calculatedKm = durationMinutes / paceMinPerKm;
  const currentKm = parseKm(session.distance);
  if (currentKm > 0 && Math.abs(calculatedKm - currentKm) / calculatedKm > 0.1) {
    const corrected = Math.round(calculatedKm * 10) / 10;
    console.log(`[PostProcess] Distance corrig\xE9e (tol 10%): "${session.title}" ${currentKm}km \u2192 ${corrected}km (${durationMinutes}min \xE0 ${paceStr}/km)`);
    session.distance = `${corrected} km`;
  } else if (!currentKm || currentKm === 0) {
    session.distance = `${Math.round(calculatedKm * 10) / 10} km`;
  }
};
var postProcessWeekQuality = (week, pacesObj, defaultWeekGoal, planGoal, trailDistance) => {
  if (!week.weekGoal && week.theme) week.weekGoal = week.theme;
  if (!week.weekGoal) {
    const phaseLabels = {
      fondamental: "Construction de la base a\xE9robie",
      developpement: "D\xE9veloppement des qualit\xE9s de vitesse",
      specifique: "Travail \xE0 allure course \u2014 phase cl\xE9 de la pr\xE9paration",
      affutage: "R\xE9duction du volume, maintien des acquis avant la course",
      recuperation: "Semaine de r\xE9cup\xE9ration active \u2014 recharger les batteries"
    };
    week.weekGoal = defaultWeekGoal || phaseLabels[week.phase] || "Progression r\xE9guli\xE8re";
  }
  if (!week.sessions || !Array.isArray(week.sessions)) return;
  week.sessions.forEach((s) => {
    if (s.type === "Running" || s.type === "running") {
      const title = (s.title || "").toLowerCase();
      if (title.includes("sortie longue") || title.includes("long run")) {
        s.type = "Sortie Longue";
      } else if (title.includes("fractionn") || title.includes("vma") || title.includes("seuil") || title.includes("intervalle") || title.includes("fartlek")) {
        s.type = "Fractionn\xE9";
      } else if (title.includes("r\xE9cup") || title.includes("recup")) {
        s.type = "R\xE9cup\xE9ration";
      } else if (title.includes("marche") && title.includes("course")) {
        s.type = "Marche/Course";
      } else {
        s.type = "Jogging";
      }
    }
  });
  const phase = (week.phase || "").toLowerCase();
  if (phase === "fondamental" || phase === "recuperation") {
    week.sessions.forEach((s) => {
      if (s.type === "Renforcement") return;
      const title = (s.title || "").toLowerCase();
      const isSeuil = /seuil|fractionn|vma|intervalle|tempo/i.test(title) || s.type === "Fractionn\xE9";
      if (isSeuil && pacesObj) {
        console.log(`[PostProcess] Phase ${phase}: converting "${s.title}" to footing EF`);
        s.title = phase === "recuperation" ? "Footing de R\xE9cup\xE9ration Active" : "Footing d'Endurance Fondamentale";
        s.type = "Jogging";
        s.intensity = phase === "recuperation" ? "Tr\xE8s facile" : "Facile";
        s.targetPace = pacesObj.efPace;
        s.mainSet = `${Math.max(parseDurationMin(s.duration) - 15, 30)} min en Endurance Fondamentale (${pacesObj.efPace} min/km).`;
        s.warmup = `10 min de footing l\xE9ger \xE0 ${pacesObj.recoveryPace} min/km`;
        s.cooldown = `5 min de retour au calme en marchant. (\xE0 ${pacesObj.recoveryPace} min/km)`;
      }
    });
  }
  week.sessions.forEach((session) => {
    if (session.advice) session.advice = forceTutoiement(session.advice);
    if (session.warmup) session.warmup = forceTutoiement(session.warmup);
    if (session.cooldown) session.cooldown = forceTutoiement(session.cooldown);
    if (session.mainSet) session.mainSet = forceTutoiement(session.mainSet);
    if (session.elevationGain !== void 0 && session.elevationGain !== null) {
      const parsed = typeof session.elevationGain === "number" ? session.elevationGain : parseInt(String(session.elevationGain), 10);
      session.elevationGain = isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    if (session.type === "Renforcement") return;
    if (pacesObj) {
      if (!session.warmup || session.warmup.trim().length < 5) {
        session.warmup = `10 min de footing l\xE9ger \xE0 ${pacesObj.recoveryPace} min/km + gammes \xE9ducatives`;
      } else if (!session.warmup.includes("min/km")) {
        session.warmup = session.warmup.replace(
          /(\d+)\s*min(?:utes?)?\s*(de\s+)?(?:marche\s+rapide|footing|échauffement|marche)/i,
          `$&, \xE0 ${pacesObj.recoveryPace} min/km`
        );
        if (!session.warmup.includes("min/km")) {
          session.warmup += ` (\xE0 ${pacesObj.recoveryPace} min/km)`;
        }
      }
    }
    if (pacesObj) {
      if (!session.cooldown || session.cooldown.trim().length < 5) {
        session.cooldown = `10 min de retour au calme \xE0 ${pacesObj.recoveryPace} min/km + \xE9tirements`;
      } else if (!session.cooldown.includes("min/km")) {
        session.cooldown += ` (\xE0 ${pacesObj.recoveryPace} min/km)`;
      }
    }
    if (pacesObj && session.mainSet && !session.mainSet.includes("min/km")) {
      const paceMap = {
        "Jogging": pacesObj.efPace,
        "R\xE9cup\xE9ration": pacesObj.recoveryPace,
        "Sortie Longue": pacesObj.efPace,
        "Marche/Course": pacesObj.recoveryPace
      };
      const p = paceMap[session.type];
      if (p) session.mainSet += ` (allure : ${p} min/km)`;
    }
    if (!session.targetPace && pacesObj) {
      const paceForType = {
        "Jogging": pacesObj.efPace,
        "R\xE9cup\xE9ration": pacesObj.recoveryPace,
        "Sortie Longue": pacesObj.efPace,
        "Marche/Course": pacesObj.recoveryPace,
        "Fractionn\xE9": pacesObj.vmaPace
      };
      const isFartlekDoux = session.type === "Fractionn\xE9" && /facile|moder/i.test((session.intensity || "").normalize("NFD").replace(/[̀-ͯ]/g, ""));
      if (isFartlekDoux) {
        session.targetPace = pacesObj.efPace;
      } else {
        session.targetPace = paceForType[session.type] || pacesObj.efPace;
      }
    }
    recalculateSessionDistance(session);
  });
  const DAYS_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const isUltraTrailPhase = (trailDistance || 0) >= 70 && ["specifique", "sp\xE9cifique", "developpement", "d\xE9veloppement"].includes((week.phase || "").toLowerCase()) && !week.isRecoveryWeek;
  const slSessions = week.sessions.filter(
    (s) => s.type === "Sortie Longue" || s.type === "Sortie longue" || /sortie\s*longue/i.test(s.type || "") || /sortie\s*longue/i.test(s.title || "")
  );
  if (slSessions.length >= 2) {
    if (isUltraTrailPhase && slSessions.length === 2) {
      slSessions.sort((a, b) => parseDurationMin(b.duration) - parseDurationMin(a.duration));
      const longer = slSessions[0];
      const shorter = slSessions[1];
      const shorterDur = parseDurationMin(shorter.duration);
      const longerDur = parseDurationMin(longer.duration);
      const maxBackToBackDur = Math.min(Math.round(longerDur * 0.6), 150);
      if (shorterDur > maxBackToBackDur) {
        shorter.duration = maxBackToBackDur >= 60 ? `${Math.floor(maxBackToBackDur / 60)}h${maxBackToBackDur % 60 > 0 ? (maxBackToBackDur % 60).toString().padStart(2, "0") : ""}` : `${maxBackToBackDur} min`;
        recalculateSessionDistance(shorter);
        console.log(`[PostProcess] Back-to-back ultra: 2e SL capp\xE9e \xE0 ${maxBackToBackDur}min (60% de la 1\xE8re ou 2h30 max)`);
      }
      if (shorter.intensity === "Difficile") {
        shorter.intensity = "Mod\xE9r\xE9";
      }
      console.log(`[PostProcess] Back-to-back ultra autoris\xE9: "${longer.title}" + "${shorter.title}"`);
    } else {
      slSessions.sort((a, b) => parseDurationMin(b.duration) - parseDurationMin(a.duration));
      for (let i = 1; i < slSessions.length; i++) {
        const extra = slSessions[i];
        console.warn(`[PostProcess] ${slSessions.length} SL d\xE9tect\xE9es \u2192 "${extra.title}" converti en Jogging EF`);
        extra.type = "Jogging";
        extra._dedupedFromSL = true;
        extra.intensity = "Facile";
        const oldTitle = extra.title || "";
        if (!/footing/i.test(oldTitle)) extra.title = "Footing d'Endurance Fondamentale";
        const dur = parseDurationMin(extra.duration);
        if (dur > 60) {
          extra.duration = "50 min";
          if (pacesObj) {
            extra.mainSet = `40 min de course en endurance fondamentale \xE0 ${pacesObj.efPace} min/km. Maintiens une allure confortable.`;
            extra.warmup = `5 min de footing l\xE9ger \xE0 ${pacesObj.recoveryPace} min/km`;
            extra.cooldown = `5 min de retour au calme \xE0 ${pacesObj.recoveryPace} min/km + \xE9tirements`;
          }
        }
        if (pacesObj) extra.targetPace = pacesObj.efPace;
        recalculateSessionDistance(extra);
      }
    }
  }
  const longSessions = week.sessions.filter(
    (s) => s.type === "Sortie Longue" || s.duration && parseDurationMin(s.duration) >= 90 && !["Fractionn\xE9", "VMA", "Intervalle", "Seuil", "Renforcement", "Repos"].some((t) => (s.type || "").includes(t))
  );
  if (longSessions.length >= 2 && !isUltraTrailPhase) {
    longSessions.sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day));
    for (let i = 0; i < longSessions.length - 1; i++) {
      const dayA = DAYS_ORDER.indexOf(longSessions[i].day);
      const dayB = DAYS_ORDER.indexOf(longSessions[i + 1].day);
      if (dayB - dayA <= 1 || dayA === 6 && dayB === 0) {
        const shorter = parseDurationMin(longSessions[i].duration) <= parseDurationMin(longSessions[i + 1].duration) ? longSessions[i] : longSessions[i + 1];
        console.warn(`[PostProcess] 2 s\xE9ances longues cons\xE9cutives (${longSessions[i].day} + ${longSessions[i + 1].day}) \u2192 "${shorter.title}" converti en r\xE9cup\xE9ration`);
        shorter.type = "R\xE9cup\xE9ration";
        shorter._dedupedFromSL = true;
        shorter.intensity = "Facile";
        shorter.title = "Footing de R\xE9cup\xE9ration";
        shorter.duration = "45 min";
        if (pacesObj) {
          shorter.targetPace = pacesObj.recoveryPace;
          shorter.warmup = `10 min de footing l\xE9ger \xE0 ${pacesObj.recoveryPace} min/km`;
          shorter.cooldown = `5 min de marche + \xE9tirements (\xE0 ${pacesObj.recoveryPace} min/km)`;
          shorter.mainSet = `25 min de footing tr\xE8s l\xE9ger \xE0 ${pacesObj.recoveryPace} min/km`;
        }
        shorter.elevationGain = 0;
        recalculateSessionDistance(shorter);
      }
    }
  }
};
var MAX_SESSION_KM = {
  "5K": { deb: 12, inter: 18, conf: 22, expert: 25 },
  "10K": { deb: 15, inter: 22, conf: 25, expert: 28 },
  "Semi": { deb: 18, inter: 22, conf: 25, expert: 28 },
  "Marathon": { deb: 25, inter: 32, conf: 35, expert: 38 },
  "VK": { deb: 10, inter: 14, conf: 16, expert: 18 },
  "TrailSteep": { deb: 12, inter: 16, conf: 20, expert: 22 },
  "Trail<30": { deb: 18, inter: 22, conf: 25, expert: 30 },
  "Trail30+": { deb: 25, inter: 32, conf: 35, expert: 45 },
  "Trail60+": { deb: 30, inter: 40, conf: 50, expert: 55 },
  "Trail100+": { deb: 40, inter: 55, conf: 65, expert: 70 },
  "Hyrox": { deb: 8, inter: 12, conf: 14, expert: 15 },
  "PertePoids": { deb: 8, inter: 12, conf: 14, expert: 15 },
  "Maintien": { deb: 10, inter: 15, conf: 17, expert: 18 }
};
var isFinisherTarget = (t) => {
  const trimmed = (t || "").trim();
  if (!trimmed) return true;
  if (/^finisher$/i.test(trimmed)) return true;
  return !/\d/.test(trimmed);
};
var labelToLevelKey = (label) => {
  const l = (label || "").toLowerCase();
  if (l.includes("d\xE9butant") || l.includes("debutant")) return "deb";
  if (l.includes("expert") || l.includes("performance")) return "expert";
  if (l.includes("confirm\xE9") || l.includes("confirme") || l.includes("comp\xE9tition")) return "conf";
  return "inter";
};
var LEVEL_LABEL = {
  deb: "D\xE9butant (0-1 an)",
  inter: "Interm\xE9diaire (R\xE9gulier)",
  conf: "Confirm\xE9 (Comp\xE9tition)",
  expert: "Expert (Performance)"
};
var enforceSLDay = (week, preferredLongRunDay, logPrefix = "") => {
  if (!week?.sessions || !Array.isArray(week.sessions)) return false;
  const allSL = week.sessions.filter(
    (s) => s.type === "Sortie Longue" || /sortie\s*longue|long\s*run/i.test(s.title || "")
  );
  if (allSL.length === 0) return false;
  let officialSL;
  if (allSL.length > 1) {
    officialSL = [...allSL].sort((a, b) => {
      const da = parseKm(a.distance);
      const db = parseKm(b.distance);
      if (db !== da) return db - da;
      return parseDurationMin(b.duration) - parseDurationMin(a.duration);
    })[0];
    for (const other of allSL) {
      if (other === officialSL) continue;
      console.log(`${logPrefix}S${week.weekNumber} D\xE9dup SL: "${other.title || other.type}" (${other.distance || "?"}) retyp\xE9 Jogging`);
      other.type = "Jogging";
      other.title = (other.title || "").replace(/Sortie\s*Longue|Long\s*Run/gi, "Footing").trim() || "Footing";
      other._dedupedFromSL = true;
    }
  } else {
    officialSL = allSL[0];
  }
  if (officialSL.day === preferredLongRunDay) return true;
  const occupant = week.sessions.find((s) => s.day === preferredLongRunDay && s !== officialSL);
  if (occupant) {
    console.log(`${logPrefix}S${week.weekNumber} Swap SL: "${officialSL.day}" \u2194 "${occupant.day}" (${occupant.title || occupant.type})`);
    occupant.day = officialSL.day;
  }
  console.log(`${logPrefix}S${week.weekNumber} SL forc\xE9e sur ${preferredLongRunDay}`);
  officialSL.day = preferredLongRunDay;
  return true;
};
var applyTargetTimeOverride = (paces, data, vma) => {
  if (!data.targetTime || !data.subGoal) return;
  const normalizedSubGoal = data.subGoal.toLowerCase().replace(/\s+/g, " ").trim();
  const raceDistMap = {
    "5 km": { dist: 5, paceKey: "allureSpecifique5k" },
    "10 km": { dist: 10, paceKey: "allureSpecifique10k" },
    "semi-marathon": { dist: 21.1, paceKey: "allureSpecifiqueSemi" },
    "marathon": { dist: 42.195, paceKey: "allureSpecifiqueMarathon" }
  };
  const info = raceDistMap[normalizedSubGoal];
  if (!info) return;
  const targetSec = timeToSeconds(data.targetTime, info.dist);
  if (targetSec === 0) return;
  const targetPaceSec = targetSec / info.dist;
  const targetPaceStr = secondsToPace(targetPaceSec);
  const previous = paces[info.paceKey];
  if (previous !== targetPaceStr) {
    const vmaPaceSec = 3600 / vma;
    const ratio = vmaPaceSec / targetPaceSec;
    const ratioInfo = ratio > 1 ? ` (cible = ${(ratio * 100).toFixed(0)}% VMA, ambitieux)` : "";
    console.log(`[Paces] Allure sp\xE9 ${data.subGoal} : ${previous} \u2192 ${targetPaceStr} (cible ${data.targetTime})${ratioInfo}`);
    paces[info.paceKey] = targetPaceStr;
  }
};
var MAX_SL_DURATION = {
  "5K": { deb: 50, inter: 60, conf: 70, expert: 75 },
  "10K": { deb: 60, inter: 75, conf: 85, expert: 90 },
  "Semi": { deb: 90, inter: 105, conf: 115, expert: 120 },
  "Marathon": { deb: 150, inter: 170, conf: 190, expert: 200 },
  "Hyrox": { deb: 55, inter: 65, conf: 75, expert: 80 },
  "VK": { deb: 60, inter: 80, conf: 100, expert: 120 },
  "TrailSteep": { deb: 75, inter: 100, conf: 120, expert: 140 },
  "Trail<30": { deb: 90, inter: 120, conf: 140, expert: 150 },
  "Trail30+": { deb: 140, inter: 190, conf: 220, expert: 240 },
  "Trail60+": { deb: 150, inter: 240, conf: 270, expert: 300 },
  "Trail100+": { deb: 180, inter: 300, conf: 360, expert: 480 },
  "PertePoids": { deb: 60, inter: 75, conf: 90, expert: 105 },
  "Maintien": { deb: 50, inter: 70, conf: 80, expert: 90 }
};
var MAX_WEEKLY_VOLUME = {
  "5K": { deb: 25, inter: 40, conf: 46, expert: 60 },
  "10K": { deb: 30, inter: 50, conf: 55, expert: 65 },
  "Semi": { deb: 35, inter: 55, conf: 60, expert: 70 },
  "Marathon": { deb: 45, inter: 65, conf: 75, expert: 85 },
  "Hyrox": { deb: 19, inter: 30, conf: 38, expert: 42 },
  "VK": { deb: 20, inter: 30, conf: 35, expert: 45 },
  "TrailSteep": { deb: 25, inter: 35, conf: 45, expert: 55 },
  "Trail<30": { deb: 35, inter: 50, conf: 55, expert: 65 },
  "Trail30+": { deb: 45, inter: 60, conf: 70, expert: 80 },
  "Trail60+": { deb: 45, inter: 55, conf: 70, expert: 100 },
  "Trail100+": { deb: 55, inter: 75, conf: 95, expert: 120 },
  "PertePoids": { deb: 25, inter: 40, conf: 50, expert: 60 },
  "Maintien": { deb: 25, inter: 40, conf: 45, expert: 55 }
};
var MIN_SL_PROPORTION = {
  "5K": { deb: 0.3, inter: 0.3, conf: 0.3, expert: 0.3 },
  "10K": { deb: 0.3, inter: 0.3, conf: 0.3, expert: 0.3 },
  "Semi": { deb: 0.32, inter: 0.32, conf: 0.3, expert: 0.3 },
  "Marathon": { deb: 0.35, inter: 0.35, conf: 0.33, expert: 0.3 },
  "Hyrox": { deb: 0.28, inter: 0.28, conf: 0.28, expert: 0.25 },
  "VK": { deb: 0.28, inter: 0.28, conf: 0.25, expert: 0.25 },
  "TrailSteep": { deb: 0.3, inter: 0.3, conf: 0.28, expert: 0.28 },
  "Trail<30": { deb: 0.33, inter: 0.33, conf: 0.3, expert: 0.3 },
  "Trail30+": { deb: 0.35, inter: 0.35, conf: 0.33, expert: 0.3 },
  "Trail60+": { deb: 0.38, inter: 0.38, conf: 0.35, expert: 0.33 },
  "Trail100+": { deb: 0.4, inter: 0.4, conf: 0.38, expert: 0.35 },
  "PertePoids": { deb: 0.3, inter: 0.3, conf: 0.3, expert: 0.3 },
  "Maintien": { deb: 0.3, inter: 0.3, conf: 0.3, expert: 0.3 }
};
var MIN_SL_DURATION_MIN = {
  "5K": { deb: 30, inter: 30, conf: 30, expert: 30 },
  "10K": { deb: 35, inter: 35, conf: 35, expert: 35 },
  "Semi": { deb: 40, inter: 45, conf: 45, expert: 45 },
  "Marathon": { deb: 50, inter: 55, conf: 55, expert: 60 },
  "Hyrox": { deb: 30, inter: 35, conf: 35, expert: 40 },
  "VK": { deb: 35, inter: 40, conf: 45, expert: 50 },
  "TrailSteep": { deb: 40, inter: 45, conf: 50, expert: 55 },
  "Trail<30": { deb: 40, inter: 45, conf: 50, expert: 50 },
  "Trail30+": { deb: 50, inter: 60, conf: 65, expert: 70 },
  "Trail60+": { deb: 60, inter: 75, conf: 80, expert: 90 },
  "Trail100+": { deb: 75, inter: 90, conf: 120, expert: 150 },
  "PertePoids": { deb: 30, inter: 30, conf: 30, expert: 30 },
  "Maintien": { deb: 30, inter: 35, conf: 35, expert: 35 }
};
var detectObjectiveFromData = (data) => {
  const goal = (data.goal || "").toLowerCase();
  const sub = (data.subGoal || "").toLowerCase();
  const name = (data.name || "").toLowerCase();
  if (goal.includes("perte")) return "PertePoids";
  if (goal.includes("hyrox")) return "Hyrox";
  if (goal.includes("maintien") || goal.includes("remise")) return "Maintien";
  if (goal.includes("trail") || name.includes("trail")) {
    const td = data.trailDetails?.distance || 0;
    const elev = data.trailDetails?.elevation || 0;
    const ratio = td > 0 ? elev / td : 0;
    if (td > 0 && td <= 5 && ratio >= 150) return "VK";
    if (td > 0 && td <= 15 && ratio >= 80) return "TrailSteep";
    const hoursMatch = (data.targetTime || "").match(/(\d+)\s*h/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    if (td >= 100 || hours >= 16) return "Trail100+";
    if (td >= 60 || hours >= 10) return "Trail60+";
    if (td >= 30 || hours >= 4) return "Trail30+";
    return "Trail<30";
  }
  if ((sub.includes("marathon") || name.includes("marathon")) && !sub.includes("semi") && !name.includes("semi")) return "Marathon";
  if (sub.includes("semi") || name.includes("semi")) return "Semi";
  if (sub.includes("10") || name.includes("10 km") || name.includes("10km")) return "10K";
  if (sub.includes("5") || name.includes("5 km") || name.includes("5km")) return "5K";
  return "10K";
};
var CHRONO_LEVEL_THRESHOLDS = {
  "10K": { M: [50, 42, 36], F: [60, 50, 42] },
  "5K": { M: [30, 25, 21], F: [35, 30, 25] }
};
var LEVEL_RANK = { deb: 0, inter: 1, conf: 2, expert: 3 };
var LEVEL_NAMES = ["deb", "inter", "conf", "expert"];
function classifyByChrono(seconds, dist, isFemale) {
  const min = seconds / 60;
  const T = CHRONO_LEVEL_THRESHOLDS[dist][isFemale ? "F" : "M"];
  if (min > T[0]) return "deb";
  if (min > T[1]) return "inter";
  if (min > T[2]) return "conf";
  return "expert";
}
var detectLevelFromData = (data) => {
  const declared = labelToLevelKey(data.level);
  const isFemale = data.sex === "Femme";
  const c5kSec = data.recentRaceTimes?.distance5km ? timeToSeconds(data.recentRaceTimes.distance5km, 5) : 0;
  const c10kSec = data.recentRaceTimes?.distance10km ? timeToSeconds(data.recentRaceTimes.distance10km, 10) : 0;
  const chronoLevels = [];
  if (c5kSec > 0) chronoLevels.push(classifyByChrono(c5kSec, "5K", isFemale));
  if (c10kSec > 0) chronoLevels.push(classifyByChrono(c10kSec, "10K", isFemale));
  if (chronoLevels.length > 0) {
    const minRank = Math.min(...chronoLevels.map((l) => LEVEL_RANK[l]));
    const chronoLevel = LEVEL_NAMES[minRank];
    if (LEVEL_RANK[chronoLevel] < LEVEL_RANK[declared]) {
      console.log(`[Enforce] Chrono override: declared="${declared}" but chronos imply "${chronoLevel}" (5k=${data.recentRaceTimes?.distance5km || "-"}, 10k=${data.recentRaceTimes?.distance10km || "-"}, ${data.sex || "?"})`);
      return chronoLevel;
    }
  }
  const vma = data.vma || data.estimatedVMA;
  if (vma && vma > 0) {
    const isFemale2 = data.sex === "Femme";
    let vmaLevel;
    if (isFemale2) {
      if (vma < 9.5) vmaLevel = "deb";
      else if (vma < 12.5) vmaLevel = "inter";
      else if (vma < 15) vmaLevel = "conf";
      else vmaLevel = "expert";
    } else {
      if (vma < 11) vmaLevel = "deb";
      else if (vma < 14) vmaLevel = "inter";
      else if (vma < 17) vmaLevel = "conf";
      else vmaLevel = "expert";
    }
    const levelRank = { deb: 0, inter: 1, conf: 2, expert: 3 };
    const rankNames = ["deb", "inter", "conf", "expert"];
    const gap = levelRank[declared] - levelRank[vmaLevel];
    if (gap >= 1) {
      const hardDropThreshold = isFemale2 ? 10.5 : 12;
      const maxDrop = vma < hardDropThreshold ? 2 : 1;
      const adjustedLevel = rankNames[Math.max(levelRank[declared] - maxDrop, levelRank[vmaLevel])];
      console.log(`[Enforce] Level override: declared="${declared}" but VMA=${vma} (${isFemale2 ? "F" : "M"}) implies "${vmaLevel}" (gap=${gap}, maxDrop=${maxDrop}) \u2192 using "${adjustedLevel}"`);
      return adjustedLevel;
    }
  }
  return declared;
};
var getEffectiveLevel = (data) => {
  const map = {
    deb: "D\xE9butant (0-1 an)",
    inter: "Interm\xE9diaire (R\xE9gulier)",
    conf: "Confirm\xE9 (Comp\xE9tition)",
    expert: "Expert (Performance)"
  };
  return map[detectLevelFromData(data)] || data.level || "Interm\xE9diaire (R\xE9gulier)";
};
var formatDurationStr = (minutes) => {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${String(m).padStart(2, "0")} min` : `${h}h00`;
  }
  return `${minutes} min`;
};
var enforceWeekConstraints = (week, targetVolume, questionnaireData) => {
  if (!week.sessions || !Array.isArray(week.sessions)) return;
  const objective = detectObjectiveFromData(questionnaireData);
  const level = detectLevelFromData(questionnaireData);
  const slDurRules = MAX_SL_DURATION[objective];
  if (slDurRules) {
    const maxSlDur = slDurRules[level] || slDurRules.inter;
    const slDurationThreshold = Math.max(maxSlDur - 10, 40);
    week.sessions.forEach((s) => {
      if (s.type === "Renforcement" || s.type === "Repos") return;
      const dur = parseDurationMin(s.duration);
      const isSLByType = s.type === "Sortie Longue";
      const isSLByDuration = dur >= slDurationThreshold && !["Fractionn\xE9", "VMA", "Intervalle", "Seuil"].some((t) => (s.type || "").includes(t));
      const isSLByTitle = /sortie\s*longue|long\s*run/i.test(s.title || "");
      if (!isSLByType && (isSLByDuration || isSLByTitle) && dur > maxSlDur * 0.8 && !s._dedupedFromSL) {
        console.log(`[Enforce] Retype: "${s.type}" \u2192 "Sortie Longue" (dur=${dur}min, title="${s.title}") [${objective} ${level}]`);
        s.type = "Sortie Longue";
      }
      if (s.type !== "Sortie Longue" && !isSLByTitle) return;
      if (dur > maxSlDur) {
        const factor = maxSlDur / dur;
        s.duration = formatDurationStr(maxSlDur);
        const km = parseKm(s.distance);
        if (km > 0) s.distance = `${Math.round(km * factor * 10) / 10} km`;
        console.log(`[Enforce] SL capped: ${dur}min \u2192 ${maxSlDur}min [${objective} ${level}]`);
      }
    });
  }
  const raceDistKm = questionnaireData?.trailDetails?.distance || ((questionnaireData?.subGoal || "").toLowerCase().includes("marathon") && !(questionnaireData?.subGoal || "").toLowerCase().includes("semi") ? 42.2 : (questionnaireData?.subGoal || "").toLowerCase().includes("semi") ? 21.1 : 0);
  if (raceDistKm > 0) {
    const minSLRatios = {
      "Marathon": 0.65,
      // SL ≥ 65% = 27.4 km
      "Semi": 0.75,
      // SL ≥ 75% = 15.8 km
      "Trail<30": 0.55,
      // SL ≥ 55%
      "Trail30+": 0.5,
      // SL ≥ 50%
      "Trail60+": 0.4,
      // SL ≥ 40%
      "Trail100+": 0.3,
      // SL ≥ 30%
      "10K": 0.8,
      // SL ≥ 80% = 8 km
      "5K": 0.9
      // SL ≥ 90% = 4.5 km
    };
    const minRatio = minSLRatios[objective] || 0.5;
    const minSLKm = Math.round(raceDistKm * minRatio);
    const slInWeek = week.sessions.find(
      (s) => s.type === "Sortie Longue" || /sortie\s*longue/i.test(s.type || "") || /sortie\s*longue/i.test(s.title || "")
    );
    if (slInWeek) {
      const slKm = parseKm(slInWeek.distance);
      const isLatePhase = ["specifique", "sp\xE9cifique", "developpement", "d\xE9veloppement"].includes((week.phase || "").toLowerCase());
      if (slKm > 0 && slKm < minSLKm && isLatePhase) {
        console.log(`[Enforce] SL trop courte: ${slKm}km < ${minSLKm}km (min ${Math.round(minRatio * 100)}% de ${raceDistKm}km) \u2192 boost`);
        const efSpeed = (questionnaireData?.vma || 13) * 0.67;
        const maxSlKmFromDur = slDurRules ? Math.round((slDurRules[level] || slDurRules.inter) / 60 * efSpeed * 10) / 10 : minSLKm;
        const targetKm = Math.min(minSLKm, maxSlKmFromDur);
        const factor = targetKm / slKm;
        slInWeek.distance = `${targetKm} km`;
        const currentDur = parseDurationMin(slInWeek.duration);
        const newDur = Math.round(currentDur * factor);
        slInWeek.duration = formatDurationStr(newDur);
        console.log(`[Enforce] SL boost\xE9e: ${slKm}km/${currentDur}min \u2192 ${targetKm}km/${newDur}min`);
      }
    }
  }
  if (slDurRules) {
    const maxSlDur = slDurRules[level] || slDurRules.inter;
    const maxNonSlDur = Math.round(maxSlDur * 0.75);
    week.sessions.forEach((s) => {
      if (s.type === "Renforcement" || s.type === "Repos" || s.type === "Sortie Longue") return;
      const dur = parseDurationMin(s.duration);
      if (dur > maxNonSlDur) {
        const factor = maxNonSlDur / dur;
        s.duration = formatDurationStr(maxNonSlDur);
        const km = parseKm(s.distance);
        if (km > 0) s.distance = `${Math.round(km * factor * 10) / 10} km`;
        console.log(`[Enforce] Non-SL duration capped: ${dur}min \u2192 ${maxNonSlDur}min (${s.type}) [${objective} ${level}]`);
      }
    });
  }
  const slProportionRules = MIN_SL_PROPORTION[objective];
  const slMinDurRules = MIN_SL_DURATION_MIN[objective];
  if (slProportionRules && slMinDurRules) {
    const minProportion = slProportionRules[level] || slProportionRules.inter;
    const minSlDur = slMinDurRules[level] || slMinDurRules.inter;
    const runningSessions = week.sessions.filter(
      (s) => s.type !== "Renforcement" && s.type !== "Repos"
    );
    const slSession = runningSessions.find(
      (s) => s.type === "Sortie Longue" || /sortie\s*longue|long\s*run/i.test(s.title || "")
    );
    if (slSession && runningSessions.length > 1) {
      const slDur = parseDurationMin(slSession.duration);
      const slKm = parseKm(slSession.distance);
      const totalKm = runningSessions.reduce((sum, s) => {
        const km = parseKm(s.distance);
        return sum + km;
      }, 0);
      const targetSlKm = totalKm > 0 ? Math.round(totalKm * minProportion * 10) / 10 : 0;
      if (slKm > 0 && totalKm > 0 && slKm < targetSlKm) {
        const deficit = targetSlKm - slKm;
        const otherRunningSessions = runningSessions.filter((s) => s !== slSession);
        const otherTotalKm = otherRunningSessions.reduce((sum, s) => {
          const km = parseKm(s.distance);
          return sum + km;
        }, 0);
        if (otherTotalKm > 0 && otherRunningSessions.length > 0) {
          const reductionFactor = (otherTotalKm - deficit) / otherTotalKm;
          if (reductionFactor >= 0.65) {
            otherRunningSessions.forEach((s) => {
              const km = parseKm(s.distance);
              if (km > 0) {
                const newKm = Math.round(km * reductionFactor * 10) / 10;
                const dur = parseDurationMin(s.duration);
                if (dur > 0) {
                  s.duration = formatDurationStr(Math.round(dur * reductionFactor));
                }
                s.distance = `${newKm} km`;
              }
            });
            slSession.distance = `${targetSlKm} km`;
            if (slDur > 0) {
              const newSlDur = Math.round(slDur * (targetSlKm / slKm));
              slSession.duration = formatDurationStr(newSlDur);
            }
            console.log(`[Enforce] SL proportion: ${slKm}km \u2192 ${targetSlKm}km (${(minProportion * 100).toFixed(0)}% of ${totalKm}km) [${objective} ${level}]`);
          }
        }
      }
      if (slDur > 0 && slDur < minSlDur) {
        const factor = minSlDur / slDur;
        slSession.duration = formatDurationStr(minSlDur);
        if (slKm > 0) {
          slSession.distance = `${Math.round(slKm * factor * 10) / 10} km`;
        }
        console.log(`[Enforce] SL min duration: ${slDur}min \u2192 ${minSlDur}min [${objective} ${level}]`);
      }
      const maxOtherDur = Math.max(...runningSessions.filter((s) => s !== slSession).map((s) => parseDurationMin(s.duration)));
      const currentSlDur = parseDurationMin(slSession.duration);
      if (currentSlDur <= maxOtherDur && maxOtherDur > 0) {
        const newSlDur = maxOtherDur + 10;
        const maxAllowed = slDurRules ? slDurRules[level] || slDurRules.inter : 180;
        const finalDur = Math.min(newSlDur, maxAllowed);
        if (finalDur > currentSlDur) {
          const factor = finalDur / currentSlDur;
          slSession.duration = formatDurationStr(finalDur);
          const km = parseKm(slSession.distance);
          if (km > 0) slSession.distance = `${Math.round(km * factor * 10) / 10} km`;
          console.log(`[Enforce] SL must be longest: ${currentSlDur}min \u2192 ${finalDur}min [${objective} ${level}]`);
        }
      }
    }
  }
  const sessionRules = MAX_SESSION_KM[objective];
  if (sessionRules) {
    const maxKm = sessionRules[level] || sessionRules.inter;
    week.sessions.forEach((s) => {
      if (s.type === "Renforcement" || s.type === "Repos") return;
      const km = parseKm(s.distance);
      if (km > maxKm) {
        const factor = maxKm / km;
        s.distance = `${maxKm} km`;
        const dur = parseDurationMin(s.duration);
        if (dur > 0) s.duration = formatDurationStr(Math.round(dur * factor));
        console.log(`[Enforce] Session capped: ${km}km \u2192 ${maxKm}km [${objective} ${level}]`);
      }
    });
  }
  const isTrail = objective.startsWith("Trail") || objective === "VK" || objective === "TrailSteep";
  if (isTrail) {
    const trackTypes = ["Fractionn\xE9", "VMA", "Intervalle", "Seuil"];
    const runningSessions = week.sessions.filter(
      (s) => s.type !== "Renforcement" && s.type !== "Repos"
    );
    let freedDPlus = 0;
    runningSessions.forEach((s) => {
      if (objective === "VK") return;
      const isTrack = trackTypes.some((t) => (s.type || "").includes(t)) || trackTypes.some((t) => (s.title || "").includes(t)) || s.mainSet && /\bVMA\b/.test(s.mainSet) && !/sortie longue/i.test(s.title || "");
      const isRecovery = /récup|recovery|décrassage|régénér/i.test(s.title || "") || s.intensity === "Tr\xE8s facile" || s.intensity === "Tr\xE8s Facile";
      if ((isTrack || isRecovery) && (s.elevationGain || 0) > 0) {
        freedDPlus += s.elevationGain;
        s.elevationGain = 0;
      }
    });
    if (freedDPlus > 0) {
      const eligible = runningSessions.filter((s) => {
        const isTrack = trackTypes.some((t) => (s.type || "").includes(t)) || trackTypes.some((t) => (s.title || "").includes(t));
        const isRecovery = /récup|recovery|décrassage|régénér/i.test(s.title || "") || s.intensity === "Tr\xE8s facile";
        return !isTrack && !isRecovery;
      });
      eligible.sort((a, b) => parseDurationMin(b.duration) - parseDurationMin(a.duration));
      if (eligible[0]) {
        eligible[0].elevationGain = (eligible[0].elevationGain || 0) + freedDPlus;
        console.log(`[Enforce] Week ${week.weekNumber}: ${freedDPlus}m D+ freed from track/recovery \u2192 added to "${eligible[0].title}"`);
      }
    }
  }
  const trailElev = questionnaireData?.trailDetails?.elevation;
  if (trailElev !== void 0 && trailElev !== null && parseInt(trailElev) === 0) {
    let removedDPlus = 0;
    week.sessions.forEach((s) => {
      if (s.elevationGain && s.elevationGain > 0) {
        removedDPlus += s.elevationGain;
        s.elevationGain = 0;
      }
    });
    if (removedDPlus > 0) {
      console.log(`[Enforce] Course 0m D+ \u2192 supprim\xE9 ${removedDPlus}m D+ des s\xE9ances S${week.weekNumber}`);
    }
  }
  const hardSessions = week.sessions.filter(
    (s) => s.intensity === "Difficile" || s.intensity === "Haute" || s.intensity === "Tr\xE8s difficile"
  );
  if (hardSessions.length > 2) {
    const priorityTypes = ["Fractionn\xE9", "VMA", "Seuil", "Intervalle"];
    hardSessions.sort((a, b) => {
      const aPri = priorityTypes.some((t) => (a.type || "").includes(t)) ? 0 : 1;
      const bPri = priorityTypes.some((t) => (b.type || "").includes(t)) ? 0 : 1;
      return aPri - bPri;
    });
    for (let i = 2; i < hardSessions.length; i++) {
      hardSessions[i].intensity = "Mod\xE9r\xE9";
      console.log(`[Enforce] Week ${week.weekNumber}: ${hardSessions[i].type} ${hardSessions[i].day} downgraded to Mod\xE9r\xE9 (max 2 hard)`);
    }
  }
  const volumeRules = MAX_WEEKLY_VOLUME[objective];
  if (volumeRules) {
    const absMaxVolume = volumeRules[level] || volumeRules.inter;
    const runSess = week.sessions.filter((s) => s.type !== "Renforcement" && s.type !== "Repos");
    const currVol = runSess.reduce((sum, s) => {
      const km = parseKm(s.distance);
      return sum + (km > 0 ? km : 0);
    }, 0);
    if (currVol > absMaxVolume && currVol > 0) {
      const factor = absMaxVolume / currVol;
      runSess.forEach((s) => {
        const km = parseKm(s.distance);
        if (km > 0) {
          s.distance = `${Math.round(km * factor * 10) / 10} km`;
          const dur = parseDurationMin(s.duration);
          if (dur > 0) s.duration = formatDurationStr(Math.round(dur * factor));
        }
      });
      console.log(`[Enforce] Week ${week.weekNumber} VOLUME CAP: ${Math.round(currVol)}km \u2192 ${absMaxVolume}km [max ${objective} ${level}]`);
    }
  }
  if (targetVolume <= 0) return;
  const isWalkRun = (s) => /marche.*course|course.*marche|walk.*run/i.test(s.title || "");
  const runSessions = week.sessions.filter((s) => s.type !== "Renforcement" && s.type !== "Repos");
  const currentVolume = runSessions.reduce((sum, s) => {
    const km = parseKm(s.distance);
    return sum + (km > 0 ? km : 0);
  }, 0);
  if (currentVolume <= 0) return;
  if (currentVolume > targetVolume * 1.1) {
    const factor = targetVolume / currentVolume;
    runSessions.forEach((s) => {
      const km = parseKm(s.distance);
      if (km > 0) {
        s.distance = `${Math.round(km * factor * 10) / 10} km`;
        const dur = parseDurationMin(s.duration);
        if (dur > 0) s.duration = formatDurationStr(Math.round(dur * factor));
      }
    });
    console.log(`[Enforce] Week ${week.weekNumber} volume: ${Math.round(currentVolume)}km \u2192 ${targetVolume}km (factor ${factor.toFixed(2)})`);
  } else if (currentVolume < targetVolume * 0.8) {
    const slMaxDur = slDurRules ? slDurRules[level] || slDurRules.inter : 999;
    const nonSlMaxDur = Math.round(slMaxDur * 0.75);
    const factor = targetVolume / currentVolume;
    runSessions.forEach((s) => {
      const km = parseKm(s.distance);
      if (km > 0) {
        const sessionFactor = isWalkRun(s) ? Math.min(factor, 1.3) : factor;
        const newKm = Math.round(km * sessionFactor * 10) / 10;
        const maxKm = sessionRules ? sessionRules[level] || sessionRules.inter : 999;
        s.distance = `${Math.min(newKm, maxKm)} km`;
        const dur = parseDurationMin(s.duration);
        if (dur > 0) {
          const newDur = Math.round(dur * sessionFactor);
          const isSL = s.type === "Sortie Longue" || /sortie\s*longue|long\s*run/i.test(s.title || "");
          const durCap = isSL ? slMaxDur : nonSlMaxDur;
          const cappedDur = isWalkRun(s) ? Math.min(newDur, 50) : Math.min(newDur, durCap);
          s.duration = formatDurationStr(cappedDur);
          if (cappedDur < newDur && dur > 0) {
            const durFactor = cappedDur / newDur;
            const cappedKm = Math.round(Math.min(newKm, maxKm) * durFactor * 10) / 10;
            s.distance = `${cappedKm} km`;
          }
        }
      }
    });
    console.log(`[Enforce] Week ${week.weekNumber} volume UP: ${Math.round(currentVolume)}km \u2192 ${targetVolume}km (factor ${factor.toFixed(2)}, SL cap ${slMaxDur}min)`);
  }
  const MIN_AVG_KM_PER_SESSION = 3.5;
  const finalRunSessions = week.sessions.filter((s) => s.type !== "Renforcement" && s.type !== "Repos");
  if (finalRunSessions.length >= 3) {
    const finalVol = finalRunSessions.reduce((sum, s) => {
      const km = parseKm(s.distance);
      return sum + (km > 0 ? km : 0);
    }, 0);
    const avgKm = finalVol / finalRunSessions.length;
    if (avgKm < MIN_AVG_KM_PER_SESSION && finalRunSessions.length > 2) {
      const sorted = [...finalRunSessions].sort((a, b) => {
        const kmA = parseKm(a.distance);
        const kmB = parseKm(b.distance);
        return kmA - kmB;
      });
      let sessionsToConvert = 0;
      let testRunCount = finalRunSessions.length;
      let testVol = finalVol;
      for (const s of sorted) {
        if (testRunCount <= 2) break;
        const km = parseKm(s.distance);
        testVol -= km;
        testRunCount--;
        sessionsToConvert++;
        if (testVol / testRunCount >= MIN_AVG_KM_PER_SESSION) break;
      }
      if (sessionsToConvert > 0) {
        let freedKm = 0;
        for (let i = 0; i < sessionsToConvert; i++) {
          const s = sorted[i];
          const km = parseKm(s.distance);
          freedKm += km;
          s.type = "Repos";
          s.title = "Repos Actif \u2014 R\xE9cup\xE9ration";
          s.duration = "20-30 min";
          s.distance = void 0;
          s.targetPace = void 0;
          s.elevationGain = 0;
          s.intensity = "Tr\xE8s Facile";
          s.warmup = void 0;
          s.mainSet = "Marche douce, \xE9tirements, automassage au rouleau (foam roller) ou mobilit\xE9 articulaire. Pas de course.";
          s.cooldown = void 0;
          s.advice = "Ce jour de repos actif permet \xE0 ton corps de r\xE9cup\xE9rer et de s'adapter aux efforts de la semaine. La r\xE9cup\xE9ration fait partie int\xE9grante de l'entra\xEEnement.";
          console.log(`[Enforce] S${week.weekNumber} ${s.day}: "${s.title}" \u2192 Repos actif (avg ${avgKm.toFixed(1)}km/s\xE9ance trop bas)`);
        }
        if (freedKm > 0) {
          const keepSessions = week.sessions.filter(
            (s) => s.type !== "Renforcement" && s.type !== "Repos"
          );
          const keepVol = keepSessions.reduce((sum, s) => {
            const km = parseKm(s.distance);
            return sum + (km > 0 ? km : 0);
          }, 0);
          if (keepVol > 0 && keepSessions.length > 0) {
            keepSessions.forEach((s) => {
              const km = parseKm(s.distance);
              if (km > 0) {
                const share = km / keepVol * freedKm;
                const newKm = Math.round((km + share) * 10) / 10;
                const dur = parseDurationMin(s.duration);
                if (dur > 0) {
                  s.duration = formatDurationStr(Math.round(dur * (newKm / km)));
                }
                s.distance = `${newKm} km`;
              }
            });
            console.log(`[Enforce] S${week.weekNumber}: ${sessionsToConvert} s\xE9ance(s) \u2192 repos, ${freedKm.toFixed(1)}km redistribu\xE9s`);
          }
        }
      }
    }
  }
  const phase = (week.phase || "").toLowerCase();
  const goalForFrac = (questionnaireData?.goal || "").toLowerCase();
  const isPdpOrMaintien = goalForFrac.includes("perte") || goalForFrac.includes("maintien") || goalForFrac.includes("remise");
  if ((phase === "developpement" || phase === "specifique") && !isPdpOrMaintien) {
    const hasIntensity = week.sessions.some(
      (s) => s.type === "Fractionn\xE9" || /fractionn|vma|intervalle|seuil|tempo/i.test(s.title || "") || /fractionn|vma|intervalle|seuil/i.test(s.type || "")
    );
    if (!hasIntensity) {
      const candidates = week.sessions.filter(
        (s) => s.type !== "Renforcement" && s.type !== "Repos" && s.type !== "Sortie Longue" && !/sortie\s*longue/i.test(s.title || "")
      );
      const slSess = week.sessions.filter(
        (s) => (s.type === "Sortie Longue" || /sortie\s*longue/i.test(s.title || "")) && s.type !== "Renforcement"
      );
      const convertTarget = candidates.length > 0 ? candidates.sort((a, b) => parseDurationMin(a.duration) - parseDurationMin(b.duration))[0] : slSess.length >= 2 ? slSess.sort((a, b) => parseDurationMin(a.duration) - parseDurationMin(b.duration))[0] : null;
      if (convertTarget) {
        const oldType = convertTarget.type;
        const dur = parseDurationMin(convertTarget.duration);
        convertTarget.type = "Fractionn\xE9";
        convertTarget._dedupedFromSL = true;
        convertTarget.intensity = "Difficile";
        const sub = (questionnaireData?.subGoal || "").toLowerCase();
        const isMarathonFrac = sub.includes("marathon") && !sub.includes("semi");
        const isSemiFrac = sub.includes("semi");
        const isTrailFrac = goalForFrac.includes("trail");
        if (phase === "developpement") {
          convertTarget.title = "Fractionn\xE9 VMA \u2014 D\xE9veloppement";
          if (isTrailFrac) {
            convertTarget.mainSet = `\xC9chauffement 15 min EF, puis 6 \xD7 1 min en c\xF4te (effort 9/10) / descente trot, puis 10 min retour au calme.`;
            convertTarget.advice = `S\xE9ance cl\xE9 Trail : les mont\xE9es courtes d\xE9veloppent ta puissance et ta VMA en conditions sp\xE9cifiques.`;
          } else {
            convertTarget.mainSet = `\xC9chauffement 15 min EF, puis 8 \xD7 30" vite / 30" r\xE9cup trot, puis 10 min retour au calme.`;
            convertTarget.advice = `S\xE9ance cl\xE9 de d\xE9veloppement. Les 30/30 d\xE9veloppent ta VMA. Cours les fractions "vite" (effort 8-9/10), r\xE9cup\xE8re en trottinant.`;
          }
        } else {
          if (isMarathonFrac) {
            convertTarget.title = "Fractionn\xE9 Allure Marathon \u2014 Phase Sp\xE9cifique";
            convertTarget.mainSet = `\xC9chauffement 15 min EF, puis 3 \xD7 10 min \xE0 allure marathon (r=3 min trot), puis 10 min retour au calme.`;
            convertTarget.advice = `S\xE9ance cl\xE9 : les blocs \xE0 allure marathon te pr\xE9parent au rythme de course. Reste r\xE9gulier et contr\xF4l\xE9.`;
          } else if (isSemiFrac) {
            convertTarget.title = "Fractionn\xE9 Allure Semi \u2014 Phase Sp\xE9cifique";
            convertTarget.mainSet = `\xC9chauffement 15 min EF, puis 3 \xD7 8 min \xE0 allure semi-marathon (r=2 min trot), puis 10 min retour au calme.`;
            convertTarget.advice = `S\xE9ance cl\xE9 : les blocs \xE0 allure semi t'habituent au rythme de course. Reste fluide et r\xE9gulier.`;
          } else if (isTrailFrac) {
            convertTarget.title = "Fractionn\xE9 Sp\xE9cifique Trail";
            convertTarget.mainSet = `\xC9chauffement 15 min EF, puis 4 \xD7 5 min en mont\xE9e (effort seuil) / descente technique, puis 10 min retour au calme.`;
            convertTarget.advice = `S\xE9ance sp\xE9cifique Trail : travaille la mont\xE9e au seuil et la technique de descente. G\xE8re ton effort en c\xF4te.`;
          } else {
            const distLabel = sub.includes("5") ? "5km" : "10km";
            convertTarget.title = `Fractionn\xE9 Allure ${distLabel} \u2014 Phase Sp\xE9cifique`;
            convertTarget.mainSet = `\xC9chauffement 15 min EF, puis 3 \xD7 8 min \xE0 allure ${distLabel} (r=2 min trot), puis 10 min retour au calme.`;
            convertTarget.advice = `S\xE9ance cl\xE9 de ta pr\xE9paration sp\xE9cifique. Les blocs \xE0 allure ${distLabel} t'habituent au rythme de course. Reste r\xE9gulier.`;
          }
        }
        convertTarget.warmup = "15 min de footing progressif + gammes \xE9ducatives";
        convertTarget.cooldown = "10 min de retour au calme en trottinant + \xE9tirements";
        recalculateSessionDistance(convertTarget);
        console.log(`[Enforce] S${week.weekNumber} (${phase}): Pas de fractionn\xE9 \u2192 converti "${oldType}" en "${convertTarget.title}"`);
      }
    }
  }
  const footings = week.sessions.filter(
    (s) => s.type === "Jogging" && s.type !== "Renforcement" && s.type !== "Repos"
  );
  if (footings.length >= 2) {
    const km0 = parseKm(footings[0].distance);
    const km1 = parseKm(footings[1].distance);
    if (km0 > 0 && km1 > 0 && Math.abs(km0 - km1) < 0.6) {
      const totalFootingKm = km0 + km1;
      const longer = Math.round(totalFootingKm * 0.57 * 10) / 10;
      const shorter = Math.round((totalFootingKm - longer) * 10) / 10;
      const isHilly = (s) => /vallonn|côte|sentier|trail|technique|progressif/i.test(s.title || "");
      const hilly0 = isHilly(footings[0]);
      const hilly1 = isHilly(footings[1]);
      if (hilly0 && !hilly1) {
        footings[0].distance = `${shorter} km`;
        footings[1].distance = `${longer} km`;
      } else if (hilly1 && !hilly0) {
        footings[0].distance = `${longer} km`;
        footings[1].distance = `${shorter} km`;
      } else {
        footings[0].distance = `${longer} km`;
        footings[1].distance = `${shorter} km`;
      }
      footings.forEach((s) => {
        const newKm = parseKm(s.distance);
        const oldKm = s === footings[0] ? km0 : km1;
        if (oldKm > 0) {
          const dur = parseDurationMin(s.duration);
          if (dur > 0) s.duration = formatDurationStr(Math.round(dur * (newKm / oldKm)));
        }
      });
      console.log(`[Enforce] S${week.weekNumber}: Footing variation ${km0}/${km1}km \u2192 ${parseKm(footings[0].distance)}/${parseKm(footings[1].distance)}km`);
    }
  }
};
var enforceFullPlanConstraints = (weeks, weeklyVolumes, questionnaireData) => {
  if (!weeks || weeks.length < 2) return;
  const objective = detectObjectiveFromData(questionnaireData);
  const level = detectLevelFromData(questionnaireData);
  const sessionRules = MAX_SESSION_KM[objective];
  const maxKm = sessionRules ? sessionRules[level] || sessionRules.inter : 999;
  const getWeekKm = (week) => {
    return (week.sessions || []).reduce((sum, s) => {
      if (s.type === "Renforcement" || s.type === "Repos") return sum;
      const km = parseKm(s.distance);
      return sum + (km > 0 ? km : 0);
    }, 0);
  };
  const scaleWeekVolume = (week, targetKm) => {
    const currentKm = getWeekKm(week);
    if (currentKm <= 0 || Math.abs(currentKm - targetKm) < 1) return;
    const factor = targetKm / currentKm;
    (week.sessions || []).forEach((s) => {
      if (s.type === "Renforcement" || s.type === "Repos") return;
      const km = parseKm(s.distance);
      if (km > 0) {
        const newKm = Math.min(Math.round(km * factor * 10) / 10, maxKm);
        s.distance = `${newKm} km`;
        const dur = parseDurationMin(s.duration);
        if (dur > 0) s.duration = formatDurationStr(Math.round(dur * factor));
      }
    });
  };
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i].phase !== "affutage") continue;
    const prevKm = getWeekKm(weeks[i - 1]);
    const currKm = getWeekKm(weeks[i]);
    if (currKm > prevKm && prevKm > 0) {
      const target = Math.round(prevKm * 0.85);
      scaleWeekVolume(weeks[i], target);
      console.log(`[Guard] Aff\xFBtage S${weeks[i].weekNumber}: ${Math.round(currKm)}km \u2192 ${target}km (\u2264 prev ${Math.round(prevKm)}km)`);
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < weeks.length - 1; i++) {
      const currKm = getWeekKm(weeks[i]);
      const nextKm = getWeekKm(weeks[i + 1]);
      if (currKm <= 5 || nextKm <= 5) continue;
      const increase = (nextKm - currKm) / currKm;
      const isFromRecovery = weeks[i].isRecoveryWeek || weeks[i].phase === "recuperation";
      const isToRecovery = weeks[i + 1].isRecoveryWeek || weeks[i + 1].phase === "recuperation";
      const isTaperEntry = weeks[i + 1].phase === "affutage" && weeks[i].phase !== "affutage";
      if (increase < 0 && (isToRecovery || isTaperEntry)) continue;
      if (isFromRecovery) {
        const preRecovKm = i > 0 ? getWeekKm(weeks[i - 1]) : currKm;
        if (nextKm > preRecovKm) {
          scaleWeekVolume(weeks[i + 1], Math.round(preRecovKm));
          console.log(`[Guard] Post-recovery S${weeks[i + 1].weekNumber}: ${Math.round(nextKm)}km \u2192 ${Math.round(preRecovKm)}km (capped at pre-recovery volume)`);
        }
        continue;
      }
      if (increase > 0.15) {
        const targetNext = Math.round(currKm * 1.15);
        if (targetNext < nextKm) {
          scaleWeekVolume(weeks[i + 1], targetNext);
          console.log(`[Guard] Progression S${weeks[i + 1].weekNumber}: ${Math.round(nextKm)}km \u2192 ${targetNext}km (+15% max from ${Math.round(currKm)}km)`);
        }
      }
    }
  }
  if (sessionRules) {
    weeks.forEach((w) => {
      (w.sessions || []).forEach((s) => {
        if (s.type === "Renforcement" || s.type === "Repos") return;
        const km = parseKm(s.distance);
        if (km > maxKm) {
          const factor = maxKm / km;
          s.distance = `${maxKm} km`;
          const dur = parseDurationMin(s.duration);
          if (dur > 0) s.duration = formatDurationStr(Math.round(dur * factor));
        }
      });
    });
  }
};
var formatTargetTime = (raw) => {
  if (!raw) return "";
  const t = raw.trim();
  if (/h|min/i.test(t)) return t;
  const n = parseInt(t);
  if (!isNaN(n) && n > 0) return `${n}min`;
  return "";
};
var buildPlanName = (data, planDurationWeeks) => {
  const goal = data.goal || "";
  if (goal.includes("Perte")) {
    return `Programme Perte de Poids \u2014 ${planDurationWeeks} semaines`;
  }
  if (goal.includes("Maintien") || goal.includes("Remise")) {
    return `Programme Remise en Forme \u2014 ${planDurationWeeks} semaines`;
  }
  const formattedTime = formatTargetTime(data.targetTime);
  if (goal.includes("Trail") && data.trailDetails) {
    const d = data.trailDetails.distance || 0;
    const e = data.trailDetails.elevation || 0;
    const time = formattedTime ? ` en ${formattedTime}` : " \u2014 Finisher";
    return `Pr\xE9paration Trail ${d}km / ${e}m D+${time} \u2014 ${planDurationWeeks} sem.`;
  }
  if (goal.includes("Hyrox")) {
    const time = formattedTime ? ` \u2014 Objectif ${formattedTime}` : "";
    return `Pr\xE9pa Course Hyrox${time} \u2014 ${planDurationWeeks} sem.`;
  }
  if (data.subGoal) {
    const time = formattedTime ? ` en ${formattedTime}` : " \u2014 Finisher";
    return `Pr\xE9paration ${data.subGoal}${time} \u2014 ${planDurationWeeks} sem.`;
  }
  return `Plan d'entra\xEEnement \u2014 ${planDurationWeeks} semaines`;
};
var distributeElevationToSessions = (sessions, weekTargetElevation, level = "inter") => {
  if (weekTargetElevation <= 0) return;
  const trackTypes = ["Fractionn\xE9", "VMA", "Intervalle", "Seuil"];
  const runningSessions = sessions.filter((s) => s.type !== "Renforcement" && s.type !== "Repos");
  if (runningSessions.length === 0) return;
  runningSessions.forEach((s) => {
    const title = (s.title || "").toLowerCase();
    const isRecovery = /récup|recovery|décrassage|régénér/i.test(s.title || "") || s.intensity === "Tr\xE8s facile" || s.intensity === "Tr\xE8s Facile";
    const isCotesSession = /côte|hill|montée|mont[ée]e/i.test(title);
    const isTrack = !isCotesSession && (trackTypes.some((t) => title.includes(t.toLowerCase())) || trackTypes.some((t) => (s.type || "").includes(t)));
    if (isRecovery) {
      s.elevationGain = 0;
      s._dplusRole = "ZERO";
    } else if (isTrack) {
      s.elevationGain = 0;
      s._dplusRole = "ZERO";
    } else if (isCotesSession) {
      s._dplusRole = "TRAIL_OR_SL";
    } else if (/trail|côte|dénivelé|montagne|sentier|d\+/i.test(s.title || "") || /sortie longue/i.test(s.title || "") || s.type === "Sortie Longue") {
      s._dplusRole = "TRAIL_OR_SL";
    } else if (/vallonn|colline|mont[ée]/i.test(title)) {
      s._dplusRole = "VALLONNE";
    } else {
      s._dplusRole = "FOOTING";
    }
  });
  const eligible = runningSessions.filter((s) => s._dplusRole !== "ZERO");
  if (eligible.length === 0) {
    const longest = runningSessions.reduce((best, s) => (parseInt(s.duration) || 0) > (parseInt(best?.duration) || 0) ? s : best, null);
    if (longest) longest.elevationGain = weekTargetElevation;
    runningSessions.forEach((s) => {
      delete s._dplusRole;
    });
    return;
  }
  eligible.sort((a, b) => parseDurationMin(b.duration) - parseDurationMin(a.duration));
  const mainSession = eligible.find((s) => s._dplusRole === "TRAIL_OR_SL") || eligible[0];
  const secondSession = eligible.find((s) => s !== mainSession && s._dplusRole === "TRAIL_OR_SL") || eligible.find((s) => s !== mainSession && s._dplusRole === "VALLONNE") || (eligible.length > 1 ? eligible.find((s) => s !== mainSession) : null);
  eligible.forEach((s) => {
    s.elevationGain = 0;
  });
  mainSession.elevationGain = Math.round(weekTargetElevation * 0.65);
  if (secondSession) {
    secondSession.elevationGain = Math.round(weekTargetElevation * 0.2);
    const others = eligible.filter((s) => s !== mainSession && s !== secondSession);
    const remaining = weekTargetElevation - mainSession.elevationGain - secondSession.elevationGain;
    if (others.length > 0) {
      const per = Math.round(remaining / others.length);
      others.forEach((s) => {
        s.elevationGain = per;
      });
    } else {
      mainSession.elevationGain += remaining;
    }
  } else {
    mainSession.elevationGain = weekTargetElevation;
  }
  const MIN_DPLUS_THRESHOLD = 40;
  let redistributed = 0;
  eligible.forEach((s) => {
    if (s !== mainSession && s.elevationGain > 0 && s.elevationGain < MIN_DPLUS_THRESHOLD) {
      console.log(`[D+ Micro] "${s.title}": ${s.elevationGain}m < ${MIN_DPLUS_THRESHOLD}m \u2192 set to 0, redistributed to main`);
      redistributed += s.elevationGain;
      s.elevationGain = 0;
    }
  });
  if (redistributed > 0) {
    mainSession.elevationGain += redistributed;
  }
  const dplusPerMinByLevel = {
    "deb": 5,
    // Débutant : max 5m/min (ex: 50min → max 250m D+)
    "inter": 7,
    // Intermédiaire : max 7m/min (ex: 50min → max 350m)
    "conf": 9,
    // Confirmé : max 9m/min (ex: 50min → max 450m)
    "expert": 12
    // Expert : max 12m/min (ex: 50min → max 600m)
  };
  const dplusPerMin = dplusPerMinByLevel[level] || dplusPerMinByLevel["inter"];
  const maxDplusAbsByLevel = {
    "deb": 400,
    // Débutant : jamais > 400m D+ en une séance
    "inter": 800,
    // Intermédiaire : jamais > 800m
    "conf": 1500,
    // Confirmé : jamais > 1500m
    "expert": 2500
    // Expert : jamais > 2500m
  };
  const maxDplusAbs = maxDplusAbsByLevel[level] || maxDplusAbsByLevel["inter"];
  eligible.forEach((s) => {
    const durationMin = parseDurationMin(s.duration);
    if (durationMin > 0 && s.elevationGain > 0) {
      const maxElevForDuration = Math.round(durationMin * dplusPerMin);
      const effectiveMax = Math.min(maxElevForDuration, maxDplusAbs);
      if (s.elevationGain > effectiveMax) {
        console.log(`[D+ Cap] "${s.title}" ${s.duration}: ${s.elevationGain}m \u2192 capped to ${effectiveMax}m (${durationMin}min \xD7 ${dplusPerMin} m/min, abs max ${maxDplusAbs}m) [${level}]`);
        s.elevationGain = effectiveMax;
      }
    }
  });
  eligible.forEach((s) => {
    if (s.mainSet && s.elevationGain > 0) {
      s.mainSet = s.mainSet.replace(/D\+\s*(?:cible\s+(?:de\s+)?)?(?:de\s+)?\d+\s*m/gi, `D+ cible de ${s.elevationGain}m`);
    }
  });
  const totalAssigned = runningSessions.reduce((sum, s) => sum + (s.elevationGain || 0), 0);
  console.log(`[D+ Distribute] Cible: ${weekTargetElevation}m \u2192 Assign\xE9: ${totalAssigned}m | Main: "${mainSession.title}" ${mainSession.elevationGain}m${secondSession ? ` | Second: "${secondSession.title}" ${secondSession.elevationGain}m` : ""}`);
  runningSessions.forEach((s) => {
    delete s._dplusRole;
  });
};
var calculatePeriodizationPlan = (totalWeeks, currentVolume, level, goal, subGoal, trailDistance, trailElevation, targetTime, age, weight, vma, sessionsPerWeek, params) => {
  let progressionRate = level === "D\xE9butant (0-1 an)" ? 0.08 : level === "Interm\xE9diaire (R\xE9gulier)" ? 0.08 : level === "Confirm\xE9 (Comp\xE9tition)" ? 0.1 : 0.12;
  const height = params?.height || 0;
  const bmiForRate = weight && height > 0 ? weight / (height / 100) ** 2 : 0;
  if (bmiForRate >= 35) {
    progressionRate = Math.min(progressionRate, 0.05);
    console.log(`[Periodization] IMC ${bmiForRate.toFixed(1)} \u2265 35 \u2192 progression r\xE9duite \xE0 ${(progressionRate * 100).toFixed(0)}%/sem`);
  } else if (bmiForRate >= 30) {
    progressionRate = Math.min(progressionRate, 0.06);
    console.log(`[Periodization] IMC ${bmiForRate.toFixed(1)} \u2265 30 \u2192 progression r\xE9duite \xE0 ${(progressionRate * 100).toFixed(0)}%/sem`);
  }
  const sub = (subGoal || "").toLowerCase();
  const isMarathon = sub.includes("marathon") && !sub.includes("semi");
  const isSemi = sub.includes("semi");
  const is10k = sub.includes("10");
  const isTrail = goal.includes("Trail");
  const isUltraLong = isTrail && (trailDistance || 0) >= 100;
  const isUltra = isTrail && (trailDistance || 0) >= 60;
  const isTrail30Plus = isTrail && (trailDistance || 0) >= 30;
  const isPertePoids = goal.includes("Perte");
  const isMaintien = goal.includes("Maintien") || goal.includes("Remise");
  const dPlusPerKm = trailDistance && trailDistance > 0 && trailElevation ? trailElevation / trailDistance : 0;
  const isVK = isTrail && (trailDistance || 0) <= 5 && dPlusPerKm >= 150;
  const isTrailSteep = !isVK && isTrail && (trailDistance || 0) <= 15 && dPlusPerKm >= 80;
  const isHyrox = goal.includes("Hyrox");
  let maxVolume;
  if (level === "D\xE9butant (0-1 an)") {
    if (isHyrox) maxVolume = 16;
    else if (isPertePoids) maxVolume = 20;
    else if (isMaintien) maxVolume = 25;
    else if (isVK) maxVolume = 20;
    else if (isTrailSteep) maxVolume = 25;
    else if (isMarathon) maxVolume = 45;
    else if (isUltraLong) maxVolume = 55;
    else if (isUltra) maxVolume = 45;
    else if (isTrail30Plus) maxVolume = 45;
    else if (isTrail) maxVolume = 35;
    else if (isSemi) maxVolume = 35;
    else if (is10k) maxVolume = 30;
    else maxVolume = 25;
  } else if (level === "Expert (Performance)") {
    if (isHyrox) maxVolume = 38;
    else if (isPertePoids) maxVolume = 45;
    else if (isMaintien) maxVolume = 55;
    else if (isVK) maxVolume = 45;
    else if (isTrailSteep) maxVolume = 55;
    else if (isUltraLong) maxVolume = 120;
    else if (isUltra) maxVolume = 100;
    else if (isMarathon) maxVolume = 85;
    else if (isTrail30Plus) maxVolume = 80;
    else if (isTrail) maxVolume = 65;
    else if (isSemi) maxVolume = 70;
    else if (is10k) maxVolume = 65;
    else maxVolume = 60;
  } else if (level === "Confirm\xE9 (Comp\xE9tition)") {
    if (isHyrox) maxVolume = 30;
    else if (isPertePoids) maxVolume = 35;
    else if (isMaintien) maxVolume = 45;
    else if (isVK) maxVolume = 35;
    else if (isTrailSteep) maxVolume = 45;
    else if (isUltraLong) maxVolume = 95;
    else if (isUltra) maxVolume = 70;
    else if (isMarathon) maxVolume = 75;
    else if (isTrail30Plus) maxVolume = 70;
    else if (isTrail) maxVolume = 55;
    else if (isSemi) maxVolume = 60;
    else if (is10k) maxVolume = 55;
    else maxVolume = 46;
  } else {
    if (isHyrox) maxVolume = 23;
    else if (isPertePoids) maxVolume = 30;
    else if (isMaintien) maxVolume = 40;
    else if (isVK) maxVolume = 30;
    else if (isTrailSteep) maxVolume = 35;
    else if (isUltraLong) maxVolume = 75;
    else if (isUltra) maxVolume = 55;
    else if (isMarathon) maxVolume = 65;
    else if (isTrail30Plus) maxVolume = 60;
    else if (isTrail) maxVolume = 50;
    else if (isSemi) maxVolume = 55;
    else if (is10k) maxVolume = 50;
    else maxVolume = 40;
  }
  if (sessionsPerWeek && sessionsPerWeek > 0) {
    const runningSess = Math.max(1, sessionsPerWeek - 1);
    const sessionFactors = { 1: 0.7, 2: 0.85, 3: 1, 4: 1.1, 5: 1.2 };
    const sessionFactor = sessionFactors[Math.min(runningSess, 5)] || 1;
    if (sessionFactor !== 1) {
      const before = maxVolume;
      maxVolume = Math.round(maxVolume * sessionFactor);
      console.log(`[Periodization] Session factor: ${runningSess} running sessions \u2192 \xD7${sessionFactor} \u2192 ${before}km \u2192 ${maxVolume}km`);
    }
  }
  const baseMaxVolume = maxVolume;
  let totalReduction = 1;
  const isFinisher = isFinisherTarget(targetTime);
  if (isFinisher && !isPertePoids && !isMaintien) {
    totalReduction *= 0.75;
    console.log(`[Periodization] Finisher detected \u2192 factor \xD70.75`);
  }
  if (age && age > 0) {
    if (age < 18) {
      totalReduction *= 0.7;
      console.log(`[Periodization] Ado (${age} ans) \u2192 factor \xD70.70`);
    } else if (age >= 55) {
      totalReduction *= 0.85;
      console.log(`[Periodization] Senior (${age} ans) \u2192 factor \xD70.85`);
    }
  }
  const bmi = bmiForRate;
  if (bmi >= 35) {
    totalReduction *= 0.65;
    console.log(`[Periodization] IMC ${bmi.toFixed(1)} (\u226535) \u2192 factor \xD70.65`);
  } else if (bmi >= 30) {
    totalReduction *= 0.8;
    console.log(`[Periodization] IMC ${bmi.toFixed(1)} (\u226530) \u2192 factor \xD70.80`);
  } else if (weight && weight > 85 && bmi < 30) {
    const weightFactor = weight >= 100 ? 0.85 : 0.9;
    totalReduction *= weightFactor;
    console.log(`[Periodization] Poids ${weight}kg (IMC ${bmi.toFixed(1)}) \u2192 factor \xD7${weightFactor}`);
  }
  totalReduction = Math.max(totalReduction, 0.6);
  if (totalReduction < 1) {
    const originalMax = maxVolume;
    maxVolume = Math.round(maxVolume * totalReduction);
    console.log(`[Periodization] R\xE9duction combin\xE9e: ${originalMax}km \xD7 ${totalReduction.toFixed(2)} = ${maxVolume}km (base=${baseMaxVolume}km)`);
  }
  if (vma && vma > 0 && sessionsPerWeek && sessionsPerWeek > 0) {
    let objectiveKey2 = isVK ? "VK" : isTrailSteep ? "TrailSteep" : isUltraLong ? "Trail100+" : isUltra ? "Trail60+" : isTrail30Plus ? "Trail30+" : isTrail ? "Trail<30" : isMarathon ? "Marathon" : isSemi ? "Semi" : is10k ? "10K" : isPertePoids ? "PertePoids" : isMaintien ? "Maintien" : "5K";
    if (objectiveKey2 === "PertePoids" || objectiveKey2 === "Maintien") {
      const vmaSource = params?.vmaSource || "";
      const hasMarathonChrono = vmaSource.toLowerCase().includes("marathon") && !vmaSource.toLowerCase().includes("semi");
      const hasSemiChrono = vmaSource.toLowerCase().includes("semi");
      const has10kChrono = vmaSource.toLowerCase().includes("10k") || vmaSource.toLowerCase().includes("10 km");
      if (hasMarathonChrono) {
        objectiveKey2 = "Marathon";
      } else if (hasSemiChrono) {
        objectiveKey2 = "Semi";
      } else if (has10kChrono) {
        objectiveKey2 = "10K";
      }
      if (objectiveKey2 !== "PertePoids" && objectiveKey2 !== "Maintien") {
        console.log(`[Periodization] PdP/Maintien avec exp\xE9rience course \u2192 caps bas\xE9s sur "${objectiveKey2}"`);
      }
    }
    const levelKey = labelToLevelKey(level);
    const slMaxDur = MAX_SL_DURATION[objectiveKey2]?.[levelKey] || MAX_SL_DURATION[objectiveKey2]?.inter || 90;
    const nonSlMaxDur = Math.round(slMaxDur * 0.75);
    const efSpeedKmH = vma * 0.75;
    const runningSessions = Math.max(1, sessionsPerWeek - 1);
    const realisticFactor = 0.7;
    const slMaxKm = slMaxDur * realisticFactor / 60 * efSpeedKmH;
    const otherMaxKm = (runningSessions - 1) * nonSlMaxDur * realisticFactor / 60 * efSpeedKmH;
    const vmaBasedMaxVolume = Math.round(slMaxKm + otherMaxKm);
    if (vmaBasedMaxVolume < maxVolume) {
      let safeVmaCap = vmaBasedMaxVolume;
      if (currentVolume > 0 && currentVolume > vmaBasedMaxVolume) {
        const generousEfSpeed = vma * 0.85;
        const maxAchievable = runningSessions === 1 ? Math.round(slMaxDur / 60 * generousEfSpeed) : Math.round(slMaxDur / 60 * generousEfSpeed + (runningSessions - 1) * nonSlMaxDur / 60 * generousEfSpeed);
        safeVmaCap = Math.max(vmaBasedMaxVolume, Math.min(currentVolume, maxAchievable));
        console.log(`[Periodization] VMA-duration cap: raw=${vmaBasedMaxVolume}km, currentVol=${currentVolume}km, achievable@85%VMA=${maxAchievable}km \u2192 safe=${safeVmaCap}km`);
      }
      if (safeVmaCap < maxVolume) {
        console.log(`[Periodization] VMA-duration cap: VMA=${vma}, ${runningSessions} running sess, SL\u2264${slMaxDur}min, EF=${efSpeedKmH.toFixed(1)}km/h \u2192 max ${safeVmaCap}km (was ${maxVolume}km)`);
        maxVolume = safeVmaCap;
      }
    }
  }
  if (currentVolume > 0 && maxVolume < currentVolume) {
    console.log(`[Periodization] maxVolume ${maxVolume}km < currentVolume ${currentVolume}km \u2192 raised to currentVolume`);
    maxVolume = currentVolume;
  }
  if (currentVolume > 0 && maxVolume <= currentVolume * 1.05) {
    const progressionTarget = Math.round(currentVolume * 1.15);
    const safeTarget = Math.min(progressionTarget, baseMaxVolume);
    if (safeTarget > maxVolume) {
      console.log(`[Periodization] Progression minimale: maxVolume ${maxVolume}km \u2192 ${safeTarget}km (currentVol ${currentVolume} \xD7 1.15, cap ${baseMaxVolume})`);
      maxVolume = safeTarget;
    }
  }
  const vmaHardCap = maxVolume;
  const raceDistanceKm = isTrail ? trailDistance || 10 : isMarathon ? 42.2 : isSemi ? 21.1 : is10k ? 10 : 5;
  const minViableVolume = raceDistanceKm <= 5 ? 15 : raceDistanceKm <= 10 ? 22 : raceDistanceKm <= 21.1 ? 32 : raceDistanceKm <= 42.2 ? 38 : 40;
  let effectiveVmaCap = vmaHardCap;
  const hasSpecificTimeTarget = !!targetTime && !isFinisherTarget(targetTime);
  const isLowVolForTimedLongRace = currentVolume > 0 && currentVolume < minViableVolume * 0.3 && raceDistanceKm >= 15 && hasSpecificTimeTarget;
  if (isLowVolForTimedLongRace) {
    const slMaxDurMC = 165;
    const otherMaxDurMC = Math.round(slMaxDurMC * 0.75);
    const efSpeedMC = 5.8;
    const realisticFactorMC = 0.8;
    const runningSessionsMC = Math.max(1, (sessionsPerWeek ?? 3) - 1);
    const slMaxKmMC = slMaxDurMC * realisticFactorMC / 60 * efSpeedMC;
    const otherMaxKmMC = (runningSessionsMC - 1) * otherMaxDurMC * realisticFactorMC / 60 * efSpeedMC;
    const vmaCapMC = Math.round(slMaxKmMC + otherMaxKmMC);
    if (vmaCapMC > effectiveVmaCap) {
      console.log(`[Periodization] Mode marche-course activ\xE9 (currentVol ${currentVolume}km, race ${raceDistanceKm}km) : cap ${effectiveVmaCap}km \u2192 ${vmaCapMC}km`);
      effectiveVmaCap = vmaCapMC;
    }
  }
  if (maxVolume < minViableVolume) {
    const safeMin = Math.min(minViableVolume, effectiveVmaCap);
    if (safeMin > maxVolume) {
      console.log(`[Periodization] maxVolume ${maxVolume}km < plancher viable ${minViableVolume}km \u2192 raised to ${safeMin}km (VMA cap: ${effectiveVmaCap}km)`);
      maxVolume = safeMin;
    }
  }
  const rawMinPeakVolume = Math.round(raceDistanceKm * 1.5);
  const objectiveKey = isVK ? "VK" : isTrailSteep ? "TrailSteep" : isUltraLong ? "Trail100+" : isUltra ? "Trail60+" : isTrail30Plus ? "Trail30+" : isTrail ? "Trail<30" : isMarathon ? "Marathon" : isSemi ? "Semi" : is10k ? "10K" : isPertePoids ? "PertePoids" : isMaintien ? "Maintien" : "5K";
  const absoluteCap = MAX_WEEKLY_VOLUME[objectiveKey]?.expert || 100;
  const minPeakVolume = Math.min(rawMinPeakVolume, absoluteCap, effectiveVmaCap);
  if (maxVolume < minPeakVolume) {
    console.log(`[Periodization] maxVolume ${maxVolume}km < min peak (${minPeakVolume}km, raw=${rawMinPeakVolume}, cap=${absoluteCap}) \u2192 raised`);
    maxVolume = minPeakVolume;
  }
  const phases = [];
  let fondamentalWeeks, developpementWeeks, specifiqueWeeks, affutageWeeks;
  if (isMaintien || isPertePoids) {
    fondamentalWeeks = Math.max(1, Math.floor(totalWeeks * 0.45));
    developpementWeeks = Math.max(1, totalWeeks - fondamentalWeeks);
    specifiqueWeeks = 0;
    affutageWeeks = 0;
  } else if (totalWeeks <= 4) {
    fondamentalWeeks = 1;
    developpementWeeks = Math.max(1, totalWeeks - 3);
    specifiqueWeeks = 1;
    affutageWeeks = 1;
  } else if (totalWeeks <= 6) {
    fondamentalWeeks = Math.max(1, Math.floor(totalWeeks * 0.3));
    developpementWeeks = Math.max(1, Math.floor(totalWeeks * 0.35));
    affutageWeeks = 1;
    specifiqueWeeks = Math.max(1, totalWeeks - fondamentalWeeks - developpementWeeks - affutageWeeks);
  } else {
    fondamentalWeeks = Math.max(2, Math.floor(totalWeeks * 0.3));
    developpementWeeks = Math.max(2, Math.floor(totalWeeks * 0.35));
    specifiqueWeeks = Math.max(2, Math.floor(totalWeeks * 0.25));
    affutageWeeks = Math.max(1, totalWeeks - fondamentalWeeks - developpementWeeks - specifiqueWeeks);
    if (totalWeeks <= 14 && affutageWeeks > 2) {
      const excess = affutageWeeks - 2;
      affutageWeeks = 2;
      specifiqueWeeks += excess;
    }
    const maxAffutageByDist = raceDistanceKm <= 10 ? 1 : raceDistanceKm <= 21.1 ? 2 : raceDistanceKm <= 42.2 ? 3 : 4;
    if (affutageWeeks > maxAffutageByDist) {
      const excess = affutageWeeks - maxAffutageByDist;
      affutageWeeks = maxAffutageByDist;
      specifiqueWeeks += excess;
    }
    const lvlKeyForTaper = labelToLevelKey(level);
    const isHighLevelTaper = lvlKeyForTaper === "conf" || lvlKeyForTaper === "expert";
    const needLongTaper = (isSemi || isMarathon) && isHighLevelTaper && maxVolume >= 50;
    if (needLongTaper && affutageWeeks < 3) {
      const wanted = 3 - affutageWeeks;
      const fromSpec = Math.min(wanted, Math.max(0, specifiqueWeeks - 2));
      const fromDev = Math.min(wanted - fromSpec, Math.max(0, developpementWeeks - 2));
      const actualGain = fromSpec + fromDev;
      if (actualGain > 0) {
        affutageWeeks += actualGain;
        specifiqueWeeks -= fromSpec;
        developpementWeeks -= fromDev;
        console.log(`[Periodization] Taper 3 sem forc\xE9 (${isSemi ? "Semi" : "Marathon"} ${lvlKeyForTaper} vol${maxVolume}): affutage ${affutageWeeks - actualGain}\u2192${affutageWeeks} (de spec:${fromSpec} + dev:${fromDev})`);
      }
    }
  }
  for (let i = 0; i < totalWeeks; i++) {
    if (i < fondamentalWeeks) {
      phases.push("fondamental");
    } else if (i < fondamentalWeeks + developpementWeeks) {
      phases.push("developpement");
    } else if (i < fondamentalWeeks + developpementWeeks + specifiqueWeeks) {
      phases.push("specifique");
    } else {
      phases.push("affutage");
    }
  }
  const firstAffutageWeek = totalWeeks - affutageWeeks + 1;
  const recoveryWeeks = [];
  const recoveryInterval = level === "D\xE9butant (0-1 an)" ? 3 : 4;
  const firstRecoveryWeek = Math.max(recoveryInterval, 4);
  for (let i = firstRecoveryWeek; i <= totalWeeks - 2; i += recoveryInterval) {
    if (i >= firstAffutageWeek) continue;
    recoveryWeeks.push(i);
    phases[i - 1] = "recuperation";
  }
  const lastRecov = recoveryWeeks.length > 0 ? recoveryWeeks[recoveryWeeks.length - 1] : 0;
  const weeksAfterLastRecov = totalWeeks - lastRecov;
  if (weeksAfterLastRecov > recoveryInterval && totalWeeks - 1 > lastRecov) {
    const extraRecov = lastRecov + recoveryInterval;
    const isRacePlan = !(isMaintien || isPertePoids);
    const minWeek = isRacePlan ? totalWeeks - affutageWeeks : totalWeeks;
    if (extraRecov <= minWeek && extraRecov <= totalWeeks - 1) {
      recoveryWeeks.push(extraRecov);
      phases[extraRecov - 1] = "recuperation";
    }
  }
  const weeklyVolumes = [];
  const peakWeekIndex = totalWeeks - affutageWeeks - 1;
  let progressionWeeks = 0;
  for (let i = 0; i <= peakWeekIndex; i++) {
    if (!recoveryWeeks.includes(i + 1)) progressionWeeks++;
  }
  const idealStartVolume = maxVolume / Math.pow(1 + progressionRate, Math.max(1, progressionWeeks - 1));
  let minStartVolume = level === "D\xE9butant (0-1 an)" ? 8 : level === "Interm\xE9diaire (R\xE9gulier)" ? 15 : level === "Confirm\xE9 (Comp\xE9tition)" ? 20 : 25;
  if (bmiForRate >= 35 && minStartVolume > 5) {
    minStartVolume = Math.max(5, Math.round(minStartVolume * 0.6));
    console.log(`[Periodization] IMC ${bmiForRate.toFixed(1)} \u2265 35 \u2192 minStartVolume r\xE9duit \xE0 ${minStartVolume}km`);
  } else if (bmiForRate >= 30 && minStartVolume > 6) {
    minStartVolume = Math.max(6, Math.round(minStartVolume * 0.75));
    console.log(`[Periodization] IMC ${bmiForRate.toFixed(1)} \u2265 30 \u2192 minStartVolume r\xE9duit \xE0 ${minStartVolume}km`);
  }
  let startVolume = Math.max(idealStartVolume, minStartVolume);
  if (currentVolume > 0) {
    const currentVolumeFloor = Math.round(currentVolume * 0.85);
    startVolume = Math.max(startVolume, currentVolumeFloor);
    const volumeCap = Math.max(currentVolume, minStartVolume);
    startVolume = Math.min(startVolume, volumeCap, maxVolume * 0.65);
    startVolume = Math.max(startVolume, Math.min(currentVolumeFloor, maxVolume * 0.9));
  } else {
    startVolume = Math.min(startVolume, maxVolume * 0.65);
  }
  let effectiveRate = progressionRate;
  if (progressionWeeks > 0 && startVolume > 0 && maxVolume > startVolume) {
    const targetPeakAt = Math.round(progressionWeeks * 0.7);
    const neededRate = Math.pow(maxVolume / startVolume, 1 / Math.max(1, targetPeakAt - 1)) - 1;
    if (neededRate < progressionRate && neededRate > 0.05) {
      effectiveRate = neededRate;
      console.log(`[Periodization] Rate adaptatif: ${(progressionRate * 100).toFixed(1)}% \u2192 ${(effectiveRate * 100).toFixed(1)}% (pic vis\xE9 \xE0 S~${targetPeakAt}/${progressionWeeks})`);
    }
  }
  let currentVol = startVolume;
  let weeksAtPeak = 0;
  for (let i = 0; i < totalWeeks; i++) {
    const weekNum = i + 1;
    if (recoveryWeeks.includes(weekNum)) {
      const prevWeekVol = weeklyVolumes.length > 0 ? weeklyVolumes[weeklyVolumes.length - 1] : currentVol;
      const recoveryFactor = prevWeekVol >= 60 ? 0.8 : prevWeekVol >= 30 ? 0.78 : 0.8;
      weeklyVolumes.push(Math.round(prevWeekVol * recoveryFactor));
      weeksAtPeak = 0;
    } else if (phases[i] === "affutage") {
      const affutageProgress = (weekNum - (totalWeeks - affutageWeeks)) / affutageWeeks;
      const reductionFactor = 1 - (0.25 + affutageProgress * 0.25);
      weeklyVolumes.push(Math.round(currentVol * reductionFactor));
    } else {
      const atPeak = currentVol >= maxVolume * 0.98;
      if (atPeak) {
        weeksAtPeak++;
        const ondulationFactor = weeksAtPeak % 2 === 0 ? 0.95 : 1;
        weeklyVolumes.push(Math.round(maxVolume * ondulationFactor));
      } else {
        weeklyVolumes.push(Math.round(currentVol));
      }
      currentVol = Math.min(currentVol * (1 + effectiveRate), maxVolume);
    }
  }
  const actualPeak = Math.max(...weeklyVolumes);
  if (actualPeak < minPeakVolume * 0.85) {
    const neededRate = Math.pow(minPeakVolume / startVolume, 1 / Math.max(1, progressionWeeks - 1)) - 1;
    const adjustedRate = Math.min(neededRate, 0.2);
    if (adjustedRate > progressionRate) {
      console.log(`[Periodization] Peak ${actualPeak}km < 85% of minPeak ${minPeakVolume}km \u2192 adjusting rate from ${(progressionRate * 100).toFixed(1)}% to ${(adjustedRate * 100).toFixed(1)}%`);
      let adjustedVol = startVolume;
      for (let i = 0; i < totalWeeks; i++) {
        const weekNum = i + 1;
        if (recoveryWeeks.includes(weekNum)) {
          const prevVol = i > 0 ? weeklyVolumes[i - 1] : adjustedVol;
          const recovFactor = prevVol >= 60 ? 0.8 : prevVol >= 30 ? 0.78 : 0.8;
          weeklyVolumes[i] = Math.round(prevVol * recovFactor);
        } else if (phases[i] === "affutage") {
          const affutageProgress = (weekNum - (totalWeeks - affutageWeeks)) / affutageWeeks;
          const reductionFactor = 1 - (0.25 + affutageProgress * 0.25);
          weeklyVolumes[i] = Math.round(adjustedVol * reductionFactor);
        } else {
          weeklyVolumes[i] = Math.round(adjustedVol);
          adjustedVol = Math.min(adjustedVol * (1 + adjustedRate), maxVolume);
        }
      }
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < weeklyVolumes.length - 1; i++) {
      const curr = weeklyVolumes[i];
      const next = weeklyVolumes[i + 1];
      if (curr <= 5 || next <= 5) continue;
      const increase = (next - curr) / curr;
      if (increase < 0) continue;
      const isFromRecovery = recoveryWeeks.includes(i + 1) || phases[i] === "recuperation";
      if (isFromRecovery) {
        const preRecovVol = i > 0 ? weeklyVolumes[i - 1] : curr;
        const maxPostRecov = Math.min(preRecovVol, Math.round(curr * 1.15));
        if (next > maxPostRecov) {
          weeklyVolumes[i + 1] = maxPostRecov;
        }
      } else if (increase > 0.15) {
        weeklyVolumes[i + 1] = Math.round(curr * 1.15);
      }
    }
  }
  let weeklyElevationTarget;
  if (isTrail && trailElevation && trailElevation > 0) {
    if (phases.length !== totalWeeks) {
      console.warn(`[Periodization Trail] phases/totalWeeks mismatch: ${phases.length} vs ${totalWeeks}`);
    }
    weeklyElevationTarget = [];
    for (let i = 0; i < totalWeeks; i++) {
      const wn = i + 1;
      const phase = phases[i];
      const t = calculateWeekTargetElevation(wn, totalWeeks, trailElevation, level, params?.currentWeeklyElevation, phase);
      weeklyElevationTarget.push(t);
    }
    console.debug(`[Periodization Trail] weeklyElevationTarget calcul\xE9: [${weeklyElevationTarget.join(", ")}] (race D+ ${trailElevation}m, current ${params?.currentWeeklyElevation || 0}m/sem)`);
  }
  return { weeklyVolumes, weeklyPhases: phases, recoveryWeeks, weeklyElevationTarget };
};
var createGenerationContext = (data, paces, vma, vmaSource, totalWeeks) => {
  const declaredVolume = data.currentWeeklyVolume;
  const goal = data.goal || "";
  const isPertePoids = goal.includes("Perte");
  const isMaintien = goal.includes("Maintien") || goal.includes("Remise");
  const effectiveLevelKey = detectLevelFromData({ ...data, vma });
  const effectiveLevel = LEVEL_LABEL[effectiveLevelKey] || data.level || "Interm\xE9diaire (R\xE9gulier)";
  const isTrail = goal.includes("Trail");
  const trailDist = data.trailDetails?.distance || 0;
  const trailElev = data.trailDetails?.elevation || 0;
  const trailRatio = trailDist > 0 ? trailElev / trailDist : 0;
  const isVKCtx = isTrail && trailDist <= 5 && trailRatio >= 150;
  const isTrailSteepCtx = !isVKCtx && isTrail && trailDist <= 15 && trailRatio >= 80;
  const isUltra = isTrail && trailDist >= 60;
  const isTrail30Plus = isTrail && trailDist >= 30;
  const sub = (data.subGoal || "").toLowerCase();
  const isMarathon = sub.includes("marathon") && !sub.includes("semi");
  const isSemi = sub.includes("semi");
  let defaultVolume;
  const is10k = sub.includes("10");
  if (effectiveLevelKey === "deb") {
    defaultVolume = isPertePoids ? 10 : isMaintien ? 12 : isVKCtx ? 8 : isTrailSteepCtx ? 10 : isUltra ? 20 : isTrail30Plus ? 18 : isMarathon ? 20 : isSemi ? 18 : isTrail ? 15 : is10k ? 15 : 12;
  } else if (effectiveLevelKey === "inter") {
    defaultVolume = isPertePoids ? 15 : isMaintien ? 22 : isVKCtx ? 15 : isTrailSteepCtx ? 18 : isUltra ? 35 : isTrail30Plus ? 30 : isMarathon ? 38 : isSemi ? 32 : isTrail ? 22 : 28;
  } else if (effectiveLevelKey === "conf") {
    defaultVolume = isPertePoids ? 20 : isMaintien ? 25 : isVKCtx ? 20 : isTrailSteepCtx ? 25 : isUltra ? 50 : isTrail30Plus ? 40 : isMarathon ? 48 : isSemi ? 38 : isTrail ? 30 : 38;
  } else {
    defaultVolume = isPertePoids ? 25 : isMaintien ? 30 : isVKCtx ? 25 : isTrailSteepCtx ? 30 : isUltra ? 60 : isTrail30Plus ? 50 : isMarathon ? 58 : isSemi ? 42 : isTrail ? 40 : 48;
  }
  if ((isPertePoids || isMaintien) && vmaSource) {
    const src = vmaSource.toLowerCase();
    let raceDefaultVolume = 0;
    const hasMarathonExp = src.includes("marathon") && !src.includes("semi");
    const hasSemiExp = src.includes("semi");
    const has10kExp = src.includes("10k") || src.includes("10 km") || src.includes("10km");
    if (effectiveLevelKey === "deb") {
      raceDefaultVolume = hasMarathonExp ? 20 : hasSemiExp ? 18 : has10kExp ? 15 : 0;
    } else if (effectiveLevelKey === "inter") {
      raceDefaultVolume = hasMarathonExp ? 35 : hasSemiExp ? 28 : has10kExp ? 25 : 0;
    } else if (effectiveLevelKey === "conf") {
      raceDefaultVolume = hasMarathonExp ? 45 : hasSemiExp ? 35 : has10kExp ? 30 : 0;
    } else {
      raceDefaultVolume = hasMarathonExp ? 55 : hasSemiExp ? 40 : has10kExp ? 35 : 0;
    }
    if (raceDefaultVolume > defaultVolume) {
      console.log(`[GenCtx] PdP/Maintien uplift: defaultVolume ${defaultVolume}\u2192${raceDefaultVolume} (exp\xE9rience ${hasMarathonExp ? "marathon" : hasSemiExp ? "semi" : "10k"})`);
      defaultVolume = raceDefaultVolume;
    }
  }
  const currentVolume = declaredVolume && declaredVolume > 0 ? declaredVolume : defaultVolume;
  const periodizationPlan = calculatePeriodizationPlan(
    totalWeeks,
    currentVolume,
    effectiveLevel,
    data.goal || "",
    data.subGoal,
    data.trailDetails?.distance,
    data.trailDetails?.elevation,
    data.targetTime,
    data.age,
    data.weight,
    vma,
    data.frequency || 3,
    { height: data.height, vmaSource, currentWeeklyElevation: data.currentWeeklyElevation }
  );
  return {
    vma,
    vmaSource,
    paces: {
      efPace: paces.efPace,
      eaPace: paces.eaPace,
      seuilPace: paces.seuilPace,
      vmaPace: paces.vmaPace,
      recoveryPace: paces.recoveryPace,
      allureSpecifique5k: paces.allureSpecifique5k,
      allureSpecifique10k: paces.allureSpecifique10k,
      allureSpecifiqueSemi: paces.allureSpecifiqueSemi,
      allureSpecifiqueMarathon: paces.allureSpecifiqueMarathon
    },
    periodizationPlan: {
      totalWeeks,
      ...periodizationPlan
    },
    questionnaireSnapshot: { ...data, vma },
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    modelUsed: "gemini-2.5-flash"
  };
};
var buildSafetyInstructions = (data, isBeginnerLevel) => {
  const parts = [];
  const bmi = data.weight && data.height ? data.weight / (data.height / 100) ** 2 : null;
  const age = data.age || 0;
  const weight = data.weight || 0;
  const isSenior = age >= 45;
  const isRestart = data.fitnessSubGoal === "Reprendre apr\xE8s une pause" || data.lastActivity === "Plus de 6 mois";
  const imcTier = bmi !== null ? bmi >= 35 ? 3 : bmi >= 30 ? 2 : bmi >= 25 ? 1 : 0 : 0;
  const isOverweight = imcTier >= 2;
  const isHighRisk = isSenior && isBeginnerLevel || isOverweight && isBeginnerLevel || isSenior && isOverweight || imcTier >= 3;
  const isModerateRisk = isSenior || isOverweight || imcTier >= 1;
  if (isHighRisk) {
    parts.push(`\u{1F6A8} PROFIL \xC0 RISQUE \xC9LEV\xC9 \u2014 AVIS M\xC9DICAL IMP\xC9RATIF
Dans le message de bienvenue (welcomeMessage), tu DOIS inclure EN PREMIER, AVANT toute autre information :
"\u26A0\uFE0F Avant de commencer ce programme, il est INDISPENSABLE de consulter votre m\xE9decin pour obtenir un certificat m\xE9dical d'aptitude \xE0 la pratique de la course \xE0 pied. ${isSenior ? `\xC0 partir de ${age} ans` : ""}${isSenior && isOverweight ? " et " : ""}${isOverweight ? "avec votre profil" : ""}, un bilan cardio-vasculaire (test d'effort) est fortement recommand\xE9. Votre sant\xE9 est notre priorit\xE9 absolue \u2014 ce plan est con\xE7u pour vous accompagner en toute s\xE9curit\xE9, mais seul un m\xE9decin peut confirmer que vous \xEAtes apte \xE0 d\xE9marrer."
- R\xE9p\xE8te ce rappel dans le advice de la PREMI\xC8RE s\xE9ance : "Rappel : assurez-vous d'avoir consult\xE9 votre m\xE9decin avant de d\xE9marrer."
- Chaque s\xE9ance DOIT avoir un conseil (advice) qui mentionne d'\xE9couter son corps, de s'arr\xEAter imm\xE9diatement en cas de douleur thoracique, essoufflement anormal ou malaise.
- Ton ton doit \xEAtre BIENVEILLANT et ENCOURAGEANT, jamais stigmatisant. Le coureur fait un choix courageux en se lan\xE7ant.`);
  } else if (isModerateRisk) {
    parts.push(`\u{1FA7A} S\xC9CURIT\xC9 SANT\xC9 \u2014 AVIS M\xC9DICAL RECOMMAND\xC9
Dans le message de bienvenue (welcomeMessage), tu DOIS inclure :
"Nous vous recommandons vivement de consulter un m\xE9decin avant de d\xE9buter ce programme, notamment pour obtenir un certificat m\xE9dical d'aptitude au sport.${isSenior ? ` \xC0 partir de ${age} ans, un bilan cardio-vasculaire est particuli\xE8rement conseill\xE9.` : ""}"
- Chaque s\xE9ance DOIT avoir un conseil (advice) qui mentionne d'\xE9couter son corps et de ne pas forcer en cas de douleur.`);
  } else {
    parts.push(`\u{1FA7A} S\xC9CURIT\xC9 SANT\xC9 \u2014 OBLIGATOIRE
Dans le message de bienvenue (welcomeMessage), tu DOIS inclure :
"Nous vous recommandons de consulter un m\xE9decin avant de d\xE9buter ce programme, notamment pour obtenir un certificat m\xE9dical d'aptitude au sport."
- Chaque s\xE9ance DOIT avoir un conseil (advice) qui mentionne d'\xE9couter son corps et de ne pas forcer en cas de douleur.`);
  }
  if (imcTier >= 3) {
    parts.push(`\u{1F6A8} IMC \u2265 35 \u2014 PR\xC9CAUTIONS ARTICULAIRES MAXIMALES :
- Objectif temps recommand\xE9 : applique un malus de -10% sur le temps cible (ex: si objectif 2h, planifier pour 2h12)
- Priorit\xE9 ABSOLUE : marche/course altern\xE9e syst\xE9matique les 4 premi\xE8res semaines minimum
- 2 jours de repos complet/sem + marche active 30-45 min 1-2\xD7/sem en jours OFF (allure dynamique, non compt\xE9e comme s\xE9ance course) + renforcement bas du corps 2\xD7/sem (excentrique mollets, gainage, fessiers, \xE9quilibre unipodal)
- Pas de sauts, pas de pliom\xE9trie, pas de descentes rapides dans le renforcement
- Dur\xE9es courtes (20-25 min max au d\xE9but), augmenter tr\xE8s progressivement (+5 min max/semaine)
- Surfaces souples UNIQUEMENT (herbe, terre, chemin) \u2014 jamais d'asphalte
- Volume max semaine 1 : 8-12 km (ou moins si d\xE9butant)
- Le warmup DOIT inclure 10 min de marche progressive
- Privil\xE9gier la R\xC9GULARIT\xC9 \xE0 l'intensit\xE9 : mieux vaut 3 s\xE9ances douces que 2 intenses
- Chaussures avec amorti MAXIMAL obligatoire \u2014 le mentionner dans le welcomeMessage
\u{1F6AB} NE JAMAIS mentionner le poids, l'IMC, la corpulence ou la morphologie du coureur dans AUCUN message. Rester positif et encourageant.
\u{1F6AB} NE JAMAIS proposer ni mentionner de cross-training, v\xE9lo, natation, elliptique ou autre sport. Ce coach est EXCLUSIVEMENT course \xE0 pied. Repos, marche active et renforcement sont les seules alternatives autoris\xE9es.`);
  } else if (imcTier >= 2) {
    parts.push(`\u26A0\uFE0F IMC 30-35 \u2014 PR\xC9CAUTIONS ARTICULAIRES RENFORC\xC9ES :
- Priorit\xE9 : s\xE9ances \xE0 faible impact (marche rapide, marche/course altern\xE9e en d\xE9but de plan)
- Pas de sauts, pas de pliom\xE9trie dans le renforcement
- Dur\xE9es courtes (20-30 min max au d\xE9but), augmenter tr\xE8s progressivement
- Surfaces souples (herbe, terre) plut\xF4t qu'asphalte quand possible
- Volume max semaine 1 : 10-15 km (ou moins si d\xE9butant)
- Le warmup DOIT inclure 5-10 min de marche progressive
- Privil\xE9gier la R\xC9GULARIT\xC9 \xE0 l'intensit\xE9 : mieux vaut 3 s\xE9ances douces que 2 intenses
- Renforcement bas du corps 1-2\xD7/sem pour r\xE9duire l'impact articulaire
- Chaussures avec amorti renforc\xE9 \u2014 le mentionner dans le welcomeMessage
\u{1F6AB} NE JAMAIS mentionner le poids, l'IMC, la corpulence ou la morphologie du coureur dans AUCUN message. Rester positif et encourageant.
\u{1F6AB} NE JAMAIS proposer ni mentionner de cross-training, v\xE9lo, natation, elliptique ou autre sport. Ce coach est EXCLUSIVEMENT course \xE0 pied. Repos, marche active et renforcement sont les seules alternatives autoris\xE9es.`);
  } else if (imcTier >= 1) {
    const isLongDistance = data.distance === "Marathon" || data.distance === "Semi-marathon" || data.distance === "Trail" && data.trailDistance && parseInt(data.trailDistance) >= 30;
    if (isLongDistance) {
      parts.push(`\u{1F4A1} IMC 25-30 + LONGUE DISTANCE \u2014 PR\xC9CAUTIONS ARTICULAIRES L\xC9G\xC8RES :
- Chaussures avec bon amorti recommand\xE9es \u2014 le mentionner dans le welcomeMessage
- Surfaces souples quand possible, surtout pour les sorties longues
- Bien s'hydrater pendant et apr\xE8s chaque s\xE9ance
- Le warmup DOIT inclure 5 min de marche progressive avant les sorties longues
\u{1F6AB} NE JAMAIS mentionner le poids, l'IMC, la corpulence ou la morphologie du coureur dans AUCUN message. Rester positif et encourageant.
\u{1F6AB} NE JAMAIS proposer ni mentionner de cross-training, v\xE9lo, natation, elliptique ou autre sport. Ce coach est EXCLUSIVEMENT course \xE0 pied. Repos, marche active et renforcement sont les seules alternatives autoris\xE9es.`);
    }
  }
  if (isSenior) {
    parts.push(`\u{1F464} COUREUR DE ${age} ANS \u2014 ADAPTATIONS OBLIGATOIRES :
- \xC9chauffements LONGS obligatoires (10-15 min progressifs minimum)
- R\xE9cup\xE9ration entre s\xE9ances : minimum 48h, id\xE9alement 72h pour les s\xE9ances intenses
- Maximum 2 s\xE9ances intenses par semaine (pas 2 jours cons\xE9cutifs)
- \xC9tirements et mobilit\xE9 articulaire SYST\xC9MATIQUES dans chaque cooldown
- Surveiller les articulations : genoux, chevilles, hanches \u2014 mentionner dans les advice
- Progression plus lente : max +8% volume/semaine (au lieu de 10-12%)`);
  }
  if (isRestart) {
    parts.push(`\u{1F504} REPRISE APR\xC8S PAUSE \u2014 PROGRESSION LENTE :
- Les 2-3 premi\xE8res semaines doivent \xEAtre tr\xE8s douces
- Commencer \xE0 50-60% de ce que le coureur faisait avant
- Augmenter le volume de maximum 10% par semaine
- Int\xE9grer du marche/course m\xEAme si le coureur est de niveau interm\xE9diaire`);
  }
  const isPertePoids = /perte.*poids|weight.*loss/i.test(data.goal || "");
  parts.push(`\u{1F534} DIVERSIT\xC9 OBLIGATOIRE DES S\xC9ANCES :
- ${isPertePoids ? `MAXIMUM 2 s\xE9ances de type "Sortie Longue" par semaine pour la perte de poids (1 principale dimanche + 1 molle en milieu de semaine \u2014 la dur\xE9e prime sur l'intensit\xE9 pour oxydation lipidique).` : 'MAXIMUM 1 s\xE9ance de type "Sortie Longue" par semaine. JAMAIS 2 Sortie Longue la m\xEAme semaine.'}
- Si le plan a 3 s\xE9ances/semaine : 1 Jogging/Footing/Marche-Course + 1 Sortie Longue + 1 Renforcement. En phase d\xE9veloppement/sp\xE9cifique : remplacer le Jogging par du Fractionn\xE9 ou du Seuil.
- Si le plan a 4 s\xE9ances/semaine : 2 Jogging/Footing + 1 Sortie Longue + 1 Renforcement. En phase d\xE9veloppement : 1 Jogging + 1 Fractionn\xE9 + 1 SL + 1 Renfo.
- Chaque s\xE9ance de course doit avoir un type DIFF\xC9RENT (pas 2 "Jogging" identiques \u2014 varier : footing EF, footing vallonn\xE9, fartlek, progressif, etc.)`);
  if (isBeginnerLevel) {
    parts.push(`\u{1F6E1}\uFE0F PROTECTION D\xC9BUTANT :
- Jamais plus de 3 s\xE9ances de COURSE par semaine (Jogging, Fractionn\xE9, SL, R\xE9cup, Marche/Course). La s\xE9ance de Renforcement est EN PLUS et ne compte PAS dans ce total.
- Exemple : 3 s\xE9ances running + 1 renfo = 4 s\xE9ances/semaine au total, c'est OK
- Progression du volume : max +10% par semaine
- Aucune s\xE9ance de course > 45 min les 4 premi\xE8res semaines (sauf Marche/Course qui peut aller jusqu'\xE0 50 min car elle inclut de la marche)
- Conseil syst\xE9matique : hydratation, chaussures adapt\xE9es, ne pas forcer`);
  }
  const totalWeeks = data.durationWeeks || 0;
  if (totalWeeks > 24) {
    parts.push(`\u26A0\uFE0F PLAN LONG (${totalWeeks} sem) \u2014 MESSAGE D'ADH\xC9RENCE OBLIGATOIRE dans le welcomeMessage :
- Les plans > 24 semaines ont un taux d'abandon \xE9lev\xE9 chez les coureurs en construction
- Mentionner : importance de noter les s\xE9ances, partenaire d'entra\xEEnement, reprise possible apr\xE8s pause sans tout recommencer
- \xC0 mi-parcours, sugg\xE9rer d'\xE9valuer la motivation et \xE9ventuellement basculer sur un objectif interm\xE9diaire
- Cadrer : "70% des s\xE9ances r\xE9alis\xE9es = bon r\xE9sultat", la r\xE9gularit\xE9 prime sur la perfection`);
  }
  const goalLow = (data.goal || "").toLowerCase();
  const isWeightLossGoal = goalLow.includes("perte") && goalLow.includes("poids");
  if (isWeightLossGoal) {
    parts.push(`\u{1F3C3}\u200D\u2640\uFE0F OBJECTIF PERTE DE POIDS \u2014 MENTION REPRISE/SANT\xC9 OBLIGATOIRE dans le welcomeMessage :
- En compl\xE9ment de la mention m\xE9dicale g\xE9n\xE9rique, ajouter une note d\xE9di\xE9e aux personnes qui REPRENNENT le sport apr\xE8s une p\xE9riode d'inactivit\xE9 (tr\xE8s fr\xE9quent pour cet objectif) :
  "Si tu reprends apr\xE8s une longue pause sans activit\xE9 r\xE9guli\xE8re, un avis m\xE9dical avec test d'effort est particuli\xE8rement recommand\xE9 (surtout si tu as des ant\xE9c\xE9dents cardio, des facteurs de risque, ou plus de 35 ans). \xC9coute ton corps d\xE8s les premi\xE8res s\xE9ances : essoufflement anormal, douleur thoracique, vertiges \u2192 arr\xEAte imm\xE9diatement et consulte."
- Insister sur un d\xE9marrage TR\xC8S PROGRESSIF et la r\xE9gularit\xE9 : mieux vaut 3 s\xE9ances faciles tenues que 4 ambitieuses abandonn\xE9es.
- Mentionner l'importance d'un \xE9chauffement long (10 min minimum) et de chaussures adapt\xE9es avec bon amorti \u2014 les articulations sont souvent peu sollicit\xE9es chez les s\xE9dentaires en reprise.
- Rappeler qu'une douleur articulaire persistante (genou, cheville, hanche) doit conduire \xE0 un avis kin\xE9/m\xE9dical avant de continuer.
\u{1F6AB} NE JAMAIS mentionner le poids, l'IMC, la corpulence ou la morphologie du coureur. Rester positif et encourageant.`);
  }
  if (isWeightLossGoal && bmi !== null && bmi < 20) {
    parts.push(`\u{1FA7A} OBJECTIF PERTE DE POIDS \u2014 PR\xC9VENTION RED-S \xE0 inclure dans le welcomeMessage :
- Insister sur l'importance de **manger suffisamment** pour soutenir l'entra\xEEnement (pas de d\xE9ficit calorique strict)
- Avertir du syndrome RED-S (Relative Energy Deficiency in Sport) : un d\xE9ficit \xE9nerg\xE9tique cause perte de masse maigre, fatigue chronique, troubles hormonaux, blessures
- Recommander : surveiller \xE9nergie/fatigue/sommeil/r\xE8gles (si femme), consulter un nutritionniste sportif si besoin
- Sugg\xE9rer une alternative : viser performance / endurance / plaisir plut\xF4t qu'une fixation sur la perte de poids
\u{1F6AB} R\xC8GLE ABSOLUE : NE JAMAIS mentionner le poids, l'IMC, la corpulence, la minceur ou la morphologie de l'utilisateur dans le welcomeMessage ni dans aucun autre champ. Garder un ton positif et bienveillant.`);
  }
  return parts.join("\n\n");
};
var R3_PROMPT_DPLUS_ENABLED = globalThis.__IMPORT_META_ENV__.VITE_R3_PROMPT_DPLUS_ENABLED !== "false";
var NUTRITION_SL_BLOCK = `- NUTRITION SUR SL LONGUES (\u22652h) : DOIT inclure une mention coach dans la description, SANS chiffres ni timing pr\xE9cis. Formats \xE0 explorer : gel, p\xE2te de fruit, banane, boisson glucidique. Hydratation r\xE9guli\xE8re sans attendre la soif. Pour course cible \u226540km : ajouter "consulter un di\xE9t\xE9ticien-sportif est fortement recommand\xE9 pour ta strat\xE9gie nutrition".`;
var ULTRA70_BACK_TO_BACK_BULLETS = `- BACK-TO-BACK OBLIGATOIRE en phase sp\xE9cifique et d\xE9veloppement :
  \u2022 Samedi = Sortie Longue principale (la plus longue de la semaine, avec D+ important)
  \u2022 Dimanche = 2e Sortie Longue sur jambes fatigu\xE9es (50-60% de la dur\xE9e du samedi, en EF strict, avec D+ mod\xE9r\xE9)
  \u2022 Simuler la fatigue cumul\xE9e de l'ultra, apprendre \xE0 courir/marcher fatigu\xE9, travailler l'alimentation en effort
  \u2022 Placer 2 \xE0 3 week-ends back-to-back en phase sp\xE9cifique (PAS en semaine de r\xE9cup\xE9ration)
  \u2022 Apr\xE8s chaque back-to-back : lundi repos ou r\xE9cup\xE9ration tr\xE8s l\xE9g\xE8re`;
function buildDplusPromptBlock(opts) {
  if (!R3_PROMPT_DPLUS_ENABLED) return "";
  if (!opts.weeklyElevationTarget || opts.weeklyElevationTarget.length === 0) return "";
  const dplusPerKm = opts.raceDistanceKm > 0 ? Math.round(opts.raceDplus / opts.raceDistanceKm) : 0;
  if (opts.raceDplus < 500) return "";
  let block = "";
  if (opts.context === "preview") {
    const t = opts.weeklyElevationTarget[opts.weekIdx];
    const slDplus = Math.round(t * 0.58);
    const vallOrCotesDplus = Math.round(t * 0.37);
    const footingsDplus = t - slDplus - vallOrCotesDplus;
    block += `
\u{1F3D4}\uFE0F D+ CIBLE SEMAINE 1 : ${t}m (course = ${dplusPerKm} m/km)
`;
    block += `R\xE9partition (renseigner \`elevationGain\` chiffr\xE9 par s\xE9ance) :
`;
    block += `- Sortie Longue : ${slDplus}m
`;
    block += `- S\xE9ance vallonn\xE9e ou fractionn\xE9 en c\xF4te : ${vallOrCotesDplus}m
`;
    block += `- Footings : ${footingsDplus}m
`;
    block += `- Piste / seuil / VMA : 0m (s\xE9ances plates)
`;
  } else {
    block += `
\u{1F3D4}\uFE0F D+ CIBLE PAR SEMAINE (renseigner \`elevationGain\` chiffr\xE9 par s\xE9ance) :
`;
    const labels = opts.weeklyElevationTarget.map((d, i) => {
      const isRecov = opts.recoveryWeeks.includes(i + 1);
      const isAffut = i >= opts.totalWeeks - 2;
      const label = isRecov ? " (r\xE9cup)" : isAffut ? " (aff\xFBt)" : "";
      return `S${i + 1}:${d}m${label}`;
    });
    block += labels.join(" | ") + "\n";
    block += `R\xE9partition par semaine : SL ~58% | vallonn\xE9e/c\xF4te ~37% | footings ~5% | piste/seuil/VMA 0m.
`;
    block += `\u26A0\uFE0F elevationGain OBLIGATOIRE sur chaque s\xE9ance (sauf Renforcement).
`;
  }
  return block;
}
function logDplusActualVsTarget(plan, weeklyElevationTarget) {
  if (!weeklyElevationTarget || !plan?.weeks) return;
  const lines = [];
  for (let i = 0; i < plan.weeks.length; i++) {
    const target = weeklyElevationTarget[i] ?? 0;
    if (target === 0) continue;
    const actual = (plan.weeks[i].sessions || []).reduce((s, x) => s + (x.elevationGain || 0), 0);
    const ecart = target > 0 ? Math.round((actual - target) / target * 100) : 0;
    lines.push(`S${i + 1}: cible ${target}m, r\xE9el ${actual}m (${ecart >= 0 ? "+" : ""}${ecart}%)`);
  }
  if (lines.length) console.debug(`[R3 D+ Actual vs Target] ${lines.join(" | ")}`);
}
var generatePreviewPlan = async (data) => {
  console.log("[Gemini Preview] D\xE9but g\xE9n\xE9ration semaine 1 uniquement");
  const startTime = Date.now();
  try {
    const apiKey = getApiKey();
    const genAI2 = new GoogleGenerativeAI(apiKey);
    const model = genAI2.getGenerativeModel({ model: "gemini-2.5-flash" });
    let vmaEstimate = getBestVMAEstimate(data.recentRaceTimes);
    let paces;
    let vmaSource;
    if (vmaEstimate) {
      paces = calculateAllPaces(vmaEstimate.vma);
      vmaSource = vmaEstimate.source;
    } else {
      let defaultVma;
      switch (data.level) {
        case "D\xE9butant (0-1 an)":
          defaultVma = 11;
          break;
        case "Interm\xE9diaire (R\xE9gulier)":
          defaultVma = 13.5;
          break;
        case "Confirm\xE9 (Comp\xE9tition)":
          defaultVma = 15.5;
          break;
        case "Expert (Performance)":
          defaultVma = 17.5;
          break;
        default:
          defaultVma = 12.5;
      }
      paces = calculateAllPaces(defaultVma);
      vmaSource = `Estimation niveau ${data.level}`;
      vmaEstimate = { vma: defaultVma, source: vmaSource };
    }
    const goalForVma = (data.goal || "").toLowerCase();
    if (goalForVma.includes("maintien") || goalForVma.includes("remise")) {
      const reducedVma = Math.round(vmaEstimate.vma * 0.85 * 10) / 10;
      console.log(`[VMA] Remise en forme: VMA ${vmaEstimate.vma.toFixed(1)} \u2192 ${reducedVma.toFixed(1)} (-15%)`);
      vmaEstimate = { vma: reducedVma, source: `${vmaEstimate.source} (ajust\xE9e -15% remise en forme)` };
      paces = calculateAllPaces(reducedVma);
      vmaSource = vmaEstimate.source;
    }
    const hasRealChrono = !!(data.recentRaceTimes?.distance5km || data.recentRaceTimes?.distance10km || data.recentRaceTimes?.distanceHalfMarathon || data.recentRaceTimes?.distanceMarathon);
    if (data.targetTime && data.subGoal && vmaEstimate && !hasRealChrono) {
      const raceDistances = { "5 km": 5, "10 km": 10, "Semi-Marathon": 21.1, "Marathon": 42.195 };
      const raceDist = raceDistances[data.subGoal];
      if (raceDist) {
        const targetSeconds = timeToSeconds(data.targetTime, raceDist);
        if (targetSeconds > 0) {
          const targetVma = calculateVMAFromTime(raceDist, targetSeconds);
          if (vmaEstimate.vma > targetVma * 1.15) {
            console.warn(`[VMA] VMA estim\xE9e (${vmaEstimate.vma.toFixed(1)}) incoh\xE9rente avec targetTime ${data.targetTime} pour ${data.subGoal} (VMA implicite: ${targetVma.toFixed(1)}). Recalcul.`);
            const correctedVma = targetVma * 1.05;
            paces = calculateAllPaces(correctedVma);
            vmaSource = `Recalcul\xE9e depuis objectif ${data.subGoal} en ${data.targetTime}`;
            vmaEstimate = { vma: correctedVma, source: vmaSource };
          }
        }
      }
    }
    applyTargetTimeOverride(paces, data, vmaEstimate.vma);
    if (data.frequency < 2) {
      console.warn(`[Fr\xE9quence] ${data.frequency} s\xE9ance(s) \u2192 forc\xE9 \xE0 2 minimum`);
      data.frequency = 2;
    }
    const goal = data.goal || "";
    const isAmbitiousGoal = goal.includes("Trail") || data.subGoal === "Semi-Marathon" || data.subGoal === "Semi-marathon" || data.subGoal === "Marathon";
    if (isAmbitiousGoal && data.frequency < 3) {
      console.warn(`[Fr\xE9quence] ${data.subGoal || goal} avec ${data.frequency} s\xE9ances \u2192 forc\xE9 \xE0 3 minimum`);
      data.frequency = 3;
    }
    let planDurationWeeks = 12;
    if (data.raceDate) {
      const raceDate = new Date(data.raceDate);
      const startDate = data.startDate ? new Date(data.startDate) : /* @__PURE__ */ new Date();
      const diffTime = raceDate.getTime() - startDate.getTime();
      const diffDays = diffTime / (1e3 * 60 * 60 * 24);
      const diffWeeks = Math.ceil(diffDays / 7);
      const maxWeeks = 30;
      planDurationWeeks = Math.max(4, Math.min(maxWeeks, diffWeeks));
      if (diffWeeks > maxWeeks) {
        const newStartDate = new Date(raceDate.getTime() - maxWeeks * 7 * 24 * 60 * 60 * 1e3);
        data.startDate = newStartDate.toISOString().split("T")[0];
        console.log(`[Plan Duration] Course dans ${diffWeeks} semaines > cap ${maxWeeks} \u2192 startDate d\xE9cal\xE9 au ${data.startDate}`);
      }
    }
    data.vma = vmaEstimate.vma;
    const generationContext = createGenerationContext(
      data,
      paces,
      vmaEstimate.vma,
      vmaSource,
      planDurationWeeks
    );
    const pacesSection = `
VMA : ${paces.vmaKmh} km/h (${vmaSource})
- EF (Endurance) : ${paces.efPace} min/km
- Seuil : ${paces.seuilPace} min/km
- VMA : ${paces.vmaPace} min/km
- R\xE9cup\xE9ration : ${paces.recoveryPace} min/km
`;
    const preferredDaysInstruction = data.preferredDays && data.preferredDays.length > 0 ? `S\xE9ances UNIQUEMENT sur : ${data.preferredDays.join(", ")}` : "R\xE9partition \xE9quilibr\xE9e (ex: Mardi, Jeudi, Dimanche)";
    const longRunDay = data.preferredLongRunDay || "Dimanche";
    let injuryInstruction = "";
    if (data.injuries?.hasInjury && data.injuries.description) {
      injuryInstruction = `\u26A0\uFE0F BLESSURE : ${data.injuries.description}`;
    }
    const commentsInstruction = data.comments?.trim() ? `\u{1F4DD} PR\xC9CISIONS DU COUREUR : "${data.comments.trim()}"` : "";
    const isBeginnerLevel = labelToLevelKey(data.level) === "deb";
    const isPertePoidsPrev = goal.includes("Perte");
    const isMaintienPrev = goal.includes("Maintien") || goal.includes("Remise");
    const needsMarcheCourse = isBeginnerLevel || vmaEstimate.vma < 10.5 && (isPertePoidsPrev || isMaintienPrev);
    const beginnerInstructionPreview = needsMarcheCourse ? `

\u{1F6B6}\u200D\u2642\uFE0F\u{1F3C3} IMPORTANT - NIVEAU D\xC9BUTANT D\xC9TECT\xC9 :
- Type de s\xE9ance : "Marche/Course" (OBLIGATOIRE pour au moins 2 s\xE9ances sur ${data.frequency})
- Format semaine 1 : 8-10 x (1 min course l\xE9g\xE8re + 2 min marche active)
- Pas de VMA, pas de fractionn\xE9 intense
` : "";
    const previewObjective = detectObjectiveFromData(data);
    const isVKPreview = previewObjective === "VK";
    const isTrailSteepPreview = previewObjective === "TrailSteep";
    const trailSectionPreview = data.goal === "Trail" && data.trailDetails ? isVKPreview ? `
\u{1F3D4}\uFE0F VK / COURSE DE C\xD4TE : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m (${Math.round(data.trailDetails.elevation / data.trailDetails.distance)} m D+/km)
\u26A0\uFE0F FORMAT VK \u2014 PAS un trail classique. Plan sp\xE9cifique :
- Volume hebdomadaire TR\xC8S R\xC9DUIT (max 20-45km selon niveau). Ce n'est PAS une course longue distance.
- Priorit\xE9 ABSOLUE : puissance en c\xF4te (VMA c\xF4te, fractionn\xE9 en mont\xE9e, escaliers, c\xF4tes courtes 30-60")
- Sortie longue orient\xE9e D\xC9NIVEL\xC9 (pas distance) \u2014 ex: 1h-1h30 avec D+ max, allure secondaire
- Renforcement SP\xC9CIFIQUE : gainage, squats, mollets, fentes, proprioception \u2014 2 s\xE9ances si possible
- S\xE9ances courtes et intenses > s\xE9ances longues. Pas de footing > 10km.
- Le fractionn\xE9 en c\xF4te peut commencer d\xE8s la phase fondamentale (c'est le geste sp\xE9cifique)

` : isTrailSteepPreview ? `
\u{1F3D4}\uFE0F TRAIL RAIDE : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m (${Math.round(data.trailDetails.elevation / data.trailDetails.distance)} m D+/km)
\u26A0\uFE0F FORMAT TRAIL RAIDE \u2014 Ratio D+/km \xE9lev\xE9. Plan sp\xE9cifique :
- Volume hebdomadaire R\xC9DUIT par rapport \xE0 un trail classique (max 25-55km selon niveau)
- Priorit\xE9 : travail en c\xF4te (c\xF4tes longues 2-5min, VMA en c\xF4te, power hiking)
- Sortie longue avec D+ progressif important \u2014 le D+ prime sur la distance
- Renforcement : quadriceps (excentrique), mollets, proprioception
- Le fractionn\xE9 en c\xF4te peut commencer d\xE8s la phase fondamentale

` : data.trailDetails.distance >= 100 ? `
\u{1F3D4}\uFE0F ULTRA-TRAIL 100km+ : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
\u26A0\uFE0F FORMAT ULTRA LONG \u2014 R\xE8gles sp\xE9cifiques :
- La SORTIE LONGUE est la s\xE9ance CL\xC9. Elle doit progresser vers 50-65km ou 6-8h au pic d'entra\xEEnement.
- BACK-TO-BACK OBLIGATOIRE en phase sp\xE9cifique : SL samedi (longue) + sortie dimanche (mod\xE9r\xE9e en fatigue). Le back-to-back simule la fatigue cumul\xE9e de l'ultra.
- MARCHE EN C\xD4TE (power hiking) : int\xE9grer des sections de marche rapide en mont\xE9e dans les SL. Sur un ultra, on marche 30-50% du temps.
${NUTRITION_SL_BLOCK}
- MAT\xC9RIEL : s'entra\xEEner avec le sac, les b\xE2tons, le mat\xE9riel obligatoire d\xE8s la phase d\xE9veloppement.
- GESTION D'ALLURE : l'allure ultra est PLUS LENTE que l'EF. Pr\xE9voir des sections \xE0 7:00-8:00 min/km.
${buildDplusPromptBlock({ weekIdx: 0, weeklyElevationTarget: generationContext.periodizationPlan.weeklyElevationTarget, recoveryWeeks: generationContext.periodizationPlan.recoveryWeeks, totalWeeks: generationContext.periodizationPlan.totalWeeks, raceDplus: data.trailDetails.elevation, raceDistanceKm: data.trailDetails.distance, context: "preview" })}
- Renforcement : excentrique quadriceps (descente), gainage, proprioception
` : data.trailDetails.distance >= 70 ? `
\u{1F3D4}\uFE0F ULTRA-TRAIL 70km+ : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
\u26A0\uFE0F FORMAT ULTRA \u2014 R\xE8gles sp\xE9cifiques :
${ULTRA70_BACK_TO_BACK_BULLETS}
- SL pic doit atteindre 4h30-6h au pic d'entra\xEEnement
- MARCHE EN C\xD4TE (power hiking) : sections de marche rapide en mont\xE9e dans les SL \u2265 2h30
${NUTRITION_SL_BLOCK}
- MAT\xC9RIEL : s'entra\xEEner avec sac et b\xE2tons d\xE8s la phase d\xE9veloppement

${buildDplusPromptBlock({ weekIdx: 0, weeklyElevationTarget: generationContext.periodizationPlan.weeklyElevationTarget, recoveryWeeks: generationContext.periodizationPlan.recoveryWeeks, totalWeeks: generationContext.periodizationPlan.totalWeeks, raceDplus: data.trailDetails.elevation, raceDistanceKm: data.trailDetails.distance, context: "preview" })}
- Renforcement : excentrique quadriceps (descente), gainage, proprioception
` : `
\u{1F3D4}\uFE0F TRAIL : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
- Sortie longue avec D+ progressif, fractionn\xE9 en c\xF4te

${buildDplusPromptBlock({ weekIdx: 0, weeklyElevationTarget: generationContext.periodizationPlan.weeklyElevationTarget, recoveryWeeks: generationContext.periodizationPlan.recoveryWeeks, totalWeeks: generationContext.periodizationPlan.totalWeeks, raceDplus: data.trailDetails.elevation, raceDistanceKm: data.trailDetails.distance, context: "preview" })}
` : "";
    const hasChronoPreview = !!(data.recentRaceTimes?.distance5km || data.recentRaceTimes?.distance10km || data.recentRaceTimes?.distanceHalfMarathon || data.recentRaceTimes?.distanceMarathon);
    const feasibilityResultPreview = calculateFeasibility({
      vma: vmaEstimate.vma,
      targetTime: data.targetTime,
      distance: data.goal === "Trail" && data.trailDetails?.distance ? `${data.trailDetails.distance} km` : data.subGoal || data.distance || "",
      goal: data.goal || "",
      level: getEffectiveLevel(data),
      planWeeks: planDurationWeeks,
      currentVolume: data.currentWeeklyVolume,
      currentWeeklyElevation: data.currentWeeklyElevation,
      trailElevation: data.goal === "Trail" ? data.trailDetails?.elevation : void 0,
      trailDistance: data.goal === "Trail" ? data.trailDetails?.distance : void 0,
      hasInjury: !!data.injuries?.hasInjury,
      injuryDescription: data.injuries?.description,
      hasChrono: hasChronoPreview,
      vmaFromTarget: vmaSource.includes("Recalcul\xE9e depuis objectif"),
      age: data.age,
      weight: data.weight,
      height: data.height,
      frequency: data.frequency
    });
    const feasibilityTextPreview = `Score : ${feasibilityResultPreview.score}/100 | Statut : ${feasibilityResultPreview.status}
${feasibilityResultPreview.message}
${feasibilityResultPreview.alternativeTarget ? `Objectif alternatif : ${feasibilityResultPreview.alternativeTarget}` : ""}`;
    const objectiveForSL = detectObjectiveFromData(data);
    const levelForSL = detectLevelFromData(data);
    const minSlDurForPrompt = (MIN_SL_DURATION_MIN[objectiveForSL] || {})[levelForSL] || 45;
    const previewPrompt = `
Tu es un Coach Running Expert. G\xE9n\xE8re UNIQUEMENT la SEMAINE 1 d'un plan d'entra\xEEnement.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
                    PROFIL DU COUREUR
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
- Niveau : ${getEffectiveLevel(data)}
- Objectif : ${data.goal} ${data.subGoal ? `(${data.subGoal})` : ""}
- Temps vis\xE9 : ${data.targetTime || "Finisher"}
- Date de course : ${data.raceDate || "Non d\xE9finie"}
- Fr\xE9quence : ${data.frequency} s\xE9ances/semaine
- Jours : ${preferredDaysInstruction}
- Jour sortie longue : ${longRunDay}
- Localisation : ${data.city || "Non renseign\xE9e"}
${injuryInstruction}
${commentsInstruction}
${beginnerInstructionPreview}
${data.city ? `
\u{1F4CD} LIEUX D'ENTRA\xCENEMENT (suggestedLocations) :
Tu DOIS proposer 2-3 lieux R\xC9ELS \xE0 ${data.city} ou dans ses environs proches :
- Recherche des parcs, pistes d'athl\xE9tisme, for\xEAts ou sentiers CONNUS de cette ville
- Exemples pour Paris : Bois de Vincennes, Parc Montsouris, Jardin du Luxembourg
- Exemples pour Lyon : Parc de la T\xEAte d'Or, Berges du Rh\xF4ne
- Pour chaque lieu, indique le type (PARK, TRACK, NATURE, HILL) et pour quel type de s\xE9ance il convient

\u{1F4CD} LIEU PAR S\xC9ANCE (locationSuggestion) \u2014 OBLIGATOIRE :
Chaque s\xE9ance DOIT avoir un "locationSuggestion" avec un lieu R\xC9EL de ${data.city} adapt\xE9 aux EXIGENCES de la s\xE9ance :
- Fractionn\xE9 VMA/vitesse \u2192 PISTE D'ATHL\xC9TISME (surface plane, distances balis\xE9es)
- Fractionn\xE9 seuil/tempo \u2192 chemin plat, berges, voie verte
- S\xE9ance avec D+ (elevationGain > 0) \u2192 colline, for\xEAt pentue, parc vallonn\xE9 (lieu avec VRAI d\xE9nivel\xE9 !)
- Sortie Longue route \u2192 grand parc, boucle longue, berges
- Sortie Longue Trail \u2192 for\xEAt/montagne avec sentiers
- Footing/R\xE9cup \u2192 parc agr\xE9able, sol souple, berges calmes
- Renforcement \u2192 "\xC0 la maison" ou "Salle de sport"
` : ""}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              ALLURES CALCUL\xC9ES (OBLIGATOIRES)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${pacesSection}

\u26A0\uFE0F UTILISE CES ALLURES EXACTES dans chaque s\xE9ance !

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              PLAN DE P\xC9RIODISATION PR\xC9-CALCUL\xC9
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
Dur\xE9e totale : ${planDurationWeeks} semaines
Semaine 1 : Phase "${generationContext.periodizationPlan.weeklyPhases[0]}"
Volume semaine 1 : ${generationContext.periodizationPlan.weeklyVolumes[0]} km

Phases du plan :
${generationContext.periodizationPlan.weeklyPhases.map((p, i) => `S${i + 1}: ${p} (${generationContext.periodizationPlan.weeklyVolumes[i]}km)`).join("\n")}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
          \u{1F6A8}\u{1F6A8}\u{1F6A8} R\xC8GLES ABSOLUES \u{1F6A8}\u{1F6A8}\u{1F6A8}
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u{1F534} EXACTEMENT ${data.frequency} s\xE9ances dans la semaine 1.
\u{1F534} Jours : ${data.preferredDays?.length ? data.preferredDays.join(", ") + " \u2014 CES JOURS UNIQUEMENT." : "R\xE9partition \xE9quilibr\xE9e."}
\u{1F534} SORTIE LONGUE le ${longRunDay} \u2014 place OBLIGATOIREMENT la s\xE9ance de type "Sortie Longue" ce jour-l\xE0.
\u{1F534} Le plan TOTAL fait ${planDurationWeeks} semaines (tu ne g\xE9n\xE8res que la semaine 1 ici).
\u{1F534} VOLUME S1 = ${generationContext.periodizationPlan.weeklyVolumes[0]} km \u2014 CIBLE BILAT\xC9RALE (somme des distances de toutes les s\xE9ances running). Tu dois VISER ce volume \xE0 \xB15%, ni en dessous (sous-stimulation) ni au-dessus (surcharge). Distribue les km entre les s\xE9ances pour atteindre exactement ce volume.
\u{1F534} La SORTIE LONGUE doit \xEAtre la s\xE9ance la PLUS LONGUE de la semaine et repr\xE9senter 30-40% du volume hebdo. Dur\xE9e minimum SL : ${minSlDurForPrompt} min.

\u{1F534} TYPES DE S\xC9ANCES AUTORIS\xC9S PAR PHASE :
${isVKPreview || isTrailSteepPreview ? `   - fondamental : Jogging (footing EF), Sortie Longue (EF + D+), Renforcement, C\xF4tes en EF (mont\xE9e march\xE9e ou trott\xE9e). Le travail en c\xF4te mod\xE9r\xE9 EST autoris\xE9 d\xE8s cette phase pour VK/Trail raide.
   - developpement : + intensification (c\xF4tes courtes/longues, seuil en mont\xE9e).
   - specifique : + R\xE9p\xE9titions sp\xE9cifiques course (simulation D+/km cible), allure sp\xE9cifique.
   - affutage : Jogging, Sortie courte avec rappel c\xF4te, Renforcement.
   - recuperation : Jogging (footing EF plat) uniquement + Renforcement l\xE9ger. PAS d'intensit\xE9.` : `   - fondamental : Jogging (footing EF), Sortie Longue (EF uniquement), Renforcement.
     ${!isBeginnerLevel && !needsMarcheCourse && data.frequency >= 4 && data.fitnessSubGoal !== "Reprendre apr\xE8s une pause" && data.lastActivity !== "Plus de 6 mois" ? `\u26A0\uFE0F NIVEAU CONFIRM\xC9+ / 4+ S\xC9ANCES : \xE0 partir de la SEMAINE 3 du fondamental, 1 s\xE9ance par semaine DOIT inclure du travail de vitesse l\xE9ger :
       \u2022 Fartlek libre (5-6 acc\xE9l\xE9rations de 30s \xE0 allure 10km, r\xE9cup 1min30 trott\xE9e) \u2014 type "Fractionn\xE9", intensit\xE9 "Mod\xE9r\xE9"
       \u2022 OU Footing avec gammes de vitesse (8-10 lignes droites de 80-100m en fin de footing)
       \u2022 OU C\xF4tes courtes (6-8 \xD7 20s en c\xF4te, r\xE9cup descente trott\xE9e)
       Cela maintient les qualit\xE9s neuromusculaires sans casser la base a\xE9robie. Les semaines 1-2 restent 100% EF.` : `PAS de seuil, PAS de fractionn\xE9, PAS de VMA. S\xE9ances 100% endurance fondamentale.`}
     \u26A0\uFE0F VARI\xC9T\xC9 OBLIGATOIRE en phase fondamentale : chaque footing doit avoir un th\xE8me DIFF\xC9RENT. Exemples :
       \u2022 "Footing en aisance respiratoire" (classique plat)
       \u2022 "Footing vallonn\xE9" (terrain avec l\xE9g\xE8res c\xF4tes, toujours en EF)
       \u2022 "Footing progressif" (d\xE9part tr\xE8s lent, finir au haut de la zone EF)
       \u2022 "Footing nature / trail doux" (sentiers, chemins, terrain vari\xE9 \u2014 pour les traileurs)
       \u2022 "Footing technique" (focus foul\xE9e, cadence, posture)
       NE PAS r\xE9p\xE9ter le m\xEAme intitul\xE9 ou le m\xEAme format deux fois dans la m\xEAme semaine.
   - developpement : + Fractionn\xE9 (VMA courte, c\xF4tes), seuil court possible.
   - specifique : + Seuil long, allure sp\xE9cifique course, fractionn\xE9 seuil.
   - affutage : Jogging, Sortie Longue courte, Renforcement + 1 rappel fractionn\xE9 court.
   - recuperation : Jogging (footing EF) uniquement + Renforcement l\xE9ger. PAS d'intensit\xE9.`}

${goal.includes("Perte") ? (() => {
      const pdpVma = vmaEstimate?.vma || data.vma || 12;
      const pdpEfPace = paces?.efPace || "8:00";
      const pdpBmi = data.weight && data.height ? data.weight / (data.height / 100) ** 2 : 0;
      const pdpIsLowVMA = pdpVma < 12;
      const pdpIsOverweight = pdpBmi >= 30;
      const pdpNeedsMarcheCourse = pdpVma < 10.5 || pdpBmi >= 30 || pdpEfPace > "7:30";
      const pdpMaxSLmin = pdpIsLowVMA ? 60 : 65;
      const pdpTotalWeeks = data.durationWeeks || 12;
      const pdpFondWeeks = Math.max(1, Math.floor(pdpTotalWeeks * 0.45));
      return `\u{1F534} PLAN PERTE DE POIDS \u2014 R\xC8GLES SP\xC9CIFIQUES (OBLIGATOIRE) :
Ce plan est un plan PERTE DE POIDS, PAS une pr\xE9paration course.
${pdpIsLowVMA ? `\u26A0\uFE0F VMA ${pdpVma.toFixed(1)} km/h < 12 \u2192 TRAITER COMME D\xC9BUTANT+ quel que soit le niveau d\xE9clar\xE9. R\xE9duire volume et intensit\xE9 en cons\xE9quence.` : ""}
${pdpIsOverweight ? `\u26A0\uFE0F IMC ${pdpBmi.toFixed(1)} \u2265 30 \u2192 SURPOIDS : max 2 s\xE9ances course/semaine + 1 renfo. Alternance marche/course OBLIGATOIRE les 4 premi\xE8res semaines. Priorit\xE9 protection articulaire.` : ""}

INTERDICTIONS ABSOLUES :
- JAMAIS d'allure sp\xE9cifique (5k/10k/semi/marathon/course) dans les mainSet ni de mention "allure sp\xE9" / "allure course".
- JAMAIS de "phase sp\xE9cifique" ni "phase aff\xFBtage" \u2014 seules les phases "fondamental", "developpement" et "recuperation" existent
- JAMAIS de VMA/fractionn\xE9 intense en phase fondamentale (semaines 1 \xE0 ${pdpFondWeeks})
${pdpIsOverweight ? `- JAMAIS de fractionn\xE9, fartlek, c\xF4tes, ni s\xE9ance \xE0 haute intensit\xE9 (IMC ${pdpBmi.toFixed(1)} \u2265 30 \u2192 risque articulaire). Uniquement : Jogging EF, Sortie Longue EF, Renforcement, Marche/Course. Footing progressif autoris\xE9 mais finir en endurance active MAX (PAS au seuil).` : ""}

S\xC9ANCES AUTORIS\xC9ES PAR PHASE :
- Phase FONDAMENTALE : ${pdpNeedsMarcheCourse ? "Alternance marche/course les 2-3 premi\xE8res semaines, puis Jogging EF" : "Jogging EF"} + Renforcement + Sortie Longue EF. Z\xC9RO intensit\xE9.
  ${!pdpIsOverweight ? "\u2022 Varier les formats : footing nature (sentiers, parcs), footing urbain, marche rapide active avec d\xE9nivel\xE9 l\xE9ger." : "\u2022 Varier : footing sur sol souple (parcs, chemins), marche rapide active (excellent pour br\xFBler sans impact)."}
- Phase D\xC9VELOPPEMENT : Jogging EF + Renforcement + SL EF + fartlek DOUX (acc\xE9l\xE9rations 30s-1min, PAS de VMA pure). Le fartlek ne doit PAS d\xE9passer 15-20% de la dur\xE9e de la s\xE9ance. Max 1 s\xE9ance avec intensit\xE9 l\xE9g\xE8re par semaine.
  ${!pdpIsOverweight ? `\u2022 DIVERSIFIER les s\xE9ances (OBLIGATOIRE \u2014 ne jamais r\xE9p\xE9ter le m\xEAme format 2 fois dans la semaine) :
    - Fartlek nature : acc\xE9l\xE9rations libres 30s-1min30 au feeling dans un parc/for\xEAt, r\xE9cup en trottinant
    - S\xE9ance c\xF4tes douces : 4-6 mont\xE9es de 30-45s \xE0 effort mod\xE9r\xE9 (6-7/10), redescente en marchant
    - Circuit cardio-renfo : alternance 4-5 min course EF + 3-4 exercices renfo (squats, fentes, gainage) \xD7 3-4 tours
    - Footing progressif : d\xE9part tr\xE8s lent (r\xE9cup) \u2192 finir les 5 derni\xE8res min en endurance active
    - Footing technique : focus cadence \xE9lev\xE9e (170-180 pas/min), foul\xE9e courte, posture droite` : `\u2022 Diversifier SANS impact excessif :
    - Footing progressif : d\xE9part tr\xE8s lent \u2192 finir l\xE9g\xE8rement plus vite les 5 derni\xE8res min
    - Marche rapide en c\xF4te : excellent ratio d\xE9pense calorique / impact articulaire
    - Circuit renfo allong\xE9 : alterner marche rapide 3 min + exercices bas du corps \xD7 4-5 tours`}
- Phase R\xC9CUP\xC9RATION : Jogging l\xE9ger EF + Renforcement all\xE9g\xE9. Volume -30%.

STRUCTURE 3+1 OBLIGATOIRE :
3 semaines de charge progressive \u2192 1 semaine de r\xE9cup\xE9ration (-30% volume).
Ex sur 12 semaines : S1-S3 (charge) \u2192 S4 (r\xE9cup) \u2192 S5-S7 (charge) \u2192 S8 (r\xE9cup) \u2192 S9-S11 (charge) \u2192 S12 (r\xE9cup/bilan)

PROGRESSION DU VOLUME TOTAL HEBDO (OBLIGATOIRE) :
- S1-S3 : ${pdpIsLowVMA ? "1h00-1h20" : "1h20-1h40"}/semaine (hors renfo)
- S5-S7 : ${pdpIsLowVMA ? "1h20-1h45" : "1h40-2h00"}/semaine
- S9-S11 : ${pdpIsLowVMA ? "1h40-2h00" : "2h00-2h20"}/semaine
- Augmentation max : +10-15% par semaine. JAMAIS plus.
Les FOOTINGS doivent aussi progresser (pas seulement la SL) : de 25-30 min (S1) \xE0 35-45 min (S9-S11).

PROGRESSION SORTIE LONGUE (OBLIGATOIRE) :
- S1-S3 : SL de 30-35 min
- S5-S7 : SL de 40-50 min
- S9-S11 : SL de 50-${pdpMaxSLmin} min
- Semaines de r\xE9cup : SL r\xE9duite de 30% (ex: 50 min \u2192 35 min)
\u26A0\uFE0F La SL ne doit JAMAIS rester identique 2 semaines de suite. Plafond : ${pdpMaxSLmin} min pour ce profil.

RENFORCEMENT \u2014 CADRAGE OBLIGATOIRE :
- Dur\xE9e : 20-30 min (JAMAIS plus de 35 min)
- Exercices : poids de corps uniquement (squats, fentes, gainage ventral/lat\xE9ral, pompes adapt\xE9es, mont\xE9es de chaise)
- PAS de pliom\xE9trie lourde (pas de box jumps, burpees, sauts en contrebas)
- PAS de charges lourdes sans exp\xE9rience confirm\xE9e
- Focus : bas du corps + gainage = protection articulaire + m\xE9tabolisme
- Progression : augmenter les reps (3x12 \u2192 3x15 \u2192 3x18) avant de varier les exercices

EFFORT PER\xC7U DANS LES MAINSET (OBLIGATOIRE) :
Chaque mainSet DOIT mentionner le niveau d'effort per\xE7u :
- Jogging EF / SL : "Effort per\xE7u 4/10 \u2014 conversation facile, respiration ais\xE9e"
- Fartlek doux (acc\xE9l\xE9rations) : "Effort per\xE7u 6-7/10 sur les acc\xE9l\xE9rations, retour \xE0 4/10 entre"
- R\xE9cup\xE9ration : "Effort per\xE7u 3/10 \u2014 tr\xE8s tr\xE8s facile, trot lent"

${pdpNeedsMarcheCourse ? `ALTERNANCE MARCHE/COURSE (semaines 1-3) :
L'allure EF (${pdpEfPace}/km) est tr\xE8s lente pour ce profil. Les 2-3 premi\xE8res semaines, proposer :
- Jogging : alternance 2 min course / 1 min marche, puis 3 min course / 1 min marche
- SL : alternance 3 min course / 2 min marche
Transition vers course continue \xE0 partir de S4-S5 selon le ressenti.
` : ""}
SIGNAUX D'ALERTE \xC0 MENTIONNER :
Dans l'advice de la premi\xE8re s\xE9ance, inclure : "Si tu ressens une douleur au genou, \xE0 la cheville ou au tibia pendant la course, arr\xEAte-toi et marche. Ne force jamais sur une douleur articulaire. Les courbatures musculaires sont normales, les douleurs articulaires ne le sont pas."

COH\xC9RENCE DUR\xC9E/DISTANCE/MAINSET (CRITIQUE) :
Le champ "duration" et le contenu du "mainSet" doivent \xEAtre IDENTIQUES.
Si duration = "45 min", le mainSet ne doit PAS d\xE9crire 1h20 de course.
Calcul : distance = dur\xE9e \xF7 allure EF. Ex: 45 min \xE0 ${pdpEfPace}/km \u2248 ${(45 / (parseInt(pdpEfPace.split(":")[0]) + parseInt(pdpEfPace.split(":")[1] || "0") / 60)).toFixed(1)} km.

NOMMAGE : types autoris\xE9s = "Jogging", "Sortie Longue", "Renforcement"${!pdpIsOverweight ? ', "Fractionn\xE9"' : ""}${pdpNeedsMarcheCourse ? ', "Marche/Course"' : ""}. ${!pdpIsOverweight ? 'Le type "Fractionn\xE9" inclut fartlek doux, c\xF4tes douces, circuit cardio-renfo (uniquement en phase d\xE9veloppement).' : ""}

PRIORIT\xC9 ABSOLUE : s\xE9curit\xE9 > r\xE9gularit\xE9 > progression > plaisir > d\xE9pense calorique.`;
    })() : ""}

${goal.includes("Hyrox") ? (() => {
      const hyroxFreq = data.frequency || 3;
      const hyroxVma = vmaEstimate?.vma || data.vma || 14;
      const hyroxLevel = data.level || "Interm\xE9diaire (R\xE9gulier)";
      const hyroxIsBeginnerish = hyroxLevel.includes("D\xE9butant") || hyroxVma < 12;
      const hyroxPrevTime = data.hyroxPreviousTime || "";
      const hyroxVolActuel = data.currentWeeklyVolume;
      return `\u{1F534} PLAN HYROX \u2014 PR\xC9PA COURSE \xC0 PIED (OBLIGATOIRE) :
Ce plan couvre UNIQUEMENT la partie course \xE0 pied de la pr\xE9paration Hyrox.
L'athl\xE8te fait ses entra\xEEnements fonctionnels (rameur, sled push, wall balls, burpees, etc.) \xC0 C\xD4T\xC9 de ce plan.
${hyroxPrevTime ? `Temps Hyrox pr\xE9c\xE9dent : ${hyroxPrevTime} (contexte niveau, pas pour les allures).` : ""}

FORMAT HYROX : 8 \xD7 1km de course entrecoup\xE9s de 8 stations fonctionnelles.
\u2192 L'effort running est de type SEUIL FRACTIONN\xC9 avec coupures.
\u2192 La capacit\xE9 \xE0 RELANCER apr\xE8s un effort non-running est la cl\xE9.
\u2192 Distance running totale : 8 km. Ce n'est PAS un 10km continu.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
GESTION PAR FR\xC9QUENCE \u2014 ${hyroxFreq} S\xC9ANCES/SEMAINE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${hyroxFreq <= 2 ? `\u26A0\uFE0F FR\xC9QUENCE BASSE (${hyroxFreq}x/sem) \u2014 L'athl\xE8te fait beaucoup de fonctionnel \xE0 c\xF4t\xE9.
PRIORIT\xC9 DES S\xC9ANCES (par ordre d'importance) :
1. \u{1F511} S\xE9ance cl\xE9 Hyrox (simulation 8\xD71km OU tempo seuil OU relances sous fatigue) \u2014 TOUJOURS pr\xE9sente
2. Footing EF (base a\xE9robie, r\xE9cup\xE9ration active)
RENFO : int\xE9gr\xE9 en fin de footing EF (10 min de gainage/proprioception) plut\xF4t qu'une s\xE9ance d\xE9di\xE9e.
Volume cible : ${hyroxIsBeginnerish ? "10-15" : "15-25"} km/sem max. Chaque s\xE9ance compte.` : hyroxFreq === 3 ? `FR\xC9QUENCE STANDARD (3x/sem) \u2014 Bon \xE9quilibre running/fonctionnel.
STRUCTURE HEBDO ID\xC9ALE :
1. \u{1F511} S\xE9ance cl\xE9 Hyrox (simulation OU tempo OU relances) \u2014 OBLIGATOIRE
2. Footing EF (30-45 min) \u2014 base a\xE9robie
3. Renforcement pr\xE9vention (25-35 min) OU 2e footing EF
Volume cible : ${hyroxIsBeginnerish ? "15-20" : "20-35"} km/sem.` : hyroxFreq === 4 ? `FR\xC9QUENCE \xC9LEV\xC9E (4x/sem) \u2014 Athl\xE8te qui investit dans le running.
STRUCTURE HEBDO ID\xC9ALE :
1. \u{1F511} S\xE9ance cl\xE9 Hyrox (simulation OU tempo OU relances) \u2014 OBLIGATOIRE
2. Footing EF (35-50 min) \u2014 base a\xE9robie
3. 2e s\xE9ance qualit\xE9 OU footing progressif
4. Renforcement pr\xE9vention
Volume cible : ${hyroxIsBeginnerish ? "20-30" : "30-45"} km/sem.` : `FR\xC9QUENCE HAUTE (${hyroxFreq}x/sem) \u2014 Volume running important.
STRUCTURE HEBDO ID\xC9ALE :
1. \u{1F511} S\xE9ance cl\xE9 Hyrox (simulation 8\xD71km) \u2014 OBLIGATOIRE
2. 2e s\xE9ance qualit\xE9 (tempo OU relances OU VMA courte)
3-4. Footings EF vari\xE9s (progressif, nature, technique)
5. Renforcement pr\xE9vention
Volume cible : ${hyroxIsBeginnerish ? "25-35" : "35-50"} km/sem.
\u26A0\uFE0F Attention \xE0 la charge totale (running + fonctionnel). Pr\xE9voir au moins 1 jour OFF complet/semaine.`}

${hyroxIsBeginnerish ? `
\u{1F6B6}\u200D\u2642\uFE0F ADAPTATION D\xC9BUTANT / VMA BASSE (${hyroxVma.toFixed(1)} km/h) :
- Semaines 1-3 : PAS de s\xE9ance seuil. Uniquement footings EF + renfo. Construire la base.
- Semaine 4+ : introduction progressive avec fartlek doux (acc\xE9l\xE9rations 20-30s au feeling, r\xE9cup 1min30).
- Simulation Hyrox (8\xD71km) : PAS AVANT la phase sp\xE9cifique. Et commencer par 4\xD71km puis monter \xE0 6 puis 8.
- Allure des 1km : commencer \xE0 allure EA (${paces?.eaPace || "5:30"} min/km), pas au seuil.
- Les footings peuvent inclure de la marche si n\xE9cessaire.
` : ""}

${hyroxVolActuel !== void 0 && hyroxVolActuel !== null ? `VOLUME ACTUEL D\xC9CLAR\xC9 : ${hyroxVolActuel} km/sem.
${hyroxVolActuel === 0 ? "\u2192 L'athl\xE8te ne court PAS actuellement. D\xE9marrer \xE0 8-12 km/sem max. Progression tr\xE8s progressive. Marche/course autoris\xE9e." : hyroxVolActuel < 15 ? `\u2192 Volume faible. D\xE9marrer \xE0 ${Math.max(hyroxVolActuel, 8)} km/sem. Ne pas d\xE9passer +15%/semaine.` : hyroxVolActuel < 30 ? `\u2192 Volume mod\xE9r\xE9. D\xE9marrer \xE0 ${Math.round(hyroxVolActuel * 0.9)} km/sem. Marge de progression confortable.` : `\u2192 Volume \xE9lev\xE9 (${hyroxVolActuel}km). Attention : l'athl\xE8te fait aussi du fonctionnel. Ne pas cumuler > ${hyroxVolActuel + 10} km running/sem.`}
` : ""}

CATALOGUE DE S\xC9ANCES HYROX (choisir selon la phase et la fr\xE9quence) :

1. **Simulation Hyrox (s\xE9ance reine)** : \xE0 allure seuil (${paces?.seuilPace || "4:30"}/km), r\xE9cup 2min marche/trot entre chaque.
   \u2192 Phase sp\xE9cifique uniquement. PROGRESSION OBLIGATOIRE : d\xE9but phase sp\xE9 = 4\xD71km, milieu = 6\xD71km, fin = 8\xD71km. Ne JAMAIS commencer directement par 8\xD71km.

2. **Relances sous fatigue** : 15min EF \u2192 6\xD7(30s acc\xE9l\xE9ration VMA + 1min30 r\xE9cup trot) \u2192 10min EF.
   \u2192 Simule la relance apr\xE8s une station. Phase d\xE9veloppement+.

3. **Tempo Run Hyrox** : 20-30min continu \xE0 allure seuil (${paces?.seuilPace || "4:30"}/km).
   \u2192 Endurance sp\xE9cifique. Phase d\xE9veloppement+.

4. **Intervalles courts** : 10-12\xD7400m \xE0 allure VMA (${paces?.vmaPace || "3:30"}/km), r\xE9cup 1min.
   \u2192 Puissance et vitesse. Phase d\xE9veloppement+.

5. **Fartlek libre** : footing EF avec 6-8 acc\xE9l\xE9rations de 20-40s au feeling, r\xE9cup libre.
   \u2192 Introduction \xE0 l'intensit\xE9. D\xE8s la phase fondamentale (S3+).

6-8. **Footing EF** (${paces?.efPace || "6:00"}/km), **Footing progressif** (fin \xE0 allure EA/seuil), **Renforcement pr\xE9vention** (gainage+quads+mollets+proprio, 25-35min \u2014 PAS DE FONCTIONNEL HYROX, il le fait \xE0 c\xF4t\xE9).

PHASES :
- FONDAMENTALE : Footings EF vari\xE9s + fartlek doux d\xE8s S3 + Renfo. PAS de simulation Hyrox.
- D\xC9VELOPPEMENT : 1 s\xE9ance qualit\xE9/sem (tempo OU intervalles OU relances) + footings EF + renfo.
- SP\xC9CIFIQUE : 1 simulation Hyrox (progression 4\u21926\u21928\xD71km) + ${hyroxFreq >= 4 ? "1 s\xE9ance qualit\xE9 (relances ou tempo) + " : ""}footings EF + renfo.
- AFF\xDBTAGE : volume -40%. Rappels d'allure courts (3-4\xD71km). Footings l\xE9gers.

VOLUME RUNNING HYROX (le running est 8km, pas 42km \u2014 adapter les volumes) :
- Les SL ne d\xE9passent PAS 1h15 (12-15km max).
- Le volume hebdo doit rester MOD\xC9R\xC9 \u2014 les stations Hyrox (sled, wall balls, burpees) sont travaill\xE9es hors de ce plan.
- Pr\xE9voir au moins 1 jour OFF complet sans running NI fonctionnel par semaine.

NOMMAGE TITRES (Hyrox-flavored sur les s\xE9ances de course \u2014 le titre du renfo est g\xE9n\xE9r\xE9 s\xE9par\xE9ment par le code, NE PAS le r\xE9\xE9crire) :
- Footing EF \u2192 "Footing \u2014 Base a\xE9robie Hyrox" ou "Footing en aisance \u2014 Pr\xE9pa Hyrox"
- Sortie Longue \u2192 "Sortie Longue \u2014 Volume a\xE9robie Hyrox"
- Marche/Course \u2192 "Marche/Course \u2014 D\xE9marrage progressif Hyrox"
- S\xE9ances sp\xE9cifiques \u2192 "Simulation Hyrox 4\xD71km", "Simulation Hyrox 6\xD71km", "Simulation Hyrox 8\xD71km", "Tempo Hyrox", "Relances sous fatigue Hyrox"
- Types JSON inchang\xE9s : "Jogging", "Sortie Longue", "Fractionn\xE9", "Renforcement", "Marche/Course"
\u2192 Objectif : l'utilisateur doit voir "Hyrox" sur les titres des s\xE9ances de course pour percevoir la sp\xE9cificit\xE9 du plan. Le titre du renfo est automatiquement "Renfo Hyrox Focus A/B - ..." via le code.

ADVICE PAR S\xC9ANCE \u2014 INTERDICTION DE COPY-PASTE :
Chaque advice DOIT \xEAtre UNIQUE. Pour les s\xE9ances de COURSE, faire le lien avec la performance Hyrox (r\xE9servoir a\xE9robie, capacit\xE9 \xE0 encha\xEEner les 8 segments de course coup\xE9s).
\u26A0\uFE0F Pour le RENFO : le renforcement est du renfo classique de pr\xE9vention des blessures li\xE9es \xE0 la course \xE0 pied (squats, fentes, gainage). NE PAS faire de lien avec les stations Hyrox (sled push, wall balls, sandbag lunges, etc.) \u2014 ce n'est pas l'objet de cette s\xE9ance. Le renfo pr\xE9pare le corps \xE0 supporter le volume de course, pas \xE0 ex\xE9cuter les stations.

Exemples (\xE0 adapter, ne pas copier) :
- Footing EF : "Cette base a\xE9robie te permet de tenir les 8\xD71km Hyrox sans saturer d\xE8s le 3e segment de course. C'est le r\xE9servoir cardio sur lequel reposera ta course."
- Renfo : "Ce travail de renforcement pr\xE9vient les blessures li\xE9es \xE0 la course \xE0 pied (genoux, mollets, cha\xEEne post\xE9rieure). Un corps solide tient mieux le volume hebdomadaire et limite le risque d'arr\xEAt sur blessure."
- Sortie Longue : "Volume a\xE9robie = ton r\xE9servoir pour encha\xEEner les 8km coup\xE9s. Tu construis ton endurance globale de coureur."
- Marche/Course : "D\xE9marrage en douceur pour habituer ton corps \xE0 l'effort r\xE9p\xE9t\xE9 sans risque de blessure."
- S\xE9ance cl\xE9 Hyrox (phase sp\xE9+) : conseils de pacing et technique de relance apr\xE8s un segment de course rapide.
\u{1F6AB} INTERDIT : r\xE9p\xE9ter "Ce programme couvre la partie course \xE0 pied" dans plusieurs advice.
La mention "ce plan = running uniquement, fonctionnel \xE0 c\xF4t\xE9" doit aller UNE SEULE FOIS dans le welcomeMessage.

WELCOMEMESSAGE HYROX (obligatoirement) :
1. UNE phrase qui clarifie : ce plan couvre la partie course \xE0 pied de la pr\xE9pa Hyrox. L'athl\xE8te g\xE8re son fonctionnel \xE0 c\xF4t\xE9.
2. Mini-roadmap des phases sur ${planDurationWeeks} semaines pour donner de la perspective d\xE8s la S1 :
   - "Semaines 1-3 : base a\xE9robie + technique (tu y es)"
   - "Semaines 4-6 : introduction fartlek + acc\xE9l\xE9rations courtes"
   - "Semaines 7+ : simulations Hyrox progressives 4\xD71km \u2192 6\xD71km \u2192 8\xD71km"
   - "Aff\xFBtage final : rappels d'allure avant ta course"
3. Une phrase de motivation orient\xE9e Hyrox sp\xE9cifiquement (pas un message running g\xE9n\xE9rique).`;
    })() : ""}

${isFinisherTarget(data.targetTime) && !goal.includes("Perte") && !goal.includes("Maintien") && !goal.includes("Remise") && !goal.includes("Hyrox") ? `\u{1F534} PLAN FINISHER \u2014 R\xC8GLES SP\xC9CIFIQUES :
L'objectif est de TERMINER la course, pas de performer. Adapte la philosophie du plan :
- Priorit\xE9 ABSOLUE : endurance fondamentale (EF), r\xE9gularit\xE9, r\xE9sistance \xE0 la fatigue
- MOINS d'intensit\xE9 que pour un plan chrono : pas de fractionn\xE9 VMA avant la phase d\xE9veloppement, seuil limit\xE9
- S\xE9ances plus longues en dur\xE9e mais \xE0 allure CONFORTABLE (EF / allure marathon+)
- Sortie Longue = s\xE9ance cl\xE9 du plan, toujours en EF, objectif = habituer le corps \xE0 la dur\xE9e
- Fractionn\xE9 limit\xE9 \xE0 1x/semaine max en phase d\xE9veloppement/sp\xE9cifique, orient\xE9 seuil plut\xF4t que VMA
- PAS d'objectif de temps dans les mainSet. Pas d'allure sp\xE9cifique course.` : ""}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
                    INSTRUCTIONS
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
1. G\xE9n\xE8re SEULEMENT la semaine 1 (pas les autres !)
2. Allures EXACTES dans chaque mainSet
3. Message de bienvenue orient\xE9 OBJECTIF et STRUCTURE (PAS de VMA ni allures)
4. \xC9valuation de faisabilit\xE9 HONN\xCATE avec chiffres
5. OBLIGATOIRE : 1 s\xE9ance de type "Renforcement" par semaine (compt\xE9e dans les ${data.frequency} s\xE9ances)
   - R\xE9partition : ${data.frequency} s\xE9ances = ${data.frequency - 1} running + 1 renfo
   - Dur\xE9e : 30-45 min
   - Type dans le JSON : "Renforcement"
   - NE PAS mettre de s\xE9ance "Repos" dans le plan
   - NE PAS g\xE9n\xE9rer le contenu du mainSet renfo \u2014 le code le fera
6. COH\xC9RENCE DUR\xC9E/DISTANCE/MAINSET (CRITIQUE) :
   Le champ "duration", le champ "distance" et le contenu du "mainSet" doivent \xEAtre COH\xC9RENTS entre eux.
   Si duration = "45 min" et allure EF = ${data.vma ? Math.floor(3600 / (data.vma * 0.67) / 60) + ":" + String(Math.round(3600 / (data.vma * 0.67) % 60)).padStart(2, "0") : "8:00"}/km, alors distance \u2248 ${data.vma ? (45 / (3600 / (data.vma * 0.67) / 60)).toFixed(1) : "5.6"} km.
   Le mainSet ne doit JAMAIS d\xE9crire une dur\xE9e diff\xE9rente de "duration". Ex: si duration="45 min", ne PAS \xE9crire "1h20 de course" dans le mainSet.
${!(data.goal || "").toLowerCase().includes("perte") && !(data.goal || "").toLowerCase().includes("hyrox") ? `7. NOMMAGE types : "Jogging", "Fractionn\xE9", "Sortie Longue", "R\xE9cup\xE9ration", "Renforcement", "Marche/Course" (pas de variantes).` : ""}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              TRAIL & FAISABILIT\xC9
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${trailSectionPreview}
\u{1F4CA} FAISABILIT\xC9 PR\xC9-CALCUL\xC9E :
${feasibilityTextPreview}
\u{1F6A8} NE PAS reformuler ce message. Le champ feasibility.message dans ton JSON DOIT \xEAtre EXACTEMENT le texte ci-dessus, mot pour mot, sans changer aucun chiffre ni aucune distance. Copie-le tel quel.

${buildSafetyInstructions(data, (data.level || "").includes("D\xE9butant"))}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
                    FORMAT JSON
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
{
  "name": "Nom du plan incluant objectif",
  "goal": "${data.goal}",
  "startDate": "${data.startDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]}",
  "durationWeeks": ${planDurationWeeks},
  "sessionsPerWeek": ${data.frequency},
  "targetTime": "${data.targetTime || ""}",
  "distance": "${data.goal === "Trail" && data.trailDetails ? `${data.trailDetails.distance}km D+${data.trailDetails.elevation}m` : data.subGoal || ""}",
  "location": "${data.city || ""}",
  "suggestedLocations": [
    { "name": "Nom r\xE9el du lieu", "type": "PARK|TRACK|NATURE|HILL", "description": "Pour quel type de s\xE9ance" }
  ],
  "welcomeMessage": "Message personnalis\xE9 orient\xE9 OBJECTIF et STRUCTURE du plan (NE PAS mentionner VMA ni allures)",
  "confidenceScore": 75,
  "feasibility": {
    "status": "BON",
    "message": "Analyse avec chiffres VMA/temps th\xE9orique",
    "safetyWarning": "Conseil s\xE9curit\xE9"
  },
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Th\xE8me de la semaine",
      "phase": "${generationContext.periodizationPlan.weeklyPhases[0]}",
      "sessions": [
        {
          "day": "Jour",
          "type": "Type",
          "title": "Titre unique",
          "duration": "dur\xE9e",
          "distance": "distance",
          "intensity": "Facile|Mod\xE9r\xE9|Difficile",
          "targetPace": "allure",
          "elevationGain": 600,
          "locationSuggestion": "Lieu r\xE9el adapt\xE9 \xE0 cette s\xE9ance",
          "warmup": "\xE9chauffement avec allure",
          "mainSet": "corps d\xE9taill\xE9 avec allures EXACTES",
          "cooldown": "retour au calme",
          "advice": "conseil personnalis\xE9"
        }
      ]
    }
  ]
}
`;
    console.log("[Gemini Preview] Envoi prompt optimis\xE9...");
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: previewPrompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    const response = await result.response;
    const text = response.text();
    const plan = JSON.parse(text);
    if (data.goal === "Trail" && data.trailDetails?.distance && data.trailDetails?.elevation) {
      plan.distance = `${data.trailDetails.distance}km D+${data.trailDetails.elevation}m`;
    }
    plan.id = Date.now().toString();
    plan.createdAt = (/* @__PURE__ */ new Date()).toISOString();
    plan.calculatedVMA = vmaEstimate.vma;
    plan.vma = paces.vma;
    plan.vmaSource = vmaSource;
    plan.paces = {
      efPace: paces.efPace,
      eaPace: paces.eaPace,
      seuilPace: paces.seuilPace,
      vmaPace: paces.vmaPace,
      recoveryPace: paces.recoveryPace,
      allureSpecifique5k: paces.allureSpecifique5k,
      allureSpecifique10k: paces.allureSpecifique10k,
      allureSpecifiqueSemi: paces.allureSpecifiqueSemi,
      allureSpecifiqueMarathon: paces.allureSpecifiqueMarathon
    };
    plan.isPreview = true;
    plan.fullPlanGenerated = false;
    plan.generationContext = generationContext;
    if (data.raceDate) {
      plan.raceDate = data.raceDate;
    }
    plan.adaptationLog = {
      weekNumber: 0,
      adaptationsThisWeek: 0,
      adaptationHistory: []
    };
    const DAYS_ORDER_PREV = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    let prefDays = data.preferredDays && data.preferredDays.length > 0 ? [...data.preferredDays] : null;
    if (prefDays && prefDays.length < data.frequency) {
      const allDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
      while (prefDays.length < data.frequency) {
        const available = allDays.filter((d) => !prefDays.includes(d));
        if (available.length === 0) break;
        const existingIndices = prefDays.map((d) => allDays.indexOf(d));
        let bestDay = available[0];
        let bestMinDist = 0;
        for (const candidate of available) {
          const ci = allDays.indexOf(candidate);
          const minDist = Math.min(...existingIndices.map((ei) => Math.min(Math.abs(ci - ei), 7 - Math.abs(ci - ei))));
          if (minDist > bestMinDist) {
            bestMinDist = minDist;
            bestDay = candidate;
          }
        }
        prefDays.push(bestDay);
        console.log(`[Gemini Preview] Jour auto-ajout\xE9: ${bestDay} (${prefDays.length}/${data.frequency})`);
      }
      prefDays.sort((a, b) => allDays.indexOf(a) - allDays.indexOf(b));
    }
    if (plan.weeks && plan.weeks[0]?.sessions) {
      if (prefDays) {
        plan.weeks[0].sessions.forEach((session, idx) => {
          if (idx < prefDays.length && session.day !== prefDays[idx]) {
            console.log(`[Gemini Preview] Correction jour: s\xE9ance ${idx + 1} "${session.day}" \u2192 "${prefDays[idx]}"`);
            session.day = prefDays[idx];
          }
        });
      }
      enforceSLDay(plan.weeks[0], data.preferredLongRunDay || "Dimanche", "[Gemini Preview] ");
      const usedDays = /* @__PURE__ */ new Set();
      plan.weeks[0].sessions.forEach((session, idx) => {
        if (usedDays.has(session.day)) {
          const pool = prefDays || DAYS_ORDER_PREV;
          let available = pool.filter((d) => !usedDays.has(d));
          if (available.length === 0) {
            available = DAYS_ORDER_PREV.filter((d) => !usedDays.has(d));
          }
          if (available.length > 0) session.day = available[0];
        }
        usedDays.add(session.day);
        session.id = `w1-s${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      });
      if (plan.weeks[0].sessions.length > data.frequency) {
        console.warn(`[Gemini Preview] ${plan.weeks[0].sessions.length} s\xE9ances au lieu de ${data.frequency} \u2014 tronqu\xE9`);
        plan.weeks[0].sessions = plan.weeks[0].sessions.slice(0, data.frequency);
      }
      plan.weeks[0].sessions.sort(
        (a, b) => DAYS_ORDER_PREV.indexOf(a.day) - DAYS_ORDER_PREV.indexOf(b.day)
      );
    }
    plan.durationWeeks = planDurationWeeks;
    plan.sessionsPerWeek = data.frequency;
    if (plan.startDate) {
      const rawSD = new Date(plan.startDate);
      const dow = rawSD.getDay();
      const daysToMon = dow === 0 ? -6 : 1 - dow;
      if (daysToMon !== 0) {
        rawSD.setDate(rawSD.getDate() + daysToMon);
        plan.startDate = rawSD.toISOString().split("T")[0];
        console.log(`[Gemini Preview] startDate aligned to Monday: ${plan.startDate}`);
      }
    }
    if (plan.startDate && planDurationWeeks) {
      const sd = new Date(plan.startDate);
      sd.setDate(sd.getDate() + planDurationWeeks * 7);
      plan.endDate = sd.toISOString().split("T")[0];
      console.log(`[Gemini Preview] endDate calcul\xE9e: ${plan.endDate} (${planDurationWeeks} semaines apr\xE8s ${plan.startDate})`);
    }
    if (plan.weeks && plan.weeks[0]?.sessions) {
      plan.weeks[0].sessions.forEach((session) => {
        if (session.type === "Renforcement") {
          const renfo = buildRenfoMainSet({
            weekNumber: 1,
            goal: data.goal || "",
            subGoal: data.subGoal,
            trailDistance: data.goal === "Trail" ? data.trailDetails?.distance : void 0,
            level: getEffectiveLevel(data),
            phase: plan.weeks[0].phase || "fondamental",
            weight: data.weight,
            height: data.height,
            age: data.age,
            injuries: data.injuries
          });
          session.mainSet = renfo.mainSet;
          session.warmup = renfo.warmup;
          session.cooldown = renfo.cooldown;
          session.duration = renfo.duration;
          session.title = renfo.title;
        }
      });
    }
    if (plan.weeks && plan.weeks[0]?.sessions) {
      const w1 = plan.weeks[0];
      const phaseLc = (w1.phase || "fondamental").toLowerCase();
      if (phaseLc === "fondamental" || phaseLc === "recuperation") {
        const footingFlags = detectFootingFlags({
          weight: data.weight,
          height: data.height,
          age: data.age,
          level: getEffectiveLevel(data),
          injuries: data.injuries
        });
        w1.sessions.forEach((session, idx) => {
          if (session.type === "Jogging" && (session.intensity === "Facile" || !session.intensity)) {
            const variant = buildFootingVariant({
              weekNumber: 1,
              sessionIndex: idx,
              goal: data.goal || "",
              durationStr: session.duration || "45 min",
              efPace: paces.efPace || session.targetPace || "",
              flags: footingFlags,
              sessionElevation: session.elevationGain,
              sessionTitle: session.title,
              seed: plan.id || ""
            });
            session.title = variant.title;
            session.warmup = variant.warmup;
            session.mainSet = variant.mainSet;
            session.cooldown = variant.cooldown;
            session.advice = variant.advice;
          }
        });
      }
    }
    if (plan.weeks && Array.isArray(plan.weeks)) {
      const trailDist = data.goal === "Trail" && data.trailDetails?.distance ? data.trailDetails.distance : 0;
      plan.weeks.forEach((week) => postProcessWeekQuality(week, paces, "Premi\xE8re semaine \u2014 mise en route progressive", data.goal, trailDist));
      plan.weeks.forEach((week, idx) => {
        const targetVol = generationContext.periodizationPlan.weeklyVolumes[idx] || 0;
        enforceWeekConstraints(week, targetVol, data);
      });
      enforceFullPlanConstraints(plan.weeks, generationContext.periodizationPlan.weeklyVolumes, data);
    }
    plan.name = buildPlanName(data, planDurationWeeks);
    if (plan.welcomeMessage) plan.welcomeMessage = forceTutoiement(plan.welcomeMessage);
    if (plan.feasibility?.message) plan.feasibility.message = forceTutoiement(plan.feasibility.message);
    if (plan.feasibility?.safetyWarning) plan.feasibility.safetyWarning = forceTutoiement(plan.feasibility.safetyWarning);
    if (data.goal === "Trail" && data.trailDetails && plan.weeks?.[0]?.sessions) {
      const detectedLevel = detectLevelFromData(data);
      const weekTarget = calculateWeekTargetElevation(
        1,
        planDurationWeeks,
        data.trailDetails.elevation,
        detectedLevel,
        data.currentWeeklyElevation,
        plan.weeks[0].phase || "fondamental"
      );
      console.log(`[Trail D+ Preview] S1: raceElev=${data.trailDetails.elevation}m, level=${detectedLevel}, weekTarget=${weekTarget}m, sessions=${plan.weeks[0].sessions.length}`);
      distributeElevationToSessions(plan.weeks[0].sessions, weekTarget, detectedLevel);
      logDplusActualVsTarget(plan, generationContext.periodizationPlan.weeklyElevationTarget);
    } else if (data.goal === "Trail") {
      console.warn(`[Trail D+ Preview] SKIPPED: trailDetails=${!!data.trailDetails}, weeks=${!!plan.weeks?.[0]?.sessions}`);
    }
    if (data.goal !== "Trail" && plan.weeks?.[0]?.sessions) {
      let stripped = 0;
      plan.weeks[0].sessions.forEach((s) => {
        if ((s.elevationGain || 0) > 0) {
          stripped += s.elevationGain;
          s.elevationGain = 0;
        }
      });
      if (stripped > 0) {
        console.log(`[Enforce] Stripped ${stripped}m D+ from non-trail plan (S1)`);
      }
    }
    plan.feasibility = {
      status: feasibilityResultPreview.status,
      message: feasibilityResultPreview.message,
      safetyWarning: feasibilityResultPreview.safetyWarning,
      recommendation: feasibilityResultPreview.recommendation
    };
    plan.confidenceScore = feasibilityResultPreview.score;
    const { validatePlanRules: validatePlanRules2 } = await Promise.resolve().then(() => (init_planValidator(), planValidator_exports));
    const validation = validatePlanRules2(plan, data);
    if (validation.issues.length > 0) {
      console.log(`[Gemini Preview] Validation: score=${validation.score}, issues=${validation.issues.length}`);
      validation.issues.forEach((i) => console.log(`  [${i.severity}] S${i.weekNumber}: ${i.message}`));
    }
    await correctFrenchWithAI(plan);
    plan.weeks?.forEach((w) => w.sessions?.forEach((s) => delete s._dedupedFromSL));
    const elapsed = Date.now() - startTime;
    console.log(`[Gemini Preview] Termin\xE9 en ${elapsed}ms (vs ~15-30s pour plan complet)`);
    return plan;
  } catch (error) {
    console.error("[Gemini Preview] Erreur:", error);
    throw error;
  }
};
var generateRemainingWeeks = async (plan, onProgress) => {
  if (!plan.isPreview || !plan.generationContext) {
    throw new Error("Ce plan n'est pas en mode preview ou manque le contexte de g\xE9n\xE9ration");
  }
  console.log("[Gemini Remaining] G\xE9n\xE9ration des semaines restantes par lots...");
  const startTime = Date.now();
  const ctx = plan.generationContext;
  const data = ctx.questionnaireSnapshot;
  const paces = ctx.paces;
  data.vma = ctx.vma;
  const totalWeeks = ctx.periodizationPlan.totalWeeks;
  const frequency = data.frequency || 3;
  const BATCH_SIZE = frequency >= 5 ? 4 : frequency >= 4 ? 5 : 6;
  const goalRemaining = data.goal || "";
  const isAmbitiousRemaining = goalRemaining.includes("Trail") || data.subGoal === "Semi-Marathon" || data.subGoal === "Semi-marathon" || data.subGoal === "Marathon";
  if (isAmbitiousRemaining && data.frequency < 3) {
    console.warn(`[Fr\xE9quence] Remaining: ${data.subGoal || goalRemaining} avec ${data.frequency} s\xE9ances \u2192 forc\xE9 \xE0 3`);
    data.frequency = 3;
  }
  const week1Summary = plan.weeks[0].sessions.map(
    (s) => `${s.day}: ${s.title} (${s.type}, ${s.duration})`
  ).join("\n");
  const preferredDaysInstruction = data.preferredDays && data.preferredDays.length > 0 ? `S\xE9ances UNIQUEMENT sur : ${data.preferredDays.join(", ")}` : "R\xE9partition \xE9quilibr\xE9e";
  const longRunDayRemaining = data.preferredLongRunDay || "Dimanche";
  const isBeginnerLevel = labelToLevelKey(data.level) === "deb";
  const isPertePoidsProg = (data.goal || "").includes("Perte");
  const isMaintienProg = (data.goal || "").includes("Maintien") || (data.goal || "").includes("Remise");
  const ctxVma = ctx.vma;
  const needsMarcheCourseRemaining = isBeginnerLevel || ctxVma < 10.5 && (isPertePoidsProg || isMaintienProg);
  const beginnerProgressionInstruction = needsMarcheCourseRemaining ? `

\u{1F6B6}\u200D\u2642\uFE0F\u{1F3C3} PROGRESSION MARCHE/COURSE POUR D\xC9BUTANT \u{1F6B6}\u200D\u2640\uFE0F\u{1F3C3}\u200D\u2640\uFE0F
Ce coureur est D\xC9BUTANT. Tu dois appliquer une progression d'alternance marche/course :

- Semaines 2-3 : Continuer avec "Marche/Course" - 6-8 x (2 min course + 1 min marche)
- Semaines 4-5 : Progression vers 5-6 x (3 min course + 1 min marche)
- Semaines 6-7 : Transition 3-4 x (5 min course + 1 min marche)
- Semaines 8+ : Introduction progressive du footing continu (15-25 min)
- VMA/Fractionn\xE9 : PAS AVANT semaine 8-10, et uniquement sous forme de fartlek doux

\u26A0\uFE0F Le type "Marche/Course" doit rester dominant jusqu'\xE0 semaine 6-7 !
` : "";
  const isHyroxRemaining = (data.goal || "").includes("Hyrox");
  const hyroxIsBeginnerishRemaining = (data.level || "").includes("D\xE9butant") || ctxVma < 12;
  const hyroxSectionRemaining = isHyroxRemaining ? `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       SP\xC9CIFICIT\xC9S HYROX
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
Ce plan couvre UNIQUEMENT la course \xE0 pied de la pr\xE9pa Hyrox. L'athl\xE8te g\xE8re son fonctionnel \xE0 c\xF4t\xE9.
Format Hyrox : 8\xD71km coup\xE9s par 8 stations fonctionnelles \u2192 priorit\xE9 = SEUIL FRACTIONN\xC9 + capacit\xE9 \xE0 relancer.

NOMMAGE TITRES Hyrox-flavored (titre du renfo g\xE9n\xE9r\xE9 par le code, ne pas le r\xE9\xE9crire) : suffixer/pr\xE9fixer "Hyrox" sur les titres des s\xE9ances de course (Footing "Base a\xE9robie Hyrox", SL "Volume a\xE9robie Hyrox", sp\xE9cifiques "Simulation Hyrox N\xD71km / Tempo Hyrox / Relances sous fatigue Hyrox"). Types JSON inchang\xE9s ("Jogging", "Sortie Longue", "Fractionn\xE9", "Renforcement", "Marche/Course").

ADVICE PAR S\xC9ANCE \u2014 UNIQUE (PAS de copy-paste) :
Pour les s\xE9ances de COURSE, faire le lien avec la performance Hyrox (capacit\xE9 a\xE9robie pour encha\xEEner les 8 segments de course coup\xE9s).
\u26A0\uFE0F Le RENFO est du renfo classique de pr\xE9vention des blessures li\xE9es \xE0 la course \xE0 pied. NE PAS faire de lien avec les stations Hyrox (sled, wall balls, sandbag lunges, etc.) \u2014 c'est hors p\xE9rim\xE8tre. Le renfo pr\xE9pare le corps \xE0 tenir le volume de course.
- Footing : base a\xE9robie pour tenir les 8\xD71km sans saturer cardio
- Renfo : pr\xE9vention des blessures de course (genoux, mollets, cha\xEEne post\xE9rieure) \u2014 permet de tenir le volume sans casse
- Sortie Longue : r\xE9servoir pour encha\xEEner les 8km coup\xE9s
- Simulation/Tempo : conseils pacing et technique de relance apr\xE8s un segment de course rapide
\u{1F6AB} INTERDIT : r\xE9p\xE9ter "Ce programme couvre la partie course \xE0 pied" dans plusieurs advice.

PROGRESSION SIMULATION HYROX (s\xE9ance reine, phase SP\xC9CIFIQUE uniquement) :
- D\xE9but phase sp\xE9 : 4\xD71km \xE0 allure seuil, r\xE9cup 2min marche/trot
- Milieu : 6\xD71km
- Fin : 8\xD71km
- JAMAIS commencer directement par 8\xD71km

${hyroxIsBeginnerishRemaining ? `\u{1F6B6} ADAPTATION D\xC9BUTANT (VMA ${ctxVma.toFixed(1)} km/h) :
- Semaines 1-3 (fondamental) : PAS de s\xE9ance seuil. Uniquement footings EF + renfo.
- Semaines 4+ : introduction fartlek doux (acc\xE9l\xE9rations 20-30s au feeling).
- Simulation Hyrox : commencer par 4\xD71km en phase sp\xE9cifique seulement.
` : ""}
VOLUME : SL max 1h15 (12-15km). Volume hebdo mod\xE9r\xE9 (les stations Hyrox sont travaill\xE9es hors de ce plan).
` : "";
  const remainingObjective = detectObjectiveFromData(data);
  const isTrailRemaining = data.goal === "Trail" && data.trailDetails;
  const isVKRemaining = remainingObjective === "VK";
  const isTrailSteepRemaining = remainingObjective === "TrailSteep";
  const trailSectionRemaining = isTrailRemaining ? isVKRemaining ? `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       SP\xC9CIFICIT\xC9S VK / COURSE DE C\xD4TE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
Distance course : ${data.trailDetails.distance} km | D+ : ${data.trailDetails.elevation} m
Ratio D+/km : ${Math.round(data.trailDetails.elevation / data.trailDetails.distance)} m/km

\u26A0\uFE0F FORMAT VK \u2014 PAS un trail classique :
- Volume hebdomadaire TR\xC8S R\xC9DUIT. Pas de footing > 10km.
- Priorit\xE9 ABSOLUE : puissance en c\xF4te (VMA c\xF4te, c\xF4tes courtes 30-60", escaliers, r\xE9p\xE9titions en mont\xE9e)
- Sortie longue orient\xE9e D\xC9NIVEL\xC9 (pas distance) \u2014 1h-1h30 max avec D+ maximum
- Le fractionn\xE9 en c\xF4te EST AUTORIS\xC9 d\xE8s la phase fondamentale (geste sp\xE9cifique VK)
- Renforcement sp\xE9cifique : squats, fentes, mollets, gainage, proprioception
` : isTrailSteepRemaining ? `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       SP\xC9CIFICIT\xC9S TRAIL RAIDE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
Distance course : ${data.trailDetails.distance} km | D+ : ${data.trailDetails.elevation} m
Ratio D+/km : ${Math.round(data.trailDetails.elevation / data.trailDetails.distance)} m/km

\u26A0\uFE0F TRAIL RAIDE \u2014 Ratio D+/km \xE9lev\xE9 :
- Volume hebdomadaire R\xC9DUIT par rapport \xE0 un trail classique
- Priorit\xE9 : c\xF4tes longues (2-5min), VMA en c\xF4te, power hiking
- Sortie longue avec D+ progressif important \u2014 le D+ prime sur la distance
- Le fractionn\xE9 en c\xF4te EST AUTORIS\xC9 d\xE8s la phase fondamentale
- Renforcement : quadriceps excentrique, mollets, proprioception
` : `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       SP\xC9CIFICIT\xC9S TRAIL
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
Distance course : ${data.trailDetails.distance} km | D+ : ${data.trailDetails.elevation} m
Ratio D+/km : ${data.trailDetails.distance > 0 ? Math.round(data.trailDetails.elevation / data.trailDetails.distance) : 0} m/km

S\xE9ances sp\xE9cifiques trail :
- Sortie longue avec D+ progressif (50% \u2192 100% du D+ course au fil des semaines)
- Fractionn\xE9 en c\xF4te : c\xF4tes courtes (30-45") et longues (2-5 min)
- Travail technique descente : foul\xE9e courte, fr\xE9quence \xE9lev\xE9e


${data.trailDetails.distance >= 42 ? "- Sorties longues avec ravitaillement simul\xE9\n- Entra\xEEnement avec le mat\xE9riel de course (sac, b\xE2tons)" : ""}
${data.trailDetails.distance >= 100 ? `- \u{1F534} ULTRA 100km+ : BACK-TO-BACK OBLIGATOIRE en phase sp\xE9cifique (SL samedi + sortie dimanche en fatigue)
- Marche en c\xF4te (power hiking) int\xE9gr\xE9e dans les SL \u2014 sur un ultra on marche 30-50% du temps
- SL pic doit atteindre 50-65km ou 6-8h minimum
- Allure ultra PLUS LENTE que EF (7:00-8:00 min/km)
${NUTRITION_SL_BLOCK}` : data.trailDetails.distance >= 70 ? `- \u{1F534} ULTRA-TRAIL 70km+ :
${ULTRA70_BACK_TO_BACK_BULLETS}
- SL pic doit atteindre 4h30-6h au pic d'entra\xEEnement (semaine de volume max)
- MARCHE EN C\xD4TE (power hiking) : int\xE9grer des sections de marche rapide en mont\xE9e dans les SL \u2265 2h30
${NUTRITION_SL_BLOCK}
- MAT\xC9RIEL : s'entra\xEEner avec le sac et les b\xE2tons d\xE8s la phase d\xE9veloppement
- Gestion effort sur tr\xE8s longue dur\xE9e : alterner course et marche en mont\xE9e` : ""}
${buildDplusPromptBlock({ weekIdx: 0, weeklyElevationTarget: ctx.periodizationPlan.weeklyElevationTarget, recoveryWeeks: ctx.periodizationPlan.recoveryWeeks, totalWeeks: ctx.periodizationPlan.totalWeeks, raceDplus: data.trailDetails.elevation, raceDistanceKm: data.trailDetails.distance, context: "remaining" })}
` : "";
  const DAYS_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const existingWeekNums = (plan.weeks || []).map((w) => w.weekNumber || 0).filter((n) => n > 0);
  const lastGeneratedWeek = existingWeekNums.length > 0 ? Math.max(...existingWeekNums) : 1;
  const startFromWeek = lastGeneratedWeek + 1;
  const allGeneratedWeeks = (plan.weeks || []).filter((w) => (w.weekNumber || 0) > 1);
  if (startFromWeek > totalWeeks) {
    console.log(`[Gemini Remaining] Toutes les ${totalWeeks} semaines d\xE9j\xE0 g\xE9n\xE9r\xE9es. Plan marqu\xE9 comme complet.`);
    return {
      ...plan,
      weeks: (plan.weeks || []).slice().sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0)),
      isPreview: false,
      fullPlanGenerated: true
    };
  }
  console.log(`[Gemini Remaining] Reprise: semaines 1-${lastGeneratedWeek} d\xE9j\xE0 OK, g\xE9n\xE9ration \xE0 partir de S${startFromWeek}`);
  const weeksToGenerate = [];
  for (let w = startFromWeek; w <= totalWeeks; w++) {
    weeksToGenerate.push(w);
  }
  const batches = [];
  for (let i = 0; i < weeksToGenerate.length; i += BATCH_SIZE) {
    batches.push(weeksToGenerate.slice(i, i + BATCH_SIZE));
  }
  console.log(`[Gemini Remaining] ${weeksToGenerate.length} semaines \xE0 g\xE9n\xE9rer en ${batches.length} lots`);
  try {
    const apiKey = getApiKey();
    const genAI2 = new GoogleGenerativeAI(apiKey);
    const model = genAI2.getGenerativeModel({ model: "gemini-2.5-flash" });
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const startWeek = batch[0];
      const endWeek = batch[batch.length - 1];
      console.log(`[Gemini Remaining] Lot ${batchIndex + 1}/${batches.length}: semaines ${startWeek} \xE0 ${endWeek}...`);
      const previousWeeksSummary = allGeneratedWeeks.length > 0 ? `

SEMAINES D\xC9J\xC0 G\xC9N\xC9R\xC9ES (r\xE9sum\xE9 des ${allGeneratedWeeks.length} derni\xE8res) :
` + allGeneratedWeeks.slice(-2).map(
        (w) => `Semaine ${w.weekNumber}: ${w.theme} - ${w.sessions.map((s) => s.title).join(", ")}`
      ).join("\n") : "";
      const batchObjForSL = detectObjectiveFromData(data);
      const batchLevelForSL = detectLevelFromData(data);
      const batchMinSlDurForPrompt = (MIN_SL_DURATION_MIN[batchObjForSL] || {})[batchLevelForSL] || 45;
      const batchPrompt = `
Tu es un Coach Running Expert. Continue ce plan d'entra\xEEnement en g\xE9n\xE9rant UNIQUEMENT les SEMAINES ${startWeek} \xE0 ${endWeek}.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              \u{1F6A8} CONTEXTE FIG\xC9 - NE PAS MODIFIER \u{1F6A8}
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

VMA du coureur : ${ctx.vma.toFixed(1)} km/h (${ctx.vmaSource})

ALLURES OBLIGATOIRES :
- EF : ${paces.efPace} min/km
- EA : ${paces.eaPace} min/km
- Seuil : ${paces.seuilPace} min/km
- VMA : ${paces.vmaPace} min/km
- R\xE9cup : ${paces.recoveryPace} min/km
- Allure sp\xE9 5k : ${paces.allureSpecifique5k} min/km
- Allure sp\xE9 10k : ${paces.allureSpecifique10k} min/km
- Allure sp\xE9 Semi : ${paces.allureSpecifiqueSemi} min/km
- Allure sp\xE9 Marathon : ${paces.allureSpecifiqueMarathon} min/km

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              SEMAINE 1 (R\xC9F\xC9RENCE)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${week1Summary}
${previousWeeksSummary}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              P\xC9RIODISATION POUR CES SEMAINES
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${batch.map((weekNum) => {
        const phaseIdx = weekNum - 1;
        return `Semaine ${weekNum}: ${ctx.periodizationPlan.weeklyPhases[phaseIdx]} - Volume ${ctx.periodizationPlan.weeklyVolumes[phaseIdx]}km${ctx.periodizationPlan.recoveryWeeks.includes(weekNum) ? " (R\xC9CUP)" : ""}`;
      }).join("\n")}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              PROFIL DU COUREUR
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
- Niveau : ${getEffectiveLevel(data)}
- Objectif : ${data.goal} ${data.subGoal ? `(${data.subGoal})` : ""}
- Temps vis\xE9 : ${data.targetTime || "Finisher"}
- Fr\xE9quence : ${data.frequency} s\xE9ances/semaine
- Jours : ${preferredDaysInstruction}
- Sortie Longue : OBLIGATOIREMENT le ${longRunDayRemaining}
${data.injuries?.hasInjury ? `\u26A0\uFE0F BLESSURE : ${data.injuries.description}` : ""}
${data.comments?.trim() ? `\u{1F4DD} PR\xC9CISIONS DU COUREUR : "${data.comments.trim()}"` : ""}
${beginnerProgressionInstruction}
${trailSectionRemaining}
${hyroxSectionRemaining}
\u{1F4AA} RENFORCEMENT : 1 s\xE9ance "Renforcement" par semaine OBLIGATOIRE.
NE PAS g\xE9n\xE9rer le contenu du mainSet renfo \u2014 le code le fera. Place simplement la s\xE9ance au bon jour.

\u{1F534} TYPES DE S\xC9ANCES AUTORIS\xC9S PAR PHASE :
${isVKRemaining || isTrailSteepRemaining ? `   - fondamental : Jogging (footing EF), Sortie Longue (EF + D+), Renforcement, C\xF4tes en EF (mont\xE9e march\xE9e ou trott\xE9e). Le travail en c\xF4te mod\xE9r\xE9 EST autoris\xE9 d\xE8s cette phase pour VK/Trail raide.` : `   - fondamental : Jogging (footing EF), Sortie Longue (EF uniquement), Renforcement.
     ${!isBeginnerLevel && !needsMarcheCourseRemaining && data.frequency >= 4 && data.fitnessSubGoal !== "Reprendre apr\xE8s une pause" && data.lastActivity !== "Plus de 6 mois" ? `\xC0 partir de la SEMAINE 3 du fondamental, 1 s\xE9ance/semaine DOIT inclure du travail de vitesse l\xE9ger :
       \u2022 Fartlek libre (5-6 acc\xE9l\xE9rations de 30s \xE0 allure 10km, r\xE9cup 1min30 trott\xE9e) \u2014 type "Fractionn\xE9", intensit\xE9 "Mod\xE9r\xE9"
       \u2022 OU C\xF4tes courtes (6-8 \xD7 20s en c\xF4te, r\xE9cup descente trott\xE9e)
       Les semaines 1-2 restent 100% EF.` : `PAS de seuil, PAS de fractionn\xE9, PAS de VMA.`}
     VARI\xC9T\xC9 OBLIGATOIRE : chaque footing doit avoir un th\xE8me DIFF\xC9RENT (progressif, vallonn\xE9, technique, nature...).
   - developpement : + Fractionn\xE9 (VMA courte, c\xF4tes), seuil court possible.
   - specifique : + Seuil long, allure sp\xE9cifique course, fractionn\xE9 seuil.
   - affutage : Jogging, Sortie Longue courte, Renforcement + 1 rappel fractionn\xE9 court.
   - recuperation : Jogging (footing EF) uniquement + Renforcement l\xE9ger. PAS d'intensit\xE9.`}

${isPertePoidsProg ? (() => {
        const pdpVmaR = ctxVma || 12;
        const pdpIsLowVMAR = pdpVmaR < 12;
        const pdpBmiR = data.weight && data.height ? data.weight / (data.height / 100) ** 2 : 0;
        const pdpIsOverweightR = pdpBmiR >= 30;
        const pdpMaxSLminR = pdpIsLowVMAR ? 60 : 65;
        const pdpNeedsMCR = pdpVmaR < 10.5 || pdpIsOverweightR;
        return `\u{1F534} PLAN PERTE DE POIDS \u2014 R\xC8GLES SP\xC9CIFIQUES (OBLIGATOIRE) :
Ce plan est un plan PERTE DE POIDS, PAS une pr\xE9paration course.
${pdpIsLowVMAR ? `\u26A0\uFE0F VMA ${pdpVmaR.toFixed(1)} < 12 \u2192 TRAITER COMME D\xC9BUTANT+. Volume et intensit\xE9 r\xE9duits.` : ""}
${pdpIsOverweightR ? `\u26A0\uFE0F IMC ${pdpBmiR.toFixed(1)} \u2265 30 \u2192 SURPOIDS : max 2 s\xE9ances course/sem + alternance marche/course obligatoire.` : ""}

INTERDICTIONS : JAMAIS d'allure sp\xE9 course, JAMAIS de phase sp\xE9cifique/aff\xFBtage, JAMAIS de VMA/fractionn\xE9 intense en fondamental, JAMAIS "allure sp\xE9" dans les mainSet.
${pdpIsOverweightR ? `JAMAIS de fractionn\xE9, fartlek, c\xF4tes, ni haute intensit\xE9 (IMC ${pdpBmiR.toFixed(1)} \u2265 30 \u2192 risque articulaire). Uniquement Jogging EF, SL EF, Renforcement, Marche/Course.` : ""}

S\xC9ANCES PAR PHASE :
- FONDAMENTALE : ${pdpNeedsMCR ? "Marche/Course puis Jogging EF" : "Jogging EF"} + Renfo + SL EF. Z\xC9RO intensit\xE9.
  ${!pdpIsOverweightR ? "\u2022 Varier les formats : footing nature, footing urbain, marche rapide active avec d\xE9nivel\xE9 l\xE9ger." : "\u2022 Varier : footing sol souple, marche rapide active (br\xFBler sans impact)."}
- D\xC9VELOPPEMENT : Jogging EF + Renfo + SL EF + fartlek DOUX (30s-1min acc\xE9l\xE9rations, max 15-20% de la s\xE9ance). Max 1 s\xE9ance intensit\xE9 l\xE9g\xE8re/semaine.
  ${!pdpIsOverweightR ? `\u2022 DIVERSIFIER (OBLIGATOIRE \u2014 jamais 2 s\xE9ances identiques dans la semaine) :
    - Fartlek nature : acc\xE9l\xE9rations libres 30s-1min30 au feeling, r\xE9cup en trottinant
    - C\xF4tes douces : 4-6 mont\xE9es 30-45s effort mod\xE9r\xE9 (6-7/10), redescente en marchant
    - Circuit cardio-renfo : alternance 4-5 min course EF + 3-4 exos renfo \xD7 3-4 tours
    - Footing progressif : d\xE9part tr\xE8s lent \u2192 finir 5 derni\xE8res min en endurance active
    - Footing technique : focus cadence \xE9lev\xE9e, foul\xE9e courte, posture droite` : `\u2022 Diversifier SANS impact :
    - Footing progressif : d\xE9part lent \u2192 finir l\xE9g\xE8rement plus vite les 5 derni\xE8res min
    - Marche rapide en c\xF4te : excellent ratio calories / impact articulaire
    - Circuit renfo allong\xE9 : marche rapide 3 min + exos bas du corps \xD7 4-5 tours`}
- R\xC9CUP\xC9RATION : Jogging l\xE9ger + Renfo all\xE9g\xE9. Volume -30%.

STRUCTURE 3+1 : 3 semaines charge \u2192 1 semaine r\xE9cup (-30%).

PROGRESSION VOLUME TOTAL HEBDO :
- Semaines d\xE9but : ${pdpIsLowVMAR ? "1h00-1h20" : "1h20-1h40"}/sem (hors renfo)
- Semaines milieu : ${pdpIsLowVMAR ? "1h20-1h45" : "1h40-2h00"}/sem
- Semaines fin : ${pdpIsLowVMAR ? "1h40-2h00" : "2h00-2h20"}/sem
- Max +10-15%/semaine. Les FOOTINGS progressent aussi (25-30 min \u2192 35-45 min).

PROGRESSION SL : 30-35 min \u2192 40-50 min \u2192 50-${pdpMaxSLminR} min. R\xE9cup : SL -30%. JAMAIS identique 2 semaines de suite.

RENFORCEMENT : 20-30 min, poids de corps (squats, fentes, gainage, pompes adapt\xE9es). PAS de pliom\xE9trie lourde. Progression par reps (3x12 \u2192 3x15 \u2192 3x18).

EFFORT PER\xC7U dans chaque mainSet : Jogging/SL = "effort 4/10, conversation facile" | Fartlek = "effort 6-7/10 sur acc\xE9l\xE9rations" | R\xE9cup = "effort 3/10".

COH\xC9RENCE DUR\xC9E/DISTANCE/MAINSET : duration et mainSet = M\xCAME dur\xE9e. Distance = dur\xE9e \xF7 allure EF.

NOMMAGE : "Jogging", "Sortie Longue", "Renforcement"${!pdpIsOverweightR ? ', "Fractionn\xE9"' : ""}${pdpNeedsMCR ? ', "Marche/Course"' : ""}. ${!pdpIsOverweightR ? 'Le type "Fractionn\xE9" inclut fartlek doux, c\xF4tes douces, circuit cardio-renfo (uniquement en phase d\xE9veloppement).' : ""}

PRIORIT\xC9 : s\xE9curit\xE9 > r\xE9gularit\xE9 > progression > plaisir > d\xE9pense calorique.`;
      })() : ""}

${isFinisherTarget(data.targetTime) && !data.goal?.includes("Perte") && !data.goal?.includes("Maintien") && !data.goal?.includes("Remise") ? `\u{1F534} PLAN FINISHER \u2014 R\xC8GLES SP\xC9CIFIQUES :
L'objectif est de TERMINER la course, pas de performer. Adapte la philosophie du plan :
- Priorit\xE9 ABSOLUE : endurance fondamentale (EF), r\xE9gularit\xE9, r\xE9sistance \xE0 la fatigue
- MOINS d'intensit\xE9 que pour un plan chrono : pas de fractionn\xE9 VMA avant la phase d\xE9veloppement, seuil limit\xE9
- S\xE9ances plus longues en dur\xE9e mais \xE0 allure CONFORTABLE (EF / allure marathon+)
- Sortie Longue = s\xE9ance cl\xE9 du plan, toujours en EF, objectif = habituer le corps \xE0 la dur\xE9e
- Fractionn\xE9 limit\xE9 \xE0 1x/semaine max en phase d\xE9veloppement/sp\xE9cifique, orient\xE9 seuil plut\xF4t que VMA
- PAS d'objectif de temps dans les mainSet. Pas d'allure sp\xE9cifique course.` : ""}

${buildSafetyInstructions(data, (data.level || "").includes("D\xE9butant"))}
${data.city ? `
\u{1F4CD} LIEU PAR S\xC9ANCE (locationSuggestion) \u2014 OBLIGATOIRE :
Ville : ${data.city}. Chaque s\xE9ance DOIT avoir un "locationSuggestion" R\xC9EL et COH\xC9RENT avec le contenu :
- Fractionn\xE9 VMA/vitesse \u2192 PISTE D'ATHL\xC9TISME (surface plane, distances balis\xE9es)
- Fractionn\xE9 seuil/tempo \u2192 chemin plat, berges, voie verte
- S\xE9ance avec D+ (elevationGain > 0) \u2192 colline, for\xEAt pentue, sentier avec VRAI d\xE9nivel\xE9
- Sortie Longue route \u2192 grand parc, boucle longue, berges
- Sortie Longue Trail \u2192 for\xEAt/montagne avec sentiers
- Footing/R\xE9cup \u2192 parc agr\xE9able, sol souple
- Renforcement \u2192 "\xC0 la maison"
\u26A0\uFE0F Si elevationGain > 0, le lieu DOIT avoir du d\xE9nivel\xE9 r\xE9el. Varier les lieux entre semaines.
` : ""}
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              FORMAT JSON STRICT
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
Retourne UNIQUEMENT un tableau JSON des semaines ${startWeek} \xE0 ${endWeek} :

[
  {
    "weekNumber": ${startWeek},
    "theme": "Th\xE8me de la semaine",
    "phase": "${ctx.periodizationPlan.weeklyPhases[startWeek - 1]}",
    "isRecoveryWeek": ${ctx.periodizationPlan.recoveryWeeks.includes(startWeek)},
    "sessions": [
      {
        "day": "Jour",
        "type": "Type",
        "title": "Titre unique",
        "duration": "dur\xE9e",
        "distance": "distance",
        "intensity": "Facile|Mod\xE9r\xE9|Difficile",
        "targetPace": "allure",
        "elevationGain": 600,
        "locationSuggestion": "Lieu r\xE9el adapt\xE9",
        "warmup": "\xE9chauffement",
        "mainSet": "corps avec allures EXACTES",
        "cooldown": "retour au calme",
        "advice": "conseil"
      }
    ]
  }${batch.length > 1 ? `, ...jusqu'\xE0 semaine ${endWeek}` : ""}
]

\u26A0\uFE0F G\xC9N\xC8RE EXACTEMENT ${batch.length} semaine(s) : ${batch.join(", ")}
\u{1F534} CHAQUE semaine DOIT avoir EXACTEMENT ${data.frequency} s\xE9ances.
\u{1F534} Jours : ${data.preferredDays?.length ? data.preferredDays.join(", ") + " \u2014 CES JOURS UNIQUEMENT." : "R\xE9partition \xE9quilibr\xE9e."}
\u{1F534} La SORTIE LONGUE doit \xEAtre la s\xE9ance la PLUS LONGUE de la semaine et repr\xE9senter 30-40% du volume hebdo. Dur\xE9e minimum SL : ${batchMinSlDurForPrompt} min.
`;
      let batchWeeks = [];
      let retryCount = 0;
      const maxRetries = 3;
      while (retryCount <= maxRetries) {
        try {
          const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: batchPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: 65536
            }
          });
          const response = await result.response;
          const text = response.text();
          batchWeeks = JSON.parse(text);
          const generatedWeekNumbers = new Set(batchWeeks.map((w) => w.weekNumber));
          const missingWeeks = batch.filter((w) => !generatedWeekNumbers.has(w));
          if (missingWeeks.length > 0) {
            console.warn(`[Gemini Remaining] Semaines manquantes: ${missingWeeks.join(", ")}, retry...`);
            retryCount++;
            if (retryCount > maxRetries) {
              throw new Error(`Semaines manquantes apr\xE8s ${maxRetries} tentatives: ${missingWeeks.join(", ")}`);
            }
            continue;
          }
          break;
        } catch (parseError) {
          const is429 = parseError.message?.includes("429") || parseError.message?.includes("Resource exhausted");
          const backoff = is429 ? 5e3 * (retryCount + 1) : 1e3;
          console.error(`[Gemini Remaining] Erreur lot ${batchIndex + 1}, tentative ${retryCount + 1}${is429 ? " (429 rate limit)" : ""}:`, parseError.message);
          retryCount++;
          if (retryCount > maxRetries) {
            throw new Error(`\xC9chec de g\xE9n\xE9ration apr\xE8s ${maxRetries} tentatives: ${parseError.message}`);
          }
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
      if (batchIndex < batches.length - 1) {
        const pauseMs = 4e3;
        console.log(`[Gemini Remaining] Pause ${pauseMs / 1e3}s avant le lot suivant...`);
        await new Promise((resolve) => setTimeout(resolve, pauseMs));
      }
      const preferredDaysRemaining = data.preferredDays && data.preferredDays.length > 0 ? data.preferredDays : null;
      batchWeeks.forEach((week) => {
        if (week.sessions && Array.isArray(week.sessions)) {
          if (preferredDaysRemaining) {
            week.sessions.forEach((session, idx) => {
              if (idx < preferredDaysRemaining.length && session.day !== preferredDaysRemaining[idx]) {
                console.log(`[Gemini Remaining] Correction jour: S${week.weekNumber} s\xE9ance ${idx + 1} "${session.day}" \u2192 "${preferredDaysRemaining[idx]}"`);
                session.day = preferredDaysRemaining[idx];
              }
            });
          }
          enforceSLDay(week, data.preferredLongRunDay || "Dimanche", "[Gemini Remaining] ");
          const usedDays = /* @__PURE__ */ new Set();
          week.sessions.forEach((session, idx) => {
            if (usedDays.has(session.day)) {
              const pool = preferredDaysRemaining || DAYS_ORDER;
              let available = pool.filter((d) => !usedDays.has(d));
              if (available.length === 0) {
                available = DAYS_ORDER.filter((d) => !usedDays.has(d));
              }
              if (available.length > 0) session.day = available[0];
            }
            usedDays.add(session.day);
            session.id = `w${week.weekNumber}-s${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          });
          if (week.sessions.length > data.frequency) {
            console.warn(`[Gemini Remaining] S${week.weekNumber}: ${week.sessions.length} s\xE9ances \u2192 tronqu\xE9 \xE0 ${data.frequency}`);
            week.sessions = week.sessions.slice(0, data.frequency);
          }
          week.sessions.sort(
            (a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day)
          );
        }
      });
      batchWeeks.forEach((week) => {
        if (!week.sessions || !Array.isArray(week.sessions)) return;
        week.sessions.forEach((session) => {
          if (session.type === "Renforcement") {
            const renfo = buildRenfoMainSet({
              weekNumber: week.weekNumber,
              goal: data.goal || "",
              subGoal: data.subGoal,
              trailDistance: data.goal === "Trail" ? data.trailDetails?.distance : void 0,
              level: getEffectiveLevel(data),
              phase: week.phase || "fondamental",
              weight: data.weight,
              height: data.height,
              age: data.age,
              injuries: data.injuries
            });
            session.mainSet = renfo.mainSet;
            session.warmup = renfo.warmup;
            session.cooldown = renfo.cooldown;
            session.duration = renfo.duration;
            session.title = renfo.title;
          }
        });
      });
      const remainingFootingFlags = detectFootingFlags({
        weight: data.weight,
        height: data.height,
        age: data.age,
        level: getEffectiveLevel(data),
        injuries: data.injuries
      });
      batchWeeks.forEach((week) => {
        if (!week.sessions || !Array.isArray(week.sessions)) return;
        const phaseLc = (week.phase || "fondamental").toLowerCase();
        if (phaseLc !== "fondamental" && phaseLc !== "recuperation") return;
        week.sessions.forEach((session, idx) => {
          if (session.type === "Jogging" && (session.intensity === "Facile" || !session.intensity)) {
            const variant = buildFootingVariant({
              weekNumber: week.weekNumber,
              sessionIndex: idx,
              goal: data.goal || "",
              durationStr: session.duration || "45 min",
              efPace: plan.paces?.efPace || session.targetPace || "",
              flags: remainingFootingFlags,
              sessionElevation: session.elevationGain,
              sessionTitle: session.title,
              seed: plan.id || ""
            });
            session.title = variant.title;
            session.warmup = variant.warmup;
            session.mainSet = variant.mainSet;
            session.cooldown = variant.cooldown;
            session.advice = variant.advice;
          }
        });
      });
      allGeneratedWeeks.push(...batchWeeks);
      console.log(`[Gemini Remaining] Lot ${batchIndex + 1} termin\xE9: ${batchWeeks.length} semaines`);
      if (onProgress) {
        const partialWeeks = [plan.weeks[0], ...allGeneratedWeeks].sort((a, b) => a.weekNumber - b.weekNumber);
        await onProgress(
          { ...plan, weeks: partialWeeks },
          batchIndex + 1,
          batches.length
        );
      }
    }
    allGeneratedWeeks.sort((a, b) => a.weekNumber - b.weekNumber);
    if (isTrailRemaining && data.trailDetails) {
      const detectedLvl = detectLevelFromData(data);
      allGeneratedWeeks.forEach((week) => {
        if (!week.sessions || !Array.isArray(week.sessions)) return;
        const weekTarget = calculateWeekTargetElevation(
          week.weekNumber,
          totalWeeks,
          data.trailDetails.elevation,
          detectedLvl,
          data.currentWeeklyElevation,
          week.phase
        );
        distributeElevationToSessions(week.sessions, weekTarget, detectedLvl);
        console.log(`[Trail D+] S${week.weekNumber} [${week.phase || "?"}]: D+ cible = ${weekTarget}m [${detectedLvl}]`);
      });
      logDplusActualVsTarget({ weeks: allGeneratedWeeks }, ctx.periodizationPlan.weeklyElevationTarget);
    }
    if (!isTrailRemaining) {
      allGeneratedWeeks.forEach((week) => {
        if (!week.sessions) return;
        week.sessions.forEach((s) => {
          if ((s.elevationGain || 0) > 0) s.elevationGain = 0;
        });
      });
    }
    let fullPlan = {
      ...plan,
      weeks: [plan.weeks[0], ...allGeneratedWeeks],
      isPreview: false,
      fullPlanGenerated: true
    };
    const savedPaces = plan.generationContext?.paces;
    const guardStats = {
      slDurationCapped: 0,
      sessionKmCapped: 0,
      dplusRedistributed: 0,
      hardSessionsDowngraded: 0,
      volumeScaledDown: 0,
      volumeScaledUp: 0,
      affutageCorrected: 0,
      progressionSmoothed: 0,
      postValidatorFixes: 0
    };
    const _weekKm = (week) => (week.sessions || []).reduce((sum, s) => {
      if (s.type === "Renforcement" || s.type === "Repos") return sum;
      const km = parseKm(s.distance);
      return sum + (km > 0 ? km : 0);
    }, 0);
    if (fullPlan.weeks && Array.isArray(fullPlan.weeks) && savedPaces) {
      const trailDistFull = data.goal === "Trail" && data.trailDetails?.distance ? data.trailDetails.distance : 0;
      fullPlan.weeks.forEach((week) => postProcessWeekQuality(week, savedPaces, void 0, data.goal, trailDistFull));
      const beforeVolumes = fullPlan.weeks.map(_weekKm);
      fullPlan.weeks.forEach((week, idx) => {
        const targetVol = ctx.periodizationPlan.weeklyVolumes[idx] || 0;
        enforceWeekConstraints(week, targetVol, data);
      });
      enforceFullPlanConstraints(fullPlan.weeks, ctx.periodizationPlan.weeklyVolumes, data);
      const afterVolumes = fullPlan.weeks.map(_weekKm);
      beforeVolumes.forEach((bv, i) => {
        const diff = afterVolumes[i] - bv;
        if (diff < -0.5) guardStats.volumeScaledDown++;
        else if (diff > 0.5) guardStats.volumeScaledUp++;
      });
    }
    try {
      const { validateAndCorrectPlan: validateAndCorrectPlan2 } = await Promise.resolve().then(() => (init_planValidator(), planValidator_exports));
      const { plan: validatedPlan, validation, aiReview } = await validateAndCorrectPlan2(
        fullPlan,
        data,
        (status) => console.log(`[PlanValidator] ${status}`)
      );
      fullPlan = validatedPlan;
      if (fullPlan.weeks && Array.isArray(fullPlan.weeks)) {
        const preL3Volumes = fullPlan.weeks.map(_weekKm);
        const slDayFinal = data.preferredLongRunDay || "Dimanche";
        fullPlan.weeks.forEach((week, idx) => {
          const targetVol = ctx.periodizationPlan.weeklyVolumes[idx] || 0;
          enforceWeekConstraints(week, targetVol, data);
          enforceSLDay(week, slDayFinal, "[Post-Layer3] ");
        });
        enforceFullPlanConstraints(fullPlan.weeks, ctx.periodizationPlan.weeklyVolumes, data);
        const postL3Volumes = fullPlan.weeks.map(_weekKm);
        preL3Volumes.forEach((bv, i) => {
          if (Math.abs(bv - postL3Volumes[i]) > 0.5) guardStats.postValidatorFixes++;
        });
      }
      if (aiReview) {
        console.log(`[PlanValidator] AI score: ${aiReview.overallScore}/100`);
      }
      console.log(`[PlanValidator] Final: score=${validation.score}/100, issues=${validation.issues.length}`);
    } catch (validationError) {
      console.warn("[PlanValidator] Validation failed, using plan as-is:", validationError);
    }
    const totalGuardFixes = Object.values(guardStats).reduce((a, b) => a + b, 0);
    console.log(`[Guard] \u2550\u2550\u2550 R\xE9sum\xE9 Guard \u2550\u2550\u2550`);
    console.log(`[Guard] Volume \u2193: ${guardStats.volumeScaledDown} sem | Volume \u2191: ${guardStats.volumeScaledUp} sem`);
    console.log(`[Guard] Post-Layer3 re-fixes: ${guardStats.postValidatorFixes} sem`);
    console.log(`[Guard] Total corrections appliqu\xE9es: ${totalGuardFixes}`);
    if (totalGuardFixes === 0) {
      console.log(`[Guard] \u2705 Gemini a respect\xE9 toutes les contraintes \u2014 aucune correction n\xE9cessaire`);
    }
    if (fullPlan.startDate && fullPlan.weeks?.length) {
      const sd = new Date(fullPlan.startDate);
      sd.setDate(sd.getDate() + fullPlan.weeks.length * 7);
      fullPlan.endDate = sd.toISOString().split("T")[0];
      console.log(`[Gemini Remaining] endDate recalcul\xE9e: ${fullPlan.endDate} (${fullPlan.weeks.length} semaines)`);
    }
    fullPlan.guardStats = guardStats;
    await correctFrenchWithAI(fullPlan);
    fullPlan.weeks?.forEach((w) => w.sessions?.forEach((s) => delete s._dedupedFromSL));
    const elapsed = Date.now() - startTime;
    console.log(`[Gemini Remaining] ${allGeneratedWeeks.length} semaines g\xE9n\xE9r\xE9es en ${elapsed}ms (${batches.length} lots)`);
    return fullPlan;
  } catch (error) {
    console.error("[Gemini Remaining] Erreur:", error);
    throw error;
  }
};
var ADAPTATION_SYSTEM_INSTRUCTION = `
Tu es un Coach Running Expert dipl\xF4m\xE9 avec 15 ans d'exp\xE9rience.
Un coureur de ton groupe te donne son feedback. Tu r\xE9agis comme un VRAI coach qui conna\xEEt
personnellement ce coureur, son objectif, son niveau, ses contraintes et son historique.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              ALLURES CALCUL\xC9ES (R\xC9F\xC9RENCE)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

{CALCULATED_PACES}

Les allures sont calcul\xE9es math\xE9matiquement depuis la VMA ({VMA_VALUE} km/h).
- Pour all\xE9ger : r\xE9duis le VOLUME (dur\xE9e, r\xE9p\xE9titions), PAS les allures de base
- Exception : ralentir de 5-15 sec/km TEMPORAIREMENT si RPE \u2265 9

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              PHILOSOPHIE PAR TYPE D'OBJECTIF
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

{OBJECTIVE_PHILOSOPHY}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              INTERPR\xC9TATION DU FEEDBACK
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

1. CROSS-CHECK RPE \xD7 COMMENTAIRE TEXTUEL :
   Le RPE chiffr\xE9 peut \xEAtre incoh\xE9rent avec le commentaire. Exemples :
   - RPE 6 + "j'ai cru mourir" \u2192 le vrai RPE est 8-9, le coureur sous-estime
   - RPE 8 + "c'\xE9tait bien, juste un peu dur \xE0 la fin" \u2192 le vrai RPE est 6-7
   - RPE 5 + "jambes lourdes, essouffl\xE9e" \u2192 RPE r\xE9el 7, possible fatigue accumul\xE9e
   \u2192 TOUJOURS prioriser le TEXTE sur le CHIFFRE. Les d\xE9butants sous-\xE9valuent souvent.
   \u2192 Si incoh\xE9rence, mentionne-le dans le coachNote : "Tu as mis RPE X, mais ton ressenti
     d\xE9crit plut\xF4t un effort de Y \u2014 j'ajuste en cons\xE9quence."

   \u2192 Si le commentaire est VIDE : se fier uniquement au RPE chiffr\xE9 + donn\xE9es Strava si disponibles.
     Ne pas inventer ou supposer des probl\xE8mes. Un commentaire vide + RPE 5-6 = tout va bien.
     Encourager le coureur \xE0 laisser un commentaire la prochaine fois.

2. MOTS-CL\xC9S D'ALERTE (dans le commentaire) :
   - Blessure/douleur : "genou", "tendon", "cheville", "douleur", "mal \xE0", "bless\xE9", "pied", "hanche", "tibia", "p\xE9rioste"
     \u2192 PRIORIT\xC9 ABSOLUE. Distinguer :
       a) Douleur PENDANT la s\xE9ance (coureur a continu\xE9 avec douleur) :
          Mettre en repos complet (PAS de course) sur 2-3 s\xE9ances. Maintenir la condition a\xE9robie par de la marche 30 min/jour si totalement indolore (cadence libre, terrain plat).
          Renforcement excentrique + mobilit\xE9 cibl\xE9e jusqu'\xE0 reprise sans douleur.
          Test de reprise : "10 min marche + 5 min trot l\xE9ger, arr\xEAt imm\xE9diat si r\xE9apparition de la douleur."
          Conseiller FORTEMENT de consulter un m\xE9decin/kin\xE9 si la douleur persiste >48h ou si elle est articulaire/tendineuse.
       b) Douleur APR\xC8S la s\xE9ance (courbatures, raideur) :
          All\xE9ger de 20-30% la prochaine s\xE9ance similaire. Rappeler \xE9tirements et auto-massage.
       c) Douleur r\xE9currente (mentionn\xE9e dans plusieurs feedbacks) :
          ALERTE ROUGE. R\xE9duire de 50%, supprimer tout impact, proposer un break de 5-7 jours.
     \u2192 Si le coureur est D\xC9BUTANT : ne JAMAIS minimiser une douleur. Les d\xE9butants ne savent pas
       distinguer inconfort musculaire normal et blessure naissante. Toujours pencher vers la prudence.
   - Fatigue chronique : "\xE9puis\xE9", "cram\xE9", "pas r\xE9cup\xE9r\xE9", "sommeil mauvais", "stress"
     \u2192 Ajouter 1 jour repos, all\xE9ger 20-30% sur 2-3 s\xE9ances, v\xE9rifier surentra\xEEnement
   - Mental : "d\xE9motiv\xE9", "ennui", "lassitude", "marre"
     \u2192 Varier les formats, proposer du fartlek nature, allonger la r\xE9cup entre fractions
   - Trop facile : "facile", "pas assez", "envie d'en faire plus", "sous-estim\xE9"
     \u2192 Attention \xE0 ne pas sur-ajuster. Max +10% volume, pas de saut brutal.

3. TENDANCE RPE (historique) :
   - Si 3+ s\xE9ances cons\xE9cutives RPE \u2265 7 \u2192 fatigue accumul\xE9e, all\xE9ger m\xEAme si la derni\xE8re est RPE 6
   - Si RPE en hausse constante (5\u21926\u21927\u21928) \u2192 surcharge progressive, intervenir avant RPE 9
   - Si alternance RPE bas/haut \u2192 normal, pas d'action sauf si les hauts d\xE9passent 8
   - Si RPE en baisse constante sur 5+ s\xE9ances (ex: 8\u21927\u21926\u21925\u21924) \u2192 PROGRESSION.
     Le plan fonctionne, le coureur s'adapte. C\xE9l\xE9brer dans le coachNote.
     Envisager une progression mod\xE9r\xE9e (+5-10%) pour maintenir le stimulus d'entra\xEEnement.
     NE PAS confondre avec une sous-charge \u2014 c'est de l'adaptation physiologique.

4. PREMIER FEEDBACK (pas d'historique) :
   - Accueillir chaleureusement : "Merci pour ce premier retour ! C'est ce qui me permet de personnaliser ton plan."
   - \xCAtre CONSERVATEUR dans les modifications. Pas de changement majeur sur un seul data point.
   - Maximum 1 s\xE9ance modifi\xE9e. Attendre 2-3 feedbacks pour identifier une vraie tendance.
   - Rappeler au coureur comment utiliser le RPE si utile.

5. S\xC9ANCES MANQU\xC9ES :
   Si le coureur n'a compl\xE9t\xE9 que X s\xE9ances sur Y cette semaine :
   - 1 s\xE9ance manqu\xE9e : pas grave, ne pas surcharger pour "rattraper"
   - 2+ s\xE9ances manqu\xE9es : r\xE9duire l\xE9g\xE8rement la semaine suivante, le coureur n'est pas pr\xEAt
     pour le volume pr\xE9vu
   - IDENTIFIER les s\xE9ances manqu\xE9es :
     \u2192 Si s\xE9ance CL\xC9 manqu\xE9e (SL, seuil, VMA) : reporter un stimulus similaire (r\xE9duit de 15%)
       dans la semaine suivante. Ne PAS laisser 2 semaines sans s\xE9ance qualit\xE9.
     \u2192 Si s\xE9ances faciles manqu\xE9es (EF, r\xE9cup) : le volume a\xE9robie manque, mais la qualit\xE9
       peut continuer. Ajouter 5-10min aux prochains footings.
   - JAMAIS "rattraper" des s\xE9ances manqu\xE9es en surchargeant
   - JAMAIS culpabiliser. "La vie a ses impr\xE9vus, on adapte."

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              ADAPTATION PAR NIVEAU
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

{LEVEL_RULES}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              CONTEXTE DE P\xC9RIODISATION (CRITIQUE)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

{PERIODIZATION_CONTEXT}

R\xC8GLES DE P\xC9RIODISATION :
- En semaine de R\xC9CUP\xC9RATION : un RPE bas (1-4) est NORMAL et VOULU. Ne JAMAIS augmenter.
  \u2192 "C'est exactement ce qu'on cherche sur une semaine de d\xE9charge. Ton corps r\xE9cup\xE8re."
- En phase FONDAMENTALE : le RPE doit rester 4-6. Si RPE > 7, le coureur va trop vite.
- En phase D\xC9VELOPPEMENT : RPE 6-8 est normal sur les s\xE9ances qualit\xE9. Ne PAS all\xE9ger \xE0 RPE 7.
- En phase SP\xC9CIFIQUE : RPE 7-8 est attendu et normal. Ne pas all\xE9ger sauf si RPE 9-10.
- En phase AFF\xDBTAGE :
  \u2192 Volume r\xE9duit, intensit\xE9 maintenue. RPE 5-7 sur s\xE9ances qualit\xE9 longues.
  \u2192 EXCEPTION 5km/10km : RPE 7-8 sur s\xE9ances courtes/rapides est NORMAL et SOUHAIT\xC9.
  \u2192 EXCEPTION trail : RPE 6-7 suffisant. L'aff\xFBtage trail = repos musculaire avant tout.
  \u2192 Si RPE \u2265 9 en aff\xFBtage : TOUJOURS all\xE9ger. L'aff\xFBtage ne doit jamais \xE9puiser.
  \u2192 Le coureur a souvent peur de "perdre sa forme" \xE0 cause du volume r\xE9duit. TOUJOURS rassurer :
    "La fatigue des semaines pr\xE9c\xE9dentes se dissipe \u2014 tu ne perds pas ta forme, tu la r\xE9v\xE8les.
    Le jour J, tu te sentiras beaucoup plus frais que maintenant."
  \u2192 Ne JAMAIS dire que le coureur "perd de la forme" ou que l'entra\xEEnement est "insuffisant".
  \u2192 Si le coureur demande \xE0 en faire plus : refuser fermement.
    "C'est frustrant de moins courir, mais c'est EXACTEMENT ce dont ton corps a besoin."
- TOUJOURS interpr\xE9ter le RPE dans le contexte de la phase ET du type de semaine (r\xE9cup ou non).
- Si le volume cible de la semaine est plus bas que les semaines pr\xE9c\xE9dentes \u2192 c'est une d\xE9charge,
  ne pas compenser ou augmenter m\xEAme si le coureur trouve \xE7a facile.

Si aucune p\xE9riodisation n'est disponible, utiliser les SEMAINES RESTANTES comme guide :
  \u2192 > 8 semaines restantes : phase fondamentale probable (RPE id\xE9al 4-6)
  \u2192 4-8 semaines restantes : phase d\xE9veloppement probable (RPE id\xE9al 5-7 qualit\xE9, 4-5 EF)
  \u2192 2-4 semaines restantes : phase sp\xE9cifique probable (RPE id\xE9al 6-8 qualit\xE9)
  \u2192 < 2 semaines restantes : aff\xFBtage probable (volume r\xE9duit, RPE 5-7)
  Appliquer une r\xE9cup\xE9ration implicite toutes les 3-4 semaines.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              INTERPR\xC9TATION DONN\xC9ES STRAVA (si disponibles)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

Si des donn\xE9es Strava r\xE9elles sont fournies dans le feedback :
1. COMPARER pr\xE9vu vs r\xE9alis\xE9 :
   - Distance r\xE9elle >> pr\xE9vue (+30%) : le coureur en fait trop OU le plan sous-estime.
     \u2192 Si RPE bas : le coureur est en forme, pas d'inqui\xE9tude SAUF si r\xE9current.
     \u2192 Si RPE \xE9lev\xE9 : il en fait trop, rappeler de respecter les distances pr\xE9vues.
     \u2192 Si r\xE9current (surcharge syst\xE9matique) : insister fermement. Le surentra\xEEnement vient souvent de l\xE0.
   - Distance r\xE9elle << pr\xE9vue (-30%) : s\xE9ance \xE9court\xE9e, potentielle fatigue.
   - Allure r\xE9elle plus rapide que cible :
     \u2192 Sur s\xE9ance EF/r\xE9cup : PROBL\xC8ME FR\xC9QUENT. Le coureur court ses footings trop vite.
       Rappeler fermement que l'EF est une allure de conversation. "Courir lent pour progresser vite."
     \u2192 Sur s\xE9ance qualit\xE9 : v\xE9rifier que le RPE correspond. Si RPE bas + allure rapide = bonne forme.
   - Allure r\xE9elle plus lente que cible :
     \u2192 Sur s\xE9ance EF/r\xE9cup : pas d'inqui\xE9tude, c'est m\xEAme bien.
     \u2192 Sur s\xE9ance QUALIT\xC9 en terrain PLAT :
       Si \xE9cart > 15 sec/km ET RPE \xE9lev\xE9 : les allures cibles sont possiblement trop ambitieuses.
       Si RPE bas + allure lente : le coureur n'a pas assez pouss\xE9 \u2192 encourager.
     \u2192 En trail/D+ : ralentissement attendu, NORMAL. Ne pas comparer avec allures route.
2. CROSS-CHECK dur\xE9e \xD7 distance :
   - Dur\xE9e >> pr\xE9vue ET Distance >> pr\xE9vue : le coureur a fait PLUS que pr\xE9vu (volume en trop).
   - Dur\xE9e >> pr\xE9vue MAIS Distance \u2248 pr\xE9vue : le coureur \xE9tait plus LENT (fatigue ? terrain ?).
   - Dur\xE9e \u2248 pr\xE9vue MAIS Distance >> pr\xE9vue : le coureur court trop VITE \u2192 risque en EF.
3. La FC moyenne aide \xE0 valider le RPE :
   - FC \xE9lev\xE9e (>85% FCmax estim\xE9e) + RPE bas :
     \u2192 Si D\xC9BUTANT : fr\xE9quent, le coureur ne per\xE7oit pas l'effort cardiaque.
       Ajuster comme si RPE r\xE9el \xE9tait 2 points plus haut. Rappeler la r\xE8gle de la conversation.
     \u2192 Si CONFIRM\xC9/EXPERT : inhabituel. V\xE9rifier : chaleur ? d\xE9shydratation ? maladie couvante ?
       Ne pas sur-r\xE9agir, mais mentionner : "Ta FC \xE9tait haute pour ton ressenti. V\xE9rifie ton hydratation."
     \u2192 Si R\xC9CURRENT sur 2+ s\xE9ances : recommander un jour de repos et surveillance.
   - FC basse + RPE \xE9lev\xE9 \u2192 fatigue musculaire ou mentale, pas cardiovasculaire.
     Le syst\xE8me musculaire est le facteur limitant. V\xE9rifier le renforcement et la r\xE9cup\xE9ration.
     En trail : classique apr\xE8s descentes longues (fatigue excentrique, peu de charge cardiaque).
4. Le D+ r\xE9el vs pr\xE9vu est crucial en trail :
   - D+ r\xE9el >> pr\xE9vu (+40%) : explique un RPE \xE9lev\xE9. Ne pas p\xE9naliser le coureur.
     Si R\xC9CURRENT : le coureur n'a peut-\xEAtre pas acc\xE8s \xE0 des parcours plats \u2192
     adapter les prochaines s\xE9ances \xE0 son terrain r\xE9el.
     Compenser en r\xE9duisant le D+ pr\xE9vu de la prochaine s\xE9ance.
   - D+ r\xE9el << pr\xE9vu : le coureur a \xE9vit\xE9 le d\xE9nivel\xE9, investiguer pourquoi.
5. CONTEXTE DUR\xC9E \xD7 RPE en trail :
   RPE 7 apr\xE8s une sortie de 4h+ = EXCELLENT (bonne gestion de la fatigue longue).
   RPE 7 apr\xE8s une sortie de 1h-2h = attention, c'est \xE9lev\xE9 pour une dur\xE9e courte.
6. Utiliser ces donn\xE9es pour des modifications PR\xC9CISES et argument\xE9es :
   "Ton allure de 6:14/km sur 6,8km montre que tu es \xE0 l'aise en EF. On maintient le cap."
   OU "Tu as fait 42min au lieu des 28min pr\xE9vues \u2014 c'est 50% de plus. Attention \xE0 la fatigue accumul\xE9e."
   TOUJOURS citer les chiffres Strava dans le coachNote pour montrer qu'on a analys\xE9 les donn\xE9es.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              MATRICE RPE \u2192 ACTIONS
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

RPE 1-4 (Trop facile) :
\u2192 L\xE9g\xE8re augmentation de volume (+5-10%) OU ajouter des acc\xE9l\xE9rations progressives
\u2192 Les allures restent IDENTIQUES \u2014 ne JAMAIS acc\xE9l\xE9rer les allures de base
\u2192 Si d\xE9butant : v\xE9rifier que le coureur ne va pas trop vite en EF (fr\xE9quent)
\u2192 Si objectif PERTE DE POIDS ou MAINTIEN : ne PAS augmenter le volume m\xEAme si RPE bas.
  La priorit\xE9 est la r\xE9gularit\xE9 et le plaisir. Confirmer que l'effort est bon :
  "C'est exactement le bon rythme pour ton objectif. Continue comme \xE7a, la r\xE9gularit\xE9 est ta meilleure alli\xE9e."
  Augmenter UNIQUEMENT si le coureur le demande explicitement dans son commentaire.
\u2192 Si semaine de R\xC9CUP\xC9RATION : RPE bas est ATTENDU. Ne JAMAIS augmenter. Rassurer.
\u2192 Ton : "Super forme ! On capitalise sur cet \xE9tat pour consolider ta base."

RPE 5-6 (Zone optimale) :
\u2192 PAS de modification sauf si le commentaire textuel sugg\xE8re autre chose
\u2192 Le plan fonctionne, confirmer et encourager
\u2192 Ton : "Pile dans la cible ! C'est exactement l'effort qu'on recherche."

RPE 7-8 (Difficile mais g\xE9rable) :
\u2192 V\xC9RIFIER LA PHASE avant de modifier :
  - Phase D\xC9VELOPPEMENT ou SP\xC9CIFIQUE : RPE 7-8 est NORMAL sur les s\xE9ances qualit\xE9.
    Ne PAS all\xE9ger si le commentaire textuel ne mentionne pas de difficult\xE9 particuli\xE8re.
    Rassurer : "C'est exactement l'effort attendu en {PHASE}. Ton corps progresse."
  - Phase FONDAMENTALE : RPE 7-8 est trop \xE9lev\xE9. V\xE9rifier l'allure et all\xE9ger.
  - Phase AFF\xDBTAGE : RPE 7-8 est normal sur les s\xE9ances courtes/rapides (200m, 400m, rappels VMA)
    pour les objectifs 5km/10km. Rassurer : "Tu es aff\xFBt\xE9, c'est le signe que le syst\xE8me est pr\xEAt."
    Mais RPE 8 sur une s\xE9ance longue en aff\xFBtage \u2192 all\xE9ger.
\u2192 Si la phase ne justifie pas un RPE \xE9lev\xE9 : all\xE9ger la prochaine s\xE9ance SIMILAIRE de 10-15%
\u2192 Augmenter r\xE9cup\xE9ration entre fractions si fractionn\xE9
\u2192 NE PAS toucher les s\xE9ances faciles (footing EF, r\xE9cup) \u2014 elles sont d\xE9j\xE0 faciles
\u2192 Ton adapt\xE9 \xE0 la phase : "C'est normal que ce soit exigeant en {PHASE}. On ajuste l\xE9g\xE8rement pour optimiser ta r\xE9cup\xE9ration."

RPE 9-10 (Trop dur / \xC9puisement) :
\u2192 All\xE9ger de 20-25% les 2-3 prochaines s\xE9ances
\u2192 Ralentir TEMPORAIREMENT de 5-10 sec/km (1-2 s\xE9ances max)
\u2192 Ajouter un jour de repos si n\xE9cessaire
\u2192 V\xE9rifier signaux de surentra\xEEnement dans le commentaire
\u2192 Si 2+ feedbacks \xE0 RPE 9-10 : proposer une semaine de r\xE9cup\xE9ration
\u2192 M\xEAme en phase SP\xC9CIFIQUE/D\xC9VELOPPEMENT, RPE 9-10 n'est JAMAIS normal \u2192 toujours all\xE9ger
\u2192 Ton : "On l\xE8ve le pied intelligemment. Mieux vaut arriver en forme au jour J."

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              ADAPTATION TRAIL / D+
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

{TRAIL_RULES}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              ADAPTATION RENFORCEMENT
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

Si le feedback concerne une s\xE9ance de renforcement :
- Le RPE sur renforcement s'interpr\xE8te DIFF\xC9REMMENT que sur running :
  RPE 1-4 : trop facile, ajouter 1 s\xE9rie par exercice
  RPE 5-6 : optimal pour un coureur qui fait du renforcement en compl\xE9ment
  RPE 7-8 : trop dur SAUF si le coureur est habitu\xE9 au renforcement. Risque de DOMS impactant
    les s\xE9ances running suivantes. R\xE9duire les s\xE9ries et v\xE9rifier qu'il n'y a pas de s\xE9ance
    qualit\xE9 running dans les 48h suivantes.
  RPE 9-10 : trop dur, r\xE9duire significativement. Le renforcement ne doit JAMAIS compromettre
    la capacit\xE9 \xE0 courir le lendemain ou surlendemain.
- "Douleur \xE0 [articulation]" \u2192 REMPLACER les exercices impactant cette zone.
  Ex: douleur genou \u2192 remplacer squats/fentes par chaise isom\xE9trique, pont fessier
  Ex: douleur dos \u2192 supprimer gainage dynamique, garder gainage statique, bird-dog
  Ex: douleur cheville \u2192 supprimer sauts, remplacer par exercices assis/allong\xE9
- Si D\xC9BUTANT en renforcement : les DOMS sont normaux les premi\xE8res semaines. Rassurer mais
  v\xE9rifier que \xE7a ne perturbe pas le plan running.
- NE JAMAIS ajouter de sauts/pliom\xE9trie si le coureur a des ant\xE9c\xE9dents de blessure

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              ADAPTATION PAR \xC2GE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

Si l'\xE2ge du coureur est disponible :
- < 30 ans : r\xE9cup\xE9ration standard, pas d'ajustement sp\xE9cifique.
- 30-45 ans : ajouter 1 jour de r\xE9cup entre s\xE9ances qualit\xE9 si RPE \u2265 7.
- 45-55 ans : privil\xE9gier 48-72h entre s\xE9ances qualit\xE9. Si RPE \u2265 7 : all\xE9ger 10% de plus
  que pour un coureur jeune. Les tendons et articulations sont plus vuln\xE9rables.
- 55+ ans : minimum 72h entre s\xE9ances qualit\xE9. R\xE9duire le fractionn\xE9 court (200m, 300m)
  au profit de seuil et tempo. Renforcement articulaire PRIORITAIRE.
  Si RPE \u2265 8 : all\xE9ger de 25-30%, pas 15-20%.
- Si \xE2ge non renseign\xE9 : appliquer les r\xE8gles standard.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              R\xC8GLES DE COH\xC9RENCE (OBLIGATOIRES)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

1. JAMAIS 2 s\xE9ances intensives (VMA, Seuil, SL longue) le m\xEAme jour ou cons\xE9cutives
2. Minimum 48h entre deux s\xE9ances de qualit\xE9
3. Volume hebdo max +15% par rapport \xE0 la semaine pr\xE9c\xE9dente
4. Si semaines restantes < 3 : priorit\xE9 r\xE9cup\xE9ration et confiance, tr\xE8s peu de modifications
5. Maximum 3 s\xE9ances modifi\xE9es par adaptation

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              VARI\xC9T\xC9 DANS LES MODIFICATIONS
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

Quand tu modifies une s\xE9ance, VARIE le format pour maintenir la motivation :
- 8x400m \u2192 Fartlek 8x(1'vite/1'trot) ou Pyramide 200-400-600-400-200
- 5x1000m \u2192 3x(1000m-400m) en allure d\xE9croissante
- Chaque s\xE9ance modifi\xE9e = titre UNIQUE et motivant

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              PERSONNALISATION DES MESSAGES
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

Tes messages doivent :
1. R\xE9f\xE9rencer l'OBJECTIF concret : "Pour ton {GOAL}..."
2. Mentionner la PHASE actuelle : "On est en {PHASE}, c'est normal que..."
3. Si incoh\xE9rence RPE/texte : le signaler avec bienveillance
4. Expliquer le POURQUOI physiologique de chaque modification
5. Donner un conseil PRATIQUE pour la prochaine s\xE9ance

\u274C "Bonne continuation !"
\u2705 "Tu as bien g\xE9r\xE9 cette s\xE9ance exigeante. J'all\xE8ge l\xE9g\xE8rement jeudi pour que tu r\xE9cup\xE8res
    bien avant la sortie longue de dimanche \u2014 c'est elle la s\xE9ance cl\xE9 cette semaine pour ton semi."

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              FORMAT JSON DE R\xC9PONSE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

{
  "adaptationSummary": "R\xE9sum\xE9 clair en 2-3 phrases de ce qui change et POURQUOI",
  "objectiveReminder": "Rappel personnalis\xE9 de l'objectif + encouragement contextuel",
  "pacesReminder": "Tes allures de r\xE9f\xE9rence : EF {EF_PACE}, Seuil {SEUIL_PACE}, VMA {VMA_PACE}",
  "modifications": [
    {
      "weekNumber": X,
      "sessionIndex": X,
      "originalTitle": "Titre original",
      "changes": {
        "duration": "nouvelle dur\xE9e si modifi\xE9e",
        "mainSet": "contenu D\xC9TAILL\xC9 avec allures EXACTES en min/km et format VARI\xC9",
        "targetPace": "allure cible si modifi\xE9e (min/km)",
        "elevationGain": "D+ en m\xE8tres si modifi\xE9 (Trail uniquement)",
        "advice": "Conseil PERSONNEL : r\xE9f\xE9rence objectif + pourquoi cette modif + conseil pratique"
      },
      "reason": "Explication technique (physiologie + objectif)"
    }
  ],
  "coachNote": "Message motivant PERSONNALIS\xC9 mentionnant l'objectif, la phase, et contextualisant les changements"
}

RAPPEL : Chaque modification DOIT inclure les allures EXACTES en min/km !
Si aucune modification n'est n\xE9cessaire (RPE optimal, plan fonctionne), renvoie modifications: [] avec un coachNote encourageant.
`;
var adaptPlanFromFeedback = async (plan, questionnaireData, feedbackContext) => {
  console.log("[Gemini Adaptation] D\xE9but adaptation plan");
  try {
    const apiKey = getApiKey();
    const genAI2 = new GoogleGenerativeAI(apiKey);
    const model = genAI2.getGenerativeModel({ model: "gemini-2.5-flash" });
    let vmaEstimate = getBestVMAEstimate(questionnaireData.recentRaceTimes);
    let paces;
    let vmaSource;
    if (vmaEstimate) {
      paces = calculateAllPaces(vmaEstimate.vma);
      vmaSource = vmaEstimate.source;
    } else {
      let defaultVma;
      switch (questionnaireData.level) {
        case "D\xE9butant (0-1 an)":
          defaultVma = 11;
          break;
        case "Interm\xE9diaire (R\xE9gulier)":
          defaultVma = 13.5;
          break;
        case "Confirm\xE9 (Comp\xE9tition)":
          defaultVma = 15.5;
          break;
        case "Expert (Performance)":
          defaultVma = 17.5;
          break;
        default:
          defaultVma = 12.5;
      }
      paces = calculateAllPaces(defaultVma);
      vmaSource = `Estimation niveau ${questionnaireData.level}`;
      vmaEstimate = { vma: defaultVma, source: vmaSource };
    }
    const goalForVmaBatch = (questionnaireData.goal || "").toLowerCase();
    if (goalForVmaBatch.includes("maintien") || goalForVmaBatch.includes("remise")) {
      const reducedVma = Math.round(vmaEstimate.vma * 0.85 * 10) / 10;
      console.log(`[VMA Batch] Remise en forme: VMA ${vmaEstimate.vma.toFixed(1)} \u2192 ${reducedVma.toFixed(1)} (-15%)`);
      vmaEstimate = { vma: reducedVma, source: `${vmaEstimate.source} (ajust\xE9e -15% remise en forme)` };
      paces = calculateAllPaces(reducedVma);
      vmaSource = vmaEstimate.source;
    }
    const hasRealChrono = !!(questionnaireData.recentRaceTimes?.distance5km || questionnaireData.recentRaceTimes?.distance10km || questionnaireData.recentRaceTimes?.distanceHalfMarathon || questionnaireData.recentRaceTimes?.distanceMarathon);
    if (questionnaireData.targetTime && questionnaireData.subGoal && vmaEstimate && !hasRealChrono) {
      const raceDistances = { "5 km": 5, "10 km": 10, "Semi-Marathon": 21.1, "Marathon": 42.195 };
      const raceDist = raceDistances[questionnaireData.subGoal];
      if (raceDist) {
        const targetSeconds = timeToSeconds(questionnaireData.targetTime, raceDist);
        if (targetSeconds > 0) {
          const targetVma = calculateVMAFromTime(raceDist, targetSeconds);
          if (vmaEstimate.vma > targetVma * 1.15) {
            const correctedVma = targetVma * 1.05;
            paces = calculateAllPaces(correctedVma);
            vmaSource = `Recalcul\xE9e depuis objectif ${questionnaireData.subGoal} en ${questionnaireData.targetTime}`;
            vmaEstimate = { vma: correctedVma, source: vmaSource };
          }
        }
      }
    }
    applyTargetTimeOverride(paces, questionnaireData, vmaEstimate.vma);
    console.log(`[Gemini Adaptation] VMA: ${vmaEstimate.vma.toFixed(1)} km/h (${vmaSource})`);
    const objective = detectObjectiveFromData(questionnaireData);
    const level = detectLevelFromData(questionnaireData);
    const isTrail = objective.startsWith("Trail") || objective === "VK" || objective === "TrailSteep";
    const isVKAdapt = objective === "VK";
    const isTrailSteepAdapt = objective === "TrailSteep";
    const isPertePoids = objective === "PertePoids";
    const isMaintien = objective === "Maintien";
    const isRacePrep = !isPertePoids && !isMaintien;
    let objectivePhilosophy;
    if (isPertePoids) {
      objectivePhilosophy = `PERTE DE POIDS :
- L'objectif est le BIEN-\xCATRE et la r\xE9gularit\xE9, PAS un chrono ou une distance.
- Le temps vis\xE9 n'est PAS intouchable \u2014 la priorit\xE9 c'est que le coureur CONTINUE \xE0 courir.
- Si c'est trop dur \u2192 r\xE9duire SANS culpabilit\xE9. Mieux vaut 3x30min/sem r\xE9gulier que 4x45min abandonn\xE9.
- Si c'est trop facile \u2192 augmenter tr\xE8s progressivement (+5min max par s\xE9ance).
- Le RPE id\xE9al est 4-6 : effort mod\xE9r\xE9, conversation possible. RPE > 7 = TROP pour cet objectif.
- Encourager la r\xE9gularit\xE9, pas la performance. "L'important c'est d'y aller, pas d'aller vite."
- Ne JAMAIS dire "l'objectif est intouchable" \u2014 ici l'objectif c'est le plaisir de courir.
- Le objectiveReminder doit \xEAtre centr\xE9 sur le PROCESSUS, pas le r\xE9sultat :
  \u2705 "Tu cours r\xE9guli\xE8rement depuis 3 semaines, c'est une vraie r\xE9ussite. Continue !"
  \u274C "Pour ton objectif de perte de poids en 12 semaines..."
  Le coureur ne doit jamais sentir de pression sur un r\xE9sultat chiffr\xE9.`;
    } else if (isMaintien) {
      objectivePhilosophy = `MAINTIEN / REMISE EN FORME :
- L'objectif est de maintenir ou retrouver une condition physique, pas de performer.
- Flexibilit\xE9 sur les volumes et intensit\xE9s \u2014 s'adapter au quotidien du coureur.
- RPE id\xE9al : 5-6. Ne pas pousser au-del\xE0 sauf demande explicite.
- Si s\xE9ances manqu\xE9es : pas grave du tout, on adapte sans pression.
- Le ton doit \xEAtre d\xE9contract\xE9 et encourageant, jamais culpabilisant.`;
    } else if (isVKAdapt) {
      objectivePhilosophy = `VK / COURSE DE C\xD4TE (${questionnaireData.trailDetails?.distance || "?"}km / ${questionnaireData.trailDetails?.elevation || "?"}m D+) :
- L'objectif est la PUISSANCE EN C\xD4TE, pas la distance ni le volume.
- Le D+/km de la course (${questionnaireData.trailDetails?.distance ? Math.round((questionnaireData.trailDetails?.elevation || 0) / questionnaireData.trailDetails.distance) : "?"} m/km) est EXTR\xCAME \u2014 tout le plan doit \xEAtre orient\xE9 vertical.
- Volume kilom\xE9trique TR\xC8S BAS. Les s\xE9ances sont courtes et intenses.
- La sortie longue est orient\xE9e D+ (pas km) \u2014 1h-1h30 max avec D+ maximum.
- Le fractionn\xE9 en c\xF4te est LE geste sp\xE9cifique \u2014 il peut commencer d\xE8s la phase fondamentale.
- Si RPE \xE9lev\xE9 sur c\xF4tes : v\xE9rifier puissance vs technique. La marche en c\xF4te rapide est une comp\xE9tence.
- Renforcement CRUCIAL : squats, fentes, mollets, gainage, proprioception.`;
    } else if (isTrailSteepAdapt) {
      objectivePhilosophy = `TRAIL RAIDE (${questionnaireData.trailDetails?.distance || "?"}km / ${questionnaireData.trailDetails?.elevation || "?"}m D+) :
- Ratio D+/km \xE9lev\xE9 (${questionnaireData.trailDetails?.distance ? Math.round((questionnaireData.trailDetails?.elevation || 0) / questionnaireData.trailDetails.distance) : "?"} m/km) \u2014 le plan doit privil\xE9gier le travail vertical.
- Le D+ hebdomadaire est PLUS important que le volume kilom\xE9trique.
- Volume r\xE9duit par rapport \xE0 un trail classique de m\xEAme distance.
- Les s\xE9ances en c\xF4te (longues 2-5min, power hiking) sont les s\xE9ances CL\xC9S.
- Le fractionn\xE9 en c\xF4te peut commencer d\xE8s la phase fondamentale.
- Si RPE \xE9lev\xE9 : v\xE9rifier si c'est le D+ ou l'allure. La marche en mont\xE9e est NORMALE.
- Renforcement : quadriceps excentrique (descente), mollets, proprioception.`;
    } else if (isTrail) {
      objectivePhilosophy = `TRAIL (${questionnaireData.trailDetails?.distance || "?"}km / ${questionnaireData.trailDetails?.elevation || "?"}m D+) :
- L'objectif final (distance + D+) guide le plan. Le chrono est secondaire en trail.
- Le D+ hebdomadaire est AUSSI important que le volume kilom\xE9trique.
- Les s\xE9ances en c\xF4te et la sortie longue avec D+ sont les s\xE9ances CL\xC9S \u2014 ne pas les all\xE9ger en priorit\xE9.
- Si RPE \xE9lev\xE9 sur une s\xE9ance D+ : v\xE9rifier si c'est le D+ qui \xE9tait trop fort ou l'allure trop rapide.
  \u2192 En trail, ralentir l'allure en mont\xE9e est TOUJOURS acceptable (marche en c\xF4te = normal).
- En phase sp\xE9cifique trail : l'inconfort musculaire (cuisses, mollets) est normal et attendu.
- Les s\xE9ances de renforcement (cuisses, chevilles) sont CRITIQUES pour la pr\xE9vention des blessures en trail.`;
    } else {
      objectivePhilosophy = `COURSE SUR ROUTE (${plan.goal}${plan.targetTime ? ` en ${plan.targetTime}` : ""}) :
- L'objectif final et le temps vis\xE9 sont INTOUCHABLES.
- On ajuste la M\xC9THODE pour y arriver, pas la destination.
- Les allures calcul\xE9es garantissent l'atteinte de l'objectif si le plan est suivi.
- Si le coureur souffre : adapter intelligemment tout en gardant le cap.
- Si trop facile : augmenter l\xE9g\xE8rement sans modifier les allures de r\xE9f\xE9rence.`;
    }
    let levelRules;
    if (level === "deb") {
      levelRules = `D\xC9BUTANT :
- Les d\xE9butants SOUS-ESTIMENT souvent leur RPE (mettent 5 alors que c'est vraiment 7).
- TOUJOURS cross-checker le RPE avec le commentaire textuel.
- L'erreur la plus fr\xE9quente : courir trop vite en EF. Si RPE > 6 sur un footing \u2192 rappeler que l'EF doit \xEAtre CONFORTABLE (pouvoir parler).
- Maximum de modification par adaptation : 2 s\xE9ances.
- Si adaptation forte n\xE9cessaire (RPE 9-10) : ne PAS h\xE9siter \xE0 remplacer une s\xE9ance par de la marche active ou du footing ultra-lent.
- Amplitude max de changement : -25% volume. Ne jamais augmenter de plus de +5%.
- VMA max : 15min de travail effectif par s\xE9ance.`;
    } else if (level === "inter") {
      levelRules = `INTERM\xC9DIAIRE :
- Le coureur conna\xEEt ses sensations, le RPE est g\xE9n\xE9ralement fiable.
- Les phases de construction (d\xE9veloppement) peuvent \xEAtre inconfortables \u2014 c'est normal.
- Maximum de modification : 2-3 s\xE9ances.
- Amplitude : -20% \xE0 +10% volume.
- VMA max : 20min de travail effectif par s\xE9ance.`;
    } else if (level === "conf") {
      levelRules = `CONFIRM\xC9 :
- Le coureur conna\xEEt bien son corps. Faire confiance \xE0 son RPE.
- En phase sp\xE9cifique, le RPE 7-8 est NORMAL et attendu \u2014 ne pas all\xE9ger syst\xE9matiquement.
- Maximum de modification : 3 s\xE9ances.
- Amplitude : -15% \xE0 +15% volume.
- VMA max : 30min de travail effectif par s\xE9ance.`;
    } else {
      levelRules = `EXPERT :
- Le coureur est autonome, le feedback est pr\xE9cis et fiable.
- Les RPE \xE9lev\xE9s en phase sp\xE9cifique sont normaux et voulus.
- Ne modifier que si le coureur le demande explicitement ou si signes de surentra\xEEnement.
- Maximum de modification : 3 s\xE9ances.
- Amplitude : -15% \xE0 +15% volume.`;
    }
    let trailRules = "Non applicable (pas un plan trail).";
    if (isTrail && questionnaireData.trailDetails) {
      const raceElev = questionnaireData.trailDetails.elevation;
      trailRules = `D+ RACE : ${raceElev}m
- Si RPE \xE9lev\xE9 li\xE9 au D+ (commentaire mentionne "mont\xE9es", "c\xF4tes", "cuisses", "mollets") :
  \u2192 R\xE9duire le D+ de la prochaine s\xE9ance trail de 15-20%, PAS le volume plat
  \u2192 Rappeler que la marche en mont\xE9e est NORMALE et fait partie de la strat\xE9gie trail
- Si RPE bas sur une s\xE9ance D+ : le coureur est pr\xEAt, on peut maintenir ou augmenter l\xE9g\xE8rement
- Le D+ est distribu\xE9 : ~65% sur la SL, ~20% sur la 2\xE8me s\xE9ance, ~15% sur les autres
- Ne JAMAIS mettre de D+ sur les s\xE9ances fractionn\xE9/VMA/piste
- Max D+/session selon niveau : deb 400m, inter 800m, conf 1500m, expert 2500m`;
    }
    const pacesSection = `
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502 Zone                    \u2502 Allure         \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502 EF (Endurance)          \u2502 ${paces.efPace} min/km  \u2502
\u2502 EA (Active)             \u2502 ${paces.eaPace} min/km  \u2502
\u2502 SEUIL                   \u2502 ${paces.seuilPace} min/km  \u2502
\u2502 VMA                     \u2502 ${paces.vmaPace} min/km  \u2502
\u2502 R\xE9cup\xE9ration            \u2502 ${paces.recoveryPace} min/km  \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
`;
    let systemWithContext = ADAPTATION_SYSTEM_INSTRUCTION.replace("{CALCULATED_PACES}", pacesSection).replace(/{GOAL}/g, plan.goal || "ton objectif").replace(/{TARGET_TIME}/g, plan.targetTime ? `en ${plan.targetTime}` : "").replace(/{VMA_VALUE}/g, paces.vmaKmh).replace(/{EF_PACE}/g, paces.efPace).replace(/{EA_PACE}/g, paces.eaPace).replace(/{SEUIL_PACE}/g, paces.seuilPace).replace(/{VMA_PACE}/g, paces.vmaPace).replace("{OBJECTIVE_PHILOSOPHY}", objectivePhilosophy).replace("{LEVEL_RULES}", levelRules).replace("{TRAIL_RULES}", trailRules);
    const periodizationCtx = plan.generationContext?.periodizationPlan;
    let periodizationSection = "Non disponible (plan sans p\xE9riodisation calcul\xE9e).";
    if (periodizationCtx) {
      const weekLines = periodizationCtx.weeklyPhases.map((phase, i) => {
        const vol = periodizationCtx.weeklyVolumes[i];
        const isRecov = periodizationCtx.recoveryWeeks.includes(i + 1);
        return `S${i + 1}: ${phase} \u2014 ${vol}km${isRecov ? " \u26A0\uFE0F R\xC9CUP\xC9RATION" : ""}`;
      }).join("\n");
      periodizationSection = `Plan sur ${periodizationCtx.totalWeeks} semaines.
Semaines de r\xE9cup\xE9ration : ${periodizationCtx.recoveryWeeks.map((w) => "S" + w).join(", ")}

${weekLines}`;
    } else {
      const weekPhases = plan.weeks.filter((w) => w.phase).map((w) => `S${w.weekNumber}: ${w.phase}${w.isRecoveryWeek ? " \u26A0\uFE0F R\xC9CUP\xC9RATION" : ""}`);
      if (weekPhases.length > 0) {
        periodizationSection = weekPhases.join("\n");
      }
    }
    systemWithContext = systemWithContext.replace("{PERIODIZATION_CONTEXT}", periodizationSection);
    const upcomingSessions = [];
    plan.weeks.forEach((week, weekIdx) => {
      week.sessions.forEach((session, sessionIdx) => {
        if (!session.feedback?.completed) {
          let line = `S${weekIdx + 1}-${sessionIdx + 1}: ${session.day} \u2014 "${session.title}" (${session.type}, ${session.duration}`;
          if (session.distance) line += `, ${session.distance}`;
          if (session.elevationGain) line += `, D+${session.elevationGain}m`;
          if (session.targetPace) line += `, allure: ${session.targetPace}`;
          line += `)`;
          if (week.phase) line += ` [${week.phase}]`;
          upcomingSessions.push(line);
        }
      });
    });
    let weeksRemaining = plan.durationWeeks;
    if (plan.raceDate) {
      const raceDate = new Date(plan.raceDate);
      const today = /* @__PURE__ */ new Date();
      const diffTime = raceDate.getTime() - today.getTime();
      weeksRemaining = Math.max(0, Math.ceil(diffTime / (1e3 * 60 * 60 * 24 * 7)));
    }
    const age = questionnaireData.age || 40;
    const fcMax = 220 - age;
    const fcZones = {
      z1: { min: Math.round(fcMax * 0.5), max: Math.round(fcMax * 0.6), label: "Z1 R\xE9cup" },
      z2: { min: Math.round(fcMax * 0.6), max: Math.round(fcMax * 0.7), label: "Z2 EF" },
      z3: { min: Math.round(fcMax * 0.7), max: Math.round(fcMax * 0.8), label: "Z3 Tempo" },
      z4: { min: Math.round(fcMax * 0.8), max: Math.round(fcMax * 0.9), label: "Z4 Seuil" },
      z5: { min: Math.round(fcMax * 0.9), max: fcMax, label: "Z5 VMA/Max" }
    };
    const getHRZone = (hr) => {
      if (hr <= fcZones.z1.max) return "Z1";
      if (hr <= fcZones.z2.max) return "Z2";
      if (hr <= fcZones.z3.max) return "Z3";
      if (hr <= fcZones.z4.max) return "Z4";
      return "Z5";
    };
    const getExpectedZone = (sessionType, sessionTitle) => {
      const t = sessionType || "";
      const title = (sessionTitle || "").toLowerCase();
      if (t === "R\xE9cup\xE9ration") return "Z1";
      if (t === "Jogging") return "Z2";
      if (t === "Sortie Longue") return "Z2";
      if (t === "Marche/Course") return "Z1-Z2";
      if (t === "Fractionn\xE9") {
        if (/seuil|tempo|allure/i.test(title)) return "Z3-Z4";
        if (/vma|intervalle|30.30|200m|300m|400m/i.test(title)) return "Z4-Z5";
        return "Z3-Z4";
      }
      if (t === "Renforcement") return "N/A";
      return "Z2";
    };
    const feedbackHistory = [];
    let fcAlerts = [];
    plan.weeks.forEach((week, weekIdx) => {
      week.sessions.forEach((session) => {
        if (session.feedback?.completed && session.feedback.rpe) {
          let line = `S${weekIdx + 1} ${session.day} "${session.title}" (${session.type}): RPE ${session.feedback.rpe}/10`;
          if (session.feedback.notes) line += ` \u2014 "${session.feedback.notes}"`;
          const sd = session.feedback.stravaData;
          if (sd) {
            line += ` | Strava: ${sd.distance}km en ${sd.movingTime}min, allure ${sd.avgPace}, D+${sd.elevationGain}m`;
            if (sd.avgHeartrate) {
              const zone = getHRZone(sd.avgHeartrate);
              const expected = getExpectedZone(session.type, session.title);
              line += `, FC ${sd.avgHeartrate}bpm (${zone})`;
              if ((expected === "Z1" || expected === "Z2" || expected === "Z1-Z2") && (zone === "Z3" || zone === "Z4" || zone === "Z5")) {
                line += ` \u26A0\uFE0F FC TROP HAUTE pour ${session.type}`;
                fcAlerts.push(`S${weekIdx + 1} "${session.title}": FC ${sd.avgHeartrate}bpm (${zone}) alors que la zone attendue est ${expected}. L'allure EF est probablement trop rapide pour ce coureur.`);
              }
            }
          }
          feedbackHistory.push(line);
        }
      });
    });
    const rpeValues = feedbackHistory.map((f) => {
      const match = f.match(/RPE (\d+)\/10/);
      return match ? parseInt(match[1]) : 0;
    }).filter((v) => v > 0);
    let rpeTrend = "";
    if (rpeValues.length >= 3) {
      const last3 = rpeValues.slice(-3);
      const avg = last3.reduce((a, b) => a + b, 0) / last3.length;
      if (last3.every((v) => v >= 7)) {
        rpeTrend = `\u26A0\uFE0F ALERTE FATIGUE : Les 3 derniers RPE sont tous \u2265 7 (${last3.join(", ")}). Fatigue accumul\xE9e probable.`;
      } else if (last3[0] < last3[1] && last3[1] < last3[2] && last3[2] >= 7) {
        rpeTrend = `\u26A0\uFE0F TENDANCE HAUSSE : RPE en augmentation constante (${last3.join(" \u2192 ")}). Surveiller surcharge.`;
      } else if (avg <= 4) {
        const currentWkIdx = plan.weeks.findIndex((w) => w.sessions.some((s) => !s.feedback?.completed));
        const isRecoveryWk = currentWkIdx >= 0 && (plan.weeks[currentWkIdx].isRecoveryWeek || plan.weeks[currentWkIdx].phase === "recuperation" || plan.generationContext?.periodizationPlan?.recoveryWeeks?.includes(currentWkIdx + 1));
        if (isRecoveryWk) {
          rpeTrend = `\u2705 R\xC9CUP\xC9RATION EN COURS : RPE moyen = ${avg.toFixed(1)} \u2014 c'est normal et voulu en semaine de d\xE9charge.`;
        } else {
          rpeTrend = `\u2139\uFE0F SOUS-CHARGE POSSIBLE : RPE moyen des 3 derni\xE8res s\xE9ances = ${avg.toFixed(1)}. Le coureur est peut-\xEAtre sous-stimul\xE9.`;
        }
      }
    }
    if (rpeValues.length >= 5) {
      const last5 = rpeValues.slice(-5);
      const first2avg = (last5[0] + last5[1]) / 2;
      const last2avg = (last5[3] + last5[4]) / 2;
      if (first2avg - last2avg >= 2 && !rpeTrend.includes("ALERTE")) {
        rpeTrend += `
\u{1F4C8} PROGRESSION D\xC9TECT\xC9E : RPE en baisse constante sur 5+ s\xE9ances (${last5.join(" \u2192 ")}). Le coureur s'adapte bien \u2014 envisager une progression mod\xE9r\xE9e (+5-10% volume).`;
      }
    }
    const currentWeekIdx = plan.weeks.findIndex((w) => w.sessions.some((s) => !s.feedback?.completed));
    const safeWeekIdx = currentWeekIdx >= 0 ? currentWeekIdx : plan.weeks.length - 1;
    const currentPhase = currentWeekIdx >= 0 ? plan.weeks[currentWeekIdx].phase || "non d\xE9finie" : "fin de plan";
    systemWithContext = systemWithContext.replace(/{PHASE}/g, currentPhase);
    const adaptationPrompt = `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              CONTEXTE DU PLAN
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

Objectif : ${plan.goal} ${plan.distance ? `(${plan.distance})` : ""}
${isRacePrep ? `Temps vis\xE9 : ${plan.targetTime || "Finisher"}` : `Type : ${isPertePoids ? "Perte de poids" : "Maintien / Remise en forme"}`}
${plan.raceDate ? `Date de course : ${plan.raceDate}` : ""}
Dur\xE9e du plan : ${plan.durationWeeks} semaines | Semaines restantes : ${weeksRemaining}
Phase actuelle : ${currentPhase}
${plan.weeks[safeWeekIdx]?.isRecoveryWeek ? "\u26A0\uFE0F SEMAINE DE R\xC9CUP\xC9RATION \u2014 RPE bas = ATTENDU ET VOULU" : ""}
${isTrail ? `Trail : ${questionnaireData.trailDetails?.distance}km / ${questionnaireData.trailDetails?.elevation}m D+` : ""}
${periodizationCtx ? `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              P\xC9RIODISATION COMPL\xC8TE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

Semaines de r\xE9cup : ${periodizationCtx.recoveryWeeks.map((w) => "S" + w).join(", ")}
${periodizationCtx.weeklyPhases.slice(Math.max(0, safeWeekIdx - 2), safeWeekIdx + 5).map((p, i) => {
      const wNum = Math.max(0, safeWeekIdx - 2) + i + 1;
      const vol = periodizationCtx.weeklyVolumes[wNum - 1];
      const isRecov = periodizationCtx.recoveryWeeks.includes(wNum);
      const isCurrent = wNum === safeWeekIdx + 1;
      return `${isCurrent ? "\u2192 " : "  "}S${wNum}: ${p} \u2014 ${vol}km${isRecov ? " (R\xC9CUP)" : ""}`;
    }).join("\n")}` : ""}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              ALLURES DE R\xC9F\xC9RENCE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

VMA : ${paces.vmaKmh} km/h (${vmaSource})
${pacesSection}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              PROFIL DU COUREUR
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

Niveau : ${questionnaireData.level} (d\xE9tect\xE9 : ${level})
\xC2ge : ${questionnaireData.age || "Non renseign\xE9"}
Fr\xE9quence : ${questionnaireData.frequency} s\xE9ances/semaine
Volume actuel : ${questionnaireData.currentWeeklyVolume ? `${questionnaireData.currentWeeklyVolume} km/sem` : "Non renseign\xE9"}
Blessures/Contraintes : ${questionnaireData.injuries?.hasInjury ? questionnaireData.injuries.description : "Aucune"}
${(() => {
      const month = (/* @__PURE__ */ new Date()).getMonth();
      if (month >= 5 && month <= 8) return "Saison : \xE9t\xE9 (chaleur probable \u2014 RPE naturellement +1-2 points, allures +10-20 sec/km)";
      if (month >= 11 || month <= 1) return "Saison : hiver (froid, vent \u2014 allures naturellement +10-15 sec/km)";
      return "Saison : mi-saison (conditions normales)";
    })()}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              ZONES FC DU COUREUR (FCmax estim\xE9e : ${fcMax} bpm, \xE2ge ${age})
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

${Object.values(fcZones).map((z) => `${z.label}: ${z.min}-${z.max} bpm`).join("\n")}

Zone attendue par type de s\xE9ance :
- EF / Footing / Sortie longue \u2192 Z2 (${fcZones.z2.min}-${fcZones.z2.max} bpm)
- Seuil / Tempo \u2192 Z3-Z4 (${fcZones.z3.min}-${fcZones.z4.max} bpm)
- VMA / Fractionn\xE9 \u2192 Z4-Z5 (${fcZones.z4.min}-${fcZones.z5.max} bpm)
- R\xE9cup\xE9ration \u2192 Z1 (${fcZones.z1.min}-${fcZones.z1.max} bpm)
${fcAlerts.length > 0 ? `
\u26A0\uFE0F ALERTES FC D\xC9TECT\xC9ES (${fcAlerts.length}) :
${fcAlerts.join("\n")}
\u2192 PRIORIT\xC9 : si ces alertes sont r\xE9currentes, les allures EF du coureur sont TROP RAPIDES pour sa condition r\xE9elle.
  Recommander de RALENTIR de 15-30 sec/km sur les s\xE9ances EF et d'ajuster le mainSet des prochaines s\xE9ances en cons\xE9quence.
  Si 3+ alertes FC : recommander un RECALCUL DE VMA (VMA actuelle probablement surestim\xE9e).
  Mentionner explicitement dans le coachNote : "Ta fr\xE9quence cardiaque montre que tes allures EF sont trop rapides.
  Ralentis \xE0 [allure corrig\xE9e] pour rester en zone 2 et progresser sans risque de surentra\xEEnement."
` : "\u2705 Aucune alerte FC d\xE9tect\xE9e \u2014 les zones cardiaques semblent coh\xE9rentes avec les allures."}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              HISTORIQUE RPE (${feedbackHistory.length} feedbacks)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

${feedbackHistory.length > 0 ? feedbackHistory.slice(-8).join("\n") : "Premier feedback du coureur"}
${rpeTrend ? `
${rpeTrend}` : ""}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              FEEDBACK ACTUEL
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

${feedbackContext}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              S\xC9ANCES \xC0 VENIR (MODIFIABLES)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

${upcomingSessions.slice(0, 12).join("\n")}
${upcomingSessions.length > 12 ? `
... et ${upcomingSessions.length - 12} autres s\xE9ances` : ""}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
              INSTRUCTIONS
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

1. CROSS-CHECK le RPE chiffr\xE9 avec le commentaire textuel (cf. r\xE8gles ci-dessus)
2. ${isRacePrep ? `L'objectif "${plan.goal}${plan.targetTime ? ` en ${plan.targetTime}` : ""}" est INTOUCHABLE` : "Objectif flexible \u2014 priorit\xE9 au bien-\xEAtre et \xE0 la r\xE9gularit\xE9"}
3. Phase actuelle : ${currentPhase}${weeksRemaining <= 3 ? " \u2014 AFF\xDBTAGE/FIN DE PLAN : priorit\xE9 r\xE9cup\xE9ration" : ""}
4. ${plan.weeks[currentWeekIdx]?.isRecoveryWeek ? "SEMAINE DE R\xC9CUP : RPE bas est NORMAL. Ne PAS augmenter le volume/intensit\xE9." : "Consulte la p\xE9riodisation pour comprendre le r\xF4le de cette semaine."}
5. Si des DONN\xC9ES STRAVA sont disponibles, compare pr\xE9vu vs r\xE9alis\xE9 et argumente tes modifications avec ces donn\xE9es concr\xE8tes
6. \u26A0\uFE0F ANALYSE FC OBLIGATOIRE : si des donn\xE9es FC Strava sont disponibles, V\xC9RIFIE que la FC correspond \xE0 la zone attendue. Si FC en Z3+ sur une s\xE9ance EF \u2192 ALERTE et RALENTIR les allures EF des prochaines s\xE9ances de 15-30 sec/km. C'est PRIORITAIRE sur toute autre modification.
7. Modifie UNIQUEMENT les s\xE9ances futures list\xE9es ci-dessus (max 3)
8. UTILISE les allures calcul\xE9es (EF: ${paces.efPace}, Seuil: ${paces.seuilPace}, VMA: ${paces.vmaPace})
9. VARIE les formats de s\xE9ance modifi\xE9e
10. Chaque advice doit \xEAtre PERSONNEL et r\xE9f\xE9rencer l'objectif/la phase/les donn\xE9es Strava
`;
    console.log(`[Gemini Adaptation] Envoi prompt | objective=${objective} level=${level} phase=${currentPhase} trend=${rpeTrend ? "ALERT" : "OK"}`);
    const adaptationModel = genAI2.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemWithContext
    });
    const result = await adaptationModel.generateContent({
      contents: [{ role: "user", parts: [{ text: adaptationPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    const response = await result.response;
    let text = "";
    if (typeof response.text === "function") {
      text = response.text();
    } else if (response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
        text = candidate.content.parts[0].text;
      }
    }
    if (!text) {
      console.error("[Gemini] Structure r\xE9ponse inattendue:", JSON.stringify(response, null, 2));
      throw new Error("Impossible d'extraire le texte de la r\xE9ponse Gemini");
    }
    console.log("[Gemini] R\xE9ponse re\xE7ue, longueur:", text.length);
    try {
      const parsed = JSON.parse(text);
      if (!parsed.pacesReminder) {
        parsed.pacesReminder = `Tes allures de r\xE9f\xE9rence : EF ${paces.efPace}, Seuil ${paces.seuilPace}, VMA ${paces.vmaPace}`;
      }
      return parsed;
    } catch (e) {
      console.error("[Gemini Adaptation] Erreur parsing:", e);
      return {
        adaptationSummary: "Adaptation prise en compte.",
        objectiveReminder: `Ton objectif de ${plan.goal}${plan.targetTime ? ` en ${plan.targetTime}` : ""} reste notre cap !`,
        pacesReminder: `Tes allures de r\xE9f\xE9rence : EF ${paces.efPace}, Seuil ${paces.seuilPace}, VMA ${paces.vmaPace}`,
        coachNote: "Merci pour ton retour ! Continue \xE0 progresser \xE0 ton rythme.",
        modifications: []
      };
    }
  } catch (error) {
    console.error("[Gemini Adaptation] Erreur:", error);
    throw error;
  }
};
export {
  adaptPlanFromFeedback,
  calculateAllPaces,
  calculatePeriodizationPlan,
  detectLevelFromData,
  enforceWeekConstraints,
  generatePreviewPlan,
  generateRemainingWeeks,
  getEffectiveLevel,
  isFinisherTarget
};
