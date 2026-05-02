/**
 * Catalogue d'exercices de renforcement musculaire pour coureurs.
 * Chaque exercice contient : posture, erreurs, tips, muscles, progression.
 * Les images seront ajoutées dans imageUrl une fois générées.
 *
 * Validé par : Agent Kinésithérapeute + Agent Préparateur Physique Expert
 */

export interface ExerciseInfo {
  name: string;
  displayName: string;
  muscle: string;
  muscleSecondary: string;
  icon: string; // emoji groupe musculaire
  runningBenefit: string;
  posture: string[];
  mistakes: string[];
  contraindications?: string;
  tipCoach: string;
  tempo: string;
  progression: string;
  alternative: string;
  imageUrl?: string; // sera rempli après génération GPT Image 2
}

// Clés normalisées : lowercase, sans accents, sans parenthèses
// Le parser du mainSet matche les noms d'exercices avec ces clés
export const EXERCISE_CATALOG: Record<string, ExerciseInfo> = {

  // ═══════════════════════════════════════
  // QUADRICEPS / FESSIERS
  // ═══════════════════════════════════════

  "squats poids de corps": {
    name: "squats poids de corps",
    displayName: "Squats poids de corps",
    muscle: "Quadriceps, fessiers",
    muscleSecondary: "Ischio-jambiers, mollets, lombaires",
    icon: "🦵",
    runningBenefit: "Renforce les muscles moteurs de la foulée et améliore la puissance de propulsion.",
    posture: [
      "Pieds largeur d'épaules, pointes légèrement ouvertes",
      "Dos droit, regard devant, poitrine ouverte",
      "Descendre en poussant les fesses vers l'arrière, cuisses parallèles au sol",
      "Poids réparti sur toute la surface du pied, talons au sol"
    ],
    mistakes: [
      "Genoux qui rentrent vers l'intérieur (risque : ligaments croisés, ménisque)",
      "Dos arrondi en bas du mouvement (risque : hernie discale)",
      "Talons qui décollent du sol (risque : surcharge rotulienne)"
    ],
    contraindications: "Douleur rotulienne aiguë, syndrome fémoro-patellaire non stabilisé, douleur coccygienne",
    tipCoach: "Inspire en descendant, expire en remontant. Tempo 2s descente, 1s remontée.",
    tempo: "2s descente, 1s remontée",
    progression: "Ajouter un temps de pause en bas (3s) ou passer au squat sauté",
    alternative: "Demi-squat (ne descendre qu'à 45°) ou squat assisté avec chaise derrière"
  },

  "squat bulgare": {
    name: "squat bulgare",
    displayName: "Squat bulgare",
    muscle: "Quadriceps, grand fessier",
    muscleSecondary: "Ischio-jambiers, adducteurs, stabilisateurs de hanche",
    icon: "🦵",
    runningBenefit: "Travaille la force unilatérale et la stabilité de hanche, essentielle pour chaque appui en course.",
    posture: [
      "Pied arrière posé sur un banc ou une marche (dessus du pied)",
      "Pied avant suffisamment loin pour que le genou ne dépasse pas les orteils",
      "Tronc légèrement incliné vers l'avant, dos droit, tibia proche de la verticale (léger avancement du genou toléré)",
      "Descendre jusqu'à ce que le genou arrière frôle le sol"
    ],
    mistakes: [
      "Pied avant trop près du banc (risque : surcharge du genou)",
      "Tronc trop droit ou trop penché (risque : perte d'équilibre, lombalgie)",
      "Genou avant qui part vers l'intérieur (risque : tendinopathie rotulienne)"
    ],
    contraindications: "Instabilité de cheville, tendinopathie rotulienne aiguë, douleur de hanche, troubles statiques non corrigés",
    tipCoach: "Regarde un point fixe devant toi pour l'équilibre. Descente lente 3s.",
    tempo: "3s descente, 1s pause, 1s remontée",
    progression: "Ajouter des haltères légers ou augmenter la hauteur du support",
    alternative: "Fentes arrière simples au sol, sans support surélevé"
  },

  "fentes avant": {
    name: "fentes avant",
    displayName: "Fentes avant",
    muscle: "Quadriceps, grand fessier",
    muscleSecondary: "Ischio-jambiers, mollets, adducteurs",
    icon: "🦵",
    runningBenefit: "Reproduit le schéma de propulsion unilatérale de la foulée.",
    posture: [
      "Grand pas vers l'avant, genou avant aligné au-dessus de la cheville",
      "Genou arrière descend vers le sol sans le toucher",
      "Tronc droit et gainé, épaules basses",
      "Pousser avec le talon avant pour revenir à la position initiale"
    ],
    mistakes: [
      "Genou avant qui dépasse largement les orteils (risque : tendon rotulien)",
      "Pas trop court créant une position instable (risque : chute, mauvais recrutement)",
      "Tronc qui s'affaisse vers l'avant (risque : lombalgie)"
    ],
    tipCoach: "Imagine que tu poses le genou arrière sur un coussin. Mouvement contrôlé.",
    tempo: "2s descente, 1s remontée",
    progression: "Fentes marchées ou fentes avec rotation du tronc",
    alternative: "Fentes arrière (moins de stress sur le genou avant)"
  },

  "fentes marchees": {
    name: "fentes marchees",
    displayName: "Fentes marchées",
    muscle: "Quadriceps, grand fessier",
    muscleSecondary: "Ischio-jambiers, adducteurs, stabilisateurs de hanche",
    icon: "🦵",
    runningBenefit: "Travaille la propulsion et l'équilibre en mouvement, très proche du geste de course.",
    posture: [
      "Enchaîner les fentes en avançant, comme en marchant",
      "Chaque pas : genou avant au-dessus de la cheville, genou arrière vers le sol",
      "Tronc droit et stable, bras le long du corps ou sur les hanches",
      "Pousser avec le talon avant pour enchaîner le pas suivant"
    ],
    mistakes: [
      "Perdre l'alignement hanche-genou-cheville (risque : instabilité, genou qui rentre)",
      "Accélérer le mouvement au détriment du contrôle (risque : chute, blessure)",
      "Pas trop étroit (pieds sur une même ligne) (risque : perte d'équilibre latéral)"
    ],
    tipCoach: "Garde un écart latéral entre les pieds (largeur du bassin) pour la stabilité.",
    tempo: "2s par pas, fluide et contrôlé",
    progression: "Ajouter une rotation du tronc à chaque fente ou tenir des haltères",
    alternative: "Fentes avant statiques (sur place) si l'équilibre est difficile"
  },

  "step-up sur marche": {
    name: "step-up sur marche",
    displayName: "Step-up sur marche",
    muscle: "Quadriceps, grand fessier",
    muscleSecondary: "Mollets, stabilisateurs de hanche",
    icon: "🦵",
    runningBenefit: "Simule la montée d'escalier et renforce la propulsion en côte.",
    posture: [
      "Pied entier posé sur la marche (pas seulement la pointe)",
      "Pousser avec le talon pour monter, pas avec le pied au sol",
      "Dos droit, regard devant, ne pas se pencher en avant",
      "Monter jusqu'à l'extension complète de la jambe"
    ],
    mistakes: [
      "S'aider du pied au sol pour pousser (risque : le travail est annulé)",
      "Genou qui rentre vers l'intérieur en montant (risque : syndrome fémoro-patellaire)",
      "Marche trop haute pour le niveau (risque : compensation lombaire)"
    ],
    tipCoach: "Commence avec une marche de 20-25 cm. Augmente quand 3×12 est facile sans compensation.",
    tempo: "2s montée contrôlée, 2s descente contrôlée",
    progression: "Augmenter la hauteur de la marche ou ajouter un haltère",
    alternative: "Step-up sur marche très basse (10-15 cm)"
  },

  "hip thrust": {
    name: "hip thrust",
    displayName: "Hip thrust",
    muscle: "Grand fessier",
    muscleSecondary: "Ischio-jambiers, lombaires, abdominaux",
    icon: "🍑",
    runningBenefit: "Le fessier est le moteur principal de l'extension de hanche en course.",
    posture: [
      "Dos appuyé sur un banc ou le bord du canapé (omoplates sur le bord)",
      "Pieds au sol, genoux à 90° en position haute",
      "Pousser les hanches vers le plafond en serrant les fessiers",
      "Menton rentré (regard vers les genoux, pas le plafond) pour éviter l'hyperextension"
    ],
    mistakes: [
      "Cambrer le bas du dos en haut du mouvement (risque : lombalgie)",
      "Pieds trop loin ou trop près (risque : travail des ischio au lieu des fessiers)",
      "Ne pas monter assez haut (risque : travail incomplet)"
    ],
    tipCoach: "Serre les fessiers 2 secondes en haut du mouvement. Tu dois sentir les fessiers, pas le dos.",
    tempo: "2s montée, 2s tenue en haut, 2s descente",
    progression: "Ajouter un poids sur les hanches ou passer en unipodal",
    alternative: "Pont fessier au sol (même mouvement mais dos au sol)"
  },

  "pont fessier": {
    name: "pont fessier",
    displayName: "Pont fessier au sol",
    muscle: "Grand fessier",
    muscleSecondary: "Ischio-jambiers, lombaires",
    icon: "🍑",
    runningBenefit: "Active les fessiers souvent inhibés par la position assise prolongée.",
    posture: [
      "Allongé sur le dos, genoux pliés, pieds à plat au sol largeur du bassin",
      "Bras le long du corps, paumes vers le sol",
      "Soulever les hanches en serrant les fessiers jusqu'à obtenir une ligne droite genoux-hanches-épaules",
      "Ne pas cambrer : le mouvement vient des fessiers, pas du dos"
    ],
    mistakes: [
      "Cambrer le bas du dos (risque : compression lombaire)",
      "Pousser avec les pieds au lieu de contracter les fessiers (risque : travail des ischio)",
      "Monter trop haut (hyperextension) (risque : pincement lombaire)"
    ],
    tipCoach: "Imagine que tu coinces une noix entre tes fesses. Serre 2s en haut.",
    tempo: "2s montée, 2s tenue, 2s descente",
    progression: "Pont fessier unipodal ou ajouter un poids sur les hanches",
    alternative: "Même exercice avec amplitude réduite (ne monter qu'à mi-hauteur)"
  },

  "pont fessier au sol": {
    name: "pont fessier au sol",
    displayName: "Pont fessier au sol",
    muscle: "Grand fessier",
    muscleSecondary: "Ischio-jambiers, lombaires",
    icon: "🍑",
    runningBenefit: "Active les fessiers souvent inhibés par la position assise prolongée.",
    posture: [
      "Allongé sur le dos, genoux pliés, pieds à plat au sol largeur du bassin",
      "Bras le long du corps, paumes vers le sol",
      "Soulever les hanches en serrant les fessiers",
      "Ligne droite genoux-hanches-épaules en haut du mouvement"
    ],
    mistakes: [
      "Cambrer le bas du dos (risque : compression lombaire)",
      "Pousser avec les pieds au lieu des fessiers (risque : travail des ischio)",
      "Monter trop haut (risque : pincement lombaire)"
    ],
    tipCoach: "Serre les fessiers 2 secondes en haut. Tu dois sentir les fessiers brûler, pas le dos.",
    tempo: "2s montée, 2s tenue, 2s descente",
    progression: "Pont unipodal ou ajouter un poids",
    alternative: "Amplitude réduite, ne monter qu'à mi-hauteur"
  },

  "pont unipodal": {
    name: "pont unipodal",
    displayName: "Pont fessier unipodal",
    muscle: "Grand fessier, moyen fessier",
    muscleSecondary: "Ischio-jambiers, stabilisateurs du bassin",
    icon: "🍑",
    runningBenefit: "Renforce le fessier en appui unipodal, comme à chaque foulée.",
    posture: [
      "Position de pont fessier, une jambe tendue vers le plafond",
      "Pousser avec le pied au sol, hanche bien alignée (ne pas pencher)",
      "Garder le bassin horizontal, ne pas laisser la hanche libre descendre",
      "Serrer les fessiers du côté d'appui en haut du mouvement"
    ],
    mistakes: [
      "Bassin qui penche du côté de la jambe levée (risque : compensation lombaire)",
      "Trop d'amplitude de la jambe en l'air (risque : perte de contrôle)",
      "Compenser avec le dos au lieu des fessiers (risque : lombalgie)"
    ],
    tipCoach: "Place tes mains sur tes hanches pour sentir si le bassin reste horizontal.",
    tempo: "2s montée, 2s tenue, 2s descente",
    progression: "Pied d'appui surélevé sur une marche",
    alternative: "Pont fessier classique à deux pieds"
  },

  "chaise murale": {
    name: "chaise murale",
    displayName: "Chaise murale",
    muscle: "Quadriceps (isométrique)",
    muscleSecondary: "Fessiers, mollets",
    icon: "🦵",
    runningBenefit: "Développe l'endurance musculaire du quadriceps pour les descentes et la fin de course.",
    posture: [
      "Dos plaqué contre le mur, glisser jusqu'à ce que les cuisses soient parallèles au sol",
      "Genoux à 90°, tibias proches de la verticale",
      "Pieds à plat, écartés largeur du bassin",
      "Dos complètement collé au mur, tête contre le mur"
    ],
    mistakes: [
      "Genoux qui dépassent les orteils (risque : surcharge rotulienne)",
      "Dos décollé du mur (risque : perte de gainage, lombalgie)",
      "Descendre trop bas (cuisses sous l'horizontale) (risque : pression excessive)"
    ],
    tipCoach: "Respire normalement. Le chrono commence quand les cuisses sont parallèles.",
    tempo: "Maintien isométrique 30-90s",
    progression: "Ajouter un poids sur les cuisses ou passer en unipodal alterné",
    alternative: "Chaise murale à 45° (mi-hauteur) si les genoux sont sensibles"
  },

  // ═══════════════════════════════════════
  // GAINAGE
  // ═══════════════════════════════════════

  "gainage ventral": {
    name: "gainage ventral",
    displayName: "Gainage ventral (planche)",
    muscle: "Transverse, grand droit abdominal",
    muscleSecondary: "Obliques, lombaires, épaules, fessiers",
    icon: "💪",
    runningBenefit: "Stabilise le tronc pour transmettre efficacement la force des jambes au sol.",
    posture: [
      "Appui sur les avant-bras et les pointes de pieds",
      "Corps parfaitement aligné : chevilles, hanches, épaules sur une même ligne",
      "Fessiers et abdominaux contractés, bassin en rétroversion légère",
      "Regard vers le sol, nuque dans le prolongement du dos"
    ],
    mistakes: [
      "Fesses trop hautes (en V inversé) (risque : travail inefficace)",
      "Hanches qui s'affaissent vers le sol (risque : lombalgie, compression discale)",
      "Retenir sa respiration (risque : augmentation de pression intra-abdominale)"
    ],
    tipCoach: "Respire normalement. Contracte comme si quelqu'un allait te pousser.",
    tempo: "Maintien 30-60s, respiration libre",
    progression: "Lever un bras ou une jambe alternativement, ou planche sur mains",
    alternative: "Planche sur les genoux (même alignement mais genoux au sol)"
  },

  "gainage lateral": {
    name: "gainage lateral",
    displayName: "Gainage latéral",
    muscle: "Obliques, carré des lombes",
    muscleSecondary: "Moyen fessier, transverse, épaules",
    icon: "💪",
    runningBenefit: "Empêche la chute du bassin à chaque foulée, stabilise le tronc latéralement.",
    posture: [
      "Appui sur un avant-bras et le côté du pied, corps aligné de la tête aux pieds",
      "Hanche soulevée, ne pas laisser le bassin descendre",
      "Épaule d'appui au-dessus du coude, pas devant ni derrière",
      "Bras libre le long du corps ou main sur la hanche"
    ],
    mistakes: [
      "Hanche qui s'affaisse (risque : perte de gainage, compression lombaire)",
      "Rotation du tronc vers l'avant ou l'arrière (risque : travail inefficace)",
      "Épaule trop en avant du coude (risque : douleur d'épaule)"
    ],
    tipCoach: "Imagine qu'un fil tire ta hanche vers le plafond. Corps comme une planche latérale.",
    tempo: "Maintien 20-30s par côté",
    progression: "Lever la jambe supérieure ou ajouter une rotation du tronc",
    alternative: "Gainage latéral sur les genoux (même position mais genoux au sol)"
  },

  "dead bug": {
    name: "dead bug",
    displayName: "Dead bug",
    muscle: "Transverse, grand droit abdominal",
    muscleSecondary: "Psoas, obliques, plancher pelvien",
    icon: "💪",
    runningBenefit: "Apprend au corps à stabiliser le tronc pendant le mouvement des jambes, comme en course.",
    posture: [
      "Allongé sur le dos, bras tendus vers le plafond, genoux au-dessus des hanches à 90°",
      "Bas du dos plaqué au sol (pas d'espace entre les lombaires et le sol)",
      "Tendre un bras vers l'arrière et la jambe opposée vers l'avant simultanément",
      "Revenir à la position initiale et changer de côté"
    ],
    mistakes: [
      "Bas du dos qui se cambre pendant l'extension (risque : lombalgie)",
      "Mouvements trop rapides sans contrôle (risque : travail inefficace)",
      "Retenir sa respiration (risque : pression abdominale)"
    ],
    tipCoach: "Expire quand tu tends bras et jambe, inspire au retour. Le dos NE DOIT PAS décoller.",
    tempo: "2s extension, 1s pause, 2s retour",
    progression: "Ralentir le tempo (4s extension) ou ajouter des lestes aux chevilles",
    alternative: "Ne bouger que les jambes (bras au sol) si le dos se cambre"
  },

  "bird-dog": {
    name: "bird-dog",
    displayName: "Bird-dog",
    muscle: "Multifides, érecteurs du rachis",
    muscleSecondary: "Grand fessier, transverse, deltoïdes",
    icon: "💪",
    runningBenefit: "Renforce la coordination croisée bras-jambe opposée, le schéma exact de la course.",
    posture: [
      "À quatre pattes, mains sous les épaules, genoux sous les hanches",
      "Tendre simultanément le bras droit et la jambe gauche (et inversement)",
      "Maintenir le dos plat — ne pas cambrer ni arrondir",
      "Bras et jambe tendus forment une ligne droite avec le tronc"
    ],
    mistakes: [
      "Dos qui se creuse quand on tend la jambe (risque : compression lombaire)",
      "Rotation du bassin (hanche qui s'ouvre) (risque : travail inefficace)",
      "Mouvements brusques au lieu de contrôlés (risque : perte de gainage)"
    ],
    tipCoach: "Imagine un verre d'eau posé sur ton dos — il ne doit pas tomber.",
    tempo: "2s extension, 2s tenue, 2s retour",
    progression: "Depuis une position de planche (sur les pieds) au lieu de quatre pattes",
    alternative: "Lever uniquement un bras OU une jambe, pas les deux"
  },

  "superman": {
    name: "superman",
    displayName: "Superman",
    muscle: "Érecteurs du rachis, lombaires",
    muscleSecondary: "Grand fessier, ischio-jambiers, trapèzes",
    icon: "💪",
    runningBenefit: "Renforce la chaîne postérieure complète pour maintenir la posture en fin de course.",
    posture: [
      "Allongé face contre terre, bras tendus devant, jambes tendues",
      "Lever simultanément les bras et les jambes du sol (5-10 cm suffisent)",
      "Regard vers le sol (ne pas relever la tête)",
      "Serrer les fessiers et les lombaires en haut du mouvement"
    ],
    mistakes: [
      "Lever trop haut (hyperextension) (risque : pincement lombaire)",
      "Relever la tête et regarder devant (risque : compression cervicale)",
      "Mouvements brusques (risque : à-coup sur les vertèbres)"
    ],
    tipCoach: "Pense à t'allonger plutôt qu'à monter. Amplitude modeste, contraction forte.",
    tempo: "2s montée, 2s tenue, 2s descente",
    progression: "Ajouter un temps de pause de 5s en haut ou alterner bras/jambe opposés",
    alternative: "Superman partiel (lever uniquement les bras OU les jambes)"
  },

  "pompes": {
    name: "pompes",
    displayName: "Pompes",
    muscle: "Pectoraux, triceps, deltoïdes antérieurs",
    muscleSecondary: "Abdominaux, dentelé antérieur",
    icon: "💪",
    runningBenefit: "Renforce le haut du corps pour un balancier de bras efficace et une posture stable.",
    posture: [
      "Mains au sol légèrement plus larges que les épaules",
      "Corps gainé de la tête aux pieds (même alignement que la planche)",
      "Descendre la poitrine vers le sol, coudes à 45° du corps (pas à 90°)",
      "Remonter en extension complète des bras"
    ],
    mistakes: [
      "Coudes trop écartés à 90° (risque : impingement de l'épaule)",
      "Hanches qui s'affaissent (risque : lombalgie)",
      "Ne pas descendre assez bas (risque : travail incomplet)"
    ],
    tipCoach: "Coudes à 45° du corps, pas en aile de poulet. Descends jusqu'à 5cm du sol.",
    tempo: "2s descente, 1s remontée",
    progression: "Pompes diamant (mains rapprochées) ou pompes pieds surélevés",
    alternative: "Pompes sur les genoux ou pompes inclinées (mains sur un banc)"
  },

  // ═══════════════════════════════════════
  // MOLLETS / PIEDS
  // ═══════════════════════════════════════

  "extensions mollets debout": {
    name: "extensions mollets debout",
    displayName: "Extensions mollets debout",
    muscle: "Gastrocnémiens (jumeaux)",
    muscleSecondary: "Soléaire, tibial postérieur",
    icon: "🦶",
    runningBenefit: "Le mollet est le ressort de la foulée — chaque appui sollicite ce muscle intensément.",
    posture: [
      "Debout au bord d'une marche, talons dans le vide",
      "Monter sur la pointe des pieds en contractant les mollets",
      "Descendre lentement en dessous du niveau de la marche (étirement)",
      "Mouvement complet : amplitude maximale en haut ET en bas"
    ],
    mistakes: [
      "Amplitude trop réduite (petits mouvements) (risque : travail partiel, pas de gain)",
      "Rebondir en bas du mouvement (risque : tendinopathie d'Achille)",
      "Se pencher en avant (risque : déséquilibre, travail inefficace)"
    ],
    tipCoach: "Tiens-toi à un mur pour l'équilibre. Descente 3 secondes, montée 1 seconde.",
    tempo: "1s montée, 1s tenue en haut, 3s descente",
    progression: "Passer en unipodal (un seul pied) ou ajouter un poids",
    alternative: "Même exercice au sol (sans marche), amplitude réduite"
  },

  "mobilite cheville": {
    name: "mobilite cheville",
    displayName: "Mobilité cheville (genou au mur)",
    muscle: "Soléaire, tibial postérieur",
    muscleSecondary: "Gastrocnémiens, tibial antérieur",
    icon: "🦶",
    runningBenefit: "Améliore la flexion dorsale de cheville, essentielle pour absorber les chocs en course.",
    posture: [
      "Face au mur, pied à 5-10 cm du mur",
      "Pousser le genou vers le mur en gardant le talon au sol",
      "Le genou doit toucher le mur sans que le talon se lève",
      "Si c'est facile : reculer le pied progressivement"
    ],
    mistakes: [
      "Talon qui décolle du sol (risque : étirement inefficace)",
      "Genou qui part vers l'intérieur (risque : contrainte sur le ménisque interne)",
      "Forcer en douleur (risque : aggravation si tendinopathie)"
    ],
    tipCoach: "Mesure la distance pied-mur pour suivre ta progression. 12-15 cm = bonne mobilité.",
    tempo: "Maintien 3s genou au mur, 15 reps par pied",
    progression: "Reculer le pied pour augmenter la distance ou ajouter un poids sur le genou",
    alternative: "Cercles de cheville lents (10 dans chaque sens)"
  },

  // ═══════════════════════════════════════
  // STABILITÉ HANCHE
  // ═══════════════════════════════════════

  "clamshell avec elastique": {
    name: "clamshell avec elastique",
    displayName: "Clamshell avec élastique",
    muscle: "Moyen fessier, petit fessier",
    muscleSecondary: "Rotateurs externes de hanche, TFL",
    icon: "🍑",
    runningBenefit: "Prévient le syndrome de l'essuie-glace et la chute du bassin en course.",
    posture: [
      "Allongé sur le côté, genoux pliés à 45°, élastique autour des genoux",
      "Pieds joints, ouvrir le genou supérieur en gardant les pieds collés",
      "Le bassin ne doit PAS bouger — le mouvement vient uniquement de la hanche",
      "Contrôler la descente (ne pas laisser l'élastique claquer)"
    ],
    mistakes: [
      "Bassin qui roule vers l'arrière à l'ouverture (risque : travail du piriforme au lieu du moyen fessier)",
      "Mouvement trop rapide (risque : perte de contrôle, travail inefficace)",
      "Élastique trop fort (risque : compensation par rotation du bassin)"
    ],
    tipCoach: "Place ta main sur ta hanche : elle ne doit pas bouger pendant le mouvement.",
    tempo: "2s ouverture, 1s tenue, 2s retour",
    progression: "Élastique plus résistant ou ajouter une extension de jambe en haut",
    alternative: "Même exercice sans élastique, en se concentrant sur le contrôle"
  },

  "equilibre unipodal": {
    name: "equilibre unipodal",
    displayName: "Équilibre unipodal",
    muscle: "Stabilisateurs de cheville, moyen fessier",
    muscleSecondary: "Abdominaux profonds, tibial postérieur",
    icon: "🦶",
    runningBenefit: "Chaque foulée est un appui unipodal — l'équilibre est la base de la course.",
    posture: [
      "Debout sur un pied, genou légèrement fléchi (pas tendu en hyperextension)",
      "Hanche de la jambe levée au même niveau que l'autre (pas qui descend)",
      "Regard fixe devant, bras libres ou mains sur les hanches",
      "Pied d'appui avec les orteils détendus, poids centré"
    ],
    mistakes: [
      "Genou d'appui verrouillé en hyperextension (risque : stress ligamentaire)",
      "Hanche qui chute du côté de la jambe levée (signe de Trendelenburg) (risque : faiblesse moyen fessier)",
      "Compenser avec les bras en moulinant (risque : masque le déficit de stabilité)"
    ],
    tipCoach: "30 secondes stables = validé. Si tu tangues, travaille pieds nus sur sol dur.",
    tempo: "Maintien 30-60s par côté",
    progression: "Fermer les yeux ou ajouter des micro-perturbations (lancer de balle)",
    alternative: "Même exercice avec un doigt posé sur un mur"
  },

  "marche laterale avec elastique": {
    name: "marche laterale avec elastique",
    displayName: "Marche latérale avec élastique",
    muscle: "Moyen fessier, TFL",
    muscleSecondary: "Quadriceps, adducteurs",
    icon: "🍑",
    runningBenefit: "Active les stabilisateurs latéraux qui empêchent le genou de rentrer en course.",
    posture: [
      "Élastique autour des chevilles ou des genoux, pieds largeur du bassin",
      "Position semi-squat (léger fléchi), dos droit",
      "Faire des pas latéraux en gardant la tension sur l'élastique",
      "Ne pas laisser les pieds se rapprocher complètement entre chaque pas"
    ],
    mistakes: [
      "Se redresser entre les pas (risque : perte de tension, travail inefficace)",
      "Pieds qui pointent vers l'extérieur (risque : compensation, travail du piriforme)",
      "Pas trop grands (risque : perte de contrôle)"
    ],
    tipCoach: "Garde la brûlure sur le côté des fesses — c'est le moyen fessier qui travaille.",
    tempo: "Pas lents et contrôlés, 10-12 pas par direction",
    progression: "Élastique plus résistant ou descendre plus bas en squat",
    alternative: "Même exercice sans élastique, en poussant fort avec le pied d'appui"
  },

  "fente laterale": {
    name: "fente laterale",
    displayName: "Fente latérale",
    muscle: "Adducteurs, quadriceps, fessiers",
    muscleSecondary: "Ischio-jambiers, moyen fessier",
    icon: "🦵",
    runningBenefit: "Renforce le plan frontal souvent négligé, protège contre les entorses et douleurs de genou.",
    posture: [
      "Grand pas latéral, pied qui atterrit bien à plat",
      "Fléchir le genou du côté du pas, l'autre jambe reste tendue",
      "Dos droit, fesses vers l'arrière (comme un squat latéral)",
      "Pousser avec le talon pour revenir à la position initiale"
    ],
    mistakes: [
      "Genou qui dépasse les orteils (risque : surcharge rotulienne)",
      "Dos arrondi (risque : lombalgie)",
      "Pied qui tourne vers l'extérieur (risque : contrainte sur le ménisque)"
    ],
    tipCoach: "Pense à t'asseoir sur une chaise latérale. Le poids reste sur le talon.",
    tempo: "2s descente, 1s pause, 2s retour",
    progression: "Ajouter un haltère ou enchaîner sans revenir au centre",
    alternative: "Demi-amplitude si la souplesse des adducteurs est limitée"
  },

  // ═══════════════════════════════════════
  // EXCENTRIQUE / PRÉVENTION
  // ═══════════════════════════════════════

  "squat excentrique": {
    name: "squat excentrique",
    displayName: "Squat excentrique (descente 4s)",
    muscle: "Quadriceps (excentrique)",
    muscleSecondary: "Fessiers, ischio-jambiers",
    icon: "🦵",
    runningBenefit: "Prépare les quadriceps aux descentes en trail et réduit les douleurs post-course.",
    posture: [
      "Même position que le squat classique",
      "Descendre TRÈS LENTEMENT en 4 secondes",
      "Remonter à vitesse normale (1-2s)",
      "Contrôler chaque centimètre de la descente"
    ],
    mistakes: [
      "Descendre à vitesse normale (risque : perte du bénéfice excentrique)",
      "Se laisser tomber en bas du mouvement (risque : surcharge articulaire)",
      "Compenser la fatigue en arrondissant le dos (risque : lombalgie)"
    ],
    tipCoach: "Compte dans ta tête : 1-mille, 2-mille, 3-mille, 4-mille en descendant.",
    tempo: "4s descente, 1s pause en bas, 1s remontée",
    progression: "Passer à 6s de descente ou ajouter un poids",
    alternative: "Demi-squat excentrique (ne descendre qu'à 45°)"
  },

  "fente arriere lente": {
    name: "fente arriere lente",
    displayName: "Fente arrière lente (3s)",
    muscle: "Quadriceps, grand fessier (excentrique)",
    muscleSecondary: "Ischio-jambiers, adducteurs",
    icon: "🦵",
    runningBenefit: "Renforce quadriceps et fessiers en excentrique pour absorber les chocs de la foulée.",
    posture: [
      "Grand pas vers l'ARRIÈRE (moins de stress sur le genou que la fente avant)",
      "Descente très lente en 3 secondes",
      "Genou arrière descend vers le sol sans le toucher",
      "Tronc droit, regard devant"
    ],
    mistakes: [
      "Descendre trop vite (risque : perte du bénéfice excentrique)",
      "Pas trop court (risque : surcharge du genou avant)",
      "Se pencher en avant (risque : perte d'équilibre, lombalgie)"
    ],
    tipCoach: "La fente arrière est plus sûre que la fente avant pour les genoux sensibles.",
    tempo: "3s descente, 1s pause, 1s remontée",
    progression: "Passer à 5s de descente ou ajouter des haltères",
    alternative: "Demi-amplitude en se tenant à un support"
  },

  "step-down excentrique": {
    name: "step-down excentrique",
    displayName: "Step-down excentrique",
    muscle: "Quadriceps (vaste médial)",
    muscleSecondary: "Fessiers, mollets",
    icon: "🦵",
    runningBenefit: "Protège le tendon rotulien en renforçant le quadriceps en phase freinatrice (descentes).",
    posture: [
      "Debout sur une marche, un pied dans le vide",
      "Descendre LENTEMENT le talon du pied libre vers le sol (4-5s)",
      "Le genou d'appui reste aligné au-dessus du pied",
      "Remonter avec les deux pieds (ne pas remonter en unipodal)"
    ],
    mistakes: [
      "Descente trop rapide (risque : perte du travail excentrique)",
      "Genou qui rentre vers l'intérieur (risque : syndrome fémoro-patellaire)",
      "Marche trop haute pour le niveau (risque : douleur rotulienne)"
    ],
    contraindications: "Tendinopathie rotulienne en phase aiguë (douleur > 5/10)",
    tipCoach: "Commence avec une marche de 10 cm. Augmente uniquement si 0 douleur sur 3×10.",
    tempo: "4-5s descente contrôlée, remonter avec les deux pieds",
    progression: "Augmenter la hauteur de la marche ou ajouter un poids",
    alternative: "Même mouvement sur marche très basse (10 cm)"
  },

  // ═══════════════════════════════════════
  // PLIOMÉTRIE / EXPLOSIVITÉ
  // ═══════════════════════════════════════

  "squats sautes": {
    name: "squats sautes",
    displayName: "Squats sautés",
    muscle: "Quadriceps, fessiers, mollets",
    muscleSecondary: "Ischio-jambiers, abdominaux",
    icon: "⚡",
    runningBenefit: "Développe la puissance d'impulsion pour les côtes et les relances.",
    posture: [
      "Position de squat classique, descendre en fléchissant les genoux",
      "Exploser vers le haut en poussant fort sur les deux pieds",
      "Réception souple : atterrir sur l'avant du pied, amortir en fléchissant",
      "Enchaîner immédiatement le squat suivant après la réception"
    ],
    mistakes: [
      "Réception sur les talons (risque : choc articulaire, fracture de stress)",
      "Genoux qui rentrent à la réception (risque : ligaments croisés)",
      "Dos arrondi pendant le squat (risque : lombalgie)"
    ],
    contraindications: "IMC ≥ 30, tendinopathie active, douleur articulaire, déchirure musculaire récente",
    tipCoach: "2s descente, explosion maximale au saut. Réception SOUPLE et silencieuse.",
    tempo: "2s descente, explosion, réception amortie",
    progression: "Ajouter un gilet lesté ou enchaîner en tuck jump",
    alternative: "Squat classique avec montée rapide sur pointes (sans quitter le sol)"
  },

  "mountain climbers": {
    name: "mountain climbers",
    displayName: "Mountain climbers",
    muscle: "Abdominaux, psoas",
    muscleSecondary: "Épaules, quadriceps, mollets",
    icon: "⚡",
    runningBenefit: "Combine gainage et travail cardio spécifique au geste de course.",
    posture: [
      "Position de planche haute (bras tendus), corps gainé",
      "Ramener un genou vers la poitrine, puis l'autre en alternance",
      "Garder le dos plat (ne pas lever les fesses)",
      "Mains sous les épaules, regard vers le sol"
    ],
    mistakes: [
      "Fesses qui montent en pic (risque : perte du gainage, travail inefficace)",
      "Trop de rebond (risque : perte de contrôle)",
      "Épaules qui avancent devant les mains (risque : douleur d'épaule)"
    ],
    tipCoach: "Version lente pour le gainage, version rapide pour le cardio. Les deux sont utiles.",
    tempo: "Rapide et explosif (cardio) ou lent et contrôlé (gainage)",
    progression: "Version cross-body (genou vers coude opposé)",
    alternative: "Même mouvement debout, mains sur un mur"
  },

  "corde a sauter": {
    name: "corde a sauter",
    displayName: "Corde à sauter",
    muscle: "Mollets, tibial antérieur",
    muscleSecondary: "Quadriceps, épaules, abdominaux",
    icon: "⚡",
    runningBenefit: "Renforce la raideur du tendon d'Achille et l'économie de course.",
    posture: [
      "Rebonds légers sur l'avant du pied, genoux légèrement fléchis",
      "Coudes collés au corps, rotation du poignet uniquement",
      "Corps droit et gainé, regard devant",
      "Sauts bas (2-3 cm suffisent), pas besoin de monter haut"
    ],
    mistakes: [
      "Sauts trop hauts (risque : surcharge tendineuse, énergie gaspillée)",
      "Atterrir sur les talons (risque : choc articulaire)",
      "Bras trop écartés (risque : fatigue inutile des épaules)"
    ],
    contraindications: "Tendinopathie d'Achille active, périostite tibiale, déchirure mollet récente",
    tipCoach: "Rebonds rapides et légers. Double appui pour commencer, alterner ensuite.",
    tempo: "Rebonds rapides et légers, contact au sol minimal",
    progression: "Passer au simple appui alterné puis au double-under",
    alternative: "Sauts sur place sans corde, faible amplitude"
  },

  // ═══════════════════════════════════════
  // PROPRIOCEPTION / MOBILITÉ
  // ═══════════════════════════════════════

  "equilibre unipodal yeux fermes": {
    name: "equilibre unipodal yeux fermes",
    displayName: "Équilibre unipodal yeux fermés",
    muscle: "Stabilisateurs de cheville, moyen fessier",
    muscleSecondary: "Abdominaux profonds, tibial postérieur",
    icon: "🧘",
    runningBenefit: "Améliore la proprioception de cheville, réduisant le risque d'entorse en trail.",
    posture: [
      "Même position que l'équilibre unipodal, puis fermer les yeux",
      "Genou légèrement fléchi, pas verrouillé",
      "Se concentrer sur les sensations sous le pied d'appui",
      "Bras libres pour rattraper l'équilibre si nécessaire"
    ],
    mistakes: [
      "Verrouiller le genou en extension (risque : instabilité ligamentaire)",
      "Abandonner dès la première oscillation (risque : pas de progression)",
      "Surface trop instable pour commencer (risque : chute)"
    ],
    tipCoach: "30s stables yeux fermés = excellent. Commence sur sol dur, pieds nus.",
    tempo: "Maintien 20-30s par pied, 3 séries",
    progression: "Ajouter des micro-perturbations ou surface instable (coussin)",
    alternative: "Yeux ouverts d'abord, puis semi-fermés, puis fermés"
  },

  "russian twist": {
    name: "russian twist",
    displayName: "Russian twist",
    muscle: "Obliques, transverse",
    muscleSecondary: "Grand droit abdominal, fléchisseurs de hanche",
    icon: "💪",
    runningBenefit: "Renforce la rotation du tronc nécessaire au balancier bras-jambes en course.",
    posture: [
      "Assis au sol, genoux fléchis, pieds au sol ou légèrement levés",
      "Dos incliné à 45°, poitrine ouverte (pas arrondi)",
      "Mains jointes devant la poitrine, tourner le tronc de gauche à droite",
      "Le mouvement vient du tronc, pas des bras"
    ],
    mistakes: [
      "Dos arrondi (risque : compression discale)",
      "Tourner uniquement les bras sans le tronc (risque : travail inefficace)",
      "Vitesse excessive (risque : perte de contrôle, à-coup sur le rachis)"
    ],
    tipCoach: "Regarde tes mains — tes yeux suivent la rotation. Mouvement lent et ample.",
    tempo: "2s par rotation, contrôlé",
    progression: "Pieds levés du sol ou ajouter un poids (médecine-ball)",
    alternative: "Pieds au sol, amplitude réduite"
  },

  "nordic hamstring curl": {
    name: "nordic hamstring curl",
    displayName: "Nordic hamstring curl",
    muscle: "Ischio-jambiers (excentrique)",
    muscleSecondary: "Mollets, fessiers",
    icon: "🦵",
    runningBenefit: "Réduit de 50% le risque de lésion des ischio-jambiers (étude FIFA 11+).",
    posture: [
      "À genoux, pieds bloqués sous un meuble lourd ou tenus par un partenaire",
      "Corps droit, gainé, des genoux aux épaules",
      "Se laisser tomber vers l'avant LE PLUS LENTEMENT POSSIBLE",
      "Se rattraper avec les mains quand on ne peut plus retenir"
    ],
    mistakes: [
      "Se laisser tomber trop vite (risque : perte du bénéfice excentrique)",
      "Casser au niveau des hanches (plier en V) (risque : travail inefficace)",
      "Forcer la remontée en concentrique (risque : crampe, claquage)"
    ],
    contraindications: "Déchirure ischio-jambiers récente (<6 semaines), douleur au genou en flexion",
    tipCoach: "L'objectif est la DESCENTE lente (5-8s). Remonte avec les mains, c'est normal.",
    tempo: "5-8s descente, remontée avec les mains",
    progression: "Augmenter l'amplitude de descente avant de se rattraper",
    alternative: "Glissade talon au sol (hamstring slide) ou descente partielle uniquement"
  },

};

