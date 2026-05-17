import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Target, Zap, Star, ArrowRight, X, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { User, UserGoal } from '../types';
import Questionnaire from './Questionnaire';
import { Helmet } from 'react-helmet-async';
import { SectionLabel, StravaSection, ScreenshotsSlider, PricingPreview } from './landing/SharedSections';

interface TenKLandingProps {
  user: User | null;
  onPlanGeneration: (answers: any) => void;
  isGenerating: boolean;
}

const TenKLanding: React.FC<TenKLandingProps> = ({ user, onPlanGeneration, isGenerating }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Combien de semaines pour préparer un 10 km ?",
      answer: "La durée idéale dépend de votre niveau. Un débutant devrait prévoir 10 à 14 semaines. Un coureur intermédiaire peut se préparer en 8 à 10 semaines. Un coureur confirmé visant un record personnel optera pour 6 à 8 semaines de travail spécifique. Coach Running IA adapte automatiquement la durée à votre profil."
    },
    {
      question: "Quel temps viser sur 10 km selon mon niveau ?",
      answer: "Débutant : 55-65 min (allure 5'30-6'30/km). Intermédiaire : 45-55 min (4'30-5'30/km). Confirmé : 38-45 min (3'48-4'30/km). Expert : moins de 38 min (sous 3'48/km). L'IA calcule votre objectif réaliste à partir de vos chronos récents et de votre VMA."
    },
    {
      question: "Combien de fois par semaine s'entraîner pour un 10 km ?",
      answer: "3 séances par semaine suffisent pour un débutant ou un intermédiaire. Les coureurs confirmés et experts peuvent passer à 4-5 séances. Le plan inclut un mix de footing en endurance, de fractionné (VMA ou seuil) et de renforcement musculaire."
    },
    {
      question: "Faut-il faire du fractionné pour préparer un 10 km ?",
      answer: "Oui, le fractionné est essentiel pour progresser sur 10 km. Le 10 km se court à 85-92% de la VMA — c'est un effort intense qui nécessite un travail spécifique au seuil et en VMA. Le plan intègre progressivement des séances de fractionné adaptées à votre niveau."
    },
    {
      question: "Quelle est la sortie longue idéale pour un 10 km ?",
      answer: "La sortie longue pour un 10 km se situe entre 12 et 16 km (1h à 1h20 selon votre allure). Elle se court en endurance fondamentale, pas à allure course. L'objectif est de développer votre endurance aérobie, pas de simuler la course."
    },
    {
      question: "Le plan 10 km est-il exportable sur ma montre GPS ?",
      answer: "Oui ! Votre plan est exportable en PDF et ajouteable à votre calendrier iPhone ou Google Calendar. Chaque séance apparaît avec les détails d'allure et de distance."
    }
  ];

  return (
    <div className="bg-white">
      <Helmet>
        <title>Plan Entraînement 10km par IA | Coach Running IA</title>
        <meta name="description" content="Plan entraînement 10km personnalisé. 6-14 semaines, fractionné VMA, allure spécifique. Du 1er 10km au record perso. 1ère semaine offerte." />
        <meta name="keywords" content="plan entraînement 10km, programme 10km personnalisé, plan 10 km débutant, plan 10km sub 45, plan 10km sub 40, préparation 10km IA, plan course 10 kilomètres" />
        <link rel="canonical" href="https://coachrunningia.fr/plan-10km" />
        <meta property="og:title" content="Plan Entraînement 10km par IA | Coach Running IA" />
        <meta property="og:description" content="Programme 10km sur-mesure : 8-14 semaines, allures VMA, fractionné progressif. Du premier 10km au sub 40. 1ère semaine gratuite." />
        <meta property="og:url" content="https://coachrunningia.fr/plan-10km" />
        <meta property="og:image" content="https://coachrunningia.fr/og-image.png" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": { "@type": "Answer", "text": faq.answer }
          }))
        })}</script>
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Plan Entraînement 10km par IA | Coach Running IA" />
        <meta name="twitter:description" content="Programme 10km sur-mesure : allures VMA, fractionné progressif. 1ère semaine gratuite." />
        <meta name="twitter:image" content="https://coachrunningia.fr/og-image.png" />
      </Helmet>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            Plan entraînement <span className="text-accent">10 km</span> personnalisé
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-6 max-w-3xl mx-auto">
            Programme 10 kilomètres sur-mesure généré par IA. Adapté à votre VMA, votre volume et votre objectif chrono.
          </p>
          <p className="text-slate-400 text-sm mb-6">✓ 1ère semaine gratuite ✓ Sans carte bancaire ✓ Plan 8 à 14 semaines</p>
          <button
            onClick={() => document.getElementById('questionnaire-10km')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2 mb-4"
          >
            Créer mon plan 10km gratuit
            <ArrowRight size={20} />
          </button>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-sm text-slate-400">Powered by</span>
            <svg className="w-4 h-4 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor" aria-label="Logo Strava"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            <span className="text-sm font-bold text-[#FC4C02]">Strava</span>
          </div>
        </div>
      </section>

      {/* QUESTIONNAIRE */}
      <section id="questionnaire-10km" className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 mb-4">
            Créez votre plan 10 km en 2 minutes
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Répondez à quelques questions pour recevoir votre programme 10km personnalisé
          </p>
          <Questionnaire
            onComplete={onPlanGeneration}
            isGenerating={isGenerating}
            user={user}
            initialGoal={UserGoal.ROAD_RACE}
            initialSubGoal="10 km"
          />
        </div>
      </section>

      {/* SCREENSHOTS SLIDER */}
      <ScreenshotsSlider />

      {/* COMPARISON */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-accent font-bold text-sm tracking-wider uppercase mb-3">Ce qui change tout sur 10km</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Plan 10km PDF vs plan 10km personnalisé par IA
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-lg">{"📄"}</div>
                <h3 className="font-bold text-slate-400 text-lg">Plan 10km générique</h3>
              </div>
              <div className="space-y-3 text-slate-400 text-sm">
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Allures fixes — <strong>les mêmes pour tout le monde</strong></span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Fractionné <strong>non adapté</strong> à votre VMA</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Pas de <strong>progression personnalisée</strong></span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Aucun <strong>ajustement</strong> selon votre ressenti</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Pas de <strong>renforcement musculaire</strong> intégré</span></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border-2 border-accent/30 relative">
              <div className="absolute -top-3 right-4 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">RECOMMANDÉ</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-lg">{"🏃"}</div>
                <h3 className="font-bold text-slate-900 text-lg">Coach Running IA</h3>
              </div>
              <div className="space-y-3 text-slate-700 text-sm">
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Allures calculées sur votre VMA</strong> — seuil, VMA et EF personnalisés</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Fractionné progressif</strong> — de la VMA courte au seuil long</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Volume adapté</strong> à votre kilométrage actuel</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Feedback RPE</strong> — le plan s'ajuste à votre ressenti</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Renforcement musculaire</strong> spécifique 10km intégré</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Export calendrier</strong> + compatible Strava</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POURQUOI */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-4">
            Pourquoi un plan 10 km personnalisé ?
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
            Le 10 km est la distance reine pour progresser. Un plan adapté à VOTRE profil fait toute la différence.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Objectif chrono réaliste</h3>
              <p className="text-slate-500">L'IA analyse vos chronos récents et votre VMA pour définir un objectif atteignable et motivant.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Fractionné calibré</h3>
              <p className="text-slate-500">VMA courte, seuil, allure spécifique 10km — chaque séance de qualité est dosée pour votre niveau.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Affûtage optimal</h3>
              <p className="text-slate-500">La dernière semaine est calibrée pour arriver frais et en forme le jour J.</p>
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => document.getElementById('questionnaire-10km')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
            >
              Générer mon plan 10km
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* CONTENU SEO */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <SectionLabel variant="slate">Guide 10km</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Comment préparer un 10 km ?</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Endurance + vitesse : le 10 km demande un plan équilibré entre endurance fondamentale, seuil et VMA.</p>
          </div>
          <div className="grid gap-5">
            <div className="bg-white border-l-4 border-orange-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm shrink-0">1</div>
                <div><h3 className="text-lg font-bold text-slate-900 mb-2">Durée idéale du plan 10 km</h3><p className="text-slate-600"><strong>Premier 10 km</strong> : 10-14 semaines. <strong>Régulier</strong> : 8-10 semaines. <strong>Compétiteur</strong> : 6-8 semaines. Coach Running IA adapte la durée à votre VMA.</p></div>
              </div>
            </div>
            <div className="bg-white border-l-4 border-orange-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm shrink-0">2</div>
                <div><h3 className="text-lg font-bold text-slate-900 mb-3">Les piliers du plan 10 km</h3>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Endurance fondamentale</strong> : 60-70% du volume, allure confortable</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Fractionné VMA</strong> : 30/30, 200m, 400m</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Seuil</strong> : tempo runs et intervalles longs</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Allure spécifique 10km</strong> : mémoriser le rythme cible</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Renforcement</strong> : gainage, squats, fentes</span></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-white border-l-4 border-orange-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm shrink-0">3</div>
                <div><h3 className="text-lg font-bold text-slate-900 mb-2">Temps de référence sur 10 km</h3>
                  <p className="text-slate-600 mb-3">Utilisez notre <Link to="/outils/predicteur-temps" className="text-orange-500 hover:underline font-medium">prédicteur de temps</Link> pour estimer votre chrono.</p>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>55-65 min</strong> : débutant — 5'30-6'30/km</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>45-55 min</strong> : intermédiaire — 4'30-5'30/km</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>38-45 min</strong> : confirmé — 3'48-4'30/km</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Moins de 38 min</strong> : expert — VMA supérieure à 16 km/h</span></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-white border-l-4 border-orange-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm shrink-0">4</div>
                <div><h3 className="text-lg font-bold text-slate-900 mb-3">Les erreurs à éviter</h3>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Trop de fractionné</strong> : 1-2 séances/semaine max, le reste en endurance</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Négliger l'échauffement</strong> : 15-20 min de footing avant chaque VMA/seuil</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Partir trop vite</strong> : le 1er km doit être couru en retenue</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Pas assez de repos</strong> : les jours off sont essentiels</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-12">
            Questions fréquentes sur le plan 10 km
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:border-orange-200 hover:shadow-md transition-all">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                  <span className="font-bold text-slate-800 pr-4">{faq.question}</span>
                  {openFaq === index ? <ChevronUp className="text-orange-500 shrink-0" size={20} /> : <ChevronDown className="text-slate-400 shrink-0" size={20} />}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5 text-slate-600 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIENS INTERNES */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-black text-center text-slate-900 mb-8">
            Découvrez aussi nos autres programmes
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Link to="/plan-semi-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Semi-Marathon</h3>
              <p className="text-slate-500 text-sm">L'étape suivante après le 10km</p>
            </Link>
            <Link to="/plan-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Marathon</h3>
              <p className="text-slate-500 text-sm">Programme 42km personnalisé</p>
            </Link>
            <Link to="/plan-trail" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Trail</h3>
              <p className="text-slate-500 text-sm">Course en nature avec dénivelé</p>
            </Link>
            <Link to="/outils/predicteur-temps" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Prédicteur de Temps</h3>
              <p className="text-slate-500 text-sm">Estimez votre chrono 10km</p>
            </Link>
          </div>
        </div>
      </section>

      {/* STRAVA */}
      <StravaSection discipline="10km" />

      {/* PRICING */}
      <PricingPreview />

      {/* CTA FINAL */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Prêt à battre votre record sur 10 km ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Obtenez votre plan entraînement 10km personnalisé en moins de 2 minutes
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2"
          >
            Générer mon plan 10km
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default TenKLanding;
