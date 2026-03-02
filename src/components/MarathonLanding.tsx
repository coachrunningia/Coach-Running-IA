import React from 'react';
import { Clock, Target, Zap, Star, ArrowRight, X, CheckCircle } from 'lucide-react';
import { User, UserGoal } from '../types';
import Questionnaire from './Questionnaire';
import { Helmet } from 'react-helmet-async';

interface MarathonLandingProps {
  user: User | null;
  onPlanGeneration: (answers: any) => void;
  isGenerating: boolean;
}

const MarathonLanding: React.FC<MarathonLandingProps> = ({ user, onPlanGeneration, isGenerating }) => {
  return (
    <div className="bg-white">
      <Helmet>
        <title>Plan Entrainement Marathon Personnalisé | Coach Running IA</title>
        <meta name="description" content="Générez votre plan d'entraînement marathon personnalisé par IA. Programme 12 à 20 semaines adapté à votre niveau. Sub 4h, sub 3h30, sub 3h. 1ère semaine gratuite." />
        <meta name="keywords" content="plan entrainement marathon, programme marathon, plan marathon 16 semaines, plan marathon débutant, plan marathon sub 4h" />
        <link rel="canonical" href="https://coachrunningia.fr/plan-marathon" />
      </Helmet>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            Plan entrainement <span className="text-accent">marathon</span> personnalisé
          </h1>
          <h2 className="text-xl md:text-2xl text-slate-300 mb-6 max-w-3xl mx-auto">
            Programme 42,195 km sur-mesure généré par IA. Adapté à votre niveau pour atteindre votre objectif : sub 4h, sub 3h30, sub 3h...
          </h2>
          <p className="text-slate-400 text-sm mb-4">✓ 1ère semaine gratuite ✓ Sans carte bancaire ✓ Plan 12 à 20 semaines</p>
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
            Créez votre plan marathon
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Répondez à quelques questions pour recevoir votre programme personnalisé
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
        </div>
      </section>

      {/* CONTENU SEO */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-black text-slate-900 mb-8">
            Comment préparer un marathon ?
          </h2>
          
          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-600 mb-6">
              Le marathon est l'épreuve reine de la course à pied. Que ce soit votre premier ou votre dixième, une préparation structurée de 12 à 20 semaines est indispensable.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Durée idéale du plan marathon</h3>
            <p className="text-slate-600 mb-4">
              Pour un <strong>premier marathon</strong>, prévoyez 16 à 20 semaines. Les coureurs <strong>expérimentés</strong> peuvent opter pour 12 à 16 semaines de préparation spécifique.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Les piliers d'un bon plan marathon</h3>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>La sortie longue</strong> : jusqu'à 30-35 km, pierre angulaire de la préparation</li>
              <li><strong>L'allure marathon</strong> : séances à votre allure cible pour mémoriser le rythme</li>
              <li><strong>Le seuil</strong> : améliorer votre capacité à tenir un effort prolongé</li>
              <li><strong>La récupération</strong> : footings lents et jours off pour assimiler la charge</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Objectifs temps au marathon</h3>
            <ul className="text-slate-600 space-y-2">
              <li><strong>Sub 4h00</strong> : allure moyenne de 5'41"/km - accessible aux débutants bien préparés</li>
              <li><strong>Sub 3h30</strong> : allure moyenne de 4'59"/km - coureurs réguliers</li>
              <li><strong>Sub 3h00</strong> : allure moyenne de 4'16"/km - coureurs confirmés</li>
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
            Prêt à conquérir votre marathon ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Obtenez votre plan personnalisé en moins de 2 minutes
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