/**
 * Normalise un nom d'exercice pour le matcher avec le catalogue.
 * Retire accents, parenthèses, met en lowercase.
 */
export const normalizeExerciseName = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retire accents
    .replace(/\(.*?\)/g, '') // retire parenthèses et contenu
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Cherche un exercice dans le catalogue par nom (fuzzy match).
 * Retourne l'exercice trouvé ou null.
 */
export const findExercise = (rawName: string): ExerciseInfo | null => {
  const normalized = normalizeExerciseName(rawName);

  // Match exact
  if (EXERCISE_CATALOG[normalized]) return EXERCISE_CATALOG[normalized];

  // Match partiel — chercher si le nom normalisé contient une clé du catalogue
  for (const [key, exercise] of Object.entries(EXERCISE_CATALOG)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return exercise;
    }
  }

  // Match par mots-clés principaux
  const words = normalized.split(' ').filter(w => w.length > 3);
  for (const [key, exercise] of Object.entries(EXERCISE_CATALOG)) {
    const keyWords = key.split(' ');
    const matchCount = words.filter(w => keyWords.some(kw => kw.includes(w) || w.includes(kw))).length;
    if (matchCount >= 2) return exercise;
  }

  return null;
};

/**
 * Parse un mainSet de renfo et extrait les exercices avec leurs reps.
 * Ex: "Circuit 3 tours : Squats poids de corps (3x16), Fentes avant (3x10/jambe)..."
 * → [{ name: "Squats poids de corps", sets: "3x16", info: ExerciseInfo }, ...]
 */
export const parseMainSetExercises = (mainSet: string): Array<{ name: string; sets: string; info: ExerciseInfo | null }> => {
  const exercises: Array<{ name: string; sets: string; info: ExerciseInfo | null }> = [];

  // Pattern: "NomExercice (3x10)" ou "NomExercice (3x10/jambe)" ou "NomExercice (2x30s)"
  const regex = /([A-ZÀ-Ü][a-zà-ü\-\s']+(?:[A-ZÀ-Ü][a-zà-ü\-\s']*)*)\s*\((\d+x\d+[^)]*)\)/g;
  let match;

  while ((match = regex.exec(mainSet)) !== null) {
    const name = match[1].trim();
    const sets = match[2].trim();
    const info = findExercise(name);
    exercises.push({ name, sets, info });
  }

  return exercises;
};
