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

  // ═══════════════════════════════════════
  // PLIOMÉTRIE (suite)
  // ═══════════════════════════════════════

  "fentes sautees alternees": {
    name: "fentes sautees alternees",
    displayName: "Fentes sautées alternées",
    muscle: "Quadriceps, fessiers, psoas",
    muscleSecondary: "Mollets, adducteurs",
    icon: "⚡",
    runningBenefit: "Renforce la propulsion unilatérale et la stabilité au changement d'appui.",
    posture: [
      "Buste vertical, regard horizontal",
      "Genou avant au-dessus de la cheville, genou arrière vers le sol",
      "Réception souple sur l'avant-pied, genoux fléchis",
      "Enchaîner immédiatement le switch en l'air"
    ],
    mistakes: [
      "Genou avant qui dépasse les orteils (risque : surcharge rotulienne)",
      "Tronc penché en avant (risque : perte d'équilibre, chute)",
      "Réception jambes raides (risque : impact articulaire)"
    ],
    contraindications: "IMC ≥ 30, tendinopathie rotulienne active, instabilité de cheville, déchirure musculaire",
    tipCoach: "Commencer sans saut (fentes alternées rapides) puis ajouter la phase aérienne.",
    tempo: "Descente contrôlée 1s, switch explosif",
    progression: "Augmenter l'amplitude ou ajouter des haltères légers",
    alternative: "Fentes alternées sans saut, rythme rapide"
  },

  "box jumps": {
    name: "box jumps",
    displayName: "Box jumps / sauts sur banc",
    muscle: "Quadriceps, fessiers, mollets",
    muscleSecondary: "Ischio-jambiers, abdominaux",
    icon: "⚡",
    runningBenefit: "Améliore la détente verticale et le recrutement neuromusculaire rapide.",
    posture: [
      "Pieds largeur de hanches, bras en balancier",
      "Impulsion simultanée des deux pieds",
      "Réception complète sur le banc, pieds à plat, genoux fléchis",
      "Redescendre en MARCHANT, jamais en sautant"
    ],
    mistakes: [
      "Banc trop haut (risque : réception sur la pointe, chute)",
      "Sauter pour redescendre (risque : surcharge tendons d'Achille)",
      "Dos arrondi à la réception (risque : lombalgie)"
    ],
    contraindications: "IMC ≥ 30, tendinopathie d'Achille, rupture LCA non stabilisée, déchirure musculaire",
    tipCoach: "Hauteur initiale = un step ou une marche d'escalier. Augmenter de 5 cm/semaine max.",
    tempo: "Impulsion explosive, réception 2s contrôlée",
    progression: "Augmenter la hauteur ou enchaîner en rebond",
    alternative: "Step-up dynamique sur marche basse"
  },

  "skipping haut": {
    name: "skipping haut",
    displayName: "Skipping haut",
    muscle: "Psoas-iliaque, mollets",
    muscleSecondary: "Quadriceps, abdominaux",
    icon: "⚡",
    runningBenefit: "Améliore la fréquence de foulée et le retour actif du genou.",
    posture: [
      "Genou monté à 90° minimum",
      "Pied de contact au sol sous le bassin, pas devant",
      "Bras opposé synchronisé avec le genou",
      "Gainage abdominal constant, buste droit"
    ],
    mistakes: [
      "Pied qui frappe le sol devant le corps (risque : freinage, périostite)",
      "Épaules montées et crispées (risque : tension cervicale)",
      "Amplitudes inégales droite/gauche (risque : déséquilibre musculaire)"
    ],
    contraindications: "Périostite tibiale en phase aiguë, fracture de fatigue",
    tipCoach: "Filmer de profil pour vérifier que le pied atterrit sous le centre de gravité.",
    tempo: "Rapide et rythmé, contact au sol minimal",
    progression: "Ajouter une résistance élastique aux chevilles",
    alternative: "Montées de genoux sur place, tempo modéré"
  },

  "sauts directionnels": {
    name: "sauts directionnels",
    displayName: "Sauts directionnels",
    muscle: "Moyen fessier, adducteurs",
    muscleSecondary: "Mollets, quadriceps",
    icon: "⚡",
    runningBenefit: "Développe la stabilité latérale essentielle en trail sur terrain instable.",
    posture: [
      "Position semi-fléchie, pieds parallèles",
      "Sauter latéralement, en avant ou en diagonale selon la consigne",
      "Réception genoux fléchis, buste stable",
      "Stabiliser 1-2 secondes avant le saut suivant"
    ],
    mistakes: [
      "Valgus de genou à la réception (risque : ligaments croisés)",
      "Ne pas stabiliser entre les sauts (risque : perte de contrôle)",
      "Surface glissante (risque : chute)"
    ],
    contraindications: "Entorse de cheville récente (<6 semaines), instabilité chronique de genou",
    tipCoach: "Travailler d'abord la réception statique sur une jambe avant les sauts multidirectionnels.",
    tempo: "Impulsion explosive, stabilisation 2s à la réception",
    progression: "Augmenter la distance ou enchaîner sans pause",
    alternative: "Pas chassés latéraux rapides"
  },

  "jumping jacks": {
    name: "jumping jacks",
    displayName: "Jumping jacks",
    muscle: "Mollets, deltoïdes",
    muscleSecondary: "Adducteurs, abdominaux",
    icon: "⚡",
    runningBenefit: "Échauffement cardiovasculaire complet qui active les chaînes latérales.",
    posture: [
      "Pieds joints au départ, bras le long du corps",
      "Écarter pieds et bras simultanément",
      "Réception sur l'avant-pied, genoux souples",
      "Rythme régulier et contrôlé"
    ],
    mistakes: [
      "Réception talons lourds (risque : impact transmis au dos)",
      "Bras qui ne montent pas complètement (risque : perte d'efficacité)",
      "Hyperextension lombaire en haut (risque : lombalgie)"
    ],
    contraindications: "Incontinence urinaire d'effort non rééduquée, pathologie d'épaule limitant l'élévation",
    tipCoach: "Rapide et continu, 1 répétition par seconde.",
    tempo: "Rapide et continu",
    progression: "Variante squat jack (descendre en squat à chaque ouverture)",
    alternative: "Step jack (un pied après l'autre, sans saut)"
  },

  "montees de genoux": {
    name: "montees de genoux",
    displayName: "Montées de genoux",
    muscle: "Psoas-iliaque, quadriceps",
    muscleSecondary: "Abdominaux, mollets",
    icon: "⚡",
    runningBenefit: "Renforce le psoas et améliore la phase de levée du genou en foulée.",
    posture: [
      "Genou monté à hauteur de hanche minimum",
      "Appui sur l'avant-pied, talon ne touche pas le sol",
      "Abdominaux verrouillés, pas de bascule du bassin",
      "Bras synchronisés avec les jambes"
    ],
    mistakes: [
      "Bassin qui recule (risque : compensation, perte de gainage)",
      "Se pencher en arrière (risque : surcharge lombaire)",
      "Fréquence trop rapide sacrifiant l'amplitude (risque : travail incomplet)"
    ],
    contraindications: "Conflit de hanche (FAI) symptomatique, pubalgie aiguë",
    tipCoach: "Privilégier l'amplitude avant la vitesse — la hauteur du genou prime sur la cadence.",
    tempo: "Rapide, fréquence haute, gainage actif",
    progression: "Contre résistance élastique ou en côte",
    alternative: "Marche avec genoux hauts, tempo lent"
  },

  "burpees adaptes": {
    name: "burpees adaptes",
    displayName: "Burpees adaptés",
    muscle: "Quadriceps, pectoraux, fessiers",
    muscleSecondary: "Abdominaux, épaules",
    icon: "⚡",
    runningBenefit: "Développe la puissance globale et la capacité de relance après effort.",
    posture: [
      "Descente contrôlée, mains au sol largeur d'épaules",
      "Extension des jambes en arrière en position de planche",
      "Retour des pieds entre les mains",
      "Extension verticale (sans saut en version adaptée)"
    ],
    mistakes: [
      "Dos creux en position planche (risque : surcharge lombaire)",
      "Laisser tomber le bassin au sol (risque : compression discale)",
      "Se relever en arrondissant le dos (risque : lombalgie)"
    ],
    contraindications: "Hernie discale symptomatique, syndrome du canal carpien, IMC ≥ 30",
    tipCoach: "Version adaptée = supprimer le saut final et la descente au sol. Rester en planche haute.",
    tempo: "Fluide et contrôlé, sans effondrement",
    progression: "Ajouter un tuck jump en haut ou une pompe en bas",
    alternative: "Squat + recul des pieds en planche sans pompe ni saut"
  },

  // ═══════════════════════════════════════
  // EXCENTRIQUE (suite)
  // ═══════════════════════════════════════

  "good morning poids de corps": {
    name: "good morning poids de corps",
    displayName: "Good morning poids de corps",
    muscle: "Ischio-jambiers, érecteurs du rachis",
    muscleSecondary: "Fessiers, abdominaux",
    icon: "🦵",
    runningBenefit: "Renforce la chaîne postérieure pour maintenir une posture stable en fin de course.",
    posture: [
      "Pieds largeur de hanches, genoux très légèrement fléchis et fixes",
      "Mains derrière la tête ou croisées sur la poitrine",
      "Pencher le buste en avant par flexion de hanche, dos PLAT",
      "Descendre jusqu'à sentir la tension dans les ischio-jambiers"
    ],
    mistakes: [
      "Arrondir le dos (risque : contrainte discale majeure)",
      "Verrouiller les genoux en extension complète (risque : surcharge)",
      "Descendre trop bas sans contrôle (risque : perte de gainage)"
    ],
    contraindications: "Hernie discale postérieure, lumbago aigu, hyperlaxité ligamentaire",
    tipCoach: "Place un bâton le long du dos (occiput, dorsales, sacrum) pour apprendre la charnière de hanche.",
    tempo: "3s descente, 2s remontée",
    progression: "Barre sur les épaules ou version unipodale",
    alternative: "Même mouvement avec amplitude réduite, mains sur les hanches"
  },

  "deadlift roumain unipodal": {
    name: "deadlift roumain unipodal",
    displayName: "Deadlift roumain unipodal",
    muscle: "Ischio-jambiers, grand fessier",
    muscleSecondary: "Érecteurs du rachis, moyen fessier",
    icon: "🦵",
    runningBenefit: "Renforce fessiers et ischio-jambiers en appui unipodal, comme en course.",
    posture: [
      "Appui sur une jambe, genou légèrement fléchi",
      "Basculer le buste en avant, jambe libre s'allonge en arrière",
      "Ligne droite de la tête au talon arrière",
      "Hanches parallèles au sol, pas de rotation"
    ],
    mistakes: [
      "Hanche qui s'ouvre du côté de la jambe libre (risque : rotation lombaire)",
      "Dos arrondi (risque : perte de gainage)",
      "Regarder en l'air (risque : hyperextension cervicale)"
    ],
    contraindications: "Instabilité de cheville non rééduquée, vertiges positionnels",
    tipCoach: "Toucher un mur du bout des doigts pour l'équilibre les premières semaines.",
    tempo: "3s descente, 1s pause, 2s remontée",
    progression: "Ajouter un haltère ou un kettlebell",
    alternative: "Même mouvement avec un doigt posé sur un support"
  },

  "glissade talon au sol": {
    name: "glissade talon au sol",
    displayName: "Glissade talon au sol (hamstring slide)",
    muscle: "Ischio-jambiers, fessiers",
    muscleSecondary: "Abdominaux",
    icon: "🦵",
    runningBenefit: "Travaille les ischio-jambiers en course interne, calquant leur rôle en fin de phase oscillante.",
    posture: [
      "Allongé sur le dos, un talon sur une serviette ou un sac plastique",
      "Lever le bassin en pont",
      "Glisser le talon loin du corps sur 3-4 secondes",
      "Contrôler le retour sans laisser le bassin tomber"
    ],
    mistakes: [
      "Bassin qui s'affaisse pendant l'extension (risque : perte de recrutement)",
      "Crampe ischio-jambière — aller trop loin trop vite (risque : claquage)",
      "Compenser avec le bas du dos (risque : lombalgie)"
    ],
    contraindications: "Lésion aiguë des ischio-jambiers (<3 semaines), douleur sciatique irradiante",
    tipCoach: "Si crampe, réduire l'amplitude de moitié et augmenter de 2 cm par séance.",
    tempo: "2s extension, 2s retour, contrôle permanent",
    progression: "Version unipodale ou ajout d'un pont fessier maintenu",
    alternative: "Pont fessier classique, pieds au sol"
  },

  // ═══════════════════════════════════════
  // MOBILITÉ / PROPRIOCEPTION (suite)
  // ═══════════════════════════════════════

  "equilibre sur coussin instable": {
    name: "equilibre sur coussin instable",
    displayName: "Équilibre sur coussin instable",
    muscle: "Stabilisateurs de cheville, tibial postérieur",
    muscleSecondary: "Moyen fessier, abdominaux",
    icon: "🧘",
    runningBenefit: "Entraîne les réflexes posturaux pour les terrains irréguliers.",
    posture: [
      "Pied nu centré sur le coussin",
      "Genou légèrement fléchi, jamais verrouillé",
      "Regard fixé sur un point au mur à hauteur des yeux",
      "Bras libres pour l'équilibre puis le long du corps"
    ],
    mistakes: [
      "Genou verrouillé en hyperextension (risque : instabilité paradoxale)",
      "Regard au sol (risque : supprime la difficulté vestibulaire)",
      "Orteils en griffe (risque : crispation, fatigue prématurée)"
    ],
    contraindications: "Entorse de cheville <3 semaines, fracture du pied non consolidée",
    tipCoach: "Progresser yeux fermés seulement quand 60s yeux ouverts est stable.",
    tempo: "Maintien 30-45s, puis ajouter du mouvement",
    progression: "Yeux fermés ou ajout de squats sur le coussin",
    alternative: "Serviette pliée au sol en guise de surface instable"
  },

  "ecriture alphabet avec le pied": {
    name: "ecriture alphabet avec le pied",
    displayName: "Écriture alphabet avec le pied",
    muscle: "Tibial antérieur, péroniers",
    muscleSecondary: "Mollets, extenseurs des orteils",
    icon: "🧘",
    runningBenefit: "Mobilise toutes les amplitudes articulaires de la cheville pour prévenir les raideurs.",
    posture: [
      "Assis ou allongé, cheville dans le vide sans appui",
      "Dessiner chaque lettre lentement avec le gros orteil",
      "Mouvement initié par la cheville, pas par le genou",
      "Amplitude maximale dans toutes les directions"
    ],
    mistakes: [
      "Bouger tout le tibia au lieu de la cheville (risque : pas de gain de mobilité)",
      "Aller trop vite (risque : perte de contrôle)",
      "Négliger les lettres en inversion — S, Z (risque : travail incomplet)"
    ],
    contraindications: "Fracture malléolaire récente non consolidée, arthrodèse de cheville",
    tipCoach: "Idéal en post-entorse après J21. Alphabet complet matin et soir.",
    tempo: "Lent et appliqué, lettres amples",
    progression: "Avec élastique de résistance autour du pied",
    alternative: "Cercles simples de cheville (10 dans chaque sens)"
  },

  "etirements dynamiques": {
    name: "etirements dynamiques",
    displayName: "Étirements dynamiques",
    muscle: "Variable selon la zone ciblée",
    muscleSecondary: "Chaîne musculaire complète",
    icon: "🧘",
    runningBenefit: "Prépare muscles et tendons à l'effort sans diminuer la performance (contrairement au statique pré-course).",
    posture: [
      "Mouvements amples et contrôlés, sans à-coup",
      "Progression d'amplitude sur 8-10 répétitions",
      "Respiration fluide, jamais en apnée",
      "Couvrir toutes les directions articulaires de la zone ciblée"
    ],
    mistakes: [
      "Mouvements balistiques avec rebond (risque : micro-lésion musculaire)",
      "Étirer à froid sans échauffement préalable (risque : claquage)",
      "Confondre dynamique et balistique (risque : blessure)"
    ],
    contraindications: "Lésion musculaire <15 jours, hyperlaxité constitutionnelle",
    tipCoach: "Placer dans l'échauffement, jamais en récupération (préférer le statique après).",
    tempo: "Mouvements fluides, amplitude croissante",
    progression: "Augmenter l'amplitude et la vitesse progressivement",
    alternative: "Réduire l'amplitude et maintenir un tempo lent"
  },

  "mobilite hanche": {
    name: "mobilite hanche",
    displayName: "Mobilité hanche (cercles)",
    muscle: "Fléchisseurs de hanche, rotateurs profonds",
    muscleSecondary: "Moyen fessier, adducteurs",
    icon: "🧘",
    runningBenefit: "Libère l'amplitude de hanche pour allonger la foulée sans compensation lombaire.",
    posture: [
      "En appui unipodal ou à quatre pattes",
      "Genou fléchi à 90°, dessiner des cercles avec le genou",
      "Bassin stable, le mouvement vient de la hanche uniquement",
      "Cercles dans les deux sens, amplitude progressive"
    ],
    mistakes: [
      "Compenser avec le bas du dos — rotation lombaire (risque : lombalgie)",
      "Cercles trop petits (risque : aucun gain articulaire)",
      "Négliger un sens de rotation (risque : déséquilibre)"
    ],
    contraindications: "Conflit fémoro-acétabulaire (FAI) avec douleur, prothèse de hanche récente",
    tipCoach: "Cercles lents et amples, 10 par sens et par côté.",
    tempo: "Cercles lents et amples",
    progression: "En appui unipodal sans support ou avec élastique",
    alternative: "Assis sur une chaise, cercles de genou réduits"
  },

  "chat-vache": {
    name: "chat-vache",
    displayName: "Chat-vache (mobilité dos)",
    muscle: "Érecteurs du rachis, abdominaux",
    muscleSecondary: "Multifides, diaphragme",
    icon: "🧘",
    runningBenefit: "Restaure la mobilité rachidienne pour permettre la rotation du tronc en course.",
    posture: [
      "À quatre pattes, mains sous les épaules, genoux sous les hanches",
      "Chat : arrondir le dos vertèbre par vertèbre, rentrer le menton",
      "Vache : creuser le dos, relever la tête, ouvrir la poitrine",
      "Mouvement lent et fluide, synchronisé avec la respiration"
    ],
    mistakes: [
      "Mouvement trop rapide sans contrôle segmentaire (risque : à-coup vertébral)",
      "Forcer en extension cervicale (risque : comprimer les cervicales)",
      "Négliger la respiration (risque : perte du bénéfice de mobilité)"
    ],
    contraindications: "Spondylolisthésis symptomatique en extension, hernie discale cervicale aiguë",
    tipCoach: "Inspirer sur la vache, expirer sur le chat. 10 cycles minimum pour un effet réel.",
    tempo: "3s par position, respiration synchronisée",
    progression: "Ajouter une extension de bras/jambe opposés (bird-dog)",
    alternative: "Même mouvement assis sur une chaise"
  },

  "fente rotation tronc": {
    name: "fente rotation tronc",
    displayName: "Fente + rotation tronc",
    muscle: "Obliques, quadriceps, fessiers",
    muscleSecondary: "Abdominaux, adducteurs",
    icon: "🧘",
    runningBenefit: "Travaille la dissociation haut/bas du corps présente à chaque foulée.",
    posture: [
      "Position de fente avant stable, genou avant à 90°",
      "Rotation du tronc vers le côté du genou avant",
      "Bras tendus devant ou mains jointes pour guider la rotation",
      "Bassin fixe face à l'avant, seul le tronc tourne"
    ],
    mistakes: [
      "Genou avant qui part en valgus pendant la rotation (risque : ligaments)",
      "Bassin qui tourne avec le tronc — pas de dissociation (risque : travail inefficace)",
      "Rotation forcée avec élan (risque : lombalgie)"
    ],
    contraindications: "Hernie discale en phase aiguë, douleur sacro-iliaque en rotation",
    tipCoach: "Exercice clé pour la dissociation bassin-tronc du coureur. Le placer dans l'échauffement.",
    tempo: "2s descente, rotation contrôlée, 2s remontée",
    progression: "Ajouter un médecine-ball ou un élastique en résistance",
    alternative: "Fente statique avec rotation sans descente profonde"
  },

  "etirement psoas": {
    name: "etirement psoas",
    displayName: "Étirement psoas (fente basse)",
    muscle: "Psoas-iliaque, droit fémoral",
    muscleSecondary: "Quadriceps, abdominaux",
    icon: "🧘",
    runningBenefit: "Compense la rétraction du psoas due à la position assise, améliorant l'extension de hanche.",
    posture: [
      "Genou arrière au sol sur un coussin",
      "Genou avant à 90°, au-dessus de la cheville",
      "Serrer les fessiers du côté arrière pour verrouiller le bassin en rétroversion",
      "Avancer doucement le bassin sans cambrer le dos"
    ],
    mistakes: [
      "Cambrer le dos au lieu de pousser le bassin en avant (risque : le psoas n'est pas étiré)",
      "Genou avant qui dépasse les orteils (risque : surcharge rotulienne)",
      "Oublier la contraction du fessier (risque : étirement inefficace)"
    ],
    contraindications: "Bursite pré-rotulienne, prothèse de genou récente",
    tipCoach: "Sans rétroversion du bassin, cet étirement est inefficace. Contracter le fessier est LA clé.",
    tempo: "Maintien 30-45s, enfoncement progressif",
    progression: "Lever le bras du même côté et incliner le tronc latéralement",
    alternative: "Même position avec le genou arrière sur un coussin épais"
  },

  "etirement bandelette it": {
    name: "etirement bandelette it",
    displayName: "Étirement bandelette IT (rouleau)",
    muscle: "Tenseur du fascia lata, bandelette ilio-tibiale",
    muscleSecondary: "Vaste latéral",
    icon: "🧘",
    runningBenefit: "Réduit les tensions latérales du genou fréquentes chez les coureurs (syndrome de l'essuie-glace).",
    posture: [
      "Allongé sur le côté, rouleau sous la face externe de la cuisse",
      "Bras et jambe supérieure en appui pour doser la pression",
      "Rouler lentement du genou à la hanche",
      "Insister 20 secondes sur les points sensibles"
    ],
    mistakes: [
      "Rouler sur la face externe du genou (risque : bourse séreuse)",
      "Pression excessive d'emblée (risque : ecchymose, douleur)",
      "Passer trop rapidement sans pause (risque : inefficace)"
    ],
    contraindications: "Prise d'anticoagulants, phlébite, lésion cutanée sur la zone",
    tipCoach: "Si trop douloureux, commencer avec une bouteille d'eau au lieu du rouleau dur.",
    tempo: "Rouleaux lents, 30s par zone sensible",
    progression: "Utiliser un rouleau à picots ou une balle de cross",
    alternative: "Étirement debout en croisant les jambes, inclinaison latérale"
  },

  // ═══════════════════════════════════════
  // COMPLÉMENTAIRES
  // ═══════════════════════════════════════

  "dips sur banc": {
    name: "dips sur banc",
    displayName: "Dips sur banc",
    muscle: "Triceps, deltoïde antérieur",
    muscleSecondary: "Pectoraux, abdominaux",
    icon: "💪",
    runningBenefit: "Renforce les bras et épaules pour le balancier actif, surtout en côte et au sprint.",
    posture: [
      "Mains sur le bord du banc, doigts vers l'avant",
      "Fesses proches du banc, jambes fléchies (plus facile) ou tendues",
      "Descendre en pliant les coudes à 90° maximum",
      "Coudes serrés, dirigés vers l'arrière"
    ],
    mistakes: [
      "Descendre trop bas (risque : stress capsulaire antérieur de l'épaule)",
      "Coudes qui s'écartent (risque : surcharge acromio-claviculaire)",
      "Épaules qui montent vers les oreilles (risque : tension cervicale)"
    ],
    contraindications: "Instabilité antérieure d'épaule, tendinopathie du long biceps",
    tipCoach: "Limiter l'amplitude à 90° de flexion du coude. Ne jamais forcer en bas du mouvement.",
    tempo: "2s descente, 1s remontée",
    progression: "Jambes tendues ou pieds surélevés",
    alternative: "Mains sur le banc, pieds proches, amplitude réduite"
  },

  "tirage elastique horizontal": {
    name: "tirage elastique horizontal",
    displayName: "Tirage élastique horizontal",
    muscle: "Rhomboïdes, trapèzes moyens",
    muscleSecondary: "Deltoïde postérieur, biceps",
    icon: "💪",
    runningBenefit: "Corrige la posture en renforçant le haut du dos, évitant l'affaissement en fin de course.",
    posture: [
      "Élastique fixé à hauteur de poitrine",
      "Pieds largeur de hanches, genoux légèrement fléchis",
      "Tirer les coudes vers l'arrière en serrant les omoplates",
      "Contrôler le retour sur 3 secondes"
    ],
    mistakes: [
      "Tirer avec les bras sans engager les omoplates (risque : surcharge deltoïde)",
      "Se pencher en arrière pour tricher (risque : lombalgie)",
      "Lâcher l'élastique d'un coup (risque : perte excentrique)"
    ],
    contraindications: "Conflit sous-acromial en phase inflammatoire, capsulite rétractile",
    tipCoach: "Imagine écraser un crayon entre les omoplates à chaque traction. C'est le repère clé.",
    tempo: "2s tirage, 1s contraction, 3s retour",
    progression: "Élastique plus résistant ou tirage unibras",
    alternative: "Élastique léger, amplitude partielle"
  },

  "planche tirage": {
    name: "planche tirage",
    displayName: "Planche + tirage (plank row)",
    muscle: "Abdominaux (transverse, obliques), grand dorsal",
    muscleSecondary: "Érecteurs, deltoïde postérieur",
    icon: "💪",
    runningBenefit: "Combine gainage anti-rotation et renforcement dos, simulant la stabilité requise en course.",
    posture: [
      "Position de planche haute, mains sur des haltères ou au sol",
      "Pieds écartés plus large que les hanches pour la stabilité",
      "Tirer un coude vers le plafond en gardant les hanches immobiles",
      "Alterner les bras, tempo lent"
    ],
    mistakes: [
      "Rotation du bassin à chaque tirage (risque : perte totale du bénéfice anti-rotation)",
      "S'affaisser au niveau des lombaires (risque : compression discale)",
      "Tourner les épaules au lieu de verrouiller (risque : travail inefficace)"
    ],
    contraindications: "Douleur lombaire en charge, syndrome du canal carpien, tendinopathie du poignet",
    tipCoach: "Si le bassin tourne, élargir les pieds ou retirer le tirage et travailler la planche seule.",
    tempo: "Tirage 2s, maintien 1s, retour 2s, hanche immobile",
    progression: "Pieds rapprochés ou élastique plus fort",
    alternative: "Planche sur genoux avec tirage léger"
  },

  "gainage ventral long": {
    name: "gainage ventral long",
    displayName: "Gainage ventral long",
    muscle: "Transverse, grand droit abdominal",
    muscleSecondary: "Obliques, lombaires, épaules, fessiers",
    icon: "💪",
    runningBenefit: "Développe l'endurance du gainage pour maintenir la posture sur des courses longues.",
    posture: [
      "Même position que la planche classique",
      "Maintien prolongé (90-120s)",
      "Respiration calme et régulière, pas d'apnée",
      "Contracter les fessiers pour protéger le bas du dos"
    ],
    mistakes: [
      "Hanches qui s'affaissent progressivement (risque : lombalgie)",
      "Retenir sa respiration (risque : pic de tension)",
      "Tête relevée (risque : compression cervicale)"
    ],
    tipCoach: "Si la posture se dégrade avant la fin du temps, arrête. La qualité prime sur la durée.",
    tempo: "Maintien 90-120s, respiration libre",
    progression: "Ajouter des micro-mouvements (lever un pied, toucher l'épaule)",
    alternative: "Planche classique 30-60s avec parfaite exécution"
  },

  "bird-dog avec rotation": {
    name: "bird-dog avec rotation",
    displayName: "Bird-dog avec rotation",
    muscle: "Multifides, obliques",
    muscleSecondary: "Grand fessier, transverse, deltoïdes",
    icon: "💪",
    runningBenefit: "Ajoute la composante rotationnelle du tronc présente dans la foulée de course.",
    posture: [
      "Position bird-dog classique (quatre pattes, bras-jambe opposés)",
      "En haut du mouvement, tourner le tronc vers le côté du bras levé",
      "Maintenir 2s en rotation, revenir à la position alignée",
      "Bassin stable malgré la rotation"
    ],
    mistakes: [
      "Tourner le bassin avec le tronc (risque : perte de gainage)",
      "Amplitude de rotation excessive (risque : torsion lombaire)",
      "Perdre l'alignement bras-tronc-jambe (risque : travail inefficace)"
    ],
    tipCoach: "Maîtrise d'abord le bird-dog classique 3×10 avant d'ajouter la rotation.",
    tempo: "2s extension, 2s rotation, 2s retour",
    progression: "Depuis une position de planche complète",
    alternative: "Bird-dog classique sans rotation"
  },

  "planche rotation laterale": {
    name: "planche rotation laterale",
    displayName: "Planche + rotation latérale",
    muscle: "Obliques, transverse",
    muscleSecondary: "Deltoïdes, abdominaux, moyen fessier",
    icon: "💪",
    runningBenefit: "Renforce la stabilité anti-rotation essentielle pour garder le tronc stable en course.",
    posture: [
      "Position planche haute, bras tendus",
      "Pivoter en planche latérale, un bras vers le plafond",
      "Revenir en planche face au sol, alterner",
      "Pieds écartés pour la stabilité"
    ],
    mistakes: [
      "Vitesse excessive (risque : perte d'alignement, chute)",
      "Bras d'appui fléchi (risque : chute, douleur poignet)",
      "Hanches qui s'affaissent pendant la transition (risque : lombalgie)"
    ],
    contraindications: "Instabilité d'épaule, tendinopathie du poignet",
    tipCoach: "Maîtriser 30s de planche + 30s de gainage latéral de chaque côté avant de combiner.",
    tempo: "2s par rotation, mouvement contrôlé",
    progression: "Ajouter un temps de maintien 3s en position latérale",
    alternative: "Faire la transition depuis les genoux"
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
