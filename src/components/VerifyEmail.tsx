
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import Logo from './Logo';

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired' | 'used';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [planId, setPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Aucun token de vérification fourni.');
      return;
    }

    const verifyEmail = async () => {
      try {
        console.log('[VerifyEmail] Verifying token:', token.substring(0, 10) + '...');

        // 1. Récupérer le token depuis Firestore (côté CLIENT)
        const tokenRef = doc(db, 'emailVerificationTokens', token);
        const tokenDoc = await getDoc(tokenRef);

        if (!tokenDoc.exists()) {
          console.log('[VerifyEmail] Token not found');
          setStatus('error');
          setErrorMessage('Token invalide ou expiré.');
          return;
        }

        const tokenData = tokenDoc.data();
        console.log('[VerifyEmail] Token data:', {
          userId: tokenData.userId,
          email: tokenData.email,
          used: tokenData.used,
          expiresAt: tokenData.expiresAt
        });

        // 2. Vérifier si déjà utilisé
        if (tokenData.used) {
          setStatus('used');
          setEmail(tokenData.email || '');
          return;
        }

        // 3. Vérifier expiration
        const expiresAt = new Date(tokenData.expiresAt);
        if (expiresAt < new Date()) {
          setStatus('expired');
          return;
        }

        // 4. Marquer le token comme utilisé
        await updateDoc(tokenRef, {
          used: true,
          usedAt: new Date().toISOString()
        });
        console.log('[VerifyEmail] Token marked as used');

        // 5. Marquer l'utilisateur comme vérifié
        const userRef = doc(db, 'users', tokenData.userId);
        await updateDoc(userRef, {
          emailVerified: true,
          emailVerifiedAt: new Date().toISOString()
        });
        console.log('[VerifyEmail] User marked as verified');

        setStatus('success');
        setEmail(tokenData.email || '');

        // Stocker le planId pour rediriger après login
        if (tokenData.planId) {
          localStorage.setItem('pendingPlanId', tokenData.planId);
          setPlanId(tokenData.planId);
          console.log('[VerifyEmail] Stored pending planId:', tokenData.planId);
        }

      } catch (error: any) {
        console.error('[VerifyEmail] Error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Une erreur est survenue.');
      }
    };

    verifyEmail();
  }, [token]);

  const handleGoToLogin = () => {
    navigate('/auth?verified=true' + (email ? `&email=${encodeURIComponent(email)}` : '') + (planId ? `&planId=${planId}` : ''));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">

          {/* Loading State */}
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Vérification en cours...</h1>
              <p className="text-slate-500">Nous vérifions votre adresse email.</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Email vérifié !</h1>
                <p className="text-slate-500">
                  Votre adresse email a été confirmée avec succès.
                  {email && <span className="block font-medium text-slate-700 mt-1">{email}</span>}
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-emerald-800 text-sm">
                  Votre plan d'entraînement personnalisé vous attend ! Connectez-vous pour y accéder.
                </p>
              </div>
              <button
                onClick={handleGoToLogin}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Me connecter
                <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* Already Used State */}
          {status === 'used' && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Lien déjà utilisé</h1>
                <p className="text-slate-500">
                  Ce lien de vérification a déjà été utilisé. Votre email est déjà confirmé.
                </p>
              </div>
              <button
                onClick={handleGoToLogin}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Me connecter
                <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* Expired State */}
          {status === 'expired' && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Lien expiré</h1>
                <p className="text-slate-500">
                  Ce lien de vérification a expiré. Les liens sont valides pendant 24 heures.
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 text-sm">
                  Connectez-vous avec vos identifiants pour demander un nouveau lien de vérification.
                </p>
              </div>
              <button
                onClick={() => navigate('/auth')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Aller à la connexion
                <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Erreur de vérification</h1>
                <p className="text-slate-500">{errorMessage}</p>
              </div>
              <button
                onClick={() => navigate('/auth')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Aller à la connexion
                <ArrowRight size={20} />
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-6">
          Coach Running IA - Votre coach personnel propulsé par l'IA
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
