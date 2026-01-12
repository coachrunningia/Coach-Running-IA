
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User as UserIcon, LogOut, Settings } from 'lucide-react';
import { User } from '../types';
import { logoutUser } from '../services/storageService';
import { APP_NAME } from '../constants';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  setUser: (u: User | null) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, setUser }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    window.location.hash = '/';
  };

  const navLinks = [
    { name: 'Accueil', path: '/' },
    { name: 'Tarifs', path: '/pricing' },
    { name: 'Lexique', path: '/glossary' },
  ];

  if (user) {
    navLinks.splice(1, 0, { name: 'Mon Plan', path: '/dashboard' });
  }

  const isActive = (path: string) => location.pathname === path ? 'text-accent font-semibold' : 'text-slate-600 hover:text-primary';

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-2xl font-bold text-primary flex items-center gap-3 group">
                {/* NOUVEAU LOGO VECTORIEL */}
                <Logo className="h-12 w-auto transition-transform group-hover:scale-105" />

                <span className="bg-gradient-to-r from-slate-900 to-slate-700 text-transparent bg-clip-text hidden sm:block">
                  {APP_NAME}
                </span>
              </Link>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path} className={`text-sm transition-colors ${isActive(link.path)}`}>
                  {link.name}
                </Link>
              ))}
              
              {user ? (
                <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
                  <Link to="/profile" className="flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-accent transition-colors">
                    {user.photoURL ? (
                      <img src={user.photoURL} className="w-8 h-8 rounded-full border border-slate-200 object-cover" alt="Profile" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <UserIcon size={16} className="text-slate-500" />
                      </div>
                    )}
                    <span className="hidden lg:inline">{user.firstName}</span>
                  </Link>
                  <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 transition-colors" title="Se déconnecter">
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <Link to="/auth" className="bg-primary hover:bg-slate-800 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-md hover:shadow-lg">
                  Se connecter / S'inscrire
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-slate-600 hover:text-slate-900 focus:outline-none"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-primary hover:bg-slate-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              {user ? (
                 <>
                   <Link
                    to="/profile"
                    className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-primary hover:bg-slate-50 flex items-center gap-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings size={18} /> Mon Profil
                  </Link>
                   <button
                    onClick={handleLogout}
                    className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-500 hover:bg-red-50"
                  >
                    Se déconnecter
                  </button>
                 </>
              ) : (
                 <Link
                  to="/auth"
                  className="block w-full text-center mt-4 px-3 py-3 rounded-md text-base font-medium bg-primary text-white"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Connexion / Inscription
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
               <Logo className="h-8 w-auto text-accent" />
               {APP_NAME}
            </h3>
            <p className="text-slate-400 text-sm">
              Votre coach running intelligent. Des plans personnalisés pour atteindre vos sommets.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-accent">L'application</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/">Accueil</Link></li>
              <li><Link to="/pricing">Tarifs</Link></li>
              <li><Link to="/auth">Connexion</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-accent">Ressources</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/glossary">Lexique Running</Link></li>
              <li><a href="#">Blog (Bientôt)</a></li>
              <li><a href="#">Calculateur VMA</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-accent">Légal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#">Mentions Légales</a></li>
              <li><a href="#">Confidentialité</a></li>
              <li><a href="#">CGU</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} {APP_NAME}. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
};

export default Layout;
