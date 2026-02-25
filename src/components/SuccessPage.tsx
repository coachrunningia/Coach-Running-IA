
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Crown, ArrowRight, Sparkles } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

interface SuccessPageProps {
  onContinue: () => void;
}

const SuccessPage: React.FC<SuccessPageProps> = ({ onContinue }) => {
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to user's latest plan
          const auth = getAuth();
          const user = auth.currentUser;
          if (user) {
            const q = query(
              collection(db, 'plans'),
              where('userId', '==', user.uid),
              orderBy('createdAt', 'desc'),
              limit(1)
            );
            getDocs(q).then(snap => {
              if (snap.docs.length > 0) {
                navigate('/plan/' + snap.docs[0].id);
              } else {
                onContinue();
              }
            }).catch(() => onContinue());
          } else {
            onContinue();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onContinue, navigate]);

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
