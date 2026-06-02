import React, { useEffect, useState, useRef } from 'react';
import { Helmet } from "react-helmet-async";
import { Link } from 'react-router-dom';
import { CheckCircle, X, ArrowRight, Clock, Target, Zap, Star, ChevronDown, ChevronUp, Dumbbell, Shield, Crown, ShoppingBag } from 'lucide-react';
import { User } from '../types';
import Questionnaire from './Questionnaire';
import { getRecentBlogPosts } from '../services/blogService';
import { BlogPost } from '../types';
import { SectionLabel, StravaSection } from './landing/SharedSections';
import { isIOSNative } from '../services/platformService';

/* ─── Animated counter hook ─── */
const useCountUp = (end: number, duration = 2000) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quad
            const eased = 1 - (1 - progress) * (1 - progress);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return { count, ref };
};

interface LandingPageProps {
  user: User | null;
  onPlanGeneration: (answers: any) => void;
  isGenerating: boolean;
}


const LandingPage: React.FC<LandingPageProps> = ({ user, onPlanGeneration, isGenerating }) => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const loadBlogPosts = async () => {
      try {
        const posts = await getRecentBlogPosts(3);
        setBlogPosts(posts);
      } catch (error) {
        console.error('Error loading blog posts:', error);
      }
    };
    loadBlogPosts();
  }, []);

  const faqs = [
    {
      question: "Comment fonctionne le programme course à pied personnalisé ?",
      answer: "Vous remplissez un questionnaire rapide (VMA, objectif, jours disponibles, blessures éventuelles). L'IA génère un plan d'entraînement structuré semaine par semaine avec des séances adaptées : endurance fondamentale, fractionné, seuil, sortie longue et renforcement musculaire. Le plan est connecté à Strava et s'ajuste après chaque séance."
    },
    {
      question: "Quels types de plans d'entraînement sont disponibles ?",
      answer: "Coach Running IA propose des plans pour marathon (12-20 semaines), semi-marathon (8-16 semaines), 10km (6-12 semaines), trail (toutes distances, du 20km à l'ultra), Hyrox et des programmes pour débutants. Chaque plan est calculé sur votre VMA et vos disponibilités."
    },
    {
      question: "La première semaine est-elle vraiment gratuite ?",
      answer: "Oui ! Vous pouvez générer votre plan et accéder à la première semaine d'entraînement gratuitement, sans carte bancaire et sans engagement. Pour débloquer la suite du programme et les fonctionnalités avancées (analyse Strava, bilan mensuel), un abonnement Premium est disponible."
    },
    {
      question: "Comment le plan s'adapte-t-il grâce à Strava ?",
      answer: "Après chaque séance, vos données Strava (distance, allure, fréquence cardiaque) et votre ressenti (RPE) sont analysés par l'IA. Si une séance était trop difficile, le plan allège les suivantes. Si vous êtes en forme, il monte d'un cran. Vous recevez aussi un bilan hebdomadaire (prévu vs réalisé) et une analyse mensuelle complète."
    },
    {
      question: "Pour quel niveau de coureur est fait Coach Running IA ?",
      answer: "Tous les niveaux : du débutant complet qui n'a jamais couru au marathonien confirmé visant un record personnel. L'IA adapte le volume, l'intensité et le type de séances à votre profil. Les plans incluent du renforcement musculaire adapté aux blessures et contre-indications de chacun."
    },
    {
      question: "Un plan IA peut-il remplacer un coach running ?",
      answer: "Coach Running IA offre un suivi comparable à un coach : plan personnalisé, ajustements après chaque séance, analyses mensuelles. Pour un suivi médical ou des pathologies spécifiques, consultez un professionnel de santé. L'avantage : disponible 24h/24, à une fraction du prix d'un coaching humain."
    }
  ];

  const scrollToQuestionnaire = () => {
    document.getElementById('questionnaire')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-white text-slate-900">
      <Helmet>
        <title>Programme Course à Pied par IA | Coach Running IA</title>
        <meta name="description" content="Créez votre programme course à pied personnalisé en 2 min. Plans marathon, semi, trail, 10km. Connecté à Strava. 1ère semaine gratuite." />
        <link rel="canonical" href="https://coachrunningia.fr/" />
        <meta property="og:title" content="Programme Course à Pied par IA | Coach Running IA" />
        <meta property="og:description" content="Créez votre programme course à pied personnalisé en 2 min. Plans marathon, semi, trail, 10km. Connecté à Strava." />
        <meta property="og:url" content="https://coachrunningia.fr/" />
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
        <meta name="twitter:title" content="Programme Course à Pied par IA | Coach Running IA" />
        <meta name="twitter:description" content="Créez votre programme course à pied personnalisé en 2 min. Plans marathon, semi, trail, 10km. Connecté à Strava. 1ère semaine gratuite." />
        <meta name="twitter:image" content="https://coachrunningia.fr/og-image.png" />
      </Helmet>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[55vh] flex items-center justify-center overflow-hidden">
        {/* Photo de fond */}
        <img
          src="/hero-runner.jpg"
          alt="Coureur sur route au coucher du soleil"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay sombre pour lisibilité du texte */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/75 to-slate-900/90"></div>

        <div className="relative max-w-5xl mx-auto px-4 text-center py-16 md:py-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-sm text-slate-300 font-medium">Connecté à</span>
            <svg className="w-4 h-4 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor" aria-label="Logo Strava"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            <span className="text-sm font-bold text-[#FC4C02]">Strava</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 leading-[1.1] tracking-tight text-white">
            Programme course à pied{' '}
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">personnalisé par IA</span>
          </h1>
          <h2 className="text-xl md:text-2xl text-slate-200 mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
            Plans marathon, semi-marathon, 10km, trail et Hyrox générés en 2 minutes. Connecté à Strava, ajusté après chaque séance.
          </h2>

          <button
            onClick={scrollToQuestionnaire}
            className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-10 py-5 rounded-full text-lg font-bold transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-105"
          >
            Créer mon plan gratuit
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="mt-6 text-sm text-slate-500">1ère semaine gratuite — Sans carte bancaire</p>

          {/* Mini testimonial in hero */}
          <div className="mt-12 max-w-md mx-auto">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl px-5 py-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-orange-500/30">D</div>
              <p className="text-sm text-slate-300 italic leading-snug">
                "Après 10 marathons, Coach Running IA m'a proposé des <span className="text-white font-semibold not-italic">séances que je n'avais jamais essayées</span>."
              </p>
              <div className="flex shrink-0 gap-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} className="text-orange-400 fill-orange-400" size={10} />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — QUESTIONNAIRE
      ═══════════════════════════════════════════════════════════════ */}
      <section id="questionnaire" className="py-20 md:py-28 relative bg-gray-50">
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <SectionLabel>Commencer maintenant</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
              Créez votre programme{' '}
              <span className="text-orange-500">personnalisé</span>
            </h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto text-lg">
              Répondez à quelques questions et recevez votre plan d'entraînement sur-mesure
            </p>
          </div>
          <Questionnaire onComplete={onPlanGeneration} isGenerating={isGenerating} user={user} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — POURQUOI PAS CHATGPT
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 relative overflow-hidden bg-white">
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-orange-100/50 rounded-full blur-[128px]"></div>

        <div className="relative max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <SectionLabel variant="slate">La question qu'on nous pose le plus</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight text-slate-900">
              "Je peux faire pareil avec ChatGPT, non ?"
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Pas vraiment. Et voici pourquoi.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-3xl p-8 bg-gray-50 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-xl">{"🤖"}</div>
                <h3 className="font-black text-slate-400 text-lg">ChatGPT</h3>
              </div>
              <div className="space-y-4 text-slate-500 text-sm">
                {[
                  <>Génère un plan à partir de tout ce qui existe en ligne — <strong className="text-slate-600">sans distinguer les bons des mauvais conseils</strong></>,
                  "Aucune validation médicale sur le renforcement musculaire",
                  "Oublie tout entre chaque conversation",
                  "Aucun suivi réel de ta progression",
                  "Pas d'analyse de tes performances Strava",
                  "Plan en texte brut — pas de calendrier, pas d'export",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5"><X size={12} className="text-red-500" /></div>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl p-8 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 shadow-lg relative">
              <div className="absolute -top-3 right-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-orange-500/30">RECOMMANDÉ</div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-xl">{"🏃"}</div>
                <h3 className="font-black text-orange-600 text-lg">Coach Running IA</h3>
              </div>
              <div className="space-y-4 text-slate-600 text-sm">
                {[
                  <><strong className="text-slate-800">Milliers de plans validés</strong> par des professionnels</>,
                  <><strong className="text-slate-800">Renforcement musculaire</strong> avec regard médical et exercices spécifiques</>,
                  <><strong className="text-slate-800">Questionnaire personnalisé</strong> — VMA, objectif, jours dispo, blessures</>,
                  <><strong className="text-slate-800">Feedback hebdomadaire</strong> — le plan s'adapte sans perdre le contexte</>,
                  <><strong className="text-slate-800">Analyse mensuelle Strava</strong> — bilan sur vos performances réelles</>,
                  <><strong className="text-slate-800">Plan structuré</strong> semaine par semaine avec calendrier et export</>,
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle size={12} className="text-green-600" /></div>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <button onClick={scrollToQuestionnaire} className="text-orange-500 font-bold hover:text-orange-600 transition-colors inline-flex items-center gap-2">
              Essayer gratuitement
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4 — APERÇU : SLIDER HORIZONTAL
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20 relative bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <SectionLabel>Aperçu</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-3">
              Tout est inclus dans <span className="text-orange-500">votre plan</span>
            </h2>
          </div>
        </div>

        {/* Slider with arrows */}
        <div className="relative group/slider">
          {/* Arrow left */}
          <button
            onClick={() => {
              const el = document.getElementById('features-slider');
              if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
            }}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200 transition-all opacity-0 group-hover/slider:opacity-100"
          >
            <ChevronUp size={20} className="rotate-[-90deg]" />
          </button>
          {/* Arrow right */}
          <button
            onClick={() => {
              const el = document.getElementById('features-slider');
              if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
            }}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200 transition-all opacity-0 group-hover/slider:opacity-100"
          >
            <ChevronDown size={20} className="rotate-[-90deg]" />
          </button>

          {/* Slider */}
          <div id="features-slider" className="overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex gap-4 px-4 md:px-[max(1rem,calc((100vw-72rem)/2+1rem))]" style={{ scrollSnapType: 'x mandatory' }}>
              {[
                { src: '/screenshots/welcome.png', label: 'Message du coach', sub: 'Confiance, lieux, allures' },
                { src: '/screenshots/session-detail.png', label: 'Détail de séance', sub: 'Échauffement, corps, récup' },
                { src: '/screenshots/exercise.png', label: 'Fiche exercice', sub: 'Posture, erreurs, conseil kiné' },
                { src: '/screenshots/feedback.png', label: 'Feedback & RPE', sub: 'Notez, le plan s\'adapte' },
                { src: '/screenshots/monthly.png', label: 'Bilan mensuel', sub: 'Points forts, recommandations' },
                { src: '/screenshots/strava-monthly.png', label: 'Analyse Strava', sub: 'KPIs, progression, verdict' },
              ].map(({ src, label, sub }) => (
                <div key={label} className="group flex-shrink-0 w-64 md:w-72 rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ scrollSnapAlign: 'start' }}>
                  {/* Colored header */}
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5">
                    <p className="text-sm font-bold text-white">{label}</p>
                    <p className="text-[11px] text-white/70">{sub}</p>
                  </div>
                  {/* Screenshot */}
                  <div className="aspect-[3/4] overflow-hidden bg-slate-50">
                    <img src={src} alt={label} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll hint on mobile */}
          <div className="flex items-center justify-center gap-2 mt-2 md:hidden text-xs text-slate-400">
            <span>Swipez pour voir plus</span>
            <ArrowRight size={12} />
          </div>
        </div>

        <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4 — CONNECTÉ À STRAVA
      ═══════════════════════════════════════════════════════════════ */}
      <StravaSection />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5 — COMMENT ÇA MARCHE
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 relative bg-gray-50">
        <div className="relative max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <SectionLabel>Simple et rapide</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">
              Comment <span className="text-orange-500">ça marche</span> ?
            </h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto text-lg">
              Obtenez votre programme d'entraînement personnalisé en 3 étapes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Clock, step: '01', title: 'Questionnaire', desc: "Moins d'1 minute pour définir votre niveau, objectif et disponibilités." },
              { icon: Zap, step: '02', title: "Génération IA", desc: 'Notre algorithme crée un programme sur-mesure adapté à votre profil unique.' },
              { icon: Target, step: '03', title: 'Progression', desc: 'Suivez votre plan, donnez votre feedback, et le plan évolue avec vous.' },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="group text-center relative">
                {step !== '03' && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-orange-200 to-transparent"></div>
                )}
                <div className="relative inline-flex mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-white border border-orange-200 shadow-md flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-orange-200/50 transition-all duration-300">
                    <Icon className="text-orange-500" size={32} />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md">{step}</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-3">{title}</h3>
                <p className="text-slate-500 leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button onClick={scrollToQuestionnaire} className="text-orange-500 font-bold hover:text-orange-600 transition-colors inline-flex items-center gap-2">
              Commencer maintenant
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7 — TÉMOIGNAGES
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 relative bg-gray-50">
        <div className="relative max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <SectionLabel>Témoignages</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">
              Ils ont atteint leurs <span className="text-orange-500">objectifs</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-3xl p-8 bg-white border border-gray-100 shadow-md hover:shadow-xl hover:border-orange-200 transition-all duration-300">
              <div className="flex items-center gap-1 mb-5">
                {[...Array(5)].map((_, i) => <Star key={i} className="text-orange-400 fill-orange-400" size={16} />)}
              </div>
              <p className="text-slate-600 mb-8 italic leading-relaxed text-[15px]">
                "Avoir un plan qui s'adapte à mes contraintes de temps, c'est top ! J'ai gagné <span className="font-bold text-slate-900 not-italic">10 minutes sur mon semi-marathon</span> sans trop de difficultés. L'IA comprend vraiment mon rythme de vie."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/30">R</div>
                <div>
                  <div className="font-bold text-slate-800">Romane</div>
                  <div className="text-sm text-slate-500">Marathonienne, 28 ans</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl p-8 bg-white border border-gray-100 shadow-md hover:shadow-xl hover:border-orange-200 transition-all duration-300">
              <div className="flex items-center gap-1 mb-5">
                {[...Array(5)].map((_, i) => <Star key={i} className="text-orange-400 fill-orange-400" size={16} />)}
              </div>
              <p className="text-slate-600 mb-8 italic leading-relaxed text-[15px]">
                "Surpris en positif de la <span className="font-bold text-slate-900 not-italic">qualité et diversité des entraînements</span>. Après 10 marathons et un Ironman, je pensais avoir tout vu. Coach Running IA m'a proposé des séances variées et intelligentes."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/30">D</div>
                <div>
                  <div className="font-bold text-slate-800">David</div>
                  <div className="text-sm text-slate-500">Multi-marathonien & Finisher Ironman, 59 ans</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 8 — TARIFS
          Audit iOS J2.5 (02/06/2026) : section masquée en iOS natif.
          Apple 3.1.1 + 4.2 : afficher des prix Premium dans l'app iOS
          sans IAP = rejet quasi certain. L'app iOS reste en mode freemium.
      ═══════════════════════════════════════════════════════════════ */}
      {!isIOSNative && (
      <section className="py-20 md:py-28 relative bg-white overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-orange-50 rounded-full blur-[128px] -translate-y-1/2"></div>

        <div className="relative max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <SectionLabel>Tarifs</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">
              Un prix <span className="text-orange-500">accessible</span>
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              1ère semaine gratuite sur tous les plans. Sans engagement.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Plan Unique */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-300">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag size={22} className="text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Plan Unique</h3>
                <div className="flex items-baseline justify-center gap-1 mt-2">
                  <span className="text-4xl font-black text-slate-900">9,90</span>
                  <span className="text-slate-500 font-medium">€</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">Paiement unique</p>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-600 mb-6">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> 1 plan complet généré</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Toutes les semaines détaillées</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Export calendrier</li>
              </ul>
              <Link to="/pricing" className="block text-center py-3 px-6 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:border-orange-300 hover:text-orange-600 transition-all">
                Choisir
              </Link>
            </div>

            {/* Annuel — Populaire */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-xl relative text-white md:scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 text-xs font-black px-4 py-1 rounded-full uppercase shadow-lg">
                Populaire
              </div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Crown size={22} className="text-amber-400" />
                </div>
                <h3 className="text-lg font-bold">Annuel</h3>
                <div className="flex items-baseline justify-center gap-1 mt-2">
                  <span className="text-4xl font-black">3,33</span>
                  <span className="text-slate-400 font-medium">€/mois</span>
                </div>
                <p className="text-sm text-slate-400 mt-1"><span className="line-through text-slate-500">69,90€</span> 39,90€/an</p>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-300 mb-6">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-400 shrink-0" /> Plans illimités</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-400 shrink-0" /> Connexion Strava + analyses</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-400 shrink-0" /> Fiches exercices illustrées</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-400 shrink-0" /> Support prioritaire</li>
              </ul>
              <Link to="/pricing" className="block text-center py-3 px-6 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-all">
                Meilleur choix
              </Link>
            </div>

            {/* Mensuel */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-300">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Zap size={22} className="text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Mensuel</h3>
                <div className="flex items-baseline justify-center gap-1 mt-2">
                  <span className="text-4xl font-black text-slate-900">4,90</span>
                  <span className="text-slate-500 font-medium">€/mois</span>
                </div>
                <p className="text-sm text-slate-400 mt-1"><span className="line-through text-slate-400">9,90€</span> Sans engagement</p>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-600 mb-6">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Plans illimités</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Connexion Strava + analyses</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Fiches exercices illustrées</li>
              </ul>
              <Link to="/pricing" className="block text-center py-3 px-6 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:border-orange-300 hover:text-orange-600 transition-all">
                S'abonner
              </Link>
            </div>
          </div>

          {/* Privacy / Trust */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-green-500" />
              <span>Vos données <strong className="text-slate-600">restent chez Strava</strong></span>
            </div>
            <span className="hidden sm:block text-slate-200">|</span>
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-green-500" />
              <span>Paiement sécurisé <strong className="text-slate-600">Stripe</strong></span>
            </div>
            <span className="hidden sm:block text-slate-200">|</span>
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-green-500" />
              <span><strong className="text-slate-600">Annulation en 1 clic</strong></span>
            </div>
          </div>
        </div>
      </section>
      )}
      {/* fin du wrap !isIOSNative — Section 8 Tarifs */}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 9 — BLOG
      ═══════════════════════════════════════════════════════════════ */}
      {blogPosts.length > 0 && (
        <section className="py-20 md:py-28 relative overflow-hidden bg-white">
          <div className="relative max-w-5xl mx-auto px-4">
            <div className="text-center mb-16">
              <SectionLabel>Blog</SectionLabel>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">
                Nos conseils <span className="text-orange-500">running</span>
              </h2>
              <p className="text-slate-500 mt-4 text-lg">
                Articles et guides pour progresser en course à pied
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {blogPosts.map(post => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                  <div className="rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-md hover:shadow-xl hover:border-orange-200 transition-all duration-300 hover:-translate-y-1">
                    {post.coverImage ? (
                      <img src={post.coverImage} alt={post.title} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-44 bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
                        <span className="text-4xl opacity-50">{"🏃"}</span>
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="font-bold text-slate-800 group-hover:text-orange-500 transition-colors line-clamp-2 mb-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-2">{post.excerpt}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link to="/blog" className="text-orange-500 font-bold hover:text-orange-600 transition-colors inline-flex items-center gap-2">
                Voir tous les articles
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 9 — FAQ
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 relative bg-gray-50">
        <div className="relative max-w-3xl mx-auto px-4">
          <div className="text-center mb-16">
            <SectionLabel variant="slate">FAQ</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">
              Questions <span className="text-orange-500">fréquentes</span>
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:border-orange-200 hover:shadow-md transition-all">
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

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 10 — CTA FINAL
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-[128px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:48px_48px]"></div>

        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight text-white">
            Prêt à atteindre vos objectifs ?
          </h2>
          <p className="text-orange-100 mb-10 text-lg max-w-xl mx-auto">
            Rejoignez les coureurs qui ont déjà franchi le pas avec Coach Running IA
          </p>
          <button
            onClick={scrollToQuestionnaire}
            className="group relative inline-flex items-center gap-3 bg-white text-orange-600 px-10 py-5 rounded-full text-lg font-bold transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
          >
            Créer mon plan gratuit
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
