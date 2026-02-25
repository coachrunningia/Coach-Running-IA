
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, Zap, Clock, Target, TrendingUp } from 'lucide-react';

const tools = [
  {
    id: 'convertisseur-allure',
    path: '/outils/convertisseur-allure',
    title: 'Convertisseur Allure Running',
    subtitle: 'min/km ↔ km/h',
    description: 'Convertissez instantanément votre allure de course (min/km) en vitesse (km/h) et inversement. Indispensable pour calibrer vos séances.',
    icon: Calculator,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    keywords: ['convertisseur allure', 'min/km en km/h', 'calculateur vitesse']
  },
  {
    id: 'calculateur-vma',
    path: '/outils/calculateur-vma',
    title: 'Calculateur VMA',
    subtitle: 'Vitesse Maximale Aérobie',
    description: 'Estimez votre VMA à partir de tests terrain (Cooper, VAMEVAL) ou de vos temps de course. Obtenez vos zones d\'entraînement personnalisées.',
    icon: Zap,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50',
    keywords: ['calculateur VMA', 'test Cooper', 'zones entraînement']
  },
  {
    id: 'predicteur-temps',
    path: '/outils/predicteur-temps',
    title: 'Prédicteur de Temps',
    subtitle: '5km → Marathon',
    description: 'Prédisez vos temps potentiels sur toutes les distances (5km, 10km, semi, marathon) à partir d\'une seule performance de référence.',
    icon: Clock,
    color: 'from-purple-500 to-indigo-500',
    bgColor: 'bg-purple-50',
    keywords: ['prédicteur temps course', 'estimation chrono', 'objectif marathon']
  },
  {
    id: 'allure-marathon',
    path: '/outils/allure-marathon',
    title: 'Calculateur Allure Marathon',
    subtitle: 'Objectif → Pace',
    description: 'Trouvez l\'allure exacte à maintenir pour atteindre votre objectif marathon. Obtenez vos temps de passage et votre stratégie de course.',
    icon: Target,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    keywords: ['allure marathon', 'pace marathon', 'temps de passage']
  }
];

const ToolsIndexPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Outils Running Gratuits : Calculateurs et Simulateurs | Coach Running IA</title>
        <meta name="description" content="Découvrez nos outils running gratuits : convertisseur d'allure min/km ↔ km/h, calculateur VMA, prédicteur de temps de course, calculateur allure marathon. Optimisez votre entraînement !" />
        <meta name="keywords" content="outils running, calculateur course à pied, convertisseur allure, calculateur VMA, prédicteur temps marathon, simulateur running gratuit" />
        <link rel="canonical" href="https://coachrunningia.fr/outils" />
        <meta property="og:title" content="Outils Running Gratuits : Calculateurs et Simulateurs" />
        <meta property="og:description" content="Calculateurs gratuits pour optimiser votre entraînement running : VMA, allure, prédiction de temps, pace marathon." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary via-slate-800 to-slate-900 text-white py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Calculator className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium">Outils 100% gratuits</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Outils Running <span className="text-accent">Gratuits</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
              Calculateurs et simulateurs pour optimiser chaque aspect de votre entraînement.
              Convertissez, estimez, planifiez : tout ce dont vous avez besoin pour progresser.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-8 mt-12">
              <div className="text-center">
                <div className="text-4xl font-black text-accent">4</div>
                <div className="text-sm text-slate-400">Outils disponibles</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-accent">100%</div>
                <div className="text-sm text-slate-400">Gratuit</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-accent">0</div>
                <div className="text-sm text-slate-400">Inscription requise</div>
              </div>
            </div>
          </div>
        </section>

        {/* Tools Grid */}
        <section className="py-16 -mt-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              {tools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <Link
                    key={tool.id}
                    to={tool.path}
                    className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-100 hover:border-accent/30"
                  >
                    {/* Gradient top bar */}
                    <div className={`h-2 bg-gradient-to-r ${tool.color}`} />

                    <div className="p-8">
                      {/* Icon and Title */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`p-4 rounded-2xl ${tool.bgColor} group-hover:scale-110 transition-transform`}>
                          <IconComponent className="w-8 h-8 text-slate-700" />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-xl font-bold text-slate-900 group-hover:text-accent transition-colors">
                            {tool.title}
                          </h2>
                          <p className="text-sm text-accent font-medium">{tool.subtitle}</p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-slate-600 mb-6 leading-relaxed">
                        {tool.description}
                      </p>

                      {/* Keywords tags */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {tool.keywords.map((kw, idx) => (
                          <span key={idx} className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                            {kw}
                          </span>
                        ))}
                      </div>

                      {/* CTA */}
                      <div className="flex items-center justify-between">
                        <span className="text-accent font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                          Utiliser l'outil
                          <ArrowRight className="w-5 h-5" />
                        </span>
                        <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">Gratuit</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why Use Our Tools */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
              Pourquoi utiliser nos outils running ?
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Précision scientifique</h3>
                <p className="text-sm text-slate-600">
                  Nos calculateurs utilisent des formules validées par la communauté scientifique (Riegel, Cooper, etc.)
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Instantané</h3>
                <p className="text-sm text-slate-600">
                  Résultats immédiats, sans inscription ni téléchargement. Utilisez-les sur n'importe quel appareil.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Adapté à tous</h3>
                <p className="text-sm text-slate-600">
                  Du débutant à l'expert, nos outils s'adaptent à votre niveau et vos objectifs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How to Use */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
              Comment optimiser votre entraînement ?
            </h2>
            <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
              Utilisez nos outils dans l'ordre pour construire un plan d'entraînement sur mesure.
            </p>

            <div className="grid md:grid-cols-4 gap-6">
              <div className="relative">
                <div className="absolute top-4 -right-3 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-sm font-bold z-10 hidden md:flex">1</div>
                <div className="bg-slate-50 rounded-xl p-6 h-full border border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-2">Testez votre VMA</h3>
                  <p className="text-sm text-slate-600">Faites un test Cooper ou VAMEVAL pour connaître votre VMA de base.</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute top-4 -right-3 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-sm font-bold z-10 hidden md:flex">2</div>
                <div className="bg-slate-50 rounded-xl p-6 h-full border border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-2">Définissez vos zones</h3>
                  <p className="text-sm text-slate-600">Le calculateur VMA vous donne vos allures d'entraînement personnalisées.</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute top-4 -right-3 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-sm font-bold z-10 hidden md:flex">3</div>
                <div className="bg-slate-50 rounded-xl p-6 h-full border border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-2">Fixez un objectif</h3>
                  <p className="text-sm text-slate-600">Utilisez le prédicteur pour connaître vos temps potentiels sur chaque distance.</p>
                </div>
              </div>

              <div className="relative">
                <div className="bg-slate-50 rounded-xl p-6 h-full border border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-2">Planifiez</h3>
                  <p className="text-sm text-slate-600">Calculez votre allure cible et vos temps de passage pour le jour J.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-accent to-orange-500 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Prêt à passer au niveau supérieur ?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Nos outils vous donnent les bases. Notre coach IA vous crée un plan
              d'entraînement complet et personnalisé pour atteindre vos objectifs.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-white text-accent hover:bg-slate-100 font-semibold py-4 px-8 rounded-full transition-colors shadow-lg"
            >
              Créer mon plan personnalisé
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        {/* SEO Content */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Les outils indispensables du coureur
            </h2>

            <div className="prose prose-slate max-w-none">
              <p>
                Que vous soyez <strong>débutant en course à pied</strong> ou <strong>coureur confirmé préparant un marathon</strong>,
                avoir accès aux bons outils de calcul est essentiel pour progresser efficacement et éviter les blessures.
              </p>

              <h3>Convertisseur d'allure : l'outil de base</h3>
              <p>
                Le <strong>convertisseur min/km en km/h</strong> est l'outil le plus utilisé par les coureurs.
                Il permet de passer rapidement d'une notation à l'autre selon vos préférences ou celles de votre
                montre GPS. Savoir que 5'00"/km correspond à 12 km/h devient un réflexe !
              </p>

              <h3>Calculateur VMA : la clé de l'entraînement structuré</h3>
              <p>
                La <strong>VMA (Vitesse Maximale Aérobie)</strong> est la pierre angulaire de tout entraînement running.
                Connaître sa VMA permet de définir précisément ses zones d'entraînement : endurance fondamentale,
                allure seuil, fractionné... Fini les séances "au feeling" !
              </p>

              <h3>Prédicteur de temps : fixez des objectifs réalistes</h3>
              <p>
                Basé sur la <strong>formule de Riegel</strong>, notre prédicteur estime vos temps potentiels
                sur différentes distances. Un 10km en 50 minutes ? Vous pouvez viser environ 1h50 au semi-marathon
                et 3h50 au marathon.
              </p>

              <h3>Calculateur allure marathon : optimisez votre course</h3>
              <p>
                Le marathon est une épreuve où la <strong>gestion de l'allure</strong> fait la différence.
                Notre calculateur vous donne l'allure exacte à maintenir et vos temps de passage
                pour éviter le fameux "mur" du 30ème kilomètre.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default ToolsIndexPage;
