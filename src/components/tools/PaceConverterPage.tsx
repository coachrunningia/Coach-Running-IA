
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, RotateCcw, Zap, BookOpen, Target, Clock } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const PaceConverterPage: React.FC = () => {
  const [mode, setMode] = useState<'paceToSpeed' | 'speedToPace'>('paceToSpeed');
  const [paceMin, setPaceMin] = useState(5);
  const [paceSec, setPaceSec] = useState(30);
  const [speed, setSpeed] = useState(10.9);

  const convertPaceToSpeed = (min: number, sec: number): number => {
    const totalMinutes = min + sec / 60;
    return totalMinutes > 0 ? Math.round((60 / totalMinutes) * 10) / 10 : 0;
  };

  const convertSpeedToPace = (kmh: number): { min: number; sec: number } => {
    if (kmh <= 0) return { min: 0, sec: 0 };
    const totalMinutes = 60 / kmh;
    const min = Math.floor(totalMinutes);
    const sec = Math.round((totalMinutes - min) * 60);
    return { min, sec: sec === 60 ? 0 : sec };
  };

  const handlePaceChange = (newMin: number, newSec: number) => {
    setPaceMin(newMin);
    setPaceSec(newSec);
    setSpeed(convertPaceToSpeed(newMin, newSec));
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    const pace = convertSpeedToPace(newSpeed);
    setPaceMin(pace.min);
    setPaceSec(pace.sec);
  };

  // Table de conversion pour SEO
  const conversionTable = useMemo(() => {
    const rows = [];
    for (let pace = 4; pace <= 8; pace += 0.5) {
      const min = Math.floor(pace);
      const sec = (pace - min) * 60;
      const speedKmh = Math.round((60 / pace) * 10) / 10;
      rows.push({
        pace: `${min}:${sec.toString().padStart(2, '0')}`,
        speed: speedKmh,
        level: speedKmh >= 15 ? 'Elite' : speedKmh >= 12 ? 'Confirmé' : speedKmh >= 10 ? 'Intermédiaire' : 'Débutant'
      });
    }
    return rows;
  }, []);

  return (
    <>
      <Helmet>
        <title>Convertisseur Allure Running : min/km en km/h | Calculateur Gratuit</title>
        <meta name="description" content="Convertissez instantanément votre allure de course (min/km) en vitesse (km/h) et inversement. Outil gratuit pour coureurs avec tableau de conversion et conseils d'entraînement." />
        <meta name="keywords" content="convertisseur allure, min/km en km/h, calculateur vitesse course, allure running, pace calculator, conversion vitesse course à pied" />
        <link rel="canonical" href="https://coachrunningia.fr/outils/convertisseur-allure" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center gap-2 text-blue-200 text-sm mb-4">
              <Link to="/glossary" className="hover:text-white">Outils Running</Link>
              <span>/</span>
              <span>Convertisseur Allure</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-6">
              Convertisseur Allure Running : min/km ↔ km/h
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl">
              Convertissez instantanément votre allure de course en vitesse. L'outil indispensable pour tout coureur qui veut comprendre ses performances.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Calculateur Principal */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                <RotateCcw className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Calculateur de Conversion</h2>
                <p className="text-slate-500">Conversion instantanée et précise</p>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={() => setMode('paceToSpeed')}
                className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all ${
                  mode === 'paceToSpeed'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Allure → Vitesse
              </button>
              <button
                onClick={() => setMode('speedToPace')}
                className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all ${
                  mode === 'speedToPace'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Vitesse → Allure
              </button>
            </div>

            {mode === 'paceToSpeed' ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-bold text-slate-900 mb-3">
                    Votre allure (min/km)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min={2}
                      max={15}
                      value={paceMin}
                      onChange={(e) => handlePaceChange(parseInt(e.target.value) || 0, paceSec)}
                      className="w-24 p-4 border-2 border-slate-200 rounded-xl text-center font-bold text-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <span className="text-3xl font-bold text-slate-300">:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={paceSec}
                      onChange={(e) => handlePaceChange(paceMin, parseInt(e.target.value) || 0)}
                      className="w-24 p-4 border-2 border-slate-200 rounded-xl text-center font-bold text-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <span className="text-slate-500 font-medium text-lg">min/km</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white text-center">
                  <p className="text-blue-100 mb-2">Vitesse correspondante</p>
                  <p className="text-5xl font-black">{speed} km/h</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-bold text-slate-900 mb-3">
                    Votre vitesse (km/h)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min={4}
                      max={25}
                      step={0.1}
                      value={speed}
                      onChange={(e) => handleSpeedChange(parseFloat(e.target.value) || 0)}
                      className="w-32 p-4 border-2 border-slate-200 rounded-xl text-center font-bold text-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <span className="text-slate-500 font-medium text-lg">km/h</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white text-center">
                  <p className="text-blue-100 mb-2">Allure correspondante</p>
                  <p className="text-5xl font-black">
                    {paceMin}:{paceSec.toString().padStart(2, '0')} min/km
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Contenu SEO - Comment convertir */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Comment convertir min/km en km/h ?
            </h2>
            <div className="prose prose-lg max-w-none text-slate-600">
              <p>
                La conversion entre l'allure (min/km) et la vitesse (km/h) est une opération mathématique simple mais essentielle pour tout coureur. Comprendre cette conversion vous permet de mieux analyser vos performances et de planifier vos entraînements.
              </p>

              <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">
                La formule de conversion allure → vitesse
              </h3>
              <div className="bg-slate-100 rounded-xl p-6 my-6">
                <p className="font-mono text-lg text-center">
                  <strong>Vitesse (km/h) = 60 ÷ Allure (en minutes décimales)</strong>
                </p>
              </div>
              <p>
                Par exemple, pour une allure de 5:30 min/km :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Convertissez d'abord en minutes décimales : 5 + 30/60 = 5,5 minutes</li>
                <li>Appliquez la formule : 60 ÷ 5,5 = <strong>10,9 km/h</strong></li>
              </ul>

              <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">
                La formule de conversion vitesse → allure
              </h3>
              <div className="bg-slate-100 rounded-xl p-6 my-6">
                <p className="font-mono text-lg text-center">
                  <strong>Allure (min/km) = 60 ÷ Vitesse (km/h)</strong>
                </p>
              </div>
              <p>
                Par exemple, pour une vitesse de 12 km/h :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Appliquez la formule : 60 ÷ 12 = 5 minutes exactement</li>
                <li>Votre allure est donc de <strong>5:00 min/km</strong></li>
              </ul>
            </div>
          </section>

          {/* Tableau de conversion */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Tableau de conversion allure / vitesse
            </h2>
            <p className="text-slate-600 mb-6">
              Voici un tableau de référence des allures courantes en course à pied avec leur équivalent en km/h et le niveau correspondant.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-slate-900">Allure (min/km)</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-900">Vitesse (km/h)</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-900">Niveau</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conversionTable.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{row.pace}</td>
                      <td className="px-6 py-4 font-bold text-blue-600">{row.speed} km/h</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          row.level === 'Elite' ? 'bg-purple-100 text-purple-700' :
                          row.level === 'Confirmé' ? 'bg-green-100 text-green-700' :
                          row.level === 'Intermédiaire' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {row.level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pourquoi utiliser */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Pourquoi utiliser un convertisseur allure ?
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <Target className="text-green-600" size={24} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Planifier vos séances</h3>
                <p className="text-slate-600">
                  Définissez des objectifs de vitesse clairs sur tapis ou lors de vos fractionnés. Savoir que 12 km/h = 5:00/km vous aide à programmer votre tapis de course.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="text-blue-600" size={24} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Comparer vos performances</h3>
                <p className="text-slate-600">
                  Certaines montres affichent la vitesse, d'autres l'allure. Pouvoir convertir instantanément vous permet de comparer vos séances et votre progression.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <Calculator className="text-purple-600" size={24} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Calculer vos temps de course</h3>
                <p className="text-slate-600">
                  Connaître votre vitesse en km/h facilite le calcul de vos temps prévisionnels. À 10 km/h, vous bouclez un 10 km en 1h pile.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="text-orange-600" size={24} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Ajuster votre allure VMA</h3>
                <p className="text-slate-600">
                  Les tests VMA donnent souvent un résultat en km/h. Convertir en min/km vous aide à respecter les bonnes allures pendant vos fractionnés.
                </p>
              </div>
            </div>
          </section>

          {/* Autres outils */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Autres outils pour coureurs
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Link to="/outils/calculateur-vma" className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all">
                <Zap className="text-red-500 mb-3" size={24} />
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600">Calculateur VMA</h3>
                <p className="text-sm text-slate-500 mt-1">Estimez votre VMA à partir de vos temps de course</p>
              </Link>
              <Link to="/outils/calculateur-allure-marathon" className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all">
                <Target className="text-purple-500 mb-3" size={24} />
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600">Allure Marathon</h3>
                <p className="text-sm text-slate-500 mt-1">Calculez l'allure pour votre objectif marathon</p>
              </Link>
              <Link to="/outils/predicteur-temps" className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all">
                <Clock className="text-green-500 mb-3" size={24} />
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600">Prédicteur de temps</h3>
                <p className="text-sm text-slate-500 mt-1">Prédisez vos temps sur toutes les distances</p>
              </Link>
            </div>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-10 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">
              Créez votre plan d'entraînement personnalisé
            </h2>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto">
              Notre coach IA calcule automatiquement toutes vos allures d'entraînement et génère un plan adapté à votre niveau.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full font-bold transition-colors shadow-lg"
            >
              Créer mon plan gratuit <ArrowRight size={20} />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
};

export default PaceConverterPage;
