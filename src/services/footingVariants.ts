/**
 * Bibliothèque de variantes de séances de footing aérobie / endurance fondamentale.
 *
 * Objectif : casser la monotonie de la phase fondamentale (et de récupération)
 * en variant la FORME des séances. C'est purement DÉCORATIF — on ne change que
 * l'habillage (titre, warmup, mainSet, cooldown, advice). La structure de la
 * séance (durée, distance, intensité, dénivelé) reste TOUJOURS intacte.
 *
 * Règle musclée — le terrain de la séance est sacré :
 *   - une séance avec D+ voulu (elevationGain > 0 ou titre vallonné) ne reçoit
 *     QUE des variantes `relief` ;
 *   - une séance plate ne reçoit QUE des variantes `flat`.
 * On ne mélange jamais les terrains : pas d'ajout ni de retrait de dénivelé.
 *
 * Filtrage : sécurité (contre-indications profil) + pertinence (goalFit, doux).
 *
 * Validé par agent coach expert.
 */

export type FootingGoal = 'Trail' | 'Route' | 'Maintien';
export type FootingTerrain = 'flat' | 'relief';

export interface FootingProfileFlags {
  isOverweight?: boolean;   // IMC >= 28 — exclut montée agressive / excentrique marqué
  hasJointInjury?: boolean; // genou / hanche / cheville (générique articulaire)
  hasKneeInjury?: boolean;
  hasAnkleInjury?: boolean;
  hasMuscleTear?: boolean;
  isSenior60?: boolean;     // age >= 60
  beginner?: boolean;       // Débutant 0-1 an
}

export interface FootingVariant {
  slug: string;
  title: string;
  /** terrain de la variante — doit correspondre au terrain de la séance */
  terrain: FootingTerrain;
  /** true = aucune contre-indication, tous goals — socle de diversité garanti */
  universal: boolean;
  /** flags du profil qui EXCLUENT cette variante */
  contraindications: (keyof FootingProfileFlags)[];
  /** objectifs pour lesquels la variante est pertinente (filtre doux) */
  goalFit: FootingGoal[] | 'all';
  warmup: string;
  cooldown: string;
  advice: string;
  /** compose le corps de séance avec la durée du corps (min) et l'allure EF */
  buildMainSet: (bodyMin: number, efPace: string) => string;
}

