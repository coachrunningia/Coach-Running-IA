import React from 'react';
import { Clock, Target, Zap, Star, ArrowRight, Mountain, X, CheckCircle } from 'lucide-react';
import { User, UserGoal } from '../types';
import Questionnaire from './Questionnaire';
import { Helmet } from 'react-helmet-async';

interface TrailLandingProps {
  user: User | null;
  onPlanGeneration: (answers: any) => void;
  isGenerating: boolean;
}

const TrailLanding: React.FC<TrailLandingProps> = ({ user, onPlanGeneration, isGenerating }) => {
  return (
    <div className="bg-white">
      <Helmet>
        <title>Plan Entrainement Trail Personnalisé | Coach Running IA</title>
        <meta name="description" content="Générez votre plan d'entraînement trail personnalisé par IA. Programme adapté au dénivelé, à la distance et à votre niveau. 1ère semaine gratuite." />
        <meta name="keywords" content="plan entrainement trail, programme trail running, plan trail débutant, entrainement trail montagne" />
        <link rel="canonical" href="https://coachrunningia.fr/plan-trail" />
      </Helmet>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-green-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            Plan entrainement <span className="text-accent">trail</span> personnalisé
          </h1>
          <h2 className="text-xl md:text-2xl text-slate-300 mb-6 max-w-3xl mx-auto">
            Programme trail sur-mesure généré par IA. Adapté à la distance, au dénivelé et à votre expérience en montagne.
          </h2>
          <p className="text-slate-400 text-sm mb-4">✓ 1ère semaine gratuite ✓ Dénivelé intégré ✓ Renforcement musculaire inclus</p>
          <div className="inline-flex items-center gap-1.5 text-slate-500 opacity-50">
            <span className="text-[11px]">Powered by</span>
            <svg className="w-3 h-3 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor" aria-label="Logo Strava"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            <span className="text-[11px] font-medium text-[#FC4C02]">Strava</span>
          </div>
        </div>
      </section>

      {/* QUESTIONNAIRE */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 mb-4">
            Créez votre plan trail
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Indiquez la distance, le dénivelé et votre niveau pour un programme adapté
          </p>
          <Questionnaire 
            onComplete={onPlanGeneration} 
            isGenerating={isGenerating} 
            user={user}
            initialGoal={UserGoal.TRAIL}
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

      {/* SPÉCIFICITÉS TRAIL */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-4">
            Pourquoi un plan trail spécifique ?
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
            Le trail n'est pas de la course sur route avec du dénivelé. C'est une discipline à part qui demande une préparation adaptée.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mountain className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Travail du dénivelé</h3>
              <p className="text-slate-500">Séances spécifiques en côte et en descente pour préparer vos muscles et articulations.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Renforcement musculaire</h3>
              <p className="text-slate-500">Exercices de gainage et renforcement intégrés pour gagner en puissance et prévenir les blessures.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Gestion de l'effort</h3>
              <p className="text-slate-500">Apprendre à gérer son effort sur la durée : marche en côte, relances en descente, nutrition.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENU SEO */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-black text-slate-900 mb-8">
            Comment préparer un trail ?
          </h2>
          
          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-600 mb-6">
              Le trail running combine course à pied et randonnée en montagne. Que vous prépariez un trail court (20-30 km) ou un ultra (80 km+), la préparation doit être spécifique.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Les formats de trail</h3>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>Trail court</strong> : moins de 42 km - idéal pour débuter</li>
              <li><strong>Trail long</strong> : 42 à 80 km - demande une préparation de 12-16 semaines</li>
              <li><strong>Ultra-trail</strong> : plus de 80 km - préparation de 16 à 24 semaines</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Les séances clés en trail</h3>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>Sortie longue en terrain varié</strong> : habituer le corps aux surfaces instables</li>
              <li><strong>Côtes et descentes</strong> : travail technique et musculaire spécifique</li>
              <li><strong>Renforcement musculaire</strong> : quadriceps, mollets, gainage</li>
              <li><strong>Rando-course</strong> : alterner marche rapide et course comme en compétition</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">L'importance du dénivelé</h3>
            <p className="text-slate-600 mb-4">
              En trail, on parle en <strong>D+ (dénivelé positif)</strong> autant qu'en kilomètres. Un trail de 30 km avec 2000m D+ est bien plus exigeant qu'un marathon sur route. Votre plan doit intégrer un volume de dénivelé progressif.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION: CONNECTÉ À STRAVA */}
      <section className="py-16 md:py-24 bg-white">
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
              { title: "Plans plus adaptés", desc: "L'IA analyse vos performances réelles pour ajuster votre programme" },
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
            Prêt à conquérir les sentiers ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Obtenez votre plan trail personnalisé en moins de 2 minutes
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2"
          >
            Générer mon plan trail
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default TrailLanding;
