
import React, { useState } from 'react';
import { Helmet } from "react-helmet-async";
import { Check, Zap, Crown, ArrowLeft } from 'lucide-react';
import { STRIPE_PRICES } from '../constants';

interface PricingPageProps {
  userId: string;
  userEmail: string;
  onBack: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ userId, userEmail, onBack }) => {
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    setLoading(plan);

    try {
      const priceId = plan === 'monthly' ? STRIPE_PRICES.MONTHLY : STRIPE_PRICES.YEARLY;
      const baseUrl = window.location.origin;

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId,
          userEmail,
          successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
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
    { text: "Plans illimités", desc: "Génère autant de plans que tu veux" },
    { text: "Toutes les semaines détaillées", desc: "Chaque jour, chaque séance" },
    { text: "Connexion Strava", desc: "Analyse IA hebdo (bientôt disponible)" },
    { text: "Feedback après séance", desc: "Note ton ressenti, le plan s'adapte" },
    { text: "Export calendrier", desc: "Google Calendar / Apple Calendar" },
    { text: "Rappels hebdomadaires", desc: "Ne rate jamais une séance" },
    { text: "Adaptation intelligente", desc: "Le plan évolue avec toi" },
    { text: "Support prioritaire", desc: "Réponse sous 24h" },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <Helmet>
        <meta name="description" content="Plans d'entraînement course à pied personnalisés par IA dès 9,99€/mois. Essai gratuit 7 jours, sans engagement. Marathon, semi, trail, 10km." />
      </Helmet>
      <div className="max-w-4xl mx-auto">

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
        <div className="grid md:grid-cols-2 gap-6 mb-12">

          {/* Monthly */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-lg transition-shadow">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Mensuel</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-slate-900">9,99</span>
                <span className="text-slate-500">/mois</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">Facturation mensuelle</p>
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
                  Commencer
                </>
              )}
            </button>
          </div>

          {/* Yearly - Best Value */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-amber-400 text-slate-900 text-xs font-black px-3 py-1 rounded-full">
              -33%
            </div>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Annuel</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-white">79,99</span>
                <span className="text-slate-400">/an</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Soit <span className="text-amber-400 font-bold">6,67/mois</span> - Meilleur prix
              </p>
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
                <div><span className="text-slate-700 font-medium">{feature.text}</span><p className="text-xs text-slate-500">{feature.desc}</p></div>
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
