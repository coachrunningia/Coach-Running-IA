import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Target, Zap, Star, ArrowRight, X, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { User, UserGoal } from '../types';
import Questionnaire from './Questionnaire';
import { Helmet } from 'react-helmet-async';
import { SectionLabel, StravaSection, ScreenshotsSlider, PricingPreview } from './landing/SharedSections';

interface MarathonLandingProps {
  user: User | null;
  onPlanGeneration: (answers: any) => void;
  isGenerating: boolean;
}

const MarathonLanding: React.FC<MarathonLandingProps> = ({ user, onPlanGeneration, isGenerating }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Combien de semaines pour préparer un marathon ?",
      answer: "La durée idéale dépend de votre niveau. Un débutant devrait prévoir 16 à 20 semaines de préparation. Un coureur intermédiaire peut se préparer en 12 à 16 semaines. Les coureurs confirmés visant un record personnel opteront pour 12 semaines de travail spécifique. Coach Running IA adapte automatiquement la durée du plan à votre profil."
    },
    {
      question: "Comment calculer son allure marathon ?",
      answer: "Votre allure marathon dépend de votre VMA (Vitesse Maximale Aérobie). En général, l'allure marathon se situe entre 75% et 85% de votre VMA. Par exemple, avec une VMA de 15 km/h, votre allure marathon sera autour de 5'20\"/km (sub 3h45). Notre IA calcule votre allure optimale à partir de vos chronos récents et de votre VMA."
    },
    {
      question: "Quel volume d'entraînement pour un marathon ?",
      answer: "Le volume varie selon votre niveau : 40-50 km/semaine pour un débutant, 50-70 km/semaine pour un intermédiaire, et 70-100+ km/semaine pour un confirmé. La montée en charge doit être progressive (pas plus de 10% par semaine). Le plan inclut des semaines d'allégement régulières pour éviter le surentraînement."
    },
    {
      question: "Faut-il faire une sortie longue de 42 km avant le marathon ?",
      answer: "Non, il n'est pas nécessaire de courir la distance complète à l'entraînement. La sortie longue maximale se situe généralement entre 30 et 35 km, réalisée 3 à 4 semaines avant la course. Au-delà, le risque de blessure et la fatigue accumulée dépassent les bénéfices. Le plan Coach Running IA programme vos sorties longues avec une progression optimale."
    },
    {
      question: "Qu'est-ce que la phase d'affûtage avant un marathon ?",
      answer: "L'affûtage (ou taper) est la réduction progressive du volume d'entraînement durant les 2 à 3 dernières semaines avant la course. Le volume diminue de 40 à 60% tandis que l'intensité est maintenue. Cette phase permet au corps de récupérer tout en conservant les adaptations. Le plan généré par notre IA intègre automatiquement cette phase cruciale."
    },
    {
      question: "Le plan marathon est-il exportable sur ma montre GPS ?",
      answer: "Oui ! Votre plan est exportable en PDF et ajouteable à votre calendrier iPhone ou Google Calendar. L'intégration directe Garmin et Coros arrive bientôt. Chaque séance apparaît avec les détails d'allure et de distance."
    }
  ];

  return (
    <div className="bg-white">
      <Helmet>
        <title>Plan Entraînement Marathon par IA | Coach Running IA</title>
        <meta name="description" content="Plan entraînement marathon personnalisé. 12-20 semaines, allures VMA, suivi Strava, ajustements auto. Du 1er marathon au sub 3h. Essai gratuit." />
        <meta name="keywords" content="plan entraînement marathon, programme marathon personnalisé, plan marathon 16 semaines, plan marathon débutant, plan marathon sub 3h30, plan marathon sub 4h, préparation marathon IA" />
        <link rel="canonical" href="https://coachrunningia.fr/plan-marathon" />
        <meta property="og:title" content="Plan Entraînement Marathon par IA | Coach Running IA" />
        <meta property="og:description" content="Plan entraînement marathon personnalisé. 12-20 semaines, allures VMA, suivi Strava. Essai gratuit." />
        <meta property="og:url" content="https://coachrunningia.fr/plan-marathon" />
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
        <meta name="twitter:title" content="Plan Entraînement Marathon par IA | Coach Running IA" />
        <meta name="twitter:description" content="Plan entraînement marathon personnalisé. 12-20 semaines, allures VMA, suivi Strava, ajustements auto. Essai gratuit." />
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
            Plan entraînement <span className="text-accent">marathon</span> personnalisé
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-6 max-w-3xl mx-auto">
            Programme 42,195 km sur-mesure généré par IA. Adapté à votre niveau, que ce soit votre premier marathon ou que vous visiez un record personnel.
          </p>
          <p className="text-slate-400 text-sm mb-6">✓ 1ère semaine gratuite ✓ Sans carte bancaire ✓ Plan 12 à 20 semaines</p>
          <button
            onClick={() => document.getElementById('questionnaire-marathon')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2 mb-4"
          >
            Créer mon plan marathon gratuit
            <ArrowRight size={20} />
          </button>
          <div className="inline-flex items-center gap-1.5 text-slate-500 opacity-50">
            <span className="text-[11px]">Powered by</span>
            <svg className="w-3 h-3 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor" aria-label="Logo Strava"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            <span className="text-[11px] font-medium text-[#FC4C02]">Strava</span>
          </div>
        </div>
      </section>

      {/* QUESTIONNAIRE */}
      <section id="questionnaire-marathon" className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 mb-4">
            Créez votre plan marathon en 2 minutes
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Répondez à quelques questions pour recevoir votre programme marathon personnalisé
          </p>
          <Questionnaire
            onComplete={onPlanGeneration}
            isGenerating={isGenerating}
            user={user}
            initialGoal={UserGoal.ROAD_RACE}
            initialSubGoal="Marathon"
          />
        </div>
      </section>

      {/* SCREENSHOTS SLIDER */}
      <ScreenshotsSlider />

      {/* SECTION: PLAN MARATHON GENERIQUE VS IA */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-accent font-bold text-sm tracking-wider uppercase mb-3">Ce qui change tout sur marathon</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Plan marathon PDF vs plan marathon IA
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Les plans gratuits en PDF vous donnent un cadre. Coach Running IA vous donne VOTRE plan.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-lg">{"📄"}</div>
                <h3 className="font-bold text-slate-400 text-lg">Plan marathon générique</h3>
              </div>
              <div className="space-y-3 text-slate-400 text-sm">
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Allure marathon fixe — <strong>la même pour tout le monde</strong>, sans tenir compte de votre VMA</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Volume identique que vous couriez 30 ou 60 km/semaine</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Sortie longue figée à 30 km — sans progression adaptée</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Aucun ajustement si vous êtes fatigué ou blessé</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Pas de phase d'affûtage calibrée à votre profil</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Un PDF qu'on oublie au fond de ses mails</span></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border-2 border-accent/30 relative">
              <div className="absolute -top-3 right-4 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">RECOMMANDÉ</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-lg">{"🏃"}</div>
                <h3 className="font-bold text-slate-900 text-lg">Coach Running IA</h3>
              </div>
              <div className="space-y-3 text-slate-700 text-sm">
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Allure marathon calculée sur votre VMA</strong> — seuil, allure spé et endurance calibrés</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Volume progressif</strong> adapté à votre kilométrage actuel (pas de choc de charge)</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Sortie longue progressive</strong> de 15 à 32 km avec allure et nutrition intégrées</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Feedback hebdomadaire</strong> — le plan se réajuste à votre ressenti et vos données Strava</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Affûtage automatique</strong> — réduction de volume dosée les 2-3 dernières semaines</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Calendrier visuel</strong> semaine par semaine + export Google Calendar / PDF</span></div>
              </div>
            </div>
          </div>
          <p className="text-center text-slate-400 text-sm mt-8 max-w-xl mx-auto">
            Un plan marathon PDF est un point de départ. Un plan marathon IA est un <strong className="text-slate-600">coach qui connaît votre VMA, votre volume et vos jours dispo</strong>.
          </p>
        </div>
      </section>

      {/* POURQUOI UN PLAN PERSONNALISE */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-4">
            Pourquoi un plan marathon personnalisé ?
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
            Le marathon (42,195 km) ne s'improvise pas. Un plan adapté à VOTRE profil est la clé pour franchir la ligne d'arrivée.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Objectif chrono adapté</h3>
              <p className="text-slate-500">L'IA analyse votre niveau et vos chronos récents pour définir un objectif réaliste et motivant.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Volume progressif</h3>
              <p className="text-slate-500">Montée en charge progressive pour atteindre 60-80 km/semaine sans risque de blessure.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Affûtage optimal</h3>
              <p className="text-slate-500">Les 2-3 dernières semaines sont cruciales. Le plan intègre une phase de relâchement parfaitement dosée.</p>
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => document.getElementById('questionnaire-marathon')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
            >
              Générer mon plan marathon
  <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* CONTENU SEO */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <SectionLabel variant="slate">Guide marathon</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Comment préparer un marathon ?
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Le marathon est l'épreuve reine de la course à pied. Une préparation structurée de 12 à 20 semaines est indispensable : sorties longues, allure spécifique, seuil et récupération.
            </p>
          </div>

          <div className="grid gap-5">
            <div className="bg-white border-l-4 border-orange-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm shrink-0">1</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Durée idéale du plan marathon</h3>
                  <p className="text-slate-600">Pour un <strong>premier marathon</strong>, prévoyez 16 à 20 semaines. Les coureurs <strong>expérimentés</strong> peuvent opter pour 12 à 16 semaines. Coach Running IA adapte la durée en fonction de votre expérience, VMA et disponibilités.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-l-4 border-orange-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm shrink-0">2</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Les piliers d'un bon plan marathon</h3>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>La sortie longue</strong> : jusqu'à 30-35 km, pierre angulaire de la préparation</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>L'allure marathon</strong> : séances à votre allure cible pour mémoriser le rythme</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Le seuil</strong> : améliorer votre capacité à tenir un effort prolongé</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>La récupération</strong> : footings lents et jours off pour assimiler la charge</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Le renforcement musculaire</strong> : gainage, squats et exercices spécifiques</span></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border-l-4 border-orange-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm shrink-0">3</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Temps de passage réalistes au marathon</h3>
                  <p className="text-slate-600 mb-3">Utilisez notre <Link to="/outils/allure-marathon" className="text-orange-500 hover:underline font-medium">calculateur d'allure marathon</Link> pour estimer votre pace.</p>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>4h30 - 5h00</strong> : 6'24" à 7'07"/km — la majorité des premiers marathoniens</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>4h00 - 4h30</strong> : 5'41" à 6'24"/km — coureurs réguliers, 1-2 ans de pratique</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>3h30 - 4h00</strong> : 4'59" à 5'41"/km — coureurs expérimentés, 4-5x/semaine</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Moins de 3h30</strong> : sous 4'59"/km — niveau compétiteur, 60-80+ km/semaine</span></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border-l-4 border-orange-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm shrink-0">4</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Les erreurs à éviter en préparation marathon</h3>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Augmenter le volume trop vite</strong> : respectez la règle des 10% max/semaine</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Négliger la récupération</strong> : les jours de repos font partie de l'entraînement</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Partir trop vite le jour J</strong> : les premiers kilomètres doivent être courus en retenue</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Ignorer la nutrition</strong> : testez votre stratégie de ravitaillement à l'entraînement</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TEMOIGNAGE */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="text-yellow-500 fill-yellow-500" size={18} />)}
            </div>
            <p className="text-slate-600 mb-6 italic text-lg">
              "Après 10 marathons, je pensais avoir tout vu. Coach Running IA m'a proposé des <span className="font-bold text-slate-900">séances variées et intelligentes</span> que je n'avais jamais essayées. La qualité et la diversité m'ont vraiment surpris."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">D</div>
              <div>
                <div className="font-bold text-slate-900">David</div>
                <div className="text-sm text-slate-500">Multi-marathonien & Finisher Ironman, 59 ans</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-12">
            Questions fréquentes sur le plan marathon
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
              <p className="text-slate-500 text-sm">Programme 21km personnalisé par IA</p>
            </Link>
            <Link to="/plan-trail" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Trail</h3>
              <p className="text-slate-500 text-sm">Programme trail running avec dénivelé</p>
            </Link>
            <Link to="/outils/allure-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Calculateur Allure Marathon</h3>
              <p className="text-slate-500 text-sm">Trouvez votre pace idéal</p>
            </Link>
            <Link to="/outils/convertisseur-miles-km" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Convertisseur Miles / Km</h3>
              <p className="text-slate-500 text-sm">Distances et allures miles ↔ km</p>
            </Link>
          </div>
        </div>
      </section>

      {/* STRAVA */}
      <StravaSection discipline="marathon" />

      {/* PRICING */}
      <PricingPreview />

      {/* CTA FINAL */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Prêt à conquérir votre marathon ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Obtenez votre plan entraînement marathon personnalisé en moins de 2 minutes
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2"
          >
            Générer mon plan marathon
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default MarathonLanding;