export const FOOTING_VARIANTS: FootingVariant[] = [
  // ─────────────── TERRAIN PLAT ───────────────
  {
    slug: 'footing_classique',
    title: 'Footing en endurance fondamentale',
    terrain: 'flat',
    universal: true,
    contraindications: [],
    goalFit: 'all',
    warmup: '5 min de marche active puis montée progressive vers l\'allure d\'endurance fondamentale.',
    cooldown: '5 min de footing très lent puis marche.',
    advice: 'C\'est la séance qui construit ton moteur aérobie : cœur, capillaires, tendons. La régularité de l\'allure est l\'objectif, pas la vitesse.',
    buildMainSet: (m, p) => `${m} min en endurance fondamentale, allure régulière et confortable (${p}). Tu dois pouvoir tenir une conversation tout du long.`,
  },
  {
    slug: 'footing_negative_split',
    title: 'Footing progressif (négative split)',
    terrain: 'flat',
    universal: true,
    contraindications: [],
    goalFit: 'all',
    warmup: '5 min de marche puis 5 min de footing très lent (bas de l\'endurance fondamentale).',
    cooldown: '5 min de footing lent puis marche.',
    advice: 'Apprendre à finir mieux qu\'on a commencé : gestion de l\'effort et discipline mentale. La 2e partie reste en aérobie — si tu es essoufflé, tu es allé trop loin.',
    buildMainSet: (m, p) => `${m} min en deux moitiés : la 1re très tranquille (bas de l'EF), la 2e dans le haut de l'EF autour de ${p} — toujours conversationnel, jamais essoufflé. Tu termines plus vite que tu n'as commencé.`,
  },
  {
    slug: 'footing_fractionne_marche',
    title: 'Footing en blocs souples',
    terrain: 'flat',
    universal: true,
    contraindications: [],
    goalFit: 'all',
    warmup: '5 min de marche active.',
    cooldown: '5 min de marche.',
    advice: 'Découper l\'effort permet d\'accumuler du volume aérobie en réduisant la charge mécanique globale. Idéal pour progresser sans casser.',
    buildMainSet: (m, p) => {
      // blocs*5 + (blocs-1)*1 <= m → blocs <= (m+1)/6, plancher 3 pour rester "en blocs"
      const blocs = Math.max(3, Math.floor((m + 1) / 6));
      return `${blocs} blocs de 5 min de footing en endurance fondamentale (${p}), entrecoupés de 1 min de marche. Le footing reste lent et confortable ; la marche est une respiration de confort, pas une récupération d'effort dur.`;
    },
  },
  {
    slug: 'footing_lignes_droites',
    title: 'Footing + lignes droites',
    terrain: 'flat',
    universal: false,
    contraindications: ['hasMuscleTear', 'beginner'],
    goalFit: ['Route', 'Maintien'],
    warmup: '5 min de marche puis 10 min de footing en endurance fondamentale.',
    cooldown: '5 min de footing lent puis marche.',
    advice: 'Les lignes droites réveillent la coordination et la qualité de foulée sans coût cardiovasculaire — elles sont trop courtes pour être un travail de vitesse.',
    buildMainSet: (m, p) => `${Math.max(15, m - 8)} min de footing en endurance fondamentale (${p}), puis 4 à 6 lignes droites : ~60-80 m en accélération souple et progressive sur terrain plat (on monte en fréquence de jambes sans forcer), avec retour à allure de footing et récupération complète entre chaque. C'est trop court pour solliciter le cardio — c'est un travail de coordination, pas de vitesse.`,
  },
  {
    slug: 'footing_educatifs',
    title: 'Footing + gammes athlétiques',
    terrain: 'flat',
    universal: false,
    contraindications: ['hasJointInjury', 'hasKneeInjury', 'hasAnkleInjury', 'hasMuscleTear', 'beginner'],
    goalFit: ['Trail', 'Route', 'Maintien'],
    warmup: '5 min de marche puis 10 min de footing en endurance fondamentale.',
    cooldown: '5 min de footing lent puis marche.',
    advice: 'Les gammes améliorent l\'économie de course et la qualité de foulée. C\'est un investissement technique qui rend chaque footing futur plus efficace.',
    buildMainSet: (m, p) => `${Math.max(15, m - 10)} min de footing en endurance fondamentale (${p}), puis un circuit d'éducatifs réalisé en souplesse, sans recherche d'intensité : talons-fesses, montées de genoux, pas chassés, foulées bondissantes légères, jambes tendues — 2 séries de 20-30 m par exercice, retour en marche.`,
  },
  {
    slug: 'footing_fartlek_souple',
    title: 'Footing au ressenti (fartlek doux)',
    terrain: 'flat',
    universal: false,
    contraindications: ['beginner'],
    goalFit: ['Trail', 'Route', 'Maintien'],
    warmup: '10 min de footing en endurance fondamentale.',
    cooldown: '5 min de footing lent puis marche.',
    advice: 'Le fartlek souple t\'apprend à écouter tes sensations plutôt que ta montre. Le jeu d\'allure casse la routine tout en restant 100 % aérobie.',
    buildMainSet: (m, p) => `${m} min de footing en alternant librement, au ressenti, des portions "bas de l'EF" et des portions "haut de l'EF" (${p} en référence). Aucune portion ne doit faire monter l'essoufflement : tu restes conversationnel partout.`,
  },

  // ─────────────── TERRAIN RELIEF ───────────────
  {
    slug: 'footing_cotes_douces',
    title: 'Footing vallonné',
    terrain: 'relief',
    universal: false,
    contraindications: ['hasJointInjury', 'hasKneeInjury', 'isOverweight', 'isSenior60'],
    goalFit: ['Trail', 'Route', 'Maintien'],
    warmup: '10 min de footing en endurance fondamentale sur terrain plat.',
    cooldown: '5 à 10 min de footing plat puis marche.',
    advice: 'Le relief renforce les chaînes musculaires de façon naturelle et progressive. La règle d\'or : c\'est l\'effort qui reste constant, pas la vitesse.',
    buildMainSet: (m, p) => `${m} min sur parcours légèrement vallonné. En montée : foulée courte, effort d'endurance fondamentale maintenu (${p} en référence sur le plat, la vitesse baisse en côte c'est normal). En descente : relâché, foulée courte et contrôlée. Pas de côte raide, du vallon doux.`,
  },
  {
    slug: 'footing_cotes_courtes_marche',
    title: 'Footing vallonné, côtes en marche',
    terrain: 'relief',
    universal: false,
    contraindications: ['hasKneeInjury'],
    goalFit: ['Trail', 'Route', 'Maintien'],
    warmup: '10 min de footing en endurance fondamentale sur terrain plat ou faux-plat.',
    cooldown: '5 à 10 min de footing plat puis marche.',
    advice: 'Franchir les montées raides en marche active limite le travail excentrique tout en construisant les chaînes musculaires. Une approche accessible du relief, peu traumatisante.',
    buildMainSet: (m, p) => `${m} min sur parcours vallonné. Les montées les plus raides se franchissent en marche active et dynamique (poussée des bras, gainage). Le plat et les descentes douces se courent en endurance fondamentale (${p} en référence). On gère l'effort, pas le chrono.`,
  },
  {
    slug: 'footing_terrain_varie',
    title: 'Footing nature, terrain varié',
    terrain: 'relief',
    universal: false,
    contraindications: ['hasAnkleInjury', 'hasJointInjury', 'isSenior60', 'beginner', 'isOverweight'],
    goalFit: ['Trail', 'Maintien'],
    warmup: '10 min de footing en endurance fondamentale sur chemin roulant.',
    cooldown: '5 à 10 min sur terrain roulant puis marche.',
    advice: 'Le terrain varié sollicite les muscles stabilisateurs et la proprioception, en douceur. C\'est un renforcement "gratuit" intégré au footing.',
    buildMainSet: (m, p) => `${m} min sur terrain varié non technique — chemins, sentiers larges, herbe, sous-bois. Adapte l'allure au sol pour garder un effort d'endurance fondamentale constant (${p} en référence). Évite le terrain piégeux (racines, cailloux, dévers).`,
  },
  {
    slug: 'footing_sentier_roulant',
    title: 'Footing sur sentier roulant',
    terrain: 'relief',
    universal: false,
    contraindications: ['hasAnkleInjury', 'beginner'],
    goalFit: ['Trail', 'Maintien'],
    warmup: '10 min de footing en endurance fondamentale sur chemin roulant.',
    cooldown: '5 à 10 min sur terrain roulant puis marche.',
    advice: 'Le sentier roulant fait travailler le dénivelé "de fond", diffus et régulier, sans pic d\'effort excentrique. La meilleure école pour habituer les jambes au D+.',
    buildMainSet: (m, p) => `${m} min sur sentier roulant non technique avec du dénivelé régulier et diffus (pas de côte marquée). Garde un effort d'endurance fondamentale constant (${p} en référence) : tu laisses la vitesse fluctuer avec le terrain.`,
  },
];

