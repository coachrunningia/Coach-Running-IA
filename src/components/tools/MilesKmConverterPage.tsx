
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeftRight, RotateCcw, BookOpen, Target, Clock, Calculator, Zap } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const MILE_TO_KM = 1.609344;
const KM_TO_MILE = 1 / MILE_TO_KM;

const MilesKmConverterPage: React.FC = () => {
  const [mode, setMode] = useState<'milesToKm' | 'kmToMiles'>('milesToKm');
  const [miles, setMiles] = useState(6.2);
  const [km, setKm] = useState(9.98);

  const handleMilesChange = (value: number) => {
    setMiles(value);
    setKm(Math.round(value * MILE_TO_KM * 100) / 100);
  };

  const handleKmChange = (value: number) => {
    setKm(value);
    setMiles(Math.round(value * KM_TO_MILE * 100) / 100);
  };

  // Table de conversion pour SEO
  const conversionTable = useMemo(() => [
    { miles: 1, km: 1.61, race: '1 mile' },
    { miles: 3.1, km: 5, race: '5 km' },
    { miles: 5, km: 8.05, race: '5 miles' },
    { miles: 6.2, km: 10, race: '10 km' },
    { miles: 10, km: 16.09, race: '10 miles' },
    { miles: 13.1, km: 21.1, race: 'Semi-marathon' },
    { miles: 15, km: 24.14, race: '15 miles' },
    { miles: 20, km: 32.19, race: '20 miles' },
    { miles: 26.2, km: 42.195, race: 'Marathon' },
    { miles: 31.1, km: 50, race: '50 km (Ultra)' },
    { miles: 50, km: 80.47, race: '50 miles (Ultra)' },
    { miles: 62.1, km: 100, race: '100 km (Ultra)' },
  ], []);

  // Table allure min/mile ↔ min/km
  const paceTable = useMemo(() => {
    const rows = [];
    for (let paceMinPerMile = 6; paceMinPerMile <= 12; paceMinPerMile += 0.5) {
      const minMile = Math.floor(paceMinPerMile);
      const secMile = Math.round((paceMinPerMile - minMile) * 60);
      const paceMinPerKm = paceMinPerMile * KM_TO_MILE;
      const minKm = Math.floor(paceMinPerKm);
      const secKm = Math.round((paceMinPerKm - minKm) * 60);
      rows.push({
        paceMile: `${minMile}:${secMile.toString().padStart(2, '0')}`,
        paceKm: `${minKm}:${secKm.toString().padStart(2, '0')}`,
        level: paceMinPerMile <= 7 ? 'Elite' : paceMinPerMile <= 8.5 ? 'Confirm\u00e9' : paceMinPerMile <= 10 ? 'Interm\u00e9diaire' : 'D\u00e9butant'
      });
    }
    return rows;
  }, []);

  return (
    <>
      <Helmet>
        <title>Convertisseur Miles en Km : Conversion Distance et Allure | Outil Gratuit</title>
        <meta name="description" content="Convertissez miles en kilom\u00e8tres et km en miles instantan\u00e9ment. Tableau des distances de course (5K, 10K, semi, marathon) + conversion d'allure min/mile en min/km. Outil gratuit." />
        <meta name="keywords" content="convertisseur miles km, miles en kilom\u00e8tres, conversion miles km, 1 mile en km, marathon miles, allure min/mile en min/km, calculateur distance course" />
        <link rel="canonical" href="https://coachrunningia.fr/outils/convertisseur-miles-km" />
        <meta property="og:title" content="Convertisseur Miles en Km : Conversion Distance et Allure Running" />
        <meta property="og:description" content="Convertissez miles en km et allures min/mile en min/km. Tableau complet des distances de course." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center gap-2 text-emerald-200 text-sm mb-4">
              <Link to="/outils" className="hover:text-white">Outils Running</Link>
              <span>/</span>
              <span>Convertisseur Miles / Km</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-6">
              Convertisseur Miles en Km et Km en Miles
            </h1>
            <p className="text-xl text-emerald-100 max-w-2xl">
              Convertissez distances et allures entre le syst\u00e8me m\u00e9trique et imp\u00e9rial. Indispensable pour suivre les plans US ou comparer vos performances internationales.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Calculateur Principal */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <ArrowLeftRight className="text-emerald-600" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Calculateur de Conversion</h2>
                <p className="text-slate-500">1 mile = 1,609 km | 1 km = 0,621 miles</p>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={() => setMode('milesToKm')}
                className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all ${
                  mode === 'milesToKm'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Miles → Km
              </button>
              <button
                onClick={() => setMode('kmToMiles')}
                className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all ${
                  mode === 'kmToMiles'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Km → Miles
              </button>
            </div>

            {mode === 'milesToKm' ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-bold text-slate-900 mb-3">
                    Distance en miles
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min={0}
                      max={200}
                      step={0.1}
                      value={miles}
                      onChange={(e) => handleMilesChange(parseFloat(e.target.value) || 0)}
                      className="w-40 p-4 border-2 border-slate-200 rounded-xl text-center font-bold text-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <span className="text-slate-500 font-medium text-lg">miles</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white text-center">
                  <p className="text-emerald-100 mb-2">Distance en kilom\u00e8tres</p>
                  <p className="text-5xl font-black">{km} km</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-bold text-slate-900 mb-3">
                    Distance en kilom\u00e8tres
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min={0}
                      max={300}
                      step={0.1}
                      value={km}
                      onChange={(e) => handleKmChange(parseFloat(e.target.value) || 0)}
                      className="w-40 p-4 border-2 border-slate-200 rounded-xl text-center font-bold text-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <span className="text-slate-500 font-medium text-lg">km</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white text-center">
                  <p className="text-emerald-100 mb-2">Distance en miles</p>
                  <p className="text-5xl font-black">{miles} miles</p>
                </div>
              </div>
            )}
          </div>

          {/* Contenu SEO - Formules */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Comment convertir miles en km ?
            </h2>
            <div className="prose prose-lg max-w-none text-slate-600">
              <p>
                La conversion entre miles et kilom\u00e8tres repose sur un facteur fixe. Le mile est l'unit\u00e9 de distance utilis\u00e9e aux \u00c9tats-Unis et au Royaume-Uni, tandis que le kilom\u00e8tre est la norme dans la plupart des pays, dont la France.
              </p>

              <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">
                Formule miles → kilom\u00e8tres
              </h3>
              <div className="bg-slate-100 rounded-xl p-6 my-6">
                <p className="font-mono text-lg text-center">
                  <strong>Distance (km) = Distance (miles) \u00d7 1,609344</strong>
                </p>
              </div>
              <p>
                Par exemple, pour convertir 10 miles en km :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>10 \u00d7 1,609344 = <strong>16,09 km</strong></li>
                <li>Un semi-marathon (13,1 miles) = <strong>21,1 km</strong></li>
                <li>Un marathon (26,2 miles) = <strong>42,195 km</strong></li>
              </ul>

              <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">
                Formule kilom\u00e8tres → miles
              </h3>
              <div className="bg-slate-100 rounded-xl p-6 my-6">
                <p className="font-mono text-lg text-center">
                  <strong>Distance (miles) = Distance (km) \u00d7 0,621371</strong>
                </p>
              </div>
              <p>
                Par exemple, pour convertir 10 km en miles :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>10 \u00d7 0,621371 = <strong>6,21 miles</strong></li>
                <li>Un 5 km = <strong>3,1 miles</strong></li>
              </ul>
            </div>
          </section>

          {/* Tableau des distances de course */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Tableau des distances de course : miles et km
            </h2>
            <p className="text-slate-600 mb-6">
              R\u00e9f\u00e9rence compl\u00e8te des distances de course les plus courantes avec leur \u00e9quivalence en miles et kilom\u00e8tres.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-slate-900">Course</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-900">Miles</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-900">Kilom\u00e8tres</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conversionTable.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold text-slate-900">{row.race}</td>
                      <td className="px-6 py-4 font-mono text-emerald-600 font-bold">{row.miles} mi</td>
                      <td className="px-6 py-4 font-mono text-teal-600 font-bold">{row.km} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tableau allure min/mile ↔ min/km */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Conversion d'allure : min/mile en min/km
            </h2>
            <p className="text-slate-600 mb-6">
              Si vous suivez un plan d'entra\u00eenement am\u00e9ricain ou utilisez une montre GPS en miles, ce tableau vous aide \u00e0 convertir les allures.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-slate-900">Allure (min/mile)</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-900">Allure (min/km)</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-900">Niveau</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paceTable.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{row.paceMile} /mile</td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-600">{row.paceKm} /km</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          row.level === 'Elite' ? 'bg-purple-100 text-purple-700' :
                          row.level === 'Confirm\u00e9' ? 'bg-green-100 text-green-700' :
                          row.level === 'Interm\u00e9diaire' ? 'bg-blue-100 text-blue-700' :
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
              Pourquoi convertir miles en km en course \u00e0 pied ?
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <BookOpen className="text-emerald-600" size={24} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Suivre un plan US</h3>
                <p className="text-slate-600">
                  De nombreux plans d'entra\u00eenement populaires (Hal Higdon, Jack Daniels, Pfitzinger) sont en miles. Convertir en km vous permet de les suivre sur votre montre GPS.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                  <Target className="text-teal-600" size={24} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Comparer ses performances</h3>
                <p className="text-slate-600">
                  Les courses aux USA affichent les distances en miles. Comparez vos temps de passage avec ceux de vos amis am\u00e9ricains ou les r\u00e9sultats Strava internationaux.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="text-blue-600" size={24} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Comprendre les splits</h3>
                <p className="text-slate-600">
                  Les diffusions de marathons majeurs (Boston, New York, Chicago) affichent souvent les temps de passage au mile. Savoir qu'un mile = 1,609 km vous aide \u00e0 suivre.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <RotateCcw className="text-orange-600" size={24} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Configurer sa montre</h3>
                <p className="text-slate-600">
                  Certaines montres GPS d'occasion import\u00e9es des USA sont configur\u00e9es en miles. Ce convertisseur vous aide \u00e0 interpr\u00e9ter les donn\u00e9es avant de changer les param\u00e8tres.
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
              <Link to="/outils/convertisseur-allure" className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-emerald-300 transition-all">
                <Calculator className="text-blue-500 mb-3" size={24} />
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-600">Convertisseur Allure</h3>
                <p className="text-sm text-slate-500 mt-1">Convertissez min/km en km/h et inversement</p>
              </Link>
              <Link to="/outils/calculateur-vma" className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-emerald-300 transition-all">
                <Zap className="text-red-500 mb-3" size={24} />
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-600">Calculateur VMA</h3>
                <p className="text-sm text-slate-500 mt-1">Estimez votre VMA \u00e0 partir de vos temps de course</p>
              </Link>
              <Link to="/outils/predicteur-temps" className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-emerald-300 transition-all">
                <Clock className="text-green-500 mb-3" size={24} />
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-600">Pr\u00e9dicteur de temps</h3>
                <p className="text-sm text-slate-500 mt-1">Pr\u00e9disez vos temps sur toutes les distances</p>
              </Link>
            </div>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-10 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">
              Cr\u00e9ez votre plan d'entra\u00eenement personnalis\u00e9
            </h2>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto">
              Notre coach IA g\u00e9n\u00e8re un plan adapt\u00e9 \u00e0 votre niveau avec toutes les distances en kilom\u00e8tres, pr\u00eat \u00e0 exporter sur votre montre GPS.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-full font-bold transition-colors shadow-lg"
            >
              Cr\u00e9er mon plan gratuit <ArrowRight size={20} />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
};

export default MilesKmConverterPage;
