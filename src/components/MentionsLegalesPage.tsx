import React from 'react';
import { Helmet } from "react-helmet-async";
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Globe, Server } from 'lucide-react';

const MentionsLegalesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <meta name="description" content="Mentions légales du site coachrunningia.fr. Éditeur, hébergeur et informations juridiques." />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8">
          <ArrowLeft size={18} />
          Retour à l'accueil
        </Link>

        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
          Mentions Légales
        </h1>
        <p className="text-slate-500 mb-8">
          Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique.
        </p>

        <div className="prose prose-slate max-w-none">
          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4 flex items-center gap-3">
            <Globe className="text-accent" size={24} />
            1. Éditeur du site
          </h2>
          <div className="bg-slate-50 rounded-xl p-6">
            <p className="mb-2"><strong>Nom du site :</strong> Coach Running IA</p>
            <p className="mb-2"><strong>URL :</strong> <a href="https://coachrunningia.fr" className="text-accent">https://coachrunningia.fr</a></p>
            <p className="mb-2"><strong>Email :</strong> <a href="mailto:programme@coachrunningia.fr" className="text-accent">programme@coachrunningia.fr</a></p>
            <p className="mb-0"><strong>Directeur de la publication :</strong> Coach Running IA</p>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4 flex items-center gap-3">
            <Server className="text-accent" size={24} />
            2. Hébergement
          </h2>
          <div className="bg-slate-50 rounded-xl p-6">
            <p className="mb-2"><strong>Hébergeur :</strong> Google Firebase / Google Cloud Platform</p>
            <p className="mb-2"><strong>Adresse :</strong> Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande</p>
            <p className="mb-0"><strong>Site web :</strong> <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-accent">https://firebase.google.com</a></p>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">3. Propriété intellectuelle</h2>
          <p>
            L'ensemble du contenu de ce site (textes, images, graphismes, logo, icônes, sons, logiciels, etc.) est la propriété exclusive de Coach Running IA, à l'exception des marques, logos ou contenus appartenant à d'autres sociétés partenaires ou auteurs.
          </p>
          <p>
            Toute reproduction, distribution, modification, adaptation, retransmission ou publication de ces différents éléments est strictement interdite sans l'accord exprès par écrit de Coach Running IA.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">4. Limitation de responsabilité</h2>
          <p>
            Les informations contenues sur ce site sont aussi précises que possible et le site est périodiquement remis à jour. Toutefois, des erreurs ou omissions peuvent survenir. L'utilisateur doit donc s'assurer de l'exactitude des informations auprès de Coach Running IA et signaler toute modification du site qu'il jugerait utile.
          </p>
          <p>
            Coach Running IA n'est en aucun cas responsable de l'utilisation faite de ces informations, et de tout préjudice direct ou indirect pouvant en découler, notamment concernant les plans d'entraînement qui sont fournis à titre indicatif uniquement.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">5. Liens hypertextes</h2>
          <p>
            Le site peut contenir des liens hypertextes vers d'autres sites. Coach Running IA n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">6. Données personnelles</h2>
          <p>
            Pour toute information relative à la collecte et au traitement des données personnelles, veuillez consulter notre <Link to="/confidentialite" className="text-accent font-medium">Politique de Confidentialité</Link>.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">7. Cookies</h2>
          <p>
            Le site utilise des cookies pour améliorer l'expérience utilisateur. En naviguant sur ce site, vous acceptez l'utilisation de cookies conformément à notre <Link to="/confidentialite" className="text-accent font-medium">Politique de Confidentialité</Link>.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">8. Droit applicable</h2>
          <p>
            Les présentes mentions légales sont régies par le droit français. En cas de litige, et après échec de toute tentative de recherche d'une solution amiable, les tribunaux français seront seuls compétents.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">9. Contact</h2>
          <div className="bg-slate-100 rounded-xl p-6 mt-4">
            <p className="flex items-center gap-2 text-slate-700 mb-0">
              <Mail size={20} className="text-accent" />
              <a href="mailto:programme@coachrunningia.fr" className="text-accent font-medium">programme@coachrunningia.fr</a>
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4">Pages légales</h3>
          <div className="flex flex-wrap gap-4">
            <Link to="/cgv" className="text-accent hover:underline">CGV / CGU</Link>
            <Link to="/confidentialite" className="text-accent hover:underline">Politique de Confidentialité</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentionsLegalesPage;