/**
 * Calcule les flags de profil utilisés pour filtrer les variantes de footing,
 * à partir des données brutes du questionnaire. Détection blessures par regex
 * sur la description (normalisée sans accents).
 */
export function detectFootingFlags(params: {
  weight?: number;
  height?: number;
  age?: number;
  level?: string;
  injuries?: { hasInjury?: boolean; description?: string };
}): FootingProfileFlags {
  const { weight, height, age, level, injuries } = params;
  const bmi = (weight && height && height > 0) ? weight / ((height / 100) ** 2) : 0;
  const desc = (injuries?.description || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hasInjury = !!injuries?.hasInjury;

  const hasKneeInjury = hasInjury && /genou|genoux|rotule|rotulien|menisque|ligament croise|bandelette|syndrome essuie|femoro|patellaire|condromalac/.test(desc);
  const hasAnkleInjury = hasInjury && /cheville|achille|tendon|tendinite|tendinopathie|perioste|periostite|fasci|aponevrose|plantaire/.test(desc);
  const hasHipInjury = hasInjury && /hanche|tendineu/.test(desc);
  const hasMuscleTear = hasInjury && /dechirure|claquage|elongation|contracture/.test(desc);
  const hasJointInjury = hasKneeInjury || hasAnkleInjury || hasHipInjury || (hasInjury && /articul|statique/.test(desc));

  return {
    isOverweight: bmi >= 28,
    hasJointInjury,
    hasKneeInjury,
    hasAnkleInjury,
    hasMuscleTear,
    isSenior60: (age || 0) >= 60,
    beginner: /debutant|débutant/i.test(level || ''),
  };
}

/** Mappe un goal métier (questionnaire) vers une catégorie FootingGoal.
 *  "Perte de poids" est traité comme "Maintien" — aucune catégorie dédiée. */
export function mapToFootingGoal(goal: string): FootingGoal {
  const g = (goal || '').toLowerCase();
  if (g.includes('trail') || g.includes('vk')) return 'Trail';
  if (g.includes('perte') || g.includes('maintien') || g.includes('remise') || g.includes('forme')) return 'Maintien';
  return 'Route'; // Course sur route, 10k, semi, marathon, Hyrox...
}

/** Détecte si un titre de séance indique du dénivelé voulu. */
export const HILL_TITLE_RE = /vallonn|colline|c[ôo]te|d\+|denivel|d[ée]nivel|mont[ée]e/i;

/** Détermine le terrain d'une séance : relief si D+ voulu (elevationGain ou titre), sinon plat. */
export function detectSessionTerrain(elevationGain?: number, title?: string): FootingTerrain {
  if (elevationGain && elevationGain > 0) return 'relief';
  if (title && HILL_TITLE_RE.test(title)) return 'relief';
  return 'flat';
}

/**
 * Parse une durée vers des minutes totales. Gère tous les formats rencontrés :
 *   "51 min" → 51   |   "1h00" → 60   |   "1h31" → 91   |   "1h 20 min" → 80
 *   "1h 02 min" → 62   |   "45" → 45
 */
export function parseDurationToMin(durationStr: string): number {
  if (!durationStr) return 45;
  const s = String(durationStr);
  // Format "XhYY" / "Xh YY" / "Xh YY min" : heures + minutes (collées ou espacées)
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

/** Hash déterministe simple d'une chaîne → entier positif. */
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Sélectionne une variante de footing adaptée au terrain de la séance, au profil
 * et à l'objectif, puis compose le contenu DÉCORATIF de la séance.
 *
 * Règle musclée : le pool est d'abord filtré sur le `terrain` de la séance —
 * une séance vallonnée ne peut tomber QUE sur une variante relief, une séance
 * plate QUE sur une variante plate. Aucune modification de structure.
 *
 * Diversité garantie par :
 *   - rotation déterministe (weekNumber + sessionIndex + seedOffset) → 2 footings
 *     d'une même semaine diffèrent, 2 plans ne démarrent pas pareil ;
 *   - interleave universelles / conditionnelles → pas 3 footings de base d'affilée.
 *
 * Retourne uniquement les champs de CONTENU. Durée / distance / allure / jour /
 * dénivelé de la séance restent ceux calculés en amont par le générateur.
 */
export function buildFootingVariant(params: {
  weekNumber: number;
  sessionIndex?: number;
  goal: string;
  durationStr: string;
  efPace: string;
  flags: FootingProfileFlags;
  /** dénivelé voulu de la séance (m) — détermine le terrain */
  sessionElevation?: number;
  /** titre original de la séance — détecte "vallonné/côte/D+" */
  sessionTitle?: string;
  seed?: string;
}): { slug: string; title: string; warmup: string; mainSet: string; cooldown: string; advice: string } {
  const { weekNumber, sessionIndex = 0, goal, durationStr, efPace, flags, sessionElevation, sessionTitle, seed } = params;
  const footingGoal = mapToFootingGoal(goal);
  const terrain = detectSessionTerrain(sessionElevation, sessionTitle);

  // 1. Filtrer : terrain de la séance (sacré) + sécurité + pertinence goalFit.
  const eligible = FOOTING_VARIANTS.filter((v) => {
    if (v.terrain !== terrain) return false;
    if (v.contraindications.some((flag) => flags[flag] === true)) return false;
    if (v.goalFit !== 'all' && !v.goalFit.includes(footingGoal)) return false;
    return true;
  });

  let filtered = eligible;
  if (filtered.length === 0) {
    // Aucune variante éligible pour ce terrain. On ne change JAMAIS le terrain.
    if (terrain === 'relief') {
      // Profil contraint sur séance vallonnée : on garde le relief, on relâche
      // les contre-indications en piochant la variante relief la moins risquée.
      const reliefAll = FOOTING_VARIANTS.filter((v) => v.terrain === 'relief');
      const leastRisky = reliefAll.reduce((best, v) => {
        const score = v.contraindications.filter((f) => flags[f] === true).length;
        const bestScore = best.contraindications.filter((f) => flags[f] === true).length;
        return score < bestScore ? v : best;
      });
      filtered = [leastRisky];
    } else {
      // Terrain plat : le classique passe toujours.
      filtered = [FOOTING_VARIANTS[0]];
    }
  }

  // 2. Interleave universelles / conditionnelles pour éviter les répétitions.
  const universals = filtered.filter((v) => v.universal);
  const conditionals = filtered.filter((v) => !v.universal);
  const pool: FootingVariant[] = [];
  const maxLen = Math.max(universals.length, conditionals.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < universals.length) pool.push(universals[i]);
    if (i < conditionals.length) pool.push(conditionals[i]);
  }

  // 3. Rotation déterministe : weekNumber + sessionIndex + offset seed du plan.
  const seedOffset = seed ? hashSeed(seed) : 0;
  const rotationIndex = (Math.max(1, weekNumber) - 1) + sessionIndex + seedOffset;
  const variant = pool[rotationIndex % pool.length];

  // 4. Composer le mainSet (corps = durée totale - warmup/cooldown estimés).
  const totalMin = parseDurationToMin(durationStr);
  const bodyMin = Math.max(20, totalMin - 18);
  const pace = efPace || 'allure EF';

  return {
    slug: variant.slug,
    title: variant.title,
    warmup: variant.warmup,
    mainSet: variant.buildMainSet(bodyMin, pace),
    cooldown: variant.cooldown,
    advice: variant.advice,
  };
}
