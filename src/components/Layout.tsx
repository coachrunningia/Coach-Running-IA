
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User as UserIcon, LogOut, Settings, ChevronDown, Calculator } from 'lucide-react';
import { User } from '../types';
import { logoutUser } from '../services/storageService';
import { APP_NAME } from '../constants';
import Logo from './Logo';

const toolsLinks = [
  { name: "Convertisseur Allure", path: "/outils/convertisseur-allure", desc: "min/km ↔ km/h" },
  { name: "Calculateur VMA", path: "/outils/calculateur-vma", desc: "Estimez votre VMA" },
  { name: "Prédicteur Temps", path: "/outils/predicteur-temps", desc: "5km → Marathon" },
  { name: "Allure Marathon", path: "/outils/allure-marathon", desc: "Objectif → Pace" },
];

const plansLinks = [
  { name: "Semi-marathon", path: "/plan-semi-marathon", desc: "21,1 km" },
  { name: "Marathon", path: "/plan-marathon", desc: "42,195 km" },
  { name: "Trail", path: "/plan-trail", desc: "Nature & dénivelé" },
];

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  setUser: (u: User | null) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, setUser }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isToolsOpen, setIsToolsOpen] = React.useState(false);
  const [isPlansOpen, setIsPlansOpen] = React.useState(false);
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
    { name: 'Blog', path: '/blog' },
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
            <div className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path} className={`text-sm transition-colors ${isActive(link.path)}`}>
                  {link.name}
                </Link>
              ))}

              {/* Dropdown Plans */}
              <div className="relative">
                <button
                  onClick={() => setIsPlansOpen(!isPlansOpen)}
                  onBlur={() => setTimeout(() => setIsPlansOpen(false), 150)}
                  className="flex items-center gap-1 text-sm text-slate-600 hover:text-primary transition-colors"
                >
                  🏃 Plans
                  <ChevronDown size={14} className={`transition-transform ${isPlansOpen ? "rotate-180" : ""}`} />
                </button>
                {isPlansOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                    {plansLinks.map((plan) => (
                      <Link
                        key={plan.path}
                        to={plan.path}
                        className="block px-4 py-2.5 hover:bg-slate-50 transition-colors"
                        onClick={() => setIsPlansOpen(false)}
                      >
                        <div className="font-medium text-slate-900 text-sm">{plan.name}</div>
                        <div className="text-xs text-slate-500">{plan.desc}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Dropdown Outils */}
              <div className="relative">
                <button
                  onClick={() => setIsToolsOpen(!isToolsOpen)}
                  onBlur={() => setTimeout(() => setIsToolsOpen(false), 150)}
                  className="flex items-center gap-1 text-sm text-slate-600 hover:text-primary transition-colors"
                >
                  <Calculator size={16} />
                  Outils
                  <ChevronDown size={14} className={`transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
                </button>

                {isToolsOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                    {/* Lien vers la page index des outils */}
                    <Link
                      to="/outils"
                      className="block px-4 py-2.5 hover:bg-accent/10 transition-colors border-b border-slate-100 mb-1"
                      onClick={() => setIsToolsOpen(false)}
                    >
                      <div className="font-bold text-accent text-sm">Tous les outils →</div>
                      <div className="text-xs text-slate-500">Voir tous nos calculateurs gratuits</div>
                    </Link>
                    {toolsLinks.map((tool) => (
                      <Link
                        key={tool.path}
                        to={tool.path}
                        className="block px-4 py-2.5 hover:bg-slate-50 transition-colors"
                        onClick={() => setIsToolsOpen(false)}
                      >
                        <div className="font-medium text-slate-900 text-sm">{tool.name}</div>
                        <div className="text-xs text-slate-500">{tool.desc}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              
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
{/* Plans Section Mobile */}
              <div className="border-t border-slate-100 pt-2 mt-2">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  🏃 Plans d'entraînement
                </div>
                {plansLinks.map((plan) => (
                  <Link
                    key={plan.path}
                    to={plan.path}
                    className="block px-3 py-2 rounded-md text-sm text-slate-600 hover:text-primary hover:bg-slate-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {plan.name} <span className="text-slate-400 text-xs">({plan.desc})</span>
                  </Link>
                ))}
              </div>
              {/* Outils Section Mobile */}
              <div className="border-t border-slate-100 pt-2 mt-2">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Calculator size={14} /> Outils Running
                </div>
                {/* Lien vers la page index des outils */}
                <Link
                  to="/outils"
                  className="block px-3 py-2 rounded-md text-sm font-semibold text-accent hover:bg-accent/10"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Tous les outils →
                </Link>
                {toolsLinks.map((tool) => (
                  <Link
                    key={tool.path}
                    to={tool.path}
                    className="block px-3 py-2 rounded-md text-sm text-slate-600 hover:text-primary hover:bg-slate-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {tool.name}
                  </Link>
                ))}
              </div>

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-5 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
               <Logo className="h-8 w-auto text-accent" />
               {APP_NAME}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Votre coach running intelligent. Des plans personnalisés pour atteindre vos sommets.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://www.facebook.com/profile.php?id=61580695976010" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-slate-800 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://www.instagram.com/coach_running_ia/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-slate-800 hover:bg-pink-600 rounded-full flex items-center justify-center transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-accent">L'application</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/" className="hover:text-white transition-colors">Accueil</Link></li>
              <li><Link to="/pricing" className="hover:text-white transition-colors">Tarifs</Link></li>
              <li><Link to="/auth" className="hover:text-white transition-colors">Connexion</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-accent">Ressources</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/glossary" className="hover:text-white transition-colors">Lexique Running</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/outils" className="hover:text-white transition-colors">Outils Gratuits</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-accent">Contact</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="mailto:programme@coachrunningia.fr" className="hover:text-white transition-colors">
                  programme@coachrunningia.fr
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-accent">Légal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/cgv" className="hover:text-white transition-colors">CGV / CGU</Link></li>
              <li><Link to="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link></li>
              <li><Link to="/mentions-legales" className="hover:text-white transition-colors">Mentions Légales</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} {APP_NAME}. Tous droits réservés. Les plans sont des suggestions et ne remplacent pas l'avis d'un médecin.
        </div>
      </footer>
    </div>
  );
};

export default Layout;
