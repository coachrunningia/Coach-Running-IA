
import React, { useState } from 'react';
import { Activity, Lock } from 'lucide-react';
import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

interface StravaConnectProps {
  isConnected: boolean;
  onConnect: () => void;
  isPremium?: boolean;
}

const StravaConnect: React.FC<StravaConnectProps> = ({ isConnected, onConnect, isPremium = false }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleConnect = async () => {
    if (!isPremium) {
        navigate('/pricing');
        return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        alert('Vous devez être connecté');
        return;
      }

      // Appel à l'API pour récupérer l'URL d'autorisation
      const response = await fetch('/api/strava/auth', {
        method: 'GET'
      });
      
      const data = await response.json();
      
      // Ajoute le userId dans le state OAuth
      const authUrl = `${data.url}&state=${userId}`;
      
      // Redirige vers Strava
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('Erreur connexion Strava:', error);
      alert('Erreur lors de la connexion à Strava');
      setLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="bg-orange-100 p-1 rounded-full">
            <Activity size={16} className="text-orange-600" />
        </div>
        <span className="text-sm font-bold text-orange-700">Strava connecté</span>
        <span className="text-lg">✅</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 shadow-sm ${
          isPremium 
          ? 'bg-[#FC4C02] text-white hover:bg-[#E34402]' 
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
      }`}
    >
      {isPremium ? <Activity size={20} /> : <Lock size={18} />}
      {loading ? 'Connexion...' : 'Connecter Strava'}
    </button>
  );
};

export default StravaConnect;
