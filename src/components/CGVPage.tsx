import React from 'react';
import { Helmet } from "react-helmet-async";
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Shield, Mail } from 'lucide-react';

const CGVPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Conditions Générales de Vente et d'Utilisation | Coach Running IA</title>
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

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 2 - Éditeur</h2>
          <p>Coach Running IA<br/>Contact : <a href="mailto:programme@coachrunningia.fr" className="text-accent">programme@coachrunningia.fr</a></p>

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

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 6 - Abonnements et limites</h2>
          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6.1 Offres disponibles</h3>
          <p>Le Service propose une offre gratuite limitée et des abonnements Premium. Les paiements sont sécurisés via Stripe. Les prix sont en euros TTC.</p>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6.2 Limites de plans actifs</h3>
          <ul>
            <li><strong>Offre gratuite</strong> : 1 plan d'entraînement actif (aperçu d'une semaine)</li>
            <li><strong>Abonnement Premium (mensuel ou annuel)</strong> : 2 plans d'entraînement actifs simultanément maximum</li>
          </ul>
          <p>Un plan est considéré comme actif tant que sa date de fin n'est pas dépassée. L'utilisateur peut supprimer un plan actif depuis son espace personnel pour libérer un emplacement et en générer un nouveau.</p>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6.3 Usage strictement personnel</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 my-4">
            <p className="text-amber-800 mb-0">
              <strong>L'abonnement est strictement personnel et nominatif.</strong> L'utilisateur s'engage à ne générer des plans que pour lui-même. La génération de plans pour le compte de tiers est interdite. Tout partage de compte, revente de plans ou utilisation à des fins commerciales ou de coaching entraînera la résiliation immédiate de l'abonnement sans remboursement.
            </p>
          </div>

          <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6.4 Résiliation et rétractation</h3>
          <p>Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les contenus numériques dont l'exécution a commencé.</p>
          <p>L'utilisateur peut résilier à tout moment depuis son espace personnel. La résiliation prend effet à la fin de la période en cours.</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 7 - Propriété intellectuelle</h2>
          <p>L'ensemble des contenus du Service sont la propriété de Coach Running IA. Les plans sont fournis pour un usage personnel et non commercial.</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 8 - Données personnelles</h2>
          <p>Les données sont traitées conformément au RGPD. L'utilisateur peut exercer ses droits en contactant : <a href="mailto:programme@coachrunningia.fr" className="text-accent">programme@coachrunningia.fr</a></p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 9 - Droit applicable</h2>
          <p>Les présentes CGV/CGU sont régies par le droit français. En cas de litige, les tribunaux français sont compétents.</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Article 10 - Contact</h2>
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
