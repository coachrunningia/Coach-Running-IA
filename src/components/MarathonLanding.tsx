import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Target, Zap, Star, ArrowRight, X, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { User, UserGoal } from '../types';
import Questionnaire from './Questionnaire';
import { Helmet } from 'react-helmet-async';

interface MarathonLandingProps {
  user: User | null;
  onPlanGeneration: (answers: any) => void;
  isGenerating: boolean;
}

const MarathonLanding: React.FC<MarathonLandingProps> = ({ user, onPlanGeneration, isGenerating }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Combien de semaines pour preparer un marathon ?",
      answer: "La duree ideale depend de votre niveau. Un debutant devrait prevoir 16 a 20 semaines de preparation. Un coureur intermediaire peut se preparer en 12 a 16 semaines. Les coureurs confirmes visant un record personnel opteront pour 12 semaines de travail specifique. Coach Running IA adapte automatiquement la duree du plan a votre profil."
    },
    {
      question: "Comment calculer son allure marathon ?",
      answer: "Votre allure marathon depend de votre VMA (Vitesse Maximale Aerobie). En general, l'allure marathon se situe entre 75% et 85% de votre VMA. Par exemple, avec une VMA de 15 km/h, votre allure marathon sera autour de 5'20\"/km (sub 3h45). Notre IA calcule votre allure optimale a partir de vos chronos recents et de votre VMA."
    },
    {
      question: "Quel volume d'entrainement pour un marathon ?",
      answer: "Le volume varie selon votre niveau : 40-50 km/semaine pour un debutant, 50-70 km/semaine pour un intermediaire, et 70-100+ km/semaine pour un confirme. La montee en charge doit etre progressive (pas plus de 10% par semaine). Le plan inclut des semaines d'allegement regulieres pour eviter le surentrainement."
    },
    {
      question: "Faut-il faire une sortie longue de 42 km avant le marathon ?",
      answer: "Non, il n'est pas necessaire de courir la distance complete a l'entrainement. La sortie longue maximale se situe generalement entre 30 et 35 km, realisee 3 a 4 semaines avant la course. Au-dela, le risque de blessure et la fatigue accumulee depassent les benefices. Le plan Coach Running IA programme vos sorties longues avec une progression optimale."
    },
    {
      question: "Qu'est-ce que la phase d'affutage avant un marathon ?",
      answer: "L'affutage (ou taper) est la reduction progressive du volume d'entrainement durant les 2 a 3 dernieres semaines avant la course. Le volume diminue de 40 a 60% tandis que l'intensite est maintenue. Cette phase permet au corps de recuperer tout en conservant les adaptations. Le plan genere par notre IA integre automatiquement cette phase cruciale."
    },
    {
      question: "Le plan marathon est-il exportable sur ma montre GPS ?",
      answer: "Oui ! Votre plan est exportable sur les montres Garmin, Coros et Suunto. Vous pouvez aussi l'exporter en PDF, ou l'ajouter a votre calendrier iPhone ou Google Calendar. Chaque seance apparait avec les details d'allure et de distance."
    }
  ];

  return (
    <div className="bg-white">
      <Helmet>
        <title>Plan Entrainement Marathon - Programme IA Personnalise | Coach Running IA</title>
        <meta name="description" content="Creez votre plan entrainement marathon personnalise par IA en 2 min. Programme 12-20 semaines, export Garmin/Coros, 1ere semaine gratuite. Tous niveaux." />
        <meta name="keywords" content="plan entrainement marathon, programme marathon, plan marathon 16 semaines, plan marathon debutant, plan marathon sub 4h, preparation marathon" />
        <link rel="canonical" href="https://coachrunningia.fr/plan-marathon" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": { "@type": "Answer", "text": faq.answer }
          }))
        })}</script>
      </Helmet>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            Plan entrainement <span className="text-accent">marathon</span> personnalise
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-6 max-w-3xl mx-auto">
            Programme 42,195 km sur-mesure genere par IA. Adapte a votre niveau, que ce soit votre premier marathon ou que vous visiez un record personnel.
          </p>
          <p className="text-slate-400 text-sm mb-6">✓ 1ere semaine gratuite ✓ Sans carte bancaire ✓ Plan 12 a 20 semaines</p>
          <button
            onClick={() => document.getElementById('questionnaire-marathon')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2 mb-4"
          >
            Creer mon plan marathon gratuit
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
            Creez votre plan marathon en 2 minutes
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Repondez a quelques questions pour recevoir votre programme marathon personnalise
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

      {/* SECTION: POURQUOI PAS CHATGPT */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-accent font-bold text-sm tracking-wider uppercase mb-3">La question qu'on nous pose le plus</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              "Je peux faire pareil avec ChatGPT, non ?"
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Pas vraiment. Et voici pourquoi.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-lg">{"🤖"}</div>
                <h3 className="font-bold text-slate-400 text-lg">ChatGPT</h3>
              </div>
              <div className="space-y-3 text-slate-400 text-sm">
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Genere un plan a partir de tout ce qui existe en ligne — <strong>sans distinguer les bons des mauvais conseils</strong></span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Aucune validation medicale sur le renforcement musculaire</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Oublie tout entre chaque conversation</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Aucun suivi reel de ta progression</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Pas d'analyse de tes performances Strava</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Plan en texte brut — pas de calendrier, pas d'export, pas de suivi</span></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border-2 border-accent/30 relative">
              <div className="absolute -top-3 right-4 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">RECOMMANDE</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-lg">{"🏃"}</div>
                <h3 className="font-bold text-slate-900 text-lg">Coach Running IA</h3>
              </div>
              <div className="space-y-3 text-slate-700 text-sm">
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span>Entraine sur des <strong>milliers de plans valides par des professionnels</strong></span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span>Renforcement musculaire avec <strong>regard medical et exercices specifiques</strong></span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Questionnaire personnalise</strong> — VMA, objectif, jours dispo, blessures</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Feedback hebdomadaire</strong> — le plan s'adapte a ton ressenti sans perdre le contexte</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Analyse mensuelle Strava</strong> — bilan sur tes performances reelles</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Plan structure</strong> semaine par semaine avec calendrier visuel et export agenda</span></div>
              </div>
            </div>
          </div>
          <p className="text-center text-slate-400 text-sm mt-8 max-w-xl mx-auto">
            ChatGPT est un outil genial — mais generaliste. Coach Running IA est un <strong className="text-slate-600">specialiste de l'entrainement running</strong>, concu pour une seule mission : te faire progresser.
          </p>
        </div>
      </section>

      {/* POURQUOI UN PLAN PERSONNALISE */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-4">
            Pourquoi un plan marathon personnalise ?
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
            Le marathon (42,195 km) ne s'improvise pas. Un plan adapte a VOTRE profil est la cle pour franchir la ligne d'arrivee.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Objectif chrono adapte</h3>
              <p className="text-slate-500">L'IA analyse votre niveau et vos chronos recents pour definir un objectif realiste et motivant.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Volume progressif</h3>
              <p className="text-slate-500">Montee en charge progressive pour atteindre 60-80 km/semaine sans risque de blessure.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Affutage optimal</h3>
              <p className="text-slate-500">Les 2-3 dernieres semaines sont cruciales. Le plan integre une phase de relachement parfaitement dosee.</p>
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => document.getElementById('questionnaire-marathon')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
            >
              Generer mon plan marathon
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* CONTENU SEO */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-black text-slate-900 mb-8">
            Comment preparer un marathon ?
          </h2>

          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-600 mb-6">
              Le marathon est l'epreuve reine de la course a pied. Que ce soit votre premier ou votre dixieme, une preparation structuree de 12 a 20 semaines est indispensable. Un bon plan entrainement marathon doit combiner sorties longues, travail d'allure specifique, seances de seuil et phases de recuperation.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Duree ideale du plan marathon</h3>
            <p className="text-slate-600 mb-4">
              Pour un <strong>premier marathon</strong>, prevoyez 16 a 20 semaines. Les coureurs <strong>experimentes</strong> peuvent opter pour 12 a 16 semaines de preparation specifique. Coach Running IA adapte la duree de votre programme marathon en fonction de votre experience, votre VMA et vos disponibilites.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Les piliers d'un bon plan entrainement marathon</h3>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>La sortie longue</strong> : jusqu'a 30-35 km, pierre angulaire de la preparation marathon</li>
              <li><strong>L'allure marathon</strong> : seances a votre allure cible pour memoriser le rythme</li>
              <li><strong>Le seuil</strong> : ameliorer votre capacite a tenir un effort prolonge</li>
              <li><strong>La recuperation</strong> : footings lents et jours off pour assimiler la charge</li>
              <li><strong>Le renforcement musculaire</strong> : gainage, squats et exercices specifiques pour prevenir les blessures</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Temps de passage realistes au marathon</h3>
            <p className="text-slate-600 mb-4">
              Les temps ci-dessous reflètent la realite de la majorite des coureurs. Utilisez notre <Link to="/outils/allure-marathon" className="text-accent hover:underline font-medium">calculateur d'allure marathon</Link> pour estimer votre allure cible.
            </p>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>4h30 - 5h00</strong> : allure de 6'24" a 7'07"/km - la majorite des premiers marathoniens. Finir est deja un exploit.</li>
              <li><strong>4h00 - 4h30</strong> : allure de 5'41" a 6'24"/km - coureurs reguliers avec 1 a 2 ans de pratique et une preparation serieuse de 16+ semaines.</li>
              <li><strong>3h30 - 4h00</strong> : allure de 4'59" a 5'41"/km - coureurs experimentes qui s'entrainent 4 a 5 fois par semaine depuis plusieurs annees.</li>
              <li><strong>Moins de 3h30</strong> : allure sous 4'59"/km - niveau competiteur, necessite plusieurs annees d'entrainement structure et un volume eleve (60-80+ km/semaine).</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Les erreurs a eviter dans sa preparation marathon</h3>
            <p className="text-slate-600 mb-4">
              La plupart des abandons et contre-performances au marathon viennent d'erreurs de preparation :
            </p>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>Augmenter le volume trop vite</strong> : respectez la regle des 10% maximum par semaine</li>
              <li><strong>Negliger la recuperation</strong> : les jours de repos font partie de l'entrainement</li>
              <li><strong>Partir trop vite le jour J</strong> : les premiers kilometres doivent etre courus en retenue</li>
              <li><strong>Ignorer la nutrition</strong> : testez votre strategie de ravitaillement a l'entrainement</li>
            </ul>
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
              "Apres 10 marathons, je pensais avoir tout vu. Coach Running IA m'a propose des <span className="font-bold text-slate-900">seances variees et intelligentes</span> que je n'avais jamais essayees. La qualite et la diversite m'ont vraiment surpris."
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
            Questions frequentes sur le plan marathon
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
            Decouvrez aussi nos autres programmes
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link to="/plan-semi-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Semi-Marathon</h3>
              <p className="text-slate-500 text-sm">Programme 21km personnalise par IA</p>
            </Link>
            <Link to="/plan-trail" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Trail</h3>
              <p className="text-slate-500 text-sm">Programme trail running avec denivele</p>
            </Link>
            <Link to="/outils/allure-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Calculateur Allure Marathon</h3>
              <p className="text-slate-500 text-sm">Trouvez votre pace ideal</p>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION: CONNECTE A STRAVA */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                Connecte a <span className="text-[#FC4C02]">Strava</span>
              </h2>
              <svg className="w-8 h-8 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor" aria-label="Logo Strava"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            </div>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Partenaire officiel — vos donnees au service de votre progression
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Connexion en 1 clic", desc: "Reliez votre compte Strava depuis votre espace Coach Running IA" },
              { title: "Vos donnees accessibles", desc: "Historique de courses, distances, allures, frequence cardiaque importes automatiquement" },
              { title: "Plans plus adaptes", desc: "L'IA analyse vos performances reelles pour ajuster votre programme marathon" },
              { title: "Analyse mensuelle", desc: "Bilan automatique de vos sorties Strava avec recommandations personnalisees" },
            ].map(({ title, desc }) => (
              <div key={title} className="rounded-2xl p-6 bg-orange-50/50 border border-orange-100 text-center hover:shadow-md hover:border-orange-200 transition-all duration-300">
                <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center justify-center gap-3">
            <span className="text-sm text-slate-400">Compatible with</span>
            <svg className="w-6 h-6 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor" aria-label="Logo Strava"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            <span className="text-sm font-bold text-[#FC4C02]">Strava</span>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Pret a conquerir votre marathon ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Obtenez votre plan entrainement marathon personnalise en moins de 2 minutes
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2"
          >
            Generer mon plan marathon
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default MarathonLanding;
