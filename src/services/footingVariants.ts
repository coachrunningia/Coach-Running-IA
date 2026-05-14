/**
 * Bibliothèque de variantes de séances de footing aérobie / endurance fondamentale.
 *
 * Objectif : casser la monotonie de la phase fondamentale (et de récupération)
 * en variant la FORME des séances sans jamais sortir de la zone aérobie.
 * Toutes les variantes restent en EF — la variété vient du terrain, du rythme
 * interne et de l'intention pédagogique, jamais de l'intensité.
 *
 * Filtrage à 2 dimensions :
 *   - Sécurité : contre-indications selon le profil (IMC, blessures, âge, débutant)
 *   - Pertinence : adéquation selon l'objectif (Trail / Route / PerteDePoids / Maintien)
 *
 * Un socle de 4 variantes `universal` garantit qu'un profil très contraint
 * conserve toujours de la variété.
 *
 * Validé par agent coach expert. Voir BIBLIOTHEQUE-VARIANTES-EF.md.
 */

export type FootingGoal = 'Trail' | 'Route' | 'PerteDePoids' | 'Maintien';

export interface FootingProfileFlags {
  isOverweight?: boolean;   // IMC >= 28
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
  /** true = passe tous les filtres, fait partie du socle universel */
  universal: boolean;
  /** flags du profil qui EXCLUENT cette variante */
  contraindications: (keyof FootingProfileFlags)[];
  /** objectifs pour lesquels la variante est pertinente */
  goalFit: FootingGoal[] | 'all';
  /** true si la variante implique du relief → ajuste le D+ si la séance est à plat */
  addsElevation: boolean;
  warmup: string;
  cooldown: string;
  advice: string;
  /** compose le corps de séance avec la durée du corps (min) et l'allure EF */
  buildMainSet: (bodyMin: number, efPace: string) => string;
}

