import React from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, BarChart3, CalendarCheck, Activity, ArrowRight, CheckCircle, Shield, Crown, Zap, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';

/* ─── Section Label : petit badge stylisé au-dessus de chaque titre ─── */
export const SectionLabel: React.FC<{ children: React.ReactNode; variant?: 'orange' | 'slate' | 'strava' }> = ({ children, variant = 'orange' }) => {
  const styles = {
    orange: 'bg-orange-100 text-orange-600 border-orange-200',
    slate: 'bg-slate-100 text-slate-500 border-slate-200',
    strava: 'bg-[#FC4C02]/10 text-[#FC4C02] border-[#FC4C02]/20',
  };
  return (
    <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border mb-6 ${styles[variant]}`}>
      {children}
    </span>
  );
};

/* ─── Section Strava : les 3 features clés (ajustement, analyse mensuelle, bilan hebdo) ─── */
interface StravaSectionProps {
  /** Mot-clé discipline pour contextualiser (ex: "marathon", "trail", "10km") */
  discipline?: string;
}

/* ─── Screenshots Slider ─── */
export const ScreenshotsSlider: React.FC = () => {
  const slides = [
    { src: '/screenshots/welcome.png', label: 'Message du coach', sub: 'Confiance, lieux, allures' },
    { src: '/screenshots/session-detail.png', label: 'Détail de séance', sub: 'Échauffement, corps, récup' },
    { src: '/screenshots/exercise.png', label: 'Fiche exercice', sub: 'Posture, erreurs, conseil kiné' },
    { src: '/screenshots/feedback.png', label: 'Feedback & RPE', sub: "Notez, le plan s'adapte" },
    { src: '/screenshots/monthly.png', label: 'Bilan mensuel', sub: 'Points forts, recommandations' },
    { src: '/screenshots/strava-monthly.png', label: 'Analyse Strava', sub: 'KPIs, progression, verdict' },
  ];

  return (
    <section className="py-16 md:py-20 relative bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <SectionLabel>Aperçu</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-3">
            Tout est inclus dans <span className="text-orange-500">votre plan</span>
          </h2>
        </div>
      </div>
      <div className="relative group/slider">
        <button onClick={() => { const el = document.getElementById('features-slider'); if (el) el.scrollBy({ left: -300, behavior: 'smooth' }); }} className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:bg-orange-50 hover:text-orange-500 transition-all opacity-0 group-hover/slider:opacity-100">
          <ChevronLeft size={20} />
        </button>
        <button onClick={() => { const el = document.getElementById('features-slider'); if (el) el.scrollBy({ left: 300, behavior: 'smooth' }); }} className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:bg-orange-50 hover:text-orange-500 transition-all opacity-0 group-hover/slider:opacity-100">
          <ChevronRight size={20} />
        </button>
        <div id="features-slider" className="overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-4 px-4 md:px-[max(1rem,calc((100vw-72rem)/2+1rem))]" style={{ scrollSnapType: 'x mandatory' }}>
            {slides.map(({ src, label, sub }) => (
              <div key={label} className="group flex-shrink-0 w-64 md:w-72 rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ scrollSnapAlign: 'start' }}>
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5">
                  <p className="text-sm font-bold text-white">{label}</p>
                  <p className="text-[11px] text-white/70">{sub}</p>
                </div>
                <div className="aspect-[3/4] overflow-hidden bg-slate-50">
                  <img src={src} alt={label} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2 md:hidden text-xs text-slate-400">
          <span>Swipez pour voir plus</span><ArrowRight size={12} />
        </div>
      </div>
    </section>
  );
};

/* ─── Pricing Preview ─── */
export const PricingPreview: React.FC = () => (
  <section className="py-20 md:py-28 relative bg-white overflow-hidden">
    <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-orange-50 rounded-full blur-[128px] -translate-y-1/2"></div>
    <div className="relative max-w-5xl mx-auto px-4">
      <div className="text-center mb-16">
        <SectionLabel>Tarifs</SectionLabel>
        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">
          Un prix <span className="text-orange-500">accessible</span>
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto text-lg">1ère semaine gratuite sur tous les plans. Sans engagement.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-300">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3"><ShoppingBag size={22} className="text-slate-500" /></div>
            <h3 className="text-lg font-bold text-slate-900">Plan Unique</h3>
            <div className="flex items-baseline justify-center gap-1 mt-2"><span className="text-4xl font-black text-slate-900">9,90</span><span className="text-slate-500 font-medium">€</span></div>
            <p className="text-sm text-slate-400 mt-1">Paiement unique</p>
          </div>
          <ul className="space-y-2.5 text-sm text-slate-600 mb-6">
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> 1 plan complet généré</li>
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Toutes les semaines détaillées</li>
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Export calendrier</li>
          </ul>
          <Link to="/pricing" className="block text-center py-3 px-6 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:border-orange-300 hover:text-orange-600 transition-all">Choisir</Link>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-xl relative text-white md:scale-105">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 text-xs font-black px-4 py-1 rounded-full uppercase shadow-lg">Populaire</div>
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3"><Crown size={22} className="text-amber-400" /></div>
            <h3 className="text-lg font-bold">Annuel</h3>
            <div className="flex items-baseline justify-center gap-1 mt-2"><span className="text-4xl font-black">3,33</span><span className="text-slate-400 font-medium">€/mois</span></div>
            <p className="text-sm text-slate-400 mt-1"><span className="line-through text-slate-500">69,90€</span> 39,90€/an</p>
          </div>
          <ul className="space-y-2.5 text-sm text-slate-300 mb-6">
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-400 shrink-0" /> Plans illimités</li>
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-400 shrink-0" /> Connexion Strava + analyses</li>
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-400 shrink-0" /> Fiches exercices illustrées</li>
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-400 shrink-0" /> Support prioritaire</li>
          </ul>
          <Link to="/pricing" className="block text-center py-3 px-6 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-all">Meilleur choix</Link>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-300">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3"><Zap size={22} className="text-orange-500" /></div>
            <h3 className="text-lg font-bold text-slate-900">Mensuel</h3>
            <div className="flex items-baseline justify-center gap-1 mt-2"><span className="text-4xl font-black text-slate-900">4,90</span><span className="text-slate-500 font-medium">€/mois</span></div>
            <p className="text-sm text-slate-400 mt-1"><span className="line-through text-slate-400">9,90€</span> Sans engagement</p>
          </div>
          <ul className="space-y-2.5 text-sm text-slate-600 mb-6">
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Plans illimités</li>
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Connexion Strava + analyses</li>
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Fiches exercices illustrées</li>
          </ul>
          <Link to="/pricing" className="block text-center py-3 px-6 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:border-orange-300 hover:text-orange-600 transition-all">S'abonner</Link>
        </div>
      </div>
      <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-400">
        <div className="flex items-center gap-2"><Shield size={16} className="text-green-500" /><span>Vos données <strong className="text-slate-600">restent chez Strava</strong></span></div>
        <span className="hidden sm:block text-slate-200">|</span>
        <div className="flex items-center gap-2"><Shield size={16} className="text-green-500" /><span>Paiement sécurisé <strong className="text-slate-600">Stripe</strong></span></div>
        <span className="hidden sm:block text-slate-200">|</span>
        <div className="flex items-center gap-2"><Shield size={16} className="text-green-500" /><span><strong className="text-slate-600">Annulation en 1 clic</strong></span></div>
      </div>
    </div>
  </section>
);

/* ─── Section Strava ─── */
export const StravaSection: React.FC<StravaSectionProps> = ({ discipline }) => {
  return (
    <section className="py-20 md:py-28 relative bg-slate-950 text-white overflow-hidden">
      {/* Strava orange glows */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-[#FC4C02]/8 rounded-full blur-[128px]"></div>
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-[#FC4C02]/5 rounded-full blur-[128px]"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel variant="strava">Connecté à Strava</SectionLabel>
          <div className="flex items-center justify-center gap-4 mb-6">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              Un plan connecté à{' '}
              <span className="text-[#FC4C02]">vos données</span>
            </h2>
            <svg className="w-10 h-10 md:w-12 md:h-12 text-[#FC4C02] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Logo Strava"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
          </div>
          <p className="text-slate-400 max-w-3xl mx-auto text-lg">
            {discipline
              ? `Votre compte Strava alimente directement votre plan ${discipline}. Vos km, vos allures, votre FC : l'IA vous connaît mieux qu'un coach qui vous voit une fois par mois.`
              : `Votre compte Strava alimente directement votre plan. Vos km, vos allures, votre FC : l'IA vous connaît mieux qu'un coach qui vous voit une fois par mois.`}
          </p>
        </div>

        {/* 3 feature cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {/* Card 1 */}
          <div className="group relative rounded-3xl p-8 bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-[#FC4C02]/30 transition-all duration-500">
            <div className="absolute top-6 right-6 text-6xl font-black text-white/5 group-hover:text-[#FC4C02]/10 transition-colors">01</div>
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FC4C02] to-[#e8440a] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#FC4C02]/25 group-hover:scale-110 transition-transform duration-300">
                <RefreshCw className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Le plan s'ajuste en continu</h3>
              <p className="text-slate-400 leading-relaxed">
                Vous courez, Strava transmet vos données, vous notez votre ressenti. L'IA recalibre la suite du plan : trop dur ? Elle allège. Trop facile ? Elle monte d'un cran.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FC4C02]/10 border border-[#FC4C02]/20 text-[#FC4C02]">
                  <Activity size={12} />
                  <span className="font-medium">Données Strava</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <span className="font-medium">Ressenti (RPE)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group relative rounded-3xl p-8 bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-[#FC4C02]/30 transition-all duration-500">
            <div className="absolute top-6 right-6 text-6xl font-black text-white/5 group-hover:text-[#FC4C02]/10 transition-colors">02</div>
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FC4C02] to-[#e8440a] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#FC4C02]/25 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Votre coach analyse chaque mois</h3>
              <p className="text-slate-400 leading-relaxed">
                Un vrai bilan mensuel sur vos performances Strava : ce qui progresse, ce qui stagne, et des recommandations concrètes pour le mois suivant. Comme un rendez-vous avec votre coach.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">Progression</span>
                <span className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">Recommandations</span>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group relative rounded-3xl p-8 bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-[#FC4C02]/30 transition-all duration-500">
            <div className="absolute top-6 right-6 text-6xl font-black text-white/5 group-hover:text-[#FC4C02]/10 transition-colors">03</div>
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FC4C02] to-[#e8440a] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#FC4C02]/25 group-hover:scale-110 transition-transform duration-300">
                <CalendarCheck className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Bilan hebdo : prévu vs réalisé</h3>
              <p className="text-slate-400 leading-relaxed">
                Chaque semaine, un rapport clair confronte votre plan à ce que vous avez réellement couru. Séance manquée ? Volume trop bas ? L'IA le voit et adapte la suite.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm">
                <span className="px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-medium">Suivi en temps réel</span>
                <span className="px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">Alertes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strava footer + Privacy */}
        <div className="mt-16 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Powered by</span>
            <svg className="w-6 h-6 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor" aria-label="Logo Strava"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            <span className="text-sm font-bold text-[#FC4C02]">Strava</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
            <svg className="w-3.5 h-3.5 text-green-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Vos données <strong className="text-slate-300">restent chez Strava</strong> — jamais revendues, jamais stockées</span>
          </div>
        </div>
      </div>
    </section>
  );
};
