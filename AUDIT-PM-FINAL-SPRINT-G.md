# AUDIT PM UX FINAL — Sprint G (auto-match Strava + correction)

Date : 2026-05-27
Auteur : PM senior produit running 10 ans (audit UX final)
Référence amont : [`PM-CHALLENGE-UX-STRAVA-2-BOUTONS.md`](./PM-CHALLENGE-UX-STRAVA-2-BOUTONS.md)
Scope : valider le NOUVEAU flow (auto-match conservé + fallback explicite "pas la bonne ?") simplifié par Romane.

---

## VERDICT GLOBAL — GO sous 4 conditions

**GO** sur le flow simplifié. Plus malin que le 2-boutons : zéro friction sur le cas 95% auto-match, fallback explicite seulement pour les 5% Arnaud. Les 3 conditions techniques amont (cache, index, `source` flag) **restent strictement les mêmes** [[feedback_securite_avant_conversion]]. J'ajoute 1 condition UX : **le lien correction doit être visuellement DISCRET mais TAP-accessible** (44pt sans crier).

---

## 1. WORDING — Tableau décisionnel

### 1.1 Bouton primaire post auto-match

| Option | Verdict | Justification |
|---|---|---|
| "Valider cette activité" | OK mais tiède | Correct, neutre |
| **"Oui, c'était bien ça"** | RECOMMANDÉ | Ton coach humain, copie Runna/Strava confirm. Crée l'engagement émotionnel |
| "C'est bien ça" | Alt acceptable | Plus court, ton sec |
| "Je valide" | NON | Trop bureaucratique, brise le ton coach |

**Reco finale : "Oui, c'était bien ça"** (ou "C'est bien ça" si Romane préfère plus court).

### 1.2 Lien correction (sous-bouton)

| Option | Emoji | Verdict |
|---|---|---|
| "❌ Ce n'est pas la bonne activité ?" | ❌ | NON — ❌ trop violent, dramatise un fix mineur |
| "Ce n'est pas la bonne activité ?" | aucun | OK neutre, mais peu visible |
| **"Pas la bonne séance ?"** | aucun, souligné gris | **RECOMMANDÉ** — court, neutre, mobile-friendly |
| "🔄 Changer d'activité" | 🔄 | Alt acceptable, ton fonctionnel |
| "Mauvaise activité détectée" | aucun | NON — accuse l'app, casse la confiance |

**Reco finale : "Pas la bonne séance ?"** — texte gris discret 13-14pt, souligné, padding tap ≥44pt (cf. section 3). Pas d'emoji. [[feedback_compromis_messages_preventifs]] (messages préventifs ≠ messages dramatisants).

### 1.3 Modal "correction / pas de match" — titre + sous-titre

| Élément | Reco |
|---|---|
| Titre | **"Comment as-tu fait cette séance ?"** |
| Sous-titre | "Choisis l'option qui correspond le mieux" |

Évite : "Aucune activité trouvée" (négatif, blame Strava), "Que s'est-il passé ?" (anxiogène).

### 1.4 Les 3 options du modal

| # | Titre | Sous-titre 1 ligne | Emoji | Verdict |
|---|---|---|---|---|
| a | **"Choisir dans mes activités Strava"** | "Tes 7 derniers jours, type course uniquement" | 🔍 OK / activité icône mieux | RECOMMANDÉ |
| b | **"Je l'ai faite sans Strava"** | "Saisie manuelle (RPE + ressenti)" | ✅ OK | RECOMMANDÉ |
| c | **"Finalement je ne l'ai pas faite"** | "Marquer comme non faite (optionnel : pourquoi)" | — pas d'emoji | RECOMMANDÉ |

**Notes wording :**
- (a) NE PAS dire "Voir mes activités" → "Choisir" est actif/engageant.
- (b) NE PAS dire "hors Strava" (jargon). "Sans Strava" est plus clair.
- (c) "Finalement je ne l'ai pas faite" > "En fait je ne l'ai pas faite" → ton plus assumé, moins défensif. **Pas d'emoji ❌** sur (c) : on ne stigmatise pas le skip. [[feedback_securite_avant_conversion]] : un user qui skip honnêtement est PRÉCIEUX, on le récompense par un ton neutre.

### 1.5 Tooltip activité grisée

