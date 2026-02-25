
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, Trophy, Clock, Target, TrendingUp } from 'lucide-react';

interface PredictionResult {
  distance: string;
  time: string;
  pace: string;
}

const RacePredictorPage: React.FC = () => {
  const [refDistance, setRefDistance] = useState<string>('10000');
  const [refTime, setRefTime] = useState<string>('');
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);

  const distances = [
    { value: '1500', label: '1500m' },
    { value: '3000', label: '3000m' },
    { value: '5000', label: '5km' },
    { value: '10000', label: '10km' },
    { value: '21097', label: 'Semi-marathon' },
    { value: '42195', label: 'Marathon' },
  ];

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);

    if (h > 0) {
      return `${h}h${m.toString().padStart(2, '0')}'${s.toString().padStart(2, '0')}"`;
    }
    return `${m}'${s.toString().padStart(2, '0')}"`;
  };

  const formatPace = (secondsPerKm: number): string => {
    const min = Math.floor(secondsPerKm / 60);
    const sec = Math.round(secondsPerKm % 60);
    return `${min}'${sec.toString().padStart(2, '0')}"/km`;
  };

  const predictTime = (refDist: number, refTimeSec: number, targetDist: number): number => {
    // Formule de Riegel : T2 = T1 × (D2/D1)^1.06
    const factor = 1.06;
    return refTimeSec * Math.pow(targetDist / refDist, factor);
  };

  const calculatePredictions = () => {
    const refDistNum = parseFloat(refDistance);
    const refTimeSec = parseTime(refTime);

    if (!refTimeSec || !refDistNum) return;

    const results: PredictionResult[] = distances.map((d) => {
      const targetDist = parseFloat(d.value);
      const predictedTime = predictTime(refDistNum, refTimeSec, targetDist);
      const pacePerKm = predictedTime / (targetDist / 1000);

      return {
        distance: d.label,
        time: formatTime(predictedTime),
        pace: formatPace(pacePerKm),
      };
    });

    setPredictions(results);
  };

  return (
    <>
      <Helmet>
        <title>Prédicteur de Temps Course à Pied : Estimez vos Chronos | Calculateur Gratuit</title>
        <meta name="description" content="Prédisez vos temps de course sur 5km, 10km, semi-marathon et marathon à partir d'une performance récente. Formule de Riegel pour des estimations précises." />
        <meta name="keywords" content="prédicteur temps course, calculateur marathon, estimation chrono 10km, prédiction semi-marathon, formule Riegel, objectif course à pied" />
        <link rel="canonical" href="https://coachrunningia.fr/outils/predicteur-temps" />
        <meta property="og:title" content="Prédicteur de Temps Course à Pied : Estimez vos Chronos" />
        <meta property="og:description" content="Calculez vos temps potentiels sur toutes les distances running à partir d'une seule performance de référence." />
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
              <span className="text-accent">Prédicteur de Temps</span>
            </nav>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Prédicteur de Temps Course à Pied : Estimez vos Chronos
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl">
              Découvrez vos temps potentiels sur 5km, 10km, semi-marathon et marathon
              à partir d'une seule performance de référence. Basé sur la formule scientifique de Riegel.
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
                <h2 className="text-2xl font-bold text-slate-900">Prédire mes temps de course</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Distance de référence
                  </label>
                  <select
                    value={refDistance}
                    onChange={(e) => setRefDistance(e.target.value)}
                    className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                  >
                    {distances.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Votre temps sur cette distance
                  </label>
                  <input
                    type="text"
                    value={refTime}
                    onChange={(e) => setRefTime(e.target.value)}
                    placeholder="Ex: 50:30 ou 1:45:00"
                    className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                  <p className="text-xs text-slate-500 mt-1">Format : mm:ss ou hh:mm:ss</p>
                </div>
              </div>

              <button
                onClick={calculatePredictions}
                className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trophy className="w-5 h-5" />
                Calculer mes prédictions
              </button>

              {/* Results */}
              {predictions.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-accent" />
                    Vos temps prédits
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {predictions.map((pred, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border-2 ${
                          pred.distance === 'Marathon' || pred.distance === 'Semi-marathon'
                            ? 'bg-gradient-to-br from-accent/10 to-orange-50 border-accent/30'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="text-sm text-slate-600 mb-1">{pred.distance}</div>
                        <div className="text-2xl font-bold text-slate-900">{pred.time}</div>
                        <div className="text-sm text-accent font-medium">{pred.pace}</div>
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
              Comment fonctionne le prédicteur de temps de course ?
            </h2>

            <div className="prose prose-slate max-w-none">
              <p className="text-lg text-slate-600 mb-6">
                Notre <strong>prédicteur de temps course à pied</strong> utilise la <strong>formule de Riegel</strong>,
                une équation mathématique développée par Peter Riegel en 1977 et largement validée depuis.
                Elle permet d'estimer avec une bonne précision vos temps potentiels sur différentes distances
                à partir d'une seule performance de référence.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
                La formule de Riegel expliquée
              </h3>
              <div className="bg-slate-100 p-6 rounded-xl mb-6">
                <code className="text-lg text-slate-800">T2 = T1 × (D2 / D1)^1.06</code>
                <p className="text-sm text-slate-600 mt-3">
                  Où T1 est votre temps de référence, D1 la distance de référence, D2 la distance cible,
                  et 1.06 le coefficient de fatigue standard.
                </p>
              </div>

              <p className="text-slate-600 mb-6">
                Le coefficient 1.06 représente le fait qu'on ne peut pas maintenir la même allure indéfiniment :
                plus la distance augmente, plus l'allure moyenne diminue en raison de la fatigue.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
                Fiabilité des prédictions selon la distance
              </h3>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span><strong>5km → 10km :</strong> Très fiable, les deux distances sollicitent des filières énergétiques similaires</span>
                </li>
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span><strong>10km → Semi-marathon :</strong> Bonne fiabilité si vous avez l'habitude des distances longues</span>
                </li>
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                  <span><strong>Semi → Marathon :</strong> Fiabilité modérée, le marathon demande une préparation spécifique</span>
                </li>
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                  <span><strong>5km → Marathon :</strong> Indicatif seulement, l'écart de distance est trop important</span>
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
                Conseils pour une prédiction précise
              </h3>
              <ul className="space-y-2 text-slate-600 list-disc list-inside">
                <li>Utilisez une performance récente (moins de 3 mois)</li>
                <li>Choisissez une course où vous étiez en forme et bien préparé</li>
                <li>Préférez une distance de référence proche de votre objectif</li>
                <li>Tenez compte des conditions (météo, dénivelé) qui peuvent impacter le résultat</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Reference Table */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              Tableau d'équivalence des temps par niveau
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-lg overflow-hidden">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Niveau</th>
                    <th className="px-4 py-3 text-left">5km</th>
                    <th className="px-4 py-3 text-left">10km</th>
                    <th className="px-4 py-3 text-left">Semi</th>
                    <th className="px-4 py-3 text-left">Marathon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {[
                    { niveau: 'Débutant', t5k: "35'", t10k: "1h15", semi: "2h45", marathon: "5h45" },
                    { niveau: 'Intermédiaire', t5k: "28'", t10k: "58'", semi: "2h10", marathon: "4h30" },
                    { niveau: 'Confirmé', t5k: "23'", t10k: "48'", semi: "1h48", marathon: "3h45" },
                    { niveau: 'Avancé', t5k: "20'", t10k: "42'", semi: "1h32", marathon: "3h15" },
                    { niveau: 'Expert', t5k: "17'30", t10k: "36'", semi: "1h20", marathon: "2h50" },
                    { niveau: 'Elite', t5k: "15'", t10k: "31'", semi: "1h08", marathon: "2h25" },
                  ].map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.niveau}</td>
                      <td className="px-4 py-3">{row.t5k}</td>
                      <td className="px-4 py-3">{row.t10k}</td>
                      <td className="px-4 py-3">{row.semi}</td>
                      <td className="px-4 py-3 text-accent font-medium">{row.marathon}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-center text-sm text-slate-500 mt-4">
              Ces temps sont indicatifs et correspondent à des conditions idéales (terrain plat, météo favorable).
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">
              Questions fréquentes sur les prédictions de temps
            </h2>

            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Puis-je vraiment atteindre ces temps prédits ?
                </h3>
                <p className="text-slate-600">
                  Les prédictions indiquent votre potentiel physiologique, pas une certitude. Pour atteindre
                  ces temps, vous devez suivre un entraînement adapté à la distance cible, notamment pour le marathon
                  qui demande une préparation spécifique (sorties longues, travail au seuil).
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Pourquoi mes prédictions semblent-elles optimistes/pessimistes ?
                </h3>
                <p className="text-slate-600">
                  Chaque coureur a un profil différent. Un "sprinteur" aura de meilleurs temps sur courtes
                  distances, tandis qu'un "endurant" excellera sur marathon. La formule de Riegel suppose
                  un profil "moyen".
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Quelle performance de référence utiliser ?
                </h3>
                <p className="text-slate-600">
                  Idéalement, utilisez votre meilleur temps récent (moins de 3 mois) sur une distance
                  la plus proche possible de votre objectif. Un temps sur 10km sera plus fiable pour
                  prédire un semi qu'un temps sur 5km.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
              Outils complémentaires pour votre préparation
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

              <Link to="/outils/calculateur-vma" className="group p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-100">
                <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  Calculateur VMA
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Estimez votre Vitesse Maximale Aérobie
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
              Prêt à atteindre votre objectif chronométrique ?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Laissez notre coach IA créer un plan d'entraînement personnalisé
              pour vous amener à votre meilleur temps sur votre distance cible.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 bg-white text-accent hover:bg-slate-100 font-semibold py-4 px-8 rounded-full transition-colors shadow-lg"
            >
              Créer mon plan d'entraînement
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};

export default RacePredictorPage;
