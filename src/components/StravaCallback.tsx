
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Activity } from 'lucide-react';
import { saveStravaTokens } from '../services/storageService';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Logo from './Logo';

type CallbackStatus = 'loading' | 'success' | 'error';

const StravaCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [athleteName, setAthleteName] = useState<string>('');
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    // Prevent double processing
    if (processed) return;

    // Log URL params for debugging
    console.log('[StravaCallback] URL params:', {
      access_token: searchParams.get('access_token')?.substring(0, 10) + '...',
      refresh_token: searchParams.get('refresh_token') ? 'present' : 'missing',
      expires_at: searchParams.get('expires_at'),
      athlete_id: searchParams.get('athlete_id'),
      athlete_name: searchParams.get('athlete_name'),
      user_id: searchParams.get('user_id'),
      error: searchParams.get('error')
    });

    // Check for error first
    const error = searchParams.get('error');
    if (error) {
      console.error('[StravaCallback] Error from server:', error);
      setStatus('error');
      setErrorMessage(error === 'no_code' ? 'Autorisation non accordée' : error);
      setProcessed(true);
      return;
    }

    // Get token data from URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const expiresAt = searchParams.get('expires_at');
    const athleteId = searchParams.get('athlete_id');
    const athleteNameParam = searchParams.get('athlete_name');
    const userIdFromUrl = searchParams.get('user_id');

    if (!accessToken || !refreshToken) {
      console.error('[StravaCallback] Missing tokens in URL');
      setStatus('error');
      setErrorMessage('Tokens manquants dans la réponse');
      setProcessed(true);
      return;
    }

    // Wait for Firebase Auth to be ready before saving
    let hasProcessed = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Only process once
      if (hasProcessed) return;
      hasProcessed = true;
      setProcessed(true);

      console.log('[StravaCallback] Auth state changed. User:', user?.uid || 'null');

      // Use auth user or fallback to URL user_id
      const userId = user?.uid || userIdFromUrl;

      if (!userId) {
        console.error('[StravaCallback] No user ID available');
        setStatus('error');
        setErrorMessage('Utilisateur non connecté. Veuillez vous reconnecter.');
        return;
      }

      try {
        console.log('[StravaCallback] Saving tokens for user:', userId);
        console.log('[StravaCallback] Token data:', {
          access_token: accessToken.substring(0, 10) + '...',
          refresh_token: refreshToken ? 'present' : 'missing',
          expires_at: expiresAt,
          athlete_id: athleteId,
          athlete_name: athleteNameParam
        });

        // Save tokens to Firestore via client SDK
        await saveStravaTokens(userId, {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: parseInt(expiresAt || '0', 10),
          athlete_id: athleteId || '',
          athlete_name: athleteNameParam || ''
        });

        console.log('[StravaCallback] Tokens saved successfully!');
        setAthleteName(athleteNameParam || '');
        setStatus('success');

        // Auto-redirect after 2 seconds - retour à la page d'origine
        setTimeout(() => {
          const returnUrl = localStorage.getItem('strava_return_url');
          localStorage.removeItem('strava_return_url');
          navigate(returnUrl || '/profile');
        }, 2000);

      } catch (err: any) {
        console.error('[StravaCallback] Error saving tokens:', err);
        console.error('[StravaCallback] Error details:', {
          code: err.code,
          message: err.message,
          stack: err.stack
        });
        setStatus('error');
        setErrorMessage(err.message || 'Erreur lors de la sauvegarde');
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [searchParams, navigate, processed]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-slate-100 flex flex-col items-center justify-center p-4">
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
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Connexion en cours...</h1>
              <p className="text-slate-500">Nous synchronisons votre compte Strava.</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Activity className="w-10 h-10 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Strava connecté !</h1>
                <p className="text-slate-500">
                  {athleteName
                    ? `Bienvenue ${athleteName} ! Votre compte Strava est maintenant lié.`
                    : 'Votre compte Strava est maintenant lié à Coach Running IA.'
                  }
                </p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 text-orange-800">
                  <CheckCircle size={20} />
                  <span className="font-medium">Synchronisation activée</span>
                </div>
                <p className="text-orange-700 text-sm mt-2">
                  Vos activités seront automatiquement analysées pour adapter votre plan.
                </p>
              </div>
              <p className="text-sm text-slate-400">Redirection automatique...</p>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Erreur de connexion</h1>
                <p className="text-slate-500">{errorMessage}</p>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl transition-all"
              >
                Retour au profil
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

export default StravaCallback;
