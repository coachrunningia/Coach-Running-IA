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
    <div className="bg-white">
      <Helmet>
        <title>Coach Running IA - Programme course à pied personnalisé par IA</title>
        <meta name="description" content="Programme course à pied 100% personnalisé par IA. Plans marathon, semi, trail, 10km adaptés à votre niveau et vos disponibilités. 1ère semaine offerte." />
        <link rel="canonical" href="https://coachrunningia.fr/" />
        <meta property="og:title" content="Coach Running IA - Programme course à pied personnalisé par IA" />
        <meta property="og:description" content="Programme course à pied personnalisé par IA. Plans marathon, semi, trail, 10km adaptés à votre niveau." />
        <meta property="og:url" content="https://coachrunningia.fr/" />
      </Helmet>
      {/* SECTION 1: HERO */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            Programme course à pied <span className="text-accent">personnalisé</span>
          </h1>
          <h2 className="text-xl md:text-2xl text-slate-300 mb-6 max-w-3xl mx-auto">
            Plans d'entraînement marathon, semi-marathon, 10km et trail générés par IA en 2 minutes
          </h2>
          <p className="text-slate-400 text-sm mb-2">✓ 1ère semaine gratuite ✓ Sans carte bancaire ✓ En 2 min</p>
        </div>
      </section>

      {/* POWERED BY STRAVA BANNER */}
      <div className="bg-orange-50 border-b border-orange-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Compatible avec</span>
          <svg className="w-5 h-5 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
          <span className="text-sm font-bold text-[#FC4C02]">Powered by Strava</span>
        </div>
      </div>

      {/* SECTION 2: QUESTIONNAIRE - Directement après le hero */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 mb-4">
            Créez votre programme personnalisé
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Répondez à quelques questions et recevez votre plan d'entraînement sur-mesure
          </p>
          <Questionnaire onComplete={onPlanGeneration} isGenerating={isGenerating} user={user} />
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
                <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-lg">🤖</div>
                <h3 className="font-bold text-slate-400 text-lg">ChatGPT</h3>
              </div>
              <div className="space-y-3 text-slate-400 text-sm">
                <div className="flex items-start gap-2">
                  <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <span>Génère un plan à partir de tout ce qui existe en ligne — <strong>sans distinguer les bons des mauvais conseils</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <span>Aucune validation médicale sur le renforcement musculaire</span>
                </div>
                <div className="flex items-start gap-2">
                  <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <span>Oublie tout entre chaque conversation</span>
                </div>
                <div className="flex items-start gap-2">
                  <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <span>Aucun suivi réel de ta progression</span>
                </div>
                <div className="flex items-start gap-2">
                  <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <span>Pas d'analyse de tes performances Strava</span>
                </div>
                <div className="flex items-start gap-2">
                  <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <span>Plan en texte brut — pas de calendrier, pas d'export, pas de suivi</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border-2 border-accent/30 relative">
              <div className="absolute -top-3 right-4 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">RECOMMANDÉ</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-lg">🏃</div>
                <h3 className="font-bold text-slate-900 text-lg">Coach Running IA</h3>
              </div>
              <div className="space-y-3 text-slate-700 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span>Entraîné sur des <strong>milliers de plans validés par des professionnels</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span>Renforcement musculaire avec <strong>regard médical et exercices spécifiques</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span><strong>Questionnaire personnalisé</strong> — VMA, objectif, jours dispo, blessures</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span><strong>Feedback hebdomadaire</strong> — le plan s'adapte à ton ressenti sans perdre le contexte</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span><strong>Analyse mensuelle Strava</strong> — bilan sur tes performances réelles</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span><strong>Plan structuré</strong> semaine par semaine avec calendrier visuel et export agenda</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-slate-400 text-sm mt-8 max-w-xl mx-auto">
            ChatGPT est un outil génial — mais généraliste. Coach Running IA est un <strong className="text-slate-600">spécialiste de l'entraînement running</strong>, conçu pour une seule mission : te faire progresser.
          </p>
        </div>
      </section>

      {/* SECTION 3: COMMENT ÇA MARCHE */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
            Obtenez votre programme d'entraînement personnalisé en 3 étapes simples
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="text-accent" size={32} />
              </div>
              <div className="text-accent font-bold text-sm mb-2">ÉTAPE 1</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Je réponds au questionnaire</h3>
              <p className="text-slate-500">Moins d'1 minute pour définir votre niveau, objectif et disponibilités.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="text-accent" size={32} />
              </div>
              <div className="text-accent font-bold text-sm mb-2">ÉTAPE 2</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">L'IA génère mon plan</h3>
              <p className="text-slate-500">Notre algorithme crée un programme sur-mesure adapté à votre profil.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="text-accent" size={32} />
              </div>
              <div className="text-accent font-bold text-sm mb-2">ÉTAPE 3</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Je cours et je progresse</h3>
              <p className="text-slate-500">Suivez votre plan semaine après semaine et atteignez vos objectifs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: COMPARATIF */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-4">
            Pourquoi choisir Coach Running IA ?
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
            Comparez les différentes solutions d'entraînement running
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-2xl shadow-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-6 py-4 text-left">Fonctionnalité</th>
                  <th className="px-6 py-4 text-center">Coach humain</th>
                  <th className="px-6 py-4 text-center">Apps classiques</th>
                  <th className="px-6 py-4 text-center bg-accent">Coach Running IA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-6 py-4 font-medium">Plan personnalisé</td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="text-green-500 mx-auto" size={20} /></td>
                  <td className="px-6 py-4 text-center"><X className="text-red-400 mx-auto" size={20} /></td>
                  <td className="px-6 py-4 text-center bg-accent/5"><CheckCircle className="text-green-500 mx-auto" size={20} /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Adapté à vos contraintes</td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="text-green-500 mx-auto" size={20} /></td>
                  <td className="px-6 py-4 text-center"><X className="text-red-400 mx-auto" size={20} /></td>
                  <td className="px-6 py-4 text-center bg-accent/5"><CheckCircle className="text-green-500 mx-auto" size={20} /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Disponible 24h/24</td>
                  <td className="px-6 py-4 text-center"><X className="text-red-400 mx-auto" size={20} /></td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="text-green-500 mx-auto" size={20} /></td>
                  <td className="px-6 py-4 text-center bg-accent/5"><CheckCircle className="text-green-500 mx-auto" size={20} /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Prix accessible</td>
                  <td className="px-6 py-4 text-center"><X className="text-red-400 mx-auto" size={20} /></td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="text-green-500 mx-auto" size={20} /></td>
                  <td className="px-6 py-4 text-center bg-accent/5"><CheckCircle className="text-green-500 mx-auto" size={20} /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Ajustement en temps réel</td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="text-green-500 mx-auto" size={20} /></td>
                  <td className="px-6 py-4 text-center"><X className="text-red-400 mx-auto" size={20} /></td>
                  <td className="px-6 py-4 text-center bg-accent/5"><CheckCircle className="text-green-500 mx-auto" size={20} /></td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-6 py-4 font-bold">Prix</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-900">150-300€/mois</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-900">10-15€/mois</td>
                  <td className="px-6 py-4 text-center font-bold text-accent bg-accent/5">1ère semaine gratuite</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 5: TÉMOIGNAGES */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-12">
            Ils ont atteint leurs objectifs
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="text-yellow-500 fill-yellow-500" size={18} />)}
              </div>
              <p className="text-slate-600 mb-6 italic">
                "Avoir un plan qui s'adapte à mes contraintes de temps, c'est top ! J'ai gagné <span className="font-bold text-slate-900">10 minutes sur mon semi-marathon</span> sans trop de difficultés. L'IA comprend vraiment mon rythme de vie."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center text-accent font-bold">R</div>
                <div>
                  <div className="font-bold text-slate-900">Romane</div>
                  <div className="text-sm text-slate-500">Marathonienne, 28 ans</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="text-yellow-500 fill-yellow-500" size={18} />)}
              </div>
              <p className="text-slate-600 mb-6 italic">
                "Surpris en positif de la <span className="font-bold text-slate-900">qualité et diversité des entraînements</span>. Après 10 marathons et un Ironman, je pensais avoir tout vu. Coach Running IA m'a proposé des séances variées et intelligentes."
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
        </div>
      </section>

      {/* SECTION 6: BLOG */}
      {blogPosts.length > 0 && (
        <section className="py-16 md:py-24 bg-slate-50">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-4">
              Nos conseils running
            </h2>
            <p className="text-center text-slate-500 mb-12">
              Articles et guides pour progresser en course à pied
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              {blogPosts.map(post => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                    {post.coverImage ? (
                      <img src={post.coverImage} alt={post.title} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-slate-100 flex items-center justify-center">
                        <span className="text-4xl opacity-30">🏃</span>
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-bold text-slate-900 group-hover:text-accent transition-colors line-clamp-2 mb-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-2">{post.excerpt}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            <div className="text-center mt-8">
              <Link to="/blog" className="text-accent font-bold hover:underline">
                Voir tous les articles →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 7: FAQ */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-12">
            Questions fréquentes
          </h2>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="font-bold text-slate-900">{faq.question}</span>
                  {openFaq === index ? <ChevronUp className="text-accent" size={20} /> : <ChevronDown className="text-slate-400" size={20} />}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-slate-600">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: CTA FINAL */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Prêt à atteindre vos objectifs ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Rejoignez les coureurs qui ont déjà franchi le pas avec Coach Running IA
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2"
          >
            Créer mon plan gratuit
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
