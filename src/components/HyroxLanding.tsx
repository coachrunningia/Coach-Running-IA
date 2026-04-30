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
      answer: "Non, ce programme couvre exclusivement la partie course a pied de votre preparation Hyrox. Les 8 km de running representent une part majeure de votre performance Hyrox. Combinez ce plan avec vos entrainements fonctionnels habituels (sled push, sled pull, wall balls, burpees, rameur, farmers carry, lunges) sur les jours off ou en complement des footings."
    },
    {
      question: "Pourquoi un plan running specifique pour Hyrox ?",
      answer: "En Hyrox, vous courez 8 x 1 km entrecoupes de stations fonctionnelles. Cet effort est tres different d'un 10 km classique : il faut savoir relancer sous fatigue, maintenir une allure seuil apres un effort non-running, et gerer la fatigue cardiaque cumulative. Un plan 10 km generique ne vous prepare pas a cela. Notre plan inclut des simulations 8x1km, des relances sous fatigue et du tempo specifique."
    },
    {
      question: "Combien de seances running par semaine pour Hyrox ?",
      answer: "Le plan propose 3 a 5 seances de course par semaine selon votre niveau et votre disponibilite, en tenant compte du fait que vous faites du fonctionnel a cote. L'equilibre entre running et fonctionnel est essentiel : trop de running = pas assez de recuperation pour les stations, pas assez = vous perdrez du temps sur les 8 km."
    },
    {
      question: "Quelle VMA pour performer en Hyrox ?",
      answer: "En Hyrox, les 1 km se courent generalement a allure seuil (85-90% VMA). Avec une VMA de 14 km/h, vos 1 km seront autour de 4'10-4'20/km. Avec une VMA de 16+, vous pourrez descendre sous les 3'45/km. La VMA est calculee automatiquement a partir de vos chronos recents (5 km, 10 km, semi ou marathon)."
    },
    {
      question: "Le plan est-il adapte pour un premier Hyrox ?",
      answer: "Oui, le plan s'adapte a tous les niveaux. Pour un debutant, il mettra l'accent sur l'endurance fondamentale et la capacite a enchainer les efforts. Pour un competiteur, il integrera des simulations Hyrox intensives et du travail au seuil pousse. L'IA calibre le plan sur votre VMA et votre volume actuel."
    },
    {
      question: "Puis-je combiner ce plan avec ma box CrossFit ou ma salle ?",
      answer: "Absolument, c'est meme recommande. Le plan running est concu pour se combiner avec 2-3 seances de fonctionnel par semaine. Placez vos seances fonctionnelles sur les jours de footing EF (endurance facile) ou les jours off du plan running. Evitez de cumuler une seance de seuil running et une seance fonctionnelle intense le meme jour."
    }
  ];

  return (
    <div className="bg-white">
      <Helmet>
        <title>Programme Course a Pied Hyrox | Plan Running Specifique Hyrox | Coach Running IA</title>
        <meta name="description" content="Optimisez votre partie running Hyrox avec un plan course a pied specifique : simulations 8x1km, relances sous fatigue, tempo seuil. A combiner avec votre entrainement fonctionnel. 1ere semaine gratuite." />
        <meta name="keywords" content="programme course hyrox, plan running hyrox, entrainement course hyrox, preparation running hyrox, plan hyrox course a pied, ameliorer running hyrox, 8x1km hyrox, allure hyrox" />
        <link rel="canonical" href="https://coachrunningia.fr/plan-hyrox" />
        <meta property="og:title" content="Programme Course a Pied Hyrox | Coach Running IA" />
        <meta property="og:description" content="Plan running specifique Hyrox : simulations 8x1km, relances sous fatigue, tempo seuil. 1ere semaine gratuite." />
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
        <meta name="twitter:title" content="Programme Course a Pied Hyrox | Coach Running IA" />
        <meta name="twitter:description" content="Optimisez votre partie running Hyrox avec un plan specifique. Simulations 8x1km, relances sous fatigue. 1ere semaine gratuite." />
        <meta name="twitter:image" content="https://coachrunningia.fr/og-image.png" />
      </Helmet>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900 text-white py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            Programme course a pied <span className="text-violet-400">Hyrox</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-3xl mx-auto">
            Optimisez vos 8 km de running pour performer en Hyrox. Plan specifique genere par IA, a combiner avec votre entrainement fonctionnel.
          </p>
          <p className="text-violet-300 text-sm mb-6 font-medium">Ce programme couvre la partie COURSE A PIED uniquement</p>
          <p className="text-slate-400 text-sm mb-6">1ere semaine gratuite - Sans carte bancaire - Plan 8 a 16 semaines</p>
          <button
            onClick={() => document.getElementById('questionnaire-hyrox')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-violet-500 hover:bg-violet-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2 mb-4"
          >
            Creer mon plan Hyrox gratuit
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
            Creez votre plan running Hyrox en 2 minutes
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Repondez a quelques questions pour recevoir votre programme course a pied specifique Hyrox
          </p>
          <Questionnaire
            onComplete={onPlanGeneration}
            isGenerating={isGenerating}
            user={user}
            initialGoal={UserGoal.HYROX}
          />
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-violet-500 font-bold text-sm tracking-wider uppercase mb-3">Ce qui change tout</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Plan 10km generique vs plan running Hyrox specifique
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Un plan 10km classique ne vous prepare pas au format unique du Hyrox.
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
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Pas de travail de <strong>relance sous fatigue</strong> apres effort fonctionnel</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Allures basees sur un <strong>10km continu</strong>, pas sur des 8x1km</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Ne tient pas compte de votre <strong>charge fonctionnelle</strong> a cote</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Volume parfois <strong>trop eleve</strong> pour quelqu'un qui fait du CrossFit</span></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-6 border-2 border-violet-300 relative">
              <div className="absolute -top-3 right-4 bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-full">SPECIFIQUE HYROX</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-lg">{"🏋️"}</div>
                <h3 className="font-bold text-slate-900 text-lg">Coach Running IA — Hyrox</h3>
              </div>
              <div className="space-y-3 text-slate-700 text-sm">
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Simulation 8x1km</strong> a allure seuil avec recuperation — reproduit l'effort Hyrox</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Relances sous fatigue</strong> — apprendre a repartir vite apres une station</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Allures calibrees sur votre VMA</strong> — seuil, tempo et recuperation personnalises</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Volume adapte</strong> a votre charge fonctionnelle (CrossFit, salle, box)</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Renfo prevention</strong> blessure integre (gainage, mollets, proprioception)</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Export calendrier</strong> — integrez vos seances dans votre planning global</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-4">
            Pourquoi un plan running specifique Hyrox ?
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
            Le running represente 8 km de votre Hyrox. C'est souvent la ou se gagnent (ou se perdent) les minutes.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="text-violet-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">8x1km au seuil</h3>
              <p className="text-slate-500">Les simulations Hyrox vous apprennent a maintenir votre allure seuil malgre la fatigue des stations.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="text-violet-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Relances sous fatigue</h3>
              <p className="text-slate-500">Apprenez a relancer immediatement apres un effort intense — la cle pour ne pas perdre de temps entre les stations.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="text-violet-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Volume adapte</h3>
              <p className="text-slate-500">Le plan tient compte de votre charge fonctionnelle a cote pour eviter le surentrainement.</p>
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => document.getElementById('questionnaire-hyrox')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-violet-500 hover:bg-violet-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
            >
              Generer mon plan running Hyrox
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* SEO CONTENT */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-black text-slate-900 mb-8">
            Comment preparer la partie course a pied du Hyrox ?
          </h2>

          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-600 mb-6">
              Le Hyrox est une competition de fitness racing qui combine 8 stations fonctionnelles avec 8 x 1 km de course a pied. Au total, vous courez 8 km, mais pas en continu : chaque kilometre est entrecoupes d'un exercice intense (sled push, rameur, wall balls, etc.). Cette specificite rend la preparation running du Hyrox unique.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">L'effort running en Hyrox</h3>
            <p className="text-slate-600 mb-4">
              Contrairement a un 10 km classique, le running Hyrox est un effort fractionne par nature. Vos 8 km sont courus en 8 segments de 1 km, chacun precede et suivi d'une station fonctionnelle. Cela signifie que vous devez etre capable de <strong>relancer a allure seuil apres un effort non-running</strong> — c'est la competence cle que notre plan developpe.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Les seances cles du plan running Hyrox</h3>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>Simulation Hyrox (8x1km)</strong> : la seance reine. 8 repetitions de 1 km a allure seuil avec 2 min de recuperation entre chaque. Reproduit fidelement l'effort de course en competition.</li>
              <li><strong>Relances sous fatigue</strong> : footing facile puis accelerations intenses. Simule la capacite a repartir fort apres une station.</li>
              <li><strong>Tempo Run</strong> : 20-30 min a allure seuil continu. Developpe l'endurance specifique necessaire pour maintenir le rythme sur les 8 km cumules.</li>
              <li><strong>Footing en endurance fondamentale</strong> : base aerobique indispensable. Plus votre base est solide, plus vous recuperez vite entre les stations.</li>
              <li><strong>Renforcement prevention</strong> : gainage, quadriceps, mollets — protege contre les blessures liees a la charge combinee running + fonctionnel.</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Combiner running et fonctionnel</h3>
            <p className="text-slate-600 mb-4">
              Ce programme couvre <strong>uniquement la partie course a pied</strong> de votre preparation. Il est concu pour se combiner avec 2 a 3 seances fonctionnelles par semaine (CrossFit, box Hyrox, salle de sport). Placez vos seances fonctionnelles intensives sur les jours de footing facile ou les jours off du plan running.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Objectifs de temps running en Hyrox</h3>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>Debutant (VMA 12-13)</strong> : 1km en 4'30-5'00 — objectif running total ~36-40 min</li>
              <li><strong>Intermediaire (VMA 14-15)</strong> : 1km en 4'00-4'20 — objectif running total ~32-35 min</li>
              <li><strong>Confirme (VMA 16+)</strong> : 1km en 3'30-3'50 — objectif running total ~28-31 min</li>
              <li><strong>Elite (VMA 18+)</strong> : 1km sous 3'20 — objectif running total sous 27 min</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-12">
            Questions frequentes — Running Hyrox
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:border-violet-200 hover:shadow-md transition-all">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                  <span className="font-bold text-slate-800 pr-4">{faq.question}</span>
                  {openFaq === index ? <ChevronUp className="text-violet-500 shrink-0" size={20} /> : <ChevronDown className="text-slate-400 shrink-0" size={20} />}
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

      {/* INTERNAL LINKS */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-black text-center text-slate-900 mb-8">
            Decouvrez aussi nos autres programmes
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Link to="/plan-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-violet-300 hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Marathon</h3>
              <p className="text-slate-500 text-sm">Programme 42km personnalise par IA</p>
            </Link>
            <Link to="/plan-semi-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-violet-300 hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Semi-Marathon</h3>
              <p className="text-slate-500 text-sm">Programme 21km personnalise par IA</p>
            </Link>
            <Link to="/plan-trail" className="block rounded-2xl border border-slate-200 p-6 hover:border-violet-300 hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Trail</h3>
              <p className="text-slate-500 text-sm">Programme trail running avec denivele</p>
            </Link>
            <Link to="/outils/calculateur-vma" className="block rounded-2xl border border-slate-200 p-6 hover:border-violet-300 hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Calculateur VMA</h3>
              <p className="text-slate-500 text-sm">Estimez votre VMA gratuitement</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Pret a optimiser votre running Hyrox ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Obtenez votre plan course a pied specifique Hyrox en moins de 2 minutes
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-violet-500 hover:bg-violet-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2"
          >
            Generer mon plan Hyrox
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default HyroxLanding;