export const FOOTING_VARIANTS: FootingVariant[] = [
  // ─── SOCLE UNIVERSEL (4) ───
  {
    slug: 'footing_classique',
    title: 'Footing en endurance fondamentale',
    universal: true,
    contraindications: [],
    goalFit: 'all',
    addsElevation: false,
    warmup: '5 min de marche active puis montée progressive vers l\'allure d\'endurance fondamentale.',
    cooldown: '5 min de footing très lent puis marche.',
    advice: 'C\'est la séance qui construit ton moteur aérobie : cœur, capillaires, tendons. La régularité de l\'allure est l\'objectif, pas la vitesse.',
    buildMainSet: (m, p) => `${m} min en endurance fondamentale, allure régulière et confortable (${p}). Tu dois pouvoir tenir une conversation tout du long.`,
  },
  {
    slug: 'footing_negative_split',
    title: 'Footing progressif (négative split)',
    universal: true,
    contraindications: [],
    goalFit: 'all',
    addsElevation: false,
    warmup: '5 min de marche puis 5 min de footing très lent (bas de l\'endurance fondamentale).',
    cooldown: '5 min de footing lent puis marche.',
    advice: 'Apprendre à finir mieux qu\'on a commencé : gestion de l\'effort et discipline mentale. La 2e partie reste en aérobie — si tu es essoufflé, tu es allé trop loin.',
    buildMainSet: (m, p) => `${m} min en deux moitiés : la 1re très tranquille (bas de l'EF), la 2e dans le haut de l'EF autour de ${p} — toujours conversationnel, jamais essoufflé. Tu termines plus vite que tu n'as commencé.`,
  },
  {
    slug: 'footing_fractionne_marche',
    title: 'Footing en blocs souples',
    universal: true,
    contraindications: [],
    goalFit: 'all',
    addsElevation: false,
    warmup: '5 min de marche active.',
    cooldown: '5 min de marche.',
    advice: 'Découper l\'effort permet d\'accumuler du volume aérobie en réduisant la charge mécanique globale. Idéal pour progresser sans casser.',
    buildMainSet: (m, p) => {
      const blocs = Math.max(4, Math.round(m / 6));
      return `${blocs} blocs de 5 min de footing en endurance fondamentale (${p}), entrecoupés de 1 min de marche. Le footing reste lent et confortable ; la marche est une récupération active, pas une punition.`;
    },
  },
  {
    slug: 'footing_lignes_droites',
    title: 'Footing + lignes droites',
    universal: true,
    contraindications: [],
    goalFit: 'all',
    addsElevation: false,
    warmup: '5 min de marche puis 10 min de footing en endurance fondamentale.',
    cooldown: '5 min de footing lent puis marche.',
    advice: 'Les lignes droites réveillent la coordination et la qualité de foulée sans coût cardiovasculaire — elles sont trop courtes pour être un travail de vitesse.',
    buildMainSet: (m, p) => `${Math.max(15, m - 8)} min de footing en endurance fondamentale (${p}), puis 4 à 6 lignes droites : ~60-80 m en accélération souple et progressive sur terrain plat (on monte en fréquence de jambes sans forcer), avec retour à allure de footing et récupération complète entre chaque.`,
  },

  // ─── CONDITIONNELLES (4) ───
  {
    slug: 'footing_educatifs',
    title: 'Footing + gammes athlétiques',
    universal: false,
    contraindications: ['hasJointInjury', 'hasKneeInjury', 'hasAnkleInjury', 'hasMuscleTear', 'isOverweight', 'beginner'],
    goalFit: ['Trail', 'Route', 'Maintien'],
    addsElevation: false,
    warmup: '5 min de marche puis 10 min de footing en endurance fondamentale.',
    cooldown: '5 min de footing lent puis marche.',
    advice: 'Les gammes améliorent l\'économie de course et la qualité de foulée. C\'est un investissement technique qui rend chaque footing futur plus efficace.',
    buildMainSet: (m, p) => `${Math.max(15, m - 10)} min de footing en endurance fondamentale (${p}), puis un circuit d'éducatifs : talons-fesses, montées de genoux, pas chassés, foulées bondissantes légères, jambes tendues — 2 séries de 20-30 m par exercice, retour en marche.`,
  },
  {
    slug: 'footing_cotes_douces',
    title: 'Footing vallonné',
    universal: false,
    contraindications: ['hasJointInjury', 'hasKneeInjury', 'isOverweight', 'isSenior60'],
    goalFit: ['Trail', 'Route', 'Maintien'],
    addsElevation: true,
    warmup: '10 min de footing en endurance fondamentale sur terrain plat.',
    cooldown: '5 à 10 min de footing plat puis marche.',
    advice: 'Le relief renforce les chaînes musculaires de façon naturelle et progressive. La règle d\'or : c\'est l\'effort qui reste constant, pas la vitesse.',
    buildMainSet: (m, p) => `${m} min sur parcours légèrement vallonné. En montée : foulée courte, effort d'endurance fondamentale maintenu (${p} en référence sur le plat, la vitesse baisse en côte c'est normal). En descente : relâché, foulée courte et contrôlée. Pas de côte raide, du vallon doux.`,
  },
  {
    slug: 'footing_terrain_varie',
    title: 'Footing nature, terrain varié',
    universal: false,
    contraindications: ['hasAnkleInjury', 'hasJointInjury'],
    goalFit: ['Trail', 'Route', 'Maintien', 'PerteDePoids'],
    addsElevation: false,
    warmup: '10 min de footing en endurance fondamentale sur chemin roulant.',
    cooldown: '5 à 10 min sur terrain roulant puis marche.',
    advice: 'Le terrain varié sollicite les muscles stabilisateurs et la proprioception, en douceur. C\'est un renforcement "gratuit" intégré au footing.',
    buildMainSet: (m, p) => `${m} min sur terrain varié non technique — chemins, sentiers larges, herbe, sous-bois. Adapte l'allure au sol pour garder un effort d'endurance fondamentale constant (${p} en référence). Évite le terrain piégeux (racines, cailloux, dévers).`,
  },
  {
    slug: 'footing_fartlek_souple',
    title: 'Footing au ressenti (fartlek doux)',
    universal: false,
    contraindications: ['beginner'],
    goalFit: ['Trail', 'Route', 'Maintien', 'PerteDePoids'],
    addsElevation: false,
    warmup: '10 min de footing en endurance fondamentale.',
    cooldown: '5 min de footing lent puis marche.',
    advice: 'Le fartlek souple t\'apprend à écouter tes sensations plutôt que ta montre. Le jeu d\'allure casse la routine tout en restant 100 % aérobie.',
    buildMainSet: (m, p) => `${m} min de footing en alternant librement, au ressenti, des portions "bas de l'EF" et des portions "haut de l'EF" (${p} en référence). Aucune portion ne doit faire monter l'essoufflement : tu restes conversationnel partout.`,
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

/** Mappe un goal métier (questionnaire) vers une catégorie FootingGoal. */
export function mapToFootingGoal(goal: string): FootingGoal {
  const g = (goal || '').toLowerCase();
  if (g.includes('trail') || g.includes('vk')) return 'Trail';
  if (g.includes('perte')) return 'PerteDePoids';
  if (g.includes('maintien') || g.includes('remise') || g.includes('forme')) return 'Maintien';
  return 'Route'; // Course sur route, 10k, semi, marathon, Hyrox...
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
 * Sélectionne une variante de footing adaptée au profil + objectif et compose
 * le contenu de la séance. Pioche en rotation selon weekNumber pour garantir
 * la diversité d'une semaine à l'autre.
 *
 * Trois mécanismes garantissent la diversité :
 *   - le pool éligible est INTERLEAVÉ (universelle / conditionnelle alternées)
 *     pour qu'on ne pioche pas 4 footings "classiques" d'affilée ;
 *   - un seedOffset dérivé du `seed` (planId / userId) décale le point de départ
 *     de la rotation → deux plans ne commencent pas par la même variante ;
 *   - `sessionIndex` distingue les footings AU SEIN d'une même semaine → deux
 *     footings de la même semaine reçoivent des variantes différentes.
 *
 * Retourne uniquement les champs de CONTENU (title, warmup, mainSet, cooldown,
 * advice) + addsElevation. La durée / distance / allure / jour de la séance
 * restent ceux calculés en amont par le générateur.
 */
export function buildFootingVariant(params: {
  weekNumber: number;
  sessionIndex?: number; // index du footing dans la semaine (0, 1, 2...) — évite 2 footings identiques/semaine
  goal: string;
  durationStr: string;
  efPace: string;
  flags: FootingProfileFlags;
  seed?: string;
}): { slug: string; title: string; warmup: string; mainSet: string; cooldown: string; advice: string; addsElevation: boolean } {
  const { weekNumber, sessionIndex = 0, goal, durationStr, efPace, flags, seed } = params;
  const footingGoal = mapToFootingGoal(goal);

  // 1. Filtrer les variantes éligibles : sécurité + pertinence
  const eligible = FOOTING_VARIANTS.filter((v) => {
    // Sécurité : aucune contre-indication déclenchée
    const blocked = v.contraindications.some((flag) => flags[flag] === true);
    if (blocked) return false;
    // Pertinence : goalFit
    if (v.goalFit !== 'all' && !v.goalFit.includes(footingGoal)) return false;
    return true;
  });

  // Garde-fou : si jamais aucune variante éligible (ne devrait pas arriver vu
  // les 4 universelles sans contre-indication), fallback sur le classique.
  const filtered = eligible.length > 0 ? eligible : [FOOTING_VARIANTS[0]];

  // 2. Interleaver universelles / conditionnelles pour éviter de servir
  //    les 4 footings de base d'affilée en début de plan.
  const universals = filtered.filter((v) => v.universal);
  const conditionals = filtered.filter((v) => !v.universal);
  const pool: FootingVariant[] = [];
  const maxLen = Math.max(universals.length, conditionals.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < universals.length) pool.push(universals[i]);
    if (i < conditionals.length) pool.push(conditionals[i]);
  }

  // 3. Rotation déterministe : weekNumber + sessionIndex + offset seed du plan.
  //    Le sessionIndex garantit que 2 footings d'une même semaine diffèrent.
  const seedOffset = seed ? hashSeed(seed) : 0;
  const rotationIndex = (Math.max(1, weekNumber) - 1) + sessionIndex + seedOffset;
  const variant = pool[rotationIndex % pool.length];

  // 3. Composer le mainSet (corps de séance = durée totale - warmup/cooldown estimés)
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
    addsElevation: variant.addsElevation,
  };
}
