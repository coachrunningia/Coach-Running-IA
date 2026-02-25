
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loginUser, registerUser, resetPassword, loginWithGoogle } from '../services/storageService';
import { User } from '../types';
import { X, Mail, Lock, User as UserIcon, AlertCircle, ArrowRight, KeyRound, ChevronLeft, CheckCircle } from 'lucide-react';

interface AuthModalProps {
  onAuthSuccess: (user: User) => void;
  onClose?: () => void;
  isModal?: boolean;
  initialEmail?: string;
}

type AuthView = 'LOGIN' | 'REGISTER' | 'VERIFICATION_SENT' | 'FORGOT_PASSWORD' | 'RESET_SENT';

const AuthModal: React.FC<AuthModalProps> = ({ onAuthSuccess, onClose, isModal = false, initialEmail = '' }) => {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<AuthView>('LOGIN');
  const [formData, setFormData] = useState({ firstName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastEmailUsed, setLastEmailUsed] = useState('');

  // Check if user just verified their email
  const isEmailVerified = searchParams.get('verified') === 'true';
  const emailFromParams = searchParams.get('email');

  // Initialiser l'email si fourni (props ou query params)
  useEffect(() => {
    const emailToUse = initialEmail || emailFromParams || '';
    if (emailToUse) {
      setFormData(prev => ({ ...prev, email: emailToUse }));
    }
  }, [initialEmail, emailFromParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setLastEmailUsed(formData.email);
    
    try {
      if (view === 'LOGIN') {
        const user = await loginUser(formData.email, formData.password);
        onAuthSuccess(user);
      } else if (view === 'REGISTER') {
        if (!formData.firstName) throw new Error("Le prénom est requis.");
        
        // registerUser gère désormais la fusion si on est déjà en invité (isAnonymous)
        const user = await registerUser(formData.firstName, formData.email, formData.password);
        
        // If registerUser returns null (classic case needing verification), show message
        if (!user) {
          setView('VERIFICATION_SENT');
        } else {
          // If registerUser returns a user (link success), auto success
          onAuthSuccess(user);
        }
      } else if (view === 'FORGOT_PASSWORD') {
        await resetPassword(formData.email);
        setView('RESET_SENT');
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      
      // Handle Verification Needed Error
      if (err.message === "EMAIL_NOT_VERIFIED") {
        setView('VERIFICATION_SENT');
        return;
      }

      // French Error Translations
      if (err.code === 'auth/email-already-in-use' || err.code === 'auth/credential-already-in-use') {
        setError("Cet email est déjà utilisé. Connectez-vous ?");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError("Email ou mot de passe incorrect.");
      } else if (err.code === 'auth/weak-password') {
        setError("Le mot de passe doit contenir au moins 6 caractères.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Format d'email invalide.");
      } else {
        setError(err.message || "Une erreur est survenue.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      onAuthSuccess(user);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      
      if (err.code === 'auth/popup-closed-by-user') {
         // L'utilisateur a fermé la fenêtre, ce n'est pas vraiment une erreur
         return;
      } else if (err.code === 'auth/unauthorized-domain') {
         // UX IMPROVEMENT: On affiche le domaine exact à ajouter
         const currentDomain = window.location.hostname;
         setError(`Domaine non autorisé (${currentDomain}). Ajoutez-le dans Firebase Console > Auth > Settings.`);
      } else if (err.code === 'auth/popup-blocked') {
         setError("Le navigateur a bloqué le popup. Veuillez l'autoriser.");
      } else {
         setError("Erreur de connexion avec Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setView('LOGIN');
    setError('');
  };

  const switchToRegister = (e: React.MouseEvent) => {
    e.preventDefault();
    setView('REGISTER');
    setError('');
  };

  // --- VIEW: VERIFICATION SENT ---
  if (view === 'VERIFICATION_SENT') {
    return (
      <div className={`bg-white rounded-2xl p-8 w-full max-w-md ${isModal ? 'shadow-2xl relative' : 'shadow-none'}`}>
        {isModal && onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        )}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Vérifiez votre email</h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Nous avons envoyé un email de vérification à <span className="font-bold text-slate-900">{lastEmailUsed}</span>.
            <br /><br />
            Vérifiez-le et connectez-vous.
          </p>
          <button
            onClick={() => switchToLogin()}
            className="w-full bg-primary hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            Se connecter <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: RESET SENT ---
  if (view === 'RESET_SENT') {
    return (
      <div className={`bg-white rounded-2xl p-8 w-full max-w-md ${isModal ? 'shadow-2xl relative' : 'shadow-none'}`}>
        {isModal && onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        )}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Vérifiez votre email</h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Nous avons envoyé un lien de réinitialisation de mot de passe à <span className="font-bold text-slate-900">{lastEmailUsed}</span>.
          </p>
          <button
            onClick={() => switchToLogin()}
            className="w-full bg-primary hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            Se connecter <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: FORGOT PASSWORD ---
  if (view === 'FORGOT_PASSWORD') {
    return (
      <div className={`bg-white rounded-2xl p-8 w-full max-w-md ${isModal ? 'shadow-2xl relative' : 'shadow-none'}`}>
        {isModal && onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        )}

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Réinitialiser le mot de passe</h2>
          <p className="text-slate-500 text-sm">
            Entrez votre adresse email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-fade-in">
            <AlertCircle size={16} className="flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors shadow-lg mt-6 disabled:opacity-70 disabled:cursor-wait"
          >
            {loading ? 'Envoi en cours...' : "Recevoir le lien"}
          </button>
        </form>

        <button 
          onClick={switchToLogin} 
          className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft size={16} /> Retour à la connexion
        </button>
      </div>
    );
  }

  // --- VIEW: LOGIN / REGISTER ---
  const isLogin = view === 'LOGIN';

  const content = (
    <div className={`bg-white rounded-2xl p-8 w-full max-w-md ${isModal ? 'shadow-2xl relative' : 'shadow-none'}`}>
      {isModal && onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={24} />
        </button>
      )}

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {isLogin ? 'Bon retour parmi nous' : 'Créez votre profil'}
        </h2>
        <p className="text-slate-500 text-sm">
          {isLogin ? 'Accédez à vos plans et suivez vos progrès.' : 'Inscrivez-vous pour conserver définitivement votre plan et y accéder partout.'}
        </p>
      </div>

      {/* Success message when email was just verified */}
      {isEmailVerified && isLogin && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start gap-3 animate-fade-in">
          <CheckCircle size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Email vérifié avec succès !</p>
            <p className="text-sm text-emerald-700">Connectez-vous pour accéder à votre plan d'entraînement.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-fade-in">
          <AlertCircle size={16} className="flex-shrink-0" /> 
          <div className="flex-1">
            {error}
            {error.includes("Connectez-vous") && (
               <button onClick={switchToLogin} className="ml-2 font-bold underline hover:text-red-800 focus:outline-none">
                 Se connecter
               </button>
            )}
          </div>
        </div>
      )}

      {/* Google Login Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-3 disabled:opacity-70 mb-6"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continuer avec Google
      </button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-slate-500">Ou avec email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                required={!isLogin}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                placeholder="Votre prénom"
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
              />
            </div>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="email"
              required
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              placeholder="votre@email.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="password"
              required
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>
        </div>

        {isLogin && (
          <div className="text-right">
            <button 
              type="button"
              onClick={() => setView('FORGOT_PASSWORD')}
              className="text-xs text-accent hover:text-orange-600 font-medium"
            >
              Mot de passe oublié ?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors shadow-lg mt-4 disabled:opacity-70 disabled:cursor-wait"
        >
          {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : "S'inscrire gratuitement")}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-slate-500">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
        </span>
        <button
          onClick={isLogin ? switchToRegister : switchToLogin}
          className="ml-2 font-bold text-accent hover:underline focus:outline-none"
        >
          {isLogin ? "S'inscrire" : "Se connecter"}
        </button>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
        {content}
      </div>
    );
  }

  return content;
};

export default AuthModal;
