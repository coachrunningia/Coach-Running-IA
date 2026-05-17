import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Target, Zap, Star, ArrowRight, Mountain, X, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { User, UserGoal } from '../types';
import Questionnaire from './Questionnaire';
import { Helmet } from 'react-helmet-async';
import { SectionLabel, StravaSection, ScreenshotsSlider, PricingPreview } from './landing/SharedSections';

interface TrailLandingProps {
  user: User | null;
  onPlanGeneration: (answers: any) => void;
  isGenerating: boolean;
}

const TrailLanding: React.FC<TrailLandingProps> = ({ user, onPlanGeneration, isGenerating }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Combien de semaines pour préparer un trail ?",
      answer: "La durée dépend du format de trail. Pour un trail court (20-40 km), prévoyez 10 à 14 semaines. Pour un trail long (40-80 km), comptez 14 à 18 semaines. Pour un ultra-trail (80 km+), la préparation peut durer 18 à 24 semaines. Coach Running IA adapte la durée du plan à la distance, au dénivelé et à votre expérience."
    },
    {
      question: "Quelle différence entre un plan trail et un plan route ?",
      answer: "Un plan trail intègre des spécificités absentes en course sur route : travail en côte et en descente, renforcement musculaire ciblé (quadriceps, chevilles), rando-course, gestion de l'effort sur terrain varié et nutrition en course. Le volume se mesure autant en dénivelé (D+) qu'en kilomètres. Notre IA génère un plan spécifiquement conçu pour le trail."
    },
    {
      question: "Faut-il marcher en trail ?",
      answer: "Oui ! La marche fait partie intégrante du trail, surtout en montée. Les meilleurs traileurs marchent en côte raide car c'est plus économique que de courir. Le plan Coach Running IA intègre des séances de rando-course pour vous apprendre à alterner marche et course efficacement, comme en compétition."
    },
    {
      question: "Quel volume d'entraînement pour préparer un trail ?",
      answer: "Le volume dépend du format visé. Pour un trail court : 30-50 km/semaine avec 500-1000m D+. Pour un trail long : 50-70 km/semaine avec 1000-2000m D+. Pour un ultra : 60-100 km/semaine avec 1500-3000m D+. L'important est d'accumuler du dénivelé progressivement. Le plan calcule le volume optimal pour votre profil."
    },
    {
      question: "Comment gérer la nutrition en trail ?",
      answer: "Au-delà de 2h d'effort, la nutrition est cruciale. Prévoyez 30 à 60g de glucides par heure (gels, barres, fruits secs). Hydratez-vous régulièrement (400-600ml/h). Testez votre stratégie nutritionnelle à l'entraînement, jamais en course. Les sorties longues du plan sont le moment idéal pour expérimenter."
    },
    {
      question: "Le plan trail est-il exportable sur ma montre GPS ?",
      answer: "Oui ! Votre plan trail est exportable en PDF et ajouteable à votre calendrier. L'intégration directe Garmin et Coros arrive bientôt. Chaque séance inclut les consignes de distance, dénivelé et intensité."
    }
  ];

  return (
    <div className="bg-white">
      <Helmet>
        <title>Plan Trail Running Personnalisé | Coach Running IA</title>
        <meta name="description" content="Plan trail running personnalisé. Du trail court à l'ultra : D+ progressif, renforcement, rando-course. Tous niveaux. Essai gratuit." />
        <meta name="keywords" content="plan entraînement trail, programme trail running personnalisé, plan trail 40km, plan ultra trail, entraînement trail dénivelé, plan trail débutant, préparation trail montagne" />
        <link rel="canonical" href="https://coachrunningia.fr/plan-trail" />
        <meta property="og:title" content="Plan Trail Running Personnalisé | Coach Running IA" />
        <meta property="og:description" content="Plan trail running personnalisé. Du trail court à l'ultra : D+ progressif, renforcement, rando-course. Essai gratuit." />
        <meta property="og:url" content="https://coachrunningia.fr/plan-trail" />
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
        <meta name="twitter:title" content="Plan Trail Running Personnalisé | Coach Running IA" />
        <meta name="twitter:description" content="Plan trail running personnalisé. Du trail court à l'ultra : D+ progressif, renforcement, rando-course. Essai gratuit." />
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
            Plan entraînement <span className="text-accent">trail</span> personnalisé
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-6 max-w-3xl mx-auto">
            Programme trail sur-mesure généré par IA. Adapté à la distance, au dénivelé et à votre expérience en montagne.
          </p>
          <p className="text-slate-400 text-sm mb-6">✓ 1ère semaine gratuite ✓ Dénivelé intégré ✓ Renforcement musculaire inclus</p>
          <button
            onClick={() => document.getElementById('questionnaire-trail')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2 mb-4"
          >
            Créer mon plan trail gratuit
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
            Créez votre plan trail en 2 minutes
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Indiquez la distance, le dénivelé et votre niveau pour un programme trail adapté
          </p>
          <Questionnaire
            onComplete={onPlanGeneration}
            isGenerating={isGenerating}
            user={user}
            initialGoal={UserGoal.TRAIL}
          />
        </div>
      </section>

      {/* SCREENSHOTS SLIDER */}
      <ScreenshotsSlider />

      {/* SECTION: PLAN ROUTE VS PLAN TRAIL */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-accent font-bold text-sm tracking-wider uppercase mb-3">Le trail, ce n'est pas de la route en montagne</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Un plan route ne vous préparera jamais à un trail
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Le trail demande du D+, du renforcement, de la rando-course. Un plan qui ignore ça, c'est une blessure qui attend.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-lg">{"🛣️"}</div>
                <h3 className="font-bold text-slate-400 text-lg">Plan running classique</h3>
              </div>
              <div className="space-y-3 text-slate-400 text-sm">
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Volume uniquement en km — <strong>aucune notion de dénivelé positif (D+)</strong></span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Séances sur terrain plat — pas de travail en côte ni en descente</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Sortie longue en endurance pure — sans rando-course ni terrain varié</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Renforcement musculaire générique ou absent</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Même plan pour un trail 20 km et un ultra 100 km</span></div>
                <div className="flex items-start gap-2"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Aucune adaptation au profil de votre course (distance, D+, technicité)</span></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border-2 border-accent/30 relative">
              <div className="absolute -top-3 right-4 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">SPÉCIAL TRAIL</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-lg">{"🏔️"}</div>
                <h3 className="font-bold text-slate-900 text-lg">Coach Running IA — Trail</h3>
              </div>
              <div className="space-y-3 text-slate-700 text-sm">
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>D+ progressif semaine après semaine</strong> — calibré sur le D+ de votre course cible</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Séances de côtes et descentes</strong> pour préparer quadriceps et articulations</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Sorties longues en terrain varié</strong> avec rando-course intégrée</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Renforcement musculaire trail</strong> — gainage, quadri, chevilles, proprioception</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Plan adapté à VOTRE course</strong> — trail court 20 km, long 60 km ou ultra 100 km+</span></div>
                <div className="flex items-start gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong>Analyse Strava</strong> — suivi du D+ réalisé vs D+ cible chaque semaine</span></div>
              </div>
            </div>
          </div>
          <p className="text-center text-slate-400 text-sm mt-8 max-w-xl mx-auto">
            Chaque trail est unique : distance, D+, technicité. Votre plan doit l'être aussi. <strong className="text-slate-600">L'IA génère un programme calé sur le profil exact de votre course.</strong>
          </p>
        </div>
      </section>

      {/* SPECIFICITES TRAIL */}
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

          <div className="text-center mt-10">
            <button
              onClick={() => document.getElementById('questionnaire-trail')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
            >
              Générer mon plan trail
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* CONTENU SEO */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <SectionLabel variant="slate">Guide trail</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Comment préparer un trail ?</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Course + montagne : dénivelé, renforcement et rando-course. Une préparation spécifique et progressive est indispensable.</p>
          </div>
          <div className="grid gap-5">
            <div className="bg-white border-l-4 border-orange-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm shrink-0">1</div>
                <div><h3 className="text-lg font-bold text-slate-900 mb-3">Les formats de trail</h3>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Trail court</strong> : moins de 42 km — idéal pour débuter</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Trail long</strong> : 42 à 80 km — 12-16 semaines minimum</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Ultra-trail</strong> : 80 km+ — 16-24 semaines, gestion nuit et fatigue</span></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-white border-l-4 border-orange-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm shrink-0">2</div>
                <div><h3 className="text-lg font-bold text-slate-900 mb-3">Les séances clés en trail</h3>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Sortie longue terrain varié</strong> : surfaces instables et dénivelé</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Côtes et descentes</strong> : travail technique et musculaire</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Renforcement</strong> : quadriceps, mollets, gainage</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Rando-course</strong> : alterner marche et course</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Fractionné en côte</strong> : puissance et VO2max</span></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-white border-l-4 border-orange-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm shrink-0">3</div>
                <div><h3 className="text-lg font-bold text-slate-900 mb-2">Le dénivelé, la clé du trail</h3><p className="text-slate-600">En trail, on parle en <strong>D+</strong> autant qu'en km. Un trail de 30 km avec 2000m D+ est plus exigeant qu'un <Link to="/plan-marathon" className="text-orange-500 hover:underline font-medium">marathon</Link> sur route. Le plan intègre un volume de dénivelé progressif.</p></div>
              </div>
            </div>
            <div className="bg-white border-l-4 border-orange-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm shrink-0">4</div>
                <div><h3 className="text-lg font-bold text-slate-900 mb-3">L'équipement essentiel</h3>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Chaussures trail</strong> : crampons adaptés (boue, rocaille)</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Gilet d'hydratation</strong> : indispensable dès 1h30</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Bâtons</strong> : utiles en montée sur longues distances</span></li>
                    <li className="flex items-start gap-2"><span className="text-orange-500 font-bold mt-0.5">→</span><span><strong>Nutrition</strong> : testez tout à l'entraînement</span></li>
                  </ul>
                  <p className="text-slate-600 mt-3">Calculez votre <Link to="/outils/calculateur-vma" className="text-orange-500 hover:underline font-medium">VMA</Link> pour doser l'effort en montée et sur le plat.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-12">
            Questions fréquentes sur le plan trail
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
            Découvrez aussi nos autres programmes
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Link to="/plan-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center bg-white">
              <h3 className="font-bold text-slate-900 mb-2">Plan Marathon</h3>
              <p className="text-slate-500 text-sm">Programme 42km personnalisé par IA</p>
            </Link>
            <Link to="/plan-semi-marathon" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center bg-white">
              <h3 className="font-bold text-slate-900 mb-2">Plan Semi-Marathon</h3>
              <p className="text-slate-500 text-sm">Programme 21km personnalisé par IA</p>
            </Link>
            <Link to="/outils/calculateur-vma" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center bg-white">
              <h3 className="font-bold text-slate-900 mb-2">Calculateur VMA</h3>
              <p className="text-slate-500 text-sm">Estimez votre vitesse maximale aérobie</p>
            </Link>
            <Link to="/outils/convertisseur-miles-km" className="block rounded-2xl border border-slate-200 p-6 hover:border-accent hover:shadow-lg transition-all text-center bg-white">
              <h3 className="font-bold text-slate-900 mb-2">Convertisseur Miles / Km</h3>
              <p className="text-slate-500 text-sm">Distances et allures miles ↔ km</p>
            </Link>
          </div>
        </div>
      </section>

      {/* STRAVA */}
      <StravaSection discipline="trail" />

      {/* PRICING */}
      <PricingPreview />

      {/* CTA FINAL */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Prêt à conquérir les sentiers ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Obtenez votre plan entraînement trail personnalisé en moins de 2 minutes
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
