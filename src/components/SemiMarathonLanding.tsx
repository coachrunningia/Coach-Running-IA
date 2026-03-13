import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, Target, Zap, Star, ArrowRight, X, ChevronDown, ChevronUp } from 'lucide-react';
import { User, UserGoal } from '../types';
import Questionnaire from './Questionnaire';
import { Helmet } from 'react-helmet-async';

interface SemiMarathonLandingProps {
  user: User | null;
  onPlanGeneration: (answers: any) => void;
  isGenerating: boolean;
}

const SemiMarathonLanding: React.FC<SemiMarathonLandingProps> = ({ user, onPlanGeneration, isGenerating }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Combien de semaines pour préparer un semi-marathon ?",
      answer: "La durée dépend de votre niveau actuel. Un débutant qui court déjà 30 minutes devrait prévoir 12 à 16 semaines. Un coureur régulier (3 sorties/semaine) peut se préparer en 10 à 12 semaines. Un coureur confirmé visant un chrono précis optera pour 8 à 10 semaines de préparation spécifique. Coach Running IA adapte la durée à votre profil."
    },
    {
      question: "Quel volume d'entraînement pour un semi-marathon ?",
      answer: "Le volume hebdomadaire varie selon votre niveau : 25-35 km/semaine pour un débutant, 35-50 km/semaine pour un intermédiaire, et 50-70 km/semaine pour un confirmé. L'important est la progressivité : ne pas augmenter de plus de 10% par semaine. Le plan Coach Running IA calcule le volume optimal pour votre profil."
    },
    {
      question: "Quelle allure viser au semi-marathon ?",
      answer: "Votre allure semi-marathon se situe généralement entre 80% et 90% de votre VMA. Par exemple, avec une VMA de 14 km/h, votre allure semi sera autour de 5'20\"/km (soit 1h52). Utilisez notre calculateur d'allure pour trouver votre pace idéal en fonction de votre VMA ou de votre meilleur chrono sur 10 km."
    },
    {
      question: "Peut-on préparer un semi-marathon en courant 3 fois par semaine ?",
      answer: "Oui, 3 séances par semaine sont suffisantes pour préparer un semi-marathon, surtout pour un premier. L'essentiel est la qualité des séances : une sortie longue, une séance d'allure spécifique et un footing. Coach Running IA génère des plans adaptés à vos disponibilités, que vous couriez 2, 3 ou 4 fois par semaine."
    },
    {
      question: "Faut-il courir 21 km à l'entraînement avant le semi-marathon ?",
      answer: "Non, ce n'est pas nécessaire et même déconseillé. La sortie longue maximale se situe généralement entre 16 et 18 km. Le travail d'allure spécifique et le volume hebdomadaire global vous prépareront mieux que de courir la distance complète avant le jour J. Le plan gère cette progression automatiquement."
    },
    {
      question: "Le plan semi-marathon est-il exportable sur ma montre GPS ?",
      answer: "Oui ! Votre plan est exportable en PDF et ajouteable à votre calendrier iPhone ou Google Calendar. L'intégration directe Garmin et Coros arrive bientôt. Chaque séance inclut les détails d'allure, de distance et les consignes."
    }
  ];

  return (
    <div className="bg-white">
      <Helmet>
        <title>Plan Semi-Marathon - Programme 21km Personnalisé par IA | Coach Running IA</title>
        <meta name="description" content="Créez votre plan semi-marathon personnalisé par IA en 2 min. Programme 8-16 semaines adapté à votre niveau, export Garmin/Coros. 1ère semaine gratuite." />
        <meta name="keywords" content="plan semi marathon, plan entraînement semi marathon, programme semi marathon, préparation 21km, plan semi marathon débutant, plan semi personnalisé" />
        <link rel="canonical" href="https://coachrunningia.fr/plan-semi-marathon" />
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
            Plan entraînement <span className="text-accent">semi-marathon</span> personnalisé
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-6 max-w-3xl mx-auto">
            Programme 21 km sur-mesure généré par IA en 2 minutes. Adapté à votre niveau, vos disponibilités et votre objectif chrono.
          </p>
          <p className="text-slate-400 text-sm mb-6">✓ 1ère semaine gratuite ✓ Sans carte bancaire ✓ Plan 8 à 16 semaines</p>
          <button
            onClick={() => document.getElementById('questionnaire-semi')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2 mb-4"
          >
            Créer mon plan semi-marathon gratuit
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
      <section id="questionnaire-semi" className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 mb-4">
            Créez votre plan semi-marathon en 2 minutes
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Répondez à quelques questions pour recevoir votre programme semi-marathon personnalisé
          </p>
          <Questionnaire
            onComplete={onPlanGeneration}
            isGenerating={isGenerating}
            user={user}
            initialGoal={UserGoal.ROAD_RACE}
            initialSubGoal="Semi-Marathon"
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
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Génère un plan à partir de tout ce qui existe en ligne — <strong>sans distinguer les bons des mauvais conseils</strong></span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Aucune validation médicale sur le renforcement musculaire</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Oublie tout entre chaque conversation</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Aucun suivi réel de ta progression</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Pas d'analyse de tes performances Strava</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Plan en texte brut — pas de calendrier, pas d'export, pas de suivi</span></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border-2 border-accent/30 relative">
              <div className="absolute -top-3 right-4 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">RECOMMANDÉ</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-lg">{"🏃"}</div>
                <h3 className="font-bold text-slate-900 text-lg">Coach Running IA</h3>
              </div>
              <div className="space-y-3 text-slate-700 text-sm">
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span>Entraîné sur des <strong>milliers de plans validés par des professionnels</strong></span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span>Renforcement musculaire avec <strong>regard médical et exercices spécifiques</strong></span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Questionnaire personnalisé</strong> — VMA, objectif, jours dispo, blessures</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Feedback hebdomadaire</strong> — le plan s'adapte à ton ressenti sans perdre le contexte</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Analyse mensuelle Strava</strong> — bilan sur tes performances réelles</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Plan structuré</strong> semaine par semaine avec calendrier visuel et export agenda</span></div>
              </div>
            </div>
          </div>
          <p className="text-center text-slate-400 text-sm mt-8 max-w-xl mx-auto">
            ChatGPT est un outil génial — mais généraliste. Coach Running IA est un <strong className="text-slate-600">spécialiste de l'entraînement running</strong>, conçu pour une seule mission : te faire progresser.
          </p>
        </div>
      </section>

      {/* POURQUOI UN PLAN PERSONNALISE */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-4">
            Pourquoi un plan semi-marathon personnalisé ?
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
            Le semi-marathon (21,1 km) demande une préparation spécifique. Un plan adapté à VOTRE profil fait toute la différence.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Objectif chrono réaliste</h3>
              <p className="text-slate-500">L'IA analyse votre niveau pour définir un temps cible atteignable : sub 2h, sub 1h45, sub 1h30...</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Adapté à votre emploi du temps</h3>
              <p className="text-slate-500">2, 3 ou 4 séances par semaine ? Le plan s'ajuste à vos disponibilités réelles.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Progression optimale</h3>
              <p className="text-slate-500">Alternance travail d'allure, sorties longues et récupération pour arriver frais le jour J.</p>
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => document.getElementById('questionnaire-semi')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
            >
              Générer mon plan semi-marathon
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* CONTENU SEO */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-black text-slate-900 mb-8">
            Comment préparer un semi-marathon ?
          </h2>

          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-600 mb-6">
              Le semi-marathon est souvent considéré comme la distance idéale : assez longue pour représenter un vrai défi, mais accessible avec une préparation de 8 à 16 semaines selon votre niveau. C'est aussi un excellent tremplin pour ceux qui envisagent un <Link to="/plan-marathon" className="text-accent hover:underline font-medium">marathon</Link>.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Durée du plan entraînement semi-marathon</h3>
            <p className="text-slate-600 mb-4">
              Pour un <strong>débutant</strong>, comptez 12 à 16 semaines de préparation. Les coureurs <strong>intermédiaires</strong> peuvent se préparer en 10 à 12 semaines. Les <strong>confirmés</strong> visant un record personnel opteront pour 8 à 10 semaines de travail spécifique.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Les séances clés d'un plan semi-marathon</h3>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>La sortie longue</strong> : progressivement jusqu'à 16-18 km, à allure endurance</li>
              <li><strong>Le travail d'allure spécifique</strong> : séances à allure semi pour habituer le corps au rythme cible</li>
              <li><strong>Le fractionné</strong> : développer la VMA et l'économie de course (30/30, 200m, 400m)</li>
              <li><strong>Le footing récupération</strong> : essentiel pour assimiler les séances difficiles</li>
              <li><strong>Le renforcement musculaire</strong> : prévenir les blessures et améliorer l'économie de course</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Objectifs temps au semi-marathon</h3>
            <p className="text-slate-600 mb-4">
              Voici les allures moyennes selon les objectifs courants. Utilisez notre <Link to="/outils/convertisseur-allure" className="text-accent hover:underline font-medium">convertisseur d'allure</Link> pour calculer votre vitesse cible.
            </p>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>Sub 2h00</strong> : allure moyenne de 5'40"/km - objectif accessible aux débutants bien préparés</li>
              <li><strong>Sub 1h45</strong> : allure moyenne de 4'58"/km - coureurs réguliers</li>
              <li><strong>Sub 1h30</strong> : allure moyenne de 4'16"/km - coureurs confirmés</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Du semi-marathon au marathon</h3>
            <p className="text-slate-600 mb-4">
              Le semi-marathon est le meilleur indicateur de votre potentiel marathon. En règle générale, multipliez votre temps semi par 2,1 pour estimer votre temps marathon. Un coureur en 1h45 au semi peut viser 3h40-3h45 au marathon. Découvrez notre <Link to="/outils/predicteur-temps" className="text-accent hover:underline font-medium">prédicteur de temps</Link> pour une estimation précise.
            </p>
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
              "J'ai suivi mon plan semi-marathon personnalisé pendant 10 semaines. Résultat : <span className="font-bold text-slate-900">10 minutes de moins</span> que mon précédent chrono ! Le plan s'adaptait parfaitement à mon emploi du temps chargé."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center text-accent font-bold">R</div>
              <div>
                <div className="font-bold text-slate-900">Romane</div>
                <div className="text-sm text-slate-500">Semi-marathon de Paris 2024</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-12">
            Questions fréquentes sur le plan semi-marathon
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
          <div className="grid md:grid-cols-3 gap-6">
            <Link to="/plan-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Marathon</h3>
              <p className="text-slate-500 text-sm">Programme 42km personnalisé par IA</p>
            </Link>
            <Link to="/plan-trail" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Trail</h3>
              <p className="text-slate-500 text-sm">Programme trail running avec dénivelé</p>
            </Link>
            <Link to="/outils/convertisseur-allure" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Convertisseur d'allure</h3>
              <p className="text-slate-500 text-sm">min/km en km/h et inversement</p>
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
                Connecté à <span className="text-[#FC4C02]">Strava</span>
              </h2>
              <svg className="w-8 h-8 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor" aria-label="Logo Strava"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            </div>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Partenaire officiel — vos données au service de votre progression
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Connexion en 1 clic", desc: "Reliez votre compte Strava depuis votre espace Coach Running IA" },
              { title: "Vos données accessibles", desc: "Historique de courses, distances, allures, fréquence cardiaque importés automatiquement" },
              { title: "Plans plus adaptés", desc: "L'IA analyse vos performances réelles pour ajuster votre programme semi-marathon" },
              { title: "Analyse mensuelle", desc: "Bilan automatique de vos sorties Strava avec recommandations personnalisées" },
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
            Prêt à préparer votre semi-marathon ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Obtenez votre plan entraînement semi-marathon personnalisé en moins de 2 minutes
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2"
          >
            Générer mon plan semi-marathon
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default SemiMarathonLanding;
