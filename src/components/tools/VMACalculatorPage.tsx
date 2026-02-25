
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, TrendingUp, Target, Clock, Zap } from 'lucide-react';

const VMACalculatorPage: React.FC = () => {
  const [testType, setTestType] = useState<'cooper' | 'demicooper' | 'vameval' | 'time'>('cooper');
  const [distance, setDistance] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [vma, setVma] = useState<number | null>(null);

  const calculateVMA = () => {
    let calculatedVMA: number | null = null;

    switch (testType) {
      case 'cooper':
        // Test de Cooper : VMA = (Distance en m / 12) * (60/50) = Distance * 0.1
        if (distance) {
          calculatedVMA = parseFloat(distance) / 100;
        }
        break;
      case 'demicooper':
        // Demi-Cooper (6 min) : VMA = Distance / 100
        if (distance) {
          calculatedVMA = parseFloat(distance) / 100;
        }
        break;
      case 'vameval':
        // VAMEVAL : le palier atteint = VMA
        if (distance) {
          calculatedVMA = parseFloat(distance);
        }
        break;
      case 'time':
        // À partir d'un temps sur distance connue
        if (distance && time) {
          const [min, sec] = time.split(':').map(Number);
          const totalMinutes = min + (sec || 0) / 60;
          const distKm = parseFloat(distance) / 1000;
          const speed = distKm / (totalMinutes / 60);
          // Facteur de correction selon la distance
          const distNum = parseFloat(distance);
          let factor = 1;
          if (distNum <= 1500) factor = 1.0;
          else if (distNum <= 3000) factor = 0.95;
          else if (distNum <= 5000) factor = 0.90;
          else if (distNum <= 10000) factor = 0.85;
          calculatedVMA = speed / factor;
        }
        break;
    }

    setVma(calculatedVMA ? Math.round(calculatedVMA * 10) / 10 : null);
  };

  const getZones = (vmaValue: number) => [
    { name: 'Récupération', percent: '50-60%', speed: `${(vmaValue * 0.5).toFixed(1)} - ${(vmaValue * 0.6).toFixed(1)} km/h`, description: 'Récupération active, échauffement' },
    { name: 'Endurance Fondamentale', percent: '60-70%', speed: `${(vmaValue * 0.6).toFixed(1)} - ${(vmaValue * 0.7).toFixed(1)} km/h`, description: 'Footing, sortie longue' },
    { name: 'Endurance Active', percent: '70-80%', speed: `${(vmaValue * 0.7).toFixed(1)} - ${(vmaValue * 0.8).toFixed(1)} km/h`, description: 'Tempo run, allure marathon' },
    { name: 'Seuil', percent: '80-90%', speed: `${(vmaValue * 0.8).toFixed(1)} - ${(vmaValue * 0.9).toFixed(1)} km/h`, description: 'Seuil anaérobie, allure semi' },
    { name: 'VMA', percent: '95-105%', speed: `${(vmaValue * 0.95).toFixed(1)} - ${(vmaValue * 1.05).toFixed(1)} km/h`, description: 'Fractionné court, développement VMA' },
  ];

  return (
    <>
      <Helmet>
        <title>Calculateur VMA : Estimez Votre Vitesse Maximale Aérobie | Test Gratuit</title>
        <meta name="description" content="Calculez votre VMA (Vitesse Maximale Aérobie) gratuitement. Tests Cooper, Demi-Cooper, VAMEVAL ou estimation par temps de course. Obtenez vos zones d'entraînement personnalisées." />
        <meta name="keywords" content="calculateur VMA, vitesse maximale aérobie, test Cooper, test VAMEVAL, zones entraînement running, calcul VMA gratuit, estimer VMA, allures entraînement" />
        <link rel="canonical" href="https://coachrunningia.fr/outils/calculateur-vma" />
        <meta property="og:title" content="Calculateur VMA : Estimez Votre Vitesse Maximale Aérobie" />
        <meta property="og:description" content="Calculez votre VMA gratuitement avec les tests Cooper, Demi-Cooper, VAMEVAL ou par temps de course. Zones d'entraînement personnalisées." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary via-slate-800 to-slate-900 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="text-sm mb-6 text-slate-300">
              <Link to="/" className="hover:text-white">Accueil</Link>
              <span className="mx-2">/</span>
              <Link to="/glossary" className="hover:text-white">Lexique</Link>
              <span className="mx-2">/</span>
              <span className="text-accent">Calculateur VMA</span>
            </nav>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Calculateur VMA : Estimez Votre Vitesse Maximale Aérobie
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl">
              La VMA est la clé d'un entraînement running efficace. Calculez-la gratuitement
              et obtenez vos zones d'entraînement personnalisées pour progresser plus vite.
            </p>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="py-12 -mt-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-accent/10 rounded-xl">
                  <Calculator className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Calculer ma VMA</h2>
              </div>

              {/* Test Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Méthode de calcul
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'cooper', label: 'Test Cooper', desc: '12 min' },
                    { id: 'demicooper', label: 'Demi-Cooper', desc: '6 min' },
                    { id: 'vameval', label: 'VAMEVAL', desc: 'Palier' },
                    { id: 'time', label: 'Temps course', desc: 'Distance/Temps' },
                  ].map((test) => (
                    <button
                      key={test.id}
                      onClick={() => {
                        setTestType(test.id as typeof testType);
                        setDistance('');
                        setTime('');
                        setVma(null);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        testType === test.id
                          ? 'border-accent bg-accent/5'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium text-slate-900">{test.label}</div>
                      <div className="text-xs text-slate-500">{test.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {testType === 'cooper' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Distance parcourue en 12 minutes (mètres)
                    </label>
                    <input
                      type="number"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      placeholder="Ex: 2800"
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                )}

                {testType === 'demicooper' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Distance parcourue en 6 minutes (mètres)
                    </label>
                    <input
                      type="number"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      placeholder="Ex: 1500"
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                )}

                {testType === 'vameval' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Dernier palier atteint (correspond à la VMA)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      placeholder="Ex: 14.5"
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                )}

                {testType === 'time' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Distance de la course (mètres)
                      </label>
                      <select
                        value={distance}
                        onChange={(e) => setDistance(e.target.value)}
                        className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                      >
                        <option value="">Sélectionner</option>
                        <option value="1500">1500m</option>
                        <option value="3000">3000m</option>
                        <option value="5000">5km</option>
                        <option value="10000">10km</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Temps réalisé (mm:ss)
                      </label>
                      <input
                        type="text"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        placeholder="Ex: 25:30"
                        className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={calculateVMA}
                className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Calculer ma VMA
              </button>

              {/* Results */}
              {vma && (
                <div className="mt-8 p-6 bg-gradient-to-br from-accent/10 to-primary/5 rounded-xl border border-accent/20">
                  <div className="text-center mb-6">
                    <div className="text-sm text-slate-600 mb-1">Votre VMA estimée</div>
                    <div className="text-5xl font-bold text-accent">{vma} km/h</div>
                  </div>

                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-accent" />
                    Vos zones d'entraînement
                  </h3>
                  <div className="space-y-3">
                    {getZones(vma).map((zone, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div>
                          <div className="font-medium text-slate-900">{zone.name}</div>
                          <div className="text-xs text-slate-500">{zone.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-accent">{zone.speed}</div>
                          <div className="text-xs text-slate-500">{zone.percent}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Content Section - H2/H3 for SEO */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">
              Qu'est-ce que la VMA (Vitesse Maximale Aérobie) ?
            </h2>

            <div className="prose prose-slate max-w-none">
              <p className="text-lg text-slate-600 mb-6">
                La <strong>VMA (Vitesse Maximale Aérobie)</strong> représente la vitesse de course à partir de laquelle
                votre consommation d'oxygène atteint son maximum (VO2max). C'est un indicateur fondamental
                de votre potentiel en course à pied et la base de tout entraînement structuré.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
                Pourquoi connaître sa VMA est essentiel ?
              </h3>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span><strong>Personnaliser vos allures :</strong> Finis les entraînements au feeling, chaque séance est calibrée sur VOS capacités</span>
                </li>
                <li className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span><strong>Fixer des objectifs réalistes :</strong> Prédisez vos temps sur 10km, semi ou marathon</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span><strong>Suivre votre progression :</strong> Une VMA qui augmente = une forme qui s'améliore</span>
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
                Les différentes méthodes pour calculer sa VMA
              </h3>

              <h4 className="text-lg font-medium text-slate-800 mt-6 mb-3">Test de Cooper (12 minutes)</h4>
              <p className="text-slate-600 mb-4">
                Le <strong>test de Cooper</strong> est le plus connu. Courez la plus grande distance possible en 12 minutes
                sur une piste. Formule : <code className="bg-slate-100 px-2 py-1 rounded">VMA = Distance (m) ÷ 100</code>
              </p>

              <h4 className="text-lg font-medium text-slate-800 mt-6 mb-3">Test Demi-Cooper (6 minutes)</h4>
              <p className="text-slate-600 mb-4">
                Version raccourcie du Cooper, idéale pour les débutants ou les personnes moins endurantes.
                Même formule : <code className="bg-slate-100 px-2 py-1 rounded">VMA = Distance (m) ÷ 100</code>
              </p>

              <h4 className="text-lg font-medium text-slate-800 mt-6 mb-3">Test VAMEVAL</h4>
              <p className="text-slate-600 mb-4">
                Test progressif par paliers de 1 minute avec augmentation de 0.5 km/h. Le dernier palier
                complété correspond directement à votre VMA. C'est le test le plus précis.
              </p>

              <h4 className="text-lg font-medium text-slate-800 mt-6 mb-3">Estimation par temps de course</h4>
              <p className="text-slate-600 mb-4">
                Si vous avez un temps récent sur 5km ou 10km, notre calculateur peut estimer votre VMA
                en appliquant des facteurs de correction basés sur le pourcentage de VMA typiquement
                tenu sur chaque distance.
              </p>
            </div>
          </div>
        </section>

        {/* Reference Table */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              Tableau de référence VMA et allures d'entraînement
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-lg overflow-hidden">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">VMA</th>
                    <th className="px-4 py-3 text-left">Endurance (65%)</th>
                    <th className="px-4 py-3 text-left">Seuil (85%)</th>
                    <th className="px-4 py-3 text-left">VMA (100%)</th>
                    <th className="px-4 py-3 text-left">Niveau</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {[
                    { vma: 10, niveau: 'Débutant' },
                    { vma: 12, niveau: 'Débutant+' },
                    { vma: 14, niveau: 'Intermédiaire' },
                    { vma: 16, niveau: 'Confirmé' },
                    { vma: 18, niveau: 'Avancé' },
                    { vma: 20, niveau: 'Expert' },
                    { vma: 22, niveau: 'Elite' },
                  ].map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 font-semibold text-accent">{row.vma} km/h</td>
                      <td className="px-4 py-3">{(row.vma * 0.65).toFixed(1)} km/h</td>
                      <td className="px-4 py-3">{(row.vma * 0.85).toFixed(1)} km/h</td>
                      <td className="px-4 py-3">{row.vma} km/h</td>
                      <td className="px-4 py-3 text-slate-600">{row.niveau}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Training Zones Explanation */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">
              Comment utiliser sa VMA pour s'entraîner ?
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-green-50 rounded-xl border border-green-200">
                <h3 className="text-lg font-semibold text-green-800 mb-3">Endurance Fondamentale (60-70% VMA)</h3>
                <p className="text-green-700 text-sm">
                  Zone de confort pour les footings et sorties longues. Vous devez pouvoir tenir une conversation.
                  C'est la base de l'entraînement : 70-80% de votre volume devrait être à cette intensité.
                </p>
              </div>

              <div className="p-6 bg-yellow-50 rounded-xl border border-yellow-200">
                <h3 className="text-lg font-semibold text-yellow-800 mb-3">Allure Seuil (80-90% VMA)</h3>
                <p className="text-yellow-700 text-sm">
                  Intensité "confortablement difficile". Idéale pour les tempo runs et l'allure semi-marathon.
                  Développe votre capacité à maintenir un effort prolongé.
                </p>
              </div>

              <div className="p-6 bg-orange-50 rounded-xl border border-orange-200">
                <h3 className="text-lg font-semibold text-orange-800 mb-3">Allure VMA (95-105% VMA)</h3>
                <p className="text-orange-700 text-sm">
                  Intensité maximale tenable 4-8 minutes. Utilisée pour le fractionné court (30/30, 200m, 400m).
                  Développe puissamment votre capacité aérobie.
                </p>
              </div>

              <div className="p-6 bg-red-50 rounded-xl border border-red-200">
                <h3 className="text-lg font-semibold text-red-800 mb-3">Sur-vitesse (105-110% VMA)</h3>
                <p className="text-red-700 text-sm">
                  Travail de vitesse pure sur des répétitions très courtes (100-200m).
                  Améliore l'économie de course et la puissance musculaire.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
              Autres outils pour optimiser votre entraînement
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <Link to="/outils/convertisseur-allure" className="group p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-100">
                <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  Convertisseur Allure
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Convertissez min/km en km/h instantanément
                </p>
                <span className="text-accent text-sm font-medium flex items-center gap-1">
                  Utiliser <ArrowRight className="w-4 h-4" />
                </span>
              </Link>

              <Link to="/outils/predicteur-temps" className="group p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-100">
                <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  Prédicteur de Temps
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Estimez vos temps sur toutes les distances
                </p>
                <span className="text-accent text-sm font-medium flex items-center gap-1">
                  Utiliser <ArrowRight className="w-4 h-4" />
                </span>
              </Link>

              <Link to="/outils/allure-marathon" className="group p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-100">
                <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  Calculateur Marathon
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Trouvez votre allure idéale pour le marathon
                </p>
                <span className="text-accent text-sm font-medium flex items-center gap-1">
                  Utiliser <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-accent to-orange-500 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Passez au niveau supérieur avec un plan personnalisé
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Maintenant que vous connaissez votre VMA, laissez notre IA créer un plan
              d'entraînement sur-mesure adapté à vos objectifs et votre emploi du temps.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 bg-white text-accent hover:bg-slate-100 font-semibold py-4 px-8 rounded-full transition-colors shadow-lg"
            >
              Créer mon plan personnalisé
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};

export default VMACalculatorPage;
