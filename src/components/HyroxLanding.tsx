import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Target, Zap, Star, ArrowRight, X, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { User, UserGoal } from '../types';
import Questionnaire from './Questionnaire';
import { Helmet } from 'react-helmet-async';

interface HyroxLandingProps {
  user: User | null;
  onPlanGeneration: (answers: any) => void;
  isGenerating: boolean;
}

const HyroxLanding: React.FC<HyroxLandingProps> = ({ user, onPlanGeneration, isGenerating }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Ce programme inclut-il les exercices fonctionnels Hyrox (sled, wall balls, rameur) ?",
      answer: "Non, ce programme couvre exclusivement la partie course à pied de votre préparation Hyrox. Les 8 km de running représentent une part majeure de votre performance Hyrox. Combinez ce plan avec vos entraînements fonctionnels habituels (sled push, sled pull, wall balls, burpees, rameur, farmers carry, lunges) sur les jours off ou en complément des footings."
    },
    {
      question: "Pourquoi un plan running spécifique pour Hyrox ?",
      answer: "En Hyrox, vous courez 8 × 1 km entrecoupés de stations fonctionnelles. Cet effort est très différent d'un 10 km classique : il faut savoir relancer sous fatigue, maintenir une allure seuil après un effort non-running, et gérer la fatigue cardiaque cumulative. Un plan 10 km générique ne vous prépare pas à cela. Notre plan inclut des simulations 8×1km, des relances sous fatigue et du tempo spécifique."
    },
    {
      question: "Combien de séances running par semaine pour préparer un Hyrox ?",
      answer: "Le plan propose 3 à 5 séances de course par semaine selon votre niveau et votre disponibilité, en tenant compte du fait que vous faites du fonctionnel à côté. L'équilibre entre running et fonctionnel est essentiel : trop de running = pas assez de récupération pour les stations, pas assez = vous perdrez du temps sur les 8 km."
    },
    {
      question: "Quelle VMA pour performer en Hyrox ?",
      answer: "En Hyrox, les 1 km se courent généralement à allure seuil (85-90% VMA). Avec une VMA de 14 km/h, vos 1 km seront autour de 4'10-4'20/km. Avec une VMA de 16+, vous pourrez descendre sous les 3'45/km. La VMA est calculée automatiquement à partir de vos chronos récents (5 km, 10 km, semi ou marathon)."
    },
    {
      question: "Le plan est-il adapté pour un premier Hyrox ?",
      answer: "Oui, le plan s'adapte à tous les niveaux. Pour un débutant, il mettra l'accent sur l'endurance fondamentale et la capacité à enchaîner les efforts. Pour un compétiteur, il intégrera des simulations Hyrox intensives et du travail au seuil poussé. L'IA calibre le plan sur votre VMA et votre volume actuel."
    },
    {
      question: "Puis-je combiner ce plan avec ma box CrossFit ou ma salle de sport ?",
      answer: "Absolument, c'est même recommandé. Le plan running est conçu pour se combiner avec 2-3 séances de fonctionnel par semaine. Placez vos séances fonctionnelles sur les jours de footing EF (endurance facile) ou les jours off du plan running. Évitez de cumuler une séance de seuil running et une séance fonctionnelle intense le même jour."
    }
  ];

  return (
    <div className="bg-white">
      <Helmet>
        <title>Programme Course à Pied Hyrox — Plan d'Entraînement Running Hyrox Personnalisé | Coach Running IA</title>
        <meta name="description" content="Programme course à pied Hyrox personnalisé par IA : plan d'entraînement running spécifique avec simulations 8×1km au seuil, relances sous fatigue et tempo. À combiner avec votre préparation fonctionnelle. 1ère semaine gratuite." />
        <meta name="keywords" content="programme course à pied hyrox, plan running hyrox, entraînement course hyrox, préparation running hyrox, plan hyrox course à pied, améliorer running hyrox, 8x1km hyrox, allure hyrox, entraînement hyrox running" />
        <link rel="canonical" href="https://coachrunningia.fr/plan-hyrox" />
        <meta property="og:title" content="Programme Course à Pied Hyrox — Plan d'Entraînement Personnalisé | Coach Running IA" />
        <meta property="og:description" content="Programme course à pied Hyrox : plan d'entraînement running avec simulations 8×1km, relances sous fatigue. 1ère semaine gratuite." />
        <meta property="og:url" content="https://coachrunningia.fr/plan-hyrox" />
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
        <meta name="twitter:title" content="Programme Course à Pied Hyrox — Plan d'Entraînement Personnalisé | Coach Running IA" />
        <meta name="twitter:description" content="Programme course à pied Hyrox : plan d'entraînement running avec simulations 8×1km, relances sous fatigue. 1ère semaine gratuite." />
        <meta name="twitter:image" content="https://coachrunningia.fr/og-image.png" />
      </Helmet>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-400 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            Programme course à pied <span className="text-accent">Hyrox</span> personnalisé
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-3xl mx-auto">
            Optimisez vos 8 km de running pour performer en Hyrox. Plan spécifique généré par IA, à combiner avec votre entraînement fonctionnel.
          </p>
          <p className="text-orange-300 text-sm mb-6 font-medium">Ce programme couvre la partie COURSE À PIED uniquement</p>
          <p className="text-slate-400 text-sm mb-6">✓ 1ère semaine gratuite ✓ Sans carte bancaire ✓ Plan 8 à 16 semaines</p>
          <button
            onClick={() => document.getElementById('questionnaire-hyrox')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2 mb-4"
          >
            Créer mon plan Hyrox gratuit
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
      <section id="questionnaire-hyrox" className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 mb-4">
            Créez votre programme running Hyrox en 2 minutes
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Répondez à quelques questions pour recevoir votre plan course à pied spécifique Hyrox
          </p>
          <Questionnaire
            onComplete={onPlanGeneration}
            isGenerating={isGenerating}
            user={user}
            initialGoal={UserGoal.HYROX}
          />
        </div>
      </section>

      {/* SECTION: PLAN GENERIQUE vs PLAN HYROX IA */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-accent font-bold text-sm tracking-wider uppercase mb-3">Ce qui change tout pour Hyrox</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Plan d'entraînement course à pied Hyrox vs plan 10km générique
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Un plan 10km classique ne vous prépare pas au format unique du Hyrox.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-lg">{"📄"}</div>
                <h3 className="font-bold text-slate-400 text-lg">Plan 10km classique</h3>
              </div>
              <div className="space-y-3 text-slate-400 text-sm">
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Course continue — ne simule pas les <strong>coupures entre les km</strong></span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Pas de travail de <strong>relance sous fatigue</strong> après effort fonctionnel</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Allures basées sur un <strong>10km continu</strong>, pas sur des 8×1km</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Ne tient pas compte de votre <strong>charge fonctionnelle</strong> à côté</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Volume parfois <strong>trop élevé</strong> pour quelqu'un qui fait du CrossFit</span></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border-2 border-accent/30 relative">
              <div className="absolute -top-3 right-4 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">SPÉCIFIQUE HYROX</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-lg">{"🏋️"}</div>
                <h3 className="font-bold text-slate-900 text-lg">Coach Running IA — Hyrox</h3>
              </div>
              <div className="space-y-3 text-slate-700 text-sm">
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Simulation 8×1km</strong> à allure seuil avec récupération — reproduit l'effort Hyrox</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Relances sous fatigue</strong> — apprendre à repartir vite après une station</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Allures calibrées sur votre VMA</strong> — seuil, tempo et récupération personnalisés</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Volume adapté</strong> à votre charge fonctionnelle (CrossFit, salle, box)</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Renfo prévention</strong> blessure intégré (gainage, mollets, proprioception)</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Export calendrier</strong> — intégrez vos séances dans votre planning global</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POURQUOI UN PLAN RUNNING SPECIFIQUE HYROX */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-4">
            Pourquoi un plan d'entraînement course à pied Hyrox spécifique ?
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
            Le running représente 8 km de votre Hyrox. C'est souvent là où se gagnent (ou se perdent) les minutes.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">8×1km au seuil</h3>
              <p className="text-slate-500">Les simulations Hyrox vous apprennent à maintenir votre allure seuil malgré la fatigue des stations.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Relances sous fatigue</h3>
              <p className="text-slate-500">Apprenez à relancer immédiatement après un effort intense — la clé pour ne pas perdre de temps entre les stations.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Volume adapté</h3>
              <p className="text-slate-500">Le plan tient compte de votre charge fonctionnelle à côté pour éviter le surentraînement.</p>
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => document.getElementById('questionnaire-hyrox')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
            >
              Générer mon plan running Hyrox
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* CONTENU SEO */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-black text-slate-900 mb-8">
            Comment préparer la partie course à pied de l'Hyrox ?
          </h2>

          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-600 mb-6">
              Le Hyrox est une compétition de fitness racing qui combine 8 stations fonctionnelles avec 8 × 1 km de course à pied. Au total, vous courez 8 km, mais pas en continu : chaque kilomètre est entrecoupé d'un exercice intense (sled push, rameur, wall balls, etc.). Cette spécificité rend la préparation running du Hyrox unique.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">L'effort running en Hyrox : un format unique</h3>
            <p className="text-slate-600 mb-4">
              Contrairement à un 10 km classique, le running Hyrox est un effort fractionné par nature. Vos 8 km sont courus en 8 segments de 1 km, chacun précédé et suivi d'une station fonctionnelle. Cela signifie que vous devez être capable de <strong>relancer à allure seuil après un effort non-running</strong> — c'est la compétence clé que notre programme course à pied Hyrox développe.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Les séances clés du programme course à pied Hyrox</h3>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>Simulation Hyrox (8×1km)</strong> : la séance reine. 8 répétitions de 1 km à allure seuil avec 2 min de récupération entre chaque. Reproduit fidèlement l'effort de course en compétition.</li>
              <li><strong>Relances sous fatigue</strong> : footing facile puis accélérations intenses. Simule la capacité à repartir fort après une station fonctionnelle.</li>
              <li><strong>Tempo Run</strong> : 20-30 min à allure seuil continu. Développe l'endurance spécifique nécessaire pour maintenir le rythme sur les 8 km cumulés.</li>
              <li><strong>Footing en endurance fondamentale</strong> : base aérobique indispensable. Plus votre base est solide, plus vous récupérez vite entre les stations.</li>
              <li><strong>Renforcement prévention</strong> : gainage, quadriceps, mollets — protège contre les blessures liées à la charge combinée running + fonctionnel.</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Combiner entraînement running et fonctionnel</h3>
            <p className="text-slate-600 mb-4">
              Ce programme couvre <strong>uniquement la partie course à pied</strong> de votre préparation Hyrox. Il est conçu pour se combiner avec 2 à 3 séances fonctionnelles par semaine (CrossFit, box Hyrox, salle de sport). Placez vos séances fonctionnelles intensives sur les jours de footing facile ou les jours off du plan running.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Objectifs de temps running en Hyrox par niveau</h3>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>Débutant (VMA 12-13)</strong> : 1km en 4'30-5'00 — objectif running total ~36-40 min</li>
              <li><strong>Intermédiaire (VMA 14-15)</strong> : 1km en 4'00-4'20 — objectif running total ~32-35 min</li>
              <li><strong>Confirmé (VMA 16+)</strong> : 1km en 3'30-3'50 — objectif running total ~28-31 min</li>
              <li><strong>Élite (VMA 18+)</strong> : 1km sous 3'20 — objectif running total sous 27 min</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-12">
            Questions fréquentes — Programme running Hyrox
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
            <Link to="/plan-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Marathon</h3>
              <p className="text-slate-500 text-sm">Programme 42km personnalisé par IA</p>
            </Link>
            <Link to="/plan-semi-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Semi-Marathon</h3>
              <p className="text-slate-500 text-sm">Programme 21km personnalisé par IA</p>
            </Link>
            <Link to="/plan-trail" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Trail</h3>
              <p className="text-slate-500 text-sm">Programme trail running avec dénivelé</p>
            </Link>
            <Link to="/outils/calculateur-vma" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Calculateur VMA</h3>
              <p className="text-slate-500 text-sm">Estimez votre VMA gratuitement</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Prêt à optimiser votre running Hyrox ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Obtenez votre programme course à pied spécifique Hyrox en moins de 2 minutes
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2"
          >
            Générer mon plan Hyrox
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default HyroxLanding;
