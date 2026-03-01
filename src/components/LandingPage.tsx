import React, { useEffect, useState } from 'react';
import { Helmet } from "react-helmet-async";
import { Link } from 'react-router-dom';
import { CheckCircle, X, ArrowRight, Clock, Target, Zap, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { User } from '../types';
import Questionnaire from './Questionnaire';
import { getRecentBlogPosts } from '../services/blogService';
import { BlogPost } from '../types';

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
      question: "Comment fonctionne le programme d'entraînement personnalisé ?",
      answer: "Notre IA analyse votre profil (niveau, disponibilités, objectif) et génère un plan sur-mesure. Chaque séance est adaptée à votre progression et vos contraintes de temps."
    },
    {
      question: "La première semaine est-elle vraiment gratuite ?",
      answer: "Oui ! Vous pouvez générer votre plan et accéder à la première semaine d'entraînement gratuitement, sans engagement. Pour débloquer la suite du programme et les fonctionnalités avancées, un abonnement Premium est disponible."
    },
    {
      question: "Puis-je modifier mon plan après génération ?",
      answer: "Absolument. Votre plan s'adapte à vos retours. Signalez une séance trop difficile ou un imprévu, et l'IA réajuste automatiquement la suite du programme."
    },
    {
      question: "Pour quel niveau est fait Coach Running IA ?",
      answer: "Tous les niveaux ! Du débutant qui prépare son premier 10km au marathonien chevronné visant un record personnel. L'IA adapte l'intensité et le volume."
    },
    {
      question: "Les plans remplacent-ils un coach humain ?",
      answer: "Nos plans sont des suggestions basées sur les meilleures pratiques d'entraînement. Pour un suivi médical ou des pathologies spécifiques, consultez un professionnel de santé."
    }
  ];

  return (
    <div className="bg-white text-slate-900">
      <Helmet>
        <title>Coach Running IA - Programme course à pied personnalisé par IA</title>
        <meta name="description" content="Programme course à pied 100% personnalisé par IA. Plans marathon, semi, trail, 10km adaptés à votre niveau et vos disponibilités. 1ère semaine offerte." />
        <link rel="canonical" href="https://coachrunningia.fr/" />
        <meta property="og:title" content="Coach Running IA - Programme course à pied personnalisé par IA" />
        <meta property="og:description" content="Programme course à pied personnalisé par IA. Plans marathon, semi, trail, 10km adaptés à votre niveau." />
        <meta property="og:url" content="https://coachrunningia.fr/" />
      </Helmet>

      {/* SECTION 1: HERO */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-orange-50 via-white to-white">
        {/* Animated gradient orbs - lighter for white bg */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-orange-400/15 rounded-full blur-[128px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-amber-300/10 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-200/10 rounded-full blur-[128px]"></div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 text-center py-24 md:py-32">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-orange-200 bg-orange-50 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-orange-700 font-medium">1ère semaine gratuite - Sans carte bancaire</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 leading-[1.1] tracking-tight text-slate-900">
            Programme course à pied{' '}
            <span className="text-orange-500">personnalisé</span>
          </h1>
          <h2 className="text-xl md:text-2xl text-slate-500 mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
            Plans d'entraînement marathon, semi-marathon, 10km et trail générés par IA en 2 minutes
          </h2>

          <button
            onClick={() => document.getElementById('questionnaire')?.scrollIntoView({ behavior: 'smooth' })}
            className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-10 py-5 rounded-full text-lg font-bold transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-105"
          >
            Créer mon plan gratuit
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="mt-12 flex items-center justify-center gap-1.5 text-slate-400 opacity-50">
            <span className="text-[11px]">Powered by</span>
            <svg className="w-3 h-3 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            <span className="text-[11px] font-medium text-[#FC4C02]">Strava</span>
          </div>
        </div>
      </section>

      {/* SECTION 2: QUESTIONNAIRE */}
      <section id="questionnaire" className="py-20 md:py-28 relative bg-gray-50">
        <div className="relative max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-4 tracking-tight text-slate-900">
            Créez votre programme{' '}
            <span className="text-orange-500">personnalisé</span>
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto text-lg">
            Répondez à quelques questions et recevez votre plan d'entraînement sur-mesure
          </p>
          <Questionnaire onComplete={onPlanGeneration} isGenerating={isGenerating} user={user} />
        </div>
      </section>

      {/* SECTION: POURQUOI PAS CHATGPT */}
      <section className="py-20 md:py-28 relative overflow-hidden bg-white">
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-orange-100/50 rounded-full blur-[128px]"></div>

        <div className="relative max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase bg-orange-100 text-orange-600 border border-orange-200 mb-6">
              La question qu'on nous pose le plus
            </span>
            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight text-slate-900">
              "Je peux faire pareil avec ChatGPT, non ?"
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Pas vraiment. Et voici pourquoi.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* ChatGPT card */}
            <div className="rounded-2xl p-6 bg-gray-50 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg">{"🤖"}</div>
                <h3 className="font-bold text-slate-400 text-lg">ChatGPT</h3>
              </div>
              <div className="space-y-3 text-slate-500 text-sm">
                <div className="flex items-start gap-2.5">
                  <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <span>Génère un plan à partir de tout ce qui existe en ligne — <strong className="text-slate-600">sans distinguer les bons des mauvais conseils</strong></span>
                </div>
                <div className="flex items-start gap-2.5">
                  <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <span>Aucune validation médicale sur le renforcement musculaire</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <span>Oublie tout entre chaque conversation</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <span>Aucun suivi réel de ta progression</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <span>Pas d'analyse de tes performances Strava</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <span>Plan en texte brut — pas de calendrier, pas d'export, pas de suivi</span>
                </div>
              </div>
            </div>

            {/* Coach Running IA card */}
            <div className="rounded-2xl p-6 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 shadow-md relative">
              <div className="absolute -top-3 right-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-orange-500/30">RECOMMANDÉ</div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-lg">{"🏃"}</div>
                <h3 className="font-bold text-orange-600 text-lg">Coach Running IA</h3>
              </div>
              <div className="space-y-3 text-slate-600 text-sm">
                <div className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span>Entraîné sur des <strong className="text-slate-800">milliers de plans validés par des professionnels</strong></span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span>Renforcement musculaire avec <strong className="text-slate-800">regard médical et exercices spécifiques</strong></span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span><strong className="text-slate-800">Questionnaire personnalisé</strong> — VMA, objectif, jours dispo, blessures</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span><strong className="text-slate-800">Feedback hebdomadaire</strong> — le plan s'adapte à ton ressenti sans perdre le contexte</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span><strong className="text-slate-800">Analyse mensuelle Strava</strong> — bilan sur tes performances réelles</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span><strong className="text-slate-800">Plan structuré</strong> semaine par semaine avec calendrier visuel et export agenda</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-10 max-w-xl mx-auto">
            ChatGPT est un outil génial — mais généraliste. Coach Running IA est un <strong className="text-slate-800">spécialiste de l'entraînement running</strong>, conçu pour une seule mission : te faire progresser.
          </p>
        </div>
      </section>

      {/* SECTION 3: COMMENT ÇA MARCHE */}
      <section className="py-20 md:py-28 relative bg-orange-50/50">
        <div className="relative max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-black text-center mb-4 tracking-tight text-slate-900">
            Comment <span className="text-orange-500">ça marche</span> ?
          </h2>
          <p className="text-center text-slate-500 mb-16 max-w-2xl mx-auto text-lg">
            Obtenez votre programme d'entraînement personnalisé en 3 étapes simples
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Clock, step: '01', title: 'Je réponds au questionnaire', desc: "Moins d'1 minute pour définir votre niveau, objectif et disponibilités." },
              { icon: Zap, step: '02', title: "L'IA génère mon plan", desc: 'Notre algorithme crée un programme sur-mesure adapté à votre profil.' },
              { icon: Target, step: '03', title: 'Je cours et je progresse', desc: 'Suivez votre plan semaine après semaine et atteignez vos objectifs.' },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="group text-center relative">
                <div className="relative inline-flex mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-white border border-orange-200 shadow-md flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-orange-200/50 transition-all duration-300">
                    <Icon className="text-orange-500" size={32} />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md">{step}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
                <p className="text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: COMPARATIF */}
      <section className="py-20 md:py-28 relative overflow-hidden bg-white">
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-orange-100/30 rounded-full blur-[128px]"></div>

        <div className="relative max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-black text-center mb-4 tracking-tight text-slate-900">
            Pourquoi choisir <span className="text-orange-500">Coach Running IA</span> ?
          </h2>
          <p className="text-center text-slate-500 mb-16 max-w-2xl mx-auto text-lg">
            Comparez les différentes solutions d'entraînement running
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-md">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-5 text-left text-sm font-bold text-slate-500">Fonctionnalité</th>
                  <th className="px-6 py-5 text-center text-sm font-bold text-slate-500">Coach humain</th>
                  <th className="px-6 py-5 text-center text-sm font-bold text-slate-500">Apps classiques</th>
                  <th className="px-6 py-5 text-center text-sm font-bold text-orange-600 bg-orange-50">Coach Running IA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { feature: 'Plan personnalisé', coach: true, apps: false, us: true },
                  { feature: 'Adapté à vos contraintes', coach: true, apps: false, us: true },
                  { feature: 'Disponible 24h/24', coach: false, apps: true, us: true },
                  { feature: 'Prix accessible', coach: false, apps: true, us: true },
                  { feature: 'Ajustement en temps réel', coach: true, apps: false, us: true },
                ].map(({ feature, coach, apps, us }) => (
                  <tr key={feature} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700 text-sm">{feature}</td>
                    <td className="px-6 py-4 text-center">
                      {coach ? <CheckCircle className="text-green-500/70 mx-auto" size={18} /> : <X className="text-red-400/50 mx-auto" size={18} />}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {apps ? <CheckCircle className="text-green-500/70 mx-auto" size={18} /> : <X className="text-red-400/50 mx-auto" size={18} />}
                    </td>
                    <td className="px-6 py-4 text-center bg-orange-50/50">
                      {us ? <CheckCircle className="text-green-500 mx-auto" size={18} /> : <X className="text-red-400/50 mx-auto" size={18} />}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td className="px-6 py-5 font-bold text-slate-800 text-sm">Prix</td>
                  <td className="px-6 py-5 text-center font-bold text-slate-500 text-sm">150-300€/mois</td>
                  <td className="px-6 py-5 text-center font-bold text-slate-500 text-sm">10-15€/mois</td>
                  <td className="px-6 py-5 text-center bg-orange-50">
                    <span className="font-bold text-orange-600 text-sm">1ère semaine gratuite</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 5: TÉMOIGNAGES */}
      <section className="py-20 md:py-28 relative bg-gray-50">
        <div className="relative max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-black text-center mb-16 tracking-tight text-slate-900">
            Ils ont atteint leurs <span className="text-orange-500">objectifs</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-2xl p-8 bg-white border border-gray-100 shadow-md hover:shadow-lg hover:border-orange-200 transition-all duration-300">
              <div className="flex items-center gap-1 mb-5">
                {[...Array(5)].map((_, i) => <Star key={i} className="text-orange-400 fill-orange-400" size={16} />)}
              </div>
              <p className="text-slate-600 mb-8 italic leading-relaxed">
                "Avoir un plan qui s'adapte à mes contraintes de temps, c'est top ! J'ai gagné <span className="font-bold text-slate-900">10 minutes sur mon semi-marathon</span> sans trop de difficultés. L'IA comprend vraiment mon rythme de vie."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/30">R</div>
                <div>
                  <div className="font-bold text-slate-800">Romane</div>
                  <div className="text-sm text-slate-500">Marathonienne, 28 ans</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-8 bg-white border border-gray-100 shadow-md hover:shadow-lg hover:border-orange-200 transition-all duration-300">
              <div className="flex items-center gap-1 mb-5">
                {[...Array(5)].map((_, i) => <Star key={i} className="text-orange-400 fill-orange-400" size={16} />)}
              </div>
              <p className="text-slate-600 mb-8 italic leading-relaxed">
                "Surpris en positif de la <span className="font-bold text-slate-900">qualité et diversité des entraînements</span>. Après 10 marathons et un Ironman, je pensais avoir tout vu. Coach Running IA m'a proposé des séances variées et intelligentes."
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

      {/* SECTION: CONNECTÉ À STRAVA */}
      <section className="py-20 md:py-28 relative bg-white">
        <div className="relative max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">
                Connecté à <span className="text-[#FC4C02]">Strava</span>
              </h2>
              <svg className="w-10 h-10 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
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

          <div className="mt-12 flex items-center justify-center gap-3">
            <span className="text-sm text-slate-400">Compatible with</span>
            <svg className="w-6 h-6 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            <span className="text-sm font-bold text-[#FC4C02]">Strava</span>
          </div>
        </div>
      </section>

      {/* SECTION 6: BLOG */}
      {blogPosts.length > 0 && (
        <section className="py-20 md:py-28 relative overflow-hidden bg-white">
          <div className="relative max-w-5xl mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-black text-center mb-4 tracking-tight text-slate-900">
              Nos conseils <span className="text-orange-500">running</span>
            </h2>
            <p className="text-center text-slate-500 mb-16 text-lg">
              Articles et guides pour progresser en course à pied
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {blogPosts.map(post => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                  <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-md hover:shadow-lg hover:border-orange-200 transition-all duration-300 hover:-translate-y-1">
                    {post.coverImage ? (
                      <img src={post.coverImage} alt={post.title} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-44 bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
                        <span className="text-4xl opacity-50">🏃</span>
                      </div>
                    )}
                    <div className="p-5">
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

      {/* SECTION 7: FAQ */}
      <section className="py-20 md:py-28 relative bg-orange-50/30">
        <div className="relative max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-black text-center mb-16 tracking-tight text-slate-900">
            Questions <span className="text-orange-500">fréquentes</span>
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

      {/* SECTION 8: CTA FINAL */}
      <section className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-[128px]"></div>

        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight text-white">
            Prêt à atteindre vos objectifs ?
          </h2>
          <p className="text-orange-100 mb-10 text-lg max-w-xl mx-auto">
            Rejoignez les coureurs qui ont déjà franchi le pas avec Coach Running IA
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
