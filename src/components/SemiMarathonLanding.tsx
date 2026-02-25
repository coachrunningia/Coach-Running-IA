import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, Target, Zap, Star, ArrowRight, X } from 'lucide-react';
import { User, UserGoal } from '../types';
import Questionnaire from './Questionnaire';
import { Helmet } from 'react-helmet-async';

interface SemiMarathonLandingProps {
  user: User | null;
  onPlanGeneration: (answers: any) => void;
  isGenerating: boolean;
}

const SemiMarathonLanding: React.FC<SemiMarathonLandingProps> = ({ user, onPlanGeneration, isGenerating }) => {
  return (
    <div className="bg-white">
      <Helmet>
        <title>Plan Entrainement Semi-Marathon Personnalisé | Coach Running IA</title>
        <meta name="description" content="Générez votre plan d'entraînement semi-marathon personnalisé par IA. Programme sur-mesure adapté à votre niveau et vos disponibilités. 1ère semaine gratuite." />
        <meta name="keywords" content="plan entrainement semi marathon, programme semi marathon, plan semi marathon 12 semaines, plan semi marathon débutant" />
        <link rel="canonical" href="https://coachrunningia.fr/plan-semi-marathon" />
      </Helmet>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            Plan entrainement <span className="text-accent">semi-marathon</span> personnalisé
          </h1>
          <h2 className="text-xl md:text-2xl text-slate-300 mb-6 max-w-3xl mx-auto">
            Programme sur-mesure généré par IA en 2 minutes. Adapté à votre niveau, vos disponibilités et votre objectif chrono.
          </h2>
          <p className="text-slate-400 text-sm mb-2">✓ 1ère semaine gratuite ✓ Sans carte bancaire ✓ Plan 8 à 16 semaines</p>
        </div>
      </section>

      {/* QUESTIONNAIRE */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 mb-4">
            Créez votre plan semi-marathon
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Répondez à quelques questions pour recevoir votre programme personnalisé
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

      {/* POURQUOI UN PLAN PERSONNALISÉ */}
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
              Le semi-marathon est souvent considéré comme la distance idéale : assez longue pour représenter un vrai défi, mais accessible avec une préparation de 8 à 12 semaines selon votre niveau.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Durée du plan d'entraînement semi-marathon</h3>
            <p className="text-slate-600 mb-4">
              Pour un <strong>débutant</strong>, comptez 12 à 16 semaines de préparation. Les coureurs <strong>intermédiaires</strong> peuvent se préparer en 10 à 12 semaines. Les <strong>confirmés</strong> visant un record personnel opteront pour 8 à 10 semaines de travail spécifique.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Les séances clés d'un plan semi-marathon</h3>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>La sortie longue</strong> : progressivement jusqu'à 18-20 km, à allure endurance</li>
              <li><strong>Le travail d'allure spécifique</strong> : séances à allure semi pour habituer le corps</li>
              <li><strong>Le fractionné</strong> : développer la VMA et l'économie de course</li>
              <li><strong>Le footing récupération</strong> : essentiel pour assimiler les séances difficiles</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Objectifs temps au semi-marathon</h3>
            <p className="text-slate-600 mb-4">
              Voici les allures moyennes selon les objectifs courants :
            </p>
            <ul className="text-slate-600 space-y-2">
              <li><strong>Sub 2h00</strong> : allure moyenne de 5'40"/km</li>
              <li><strong>Sub 1h45</strong> : allure moyenne de 4'58"/km</li>
              <li><strong>Sub 1h30</strong> : allure moyenne de 4'16"/km</li>
            </ul>
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGE */}
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

      {/* CTA FINAL */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Prêt à préparer votre semi-marathon ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Obtenez votre plan personnalisé en moins de 2 minutes
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
