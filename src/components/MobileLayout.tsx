import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ClipboardList, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import Logo from './Logo';

interface MobileLayoutProps {
  children: React.ReactNode;
  user: User | null;
  setUser: (u: User | null) => void;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, user }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const tabs = [
    { path: '/', label: 'Accueil', icon: Home },
    { path: '/dashboard', label: 'Mon Plan', icon: ClipboardList },
    { path: '/profile', label: 'Profil', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen font-sans bg-white">
      {/* Header mobile — logo seul, épuré */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100"
        style={{ paddingTop: 'var(--sat)' }}>
        <div className="flex items-center justify-center px-4 h-12">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 w-auto" />
            <span className="text-base font-bold bg-gradient-to-r from-slate-900 to-slate-700 text-transparent bg-clip-text">
              Coach Running IA
            </span>
          </Link>
        </div>
      </header>

      {/* Contenu principal — scroll natif iOS */}
      <main className="pb-20 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {children}
      </main>

      {/* Tab bar native en bas */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: 'var(--sab)' }}
      >
        <div className="flex items-center justify-around h-14">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            const Icon = tab.icon;
            // Si pas connecté : "Mon Plan" et "Profil" redirigent vers /auth
            const to = (!user && tab.path !== '/') ? '/auth' : tab.path;
            return (
              <Link
                key={tab.path}
                to={to}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  active
                    ? 'text-orange-500'
                    : 'text-slate-400 active:text-slate-600'
                }`}
              >
                <Icon size={24} strokeWidth={active ? 2.5 : 1.5} />
                <span className={`text-[10px] mt-0.5 tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default MobileLayout;
