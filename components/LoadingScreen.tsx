import React, { useEffect, useState } from 'react';
import { Activity, Zap, CheckCircle } from 'lucide-react';

const LoadingScreen = () => {
  const [step, setStep] = useState(0);
  const steps = [
    "Analyse de votre profil coureur...",
    "Calcul des charges d'entraînement...",
    "Structuration des cycles de progression...",
    "Finalisation de votre plan sur mesure..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-accent rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="text-accent fill-accent" size={32} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-6">Construction de votre plan</h2>

        <div className="space-y-4 text-left pl-8">
          {steps.map((s, index) => (
            <div key={index} className={`flex items-center gap-3 transition-opacity duration-500 ${index <= step ? 'opacity-100' : 'opacity-30'}`}>
              {index < step ? (
                <CheckCircle className="text-green-500" size={20} />
              ) : index === step ? (
                <Activity className="text-accent animate-pulse" size={20} />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
              )}
              <span className={`font-medium ${index === step ? 'text-slate-900' : 'text-slate-500'}`}>{s}</span>
            </div>
          ))}
        </div>

        <p className="mt-12 text-sm text-slate-400 italic">
          "La douleur est temporaire, la fierté est éternelle."
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;