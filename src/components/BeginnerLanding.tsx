import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Target, Zap, Star, ArrowRight, X, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { User, UserGoal, RunningLevel } from '../types';
import Questionnaire from './Questionnaire';
import { Helmet } from 'react-helmet-async';

interface BeginnerLandingProps {
  user: User | null;
  onPlanGeneration: (answers: any) => void;
  isGenerating: boolean;
}

const BeginnerLanding: React.FC<BeginnerLandingProps> = ({ user, onPlanGeneration, isGenerating }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Je n'ai jamais couru, ce programme est-il fait pour moi ?",
      answer: "Oui, absolument ! Le programme running débutant commence par de la marche alternée avec de la course. Vous ne courrez jamais plus de 2-3 minutes d'affilée au début. La progression est très douce : l'objectif est d'arriver à 20-30 minutes de course continue en 8 semaines, à votre rythme."
    },
    {
      question: "Combien de fois par semaine dois-je courir quand on débute ?",
      answer: "Pour un débutant, 2 à 3 séances par semaine suffisent. L'important est la régularité, pas la fréquence. Le plan inclut des jours de repos essentiels pour que votre corps s'adapte. Courir tous les jours quand on débute est la meilleure recette pour se blesser."
    },
    {
      question: "De quoi ai-je besoin pour commencer la course à pied ?",
      answer: "L'essentiel : une paire de chaussures de running adaptées (demandez conseil en magasin spécialisé) et une tenue confortable. Pas besoin de montre GPS au début — le programme vous guide par le temps et les sensations. Hydratez-vous bien avant et après chaque séance."
    },
    {
      question: "Je suis en surpoids, puis-je quand même courir ?",
      answer: "Oui, le plan s'adapte à votre profil. Si votre IMC est élevé, le programme privilégiera la marche rapide et la marche/course alternée pour protéger vos articulations. L'important est de commencer doucement et de progresser à votre rythme. Consultez votre médecin avant de démarrer."
    },
    {
      question: "Vais-je perdre du poids avec ce programme ?",
      answer: "La course à pied aide à la perte de poids quand elle est combinée avec une alimentation équilibrée. Le programme running débutant met l'accent sur la régularité et le plaisir avant tout. La perte de poids viendra naturellement avec la pratique régulière."
    },
    {
      question: "Quelle est la différence avec un plan trouvé sur internet ?",
      answer: "Les plans gratuits sont génériques : même programme pour tout le monde. Coach Running IA crée un plan 100% personnalisé selon votre âge, votre poids, votre condition physique actuelle et vos disponibilités. Le plan s'adapte à vos retours semaine après semaine."
    }
  ];

  return (
    <div className="bg-white">
      <Helmet>
        <title>Programme Running Débutant — Plan Course à Pied pour Commencer | Coach Running IA</title>
        <meta name="description" content="Programme running pour débutant personnalisé par IA : commencez la course à pied en douceur avec un plan adapté. De la marche/course à 30 min de course continue. Plan gratuit pour tester." />
        <meta name="keywords" content="programme running débutant, plan course à pied débutant, commencer à courir, débuter la course à pied, programme course débutant, plan running pour commencer, courir pour la première fois" />
        <link rel="canonical" href="https://coachrunningia.fr/programme-running-debutant" />
        <meta property="og:title" content="Programme Running Débutant — Plan Course à Pied pour Commencer | Coach Running IA" />
        <meta property="og:description" content="Programme running pour débutant personnalisé : commencez la course à pied en douceur. 1ère semaine gratuite." />
        <meta property="og:url" content="https://coachrunningia.fr/programme-running-debutant" />
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
        <meta name="twitter:title" content="Programme Running Débutant — Plan Course à Pied pour Commencer | Coach Running IA" />
        <meta name="twitter:description" content="Programme running pour débutant personnalisé : commencez la course à pied en douceur. 1ère semaine gratuite." />
        <meta name="twitter:image" content="https://coachrunningia.fr/og-image.png" />
      </Helmet>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-green-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            Programme running pour <span className="text-accent">débutant</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-3xl mx-auto">
            Commencez la course à pied en douceur avec un plan personnalisé. De la marche/course à 30 minutes de running continu, à votre rythme.
          </p>
          <p className="text-green-300 text-sm mb-6 font-medium">Adapté à tous les niveaux, même si vous n'avez jamais couru</p>
          <p className="text-slate-400 text-sm mb-6">✓ 1ère semaine gratuite ✓ Sans carte bancaire ✓ Programme 8 semaines</p>
          <button
            onClick={() => document.getElementById('questionnaire-debutant')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2 mb-4"
          >
            Commencer mon programme gratuit
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
      <section id="questionnaire-debutant" className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 mb-4">
            Créez votre programme running débutant en 2 minutes
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Choisissez votre objectif et recevez un plan course à pied adapté à votre niveau
          </p>
          <Questionnaire
            onComplete={onPlanGeneration}
            isGenerating={isGenerating}
            user={user}
            initialGoal={UserGoal.FITNESS}
            initialLevel={RunningLevel.BEGINNER}
            beginnerMode={true}
          />
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-accent font-bold text-sm tracking-wider uppercase mb-3">Pourquoi un programme adapté</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Programme running débutant personnalisé vs courir seul
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-lg">{"🤷"}</div>
                <h3 className="font-bold text-slate-400 text-lg">Courir seul sans plan</h3>
              </div>
              <div className="space-y-3 text-slate-400 text-sm">
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Partir trop vite → <strong>essoufflement et découragement</strong></span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Pas de progression → <strong>stagnation rapide</strong></span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Risque de <strong>blessure</strong> (genoux, tendons, périoste)</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Pas de <strong>renforcement musculaire</strong> adapté</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span><strong>Abandon après quelques semaines</strong> par manque de structure</span></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border-2 border-accent/30 relative">
              <div className="absolute -top-3 right-4 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">RECOMMANDÉ</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-lg">{"🏃"}</div>
                <h3 className="font-bold text-slate-900 text-lg">Programme running débutant IA</h3>
              </div>
              <div className="space-y-3 text-slate-700 text-sm">
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Marche/course alternée</strong> — progression douce sans essoufflement</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Allures personnalisées</strong> — adaptées à VOTRE rythme, pas celui des autres</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Renforcement musculaire</strong> intégré — protège vos articulations</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Progression semaine par semaine</strong> — de 2 min à 30 min de course</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Feedback RPE</strong> — le plan s'adapte à votre ressenti</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Conseils personnalisés</strong> — blessures, météo, équipement</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ÉTAPES */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-4">
            Les étapes d'un programme running pour débutant
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
            En 8 semaines, passez de "je ne cours pas" à "je cours 30 minutes sans m'arrêter".
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Semaines 1-3 : Marche/Course</h3>
              <p className="text-slate-500">Alternez marche rapide et course légère. 2-3 minutes de course, puis marche pour récupérer. Zéro pression.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Semaines 4-6 : Course continue</h3>
              <p className="text-slate-500">Les phases de course s'allongent progressivement. 5 min, 10 min, 15 min... à une allure où vous pouvez parler.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Semaines 7-8 : Autonomie</h3>
              <p className="text-slate-500">20-30 minutes de course continue, avec confiance et plaisir. Vous êtes un coureur.</p>
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => document.getElementById('questionnaire-debutant')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
            >
              Commencer maintenant
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* CONTENU SEO */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-black text-slate-900 mb-8">
            Comment débuter la course à pied ?
          </h2>

          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-600 mb-6">
              Débuter la course à pied est l'une des meilleures décisions pour votre santé. Mais sans programme running débutant adapté, beaucoup abandonnent après quelques semaines par découragement ou blessure. Un plan structuré fait toute la différence.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">La méthode marche/course : la clé pour commencer sans se blesser</h3>
            <p className="text-slate-600 mb-4">
              La règle d'or du programme running débutant : <strong>ne jamais courir plus longtemps que ce que votre corps peut encaisser</strong>. La méthode marche/course alterne des phases de course légère (2-3 minutes) avec des phases de marche rapide (1-2 minutes). Cette alternance permet à votre cœur, vos muscles et vos tendons de s'adapter progressivement à l'effort.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">De 0 à 30 minutes de course continue</h3>
            <p className="text-slate-600 mb-4">
              Un bon plan course à pied pour débutant vous amène de 0 à 30 minutes de course continue en 6 à 8 semaines. La progression type :
            </p>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>Semaine 1-2</strong> : alternance 2 min course / 2 min marche × 6-8 cycles</li>
              <li><strong>Semaine 3-4</strong> : alternance 3-4 min course / 1-2 min marche</li>
              <li><strong>Semaine 5-6</strong> : blocs de 8-12 min de course continue</li>
              <li><strong>Semaine 7-8</strong> : 20-30 min de course continue à allure confortable</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Le renforcement musculaire pour les débutants</h3>
            <p className="text-slate-600 mb-4">
              Le programme running débutant inclut du renforcement musculaire adapté : gainage, squats au poids du corps, fentes douces et travail de proprioception. Ces exercices protègent vos articulations et préviennent les blessures les plus courantes chez les débutants (périostite, tendinite, douleurs aux genoux).
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Les erreurs à éviter quand on commence à courir</h3>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>Courir trop vite</strong> : vous devez pouvoir parler en courant. Si vous êtes essoufflé, ralentissez.</li>
              <li><strong>Courir tous les jours</strong> : 2-3 fois par semaine suffisent. Le repos est essentiel.</li>
              <li><strong>Ignorer les douleurs</strong> : une gêne persistante au genou, au tibia ou au pied doit vous faire consulter.</li>
              <li><strong>Se comparer aux autres</strong> : votre rythme est le bon rythme. La progression viendra.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-12">
            Questions fréquentes — Programme running débutant
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
            Envie d'aller plus loin ?
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Link to="/plan-semi-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Semi-Marathon</h3>
              <p className="text-slate-500 text-sm">Votre prochain défi après le programme débutant</p>
            </Link>
            <Link to="/plan-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Marathon</h3>
              <p className="text-slate-500 text-sm">Le rêve de tout coureur</p>
            </Link>
            <Link to="/plan-trail" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Plan Trail</h3>
              <p className="text-slate-500 text-sm">La course en pleine nature</p>
            </Link>
            <Link to="/outils/calculateur-vma" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center">
              <h3 className="font-bold text-slate-900 mb-2">Calculateur VMA</h3>
              <p className="text-slate-500 text-sm">Estimez votre niveau</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Prêt à commencer la course à pied ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Obtenez votre programme running débutant personnalisé en moins de 2 minutes
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2"
          >
            Commencer gratuitement
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default BeginnerLanding;
