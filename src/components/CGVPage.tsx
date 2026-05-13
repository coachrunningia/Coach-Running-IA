import React from 'react';
import { Helmet } from "react-helmet-async";
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Shield, Mail } from 'lucide-react';

const CGVPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>CGV | Coach Running IA</title>
        <meta name="description" content="Conditions générales de vente de Coach Running IA. Abonnements, paiements, résiliation et garanties." />
        <link rel="canonical" href="https://coachrunningia.fr/cgv" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8">
          <ArrowLeft size={18} />
          Retour à l'accueil
        </Link>

        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-8">
          Conditions Générales de Vente et d'Utilisation
        </h1>

        <p className="text-slate-500 mb-8">
          Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Avertissement médical */}
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-10">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-1" size={28} />
            <div>
              <h2 className="text-xl font-bold text-red-700 mb-3">⚠️ AVERTISSEMENT MÉDICAL IMPORTANT</h2>
              <p className="text-red-700 font-medium mb-4">
                Les programmes d'entraînement générés par Coach Running IA sont des <strong>suggestions indicatives</strong> et ne remplacent en aucun cas l'avis d'un professionnel de santé.
              </p>
              <ul className="text-red-700 space-y-2">
                <li>• <strong>Consultez obligatoirement un médecin</strong> avant de commencer tout programme.</li>
                <li>• <strong>Obtenez un certificat médical</strong> d'aptitude à la course à pied.</li>
                <li>• <strong>Arrêtez immédiatement</strong> en cas de douleur ou symptôme inhabituel.</li>
                <li>• <strong>L'avis médical prévaut TOUJOURS</strong> sur les recommandations de l'application.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="prose prose-slate max-w-none">
          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 1 - Objet</h2>
          <p>Les présentes CGV/CGU régissent l'utilisation du service Coach Running IA accessible via coachrunningia.fr. Le Service propose des plans d'entraînement de course à pied générés par intelligence artificielle. Ces plans sont fournis à titre informatif et éducatif uniquement.</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 2 - Éditeur et hébergeurs</h2>
          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">2.1 Éditeur</h3>
          <p>
            Le service Coach Running IA est édité par :<br/>
            <strong>SASU Marino Digital</strong>, société par actions simplifiée unipersonnelle au capital de 1 €<br/>
            Immatriculée au RCS de Lyon sous le numéro <strong>989 859 616</strong> (inscription du 1<sup>er</sup> août 2025)<br/>
            SIRET : <strong>989 859 616 00017</strong><br/>
            N° TVA intracommunautaire : <strong>FR05989859616</strong><br/>
            Directrice de la publication : Romane Marino, Présidente<br/>
            Contact : <a href="mailto:programme@coachrunningia.fr" className="text-accent">programme@coachrunningia.fr</a>
          </p>
          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">2.2 Hébergeurs</h3>
          <p>
            <strong>Frontend (interface web)</strong> : Firebase Hosting — Google Ireland Limited, Gordon House, 4 Barrow Street, Dublin 4, D04E5W5, Irlande.<br/>
            <strong>Backend (API et traitements)</strong> : Google Cloud Run — Google Ireland Limited, même adresse.<br/>
            <strong>Nom de domaine</strong> : enregistré auprès de IONOS SARL, 7 place de la Gare, BP 70109, 57201 Sarreguemines Cedex, France.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 3 - Acceptation</h2>
          <p>En utilisant le Service, l'utilisateur déclare :</p>
          <ul>
            <li>Être majeur ou disposer de l'autorisation d'un représentant légal</li>
            <li>Être en bonne santé et apte à pratiquer la course à pied</li>
            <li>Avoir consulté un médecin avant de débuter un programme</li>
            <li>Comprendre que les plans sont des suggestions, non des prescriptions médicales</li>
          </ul>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 my-8">
            <h3 className="text-lg font-bold text-amber-800 mb-3 flex items-center gap-2">
              <Shield size={20} />
              Limitation de responsabilité essentielle
            </h3>
            <p className="text-amber-800 mb-0">
              <strong>Coach Running IA ne pourra en aucun cas être tenu responsable</strong> des blessures, accidents, problèmes de santé ou tout autre préjudice résultant de l'utilisation des plans d'entraînement. L'utilisateur pratique sous sa propre responsabilité.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 4 - Nature du Service</h2>
          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">4.1 Nature informative</h3>
          <p>Les plans générés par IA constituent des <strong>suggestions à titre indicatif</strong> et ne sont pas :</p>
          <ul>
            <li>Un avis médical ou paramédical</li>
            <li>Une prescription d'exercices par un professionnel de santé</li>
            <li>Un suivi personnalisé par un coach diplômé</li>
            <li>Une garantie de résultats</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">4.2 Obligation de consultation médicale</h3>
          <p>L'utilisateur s'engage à :</p>
          <ul>
            <li><strong>Consulter un médecin</strong> avant tout programme</li>
            <li><strong>Obtenir un certificat médical</strong> d'aptitude</li>
            <li><strong>Respecter les recommandations médicales</strong> qui prévalent toujours</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">4.3 Écoute du corps</h3>
          <p>L'utilisateur reconnaît que :</p>
          <ul>
            <li>Les sensations physiques doivent toujours guider l'entraînement</li>
            <li><strong>Toute douleur doit entraîner l'arrêt immédiat de l'effort</strong></li>
            <li>Le repos et la récupération sont essentiels</li>
            <li>Forcer sur une blessure peut l'aggraver significativement</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">4.4 Populations à risque</h3>
          <p>Le Service est déconseillé, sauf avis médical favorable, aux personnes :</p>
          <ul>
            <li>Souffrant de pathologies cardiaques ou respiratoires</li>
            <li>Présentant des problèmes articulaires ou musculo-squelettiques</li>
            <li>En surpoids important</li>
            <li>Âgées de plus de 40 ans sans activité sportive récente</li>
            <li>Enceintes ou en post-partum récent</li>
            <li>Sous traitement médicamenteux affectant l'effort</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">4.5 Périmètre spécifique des plans Hyrox</h3>
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 my-4">
            <p className="font-bold text-orange-900 mb-2">⚠️ Important : les plans "Hyrox" couvrent uniquement la partie course à pied.</p>
            <p className="text-orange-900">
              Les programmes générés sous l'objectif "Hyrox" sont conçus <strong>exclusivement pour la préparation de la partie course à pied</strong> de l'épreuve (8 km de course répartis entre les 8 stations fonctionnelles). Ces plans incluent les séances de course, de renforcement musculaire orienté course et la sortie longue.
            </p>
          </div>
          <p>L'utilisateur reconnaît et accepte que :</p>
          <ul>
            <li>Les plans Hyrox <strong>n'incluent pas</strong> l'entraînement spécifique aux stations fonctionnelles (sled push, sled pull, wall balls, sandbag lunges, burpee broad jumps, rameur, ski erg, farmers carry)</li>
            <li>L'utilisateur reste responsable de la planification et de l'exécution de son <strong>entraînement fonctionnel complémentaire</strong>, à effectuer en parallèle du présent plan</li>
            <li>La performance globale en Hyrox dépend de la combinaison course + stations ; ce Service ne couvre qu'une moitié de cette préparation</li>
            <li>Coach Running IA ne saurait être tenu responsable d'une performance insuffisante en compétition Hyrox liée à un entraînement fonctionnel inadéquat ou absent</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 5 - Limitation de responsabilité et acceptation des risques</h2>
          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">5.1 Exclusion de garantie</h3>
          <p>Le Service est fourni "en l'état". Coach Running IA ne garantit pas :</p>
          <ul>
            <li>L'adéquation des plans à la condition physique réelle de l'utilisateur</li>
            <li>L'atteinte des objectifs sportifs</li>
            <li>L'absence d'erreurs dans les plans générés par l'intelligence artificielle</li>
            <li>La pertinence des allures, volumes ou intensités proposés pour chaque individu</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">5.2 Acceptation des risques inhérents</h3>
          <p>L'utilisateur reconnaît et accepte que :</p>
          <ul>
            <li>La course à pied est une <strong>activité physique comportant des risques inhérents</strong> (blessures musculaires, articulaires, tendineuses, accidents cardiovasculaires, chutes, etc.)</li>
            <li>Les plans sont générés par une intelligence artificielle et <strong>ne constituent pas un suivi médical ou sportif personnalisé</strong></li>
            <li>L'utilisateur est <strong>seul responsable</strong> de l'évaluation de sa condition physique et de sa capacité à suivre le plan proposé</li>
            <li>L'utilisation du Service se fait <strong>à ses propres risques</strong> et sous sa pleine et entière responsabilité</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">5.3 Exclusion de responsabilité</h3>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 my-4">
            <p className="text-red-800 mb-2"><strong>Coach Running IA décline expressément toute responsabilité</strong> en cas de :</p>
            <ul className="text-red-800">
              <li>Blessures de toute nature (musculaires, articulaires, tendineuses, osseuses)</li>
              <li>Accidents cardiovasculaires ou respiratoires pendant ou après l'entraînement</li>
              <li>Chutes, accidents de la voie publique ou tout événement survenant pendant l'entraînement</li>
              <li>Aggravation de pathologies préexistantes connues ou non</li>
              <li>Surentraînement, fatigue chronique et leurs conséquences</li>
              <li>Tout autre préjudice direct ou indirect, corporel ou matériel</li>
            </ul>
          </div>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">5.4 Obligation de prudence de l'utilisateur</h3>
          <p>En cas de survenance d'un accident ou d'une blessure, l'utilisateur ne pourra rechercher la responsabilité de Coach Running IA que s'il démontre une faute intentionnelle ou une négligence grave de la part de l'éditeur. L'utilisateur s'engage à :</p>
          <ul>
            <li>Ne <strong>jamais suivre un plan sans avis médical préalable</strong> confirmant son aptitude</li>
            <li>Adapter ou interrompre le plan en cas de fatigue anormale, douleur ou symptôme inhabituel</li>
            <li>Ne pas dépasser ses capacités physiques, même si le plan le suggère</li>
            <li>S'assurer de conditions de pratique sécurisées (lieu, météo, équipement, hydratation)</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 6 - Abonnements, tarifs et reconduction</h2>
          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6.1 Offres et tarifs</h3>
          <p>Le Service propose une offre gratuite limitée et des abonnements Premium. Tous les prix sont indiqués en euros TTC.</p>
          <ul>
            <li><strong>Abonnement Premium mensuel</strong> : 9,90 € TTC / mois (prix de référence), pouvant faire l'objet d'offres promotionnelles temporaires (par exemple 4,90 € / mois).</li>
            <li><strong>Abonnement Premium annuel</strong> : 69,90 € TTC / an (prix de référence), pouvant faire l'objet d'offres promotionnelles temporaires (par exemple 39,90 € / an).</li>
          </ul>
          <p>Les prix promotionnels appliqués au moment de la souscription sont susceptibles de varier pour les renouvellements futurs : à l'échéance de chaque période, le tarif applicable est celui en vigueur. Toute modification de tarif sera communiquée par email au moins 30 jours avant son application.</p>
          <p>Les paiements sont gérés par <strong>Stripe Payments Europe Ltd</strong> (Irlande) selon ses propres conditions. Coach Running IA n'a pas accès aux données de carte bancaire de l'utilisateur.</p>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6.2 Reconduction automatique</h3>
          <p>Les abonnements sont à <strong>reconduction tacite automatique</strong> à l'issue de chaque période payée (mensuelle ou annuelle), sans notification préalable spécifique. La nouvelle période est facturée automatiquement sur le moyen de paiement renseigné.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 my-4">
            <p className="text-blue-900 mb-0">
              <strong>Loi Chatel (L215-1 et suivants du Code de la consommation)</strong> : pour les abonnements à durée déterminée avec reconduction tacite, l'utilisateur peut résilier l'abonnement à tout moment à compter de la date de reconduction, dans un délai défini par la loi, si l'éditeur ne l'a pas informé de sa faculté de non-reconduction dans un délai compris entre <strong>1 et 3 mois</strong> avant la date d'échéance. L'éditeur s'engage à notifier l'utilisateur par email dans ce délai pour tout abonnement annuel.
            </p>
          </div>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6.3 Limites de plans actifs</h3>
          <ul>
            <li><strong>Offre gratuite</strong> : 1 plan d'entraînement actif (aperçu d'une semaine)</li>
            <li><strong>Abonnement Premium (mensuel ou annuel)</strong> : 2 plans d'entraînement actifs simultanément maximum</li>
          </ul>
          <p>Un plan est considéré comme actif tant que sa date de fin n'est pas dépassée. L'utilisateur peut supprimer un plan actif depuis son espace personnel pour libérer un emplacement et en générer un nouveau.</p>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6.4 Usage strictement personnel</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 my-4">
            <p className="text-amber-800 mb-0">
              <strong>L'abonnement est strictement personnel et nominatif.</strong> L'utilisateur s'engage à ne générer des plans que pour lui-même. La génération de plans pour le compte de tiers est interdite. Tout partage de compte, revente de plans ou utilisation à des fins commerciales ou de coaching entraînera la résiliation immédiate de l'abonnement sans remboursement.
            </p>
          </div>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6.5 Résiliation et rétractation</h3>
          <p>
            Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les contenus numériques fournis sur support immatériel dont l'exécution a commencé après accord exprès de l'utilisateur. En souscrivant à un abonnement Premium et en accédant immédiatement aux plans générés, l'utilisateur renonce expressément à son droit de rétractation.
          </p>
          <p>
            L'utilisateur peut résilier son abonnement <strong>à tout moment et de manière instantanée</strong> depuis son espace personnel (rubrique "Mon compte"). La résiliation prend effet à la fin de la période payée en cours. <strong>La période déjà payée n'est pas remboursée</strong>, conformément aux conditions ci-dessus relatives à la renonciation au droit de rétractation.
          </p>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6.6 Suspension ou résiliation par l'éditeur</h3>
          <p>Coach Running IA se réserve le droit de suspendre ou résilier sans préavis le compte d'un utilisateur en cas de :</p>
          <ul>
            <li>Violation des présentes CGV (notamment l'article 6.4 sur l'usage personnel)</li>
            <li>Fraude, tentative de fraude ou impayé</li>
            <li>Utilisation abusive ou disproportionnée du service</li>
            <li>Comportement portant atteinte à l'éditeur ou à d'autres utilisateurs</li>
          </ul>
          <p>En cas de résiliation pour faute, aucun remboursement ne sera dû.</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 7 - Propriété intellectuelle</h2>
          <p>L'ensemble des contenus du Service sont la propriété de Coach Running IA. Les plans sont fournis pour un usage personnel et non commercial.</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 8 - Protection des données personnelles (RGPD)</h2>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">8.1 Responsable de traitement</h3>
          <p>Le responsable de traitement est la SASU Marino Digital (mentions complètes Article 2.1). Contact RGPD : <a href="mailto:programme@coachrunningia.fr" className="text-accent">programme@coachrunningia.fr</a>.</p>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">8.2 Données collectées</h3>
          <p>Dans le cadre de l'utilisation du Service, les données suivantes sont collectées :</p>
          <ul>
            <li><strong>Données d'identification</strong> : prénom, email, mot de passe chiffré, ville</li>
            <li><strong>Données de profil sportif</strong> : âge, sexe, taille, poids, niveau, fréquence d'entraînement, objectif, temps cibles, historique de courses, VMA</li>
            <li><strong>Données de santé (sensibles)</strong> : antécédents de blessure, contre-indications mentionnées par l'utilisateur, IMC dérivé</li>
            <li><strong>Données d'activité (si Strava connecté)</strong> : token d'accès Strava (les activités sont consultées en temps réel et ne sont pas stockées sur nos serveurs ; seules les analyses générées le sont)</li>
            <li><strong>Données de paiement</strong> : non stockées par l'éditeur — gérées exclusivement par Stripe</li>
            <li><strong>Données techniques</strong> : adresse IP, user-agent, logs de connexion</li>
            <li><strong>Données de feedback</strong> : retours sur les séances effectuées, RPE, notes</li>
          </ul>
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 my-4">
            <p className="text-orange-900 mb-0">
              <strong>⚠️ Données de santé</strong> : les blessures et contre-indications constituent des données sensibles au sens de l'article 9 du RGPD. Leur traitement est fondé sur votre <strong>consentement explicite</strong>, donné au moment du remplissage du questionnaire, et uniquement aux fins de personnalisation du plan d'entraînement.
            </p>
          </div>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">8.3 Finalités et bases légales</h3>
          <table className="w-full text-sm border-collapse my-4">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">Finalité</th>
                <th className="border border-slate-300 p-2 text-left">Base légale</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-slate-300 p-2">Création du compte, génération et personnalisation des plans</td><td className="border border-slate-300 p-2">Exécution du contrat</td></tr>
              <tr><td className="border border-slate-300 p-2">Traitement des données de santé</td><td className="border border-slate-300 p-2">Consentement explicite</td></tr>
              <tr><td className="border border-slate-300 p-2">Gestion des paiements et facturation</td><td className="border border-slate-300 p-2">Exécution du contrat + obligation légale (comptabilité)</td></tr>
              <tr><td className="border border-slate-300 p-2">Envoi de newsletters et communications commerciales</td><td className="border border-slate-300 p-2">Consentement (opt-in à la création de compte ; retrait possible à tout moment)</td></tr>
              <tr><td className="border border-slate-300 p-2">Emails transactionnels (vérification, alertes, plan généré)</td><td className="border border-slate-300 p-2">Exécution du contrat</td></tr>
              <tr><td className="border border-slate-300 p-2">Analyse d'audience et amélioration du service</td><td className="border border-slate-300 p-2">Consentement (via bandeau cookies) ou intérêt légitime (statistiques agrégées)</td></tr>
              <tr><td className="border border-slate-300 p-2">Lutte contre la fraude</td><td className="border border-slate-300 p-2">Intérêt légitime</td></tr>
            </tbody>
          </table>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">8.4 Durées de conservation</h3>
          <ul>
            <li><strong>Compte actif</strong> : pendant toute la durée de la relation contractuelle</li>
            <li><strong>Compte inactif</strong> : 3 ans à compter de la dernière connexion, puis suppression ou anonymisation automatique</li>
            <li><strong>Données de facturation</strong> : 10 ans (obligation comptable)</li>
            <li><strong>Logs techniques</strong> : 12 mois maximum</li>
            <li><strong>Données marketing (newsletters)</strong> : jusqu'au retrait du consentement, ou 3 ans après la dernière interaction</li>
            <li><strong>Token Strava</strong> : jusqu'à révocation par l'utilisateur</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">8.5 Sous-traitants et destinataires</h3>
          <p>L'éditeur fait appel aux sous-traitants suivants, qui peuvent traiter des données personnelles pour le compte de l'éditeur conformément à l'article 28 du RGPD :</p>
          <table className="w-full text-sm border-collapse my-4">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">Sous-traitant</th>
                <th className="border border-slate-300 p-2 text-left">Finalité</th>
                <th className="border border-slate-300 p-2 text-left">Localisation</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-slate-300 p-2">Google Ireland Ltd (Firebase, Cloud Run, Firestore)</td><td className="border border-slate-300 p-2">Hébergement, base de données, authentification</td><td className="border border-slate-300 p-2">Irlande (UE) avec serveurs UE</td></tr>
              <tr><td className="border border-slate-300 p-2">Google LLC (Gemini API)</td><td className="border border-slate-300 p-2">Génération IA des plans d'entraînement à partir des données questionnaire</td><td className="border border-slate-300 p-2">États-Unis (clauses contractuelles types + DPF Data Privacy Framework)</td></tr>
              <tr><td className="border border-slate-300 p-2">Stripe Payments Europe Ltd</td><td className="border border-slate-300 p-2">Traitement des paiements</td><td className="border border-slate-300 p-2">Irlande (UE)</td></tr>
              <tr><td className="border border-slate-300 p-2">Sendinblue / Brevo (SAS)</td><td className="border border-slate-300 p-2">Envoi des emails transactionnels et newsletters</td><td className="border border-slate-300 p-2">France (UE)</td></tr>
              <tr><td className="border border-slate-300 p-2">Strava Inc.</td><td className="border border-slate-300 p-2">Récupération des activités sportives (sur autorisation explicite de l'utilisateur via OAuth)</td><td className="border border-slate-300 p-2">États-Unis (clauses contractuelles types)</td></tr>
              <tr><td className="border border-slate-300 p-2">Google LLC (Google Analytics)</td><td className="border border-slate-300 p-2">Mesure d'audience (cf. Article 9 sur les cookies)</td><td className="border border-slate-300 p-2">États-Unis (DPF)</td></tr>
              <tr><td className="border border-slate-300 p-2">Meta Platforms Ireland Ltd (Pixel Meta)</td><td className="border border-slate-300 p-2">Mesure d'audience et publicité ciblée (sous consentement)</td><td className="border border-slate-300 p-2">Irlande (UE) — transferts US sous DPF</td></tr>
            </tbody>
          </table>
          <p className="text-sm text-slate-600">Les transferts hors UE (États-Unis notamment) sont encadrés par des Clauses Contractuelles Types validées par la Commission européenne et, le cas échéant, par l'adhésion du sous-traitant au Data Privacy Framework UE-États-Unis.</p>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">8.6 Vos droits</h3>
          <p>Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants sur vos données :</p>
          <ul>
            <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
            <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
            <li><strong>Droit à l'effacement</strong> (droit à l'oubli) : demander la suppression de vos données</li>
            <li><strong>Droit à la limitation</strong> du traitement</li>
            <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
            <li><strong>Droit d'opposition</strong> au traitement</li>
            <li><strong>Droit de retirer votre consentement</strong> à tout moment (sans effet rétroactif)</li>
            <li><strong>Droit de définir des directives</strong> sur le sort de vos données après votre décès</li>
          </ul>
          <p>Pour exercer ces droits : <a href="mailto:programme@coachrunningia.fr" className="text-accent">programme@coachrunningia.fr</a>. Une réponse vous sera apportée dans un délai maximum d'un mois.</p>
          <p>Vous avez également le droit d'introduire une réclamation auprès de la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) : <a href="https://www.cnil.fr" className="text-accent" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 9 - Cookies et traceurs</h2>
          <p>Le site utilise des cookies et traceurs aux fins suivantes :</p>
          <ul>
            <li><strong>Cookies strictement nécessaires</strong> : authentification, session, sécurité (Firebase Auth). Pas de consentement requis.</li>
            <li><strong>Cookies de mesure d'audience</strong> : Google Analytics et Firebase Analytics. Permettent de comprendre la fréquentation du site de manière agrégée. Soumis à consentement.</li>
            <li><strong>Cookies publicitaires</strong> : Pixel Meta (Facebook). Permet le retargeting publicitaire. Soumis à consentement explicite.</li>
          </ul>
          <p>Lors de votre première visite, un bandeau vous permet d'<strong>accepter, refuser ou personnaliser</strong> les cookies non nécessaires. Vous pouvez modifier vos choix à tout moment via le lien "Gérer les cookies" en bas de page.</p>
          <p>Durée de conservation des cookies : 13 mois maximum (recommandation CNIL).</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 10 - Disponibilité du Service et force majeure</h2>
          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">10.1 Disponibilité</h3>
          <p>Le Service est fourni "en l'état" et selon une obligation de moyens. L'éditeur ne garantit pas une disponibilité de 100% du Service. Des interruptions peuvent survenir pour maintenance, mise à jour, ou en cas de panne d'un service tiers (Google Cloud, Firebase, Stripe, Gemini API, etc.). Aucun remboursement ne sera dû en cas d'indisponibilité ponctuelle ou temporaire.</p>
          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">10.2 Force majeure</h3>
          <p>L'éditeur ne pourra être tenu responsable d'un manquement à ses obligations résultant d'un cas de force majeure au sens de l'article 1218 du Code civil, incluant notamment : catastrophe naturelle, pandémie, conflit armé, attaque informatique majeure, panne prolongée d'un fournisseur tiers (cloud, paiement, IA), changement réglementaire, fermeture imposée par une autorité publique.</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 11 - Modification des CGV</h2>
          <p>L'éditeur se réserve le droit de modifier les présentes CGV à tout moment. Les utilisateurs seront informés par email au moins <strong>30 jours avant l'entrée en vigueur</strong> de modifications substantielles. À défaut d'acceptation, l'utilisateur peut résilier son abonnement gratuitement avant la prise d'effet. La poursuite de l'utilisation après la date d'entrée en vigueur vaut acceptation des nouvelles conditions.</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 12 - Droit applicable et juridictions compétentes</h2>
          <p>En cas de litige, l'utilisateur est invité à contacter d'abord le service client à <a href="mailto:programme@coachrunningia.fr" className="text-accent">programme@coachrunningia.fr</a> pour tenter une résolution amiable. L'utilisateur peut également recourir à la plateforme européenne de règlement en ligne des litiges (RLL) : <a href="https://ec.europa.eu/consumers/odr" className="text-accent" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.</p>
          <p>Les présentes CGV sont régies par le droit français. À défaut de résolution amiable, les tribunaux français sont compétents. Si l'utilisateur est consommateur au sens du Code de la consommation, il pourra saisir, à son choix, soit le tribunal du lieu où il demeurait au moment de la conclusion du contrat, soit celui du lieu de survenance du fait dommageable (article R631-3 du Code de la consommation).</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 13 - Contact</h2>
          <div className="bg-slate-100 rounded-xl p-6 mt-4">
            <p className="flex items-center gap-2 text-slate-700 mb-0">
              <Mail size={20} className="text-accent" />
              <a href="mailto:programme@coachrunningia.fr" className="text-accent font-medium">programme@coachrunningia.fr</a>
            </p>
          </div>
        </div>

        {/* Rappel final */}
        <div className="bg-slate-900 text-white rounded-2xl p-8 mt-12">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="text-accent" />
            Rappel important
          </h3>
          <p className="text-slate-300">
            En utilisant Coach Running IA, vous reconnaissez avoir lu et accepté ces conditions. Les plans sont des suggestions qui ne remplacent pas l'avis d'un médecin. Consultez un professionnel de santé avant tout programme. Arrêtez immédiatement en cas de douleur.
          </p>
          <p className="text-slate-300 mt-4 font-bold">
            Votre santé est votre responsabilité. Écoutez votre corps. L'avis médical prévaut toujours.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CGVPage;
