
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "h-10 w-10" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 60" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logo Coach Running IA"
    >
      {/* 1. Lignes de vitesse (Motion Blur Lines) à gauche */}
      <path d="M5 25H25" stroke="#F97316" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path d="M2 35H20" stroke="#F97316" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <path d="M8 15H22" stroke="#F97316" strokeWidth="3" strokeLinecap="round" opacity="0.7" />

      {/* 2. Forme principale de la casquette (Profil) */}
      {/* Calotte */}
      <path 
        d="M30 45H85C85 45 82 35 70 25C60 15 45 15 35 25C30 30 30 45 30 45Z" 
        fill="url(#capGradient)" 
        stroke="#EA580C" 
        strokeWidth="2"
      />
      {/* Visière profilée vers la droite */}
      <path 
        d="M84 45L98 42C98 42 95 38 82 38" 
        fill="#F97316" 
        stroke="#EA580C" 
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 3. Motifs Circuit Imprimé (Tech/IA) - Intérieur Casquette */}
      <g opacity="0.8">
        <circle cx="45" cy="30" r="1.5" fill="white" />
        <circle cx="55" cy="25" r="1.5" fill="white" />
        <circle cx="65" cy="32" r="1.5" fill="white" />
        
        <path d="M45 30L55 25L65 32" stroke="white" strokeWidth="1.5" />
        <path d="M55 25V20" stroke="white" strokeWidth="1.5" />
        <path d="M65 32L75 30" stroke="white" strokeWidth="1.5" />
      </g>

      {/* 4. Éclair (Énergie) à l'arrière */}
      <path 
        d="M38 18L42 24H39L43 32" 
        stroke="#FBBF24" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />

      {/* Dégradé pour la casquette */}
      <defs>
        <linearGradient id="capGradient" x1="30" y1="15" x2="85" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F97316" /> {/* Orange 500 */}
          <stop offset="1" stopColor="#FFEDD5" /> {/* Orange 100/White ish pour l'effet vitesse */}
        </linearGradient>
      </defs>
    </svg>
  );
};

export default Logo;
