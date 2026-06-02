
import React, { useState } from 'react';
import { Helmet } from "react-helmet-async";
import { Check, Zap, Crown, ArrowLeft, X, ShoppingBag } from 'lucide-react';
import { STRIPE_PRICES } from '../constants';
import { isIOSNative } from '../services/platformService';

interface PricingPageProps {
  userId: string;
  userEmail: string;
  onBack: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ userId, userEmail, onBack }) => {
  // Mobile iOS J1 (02/06/2026) — Apple 3.1.1 : aucun CTA paiement Stripe ne doit
  // s'afficher dans l'app iOS native. On affiche un écran neutre sans CTA, sans
  // mention de prix, sans lien externe (anti-steering rules Apple).
  // L'utilisateur iOS souscrit Premium depuis Safari sur coachrunningia.fr, hors app.
  if (isIOSNative) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Retour</span>
          </button>
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Crown size={32} className="text-amber-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-3">
              Tu profites de la version gratuite
            </h1>
            <p className="text-slate-600 mb-6">
              Génère ton plan personnalisé, suis ta première semaine et profite
              des outils Coach Running IA.
            </p>
            <p className="text-sm text-slate-500">
              Merci d'utiliser Coach Running IA — bons entraînements&nbsp;!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [loading, setLoading] = useState<'monthly' | 'yearly' | 'single' | null>(null);

  const handleSubscribe = async (plan: 'monthly' | 'yearly' | 'single') => {
    setLoading(plan);

    try {
      const priceId = plan === 'monthly' ? STRIPE_PRICES.MONTHLY : plan === 'yearly' ? STRIPE_PRICES.YEARLY : STRIPE_PRICES.PLAN_UNIQUE;
      const baseUrl = window.location.origin;
      const mode = plan === 'single' ? 'payment' : 'subscription';
      const planLabel = plan === 'monthly' ? 'premium_mensuel' : plan === 'yearly' ? 'premium_annuel' : 'plan_unique';

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId,
          userEmail,
          mode,
          successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&plan=${planLabel}`,
          cancelUrl: `${baseUrl}/pricing`
        })
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Erreur lors de la création de la session');
      }
    } catch (error) {
      console.error('[Stripe] Erreur:', error);
      alert('Erreur lors de la redirection vers le paiement. Veuillez réessayer.');
    } finally {
      setLoading(null);
    }
  };

  const features = [
    { text: "Plans illimités", desc: "Génère autant de plans que tu veux", bold: true },
    { text: "Toutes les semaines détaillées", desc: "Chaque jour, chaque séance" },
    { text: "Connexion Strava", desc: "Analyse IA hebdo (bientôt disponible)" },
    { text: "Feedback après séance", desc: "Note ton ressenti, le plan s'adapte" },
    { text: "Export calendrier", desc: "Google Calendar / Apple Calendar" },
    // Mobile iOS J1 (02/06/2026) — Retrait promesse "Rappels hebdomadaires" :
    // le plugin @capacitor/local-notifications n'est pas implémenté et la
    // feature serait à fournir avant promesse marketing (risque chargeback Stripe).
    // À ré-ajouter en V1.1 quand schedule J-1 18h + J 7h sera codé.
    { text: "Adaptation intelligente", desc: "Le plan évolue avec toi" },
    { text: "Support prioritaire", desc: "Réponse sous 24h" },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <Helmet>
        <title>Tarifs - Plan Unique et Premium | Coach Running IA</title>
        <meta name="description" content="Plans d'entraînement course à pied personnalisés par IA dès 9,90€. Abonnement mensuel ou annuel. Marathon, semi, trail, 10km." />
        <link rel="canonical" href="https://coachrunningia.fr/pricing" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Tarifs - Plan Unique et Premium | Coach Running IA" />
        <meta name="twitter:description" content="Plans d'entraînement course à pied personnalisés par IA dès 9,90€. Abonnement mensuel ou annuel. Marathon, semi, trail, 10km." />
        <meta name="twitter:image" content="https://coachrunningia.fr/og-image.png" />
      </Helmet>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Retour</span>
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
            <Crown size={16} />
            Passe Premium
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4">
            Libère tout ton potentiel
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Accède à toutes les fonctionnalités de Coach Running IA et atteins tes objectifs plus rapidement.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">

          {/* Yearly - Populaire — order-1 on mobile, order-2 on desktop (center) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 shadow-xl relative overflow-hidden order-1 md:order-2">
            <div className="absolute top-4 right-4 bg-amber-400 text-slate-900 text-xs font-black px-3 py-1 rounded-full uppercase">
              Populaire
            </div>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Annuel</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-white">39,90</span>
                <span className="text-slate-400">/an</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Soit <span className="text-amber-400 font-black text-lg">3,33&euro;/mois</span>
              </p>
              <p className="text-white font-black text-sm mt-2">Plans illimités</p>
            </div>

            <button
              onClick={() => handleSubscribe('yearly')}
              disabled={loading !== null}
              className="w-full py-3 px-6 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading === 'yearly' ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Crown size={18} />
                  Meilleur choix
                </>
              )}
            </button>
          </div>

          {/* Monthly — order-2 on mobile, order-1 on desktop (left) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-lg transition-shadow order-2 md:order-1">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Mensuel</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-slate-900">4,90</span>
                <span className="text-slate-500">/mois</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">Sans engagement</p>
            </div>

            <div className="mb-6 space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <X size={14} className="text-slate-300" />
                <span>Génération illimitée de plans</span>
              </div>
              <div className="flex items-center gap-2">
                <X size={14} className="text-slate-300" />
                <span>Réduction du forfait annuel</span>
              </div>
            </div>

            <button
              onClick={() => handleSubscribe('monthly')}
              disabled={loading !== null}
              className="w-full py-3 px-6 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading === 'monthly' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Zap size={18} />
                  S'abonner
                </>
              )}
            </button>
          </div>

          {/* Plan Unique — order-3 on mobile, order-3 on desktop (right) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-lg transition-shadow order-3 md:order-3">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Plan Unique</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-slate-900">9,90</span>
                <span className="text-slate-500">&euro;</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">Paiement unique</p>
            </div>

            <div className="mb-6 space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <X size={14} className="text-slate-300" />
                <span>Abonnement mensuel/annuel</span>
              </div>
              <div className="flex items-center gap-2">
                <X size={14} className="text-slate-300" />
                <span>Plans illimités</span>
              </div>
            </div>

            <button
              onClick={() => handleSubscribe('single')}
              disabled={loading !== null}
              className="w-full py-3 px-6 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading === 'single' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShoppingBag size={18} />
                  Acheter mon plan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Features List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 text-center">
            Tout ce qui est inclus
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-emerald-600" />
                </div>
                <div><span className={`text-slate-700 ${'bold' in feature && feature.bold ? 'font-black' : 'font-medium'}`}>{feature.text}</span><p className="text-xs text-slate-500">{feature.desc}</p></div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badge */}
        <p className="text-center text-sm text-slate-500 mt-8">
          Paiement sécurisé par Stripe. Annulation possible à tout moment.
        </p>
      </div>
    </div>
  );
};

export default PricingPage;