| Option | Verdict |
|---|---|
| "Déjà rattachée à la séance [Type] du [DD/MM]" | OK basique |
| **"Déjà utilisée pour ta [Type] du [DD/MM]"** | RECOMMANDÉ — "ta" = personnel, "utilisée" plus naturel que "rattachée" |
| "Cette activité est déjà liée à une autre séance" | NON — trop long, pas de contexte |

**Reco finale : "Déjà utilisée pour ta [Type] du [DD/MM]"**. Toujours afficher type + date pour permettre au user de comprendre/contester.

### 1.6 Confirm "Je ne l'ai pas faite"

**Reco : PAS de confirm modal séparé.** Un confirm sur skip = friction qui pousse à mentir [[feedback_securite_avant_conversion]]. Le user qui clique (c) sait ce qu'il fait.

**Raison = OPTIONNELLE** (pas obligatoire). Format : chips/pills cliquables (1 tap), texte libre désactivé pour Sprint G.

| Chips proposés | Action data |
|---|---|
| "Douleur / blessure" | flag douleur → Gemini = allègement S+1 |
| "Fatigue" | flag fatigue → Gemini = pas durcir |
| "Manque de temps" | neutre |
| "Météo" | neutre |
| "Autre" | neutre |
| "Je préfère ne pas dire" | neutre |

CTA validation : **"C'est noté"** (warm, non-jugeant). Évite "Confirmer" (bureaucratique) ou "Skip" (anglicisme + dur).

---

## 2. ORDRE DES 3 OPTIONS

**Ordre proposé : (a) Strava → (b) Manual → (c) Pas fait.**

| Ordre | Justification |
|---|---|
| **GARDÉ** | a = chemin happy path (90% cas qui arrivent ici : auto-match foiré mais activité existe). On met le chemin majoritaire en premier. b = secours plausible. c = exception. **Ne PAS commencer par (c) "Je ne l'ai pas faite"** car ça suggère/induit le skip. |

**Edge** : si Strava DÉCONNECTÉ → (a) disparaît, l'ordre devient (b) → (c). Pas de réorg supplémentaire.

---

## 3. TAP TARGETS ≥ 44pt

| Élément | Risque | Solution |
|---|---|---|
| Bouton "Oui, c'était bien ça" | Aucun | Bouton primary plein, 48pt natif |
| **Lien "Pas la bonne séance ?"** | **CRITIQUE** | Texte 13pt MAIS zone cliquable padding `py-3 px-4` (~48pt). Visuellement discret (gris souligné), tap-area généreuse. **Pattern Apple HIG : touch ≥ visual.** |
| Options modal (a/b/c) | Modéré | Cards full-width, min-height 64pt, icône à gauche, titre + sous-titre |
| Activité Strava grisée | Modéré | Garder tap-area (pour voir tooltip) mais `opacity-50` + `cursor-not-allowed`. Sur mobile, tap déclenche un toast tooltip 2s |
| Chips raison skip | Aucun | Pills `py-2 px-4` (~40pt) avec margin pour tap discrimination |

---

## 4. CAS EDGE UX

### 4.1 Strava DÉCONNECTÉ

**Reco : option (a) MASQUÉE, pas de CTA "Connecter Strava" dans ce modal.** Le modal est un fix urgent (user veut marquer sa séance), pas le moment de pousser un onboarding Strava. Le user a 2 options propres : (b) manual ou (c) pas fait. Le CTA "Connecter Strava" reste dans Settings (zone dédiée).

[[feedback_compromis_messages_preventifs]] : pas de blocage, pas de pop-up commercial intrusif.

### 4.2 Strava CONNECTÉ mais 0 activité 7j

**Reco** : option (a) reste affichée mais click ouvre vue vide avec message :
> "Aucune course trouvée dans tes 7 derniers jours Strava. Tu peux saisir manuellement ou marquer non faite."

Boutons retour vers (b) ou (c). Ne PAS afficher "Vérifie ta connexion Strava" (anxiogène, le pb est ailleurs 95% du temps).

### 4.3 Strava `private=true` / `manual=true`

**Reco confirmée : INCLURE `manual=true`** (cf. PM précédent Q4). Si le user a saisi à la main sur Strava (montre HS), c'est légitime. `private=true` n'apparaît dans l'API que si scope OAuth `activity:read_all`, sinon Strava filtre côté serveur. Vérifier scope actuel dans `StravaConnect.tsx`.

Badge UI sur la card activité : "✏️ Saisie manuelle Strava" (gris discret) si `manual=true`. Pas de discrimination.

