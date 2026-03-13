
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Crown, ArrowRight, Sparkles } from 'lucide-react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

interface SuccessPageProps {
  onContinue: () => void;
}

const SuccessPage: React.FC<SuccessPageProps> = ({ onContinue }) => {
  const [countdown, setCountdown] = useState(6);
  const navigate = useNavigate();

  // Meta Pixel: track Purchase event after successful payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    const sessionId = params.get('session_id');

    const planConfig: Record<string, { value: number; contentName: string }> = {
      premium_mensuel: { value: 4.90, contentName: 'Premium Mensuel' },
      premium_annuel: { value: 39.90, contentName: 'Premium Annuel' },
      plan_unique: { value: 3.90, contentName: 'Plan Unique' },
    };

    const config = plan ? planConfig[plan] : { value: 0, contentName: 'Premium' };

    // eventID partagé avec le server-side pour la déduplication Meta
    const eventID = sessionId ? `purchase_${sessionId}` : `purchase_${Date.now()}`;

    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Purchase', {
        value: config.value,
        currency: 'EUR',
        content_ids: [plan || 'premium'],
        content_type: 'product',
        content_name: config.contentName,
      }, { eventID });
      console.log('[Meta Pixel] Purchase tracked client-side, eventID:', eventID);
    } else {
      console.warn('[Meta Pixel] fbq not loaded, Purchase not tracked client-side');
    }
  }, []);

  // Wait for Firebase Auth to load, then redirect to latest plan
  useEffect(() => {
    let redirected = false;
    const auth = getAuth();

    // Listen for auth state — fires once auth is initialized
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (redirected) return;

      if (user) {
        // Auth is ready, find the user's latest plan
        const q = query(
          collection(db, 'plans'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        getDocs(q).then(snap => {
          if (redirected) return;
          if (snap.docs.length > 0) {
            redirected = true;
            navigate('/plan/' + snap.docs[0].id);
          }
          // Don't redirect yet if no plan found — wait for countdown
        }).catch(() => {});
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Countdown fallback — if auth/plan lookup didn't redirect, go to dashboard
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onContinue]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">

        {/* Success Animation */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle size={48} className="text-emerald-600" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center animate-pulse">
            <Crown size={16} className="text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black text-slate-900 mb-4">
          Bienvenue dans le club Premium !
        </h1>

        <p className="text-lg text-slate-600 mb-8">
          Ton paiement a été confirmé. Tu as maintenant accès à toutes les fonctionnalités de Coach Running IA.
        </p>

        {/* Features unlocked */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 mb-8 text-left">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-amber-500" />
            <span className="font-bold text-slate-900">Fonctionnalités débloquées</span>
          </div>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              Plans d'entraînement illimités
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              Analyse IA de tes performances Strava
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              Export PDF professionnel
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              Adaptation automatique du plan
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <button
          onClick={onContinue}
          className="w-full py-4 px-6 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          Accéder à mon plan
          <ArrowRight size={18} />
        </button>

        <p className="text-sm text-slate-500 mt-4">
          Redirection automatique dans {countdown} secondes...
        </p>
      </div>
    </div>
  );
};

export default SuccessPage;
