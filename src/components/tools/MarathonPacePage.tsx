
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, Target, Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

const MarathonPacePage: React.FC = () => {
  const [mode, setMode] = useState<'time-to-pace' | 'pace-to-time'>('time-to-pace');
  const [targetTime, setTargetTime] = useState<string>('');
  const [targetPace, setTargetPace] = useState<string>('');
  const [result, setResult] = useState<{ pace?: string; time?: string; splits?: { km: number; time: string }[] } | null>(null);

  const parseTimeToSeconds = (timeStr: string): number => {
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
    return `${h}h${m.toString().padStart(2, '0')}'${s.toString().padStart(2, '0')}"`;
  };

  const formatPace = (secondsPerKm: number): string => {
    const min = Math.floor(secondsPerKm / 60);
    const sec = Math.round(secondsPerKm % 60);
    return `${min}'${sec.toString().padStart(2, '0')}"/km`;
  };

  const calculate = () => {
    const marathonDistance = 42.195;

    if (mode === 'time-to-pace') {
      const totalSeconds = parseTimeToSeconds(targetTime);
      if (!totalSeconds) return;

      const pacePerKm = totalSeconds / marathonDistance;
      const splits = [];

      // Generate splits every 5km + finish
      for (let km = 5; km <= 40; km += 5) {
        splits.push({ km, time: formatTime(pacePerKm * km) });
      }
      splits.push({ km: 42.195, time: formatTime(totalSeconds) });

      setResult({
        pace: formatPace(pacePerKm),
        splits,
      });
    } else {
      const paceSeconds = parseTimeToSeconds(targetPace);
      if (!paceSeconds) return;

      const totalSeconds = paceSeconds * marathonDistance;
      const splits = [];

      for (let km = 5; km <= 40; km += 5) {
        splits.push({ km, time: formatTime(paceSeconds * km) });
      }
      splits.push({ km: 42.195, time: formatTime(totalSeconds) });

      setResult({
        time: formatTime(totalSeconds),
        splits,
      });
    }
  };

  const paceTable = [
    { time: "2h30", pace: "3'33\"/km", level: "Elite" },
    { time: "2h45", pace: "3'54\"/km", level: "Elite" },
    { time: "3h00", pace: "4'16\"/km", level: "Expert" },
    { time: "3h15", pace: "4'37\"/km", level: "Avancé" },
    { time: "3h30", pace: "4'58\"/km", level: "Avancé" },
    { time: "3h45", pace: "5'19\"/km", level: "Confirmé" },
    { time: "4h00", pace: "5'41\"/km", level: "Confirmé" },
    { time: "4h15", pace: "6'02\"/km", level: "Intermédiaire" },
    { time: "4h30", pace: "6'23\"/km", level: "Intermédiaire" },
    { time: "5h00", pace: "7'06\"/km", level: "Débutant+" },
    { time: "5h30", pace: "7'49\"/km", level: "Débutant" },
    { time: "6h00", pace: "8'31\"/km", level: "Débutant" },
  ];

  return (
    <>
      <Helmet>
        <title>Calculateur Allure Marathon : Trouvez Votre Pace Idéal | Outil Gratuit</title>
        <meta name="description" content="Calculez l'allure parfaite pour votre marathon. Convertissez votre objectif temps en allure au km ou inversement. Tableaux de passage et conseils stratégiques inclus." />
        <meta name="keywords" content="calculateur allure marathon, pace marathon, objectif marathon, temps de passage marathon, allure km marathon, stratégie marathon" />
        <link rel="canonical" href="https://coachrunningia.fr/outils/allure-marathon" />
        <meta property="og:title" content="Calculateur Allure Marathon : Trouvez Votre Pace Idéal" />
        <meta property="og:description" content="Convertissez votre objectif temps en allure au km. Obtenez vos temps de passage et une stratégie de course optimale." />
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
              <span className="text-accent">Calculateur Allure Marathon</span>
            </nav>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Calculateur Allure Marathon : Trouvez Votre Pace Idéal
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl">
              Déterminez l'allure exacte à maintenir pour atteindre votre objectif marathon.
              Obtenez vos temps de passage et planifiez votre stratégie de course.
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
                <h2 className="text-2xl font-bold text-slate-900">Calculer mon allure marathon</h2>
              </div>

              {/* Mode Selection */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => { setMode('time-to-pace'); setResult(null); }}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    mode === 'time-to-pace'
                      ? 'border-accent bg-accent/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-900">Objectif → Allure</div>
                  <div className="text-xs text-slate-500">Je connais mon temps visé</div>
                </button>
                <button
                  onClick={() => { setMode('pace-to-time'); setResult(null); }}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    mode === 'pace-to-time'
                      ? 'border-accent bg-accent/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-900">Allure → Temps</div>
                  <div className="text-xs text-slate-500">Je connais mon allure cible</div>
                </button>
              </div>

              {/* Input Fields */}
              <div className="mb-6">
                {mode === 'time-to-pace' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Objectif temps marathon (hh:mm:ss ou hh:mm)
                    </label>
                    <input
                      type="text"
                      value={targetTime}
                      onChange={(e) => setTargetTime(e.target.value)}
                      placeholder="Ex: 3:45:00 ou 3:45"
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Allure cible (mm:ss par km)
                    </label>
                    <input
                      type="text"
                      value={targetPace}
                      onChange={(e) => setTargetPace(e.target.value)}
                      placeholder="Ex: 5:20"
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={calculate}
                className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Target className="w-5 h-5" />
                Calculer
              </button>

              {/* Results */}
              {result && (
                <div className="mt-8">
                  {/* Main Result */}
                  <div className="p-6 bg-gradient-to-br from-accent/10 to-primary/5 rounded-xl border border-accent/20 mb-6">
                    <div className="text-center">
                      {mode === 'time-to-pace' ? (
                        <>
                          <div className="text-sm text-slate-600 mb-1">Allure à maintenir</div>
                          <div className="text-4xl font-bold text-accent">{result.pace}</div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm text-slate-600 mb-1">Temps d'arrivée</div>
                          <div className="text-4xl font-bold text-accent">{result.time}</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Splits Table */}
                  {result.splits && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-accent" />
                        Temps de passage
                      </h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {result.splits.map((split, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg text-center ${
                              split.km === 42.195
                                ? 'bg-accent text-white col-span-full sm:col-span-1'
                                : split.km === 21.0975 || split.km === 21
                                  ? 'bg-primary/10 border border-primary/20'
                                  : 'bg-slate-100'
                            }`}
                          >
                            <div className="text-xs text-opacity-80 mb-1">
                              {split.km === 42.195 ? 'Arrivée' : `${split.km}km`}
                            </div>
                            <div className="font-semibold">{split.time}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Pace Table */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              Tableau des allures marathon par objectif
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-lg overflow-hidden">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="px-6 py-4 text-left">Objectif</th>
                    <th className="px-6 py-4 text-left">Allure/km</th>
                    <th className="px-6 py-4 text-left">Niveau</th>
                    <th className="px-6 py-4 text-left">Semi (indicatif)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paceTable.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-6 py-4 font-bold text-accent">{row.time}</td>
                      <td className="px-6 py-4 font-medium">{row.pace}</td>
                      <td className="px-6 py-4 text-slate-600">{row.level}</td>
                      <td className="px-6 py-4 text-slate-500">
                        ~{Math.floor(parseTimeToSeconds(row.time.replace('h', ':')) / 2.15 / 60)}h{Math.round((parseTimeToSeconds(row.time.replace('h', ':')) / 2.15 % 60))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Strategy Content */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">
              Stratégies d'allure pour réussir son marathon
            </h2>

            <div className="prose prose-slate max-w-none">
              <p className="text-lg text-slate-600 mb-6">
                Le marathon est une épreuve d'endurance où la <strong>gestion de l'allure</strong> est cruciale.
                Partir trop vite est l'erreur la plus courante et conduit souvent au "mur" après le 30ème kilomètre.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
                Les 3 stratégies d'allure classiques
              </h3>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-white rounded-xl border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Negative Split (Recommandé)
                  </h4>
                  <p className="text-sm text-slate-600">
                    Courir la 2ème moitié plus vite que la 1ère. Stratégie des records du monde.
                    Partez 10-15 sec/km plus lent que votre allure cible.
                  </p>
                </div>

                <div className="p-6 bg-white rounded-xl border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    Even Split
                  </h4>
                  <p className="text-sm text-slate-600">
                    Maintenir une allure constante du début à la fin. Demande une excellente
                    connaissance de ses capacités.
                  </p>
                </div>

                <div className="p-6 bg-white rounded-xl border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Positive Split (À éviter)
                  </h4>
                  <p className="text-sm text-slate-600">
                    Partir vite et ralentir. Conduit souvent à "exploser" après le 30ème km.
                    Stratégie risquée sauf profil très endurant.
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
                Comment déterminer son allure réaliste ?
              </h3>

              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span><strong>À partir de votre VMA :</strong> L'allure marathon se situe généralement entre 75% et 85% de la VMA selon votre niveau</span>
                </li>
                <li className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span><strong>À partir d'un semi :</strong> Multipliez votre temps semi par 2.1 à 2.15 pour une estimation réaliste</span>
                </li>
                <li className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <span><strong>À partir d'un 10km :</strong> Multipliez par 4.6 à 4.8 selon votre endurance</span>
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">
                Conseils pour le jour J
              </h3>

              <ul className="space-y-2 text-slate-600 list-disc list-inside">
                <li>Repérez les meneurs d'allure (pacers) correspondant à votre objectif</li>
                <li>Ne vous laissez pas griser par l'euphorie du départ</li>
                <li>Gardez une réserve pour les 10 derniers kilomètres</li>
                <li>Hydratez-vous et alimentez-vous régulièrement (toutes les 30-45 min)</li>
                <li>Adaptez votre allure aux conditions météo (chaleur = allure réduite)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
              Complétez votre préparation marathon
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <Link to="/outils/convertisseur-allure" className="group p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all border border-slate-200">
                <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  Convertisseur Allure
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Convertissez min/km en km/h pour vos séances
                </p>
                <span className="text-accent text-sm font-medium flex items-center gap-1">
                  Utiliser <ArrowRight className="w-4 h-4" />
                </span>
              </Link>

              <Link to="/outils/calculateur-vma" className="group p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all border border-slate-200">
                <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  Calculateur VMA
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Base essentielle pour calibrer votre allure
                </p>
                <span className="text-accent text-sm font-medium flex items-center gap-1">
                  Utiliser <ArrowRight className="w-4 h-4" />
                </span>
              </Link>

              <Link to="/outils/predicteur-temps" className="group p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all border border-slate-200">
                <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  Prédicteur de Temps
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Estimez votre temps marathon depuis un 10km
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
              Préparez votre marathon avec un plan sur-mesure
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Notre coach IA crée un programme d'entraînement personnalisé de 12 à 20 semaines
              pour vous amener au départ dans les meilleures conditions.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 bg-white text-accent hover:bg-slate-100 font-semibold py-4 px-8 rounded-full transition-colors shadow-lg"
            >
              Commencer ma préparation marathon
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};

export default MarathonPacePage;