### 4.4 Séance dans le passé > 7j

**Reco : ÉTENDRE fenêtre à 14j SI séance planifiée date > 7j.** Dynamique :
- Séance planifiée ≤ 7j → fenêtre 7j (cas standard).
- Séance planifiée 8-14j → fenêtre 14j.
- Séance planifiée > 14j → fenêtre 14j max + message "Si ta course était il y a plus de 14j, saisis manuellement (option b)."

Évite l'explosion rate-limit tout en couvrant le cas Arnaud étendu.

### 4.5 Multi-plans actifs — grisage plan courant uniquement

**Confirmé : OK doctrine.** Romane a tranché compromis pragmatique. [[feedback_compromis_messages_preventifs]] (pragmatisme). À documenter dans le code (commentaire `// Grisage limité au plan courant — décision Romane Sprint G`). Risque résiduel : user a 2 plans en parallèle (rare) et rattache la même activité 2× → analytics légèrement bruitées, **pas un risque sécurité**.

---

## 5. DOCTRINE SÉCURITÉ — `not_done`

### 5.1 Raison skip = OPTIONNELLE + flag douleur → Gemini

**Reco** : 
- Raison **optionnelle** (skip-friendly, on ne force pas).
- Si raison = "Douleur / blessure" → **flag dans `adaptationContext`** Gemini S+1 : `"⚠️ User a skip une séance pour DOULEUR. Allégement obligatoire S+1 : -20% volume + footings doux uniquement. Pas d'intensité."` [[feedback_securite_avant_conversion]].
- Si raison = "Fatigue" → flag plus doux : `"User a skip pour fatigue. Ne PAS durcir S+1, maintenir charge."`
- Autres raisons → pas d'injection particulière.

**Validation doctrine** : conforme [[feedback_securite_avant_conversion]] (la sécurité prime). Conforme [[feedback_compromis_messages_preventifs]] (prévention via prompt, pas blocage UI).

### 5.2 `source: 'not_done'` → PAS d'injection complétion dans Gemini

**Confirmé.** Le mapping est crucial :
- `'not_done'` → **PAS** d'entrée dans `adaptationContext` côté "séances faites". Compte SÉPARÉ : "séances skip + raison".
- N'incrémente PAS le compteur "compliance" affiché user. La compliance affichée doit être TRANSPARENTE [[feedback_securite_avant_conversion]].

---

## 6. DOCTRINE `feedback_jamais_contact_client`

### 6.1 Vérification : aucune comm directe déclenchée

| Action user | Notif/email auto ? | Verdict |
|---|---|---|
| Clic "Oui, c'était bien ça" | Aucune | OK [[feedback_jamais_contact_client]] |
| Clic "Pas la bonne séance ?" | Aucune | OK |
| Validation option (a/b/c) | Aucune | OK |
| Skip avec raison "douleur" | **À VÉRIFIER** | Si Romane reçoit un mail interne (admin), c'est OK. Si user reçoit un message "Prends soin de toi", c'est NON. Reco : **admin-only log dans backoffice Romane** |

**MUST-DO avant code** : confirmer que le flag douleur déclenche un **alert admin** (Romane), pas un message user automatique. [[feedback_jamais_contact_client]].

### 6.2 Template Arnaud — recopier

Le template du PM précédent (Section 2 Q7) reste valide pour Arnaud J0. **Ajout léger recommandé** post-Sprint G :

```
[ajouter en fin de mail Arnaud]
Mise à jour : on a déployé la fonctionnalité. Si l'app ne détecte pas la bonne 
activité Strava (rare), tu verras un petit lien "Pas la bonne séance ?" sous 
l'activité proposée. Il ouvre une liste de tes courses Strava 7j pour que tu 
choisisses la bonne. Si tu n'as pas trace Strava, tu peux aussi marquer 
manuellement.
```

Romane envoie, pas moi. [[feedback_jamais_contact_client]].

---

## 7. RISQUE DÉGRADATION CAS 95% — Le lien "pas la bonne" introduit-il du doute ?

**Risque réel : MODÉRÉ.** Un lien visible sous chaque auto-match peut :
- Faire douter le user qui s'apprêtait à valider ("attends, est-ce vraiment la bonne ?").
- Augmenter le taux de clic curiosité → ouverture modal inutile → friction.

