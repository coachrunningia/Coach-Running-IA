
import React, { useState } from 'react';
import { User } from '../types';
import { updateUserProfile, deleteUserAccount, createPortalSession } from '../services/storageService';
import { User as UserIcon, Save, Trash2, Camera, AlertTriangle, CreditCard, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfilePageProps {
  user: User;
  setUser: (u: User | null) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [name, setName] = useState(user.firstName);
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await updateUserProfile(name, photoURL);
      // Mettre à jour l'état local
      setUser({ ...user, firstName: name, photoURL: photoURL });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setLoading(true);
    try {
      await createPortalSession();
    } catch (e) {
      console.error(e);
      setError("Impossible d'accéder au portail de facturation.");
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteUserAccount();
      setUser(null);
      navigate('/');
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la suppression. Veuillez vous reconnecter et réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Mon Profil</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        
        {/* Header Profil */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            {photoURL ? (
              <img src={photoURL} alt="Profil" className="w-24 h-24 rounded-full object-cover border-4 border-slate-100" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <UserIcon size={40} />
              </div>
            )}
            {isEditing && (
               <div className="absolute bottom-0 right-0 bg-accent text-white p-2 rounded-full shadow-md cursor-pointer">
                 <Camera size={16} />
               </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{user.firstName}</h2>
          <p className="text-slate-500">{user.email}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* SECTION ABONNEMENT */}
        <div className="mb-8 p-6 rounded-xl border border-slate-200 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
               <CreditCard size={20} className="text-slate-500" /> Mon Abonnement
            </h3>
            
            {user.isPremium ? (
              // CAS: PREMIUM
              <div>
                 <div className="flex items-center gap-3 mb-4 bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="bg-green-100 p-2 rounded-full text-green-700">
                       <ShieldCheck size={24} />
                    </div>
                    <div>
                       <p className="font-bold text-green-800">PREMIUM ACTIF</p>
                       <p className="text-xs text-green-700">Accès illimité à tous les plans et fonctionnalités.</p>
                    </div>
                 </div>
                 <button 
                  onClick={handlePortal}
                  disabled={loading}
                  className="w-full bg-white text-slate-700 border border-slate-300 font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
                 >
                    {loading ? 'Chargement...' : <><ExternalLink size={16} /> Gérer mon abonnement (Résilier / Changer)</>}
                 </button>
                 <p className="text-xs text-center text-slate-400 mt-2">Vous serez redirigé vers le portail sécurisé Stripe.</p>
              </div>
            ) : (
              // CAS: GRATUIT
              <div>
                 <div className="flex items-center gap-3 mb-4 bg-slate-100 p-4 rounded-lg border border-slate-200">
                    <div className="bg-slate-200 p-2 rounded-full text-slate-500">
                       <UserIcon size={24} />
                    </div>
                    <div>
                       <p className="font-bold text-slate-700">Compte Gratuit</p>
                       <p className="text-xs text-slate-500">Accès limité (1ère semaine des plans uniquement).</p>
                    </div>
                 </div>
                 <button 
                  onClick={() => navigate('/pricing')}
                  className="w-full bg-accent text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-md"
                 >
                    <Zap size={18} fill="currentColor" /> Passer Premium
                 </button>
              </div>
            )}
        </div>

        {/* Formulaire Edition */}
        <div className="space-y-6 border-t border-slate-100 pt-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
            <input 
              type="text" 
              disabled={!isEditing}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-500 focus:ring-2 focus:ring-accent/50 outline-none transition-all"
            />
          </div>
          
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">URL Photo (Optionnel)</label>
              <input 
                type="text" 
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://..."
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent/50 outline-none"
              />
            </div>
          )}

          <div className="flex gap-4 pt-4">
            {isEditing ? (
              <>
                <button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  {loading ? 'Enregistrement...' : <><Save size={18} /> Enregistrer</>}
                </button>
                <button 
                  onClick={() => setIsEditing(false)} 
                  disabled={loading}
                  className="px-6 py-3 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Annuler
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)} 
                className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                Modifier mes infos
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Zone Danger */}
      <div className="mt-12 pt-8 border-t border-slate-200">
        <h3 className="text-lg font-bold text-red-600 mb-2">Zone Danger</h3>
        <p className="text-slate-500 text-sm mb-4">La suppression de votre compte est irréversible. Toutes vos données seront perdues.</p>
        
        {!showDeleteConfirm ? (
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Trash2 size={16} /> Supprimer mon compte
          </button>
        ) : (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="font-bold text-red-800 mb-3 text-sm">Êtes-vous vraiment sûr ?</p>
            <div className="flex gap-3">
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700"
              >
                {loading ? 'Suppression...' : 'Oui, supprimer définitivement'}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
