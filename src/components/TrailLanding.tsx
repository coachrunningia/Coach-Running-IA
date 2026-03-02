import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Target, Zap, Star, ArrowRight, Mountain, X, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { User, UserGoal } from '../types';
import Questionnaire from './Questionnaire';
import { Helmet } from 'react-helmet-async';

interface TrailLandingProps {
  user: User | null;
  onPlanGeneration: (answers: any) => void;
  isGenerating: boolean;
}

const TrailLanding: React.FC<TrailLandingProps> = ({ user, onPlanGeneration, isGenerating }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Combien de semaines pour preparer un trail ?",
      answer: "La duree depend du format de trail. Pour un trail court (20-40 km), prevoyez 10 a 14 semaines. Pour un trail long (40-80 km), comptez 14 a 18 semaines. Pour un ultra-trail (80 km+), la preparation peut durer 18 a 24 semaines. Coach Running IA adapte la duree du plan a la distance, au denivele et a votre experience."
    },
    {
      question: "Quelle difference entre un plan trail et un plan route ?",
      answer: "Un plan trail integre des specifites absentes en course sur route : travail en cote et en descente, renforcement musculaire cible (quadriceps, chevilles), rando-course, gestion de l'effort sur terrain varie et nutrition en course. Le volume se mesure autant en denivele (D+) qu'en kilometres. Notre IA genere un plan specifiquement concu pour le trail."
    },
    {
      question: "Faut-il marcher en trail ?",
      answer: "Oui ! La marche fait partie integrante du trail, surtout en montee. Les meilleurs traileurs marchent en cote raide car c'est plus economique que de courir. Le plan Coach Running IA integre des seances de rando-course pour vous apprendre a alterner marche et course efficacement, comme en competition."
    },
    {
      question: "Quel volume d'entrainement pour preparer un trail ?",
      answer: "Le volume depend du format vise. Pour un trail court : 30-50 km/semaine avec 500-1000m D+. Pour un trail long : 50-70 km/semaine avec 1000-2000m D+. Pour un ultra : 60-100 km/semaine avec 1500-3000m D+. L'important est d'accumuler du denivele progressivement. Le plan calcule le volume optimal pour votre profil."
    },
    {
      question: "Comment gerer la nutrition en trail ?",
      answer: "Au-dela de 2h d'effort, la nutrition est cruciale. Prevoyez 30 a 60g de glucides par heure (gels, barres, fruits secs). Hydratez-vous regulierement (400-600ml/h). Testez votre strategie nutritionnelle a l'entrainement, jamais en course. Les sorties longues du plan sont le moment ideal pour experimenter."
    },
    {
      question: "Le plan trail est-il exportable sur ma montre GPS ?",
      answer: "Oui ! Votre plan trail est exportable sur les montres Garmin, Coros et Suunto. Vous pouvez aussi l'exporter en PDF ou l'ajouter a votre calendrier. Chaque seance inclut les consignes de distance, denivele et intensite."
    }
  ];

  return (
    <div className="bg-white">
      <Helmet>
        <title>Plan Entrainement Trail - Programme Trail Running par IA | Coach Running IA</title>
        <meta name="description" content="Creez votre plan entrainement trail personnalise par IA en 2 min. Programme adapte au denivele, renforcement musculaire inclus, export Garmin/Coros. 1ere semaine gratuite." />
        <meta name="keywords" content="plan entrainement trail, programme trail running, plan trail debutant, entrainement trail montagne, preparation trail, plan ultra trail" />
        <link rel="canonical" href="https://coachrunningia.fr/plan-trail" />
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
          <div className="absolute top-20 left-10 w-72 h-72 bg-green-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            Plan entrainement <span className="text-accent">trail</span> personnalise
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-6 max-w-3xl mx-auto">
            Programme trail sur-mesure genere par IA. Adapte a la distance, au denivele et a votre experience en montagne.
          </p>
          <p className="text-slate-400 text-sm mb-6">✓ 1ere semaine gratuite ✓ Denivele integre ✓ Renforcement musculaire inclus</p>
          <button
            onClick={() => document.getElementById('questionnaire-trail')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2 mb-4"
          >
            Creer mon plan trail gratuit
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
      <section id="questionnaire-trail" className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 mb-4">
            Creez votre plan trail en 2 minutes
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Indiquez la distance, le denivele et votre niveau pour un programme trail adapte
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
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span>Renforcement musculaire avec <strong>regard medical et exercices specifiques au trail</strong></span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Questionnaire personnalise</strong> — distance, denivele, experience, blessures</span></div>
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

      {/* SPECIFICITES TRAIL */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-4">
            Pourquoi un plan trail specifique ?
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
            Le trail n'est pas de la course sur route avec du denivele. C'est une discipline a part qui demande une preparation adaptee.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mountain className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Travail du denivele</h3>
              <p className="text-slate-500">Seances specifiques en cote et en descente pour preparer vos muscles et articulations.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Renforcement musculaire</h3>
              <p className="text-slate-500">Exercices de gainage et renforcement integres pour gagner en puissance et prevenir les blessures.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Gestion de l'effort</h3>
              <p className="text-slate-500">Apprendre a gerer son effort sur la duree : marche en cote, relances en descente, nutrition.</p>
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => document.getElementById('questionnaire-trail')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
            >
              Generer mon plan trail
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* CONTENU SEO */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-black text-slate-900 mb-8">
            Comment preparer un trail ?
          </h2>

          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-600 mb-6">
              Le trail running combine course a pied et randonnee en montagne. Que vous prepariez un trail court (20-30 km) ou un ultra (80 km+), la preparation doit etre specifique et progressive. Un bon plan entrainement trail doit integrer du denivele, du renforcement musculaire et des seances de rando-course.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Les formats de trail running</h3>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>Trail court</strong> : moins de 42 km - ideal pour debuter en trail</li>
              <li><strong>Trail long</strong> : 42 a 80 km - demande une preparation de 12-16 semaines minimum</li>
              <li><strong>Ultra-trail</strong> : plus de 80 km - preparation de 16 a 24 semaines avec gestion de la nuit et de la fatigue</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">Les seances cles d'un plan entrainement trail</h3>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>Sortie longue en terrain varie</strong> : habituer le corps aux surfaces instables et au denivele</li>
              <li><strong>Cotes et descentes</strong> : travail technique et musculaire specifique au trail</li>
              <li><strong>Renforcement musculaire</strong> : quadriceps, mollets, gainage — indispensable en trail</li>
              <li><strong>Rando-course</strong> : alterner marche rapide et course comme en competition</li>
              <li><strong>Fractionne en cote</strong> : developper la puissance musculaire et la VO2max</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">L'importance du denivele dans l'entrainement trail</h3>
            <p className="text-slate-600 mb-4">
              En trail, on parle en <strong>D+ (denivele positif)</strong> autant qu'en kilometres. Un trail de 30 km avec 2000m D+ est bien plus exigeant qu'un <Link to="/plan-marathon" className="text-accent hover:underline font-medium">marathon</Link> sur route. Votre plan doit integrer un volume de denivele progressif pour preparer muscles et articulations.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">L'equipement essentiel pour le trail</h3>
            <p className="text-slate-600 mb-4">
              Au-dela de l'entrainement, l'equipement joue un role crucial en trail :
            </p>
            <ul className="text-slate-600 space-y-2 mb-6">
              <li><strong>Chaussures de trail</strong> : avec crampons adaptes au terrain (boue, rocaille, technique)</li>
              <li><strong>Sac/gilet d'hydratation</strong> : indispensable des que la sortie depasse 1h30</li>
              <li><strong>Batons</strong> : optionnels mais tres utiles en montee sur les longues distances</li>
              <li><strong>Nutrition</strong> : testez gels, barres et boissons a l'entrainement avant la course</li>
            </ul>

            <p className="text-slate-600 mb-4">
              Calculez votre <Link to="/outils/calculateur-vma" className="text-accent hover:underline font-medium">VMA</Link> pour calibrer vos allures d'entrainement trail. Meme si le trail se court rarement a allure reguliere, connaitre sa VMA permet de doser l'effort en montee et sur le plat.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-12">
            Questions frequentes sur le plan trail
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
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-black text-center text-slate-900 mb-8">
            Decouvrez aussi nos autres programmes
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link to="/plan-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center bg-white">
              <h3 className="font-bold text-slate-900 mb-2">Plan Marathon</h3>
              <p className="text-slate-500 text-sm">Programme 42km personnalise par IA</p>
            </Link>
            <Link to="/plan-semi-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center bg-white">
              <h3 className="font-bold text-slate-900 mb-2">Plan Semi-Marathon</h3>
              <p className="text-slate-500 text-sm">Programme 21km personnalise par IA</p>
            </Link>
            <Link to="/outils/calculateur-vma" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center bg-white">
              <h3 className="font-bold text-slate-900 mb-2">Calculateur VMA</h3>
              <p className="text-slate-500 text-sm">Estimez votre vitesse maximale aerobie</p>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION: CONNECTE A STRAVA */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                Connecte a <span className="text-[#FC4C02]">Strava</span>
              </h2>
              <svg className="w-8 h-8 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor" aria-label="Logo Strava"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            </div>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Partenaire officiel — vos donnees au service de votre progression trail
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Connexion en 1 clic", desc: "Reliez votre compte Strava depuis votre espace Coach Running IA" },
              { title: "Vos donnees accessibles", desc: "Historique de sorties trail, denivele, allures et frequence cardiaque importes automatiquement" },
              { title: "Plans plus adaptes", desc: "L'IA analyse vos performances reelles pour ajuster votre programme trail" },
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
            Pret a conquerir les sentiers ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Obtenez votre plan entrainement trail personnalise en moins de 2 minutes
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2"
          >
            Generer mon plan trail
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default TrailLanding;