**Mitigation UX** :
1. **Hiérarchie visuelle forte** : bouton primaire "Oui, c'était bien ça" = bouton plein vif. Lien correction = texte 13pt gris souligné sous le bouton, **PAS** un 2e bouton. Ratio visuel ~1:5 en faveur du primaire.
2. **Position** : sous le bouton primaire, pas à côté. Le user lit haut-bas, voit le primaire en premier.
3. **Pas d'emoji** sur le lien (cf. 1.2) : évite d'attirer l'œil.
4. **Tracking** : Sprint G+1, mesurer % clics sur le lien correction. Si > 15%, c'est trop intrusif, on planque dans un menu "⋯".

---

## 8. A/B TEST — Vaut le coup ?

**Reco : NON, GO FULL DIRECT.**

| Pour A/B | Contre A/B |
|---|---|
| Mesure friction exacte | Volume Premium actuel < 500 actifs → puissance stat faible (besoin 4-6 semaines de données) |
| Détecte régression conversion | Bug Arnaud est concret et urgent, A/B = retarde fix 5% users |
| | Complexité technique (feature flag) → +1j dev |
| | [[feedback_compromis_messages_preventifs]] : on préfère ship + monitor que A/B sur petit volume |

**Reco** : déployer 100% + **tracker 3 métriques** sur 14j :
1. Taux clic "Pas la bonne séance ?" (cible : < 15%).
2. Taux usage option (a) après clic (cible : > 60% — sinon l'auto-match est mauvais).
3. Taux skip option (c) (baseline à établir).

Si métrique 1 > 15% → itérer wording/visibilité Sprint H.

---

## 9. VERDICT FINAL + MUST-DO

### Verdict
**GO Sprint G** sur le flow simplifié (auto-match conservé + fallback explicite). Approche bien plus saine que le 2-boutons initial : zéro friction cas 95%, fallback propre cas 5%.

### MUST-DO avant code (8 items)

1. **Wording finalisé** (cf. tableaux section 1) :
   - Primary : "Oui, c'était bien ça"
   - Correction link : "Pas la bonne séance ?" (gris souligné, pas d'emoji)
   - Modal title : "Comment as-tu fait cette séance ?"
   - Option (a) : "Choisir dans mes activités Strava"
   - Option (b) : "Je l'ai faite sans Strava"
   - Option (c) : "Finalement je ne l'ai pas faite" (pas d'emoji ❌)
   - Tooltip grisé : "Déjà utilisée pour ta [Type] du [DD/MM]"
   - Skip CTA : "C'est noté"
2. **3 conditions tech amont confirmées** (cache 5min, index inverse plan courant, `source` flag étendu).
3. **`SessionFeedback.source` étendu** : `'strava_auto_matched' | 'strava_user_corrected' | 'manual_no_strava' | 'not_done'`.
4. **`'not_done'` exclu de `adaptationContext` complétion** (côté séances faites). [[feedback_securite_avant_conversion]].
5. **Flag "douleur" → injection prompt Gemini S+1** (allègement -20%). Doctrine sécurité.
6. **Fenêtre dynamique 7j → 14j** si séance planifiée > 7j (cas Arnaud étendu).
7. **Tap-area lien correction ≥ 44pt** (visuel 13pt + padding `py-3 px-4`).
8. **Vérif aucune notif/email user auto** déclenchée (admin-only alerts OK). [[feedback_jamais_contact_client]].

### Tracking post-déploiement
- % clic correction link (alerte si > 15%)
- % usage option (a) vs (b) vs (c)
- % skip avec raison "douleur" (alerte Romane si > baseline)
- 0 mention poids/IMC/minceur dans tout wording final (audit visuel) [[feedback_jamais_poids_minceur]]

---

**Chemin absolu** : `/Users/romanemarino/Coach-Running-IA/AUDIT-PM-FINAL-SPRINT-G.md`
**Verdict 1-ligne** : GO Sprint G sur flow simplifié, 4 conditions (3 tech amont + tap-area lien), wording chirurgical à appliquer.
**3 corrections wording critiques** :
1. Remplacer "❌ Ce n'est pas la bonne activité ?" → **"Pas la bonne séance ?"** (gris discret, sans emoji)
2. Remplacer "Valider cette activité" → **"Oui, c'était bien ça"** (ton coach humain)
3. Remplacer "En fait je ne l'ai pas faite" + emoji ❌ → **"Finalement je ne l'ai pas faite"** sans emoji (ne pas stigmatiser le skip honnête, doctrine sécurité)
