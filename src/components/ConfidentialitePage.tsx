import React from 'react';
import { Helmet } from "react-helmet-async";
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Mail, Lock, Eye, Trash2, Download } from 'lucide-react';

const ConfidentialitePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <meta name="description" content="Politique de confidentialité Coach Running IA. Protection de vos données personnelles, RGPD, cookies et droits." />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8">
          <ArrowLeft size={18} />
          Retour à l'accueil
        </Link>

        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
          Politique de Confidentialité
        </h1>
        <p className="text-slate-500 mb-8">
          Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-10">
          <div className="flex items-start gap-4">
            <Shield className="text-blue-500 flex-shrink-0 mt-1" size={24} />
            <div>
              <h2 className="text-lg font-bold text-blue-800 mb-2">Votre vie privée nous tient à cœur</h2>
              <p className="text-blue-700">
                Coach Running IA s'engage à protéger vos données personnelles conformément au RGPD. Nous collectons uniquement les données nécessaires au fonctionnement du service.
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-slate max-w-none">
          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">1. Responsable du traitement</h2>
          <p>
            Coach Running IA<br/>
            Email : <a href="mailto:programme@coachrunningia.fr" className="text-accent">programme@coachrunningia.fr</a>
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">2. Données collectées</h2>
          
          <div className="grid md:grid-cols-2 gap-4 my-6">
            <div className="bg-slate-50 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Lock size={18} className="text-accent" />
                Données d'identification
              </h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Nom et prénom</li>
                <li>• Adresse email</li>
                <li>• Mot de passe (crypté)</li>
              </ul>
            </div>
            <div className="bg-slate-50 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Eye size={18} className="text-accent" />
                Données sportives
              </h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Niveau sportif déclaré</li>
                <li>• Objectifs de course</li>
                <li>• Historique d'entraînement</li>
                <li>• Données Strava (si connecté)</li>
              </ul>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">3. Finalités du traitement</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul>
            <li>Créer et gérer votre compte utilisateur</li>
            <li>Générer des plans d'entraînement personnalisés</li>
            <li>Adapter les programmes selon vos retours</li>
            <li>Vous envoyer des communications relatives au service</li>
            <li>Améliorer nos algorithmes et notre service</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">4. Base légale</h2>
          <p>Le traitement de vos données repose sur :</p>
          <ul>
            <li><strong>L'exécution du contrat</strong> : pour fournir le service demandé</li>
            <li><strong>Votre consentement</strong> : pour les communications marketing</li>
            <li><strong>L'intérêt légitime</strong> : pour améliorer nos services</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">5. Durée de conservation</h2>
          <ul>
            <li><strong>Données de compte</strong> : conservées tant que le compte est actif, puis 3 ans après suppression</li>
            <li><strong>Données de paiement</strong> : conservées 10 ans (obligations légales)</li>
            <li><strong>Cookies</strong> : 13 mois maximum</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">6. Partage des données</h2>
          <p>Vos données peuvent être partagées avec :</p>
          <ul>
            <li><strong>Stripe</strong> : traitement sécurisé des paiements</li>
            <li><strong>Firebase/Google Cloud</strong> : hébergement et base de données</li>
            <li><strong>Strava</strong> : uniquement si vous connectez votre compte</li>
          </ul>
          <p>Nous ne vendons jamais vos données à des tiers.</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">7. Sécurité</h2>
          <p>Nous mettons en œuvre des mesures de sécurité appropriées :</p>
          <ul>
            <li>Chiffrement SSL/TLS des communications</li>
            <li>Mots de passe hashés (jamais stockés en clair)</li>
            <li>Accès restreint aux données personnelles</li>
            <li>Hébergement sécurisé en Europe</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">8. Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          
          <div className="grid md:grid-cols-2 gap-4 my-6">
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Eye size={16} className="text-accent" /> Droit d'accès
              </h4>
              <p className="text-sm text-slate-600">Obtenir une copie de vos données</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Lock size={16} className="text-accent" /> Droit de rectification
              </h4>
              <p className="text-sm text-slate-600">Corriger vos données inexactes</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Trash2 size={16} className="text-accent" /> Droit à l'effacement
              </h4>
              <p className="text-sm text-slate-600">Supprimer vos données</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Download size={16} className="text-accent" /> Droit à la portabilité
              </h4>
              <p className="text-sm text-slate-600">Récupérer vos données</p>
            </div>
          </div>

          <p>Pour exercer ces droits, contactez-nous :</p>
          <div className="bg-slate-100 rounded-xl p-6 mt-4">
            <p className="flex items-center gap-2 text-slate-700 mb-0">
              <Mail size={20} className="text-accent" />
              <a href="mailto:programme@coachrunningia.fr" className="text-accent font-medium">programme@coachrunningia.fr</a>
            </p>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">9. Cookies</h2>
          <p>Nous utilisons des cookies pour :</p>
          <ul>
            <li><strong>Cookies essentiels</strong> : fonctionnement du site (authentification)</li>
            <li><strong>Cookies analytiques</strong> : Google Analytics (anonymisés)</li>
          </ul>
          <p>Vous pouvez gérer vos préférences cookies dans les paramètres de votre navigateur.</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">10. Modifications</h2>
          <p>Cette politique peut être mise à jour. Nous vous informerons de tout changement significatif par email.</p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">11. Contact & Réclamation</h2>
          <p>Pour toute question : <a href="mailto:programme@coachrunningia.fr" className="text-accent">programme@coachrunningia.fr</a></p>
          <p>Vous pouvez également adresser une réclamation à la CNIL : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-accent">www.cnil.fr</a></p>
        </div>
      </div>
    </div>
  );
};

export default ConfidentialitePage;
