import { useEffect } from "react";

import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, RefreshCw, CheckCircle, ArrowLeft, AlertTriangle } from 'lucide-react';
import Logo from './Logo';
import { createEmailVerificationToken } from '../services/storageService';
import { apiUrl } from '../services/apiConfig';

const MAX_RESENDS = 3;

const EmailSentScreen: React.FC = () => {

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "Lead");
    }
  }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const userId = searchParams.get('uid') || '';
  const firstName = searchParams.get('fn') || 'Coureur';

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCount, setResendCount] = useState(0);

  const handleResendEmail = async () => {
    if (!email || !userId || isResending) return;

    if (resendCount >= MAX_RESENDS) {
      setResendError('Nombre maximum de renvois atteint. Contactez-nous à programme@coachrunningia.fr');
      return;
    }

    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      // Creer un nouveau token de verification
      const newToken = await createEmailVerificationToken(userId, email, undefined, firstName);

      // Envoyer l'email via le serveur
      const response = await fetch(apiUrl('/api/send-verification-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: newToken,
          email,
          firstName
        })
      });

      if (!response.ok) {
        throw new Error('Erreur serveur');
      }

      setResendCount(prev => prev + 1);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error) {
      setResendError('Impossible de renvoyer l\'email. Veuillez réessayer.');
    } finally {
      setIsResending(false);
    }
  };

  const maxResendsReached = resendCount >= MAX_RESENDS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          {/* Icon */}
          <div className="w-24 h-24 bg-gradient-to-br from-accent/20 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-12 h-12 text-accent" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Vérifiez votre boîte mail !
          </h1>

          {/* Description */}
          <p className="text-slate-500 mb-6">
            Nous avons envoyé un email de confirmation à :
          </p>

          {/* Email Display */}
          {email && (
            <div className="bg-slate-100 rounded-xl px-4 py-3 mb-6">
              <span className="font-bold text-slate-900">{email}</span>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
            <h3 className="font-bold text-blue-900 mb-2">Prochaines étapes :</h3>
            <ol className="text-blue-800 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 text-blue-900 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <span>Ouvrez l'email que nous venons de vous envoyer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 text-blue-900 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <span>Cliquez sur le bouton "Voir mon plan d'entraînement"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 text-blue-900 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <span>Connectez-vous pour accéder à votre plan personnalisé !</span>
              </li>
            </ol>
          </div>

          {/* Success Message */}
          {resendSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center gap-2 justify-center">
              <CheckCircle size={18} className="text-emerald-600" />
              <span className="text-emerald-800 text-sm font-medium">Email renvoyé avec succès ! ({MAX_RESENDS - resendCount} renvoi{MAX_RESENDS - resendCount > 1 ? 's' : ''} restant{MAX_RESENDS - resendCount > 1 ? 's' : ''})</span>
            </div>
          )}

          {/* Error Message */}
          {resendError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <span className="text-red-800 text-sm">{resendError}</span>
            </div>
          )}

          {/* Max resends reached */}
          {maxResendsReached && !resendError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2 justify-center">
              <AlertTriangle size={18} className="text-amber-600" />
              <span className="text-amber-800 text-sm font-medium">Limite de renvois atteinte. Contactez <a href="mailto:programme@coachrunningia.fr" className="underline font-bold">programme@coachrunningia.fr</a></span>
            </div>
          )}

          {/* Resend Button */}
          <button
            onClick={handleResendEmail}
            disabled={isResending || !email || !userId || maxResendsReached}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {isResending ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Envoi en cours...
              </>
            ) : maxResendsReached ? (
              <>
                <Mail size={18} />
                Contactez le support
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                Renvoyer l'email
              </>
            )}
          </button>

          {/* Back to Login */}
          <button
            onClick={() => navigate('/auth')}
            className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center justify-center gap-1 mx-auto transition-colors"
          >
            <ArrowLeft size={16} />
            Retour à la connexion
          </button>

          {/* Spam Notice */}
          <p className="text-slate-400 text-xs mt-6">
            Vous ne trouvez pas l'email ? Vérifiez votre dossier spam ou courrier indésirable.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-6">
          Coach Running IA - Votre coach personnel propulsé par l'IA
        </p>
      </div>
    </div>
  );
};

export default EmailSentScreen;
